'use server'

import { createClient } from '@/lib/supabase/server'

// Zona horaria del negocio (Colombia) para agrupar ventas por día correctamente
const ZONA_HORARIA = 'America/Bogota'

// Clave de día local (YYYY-MM-DD) a partir de una fecha
function claveDia(fecha: Date): string {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA })
}

// Etiqueta corta del día de la semana (Lun, Mar...) capitalizada
function etiquetaDia(fecha: Date): string {
  const txt = fecha.toLocaleDateString('es-CO', { weekday: 'short', timeZone: ZONA_HORARIA })
  return txt.charAt(0).toUpperCase() + txt.slice(1, 3)
}

function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? 0))
  return isNaN(n) ? 0 : n
}

// Normalizar nombre de método de pago
function normalizarMetodoPago(metodo: string): string {
  const mapa: Record<string, string> = {
    'efectivo': 'Efectivo',
    'cash': 'Efectivo',
    'tarjeta': 'Tarjeta',
    'card': 'Tarjeta',
    'transferencia': 'Transferencia',
    'transfer': 'Transferencia',
    'nequi': 'Nequi',
    'daviplata': 'Daviplata',
    'contraentrega': 'Contraentrega',
  }
  return mapa[metodo.toLowerCase()] || (metodo.charAt(0).toUpperCase() + metodo.slice(1))
}

export interface DiaVenta { clave: string; etiqueta: string; total: number; ventas: number; esHoy: boolean }
export interface ProductoVendido { productId: number; nombre: string; imagen: string | null; cantidad: number; ingresos: number }
export interface MargenProducto { productId: number; nombre: string; cantidad: number; ingresos: number; costo: number; ganancia: number; margenPct: number }
export interface VentaHistorial { id: number; total: number; metodoPago: string; fecha: string; mesa: string | null; cliente: string | null; factura: string | null }
export interface ResumenPeriodo { total: number; ventas: number; ticketPromedio: number; costo: number; ganancia: number; margenPct: number }
export interface VentaPorMetodoPago { metodo: string; total: number; cantidad: number; porcentaje: number }

export interface MetricasDashboard {
  rango: number
  hoy: { total: number; ventas: number; ticketPromedio: number }
  periodo: ResumenPeriodo
  ventasPorDia: DiaVenta[]
  productosMasVendidos: ProductoVendido[]
  margenProductos: MargenProducto[]
  historial: VentaHistorial[]
  ventasPorMetodoPago: VentaPorMetodoPago[]
}

