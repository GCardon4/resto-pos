'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { marcarOrdenLista } from '@/modules/cocina/actions'

interface AddonOrden {
  id: number
  nombre: string
  precio: number
}

interface ItemOrden {
  id: number
  nombre: string
  cantidad: number
  notas: string | null
  addons: AddonOrden[]
}

interface OrdenCocina {
  id: number
  tipo: 'mesa' | 'domicilio'
  customerInfo: string | null
  tableName: string
  tableNumber: number
  createdAt: string
  gps?: number | null
  items: ItemOrden[]
}

// Tiempo objetivo de preparación por tipo (segundos)
const TARGET_MESA      = 20 * 60  // 20 min
const TARGET_DOMICILIO = 35 * 60  // 35 min

// ─── Reloj en tiempo real ─────────────────────────────────────────────────────
function RelojDisplay() {
  const [hora, setHora] = useState('')

  useEffect(() => {
    const actualizar = () =>
      setHora(new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }))
    actualizar()
    const id = setInterval(actualizar, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-2xl font-black text-on-surface tabular-nums tracking-tight">
      {hora}
    </span>
  )
}

// ─── Timer regresivo por pedido ───────────────────────────────────────────────
function TimerBadge({ createdAt, targetSeconds }: { createdAt: string; targetSeconds: number }) {
  const [remaining, setRemaining] = useState(targetSeconds)

  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
      return targetSeconds - elapsed
    }
    setRemaining(calc())
    const id = setInterval(() => setRemaining(calc()), 1000)
    return () => clearInterval(id)
  }, [createdAt, targetSeconds])

  const isOverdue  = remaining <= 0
  const isCritical = remaining > 0 && remaining < 600   // < 10 min → rojo
  const isWarning  = remaining >= 600 && remaining < 900 // 10-15 min → amarillo

  const abs  = Math.abs(remaining)
  const mins = Math.floor(abs / 60)
  const secs = abs % 60
  const label = `${isOverdue ? '+' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl min-w-[80px] select-none shrink-0 ${
      isOverdue || isCritical
        ? 'bg-primary text-on-primary animate-pulse'
        : isWarning
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-surface-container text-on-surface-variant'
    }`}>
      <span className="material-symbols-outlined text-[18px] mb-0.5">
        {isOverdue ? 'alarm_off' : 'timer'}
      </span>
      <span className="text-xl font-black font-mono tabular-nums leading-none">{label}</span>
      {isCritical && (
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-85 mt-0.5">urgente</span>
      )}
      {isOverdue && (
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-85 mt-0.5">retrasado</span>
      )}
    </div>
  )
}

