'use client'

// Módulo del cajón de caja registradora
// Modos: 'serial' (Web Serial API — Chrome nativo) | 'qz' (QZ Tray — app local)

// ─── Config ───────────────────────────────────────────────────────────────────

export interface CajonConfig {
  modo: 'serial' | 'qz'
  baudRate?: number      // Serial: velocidad del puerto (default 9600)
  pin?: 0 | 1            // Serial: pin RJ11 (0=pin2, 1=pin5)
  nombreImpresora?: string // QZ: nombre exacto en Windows
}

const CONFIG_KEY = 'queen-pos-cajon-config'

// Valor por defecto: Web Serial con baud 9600 y pin 2
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

// ─── Web Serial API (Chrome nativo — sin instalaciones) ───────────────────────

// Puerto cacheado a nivel módulo (persiste durante la sesión del navegador)
let _puerto: any = null

// Seleccionar el puerto COM — requiere clic directo del usuario (gesto)
// Solo se necesita hacer esto UNA VEZ: Chrome recuerda el permiso
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

// Abrir el cajón vía Web Serial — mismo patrón que el ejemplo del usuario
export async function abrirCajonSerial(
  baudRate = 9600,
  pin: 0 | 1 = 0
): Promise<{ ok: boolean; error?: string }> {
  if (!('serial' in navigator)) {
    return { ok: false, error: 'Web Serial no disponible. Usa Chrome 89+ o Edge.' }
  }

  try {
    // Usar puerto cacheado, o recuperar el que Chrome ya autorizó antes
    if (!_puerto) {
      const autorizados = await (navigator as any).serial.getPorts()
      if (!autorizados.length) {
        return {
          ok: false,
          error: 'Puerto no configurado. Abre el modal del cajón y haz clic en "Seleccionar Puerto COM".',
        }
      }
      _puerto = autorizados[0]
    }

    // Abrir puerto — exactamente como en el ejemplo del usuario
    await _puerto.open({ baudRate })

    const writer = _puerto.writable.getWriter()

    // Comando ESC/POS para abrir cajón: ESC p pin t1 t2
    // pin=0 (RJ11 pin 2) o pin=1 (pin 5) | t1=0x40 (128ms) | t2=0xF0 (480ms)
    await writer.write(new Uint8Array([0x1B, 0x70, pin, 0x40, 0xF0]))

    writer.releaseLock()
    await _puerto.close()

    return { ok: true }
  } catch (e: any) {
    // Resetear caché si falla — la próxima vez se re-selecciona
    _puerto = null
    return { ok: false, error: e?.message ?? 'Error al comunicarse con el puerto serial' }
  }
}

// ─── QZ Tray (alternativo para USB sin COM port) ─────────────────────────────

let _qz: any = null

async function getQZ(): Promise<any> {
  if (_qz) return _qz

  // Cargar qz-tray — en browser establece window.qz como efecto secundario
  await import('qz-tray')

  // Intentar obtener el objeto qz por todas las rutas posibles
  const win = window as any
  const candidate =
    win.qz?.websocket                    // window.qz (browser global)
      ? win.qz
      : (await import('qz-tray') as any).default?.websocket
        ? (await import('qz-tray') as any).default
        : null

  if (!candidate) {
    console.error('[QZ] No se encontró el objeto qz. window.qz:', typeof win.qz)
    throw new Error('No se pudo cargar la librería QZ Tray')
  }

  _qz = candidate
  return _qz
}

// Inicializar seguridad y conectar QZ Tray — reutilizable por cajón e impresión
async function conectarQZ(): Promise<{ qz: any; code?: string; error?: string } | null> {
  const qz = await getQZ()

  qz.security.setCertificatePromise((resolve: any, reject: any) => {
    fetch('/api/qz/certificate', { cache: 'no-store' })
      .then(r => r.ok ? resolve(r.text()) : reject('Error al obtener el certificado QZ'))
      .catch(reject)
  })
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((toSign: string) => (resolve: any, reject: any) => {
    fetch(`/api/qz/sign?request=${encodeURIComponent(toSign)}`, { cache: 'no-store' })
      .then(r => r.ok ? resolve(r.text()) : reject('Error al firmar el request'))
      .catch(reject)
  })

  if (!qz.websocket.isActive()) {
    console.log('[QZ] Intentando conectar a wss://localhost:8181...')
    try {
      await qz.websocket.connect({
        host: 'localhost',
        port: { secure: [8181], insecure: [8182] },
        usingSecure: true,
        retries: 2,
        delay: 0.5,
      })
      console.log('[QZ] Conectado correctamente')
    } catch (err: any) {
      console.warn('[QZ] WSS falló:', err?.message)
      console.log('[QZ] Intentando ws://localhost:8182 (insecure)...')
      try {
        await qz.websocket.connect({
          host: 'localhost',
          port: 8182,
          usingSecure: false,
          retries: 2,
          delay: 0.5,
        })
        console.log('[QZ] Conectado vía insecure')
      } catch (err2: any) {
        console.error('[QZ] Ambas conexiones fallaron. Error WSS:', err?.message, '| Error WS:', (err2 as any)?.message)
        const msg = (err?.message ?? '').toLowerCase()
        const code = msg.includes('unable to establish') || msg.includes('connection refused')
          ? 'QZ_NOT_RUNNING' : 'QZ_CERT'
        return { qz: null, code, error: code }
      }
    }
  }

  return { qz }
}

export async function abrirCajonQZ(
  nombreImpresora: string
): Promise<{ ok: boolean; error?: string; code?: string }> {
  try {
    const resultado = await conectarQZ()
    if (!resultado?.qz) return { ok: false, code: resultado?.code, error: resultado?.error }
    const { qz } = resultado

    const impresoras: string[] = await qz.printers.find(nombreImpresora)
    if (!impresoras.length) {
      return { ok: false, code: 'PRINTER_NOT_FOUND', error: `Impresora "${nombreImpresora}" no encontrada en Windows.` }
    }

    await qz.print(qz.configs.create(impresoras[0]), [
      { type: 'raw', format: 'command', flavor: 'plain', data: '\x1B\x70\x00\x40\xF0' },
      { type: 'raw', format: 'command', flavor: 'plain', data: '\x1B\x70\x01\x40\xF0' },
    ])

    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error con QZ Tray' }
  }
}

// Imprimir HTML directamente en la impresora térmica sin diálogo del navegador
export async function imprimirHtmlQZ(
  nombreImpresora: string,
  html: string
): Promise<{ ok: boolean; error?: string; code?: string }> {
  try {
    const resultado = await conectarQZ()
    if (!resultado?.qz) return { ok: false, code: resultado?.code, error: resultado?.error }
    const { qz } = resultado

    const impresoras: string[] = await qz.printers.find(nombreImpresora)
    if (!impresoras.length) {
      return { ok: false, code: 'PRINTER_NOT_FOUND', error: `Impresora "${nombreImpresora}" no encontrada en Windows.` }
    }

    const config = qz.configs.create(impresoras[0], {
      size: { width: 80, height: null },
      units: 'mm',
      density: 203,
      rasterize: false,
      colorType: 'blackwhite',
    })

    await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }])

    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error imprimiendo con QZ Tray' }
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function abrirCajon(config: CajonConfig): Promise<{ ok: boolean; error?: string; code?: string }> {
  if (config.modo === 'qz') {
    return abrirCajonQZ(config.nombreImpresora ?? '')
  }
  return abrirCajonSerial(config.baudRate ?? 9600, config.pin ?? 0)
}
