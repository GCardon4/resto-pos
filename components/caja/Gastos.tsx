'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  obtenerCategoriasGasto,
  obtenerGastos,
  crearGasto,
  eliminarGasto,
  type CategoriaGasto,
  type Gasto,
} from '@/modules/gastos/actions'

const hoyISO = () => new Date().toISOString().slice(0, 10)

// Componente principal del módulo de gastos
export function Gastos() {
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [recarga, setRecarga] = useState(0)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [form, setForm] = useState({ fecha: hoyISO(), categoriaId: '', descripcion: '', monto: '' })

  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  // setCargando en el handler (evento de usuario) — nunca síncrono en el efecto
  const cargarDatos = useCallback(() => {
    setCargando(true)
    setError(null)
    setRecarga(n => n + 1)
  }, [])

  // Fetch de datos — setState solo dentro del callback async (post-await)
  useEffect(() => {
    let activo = true
    async function cargar() {
      const [resCategorias, resGastos] = await Promise.all([
        obtenerCategoriasGasto(),
        obtenerGastos(),
      ])
      if (!activo) return
      setCargando(false)
      if (resGastos.error) setError(resGastos.error)
      else setGastos(resGastos.gastos)
      setCategorias(resCategorias.categorias)
    }
    cargar()
    return () => { activo = false }
  }, [recarga])

  // Abrir el modal de registro con el formulario limpio
  const abrirModal = () => {
    setForm({ fecha: hoyISO(), categoriaId: categorias[0] ? String(categorias[0].id) : '', descripcion: '', monto: '' })
    setErrorForm(null)
    setModalAbierto(true)
  }

  // Guardar un nuevo gasto desde el formulario
  const handleGuardarGasto = async () => {
    const monto = Number(form.monto)
    if (!form.categoriaId || !monto || monto <= 0) {
      setErrorForm('Selecciona categoría e ingresa un monto válido')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    const res = await crearGasto({
      fecha: form.fecha,
      categoriaId: Number(form.categoriaId),
      descripcion: form.descripcion.trim(),
      monto,
    })
    setGuardando(false)
    if (res.error) {
      setErrorForm(res.error)
      return
    }
    setModalAbierto(false)
    cargarDatos()
  }

  // Eliminar un gasto registrado por error
  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar este gasto?')) return
    setEliminandoId(id)
    await eliminarGasto(id)
    setEliminandoId(null)
    cargarDatos()
  }

  // Filtrar por descripción o categoría
  const gastosFiltrados = gastos.filter(g => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      (g.description ?? '').toLowerCase().includes(q) ||
      (g.expense_categories?.name ?? '').toLowerCase().includes(q)
    )
  })

  // Total del período visible
  const totalPeriodo = gastosFiltrados.reduce((acc, g) => acc + Number(g.amount), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Barra de búsqueda y acciones */}
      <div className="sticky top-0 z-10 bg-surface border-b border-surface-variant px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
        <button
          onClick={cargarDatos}
          disabled={cargando}
          title="Actualizar gastos"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-[20px] ${cargando ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
        <button
          onClick={abrirModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="hidden sm:inline">Nuevo gasto</span>
        </button>
      </div>

      {/* Modal de registro de gasto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">payments</span>
                  Nuevo Gasto
                </h3>
                <p className="text-sm text-on-surface-variant mt-0.5">Registra un egreso de caja</p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Categoría *
                </label>
                <select
                  value={form.categoriaId}
                  onChange={e => setForm(prev => ({ ...prev, categoriaId: e.target.value }))}
                  className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categorias.length === 0 && (
                  <p className="text-xs text-error mt-1.5">No hay categorías creadas en Supabase todavía</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Descripción
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Pago de transporte"
                  className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Monto *
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.monto}
                  onChange={e => setForm(prev => ({ ...prev, monto: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>

              {errorForm && (
                <div className="flex items-center gap-2 bg-error-container text-error px-3 py-2.5 rounded-xl text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {errorForm}
                </div>
              )}
            </div>

            <div className="px-5 pb-6 pt-3 grid grid-cols-2 gap-3 shrink-0 border-t border-surface-variant">
              <button
                onClick={() => setModalAbierto(false)}
                className="py-3.5 rounded-2xl border-2 border-surface-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarGasto}
                disabled={guardando}
                className="py-3.5 rounded-2xl bg-primary text-on-primary font-display font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {guardando ? 'hourglass_empty' : 'save'}
                </span>
                {guardando ? 'Guardando...' : 'Guardar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-surface-container-low pb-24 md:pb-6">

        {/* Estado: cargando */}
        {cargando && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant">Cargando gastos...</p>
          </div>
        )}

        {/* Estado: error */}
        {!cargando && error && (
          <div className="flex items-center gap-3 bg-error-container text-error px-4 py-3 rounded-xl mb-4">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Estado: sin resultados */}
        {!cargando && !error && gastosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <span className="material-symbols-outlined text-5xl text-outline">payments</span>
            <p className="text-on-surface-variant text-sm">
              {busqueda ? 'Sin resultados para la búsqueda' : 'No hay gastos registrados'}
            </p>
          </div>
        )}

        {/* Lista de gastos */}
        {!cargando && !error && gastosFiltrados.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Resumen del período */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-on-surface-variant">
                <strong className="text-on-surface">{gastosFiltrados.length}</strong>{' '}
                gasto{gastosFiltrados.length !== 1 ? 's' : ''}
                {busqueda && ` para "${busqueda}"`}
              </p>
              {!busqueda && (
                <p className="text-xs text-on-surface-variant">
                  Total:{' '}
                  <strong className="text-error text-sm">
                    ${totalPeriodo.toLocaleString('es-CO')}
                  </strong>
                </p>
              )}
            </div>

            {gastosFiltrados.map(gasto => {
              const fecha = new Date(`${gasto.expense_date}T00:00:00`).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
              })

              return (
                <div
                  key={gasto.id}
                  className="bg-surface rounded-2xl border border-surface-variant p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/30 transition-colors"
                >
                  {/* Icono + datos principales */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-error-container">
                      <span
                        className="material-symbols-outlined text-[22px] text-error"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        payments
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-on-surface text-base leading-tight truncate">
                        {gasto.expense_categories?.name ?? 'Sin categoría'}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {fecha}
                        {gasto.description && ` · ${gasto.description}`}
                      </p>
                    </div>
                  </div>

                  {/* Monto + acciones */}
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap sm:justify-end">
                    <p className="font-display font-bold text-xl text-error whitespace-nowrap">
                      -${Number(gasto.amount).toLocaleString('es-CO')}
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEliminar(gasto.id)}
                        disabled={eliminandoId === gasto.id}
                        title="Eliminar gasto"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
