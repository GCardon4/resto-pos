'use client'

// Módulo del cajón de caja registradora
// Solo Web Serial API (Chrome/Edge nativo sin dependencias)

export interface CajonConfig {
  modo: 'serial'
  baudRate?: number
  pin?: 0 | 1
}

const CONFIG_KEY = 'queen-pos-cajon-config'
const CONFIG_DEFAULT: CajonConfig = { modo: 'serial', baudRate: 9600, pin: 0 }

export function leerConfigCajon(): CajonConfig {
  if (typeof window === 'undefined') return CONFIG_DEFAULT
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return { ...CONFIG_DEFAULT, ...JSON.parse(raw) }
  } catch (_) {}
  return CONFIG_DEFAULT
}

export function guardarConfigCajon(config: CajonConfig) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

let _puerto: any = null

// Seleccionar puerto COM
export async function seleccionarPuertoSerial(): Promise<{ ok: boolean; error?: string }> {
  if (!('serial' in navigator)) {
    return { ok: false, error: 'Web Serial no disponible. Usa Chrome 89+ o Edge en escritorio.' }
  }
  try {
    _puerto = await (navigator as any).serial.requestPort({ filters: [] })
    return { ok: true }
  } catch (_) {
    return { ok: false, error: 'No se seleccionó ningún puerto.' }
  }
}

// Abrir cajón vía Web Serial
export async function abrirCajon(
  config: CajonConfig
): Promise<{ ok: boolean; error?: string }> {
  if (!('serial' in navigator)) {
    return { ok: false, error: 'Web Serial no disponible. Usa Chrome 89+ o Edge.' }
  }

  try {
    if (!_puerto) {
      const autorizados = await (navigator as any).serial.getPorts()
      if (!autorizados.length) {
        return {
          ok: false,
          error: 'Puerto no configurado. Abre el modal del cajón y selecciona el puerto COM.',
        }
      }
      _puerto = autorizados[0]
    }

    await _puerto.open({ baudRate: config.baudRate ?? 9600 })

    const writer = _puerto.writable.getWriter()
    const pin = config.pin ?? 0

    // Comando ESC/POS: ESC p pin t1 t2
    await writer.write(new Uint8Array([0x1B, 0x70, pin, 0x40, 0xF0]))

    writer.releaseLock()
    await _puerto.close()

    return { ok: true }
  } catch (e: any) {
    _puerto = null
    return { ok: false, error: e?.message ?? 'Error al comunicarse con el puerto serial' }
  }
}
