// Utilidades centralizadas de fecha/hora en la zona horaria del negocio (Colombia)
// Usar siempre estas funciones en vez de toLocaleString/toLocaleDateString/toLocaleTimeString
// directos, para no depender de la zona horaria del navegador o del servidor donde corre la app.

export const ZONA_HORARIA = 'America/Bogota'

// Formatear fecha y hora completas, ej: "15/09/2026, 07:32 p. m."
export function formatearFechaHora(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleString('es-CO', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

// Formatear solo la fecha, ej: "15/09/2026"
export function formatearFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleDateString('es-CO', { timeZone: ZONA_HORARIA })
}

// Formatear solo la hora, ej: "07:32 p. m."
export function formatearHora(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleTimeString('es-CO', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Clave de día local (YYYY-MM-DD) para agrupar por día del negocio, no por UTC
export function claveDiaLocal(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA })
}

// Etiqueta corta del día de la semana (Lun, Mar...) capitalizada, en zona local
export function etiquetaDiaLocal(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const txt = d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: ZONA_HORARIA })
  return txt.charAt(0).toUpperCase() + txt.slice(1, 3)
}
