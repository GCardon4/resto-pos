'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logoutAction } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/client'
import {
  enviarPedidoCocina,
  enviarDomicilioCocina,
  agregarItemsAOrden,
  obtenerOrdenActivaMesa,
  procesarPago,
  procesarPagoDomicilio,
  marcarPedidoListo,
} from '@/modules/caja/actions'
import { imprimirOrden } from '@/lib/impresion/ordenesImpresion'
import { HistorialFacturas } from '@/components/caja/HistorialFacturas'
import { Gastos } from '@/components/caja/Gastos'
import { BuscadorProductos } from '@/components/caja/BuscadorProductos'
import {
  abrirCajon,
  abrirCajonQZ,
  seleccionarPuertoSerial,
  leerConfigCajon,
  guardarConfigCajon,
  type CajonConfig,
} from '@/lib/cajon'

interface Mesa {
  id: number
  name: string
  number: number
  status: boolean
}

interface Producto {
  id: number
  name: string
  price: number
  description: string | null
  category_id: number | null
  image_url: string | null
}

interface Categoria {
  id: number
  name: string
}

interface ItemPedido {
  productoId: number
  nombre: string
  precio: number
  cantidad: number
  notas: string
  imagen: string | null
  // IDs de complementos del catálogo asignados a este producto
  addonIds: number[]
}

interface AddonCatalogo {
  id: number
  name: string
  price: number
}

type Filtro = 'all' | 'libre' | 'ocupada'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']
const METODOS_PAGO_DOMICILIO = ['Contraentrega', 'Efectivo', 'Tarjeta', 'Transferencia']

const iconoMetodo = (m: string) => {
  if (m === 'Efectivo') return 'payments'
  if (m === 'Tarjeta') return 'credit_card'
  if (m === 'Contraentrega') return 'delivery_dining'
  return 'phone_iphone'
}

