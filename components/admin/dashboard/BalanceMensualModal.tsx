'use client'

import { useState } from 'react'
import { obtenerBalanceMensual, type MesBalance } from '@/modules/dashboard/actions'
import { exportarBalanceExcel } from '@/lib/excel/exportarBalance'
import { formatearFecha } from '@/lib/fecha/zonaHoraria'

const moneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

// Modal de Balance Mensual: ingresos, gastos y balance por mes, con detalle y exportación
export function BalanceMensualModal() {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [meses, setMeses] = useState<MesBalance[]>([])
  const [mesSeleccionado, setMesSeleccionado] = useState<MesBalance | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abrir = async () => {
    setAbierto(true)
    setMesSeleccionado(null)
    if (meses.length > 0) return
    setCargando(true)
    setError(null)
    try {
      const data = await obtenerBalanceMensual(12)
      setMeses(data)
    } catch {
      setError('No se pudo cargar el balance mensual')
    } finally {
      setCargando(false)
    }
  }

  const cerrar = () => { setAbierto(false); setMesSeleccionado(null) }

  return (
    <>
      {/* Tarjeta de acceso rápido */}
      <button
        onClick={abrir}
        className="group bg-surface-container-lowest hover:bg-surface-container-low border border-surface-variant hover:border-primary/20 rounded-xl p-5 transition-all flex items-start gap-4 text-left w-full"
      >
        <div className="p-2.5 bg-surface-container rounded-lg text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
          <span className="material-symbols-outlined text-[22px]">calendar_month</span>
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm text-on-surface group-hover:text-primary transition-colors mb-1">
            Balance Mensual
          </h4>
          <p className="text-xs text-on-surface-variant">Ingresos, gastos y balance por mes</p>
        </div>
      </button>

      {/* Modal */}
      {abierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Encabezado */}
            <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {mesSeleccionado && (
                  <button
                    onClick={() => setMesSeleccionado(null)}
                    className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-lg text-on-surface truncate">
                    {mesSeleccionado ? mesSeleccionado.etiqueta : 'Balance Mensual'}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {mesSeleccionado ? 'Ingresos, gastos y movimientos del mes' : 'Últimos 12 meses'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!mesSeleccionado && meses.length > 0 && (
                  <button
                    onClick={() => exportarBalanceExcel(meses)}
                    title="Exportar a Excel"
                    className="flex items-center gap-1.5 text-xs border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-2 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span className="hidden sm:inline">Exportar a Excel</span>
                  </button>
                )}
                <button
                  onClick={cerrar}
                  className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto flex-1">
              {cargando ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2 animate-spin">progress_activity</span>
                  <p className="text-on-surface-variant text-sm">Cargando balance...</p>
                </div>
              ) : error ? (
                <p className="m-6 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{error}</p>
              ) : mesSeleccionado ? (
                <DetalleMes mes={mesSeleccionado} />
              ) : (
                <ListaMeses meses={meses} onSeleccionar={setMesSeleccionado} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Lista de meses con ingresos, gastos y balance
function ListaMeses({ meses, onSeleccionar }: { meses: MesBalance[]; onSeleccionar: (mes: MesBalance) => void }) {
  if (meses.every(m => m.ingresos === 0 && m.gastos === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-outline mb-3">bar_chart</span>
        <p className="text-on-surface-variant text-sm">Sin movimientos registrados</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-surface-variant">
      {meses.map(mes => (
        <button
          key={mes.clave}
          onClick={() => onSeleccionar(mes)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 hover:bg-surface-container-low/50 transition-colors text-left"
        >
          <div className="min-w-0">
            <p className="font-display font-semibold text-on-surface capitalize">{mes.etiqueta}</p>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-secondary font-medium">+{moneda(mes.ingresos)}</span>
              <span className="text-error font-medium">-{moneda(mes.gastos)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-display font-bold ${mes.balance >= 0 ? 'text-on-surface' : 'text-error'}`}>
              {moneda(mes.balance)}
            </span>
            <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// Detalle de un mes: resumen y movimientos individuales
function DetalleMes({ mes }: { mes: MesBalance }) {
  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 p-6">
        <div className="bg-surface-container-low rounded-xl p-3 text-center">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-1">Ingresos</p>
          <p className="font-display font-bold text-secondary text-sm sm:text-base">{moneda(mes.ingresos)}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-3 text-center">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-1">Gastos</p>
          <p className="font-display font-bold text-error text-sm sm:text-base">{moneda(mes.gastos)}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-3 text-center">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-1">Balance</p>
          <p className={`font-display font-bold text-sm sm:text-base ${mes.balance >= 0 ? 'text-primary' : 'text-error'}`}>
            {moneda(mes.balance)}
          </p>
        </div>
      </div>

      {/* Movimientos detallados */}
      {mes.movimientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
          <p className="text-on-surface-variant text-sm">Sin movimientos este mes</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-variant border-t border-surface-variant">
          {mes.movimientos.map((mov, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-6 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface font-medium truncate">{mov.concepto}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-on-surface-variant">{formatearFecha(mov.fecha)}</span>
                  <span className="text-xs text-on-surface-variant">•</span>
                  <span className="text-xs text-on-surface-variant">{mov.metodo}</span>
                </div>
              </div>
              <span className={`font-display font-bold text-sm shrink-0 ${mov.tipo === 'ingreso' ? 'text-secondary' : 'text-error'}`}>
                {mov.tipo === 'ingreso' ? '+' : '-'}{moneda(mov.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
