import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { obtenerMetricasDashboard } from '@/modules/dashboard/actions'
import { SelectorRango } from '@/components/admin/dashboard/SelectorRango'
import { VentasPorMetodoPago } from '@/components/admin/dashboard/VentasPorMetodoPago'

// Formatear un valor numérico como moneda colombiana sin decimales
const formatoMoneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

// Formato corto para el eje Y de la gráfica (adapta a la escala real de ventas)
function formatoCorto(n: number): string {
  if (n === 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

const ETIQUETAS_PAGO: Record<string, string> = {
  cash: 'Efectivo',
  efectivo: 'Efectivo',
  card: 'Tarjeta',
  tarjeta: 'Tarjeta',
  transfer: 'Transferencia',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
}

// Dashboard de resumen del panel administrativo con métricas reales de ventas
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { rango: rangoParam } = await searchParams
  const rango = rangoParam === '30' ? 30 : 7

  const supabase = await createClient()

  const [
    { count: totalMesas },
    { count: mesasOcupadas },
    { count: totalProductos },
    { count: totalUsuarios },
    metricas,
  ] = await Promise.all([
    supabase.from('tables').select('*', { count: 'exact', head: true }),
    supabase.from('tables').select('*', { count: 'exact', head: true }).eq('status', true),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    obtenerMetricasDashboard(rango),
  ])

  // Tarjetas financieras principales (ventas diarias y margen)
  const tarjetas = [
    {
      etiqueta: 'Ventas de Hoy',
      valor: formatoMoneda(metricas.hoy.total),
      subtitulo: `${metricas.hoy.ventas} ${metricas.hoy.ventas === 1 ? 'venta' : 'ventas'}`,
      icono: 'point_of_sale',
      colorIcono: 'text-primary',
      bgIcono: 'bg-primary/10',
      badge: 'Hoy',
      badgeColor: 'bg-primary/10 text-primary',
    },
    {
      etiqueta: `Ventas (${rango} días)`,
      valor: formatoMoneda(metricas.periodo.total),
      subtitulo: `${metricas.periodo.ventas} ${metricas.periodo.ventas === 1 ? 'venta' : 'ventas'}`,
      icono: 'receipt_long',
      colorIcono: 'text-tertiary',
      bgIcono: 'bg-tertiary/10',
      badge: null,
      badgeColor: '',
    },
    {
      etiqueta: 'Ganancia Estimada',
      valor: formatoMoneda(metricas.periodo.ganancia),
      subtitulo: `Margen ${metricas.periodo.margenPct.toFixed(1)}%`,
      icono: 'trending_up',
      colorIcono: 'text-secondary',
      bgIcono: 'bg-secondary-container/20',
      badge: `${metricas.periodo.margenPct.toFixed(0)}%`,
      badgeColor: 'bg-secondary-fixed text-secondary',
    },
    {
      etiqueta: 'Ticket Promedio',
      valor: formatoMoneda(metricas.periodo.ticketPromedio),
      subtitulo: 'por venta',
      icono: 'payments',
      colorIcono: 'text-tertiary',
      bgIcono: 'bg-tertiary/10',
      badge: null,
      badgeColor: '',
    },
  ]

  const maxVentaDia = Math.max(1, ...metricas.ventasPorDia.map(d => d.total))
  const maxVendido = Math.max(1, ...metricas.productosMasVendidos.map(p => p.cantidad))

  return (
    <div className="space-y-8">

      {/* Encabezado de página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-3xl text-on-surface">Panel de Control</h2>
          <p className="text-sm text-on-surface-variant mt-1">Resumen de ventas y rendimiento del restaurante</p>
        </div>
        <SelectorRango rango={rango} />
      </div>

      {/* Tarjetas financieras */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map(card => (
          <div
            key={card.etiqueta}
            className="bg-surface-container-lowest p-6 rounded-xl border border-surface-variant shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 ${card.bgIcono} rounded-lg ${card.colorIcono}`}>
                <span className="material-symbols-outlined text-[28px] filled-icon">{card.icono}</span>
              </div>
              {card.badge && (
                <span className={`text-xs font-semibold px-2 py-1 rounded ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">{card.etiqueta}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-2xl text-on-surface">{card.valor}</span>
              <span className="text-xs text-on-surface-variant">{card.subtitulo}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Indicadores operativos */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { etiqueta: 'Mesas Ocupadas', valor: `${mesasOcupadas ?? 0}/${totalMesas ?? 0}`, icono: 'table_restaurant' },
          { etiqueta: 'Productos en Menú', valor: String(totalProductos ?? 0), icono: 'fastfood' },
          { etiqueta: 'Usuarios', valor: String(totalUsuarios ?? 0), icono: 'group' },
        ].map(item => (
          <div key={item.etiqueta} className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-on-surface-variant">{item.icono}</span>
            <div>
              <p className="font-display font-bold text-lg text-on-surface leading-tight">{item.valor}</p>
              <p className="text-xs text-on-surface-variant">{item.etiqueta}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Gráfica de ventas diarias */}
      <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-surface-variant shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h3 className="font-display font-semibold text-xl text-on-surface">Ventas Diarias</h3>
            <p className="text-sm text-on-surface-variant">Total registrado en los últimos {rango} días</p>
          </div>
        </div>

        {metricas.periodo.ventas === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">bar_chart</span>
            <p className="text-on-surface-variant font-medium">Sin ventas en este periodo</p>
          </div>
        ) : (
          <div className="flex gap-3">
            {/* Eje Y con valores adaptados al máximo real */}
            <div className="flex flex-col justify-between pb-7 shrink-0 text-right">
              {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
                <span key={ratio} className="text-[10px] text-on-surface-variant leading-none">
                  {formatoCorto(maxVentaDia * ratio)}
                </span>
              ))}
            </div>

            {/* Barras con líneas guía y etiquetas de valor */}
            <div className="flex-1 relative">
              {/* Líneas horizontales de referencia */}
              <div className="absolute inset-0 pb-7 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="border-t border-surface-variant/40 w-full" />
                ))}
              </div>

              <div className="relative flex items-end gap-2 h-52">
                {metricas.ventasPorDia.map(dia => (
                  <div key={dia.clave} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {/* Valor del día siempre visible */}
                    <span className={`text-[10px] font-semibold leading-none mb-0.5 ${
                      dia.esHoy ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      {dia.total > 0 ? formatoCorto(dia.total) : '—'}
                    </span>
                    {/* Barra */}
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg transition-all duration-200 ${
                        dia.esHoy
                          ? 'bg-primary shadow-lg shadow-primary/20'
                          : 'bg-surface-container-high hover:bg-primary/30'
                      }`}
                      style={{ height: `${Math.max(2, (dia.total / maxVentaDia) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>

              {/* Etiquetas de día debajo */}
              <div className="flex gap-2 mt-1.5">
                {metricas.ventasPorDia.map(dia => (
                  <div key={dia.clave} className="flex-1 flex justify-center">
                    <span className={`text-[11px] font-medium ${dia.esHoy ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                      {dia.etiqueta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Ventas por método de pago */}
      <VentasPorMetodoPago
        ventasPorMetodoPago={metricas.ventasPorMetodoPago}
        ventasPorDia={metricas.ventasPorDia}
        historial={metricas.historial}
        rango={rango}
        totalPeriodo={metricas.periodo.total}
      />

      {/* Productos más vendidos y margen de ganancia */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Productos más vendidos */}
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-variant">
            <h3 className="font-display font-semibold text-xl text-on-surface">Productos Más Vendidos</h3>
            <p className="text-sm text-on-surface-variant">Por unidades en los últimos {rango} días</p>
          </div>
          {metricas.productosMasVendidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">trophy</span>
              <p className="text-on-surface-variant text-sm">Aún no hay productos vendidos</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-variant">
              {metricas.productosMasVendidos.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 px-6 py-3.5">
                  <span className={`font-display font-bold text-sm w-6 text-center shrink-0 ${i < 3 ? 'text-primary' : 'text-outline'}`}>
                    {i + 1}
                  </span>
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="w-10 h-10 rounded-lg object-cover border border-surface-variant shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-container border border-surface-variant shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-[20px]">fastfood</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface font-medium text-sm truncate">{p.nombre}</p>
                    <div className="mt-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(p.cantidad / maxVendido) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-on-surface text-sm">{p.cantidad}</p>
                    <p className="text-xs text-on-surface-variant">{formatoMoneda(p.ingresos)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Margen de ganancia por producto */}
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-variant flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-xl text-on-surface">Margen de Ganancia</h3>
              <p className="text-sm text-on-surface-variant">Ingresos vs. costos por producto</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-lg text-secondary leading-tight">{metricas.periodo.margenPct.toFixed(1)}%</p>
              <p className="text-xs text-on-surface-variant">global</p>
            </div>
          </div>
          {metricas.margenProductos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">trending_up</span>
              <p className="text-on-surface-variant text-sm">Sin datos de margen</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-variant">
              {metricas.margenProductos.slice(0, 8).map(p => (
                <li key={p.productId} className="px-6 py-3.5">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="text-on-surface font-medium text-sm truncate">{p.nombre}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                      p.margenPct >= 50 ? 'bg-secondary-fixed text-secondary'
                        : p.margenPct >= 25 ? 'bg-tertiary/10 text-tertiary'
                        : 'bg-error-container text-error'
                    }`}>
                      {p.margenPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>Ganancia: <span className="font-semibold text-on-surface">{formatoMoneda(p.ganancia)}</span></span>
                    <span>Costo: {formatoMoneda(p.costo)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Historial de ventas */}
      <section className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden">
        <div className="p-6 border-b border-surface-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface/30">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-semibold text-xl text-on-surface">Historial de Ventas</h3>
            {metricas.periodo.ventas > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                {metricas.periodo.ventas} ventas
              </span>
            )}
          </div>
        </div>

        {metricas.historial.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['Factura', 'Mesa / Origen', 'Cliente', 'Pago', 'Fecha', 'Total'].map(h => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide border-b border-surface-variant ${h === 'Total' ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {metricas.historial.map(v => (
                  <tr key={v.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{v.factura ?? `#${String(v.id).padStart(4, '0')}`}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{v.mesa}</td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{v.cliente ?? 'Consumidor final'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold capitalize">
                        {ETIQUETAS_PAGO[v.metodoPago?.toLowerCase()] ?? v.metodoPago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">
                      {new Date(v.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right font-display font-bold text-primary">{formatoMoneda(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">receipt_long</span>
            <p className="text-on-surface-variant font-medium">No hay ventas registradas</p>
            <p className="text-xs text-outline mt-1">Las ventas aparecerán aquí cuando se procesen pagos desde caja</p>
          </div>
        )}
      </section>

      {/* Accesos rápidos */}
      <section>
        <h3 className="font-display font-semibold text-xs text-on-surface-variant uppercase tracking-wider mb-4">
          Accesos Rápidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { titulo: 'Gestionar Mesas',     desc: 'Crea y organiza las mesas del restaurante', href: '/admin/mesas',     icono: 'table_restaurant' },
            { titulo: 'Gestionar Productos', desc: 'Administra el menú, precios y categorías',   href: '/admin/productos', icono: 'fastfood'          },
            { titulo: 'Gestionar Usuarios',  desc: 'Controla el acceso y roles del personal',    href: '/admin/usuarios',  icono: 'group'             },
          ].map(({ titulo, desc, href, icono }) => (
            <Link
              key={titulo}
              href={href}
              className="group bg-surface-container-lowest hover:bg-surface-container-low border border-surface-variant hover:border-primary/20 rounded-xl p-5 transition-all flex items-start gap-4"
            >
              <div className="p-2.5 bg-surface-container rounded-lg text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                <span className="material-symbols-outlined text-[22px]">{icono}</span>
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-on-surface group-hover:text-primary transition-colors mb-1">
                  {titulo}
                </h4>
                <p className="text-xs text-on-surface-variant">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
