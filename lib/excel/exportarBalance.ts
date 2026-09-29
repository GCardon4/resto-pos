// Utilidad para exportar el balance mensual (ingresos vs gastos) a Excel/CSV

import { MesBalance } from '@/modules/dashboard/actions'
import { formatearFecha, formatearFechaHora } from '@/lib/fecha/zonaHoraria'

const moneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

// Generar el contenido CSV del balance mensual completo
function generarCSV(meses: MesBalance[]): string {
  const lineas: string[] = []

  lineas.push('BALANCE MENSUAL - INGRESOS Y GASTOS')
  lineas.push(`Fecha de generación: ${formatearFechaHora(new Date())}`)
  lineas.push('')

  lineas.push('RESUMEN POR MES')
  lineas.push('Mes,Ingresos ($),Gastos ($),Balance ($)')
  for (const mes of meses) {
    lineas.push(`${mes.etiqueta},${moneda(mes.ingresos)},${moneda(mes.gastos)},${moneda(mes.balance)}`)
  }
  lineas.push('')

  for (const mes of meses) {
    if (mes.movimientos.length === 0) continue
    lineas.push(`DETALLE - ${mes.etiqueta.toUpperCase()}`)
    lineas.push('Fecha,Tipo,Concepto,Método/Categoría,Valor ($)')
    for (const mov of mes.movimientos) {
      const tipo = mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'
      const concepto = mov.concepto.includes(',') ? `"${mov.concepto}"` : mov.concepto
      lineas.push(`${formatearFecha(mov.fecha)},${tipo},${concepto},${mov.metodo},${moneda(mov.valor)}`)
    }
    lineas.push('')
  }

  return lineas.join('\n')
}

// Descargar el balance mensual como archivo CSV (Excel lo abre sin problemas)
export const exportarBalanceExcel = (meses: MesBalance[]) => {
  const csv = generarCSV(meses)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const fecha = new Date().toISOString().split('T')[0]
  enlace.setAttribute('href', url)
  enlace.setAttribute('download', `balance-mensual-${fecha}.csv`)
  enlace.style.visibility = 'hidden'

  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
}
