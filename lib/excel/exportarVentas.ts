// Utilidad para exportar ventas a Excel

import { DiaVenta, VentaPorMetodoPago, VentaHistorial } from '@/modules/dashboard/actions'

interface DatosExportacion {
  rangoTexto: string
  ventasPorDia: DiaVenta[]
  ventasPorMetodoPago: VentaPorMetodoPago[]
  historial: VentaHistorial[]
  totalPeriodo: number
  totalVentas: number
}

// Función para generar CSV
function generarCSV(datos: DatosExportacion): string {
  const lineas: string[] = []

  // Encabezado general
  lineas.push('REPORTE DE VENTAS - QUEEN BROASTER')
  lineas.push(`Período: ${datos.rangoTexto}`)
  lineas.push(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`)
  lineas.push('')

  // Resumen general
  lineas.push('RESUMEN GENERAL')
  lineas.push(`Total de ventas: $${Math.round(datos.totalPeriodo).toLocaleString('es-CO')}`)
  lineas.push(`Cantidad de transacciones: ${datos.totalVentas}`)
  lineas.push('')

  // Ventas por método de pago
  lineas.push('VENTAS POR MÉTODO DE PAGO')
  lineas.push('Método,Total ($),Cantidad,Porcentaje (%)')
  for (const metodo of datos.ventasPorMetodoPago) {
    lineas.push(`${metodo.metodo},$${Math.round(metodo.total).toLocaleString('es-CO')},${metodo.cantidad},${metodo.porcentaje.toFixed(1)}%`)
  }
  lineas.push('')

  // Ventas por día
  lineas.push('VENTAS DIARIAS')
  lineas.push('Día,Etiqueta,Total ($),Cantidad de ventas')
  for (const dia of datos.ventasPorDia) {
    lineas.push(`${dia.clave},${dia.etiqueta},$${Math.round(dia.total).toLocaleString('es-CO')},${dia.ventas}`)
  }
  lineas.push('')

  // Historial de ventas
  lineas.push('HISTORIAL DE VENTAS (Últimas 10)')
  lineas.push('ID,Total ($),Método de pago,Origen,Cliente,Factura,Fecha')
  for (const venta of datos.historial) {
    const fecha = new Date(venta.fecha).toLocaleString('es-CO')
    const cliente = venta.cliente ? `"${venta.cliente}"` : 'Consumidor final'
    const factura = venta.factura || 'N/A'
    lineas.push(`${venta.id},$${Math.round(venta.total).toLocaleString('es-CO')},${venta.metodoPago},${venta.mesa},${cliente},${factura},${fecha}`)
  }

  return lineas.join('\n')
}

// Descargar archivo CSV
export const exportarVentasCSV = (datos: DatosExportacion) => {
  const csv = generarCSV(datos)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const fecha = new Date().toISOString().split('T')[0]
  enlace.setAttribute('href', url)
  enlace.setAttribute('download', `ventas-${fecha}.csv`)
  enlace.style.visibility = 'hidden'

  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
}

// Función alternativa para exportar como XLSX (usando formato que Excel entiende)
export const exportarVentasExcel = (datos: DatosExportacion) => {
  // Usar el CSV - Excel lo abre sin problemas
  exportarVentasCSV(datos)
}
