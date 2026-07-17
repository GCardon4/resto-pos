'use client'

import { VentaPorMetodoPago, DiaVenta, VentaHistorial } from '@/modules/dashboard/actions'
import { exportarVentasExcel } from '@/lib/excel/exportarVentas'

interface Props {
  ventasPorMetodoPago: VentaPorMetodoPago[]
  ventasPorDia: DiaVenta[]
  historial: VentaHistorial[]
  rango: number
  totalPeriodo: number
}

// Iconos por método de pago
const iconoPago = (metodo: string): string => {
  const m = metodo.toLowerCase()
  if (m === 'efectivo' || m === 'cash') return 'payments'
  if (m === 'tarjeta' || m === 'card') return 'credit_card'
  if (m === 'transferencia' || m === 'transfer') return 'swap_horiz'
  if (m === 'nequi') return 'phone_iphone'
  if (m === 'daviplata') return 'mobile_friendly'
  if (m === 'contraentrega') return 'local_shipping'
  return 'wallet'
}

// Colores por método de pago
const colorPago = (metodo: string): { bg: string; text: string } => {
  const m = metodo.toLowerCase()
  if (m === 'efectivo' || m === 'cash') return { bg: 'bg-green-100', text: 'text-green-700' }
  if (m === 'tarjeta' || m === 'card') return { bg: 'bg-blue-100', text: 'text-blue-700' }
  if (m === 'transferencia' || m === 'transfer') return { bg: 'bg-purple-100', text: 'text-purple-700' }
  if (m === 'nequi') return { bg: 'bg-orange-100', text: 'text-orange-700' }
  if (m === 'daviplata') return { bg: 'bg-pink-100', text: 'text-pink-700' }
  if (m === 'contraentrega') return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-gray-100', text: 'text-gray-700' }
}

function formatoMoneda(n: number) {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

export function VentasPorMetodoPago({
  ventasPorMetodoPago,
  ventasPorDia,
  historial,
  rango,
  totalPeriodo,
}: Props) {
  const handleExportarExcel = () => {
    exportarVentasExcel({
      rangoTexto: `${rango} días`,
      ventasPorDia,
      ventasPorMetodoPago,
      historial,
      totalPeriodo,
      totalVentas: historial.length,
    })
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden">
      <div className="p-6 border-b border-surface-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-display font-semibold text-xl text-on-surface">Ventas por Método de Pago</h3>
          <p className="text-sm text-on-surface-variant">Últimos {rango} días</p>
        </div>
        <button
          onClick={handleExportarExcel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-sm"
          title="Descargar reporte en Excel"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar Excel
        </button>
      </div>

      {ventasPorMetodoPago.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">wallet</span>
          <p className="text-on-surface-variant text-sm">Sin ventas registradas</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* Tarjetas por método de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ventasPorMetodoPago.map(metodo => {
              const { bg, text } = colorPago(metodo.metodo)
              return (
                <div key={metodo.metodo} className="p-4 rounded-xl border-2 border-surface-variant hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-lg ${bg}`}>
                      <span className={`material-symbols-outlined text-[20px] ${text}`}>
                        {iconoPago(metodo.metodo)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{metodo.metodo}</p>
                      <p className="text-xs text-on-surface-variant">{metodo.cantidad} transacciones</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-bold text-lg text-on-surface">{formatoMoneda(metodo.total)}</span>
                    <span className="text-xs font-semibold text-on-surface-variant">{metodo.porcentaje.toFixed(1)}%</span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="mt-3 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metodo.metodo === 'Efectivo'
                          ? 'bg-green-500'
                          : metodo.metodo === 'Tarjeta'
                            ? 'bg-blue-500'
                            : metodo.metodo === 'Transferencia'
                              ? 'bg-purple-500'
                              : 'bg-primary'
                      }`}
                      style={{ width: `${metodo.porcentaje}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tabla resumen */}
          <div className="mt-6 pt-6 border-t border-surface-variant">
            <h4 className="font-semibold text-sm text-on-surface mb-3">Resumen Detallado</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-variant">
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant">Método</th>
                    <th className="text-right py-2 px-3 font-semibold text-on-surface-variant">Total</th>
                    <th className="text-right py-2 px-3 font-semibold text-on-surface-variant">Transacciones</th>
                    <th className="text-right py-2 px-3 font-semibold text-on-surface-variant">Porcentaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {ventasPorMetodoPago.map(metodo => (
                    <tr key={metodo.metodo} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                            {iconoPago(metodo.metodo)}
                          </span>
                          <span className="font-medium text-on-surface">{metodo.metodo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-display font-bold text-on-surface">
                        {formatoMoneda(metodo.total)}
                      </td>
                      <td className="py-3 px-3 text-right text-on-surface-variant">{metodo.cantidad}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                          {metodo.porcentaje.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
