'use client'

import { useState, useEffect, useCallback } from 'react'
import { obtenerHistorialFacturas, obtenerDetalleFactura } from '@/modules/caja/actions'
import { leerConfigCajon, imprimirHtmlQZ } from '@/lib/cajon'

interface VentaResumen {
  id: number
  total: string
  subtotal: number
  payment_method: string
  created_at: string
  order: {
    id: number
    table_id: number | null
    customer_id: number | null
    tables: { number: number; name: string } | null
    customer: { id: number; full_name: string; nit: string | null; phone: number | null } | null
    invoice: Array<{ invoice_number: string | null }> | null
  } | null
}

// Icono por método de pago
const iconoMetodoPago = (metodo: string) => {
  if (metodo === 'Efectivo') return 'payments'
  if (metodo === 'Tarjeta') return 'credit_card'
  if (metodo === 'Contraentrega') return 'delivery_dining'
  return 'phone_iphone'
}

// Número de recibo: prefiere FV (invoice) sobre VT (sale id)
const numeroRecibo = (ventaId: number, invoiceNumber?: string | null) =>
  invoiceNumber ?? `VT-${String(ventaId).padStart(5, '0')}`

interface ItemDetalle {
  quantity: number
  price: number
  notes: string | null
  products: { name: string } | null
}

interface VentaDetalle {
  id: number
  total: number | string
  subtotal: number | string
  payment_method: string
  created_at: string
  order: {
    order_items: ItemDetalle[]
    tables: { name: string } | null
    customer: { full_name: string; nit: string | null; phone: number | null } | null
    invoice: Array<{ invoice_number: string | null }> | null
  } | null
}