// ─── Tarjeta de pedido ────────────────────────────────────────────────────────
function OrdenCard({
  orden,
  esLista,
  onMarcar,
}: {
  orden: OrdenCocina
  esLista: boolean
  onMarcar: (id: number, tableNumber: number, tipo: 'mesa' | 'domicilio') => void
}) {
  const targetSeconds = orden.tipo === 'domicilio' ? TARGET_DOMICILIO : TARGET_MESA
  const elapsed = Math.floor((Date.now() - new Date(orden.createdAt).getTime()) / 1000)
  const remaining = targetSeconds - elapsed
  const isOverdue  = remaining <= 0
  const isCritical = remaining > 0 && remaining < 600

  return (
    <div className={`bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all duration-300 border-l-[6px] ${
      esLista ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
    } ${
      isOverdue
        ? 'border-error shadow-error/10'
        : isCritical
          ? 'border-primary shadow-primary/10 shadow-md'
          : orden.tipo === 'domicilio'
            ? 'border-tertiary'
            : 'border-secondary-container'
    }`}>

      {/* Cabecera */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-variant flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
            Pedido #{String(orden.id).padStart(4, '0')}
          </span>

          {orden.tipo === 'mesa' ? (
            <>
              <h3 className={`font-display font-black leading-none ${
                isCritical || isOverdue ? 'text-primary text-3xl' : 'text-on-surface text-3xl'
              }`}>
                Mesa {String(orden.tableNumber).padStart(2, '0')}
              </h3>
              {orden.tableName && (
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{orden.tableName}</p>
              )}
              {orden.gps != null && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>gps_fixed</span>
                  <span className="font-display font-black text-2xl text-primary leading-none">#{orden.gps}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-display font-black text-2xl text-tertiary leading-none">
                Domicilio
              </h3>
              {orden.customerInfo && (
                <p className="text-xs text-on-surface-variant mt-0.5 truncate font-medium">
                  {orden.customerInfo}
                </p>
              )}
            </>
          )}
        </div>

        <TimerBadge createdAt={orden.createdAt} targetSeconds={targetSeconds} />
      </div>

      {/* Ítems */}
      <div className="px-4 py-3 flex-1 space-y-2.5">
        {orden.items.map(item => {
          const tieneAlerta = item.notas ? /alerg/i.test(item.notas) : false
          return (
            <div key={item.id}>
              <p className="font-display font-bold text-base text-on-surface leading-snug">
                <span className={`mr-1 font-black ${
                  orden.tipo === 'domicilio' ? 'text-tertiary' : 'text-primary'
                }`}>
                  {item.cantidad}x
                </span>
                {item.nombre}
              </p>
              {item.notas && (
                <div className={`mt-1.5 px-3 py-1.5 rounded-lg flex items-start gap-2 ${
                  tieneAlerta
                    ? 'bg-error-container border border-error/30'
                    : 'bg-surface-container border border-surface-variant'
                }`}>
                  <span
                    className={`material-symbols-outlined text-[15px] shrink-0 mt-0.5 ${
                      tieneAlerta ? 'text-error' : 'text-on-surface-variant'
                    }`}
                    style={{ fontVariationSettings: tieneAlerta ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {tieneAlerta ? 'warning' : 'info'}
                  </span>
                  <p className={`text-xs leading-snug ${
                    tieneAlerta
                      ? 'text-on-error-container font-bold uppercase'
                      : 'text-on-surface-variant'
                  }`}>
                    {item.notas}
                  </p>
                </div>
              )}
              {/* Complementos de este producto */}
              {item.addons.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.addons.map(addon => (
                    <span
                      key={addon.id}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold"
                    >
                      <span className="material-symbols-outlined text-[12px]">add</span>
                      {addon.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botón marcar listo */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={() => onMarcar(orden.id, orden.tableNumber, orden.tipo)}
          disabled={esLista}
          className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
            isOverdue || isCritical
              ? 'bg-primary text-on-primary hover:brightness-110 shadow-md shadow-primary/20'
              : orden.tipo === 'domicilio'
                ? 'bg-tertiary-container text-on-tertiary-container hover:brightness-105'
                : 'bg-secondary-container text-on-secondary-container hover:brightness-105'
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {esLista ? 'hourglass_empty' : 'check_circle'}
          </span>
          {esLista ? 'Marcando...' : 'Marcar Listo'}
        </button>
      </div>
    </div>
  )
}

// ─── Columna de pedidos ───────────────────────────────────────────────────────
function ColumnaOrdenes({
  titulo,
  icono,
  ordenes,
  ordenesListas,
  colorHeader,
  emptyLabel,
  onMarcar,
}: {
  titulo: string
  icono: string
  ordenes: OrdenCocina[]
  ordenesListas: Set<number>
  colorHeader: string
  emptyLabel: string
  onMarcar: (id: number, tableNumber: number, tipo: 'mesa' | 'domicilio') => void
}) {
  const pending = ordenes.filter(o => !ordenesListas.has(o.id))
  const criticos = pending.filter(o => {
    const target = o.tipo === 'domicilio' ? TARGET_DOMICILIO : TARGET_MESA
    const elapsed = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 1000)
    return target - elapsed < 600 // < 10 min
  })

  return (
    <section className="flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 border-surface-variant">

      {/* Encabezado columna */}
      <div className="px-5 py-3 flex items-center justify-between shrink-0 bg-surface-container-low border-b border-surface-variant">
        <h2 className={`font-display font-bold text-sm flex items-center gap-2 uppercase tracking-wider ${colorHeader}`}>
          <span className="material-symbols-outlined text-[18px]">{icono}</span>
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          {criticos.length > 0 && (
            <span className="bg-error text-on-error text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">
              {criticos.length} urgente{criticos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="bg-surface-container-highest text-on-surface text-xs font-bold px-3 py-1 rounded-full">
            {ordenes.length}
          </span>
        </div>
      </div>

      {/* Lista de pedidos — newest first (ya viene ordenado desde el servidor) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">{icono}</span>
            <p className="text-sm text-on-surface-variant font-medium text-center px-4">{emptyLabel}</p>
          </div>
        ) : (
          ordenes.map(o => (
            <OrdenCard
              key={o.id}
              orden={o}
              esLista={ordenesListas.has(o.id)}
              onMarcar={onMarcar}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CocinaDisplay({
  ordenes,
  pedidosHoy,
  nombreUsuario,
}: {
  ordenes: OrdenCocina[]
  pedidosHoy: number
  nombreUsuario: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [ordenesListas, setOrdenesListas] = useState<Set<number>>(new Set())
  const [toasts, setToasts] = useState<{ id: number; texto: string }[]>([])
  // Tick para recalcular columnas urgentes cada minuto
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Realtime Supabase — detecta nuevos pedidos desde caja
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('cocina-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, () => router.refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items' }, () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_item_adds_on' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  // Fallback refresh cada 60s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000)
    return () => clearInterval(id)
  }, [router])

  const mostrarToast = (texto: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, texto }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const handleMarcarListo = (
    ordenId: number,
    tableNumber: number,
    tipo: 'mesa' | 'domicilio'
  ) => {
    setOrdenesListas(prev => new Set([...prev, ordenId]))
    const etiqueta = tipo === 'domicilio'
      ? `Domicilio #${String(ordenId).padStart(4, '0')}`
      : `Mesa ${String(tableNumber).padStart(2, '0')}`
    mostrarToast(`${etiqueta} marcado listo ✓`)

    startTransition(async () => {
      await marcarOrdenLista(ordenId)
      setTimeout(() => {
        setOrdenesListas(prev => { const n = new Set(prev); n.delete(ordenId); return n })
        router.refresh()
      }, 900)
    })
  }

  // Separar por tipo (el orden ya viene newest-first del servidor)
  const mesas      = ordenes.filter(o => o.tipo === 'mesa')
  const domicilios = ordenes.filter(o => o.tipo === 'domicilio')

  const totalCriticos = ordenes.filter(o => {
    const target = o.tipo === 'domicilio' ? TARGET_DOMICILIO : TARGET_MESA
    const elapsed = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 1000)
    return target - elapsed < 600
  }).length

  const iniciales = nombreUsuario
    .split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="h-screen bg-surface-container flex flex-col overflow-hidden">

      {/* ── Toasts ── */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-inverse-surface text-inverse-on-surface px-6 py-3.5 rounded-2xl shadow-2xl font-display font-bold text-sm flex items-center gap-3"
          >
            <span
              className="material-symbols-outlined text-[18px] text-secondary-fixed"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {toast.texto}
          </div>
        ))}
      </div>

      {/* ── Cabecera ── */}
      <header className="bg-surface-container-lowest border-b border-outline-variant px-6 lg:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[36px]">restaurant_menu</span>
          <div>
            <h1 className="font-display font-black text-xl text-primary uppercase tracking-tight leading-none">
              Kitchen Display
            </h1>
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest mt-0.5">
              Queen Broaster · Monitoreo en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-5">
          <div className="hidden sm:flex flex-col items-end">
            <RelojDisplay />
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Turno activo</span>
          </div>
          <div className="h-10 w-px bg-outline-variant hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-on-surface leading-none">{nombreUsuario}</p>
              <p className="text-[10px] font-bold text-primary uppercase mt-0.5">Cocina</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-display font-bold text-sm flex items-center justify-center border-2 border-primary shrink-0">
              {iniciales}
            </div>
          </div>
          <div className="h-10 w-px bg-outline-variant" />
          <Link
            href="/caja"
            className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-high px-3 py-2 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span className="hidden md:inline">Caja</span>
          </Link>
        </div>
      </header>

      {/* ── Barra de estado ── */}
      <div className="bg-surface-container-lowest border-b border-surface-variant px-6 lg:px-8 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">table_restaurant</span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface">{mesas.length}</strong> mesas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">delivery_dining</span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface">{domicilios.length}</strong> domicilios
            </span>
          </div>
          {totalCriticos > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" />
              <span className="text-error font-bold">
                {totalCriticos} urgente{totalCriticos > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">refresh</span>
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* ── Contenido principal: 2 columnas ── */}
      <main className="flex-1 overflow-hidden flex">
        {ordenes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
            <div className="w-20 h-20 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline">restaurant</span>
            </div>
            <div className="text-center">
              <p className="font-display font-black text-xl text-on-surface-variant">Sin pedidos pendientes</p>
              <p className="text-sm text-on-surface-variant mt-1">La cocina está al día</p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-5 py-2.5 rounded-2xl text-sm font-medium">
              <span
                className="material-symbols-outlined text-[18px] text-green-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              Todos los pedidos han sido atendidos
            </div>
          </div>
        ) : (
          <>
            <ColumnaOrdenes
              titulo="Mesas"
              icono="table_restaurant"
              ordenes={mesas}
              ordenesListas={ordenesListas}
              colorHeader="text-on-surface"
              emptyLabel="Sin pedidos de mesa pendientes"
              onMarcar={handleMarcarListo}
            />
            <ColumnaOrdenes
              titulo="Domicilios"
              icono="delivery_dining"
              ordenes={domicilios}
              ordenesListas={ordenesListas}
              colorHeader="text-tertiary"
              emptyLabel="Sin domicilios pendientes"
              onMarcar={handleMarcarListo}
            />
          </>
        )}
      </main>

      {/* ── Footer de estadísticas ── */}
      <footer className="bg-inverse-surface text-inverse-on-surface px-6 py-3.5 flex items-center justify-around border-t border-outline shrink-0">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Mesas pendientes</span>
          <span className="font-display font-black text-2xl text-secondary-fixed tabular-nums">{mesas.length}</span>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Domicilios pendientes</span>
          <span className="font-display font-black text-2xl text-tertiary-fixed tabular-nums">{domicilios.length}</span>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Pedidos hoy</span>
          <span className="font-display font-black text-2xl tabular-nums">{pedidosHoy}</span>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase opacity-60 tracking-wider">Estado</span>
          <span className={`font-display font-black text-xl tabular-nums ${
            totalCriticos > 0 ? 'text-primary-fixed' : 'text-tertiary-fixed'
          }`}>
            {totalCriticos > 0 ? `${totalCriticos} URGENTE${totalCriticos > 1 ? 'S' : ''}` : 'AL DÍA'}
          </span>
        </div>
      </footer>
    </div>
  )
}