// Vista dual: grid de mesas/domicilio → pedido al seleccionar
export function MesasGrid({
  mesas,
  productos,
  categorias,
  addsOnCatalogo,
  nombreUsuario,
  userId,
}: {
  mesas: Mesa[]
  productos: Producto[]
  categorias: Categoria[]
  addsOnCatalogo: AddonCatalogo[]
  nombreUsuario: string
  userId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Estado mesas — copia local del prop para poder mutarla desde realtime
  const [mesasState, setMesasState] = useState<Mesa[]>(mesas)

  // Sincronizar cuando el servidor refresca (ej: después de pagar)
  useEffect(() => { setMesasState(mesas) }, [mesas])

  // Realtime: actualizar la tarjeta de mesa cuando cambia en BD
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('caja-tables-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload: any) => {
          const updated = payload.new as Mesa
          setMesasState(prev =>
            prev.map(m => m.id === updated.id ? { ...m, status: updated.status } : m)
          )
          // Si la mesa activa fue liberada desde cocina, reflejar el cambio
          setMesaActiva(prev =>
            prev && prev.id === updated.id ? { ...prev, status: updated.status } : prev
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Estado mesas
  const [mesaActiva, setMesaActiva] = useState<Mesa | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('all')
  const [busqueda, setBusqueda] = useState('')

  // Estado pedido — ítems nuevos (aún no enviados a cocina)
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([])
  // Ítems ya enviados a cocina
  const [itemsEnCocina, setItemsEnCocina] = useState<ItemPedido[]>([])
  // ID de la orden activa en BD
  const [ordenActivaId, setOrdenActivaId] = useState<number | null>(null)
  const [cargandoOrden, setCargandoOrden] = useState(false)

  // Filtros productos
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')

  // Feedback
  const [errorPedido, setErrorPedido] = useState<string | null>(null)
  const [pedidoEnviado, setPedidoEnviado] = useState<number | null>(null)

  // Modal de pago
  const [modalPago, setModalPago] = useState(false)
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [pagoExitoso, setPagoExitoso] = useState(false)

  // Modo domicilio
  const [esDomicilio, setEsDomicilio] = useState(false)
  const [modalInfoDomicilio, setModalInfoDomicilio] = useState(false)
  const [infoDomicilio, setInfoDomicilio] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    metodoPago: 'Contraentrega',
  })

  // Datos del cliente para factura (mesas y domicilios)
  const [clienteDatos, setClienteDatos] = useState({ nombre: '', nit: '', telefono: '' })
  // Modo factura DIAN — false = recibo rápido sin factura, true = genera factura con datos del cliente
  const [esFacturaDIAN, setEsFacturaDIAN] = useState(false)

  // Listo en cocina desde caja — persistente hasta que se agreguen nuevos ítems
  const [ordenMarcadaLista, setOrdenMarcadaLista] = useState(false)
  const [marcandoListo, setMarcandoListo] = useState(false)

  // Número de localizador GPS para sincronizar la mesa con el pedido
  const [numeroGps, setNumeroGps] = useState<number | ''>('')

  // Mapa de catálogo de complementos para resolver precio/nombre por ID
  const addonMap = new Map(addsOnCatalogo.map(a => [a.id, a]))

  // Vista activa en el grid principal: mesas, historial o gastos
  const [vistaActual, setVistaActual] = useState<'mesas' | 'historial' | 'gastos'>('mesas')

  // Cajón de caja registradora
  // Valor inicial igual al del servidor (evita hydration mismatch)
  const [cajonConfig, setCajonConfig] = useState<CajonConfig>({ modo: 'qz', nombreImpresora: '' })
  const [cajonConfigurado, setCajonConfigurado] = useState(false)

  // Leer desde localStorage solo en cliente, después de hidratación
  useEffect(() => {
    const cfg = leerConfigCajon()
    setCajonConfig(cfg)
    setCajonConfigurado(!!(cfg.modo === 'qz' ? cfg.nombreImpresora?.trim() : true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [modalCajon, setModalCajon] = useState(false)
  const [cajonTesteando, setCajonTesteando] = useState(false)
  const [cajonMensaje, setCajonMensaje] = useState<{ ok: boolean; texto: string; code?: string } | null>(null)

  // ─── Cálculos ───────────────────────────────────────────────────────────────
  // Subtotal de complementos de un ítem (suma de precios de sus complementos)
  const subtotalAddonsItem = (item: ItemPedido) =>
    item.addonIds.reduce((acc, id) => acc + (addonMap.get(id)?.price ?? 0), 0)
  const subtotalAddonsDe = (items: ItemPedido[]) =>
    items.reduce((acc, i) => acc + subtotalAddonsItem(i), 0)

  const subtotalNuevos = itemsPedido.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const subtotalEnCocina = itemsEnCocina.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const subtotalAddonsPendientes = subtotalAddonsDe(itemsPedido)
  const subtotalAddonsOrden = subtotalAddonsDe(itemsEnCocina)
  const totalGeneral = subtotalNuevos + subtotalEnCocina + subtotalAddonsPendientes + subtotalAddonsOrden
  const totalItemsNuevos = itemsPedido.reduce((acc, i) => acc + i.cantidad, 0)
  const totalItemsEnCocina = itemsEnCocina.reduce((acc, i) => acc + i.cantidad, 0)
  const totalItemsGeneral = totalItemsNuevos + totalItemsEnCocina

  // Activar/desactivar un complemento del catálogo en un producto del pedido
  const toggleAddonItem = (productoId: number, addonId: number) => {
    setItemsPedido(prev =>
      prev.map(i =>
        i.productoId === productoId
          ? {
              ...i,
              addonIds: i.addonIds.includes(addonId)
                ? i.addonIds.filter(id => id !== addonId)
                : [...i.addonIds, addonId],
            }
          : i
      )
    )
  }

  // Filtros mesas
  const mesasFiltradas = mesasState.filter(m => {
    const coincide =
      busqueda === '' ||
      m.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(m.number).includes(busqueda)
    if (!coincide) return false
    if (filtro === 'libre') return !m.status
    if (filtro === 'ocupada') return m.status
    return true
  })

  const totalLibres = mesasState.filter(m => !m.status).length
  const totalOcupadas = mesasState.filter(m => m.status).length

  // Filtros productos
  const productosFiltrados = productos.filter(p => {
    const coincide =
      busquedaProducto === '' ||
      p.name.toLowerCase().includes(busquedaProducto.toLowerCase())
    if (!coincide) return false
    if (categoriaFiltro !== null) return p.category_id === categoriaFiltro
    return true
  })

  const numMesa = (n: number) => `M ${String(n).padStart(2, '0')}`
  const iniciales = nombreUsuario
    ? nombreUsuario.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'U'
  const cantidadEnPedido = (productoId: number) =>
    itemsPedido.find(i => i.productoId === productoId)?.cantidad ?? 0

  // Entrar a la vista de pedido de mesa — siempre busca orden activa (incluso si la mesa está libre)
  const seleccionarMesa = (mesa: Mesa) => {
    setMesaActiva(mesa)
    setEsDomicilio(false)
    setItemsPedido([])
    setItemsEnCocina([])
    setOrdenActivaId(null)
    setOrdenMarcadaLista(false)
    setBusquedaProducto('')
    setCategoriaFiltro(null)
    setErrorPedido(null)
    setPedidoEnviado(null)
    setNumeroGps('')
    setCargandoOrden(true)
    obtenerOrdenActivaMesa(mesa.id).then(({ orden }) => {
      setCargandoOrden(false)
      if (orden) {
        setOrdenActivaId(orden.id)
        setItemsEnCocina(orden.items)
        setOrdenMarcadaLista(orden.estaLista)
        if (orden.gps) setNumeroGps(orden.gps)
      }
    })
  }

  // Entrar a la vista de pedido de domicilio
  const iniciarDomicilio = () => {
    setEsDomicilio(true)
    setMesaActiva(null)
    setItemsPedido([])
    setItemsEnCocina([])
    setOrdenActivaId(null)
    setBusquedaProducto('')
    setCategoriaFiltro(null)
    setErrorPedido(null)
    setPedidoEnviado(null)
    setInfoDomicilio({ nombre: '', telefono: '', direccion: '', metodoPago: 'Contraentrega' })
    setMetodoPago('Contraentrega')
  }

  // Volver al grid
  const volverAMesas = () => {
    if (itemsPedido.length > 0 && !confirm('¿Descartar los ítems no enviados?')) return
    setMesaActiva(null)
    setEsDomicilio(false)
    setItemsPedido([])
    setItemsEnCocina([])
    setOrdenActivaId(null)
    setOrdenMarcadaLista(false)
    setNumeroGps('')
  }

  // Guardar configuración y marcar como configurado
  const aplicarConfigCajon = (cfg: CajonConfig) => {
    setCajonConfig(cfg)
    guardarConfigCajon(cfg)
    setCajonConfigurado(!!(cfg.modo === 'qz' ? cfg.nombreImpresora?.trim() : true))
  }

  // Abrir cajón automáticamente al confirmar pago
  const abrirCajonRegistradora = async () => {
    await abrirCajon(cajonConfig)
  }

  // Probar el cajón desde el modal de configuración
  const probarCajon = async () => {
    setCajonTesteando(true)
    setCajonMensaje(null)
    const res = await abrirCajon(cajonConfig)
    setCajonTesteando(false)
    if (res.ok) {
      setCajonMensaje({ ok: true, texto: '✓ Cajón abierto correctamente' })
    } else {
      const textos: Record<string, string> = {
        QZ_NOT_RUNNING: 'QZ Tray no está corriendo. Ábrelo desde la bandeja del sistema o reinstálalo.',
        QZ_CERT: 'Certificado no aceptado. Abre Chrome en: https://localhost:8181 y acepta el certificado.',
        PRINTER_NOT_FOUND: res.error ?? 'Impresora no encontrada',
      }
      const code = (res as any).code ?? ''
      setCajonMensaje({ ok: false, code, texto: textos[code] ?? res.error ?? 'No se pudo abrir el cajón' })
    }
  }

  // Agregar producto al pedido local o incrementar cantidad
  const agregarProducto = (producto: Producto) => {
    setItemsPedido(prev => {
      const existente = prev.find(i => i.productoId === producto.id)
      if (existente) {
        return prev.map(i =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, {
        productoId: producto.id,
        nombre: producto.name,
        precio: producto.price,
        cantidad: 1,
        notas: '',
        imagen: producto.image_url,
        addonIds: [],
      }]
    })
  }

  // Cambiar cantidad del ítem local (elimina si llega a 0)
  const cambiarCantidad = (productoId: number, delta: number) => {
    setItemsPedido(prev =>
      prev
        .map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    )
  }

  // Actualizar notas de un ítem local
  const actualizarNotas = (productoId: number, notas: string) => {
    setItemsPedido(prev =>
      prev.map(i => i.productoId === productoId ? { ...i, notas } : i)
    )
  }

  // Editar precio unitario de un ítem — para descuentos desde la caja
  const actualizarPrecio = (productoId: number, precio: number) => {
    setItemsPedido(prev =>
      prev.map(i => i.productoId === productoId ? { ...i, precio: Math.max(0, precio) } : i)
    )
  }

  // Eliminar ítem del pedido local
  const eliminarItem = (productoId: number) => {
    setItemsPedido(prev => prev.filter(i => i.productoId !== productoId))
  }

  // Enviar ítems a cocina — si es domicilio sin orden activa, abre modal de datos primero
  const handleEnviarCocina = () => {
    if (itemsPedido.length === 0) return
    if (!mesaActiva && !esDomicilio) return

    setErrorPedido(null)

    if (esDomicilio && !ordenActivaId) {
      setModalInfoDomicilio(true)
      return
    }

    const itemsParaEnviar = itemsPedido.map(i => ({
      productoId: i.productoId,
      precio: i.precio,
      cantidad: i.cantidad,
      notas: i.notas,
      addonIds: i.addonIds,
    }))

    startTransition(async () => {
      if (ordenActivaId) {
        const result = await agregarItemsAOrden(ordenActivaId, itemsParaEnviar)
        if (result.error) {
          setErrorPedido(result.error)
        } else {
          setItemsEnCocina(prev => [...prev, ...itemsPedido])
          setItemsPedido([])
          setOrdenMarcadaLista(false)
          setPedidoEnviado(ordenActivaId)
          setTimeout(() => setPedidoEnviado(null), 1800)
        }
      } else {
        const result = await enviarPedidoCocina(mesaActiva!.id, userId, itemsParaEnviar, typeof numeroGps === 'number' ? numeroGps : null)
        if (result.error) {
          setErrorPedido(result.error)
        } else {
          const nuevaOrdenId = result.ordenId ?? null
          setOrdenActivaId(nuevaOrdenId)
          setItemsEnCocina(itemsPedido)
          setItemsPedido([])
          setMesaActiva(prev => prev ? { ...prev, status: true } : prev)
          setPedidoEnviado(nuevaOrdenId)
          setTimeout(() => setPedidoEnviado(null), 1800)
        }
      }
    })
  }

  // Confirmar datos de domicilio y enviar a cocina
  const handleConfirmarInfoDomicilio = () => {
    if (!infoDomicilio.nombre.trim() || !infoDomicilio.direccion.trim()) return

    setModalInfoDomicilio(false)
    setErrorPedido(null)

    const itemsParaEnviar = itemsPedido.map(i => ({
      productoId: i.productoId,
      precio: i.precio,
      cantidad: i.cantidad,
      notas: i.notas,
      addonIds: i.addonIds,
    }))

    startTransition(async () => {
      const result = await enviarDomicilioCocina(userId, itemsParaEnviar, {
        nombre: infoDomicilio.nombre.trim(),
        telefono: infoDomicilio.telefono.trim(),
        direccion: infoDomicilio.direccion.trim(),
      })
      if (result.error) {
        setErrorPedido(result.error)
        return
      }
      setOrdenActivaId(result.ordenId ?? null)
      setItemsEnCocina(itemsPedido)
      setItemsPedido([])
      setPedidoEnviado(result.ordenId ?? null)
      setTimeout(() => setPedidoEnviado(null), 1800)
    })
  }

  // Confirmar pago — envía ítems pendientes si los hay, luego registra la venta
  const handleConfirmarPago = () => {
    if (!mesaActiva && !esDomicilio) return
    setErrorPedido(null)

    startTransition(async () => {
      let ordenIdFinal = ordenActivaId
      const itemsParaEnviar = itemsPedido.map(i => ({
        productoId: i.productoId,
        precio: i.precio,
        cantidad: i.cantidad,
        notas: i.notas,
        addonIds: i.addonIds,
      }))

      if (itemsPedido.length > 0) {
        if (ordenIdFinal) {
          const res = await agregarItemsAOrden(ordenIdFinal, itemsParaEnviar)
          if (res.error) { setErrorPedido(res.error); return }
        } else if (esDomicilio) {
          setErrorPedido('Envía los ítems a cocina antes de pagar')
          return
        } else {
          const res = await enviarPedidoCocina(mesaActiva!.id, userId, itemsParaEnviar)
          if (res.error) { setErrorPedido(res.error); return }
          ordenIdFinal = res.ordenId ?? null
        }
      }

      if (!ordenIdFinal) {
        setErrorPedido('No hay pedido activo para pagar')
        return
      }

      const res = esDomicilio
        ? await procesarPagoDomicilio(ordenIdFinal, metodoPago, totalGeneral, totalGeneral, clienteDatos.nit, esFacturaDIAN)
        : await procesarPago(
            ordenIdFinal, mesaActiva!.id, metodoPago, totalGeneral, totalGeneral,
            esFacturaDIAN ? clienteDatos : null,
            esFacturaDIAN
          )

      if (res.error) {
        setErrorPedido(res.error)
        return
      }

      setPagoExitoso(true)
      abrirCajonRegistradora()
      setTimeout(() => {
        setModalPago(false)
        setPagoExitoso(false)
        setMesaActiva(null)
        setEsDomicilio(false)
        setItemsPedido([])
        setItemsEnCocina([])
        setOrdenActivaId(null)
        setEsFacturaDIAN(false)
        setClienteDatos({ nombre: '', nit: '', telefono: '' })
        setNumeroGps('')
        router.refresh()
      }, 1800)
    })
  }

  // Marcar pedido listo desde caja — sale de cocina, mesa y pedido se conservan
  const handleMarcarListo = () => {
    if (!ordenActivaId || marcandoListo) return
    setMarcandoListo(true)
    startTransition(async () => {
      const res = await marcarPedidoListo(ordenActivaId)
      setMarcandoListo(false)
      if (res.error) {
        setErrorPedido(res.error)
      } else {
        // No limpiamos itemsEnCocina: los ítems siguen en el pedido para cobrar
        setOrdenMarcadaLista(true)
      }
    })
  }

  // Imprimir orden en cocina
  const handleImprimirOrden = () => {
    if (!ordenActivaId && itemsEnCocina.length === 0) return

    const itemsParaImprimir = itemsEnCocina.map(item => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      notas: item.notas || undefined,
    }))

    imprimirOrden({
      numeroMesa: mesaActiva?.number,
      nombreMesa: mesaActiva?.name,
      numeroPedido: ordenActivaId || 0,
      items: itemsParaImprimir,
      horaInicio: new Date(),
    })
  }

  // Limpiar/cancelar los ítems del pedido local
  const handleLimpiarPedido = () => {
    if (itemsPedido.length === 0) return
    if (confirm('¿Descartar todos los ítems sin enviar a cocina?')) {
      setItemsPedido([])
      setErrorPedido(null)
    }
  }

  // Cancelar toda la orden (ítems nuevos y en cocina)
  const handleCancelarOrden = () => {
    const tieneItems = itemsPedido.length > 0 || itemsEnCocina.length > 0
    if (!tieneItems) return

    const mensaje = itemsEnCocina.length > 0
      ? '¿Cancelar toda la orden? Esto incluye los ítems ya en cocina.'
      : '¿Descartar todos los ítems sin enviar?'

    if (confirm(mensaje)) {
      setItemsPedido([])
      setItemsEnCocina([])
      setOrdenActivaId(null)
      setOrdenMarcadaLista(false)
      setErrorPedido(null)
      setNumeroGps('')
    }
  }

  // Generar URL de WhatsApp con el resumen del pedido de domicilio
  const generarUrlWhatsApp = () => {
    const tel = infoDomicilio.telefono.replace(/\D/g, '')
    const numero = tel.startsWith('57') ? tel : `57${tel}`
    const todosLosItems = [...itemsEnCocina, ...itemsPedido]
    const lineasItems = todosLosItems
      .map(i => `  • ${i.cantidad}x ${i.nombre} - $${(i.precio * i.cantidad).toLocaleString('es-CO')}`)
      .join('\n')
    const mensaje = [
      `¡Hola ${infoDomicilio.nombre}! 🍗 *Queen Broaster*`,
      '',
      'Tu pedido está siendo preparado:',
      '',
      lineasItems,
      '',
      `💰 *Total: $${totalGeneral.toLocaleString('es-CO')}*`,
      `📍 *Dirección:* ${infoDomicilio.direccion}`,
      `⏱ *Tiempo estimado:* 30-40 min`,
      '',
      '¡Gracias por tu pedido! Nos comunicamos si hay algún inconveniente 🙏',
    ].join('\n')
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
  }
  const mostrarBotonWa = esDomicilio && !!ordenActivaId && !!infoDomicilio.telefono

  // ─────────────────────────────────────────
  // VISTA: Pedido activo (mesa o domicilio)
  // ─────────────────────────────────────────
  if (mesaActiva || esDomicilio) {
    const metodosPagoActuales = esDomicilio ? METODOS_PAGO_DOMICILIO : METODOS_PAGO

    return (
      <div className="h-screen bg-surface flex flex-col overflow-hidden">

        {/* Modal de Datos del Domicilio */}
        {modalInfoDomicilio && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[22px]">delivery_dining</span>
                    Datos del Domicilio
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">Información del cliente y entrega</p>
                </div>
                <button
                  onClick={() => setModalInfoDomicilio(false)}
                  className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                    Nombre del cliente *
                  </label>
                  <input
                    type="text"
                    value={infoDomicilio.nombre}
                    onChange={e => setInfoDomicilio(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Juan García"
                    autoFocus
                    className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-tertiary focus:border-tertiary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={infoDomicilio.telefono}
                    onChange={e => setInfoDomicilio(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: 300 123 4567"
                    className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-tertiary focus:border-tertiary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                    Dirección de entrega *
                  </label>
                  <input
                    type="text"
                    value={infoDomicilio.direccion}
                    onChange={e => setInfoDomicilio(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Ej: Cll 10 # 5-20, Barrio Centro"
                    className="w-full px-4 py-3 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-tertiary focus:border-tertiary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO_DOMICILIO.map(m => (
                      <button
                        key={m}
                        onClick={() => setInfoDomicilio(prev => ({ ...prev, metodoPago: m }))}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${
                          infoDomicilio.metodoPago === m
                            ? 'border-tertiary bg-tertiary/10 text-tertiary'
                            : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{iconoMetodo(m)}</span>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-6 pt-3 grid grid-cols-2 gap-3 shrink-0 border-t border-surface-variant">
                <button
                  onClick={() => setModalInfoDomicilio(false)}
                  className="py-3.5 rounded-2xl border-2 border-surface-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarInfoDomicilio}
                  disabled={!infoDomicilio.nombre.trim() || !infoDomicilio.direccion.trim() || isPending}
                  className="py-3.5 rounded-2xl bg-tertiary text-on-tertiary font-display font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isPending ? 'hourglass_empty' : 'restaurant'}
                  </span>
                  {isPending ? 'Enviando...' : 'Enviar a Cocina'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pago */}
        {modalPago && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-display font-bold text-lg text-on-surface">
                    {esDomicilio ? 'Cobrar Domicilio' : 'Pagar Cuenta'}
                  </h3>
                  {esDomicilio ? (
                    <div className="mt-1 space-y-0.5">
                      {infoDomicilio.nombre && (
                        <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          {infoDomicilio.nombre}
                          {infoDomicilio.telefono && ` · ${infoDomicilio.telefono}`}
                        </p>
                      )}
                      {infoDomicilio.direccion && (
                        <p className="text-sm text-on-surface-variant flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {infoDomicilio.direccion}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      Mesa {String(mesaActiva!.number).padStart(2, '0')} · {mesaActiva!.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { if (!isPending) setModalPago(false) }}
                  className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Resumen de ítems */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Resumen del pedido
                </p>
                {[...itemsEnCocina, ...itemsPedido].map((item, idx) => (
                  <div key={`${item.productoId}-${idx}`} className="py-2 border-b border-surface-variant last:border-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center shrink-0 ${
                          esDomicilio ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                        }`}>
                          {item.cantidad}
                        </span>
                        <span className="text-sm text-on-surface">{item.nombre}</span>
                      </div>
                      <span className="text-sm font-semibold text-on-surface shrink-0 ml-3">
                        ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {/* Complementos de este producto */}
                    {item.addonIds.map(addonId => {
                      const addon = addonMap.get(addonId)
                      if (!addon) return null
                      return (
                        <div key={`addon-${addonId}`} className="flex justify-between items-center pl-8 pr-1 pt-1.5">
                          <span className="text-xs text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">add</span>
                            {addon.name}
                          </span>
                          <span className="text-xs font-medium text-on-surface-variant shrink-0 ml-3">
                            {addon.price === 0 ? <span className="text-green-700">Gratis</span> : `+$${addon.price.toLocaleString('es-CO')}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="px-5 py-3 bg-surface-container-low border-t border-surface-variant shrink-0">
                <div className="flex justify-between items-center">
                  <span className="font-display font-bold text-xl text-on-surface">Total</span>
                  <span className={`font-display font-bold text-2xl ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>
                    ${totalGeneral.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Toggle Recibo / Factura DIAN */}
              <div className="px-5 py-3 border-t border-surface-variant shrink-0">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => { setEsFacturaDIAN(false); setClienteDatos({ nombre: '', nit: '', telefono: '' }) }}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${
                      !esFacturaDIAN
                        ? 'border-on-surface bg-on-surface text-surface'
                        : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt</span>
                    Recibo
                  </button>
                  <button
                    onClick={() => setEsFacturaDIAN(true)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${
                      esFacturaDIAN
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    Factura DIAN
                  </button>
                </div>

                {/* Campos del cliente — solo en modo DIAN */}
                {esFacturaDIAN && (
                  esDomicilio ? (
                    <div className="space-y-2">
                      <div className="px-3 py-2 bg-surface-container-low rounded-xl text-sm text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span className="truncate">{infoDomicilio.nombre}{infoDomicilio.telefono ? ` · ${infoDomicilio.telefono}` : ''}</span>
                      </div>
                      <input
                        type="text"
                        value={clienteDatos.nit}
                        onChange={e => setClienteDatos(prev => ({ ...prev, nit: e.target.value }))}
                        placeholder="NIT / CC del cliente"
                        className="w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={clienteDatos.nombre}
                        onChange={e => setClienteDatos(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre del cliente"
                        className="w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={clienteDatos.nit}
                          onChange={e => setClienteDatos(prev => ({ ...prev, nit: e.target.value }))}
                          placeholder="NIT / CC"
                          className="w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                        <input
                          type="tel"
                          value={clienteDatos.telefono}
                          onChange={e => setClienteDatos(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="Teléfono"
                          className="w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Método de pago */}
              <div className="px-5 py-4 shrink-0">
                <p className="text-sm font-semibold text-on-surface-variant mb-3">Método de pago</p>
                <div className={`grid gap-2 ${metodosPagoActuales.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {metodosPagoActuales.map(m => (
                    <button
                      key={m}
                      onClick={() => setMetodoPago(m)}
                      disabled={isPending}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-1 ${
                        metodoPago === m
                          ? esDomicilio
                            ? 'border-tertiary bg-tertiary/10 text-tertiary'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{iconoMetodo(m)}</span>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {errorPedido && (
                <div className="mx-5 mb-3 flex items-center gap-2 bg-error-container text-error px-3 py-2.5 rounded-xl text-sm shrink-0">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {errorPedido}
                </div>
              )}

              {pagoExitoso && (
                <div className="mx-5 mb-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2.5 rounded-xl text-sm shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                  {esDomicilio ? '¡Domicilio cobrado exitosamente!' : '¡Pago registrado! Mesa liberada.'}
                </div>
              )}

              <div className="px-5 pb-6 grid grid-cols-2 gap-3 shrink-0">
                <button
                  onClick={() => { if (!isPending) setModalPago(false) }}
                  disabled={isPending}
                  className="py-3.5 rounded-2xl border-2 border-surface-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-all disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarPago}
                  disabled={isPending || pagoExitoso}
                  className={`py-3.5 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 shadow-md ${
                    esDomicilio ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isPending ? 'hourglass_empty' : 'check_circle'}
                  </span>
                  {isPending ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cabecera */}
        <header className="h-[64px] shrink-0 bg-surface border-b border-surface-variant px-6 flex items-center justify-between shadow-sm z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">restaurant_menu</span>
              <h1 className="font-display font-bold text-xl text-primary hidden sm:block">Queen Broaster</h1>
            </div>
            <div className="h-6 w-px bg-surface-variant mx-1" />
            <button
              onClick={volverAMesas}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high px-2 py-1.5 rounded-lg transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Mesas</span>
            </button>

            {esDomicilio ? (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">delivery_dining</span>
                <span className="font-display font-bold text-xl text-tertiary leading-none">Domicilio</span>
                {infoDomicilio.nombre && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary truncate max-w-[160px]">
                    {infoDomicilio.nombre}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-label-md text-on-surface-variant text-sm">Mesa:</span>
                <span className="font-display font-bold text-xl text-primary leading-none">
                  {String(mesaActiva!.number).padStart(2, '0')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  mesaActiva!.status ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'
                }`}>
                  {mesaActiva!.status ? 'Ocupada' : 'Libre'}
                </span>
                <div className="hidden sm:flex items-center gap-1 ml-1">
                  <span className="material-symbols-outlined text-[15px] text-outline">gps_fixed</span>
                  <input
                    type="number"
                    value={numeroGps}
                    onChange={e => setNumeroGps(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="GPS"
                    min={1}
                    readOnly={!!ordenActivaId}
                    className={`w-14 px-1.5 py-0.5 bg-surface-container-low border border-surface-variant rounded-lg text-xs text-center font-bold outline-none ${
                      ordenActivaId ? 'opacity-50 cursor-default' : 'focus:ring-2 focus:ring-primary'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {totalItemsGeneral > 0 && (
              <span className={`lg:hidden flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                esDomicilio ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
              }`}>
                <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                {totalItemsGeneral}
              </span>
            )}
            <div className="hidden lg:flex flex-col text-right mr-1">
              <p className="text-sm font-medium text-on-surface leading-none">{nombreUsuario}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Cajero</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-display font-bold text-sm flex items-center justify-center border-2 border-primary hover:opacity-90 transition-opacity shrink-0"
              >
                {iniciales}
              </button>
            </form>
          </div>
        </header>

        {/* Cuerpo — 3 columnas */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

          {/* Columna 1: Sidebar de categorías (solo desktop) */}
          <nav className="w-56 bg-surface-container-lowest border-r border-surface-variant flex-col p-3 gap-1 overflow-y-auto shrink-0 hidden lg:flex">
            <button
              onClick={() => setCategoriaFiltro(null)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                categoriaFiltro === null
                  ? esDomicilio ? 'bg-tertiary text-on-tertiary shadow-sm' : 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
              <span>Todos</span>
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(cat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all text-left ${
                  categoriaFiltro === cat.id
                    ? esDomicilio ? 'bg-tertiary text-on-tertiary shadow-sm' : 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">fastfood</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </nav>

          {/* Columna 2: Grid de productos */}
          <section className="flex-1 flex flex-col overflow-hidden bg-surface-container-low">

            <div className="px-4 py-3 bg-surface-container-lowest border-b border-surface-variant">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-lg text-on-surface">Seleccionar Productos</h2>
                <BuscadorProductos
                  value={busquedaProducto}
                  onChange={setBusquedaProducto}
                  esDomicilio={esDomicilio}
                />
              </div>
              {/* Chips de categoría en móvil */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                <button
                  onClick={() => setCategoriaFiltro(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    categoriaFiltro === null
                      ? esDomicilio ? 'bg-tertiary text-on-tertiary border-tertiary' : 'bg-primary text-on-primary border-primary'
                      : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Todos
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(cat.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      categoriaFiltro === cat.id
                        ? esDomicilio ? 'bg-tertiary text-on-tertiary border-tertiary' : 'bg-primary text-on-primary border-primary'
                        : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de tarjetas de producto */}
            <div className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-4">
              {productosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline mb-3">fastfood</span>
                  <p className="text-on-surface-variant text-sm">Sin productos que coincidan</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {productosFiltrados.map(producto => {
                    const enPedido = cantidadEnPedido(producto.id)
                    return (
                      <button
                        key={producto.id}
                        onClick={() => agregarProducto(producto)}
                        className={`bg-surface-container-lowest rounded-2xl border overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all group text-left active:scale-[0.98] ${
                          enPedido > 0
                            ? esDomicilio ? 'border-tertiary/40 ring-1 ring-tertiary/20' : 'border-primary/40 ring-1 ring-primary/20'
                            : esDomicilio ? 'border-surface-variant hover:border-tertiary/30' : 'border-surface-variant hover:border-primary/30'
                        }`}
                      >
                        <div className="h-36 w-full overflow-hidden relative bg-surface-container-high">
                          {producto.image_url ? (
                            <img
                              src={producto.image_url}
                              alt={producto.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-5xl text-outline">fastfood</span>
                            </div>
                          )}
                          {enPedido > 0 && (
                            <span className={`absolute top-2 right-2 w-7 h-7 text-sm font-bold rounded-full flex items-center justify-center shadow-md ${
                              esDomicilio ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                            }`}>
                              {enPedido}
                            </span>
                          )}
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-display font-semibold text-sm text-on-surface leading-tight line-clamp-2 flex-1">
                              {producto.name}
                            </h4>
                            <span className={`font-display font-bold text-base shrink-0 ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>
                              ${producto.price.toLocaleString('es-CO')}
                            </span>
                          </div>
                          {producto.description && (
                            <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">
                              {producto.description}
                            </p>
                          )}
                          <div className="mt-auto pt-2">
                            <div className={`w-full h-10 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold transition-all ${
                              enPedido > 0
                                ? esDomicilio ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                                : esDomicilio ? 'bg-tertiary text-on-tertiary group-active:brightness-90' : 'bg-primary text-on-primary group-active:brightness-90'
                            }`}>
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              {enPedido > 0 ? 'Agregar más' : 'Agregar'}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Columna 3: Panel de pedido (desktop) */}
          <aside className="w-[380px] bg-surface-container-lowest border-l border-surface-variant flex-col shrink-0 hidden lg:flex">

            <div className="p-5 border-b border-surface-variant">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-bold text-lg text-on-surface">
                  {esDomicilio ? 'Pedido Domicilio' : 'Detalle del Pedido'}
                </h3>
                {esDomicilio ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight bg-tertiary/10 text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">delivery_dining</span>
                    Domicilio
                  </span>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${
                    mesaActiva!.status ? 'bg-primary text-on-primary' : 'bg-green-100 text-green-700'
                  }`}>
                    {mesaActiva!.status ? 'Ocupada' : 'Libre'}
                  </span>
                )}
              </div>
              {esDomicilio ? (
                <div className="text-sm text-on-surface-variant space-y-0.5">
                  {infoDomicilio.nombre ? (
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      {infoDomicilio.nombre}
                      {infoDomicilio.telefono && ` · ${infoDomicilio.telefono}`}
                    </p>
                  ) : (
                    <p>{totalItemsGeneral > 0 ? `${totalItemsGeneral} ítem${totalItemsGeneral > 1 ? 's' : ''}` : 'Sin ítems'}</p>
                  )}
                  {infoDomicilio.direccion && (
                    <p className="flex items-center gap-1.5 text-xs truncate">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      {infoDomicilio.direccion}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant">
                    {mesaActiva!.name} · {totalItemsGeneral > 0 ? `${totalItemsGeneral} ítem${totalItemsGeneral > 1 ? 's' : ''}` : 'Sin ítems'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="material-symbols-outlined text-[15px] text-outline">gps_fixed</span>
                    <span className="text-xs text-on-surface-variant">Localizador:</span>
                    <input
                      type="number"
                      value={numeroGps}
                      onChange={e => setNumeroGps(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Nro."
                      min={1}
                      readOnly={!!ordenActivaId}
                      className={`w-16 px-2 py-0.5 bg-surface-container-low border border-surface-variant rounded-lg text-sm text-center font-bold outline-none ${
                        ordenActivaId ? 'opacity-50 cursor-default' : 'focus:ring-2 focus:ring-primary'
                      }`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Lista de ítems */}
            <div className="flex-1 overflow-y-auto p-3">
              {cargandoOrden ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <span className="material-symbols-outlined text-3xl text-outline animate-spin">progress_activity</span>
                  <p className="text-sm text-on-surface-variant">Cargando pedido...</p>
                </div>
              ) : totalItemsGeneral === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <span className="material-symbols-outlined text-5xl text-outline mb-3">
                    {esDomicilio ? 'delivery_dining' : 'add_shopping_cart'}
                  </span>
                  <p className="text-on-surface-variant text-sm font-medium">Pedido vacío</p>
                  <p className="text-xs text-outline mt-1">Selecciona productos del menú</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">

                  {/* Ítems ya en cocina */}
                  {itemsEnCocina.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                        <span className="material-symbols-outlined text-[16px] text-green-600">restaurant</span>
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                          En cocina ({itemsEnCocina.reduce((a, i) => a + i.cantidad, 0)} ítems)
                        </span>
                      </div>
                      {itemsEnCocina.map((item, idx) => (
                        <div key={`cocina-${item.productoId}-${idx}`} className="flex flex-col gap-2 p-2.5 bg-green-50/50 rounded-xl border border-green-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0 border border-surface-variant">
                              {item.imagen ? (
                                <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[18px] text-outline">fastfood</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-on-surface leading-tight truncate">{item.nombre}</p>
                              {item.notas && (
                                <p className="text-xs text-on-surface-variant truncate">{item.notas}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-xs text-on-surface-variant block">{item.cantidad}x</span>
                              <span className="text-sm font-bold text-on-surface">
                                ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                              </span>
                            </div>
                          </div>
                          {/* Complementos del ítem (solo lectura — ya enviados) */}
                          {item.addonIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-12">
                              {item.addonIds.map(addonId => {
                                const addon = addonMap.get(addonId)
                                if (!addon) return null
                                return (
                                  <span key={addonId} className="flex items-center gap-0.5 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                    <span className="material-symbols-outlined text-[11px]">add</span>
                                    {addon.name}
                                    {addon.price > 0 && <span className="opacity-70">+${addon.price.toLocaleString('es-CO')}</span>}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Ítems nuevos (sin enviar) */}
                  {itemsPedido.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-2 py-1.5 mt-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[16px] ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>add_circle</span>
                          <span className={`text-xs font-bold uppercase tracking-wider ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>
                            Nuevos ({itemsPedido.reduce((a, i) => a + i.cantidad, 0)} ítems)
                          </span>
                        </div>
                        <button
                          onClick={handleLimpiarPedido}
                          title="Descartar ítems sin enviar"
                          className="text-xs font-bold text-error hover:bg-error/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Limpiar
                        </button>
                      </div>
                      {itemsPedido.map(item => (
                        <div key={`nuevo-${item.productoId}`} className="flex items-start gap-3 p-2.5 bg-surface-container-low rounded-xl group relative">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0 border border-surface-variant">
                            {item.imagen ? (
                              <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px] text-outline">fastfood</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1">
                              <p className="text-sm font-semibold text-on-surface leading-tight truncate">{item.nombre}</p>
                              <span className="text-sm font-display font-bold text-on-surface shrink-0">
                                ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={item.notas}
                              onChange={e => actualizarNotas(item.productoId, e.target.value)}
                              placeholder="Notas..."
                              className="mt-1 w-full text-xs text-on-surface-variant bg-transparent border-none outline-none placeholder:text-outline truncate"
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center bg-surface border border-surface-variant rounded-full px-1">
                                <button
                                  onClick={() => cambiarCantidad(item.productoId, -1)}
                                  className={`w-6 h-6 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">remove</span>
                                </button>
                                <span className="px-3 text-sm font-display font-bold text-on-surface min-w-[24px] text-center">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={() => cambiarCantidad(item.productoId, +1)}
                                  className={`w-6 h-6 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">add</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-0.5 text-xs text-on-surface-variant" title="Editar precio">
                                <span className="material-symbols-outlined text-[12px] text-outline">sell</span>
                                <span>$</span>
                                <input
                                  type="number"
                                  value={item.precio}
                                  onChange={e => actualizarPrecio(item.productoId, Number(e.target.value))}
                                  className="w-16 bg-transparent border-b border-dashed border-outline text-center outline-none font-medium text-on-surface focus:border-primary focus:text-primary"
                                  min={0}
                                />
                              </div>
                            </div>

                            {/* Complementos del producto — seleccionar e ir agregando */}
                            {addsOnCatalogo.length > 0 && (() => {
                              const disponibles = addsOnCatalogo.filter(a => !item.addonIds.includes(a.id))
                              return (
                                <div className="mt-2 pt-2 border-t border-dashed border-surface-variant">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">tune</span>
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Complementos</span>
                                  </div>

                                  {/* Selector: agrega un complemento a la vez */}
                                  {disponibles.length > 0 && (
                                    <div className="relative">
                                      <select
                                        value=""
                                        onChange={e => {
                                          const id = Number(e.target.value)
                                          if (id) toggleAddonItem(item.productoId, id)
                                        }}
                                        className={`w-full appearance-none text-xs bg-surface border border-surface-variant rounded-lg pl-2.5 pr-7 py-1.5 outline-none text-on-surface-variant focus:ring-2 ${
                                          esDomicilio ? 'focus:ring-tertiary' : 'focus:ring-primary'
                                        }`}
                                      >
                                        <option value="">+ Agregar complemento...</option>
                                        {disponibles.map(addon => (
                                          <option key={addon.id} value={addon.id}>
                                            {addon.name}{addon.price > 0 ? ` (+$${addon.price.toLocaleString('es-CO')})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="material-symbols-outlined text-[16px] text-outline absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                    </div>
                                  )}

                                  {/* Complementos ya agregados al producto (removibles) */}
                                  {item.addonIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {item.addonIds.map(addonId => {
                                        const addon = addonMap.get(addonId)
                                        if (!addon) return null
                                        return (
                                          <span
                                            key={addonId}
                                            className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-semibold ${
                                              esDomicilio ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                                            }`}
                                          >
                                            {addon.name}
                                            {addon.price > 0 && (
                                              <span className="opacity-75">+${addon.price.toLocaleString('es-CO')}</span>
                                            )}
                                            <button
                                              onClick={() => toggleAddonItem(item.productoId, addonId)}
                                              className="ml-0.5 hover:opacity-70"
                                              title="Quitar"
                                            >
                                              <span className="material-symbols-outlined text-[13px]">close</span>
                                            </button>
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          <button
                            onClick={() => eliminarItem(item.productoId)}
                            className="absolute top-2 right-2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer: totales y acciones */}
            <div className="p-4 bg-surface border-t border-surface-variant shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              {(totalItemsGeneral > 0 || subtotalAddonsPendientes > 0 || subtotalAddonsOrden > 0) && (
                <div className="flex flex-col gap-1.5 mb-4">
                  {itemsEnCocina.length > 0 && itemsPedido.length > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>En cocina</span>
                        <span>${subtotalEnCocina.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Nuevos</span>
                        <span>${subtotalNuevos.toLocaleString('es-CO')}</span>
                      </div>
                    </>
                  )}
                  {(subtotalAddonsOrden > 0 || subtotalAddonsPendientes > 0) && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">tune</span>
                        Complementos
                      </span>
                      <span>${(subtotalAddonsOrden + subtotalAddonsPendientes).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className={`flex justify-between items-center font-display font-bold text-lg border-t border-surface-variant pt-2 mt-1 ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>
                    <span>Total</span>
                    <span>${totalGeneral.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              )}

              {pedidoEnviado && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2.5 rounded-xl mb-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                  Pedido #{pedidoEnviado} enviado a cocina
                </div>
              )}

              {errorPedido && (
                <div className="flex items-center gap-2 bg-error-container text-error px-3 py-2.5 rounded-xl mb-3 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {errorPedido}
                </div>
              )}

              {/* Botón WhatsApp — solo para domicilio con teléfono */}
              {mostrarBotonWa && (
                <a
                  href={generarUrlWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-3 py-3 rounded-2xl bg-[#25D366] text-white font-display font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6.69 6.69 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  Enviar pedido por WhatsApp
                </a>
              )}

              {/* Feedback: pedido marcado listo */}
              {ordenMarcadaLista && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2.5 rounded-xl mb-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-green-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Pedido listo — salió de cocina. Mesa activa para más ítems o cobro.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setErrorPedido(null)
                    setClienteDatos({ nombre: '', nit: '', telefono: '' })
                    if (esDomicilio) setMetodoPago(infoDomicilio.metodoPago)
                    setModalPago(true)
                  }}
                  disabled={isPending || totalItemsGeneral === 0}
                  className="py-3 rounded-2xl bg-secondary-container text-on-secondary-container font-display font-bold text-sm flex flex-col items-center justify-center gap-1 hover:brightness-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  {esDomicilio ? 'Cobrar' : 'Pagar Cuenta'}
                </button>
                <button
                  onClick={handleEnviarCocina}
                  disabled={isPending || itemsPedido.length === 0}
                  className={`py-3 rounded-2xl font-display font-bold text-sm flex flex-col items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${
                    esDomicilio ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isPending ? 'hourglass_empty' : esDomicilio ? 'delivery_dining' : 'restaurant'}
                  </span>
                  {isPending ? 'Enviando...' : 'Enviar Cocina'}
                </button>

                {/* Botón Imprimir Orden — solo si hay ítems en cocina */}
                {!esDomicilio && itemsEnCocina.length > 0 && (
                  <button
                    onClick={handleImprimirOrden}
                    className="col-span-2 py-2.5 rounded-xl bg-blue-600 text-white font-display font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                    title="Imprimir orden para la cocina"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Imprimir Orden
                  </button>
                )}

                {/* Botón Listo en Cocina — solo mesa con ítems en cocina */}
                {!esDomicilio && itemsEnCocina.length > 0 && !ordenMarcadaLista && (
                  <button
                    onClick={handleMarcarListo}
                    disabled={marcandoListo || isPending}
                    className="col-span-2 py-2.5 rounded-xl bg-green-600 text-white font-display font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {marcandoListo ? 'hourglass_empty' : 'check_circle'}
                    </span>
                    {marcandoListo ? 'Marcando...' : 'Listo en Cocina'}
                  </button>
                )}

                {/* Botón Cancelar Orden — si hay ítems sin enviar o en cocina */}
                {(itemsPedido.length > 0 || (itemsEnCocina.length > 0 && !ordenMarcadaLista)) && (
                  <button
                    onClick={handleCancelarOrden}
                    disabled={isPending}
                    className="py-2.5 rounded-xl border-2 border-error text-error font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-error/10 transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    Cancelar Orden
                  </button>
                )}

                <button
                  onClick={volverAMesas}
                  disabled={isPending}
                  className="py-2.5 rounded-xl border-2 border-surface-variant text-on-surface-variant font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-all disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Volver a Mesas
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Barra flotante del pedido en móvil */}
        {totalItemsGeneral > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-variant px-5 py-3 flex items-center justify-between shadow-xl z-40">
            <div>
              <p className="text-xs text-on-surface-variant">{totalItemsGeneral} ítem{totalItemsGeneral > 1 ? 's' : ''}</p>
              <p className={`font-display font-bold text-lg ${esDomicilio ? 'text-tertiary' : 'text-primary'}`}>
                ${totalGeneral.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setErrorPedido(null)
                  if (esDomicilio) setMetodoPago(infoDomicilio.metodoPago)
                  setModalPago(true)
                }}
                disabled={isPending}
                className="bg-secondary-container text-on-secondary-container font-bold px-4 py-2.5 rounded-xl text-sm hover:brightness-95 transition-all disabled:opacity-40"
              >
                Pagar
              </button>
              <button
                onClick={handleEnviarCocina}
                disabled={isPending || itemsPedido.length === 0}
                className={`font-bold px-4 py-2.5 rounded-xl text-sm shadow-md hover:brightness-110 transition-all disabled:opacity-40 ${
                  esDomicilio ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                }`}
              >
                {isPending ? 'Enviando...' : 'Cocina'}
              </button>
              {mostrarBotonWa && (
                <a
                  href={generarUrlWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white font-bold px-3 py-2.5 rounded-xl text-sm shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6.69 6.69 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  WA
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────
  // VISTA: Grid de mesas
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">

      <header className="sticky top-0 z-40 bg-surface border-b border-surface-variant px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">restaurant_menu</span>
          <h1 className="font-display font-bold text-2xl text-primary hidden sm:block">Queen Broaster</h1>
        </div>

        {/* Pestañas de navegación: Mesas | Historial | Gastos */}
        <nav className="flex items-center bg-surface-container-low rounded-xl p-1 gap-1">
          <button
            onClick={() => setVistaActual('mesas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              vistaActual === 'mesas'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Mesas</span>
          </button>
          <button
            onClick={() => setVistaActual('historial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              vistaActual === 'historial'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Historial</span>
          </button>
          <button
            onClick={() => setVistaActual('gastos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              vistaActual === 'gastos'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Gastos</span>
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {/* Botón configurar cajón de caja registradora */}
          <button
            onClick={() => { setCajonMensaje(null); setModalCajon(true) }}
            title={cajonConfigurado ? 'Cajón configurado — clic para ajustar' : 'Configurar cajón de caja registradora'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              cajonConfigurado
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
          </button>
          <span className="text-sm text-on-surface-variant hidden sm:block">{nombreUsuario}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-display font-bold text-sm flex items-center justify-center border-2 border-primary hover:opacity-90 transition-opacity shrink-0"
            >
              {iniciales}
            </button>
          </form>
        </div>
      </header>

      {/* ── Modal de configuración del cajón de caja ── */}
      {modalCajon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">point_of_sale</span>
                <h3 className="font-display font-bold text-on-surface">Cajón Registradora</h3>
              </div>
              <button onClick={() => setModalCajon(false)} className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* Selector de modo */}
              <div className="grid grid-cols-2 gap-2">
                {(['qz', 'serial'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => aplicarConfigCajon({ ...cajonConfig, modo: m })}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 flex flex-col items-center gap-0.5 transition-all ${
                      cajonConfig.modo === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {m === 'qz' ? 'lan' : 'cable'}
                    </span>
                    {m === 'qz' ? 'QZ Tray (USB)' : 'Puerto COM'}
                  </button>
                ))}
              </div>

              {/* ── Modo QZ Tray ── */}
              {cajonConfig.modo === 'qz' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
                    <p className="font-bold">Requiere QZ Tray instalado</p>
                    <p>Descarga gratis en <strong>qz.io</strong> e instálalo en este computador. Debe estar ejecutándose en la bandeja del sistema.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Nombre de la impresora en Windows</p>
                    <input
                      type="text"
                      value={cajonConfig.nombreImpresora ?? ''}
                      onChange={e => aplicarConfigCajon({ ...cajonConfig, nombreImpresora: e.target.value })}
                      placeholder="Ej: 3nStar RPT004"
                      className="w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Nombre exacto que aparece en Panel de control → Dispositivos e impresoras
                    </p>
                  </div>
                </div>
              )}

              {/* ── Modo Puerto COM (Web Serial) ── */}
              {cajonConfig.modo === 'serial' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
                    <p className="font-bold">Solo funciona si existe un puerto COM</p>
                    <p>Abre <strong>Administrador de dispositivos → Puertos (COM y LPT)</strong> y busca el COM de la impresora.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Velocidad (Baud Rate)</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[9600, 19200, 115200].map(br => (
                        <button key={br}
                          onClick={() => aplicarConfigCajon({ ...cajonConfig, baudRate: br })}
                          className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                            (cajonConfig.baudRate ?? 9600) === br
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >{br.toLocaleString()}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Pin RJ11</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([{ val: 0 as const, label: 'Pin 2 — más común' }, { val: 1 as const, label: 'Pin 5 — alternativo' }]).map(p => (
                        <button key={p.val}
                          onClick={() => aplicarConfigCajon({ ...cajonConfig, pin: p.val })}
                          className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            (cajonConfig.pin ?? 0) === p.val
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await seleccionarPuertoSerial()
                      setCajonMensaje(ok
                        ? { ok: true, texto: 'Puerto COM seleccionado. Prueba el cajón.' }
                        : { ok: false, texto: 'No se seleccionó ningún puerto.' }
                      )
                    }}
                    className="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-bold hover:bg-surface-variant transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">cable</span>
                    Seleccionar Puerto COM
                  </button>
                </div>
              )}

              {/* Resultado del test */}
              {cajonMensaje && (
                <div className={`rounded-xl text-sm ${
                  cajonMensaje.ok
                    ? 'bg-green-50 border border-green-200 text-green-800 px-3 py-2.5'
                    : 'bg-error-container text-error px-3 py-3'
                }`}>
                  <div className="flex items-start gap-2 font-medium">
                    <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                      {cajonMensaje.ok ? 'check_circle' : 'error'}
                    </span>
                    <span>{cajonMensaje.texto}</span>
                  </div>

                  {/* Pasos de solución según código de error */}
                  {cajonMensaje.code === 'QZ_NOT_RUNNING' && (
                    <ol className="mt-2 ml-6 space-y-1 text-xs font-normal list-decimal">
                      <li>¿Instalaste QZ Tray? Descárgalo en <strong>qz.io</strong></li>
                      <li>Busca el ícono <strong>Q</strong> en la bandeja del sistema (esquina inferior derecha)</li>
                      <li>Si no aparece, ábrelo desde el menú Inicio</li>
                      <li>Vuelve a probar el cajón</li>
                    </ol>
                  )}
                  {cajonMensaje.code === 'QZ_CERT' && (
                    <ol className="mt-2 ml-6 space-y-1 text-xs font-normal list-decimal">
                      <li>Abre una nueva pestaña de Chrome</li>
                      <li>Escribe en la barra de dirección: <strong>https://localhost:8181</strong></li>
                      <li>Chrome muestra advertencia de certificado → clic en <strong>Configuración avanzada</strong></li>
                      <li>Clic en <strong>Continuar a localhost</strong></li>
                      <li>Cierra esa pestaña y vuelve a probar</li>
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Probar */}
            <div className="px-5 pb-5">
              <button
                onClick={probarCajon}
                disabled={cajonTesteando}
                className="w-full py-3 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {cajonTesteando ? 'hourglass_empty' : 'lock_open'}
                </span>
                {cajonTesteando ? 'Probando...' : 'Probar Cajón Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vistaActual === 'historial' && <HistorialFacturas />}

      {vistaActual === 'gastos' && <Gastos />}

      {vistaActual === 'mesas' && (<>

      {/* Banner de Domicilio */}
      <div className="px-4 sm:px-6 pt-5 bg-surface-container-lowest">
        <button
          onClick={iniciarDomicilio}
          className="w-full bg-tertiary text-on-tertiary rounded-2xl px-5 py-4 flex items-center gap-4 hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-tertiary/20"
        >
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              delivery_dining
            </span>
          </div>
          <div className="text-left flex-1">
            <p className="font-display font-black text-base leading-none">Nuevo Domicilio</p>
            <p className="text-sm opacity-80 mt-0.5">Crear pedido para entrega a domicilio</p>
          </div>
          <span className="material-symbols-outlined text-[22px] opacity-70">chevron_right</span>
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 border-b border-surface-variant bg-surface-container-lowest">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="relative w-full sm:w-96 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">search</span>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar mesa..."
              className="w-full pl-12 pr-4 py-2.5 bg-surface-container-low border border-surface-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-on-surface-variant">Estado:</span>
            {([
              { valor: 'all'     as Filtro, etiqueta: 'Todas' },
              { valor: 'libre'   as Filtro, etiqueta: 'Disponible', punto: 'bg-green-600' },
              { valor: 'ocupada' as Filtro, etiqueta: 'Ocupada',    punto: 'bg-primary'   },
            ] as const).map(f => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                  filtro === f.valor
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-surface-variant text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {'punto' in f && <span className={`w-2.5 h-2.5 rounded-full ${(f as { punto: string }).punto}`} />}
                {f.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-on-surface-variant"><strong className="text-on-surface">{mesasState.length}</strong> totales</span>
          <span className="text-on-surface-variant"><strong className="text-green-700">{totalLibres}</strong> disponibles</span>
          <span className="text-on-surface-variant"><strong className="text-primary">{totalOcupadas}</strong> ocupadas</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-container-low pb-20 md:pb-6">
        {mesasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">table_restaurant</span>
            <p className="text-on-surface-variant text-sm">
              {mesasState.length === 0 ? 'No hay mesas configuradas' : 'Sin mesas que coincidan'}
            </p>
            {mesasState.length === 0 && (
              <Link href="/admin/mesas" className="mt-3 text-primary text-sm font-medium hover:underline">
                Crear mesas en el admin →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-8 gap-4">
            {mesasFiltradas.map(mesa => {
              const esOcupada = mesa.status
              return (
                <button
                  key={mesa.id}
                  onClick={() => seleccionarMesa(mesa)}
                  className={`rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all cursor-pointer select-none hover:-translate-y-1 active:scale-[0.98] ${
                    esOcupada
                      ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                      : 'bg-surface-container-lowest border-t-4 border-green-600 border-x border-b border-surface-variant shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-display font-bold text-xl leading-tight ${!esOcupada ? 'text-green-700' : ''}`}>
                      {numMesa(mesa.number)}
                    </span>
                    <span className={`material-symbols-outlined text-[18px] ${esOcupada ? 'opacity-60' : 'text-outline'}`}>
                      groups
                    </span>
                  </div>
                  <div className="mt-auto text-left">
                    <p className={`text-xs truncate max-w-full ${!esOcupada ? 'text-on-surface-variant' : 'opacity-75'}`}>
                      {mesa.name}
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${!esOcupada ? 'text-green-700' : ''}`}>
                      {esOcupada ? 'Ocupada' : 'Disponible'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      </>
      )}

      {/* Navegación inferior en móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-surface-variant flex justify-around items-center z-50 shadow-lg">
        <button
          onClick={() => setVistaActual('mesas')}
          className={`flex flex-col items-center gap-0.5 px-8 py-1 rounded-xl transition-colors ${
            vistaActual === 'mesas'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">storefront</span>
          <span className="text-xs font-semibold">Mesas</span>
        </button>
        <button
          onClick={() => setVistaActual('historial')}
          className={`flex flex-col items-center gap-0.5 px-8 py-1 rounded-xl transition-colors ${
            vistaActual === 'historial'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">receipt_long</span>
          <span className="text-xs font-semibold">Historial</span>
        </button>
        <button
          onClick={() => setVistaActual('gastos')}
          className={`flex flex-col items-center gap-0.5 px-8 py-1 rounded-xl transition-colors ${
            vistaActual === 'gastos'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">payments</span>
          <span className="text-xs font-semibold">Gastos</span>
        </button>
      </nav>
    </div>
  )
}