// Generar HTML del recibo y enviarlo directo a QZ o fallback a ventana del navegador
async function imprimirRecibo(ventaId: number): Promise<void> {
  const res = await obtenerDetalleFactura(ventaId)
  if (res.error || !res.factura) {
    alert('Error al obtener los datos de la venta')
    return
  }

  const venta = res.factura as unknown as VentaDetalle
  const orden = venta.order
  const items: ItemDetalle[] = orden?.order_items ?? []
  const mesa = orden?.tables
  const cliente = orden?.customer
  const invoiceNumber: string | null = orden?.invoice?.[0]?.invoice_number ?? null
  const numDoc = numeroRecibo(venta.id, invoiceNumber)
  const esFactura = !!invoiceNumber
  const esAnonimo = !cliente || cliente.full_name === 'Anónimo' || cliente.full_name === 'Consumidor final'
  const fecha = new Date(venta.created_at).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const lineasItems = items
    .map(
      (item: any) => `
      <div class="row">
        <span class="item-name">${item.quantity}x ${item.products?.name ?? 'Producto'}</span>
        <span class="item-price">$${(item.price * item.quantity).toLocaleString('es-CO')}</span>
      </div>
      ${item.notes ? `<div class="notes">${item.notes}</div>` : ''}`
    )
    .join('')

  const htmlRecibo = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${numDoc}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 15px; }
    .small { font-size: 10px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .item-name { flex: 1; padding-right: 4px; }
    .item-price { white-space: nowrap; }
    .notes { padding-left: 10px; font-size: 10px; color: #555; margin-bottom: 2px; }
    .total-row { font-size: 14px; font-weight: bold; margin-top: 2px; }
    .doc-type { font-size: 11px; font-weight: bold; text-align: center; margin: 2px 0; }
    @media print {
      body { width: 80mm; margin: 0; padding: 2mm 2mm 200mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="center bold large">RESTAURANTE QUEEN BROASTER</div>
  <div class="center small">Pollo Broaster y Comidas Rápidas</div>
  <div class="center small">NIT: 43.473.914-2</div>
  <div class="divider"></div>
  <div class="doc-type">${esFactura ? 'FACTURA DE VENTA' : 'RECIBO DE CAJA'}</div>
  <div class="row"><span>No.:</span><span class="bold">${numDoc}</span></div>
  <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
  <div class="row">
    <span>${mesa ? 'Mesa:' : 'Tipo:'}</span>
    <span>${mesa ? mesa.name : 'Domicilio'}</span>
  </div>
  <div class="divider"></div>
  <div class="row"><span>Cliente:</span><span>${esAnonimo ? 'Consumidor final' : cliente.full_name}</span></div>
  <div class="row"><span>NIT/CC:</span><span>${(esAnonimo || !cliente?.nit) ? '222222222222' : cliente.nit}</span></div>
  ${!esAnonimo && cliente?.phone ? `<div class="row"><span>Tel:</span><span>${cliente.phone}</span></div>` : ''}
  <div class="divider"></div>
  <div class="row bold small"><span>CANT  DESCRIPCIÓN</span><span>VALOR</span></div>
  <div class="divider"></div>
  ${lineasItems || '<div class="center small">(sin detalle de ítems)</div>'}
  <div class="divider"></div>
  <div class="row"><span>Subtotal:</span><span>$${Number(venta.subtotal ?? 0).toLocaleString('es-CO')}</span></div>
  <div class="row"><span>IVA (0%):</span><span>$0</span></div>
  <div class="row total-row"><span>TOTAL:</span><span>$${Number(venta.total ?? 0).toLocaleString('es-CO')}</span></div>
  <div class="row"><span>Forma de pago:</span><span>${venta.payment_method ?? ''}</span></div>
  <div class="divider"></div>
  <div class="center">¡Gracias por su preferencia!</div>
  <div class="center small">Restaurante Queen Broaster</div>
</body>
</html>`

  // Intentar impresión directa vía QZ Tray si hay impresora configurada
  const config = leerConfigCajon()
  if (config.modo === 'qz' && config.nombreImpresora) {
    const resultado = await imprimirHtmlQZ(config.nombreImpresora, htmlRecibo)
    if (resultado.ok) return
    console.warn('[Impresión] QZ falló, usando ventana del navegador:', resultado.error)
  }

  // Fallback: ventana del navegador con diálogo de impresión
  const ventana = window.open('', '_blank', 'width=420,height=650,toolbar=no,menubar=no')
  if (!ventana) {
    alert('Permite las ventanas emergentes para imprimir')
    return
  }
  ventana.document.write(htmlRecibo)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 300)
}

// Componente principal del historial de ventas
export function HistorialFacturas() {
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imprimiendo, setImprimiendo] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [recarga, setRecarga] = useState(0)

  // setCargando en el handler (evento de usuario) — nunca síncrono en el efecto
  const cargarHistorial = useCallback(() => {
    setCargando(true)
    setError(null)
    setRecarga(n => n + 1)
  }, [])

  // Fetch de datos — setState solo dentro del callback async (post-await)
  useEffect(() => {
    let activo = true
    async function cargar() {
      const res = await obtenerHistorialFacturas()
      if (!activo) return
      setCargando(false)
      if (res.error) setError(res.error)
      else setVentas(res.facturas as VentaResumen[])
    }
    cargar()
    return () => { activo = false }
  }, [recarga])

  // Imprimir o exportar a PDF (mismo recibo, el usuario elige destino en el diálogo)
  const handleImprimir = async (ventaId: number) => {
    setImprimiendo(ventaId)
    await imprimirRecibo(ventaId)
    setImprimiendo(null)
  }

  // Filtrar por número FV/VT, nombre de cliente o NIT
  const ventasFiltradas = ventas.filter(v => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    const invNum = v.order?.invoice?.[0]?.invoice_number ?? null
    return (
      numeroRecibo(v.id, invNum).toLowerCase().includes(q) ||
      (v.order?.customer?.full_name ?? '').toLowerCase().includes(q) ||
      (v.order?.customer?.nit ?? '').toLowerCase().includes(q)
    )
  })

  // Totales del período visible
  const totalPeriodo = ventasFiltradas.reduce((acc, v) => acc + Number(v.total), 0)

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
            placeholder="Buscar por N° recibo o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>
        <button
          onClick={cargarHistorial}
          disabled={cargando}
          title="Actualizar historial"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-[20px] ${cargando ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-surface-container-low pb-24 md:pb-6">

        {/* Estado: cargando */}
        {cargando && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant">Cargando historial de ventas...</p>
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
        {!cargando && !error && ventasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <span className="material-symbols-outlined text-5xl text-outline">receipt_long</span>
            <p className="text-on-surface-variant text-sm">
              {busqueda ? 'Sin resultados para la búsqueda' : 'No hay ventas registradas'}
            </p>
          </div>
        )}

        {/* Lista de ventas */}
        {!cargando && !error && ventasFiltradas.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Resumen del período */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-on-surface-variant">
                <strong className="text-on-surface">{ventasFiltradas.length}</strong>{' '}
                venta{ventasFiltradas.length !== 1 ? 's' : ''}
                {busqueda && ` para "${busqueda}"`}
              </p>
              {!busqueda && (
                <p className="text-xs text-on-surface-variant">
                  Total:{' '}
                  <strong className="text-primary text-sm">
                    ${totalPeriodo.toLocaleString('es-CO')}
                  </strong>
                </p>
              )}
            </div>

            {ventasFiltradas.map(venta => {
              const mesa = venta.order?.tables
              const cliente = venta.order?.customer
              const invNum = venta.order?.invoice?.[0]?.invoice_number ?? null
              const numDoc = numeroRecibo(venta.id, invNum)
              const esFactura = !!invNum
              const esAnonimo = !cliente || cliente.full_name === 'Anónimo' || cliente.full_name === 'Consumidor final'
              const fecha = new Date(venta.created_at).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
              })

              return (
                <div
                  key={venta.id}
                  className="bg-surface rounded-2xl border border-surface-variant p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/30 transition-colors"
                >
                  {/* Icono + datos principales */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      esFactura ? 'bg-green-100' : 'bg-primary-container'
                    }`}>
                      <span
                        className={`material-symbols-outlined text-[22px] ${esFactura ? 'text-green-700' : 'text-primary'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {esFactura ? 'receipt_long' : 'receipt'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-on-surface text-base leading-tight">
                          {numDoc}
                        </p>
                        {esFactura && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                            DIAN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {fecha}
                        {' · '}
                        <span className={mesa ? 'text-primary font-medium' : 'text-tertiary font-medium'}>
                          {mesa ? `Mesa ${mesa.name}` : 'Domicilio'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Cliente + método de pago */}
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap sm:justify-end">
                    <div className="min-w-0 flex-1 sm:flex-none">
                      <p className={`text-sm font-medium truncate max-w-[150px] ${
                        esAnonimo ? 'text-on-surface-variant italic' : 'text-on-surface'
                      }`}>
                        {esAnonimo ? 'Anónimo' : cliente?.full_name}
                      </p>
                      {venta.payment_method && (
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">
                            {iconoMetodoPago(venta.payment_method)}
                          </span>
                          {venta.payment_method}
                        </p>
                      )}
                    </div>

                    {/* Total */}
                    <p className="font-display font-bold text-xl text-primary whitespace-nowrap">
                      ${Number(venta.total).toLocaleString('es-CO')}
                    </p>

                    {/* Acciones */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleImprimir(venta.id)}
                        disabled={imprimiendo === venta.id}
                        title="Imprimir recibo en impresora POS"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-variant transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                        {imprimiendo === venta.id ? '...' : 'Imprimir'}
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