// Obtener métricas del dashboard administrativo (ventas diarias, historial, más vendidos y margen)
export async function obtenerMetricasDashboard(dias = 7): Promise<MetricasDashboard> {
  const supabase = await createClient()

  // Construir las claves de los últimos `dias` días (incluyendo hoy) en zona local
  const ahora = new Date()
  const dosDias = 24 * 60 * 60 * 1000
  const diasObjetivo: DiaVenta[] = []
  const hoyClave = claveDia(ahora)
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ahora.getTime() - i * dosDias)
    const clave = claveDia(d)
    diasObjetivo.push({ clave, etiqueta: etiquetaDia(d), total: 0, ventas: 0, esHoy: clave === hoyClave })
  }

  // Límite inferior del rango para la consulta (un día extra de margen por la zona horaria)
  const desde = new Date(ahora.getTime() - dias * dosDias)

  // Ventas del periodo con datos de la orden (mesa, cliente y factura)
  const { data: ventasRaw } = await supabase
    .from('sales')
    .select(`
      id, total, subtotal, payment_method, created_at, order_id,
      order:order_id (
        id,
        tables:table_id (number, name),
        customer:customer_id (full_name, nit),
        invoice (invoice_number)
      )
    `)
    .gte('created_at', desde.toISOString())
    .order('created_at', { ascending: false })

  const ventas = (ventasRaw ?? []) as any[]

  // Mapa rápido de día -> índice para acumular ventas por jornada
  const indicePorClave = new Map(diasObjetivo.map((d, i) => [d.clave, i]))

  let totalHoy = 0
  let ventasHoy = 0
  let totalPeriodo = 0

  for (const v of ventas) {
    const total = aNumero(v.total)
    const claveVenta = claveDia(new Date(v.created_at))
    const idx = indicePorClave.get(claveVenta)
    if (idx !== undefined) {
      diasObjetivo[idx].total += total
      diasObjetivo[idx].ventas += 1
    }
    totalPeriodo += total
    if (claveVenta === hoyClave) {
      totalHoy += total
      ventasHoy += 1
    }
  }

  // Ítems vendidos del periodo para calcular más vendidos y margen de ganancia
  const orderIds = [...new Set(ventas.map(v => v.order_id).filter((id): id is number => id != null))]

  let itemsRaw: any[] = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('product_id, quantity, price, products:product_id (name, cost, image_url)')
      .in('order_id', orderIds)
    itemsRaw = (data ?? []) as any[]
  }

  // Acumular por producto: cantidad, ingresos y costo
  const acumulado = new Map<number, MargenProducto>()
  for (const it of itemsRaw) {
    const productId = it.product_id as number
    if (productId == null) continue
    const cantidad = aNumero(it.quantity)
    const precio = aNumero(it.price)
    const prod = it.products as any
    const costoUnit = aNumero(prod?.cost)
    const ingresos = precio * cantidad
    const costo = costoUnit * cantidad

    const actual = acumulado.get(productId) ?? {
      productId,
      nombre: prod?.name ?? 'Producto',
      cantidad: 0,
      ingresos: 0,
      costo: 0,
      ganancia: 0,
      margenPct: 0,
    }
    actual.cantidad += cantidad
    actual.ingresos += ingresos
    actual.costo += costo
    acumulado.set(productId, actual)
  }

  // Finalizar cálculo de ganancia y margen porcentual por producto
  const margenProductos = [...acumulado.values()]
    .map(p => {
      const ganancia = p.ingresos - p.costo
      return { ...p, ganancia, margenPct: p.ingresos > 0 ? (ganancia / p.ingresos) * 100 : 0 }
    })
    .sort((a, b) => b.ganancia - a.ganancia)

  // Imagen por producto para el ranking de más vendidos
  const imagenPorProducto = new Map<number, string | null>(
    itemsRaw.map(it => [it.product_id as number, (it.products as any)?.image_url ?? null])
  )

  const productosMasVendidos: ProductoVendido[] = [...acumulado.values()]
    .map(p => ({
      productId: p.productId,
      nombre: p.nombre,
      imagen: imagenPorProducto.get(p.productId) ?? null,
      cantidad: p.cantidad,
      ingresos: p.ingresos,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)

  // Totales del periodo para el resumen general
  const costoPeriodo = margenProductos.reduce((s, p) => s + p.costo, 0)
  const gananciaPeriodo = totalPeriodo - costoPeriodo
  const periodo: ResumenPeriodo = {
    total: totalPeriodo,
    ventas: ventas.length,
    ticketPromedio: ventas.length > 0 ? totalPeriodo / ventas.length : 0,
    costo: costoPeriodo,
    ganancia: gananciaPeriodo,
    margenPct: totalPeriodo > 0 ? (gananciaPeriodo / totalPeriodo) * 100 : 0,
  }

  // Historial reciente del periodo (máximo 10 ventas)
  const historial: VentaHistorial[] = ventas.slice(0, 10).map(v => {
    const orden = Array.isArray(v.order) ? v.order[0] : v.order
    const mesa = orden?.tables ? (Array.isArray(orden.tables) ? orden.tables[0] : orden.tables) : null
    const cliente = orden?.customer ? (Array.isArray(orden.customer) ? orden.customer[0] : orden.customer) : null
    const factura = orden?.invoice ? (Array.isArray(orden.invoice) ? orden.invoice[0] : orden.invoice) : null
    return {
      id: v.id as number,
      total: aNumero(v.total),
      metodoPago: v.payment_method ?? '—',
      fecha: v.created_at as string,
      mesa: mesa ? `Mesa ${String(mesa.number).padStart(2, '0')}` : 'Domicilio',
      cliente: cliente?.full_name ?? null,
      factura: factura?.invoice_number ?? null,
    }
  })

  // Agrupar ventas por método de pago
  const acumuladoPago = new Map<string, { total: number; cantidad: number }>()
  for (const v of ventas) {
    const metodo = (v.payment_method ?? 'Sin especificar').toLowerCase()
    const actual = acumuladoPago.get(metodo) ?? { total: 0, cantidad: 0 }
    actual.total += aNumero(v.total)
    actual.cantidad += 1
    acumuladoPago.set(metodo, actual)
  }

  const ventasPorMetodoPago: VentaPorMetodoPago[] = [...acumuladoPago.entries()]
    .map(([metodo, datos]) => ({
      metodo: normalizarMetodoPago(metodo),
      total: datos.total,
      cantidad: datos.cantidad,
      porcentaje: totalPeriodo > 0 ? (datos.total / totalPeriodo) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    rango: dias,
    hoy: { total: totalHoy, ventas: ventasHoy, ticketPromedio: ventasHoy > 0 ? totalHoy / ventasHoy : 0 },
    periodo,
    ventasPorDia: diasObjetivo,
    productosMasVendidos,
    margenProductos,
    historial,
    ventasPorMetodoPago,
  }
}
