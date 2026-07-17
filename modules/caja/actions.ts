'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ItemPedido {
  productoId: number
  precio: number
  cantidad: number
  notas: string
  // IDs de complementos del catálogo asignados a este producto
  addonIds?: number[]
}

// Insertar ítems de una orden y vincular sus complementos en la tabla intermedia
// Devuelve null si todo salió bien, o un mensaje de error
async function insertarItemsConComplementos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ordenId: number,
  items: ItemPedido[]
): Promise<string | null> {
  const { data: itemsInsertados, error: errorItems } = await supabase
    .from('order_items')
    .insert(
      items.map(i => ({
        order_id: ordenId,
        product_id: i.productoId,
        price: i.precio,
        quantity: i.cantidad,
        notes: i.notas || null,
        status: 'pending',
      }))
    )
    .select('id, product_id')

  if (errorItems) return errorItems.message

  // Vincular complementos por producto (el carrito agrupa un ítem por producto)
  const vinculos = items.flatMap(item =>
    (item.addonIds ?? []).map(addonId => {
      const insertado = (itemsInsertados ?? []).find(r => r.product_id === item.productoId)
      return insertado ? { order_item_id: insertado.id, adds_on_id: addonId } : null
    })
  ).filter((v): v is { order_item_id: number; adds_on_id: number } => v !== null)

  if (vinculos.length > 0) {
    await supabase.from('order_item_adds_on').insert(vinculos)
  }

  return null
}

interface ClienteDatos {
  nombre?: string
  nit?: string
  telefono?: string
  direccion?: string
}

// Buscar cliente por NIT o teléfono usando admin client (bypasea RLS de Supabase)
async function resolverCliente(datos: ClienteDatos): Promise<number | null> {
  const db = createAdminClient()
  const telefono = datos.telefono?.replace(/\D/g, '') || null
  const nit = datos.nit?.trim() || null
  const nombre = datos.nombre?.trim() || null

  // 1. Buscar por NIT (identificador más confiable para facturación DIAN)
  if (nit) {
    const { data: existente } = await db
      .from('customer')
      .select('id')
      .eq('nit', nit)
      .maybeSingle()
    if (existente) {
      await db.from('customer').update({
        ...(nombre ? { full_name: nombre } : {}),
        ...(telefono ? { phone: Number(telefono) } : {}),
      }).eq('id', existente.id)
      return existente.id as number
    }
  }

  // 2. Buscar por teléfono
  if (telefono) {
    const { data: existente } = await db
      .from('customer')
      .select('id')
      .eq('phone', Number(telefono))
      .maybeSingle()
    if (existente) {
      if (nit) await db.from('customer').update({ nit }).eq('id', existente.id)
      return existente.id as number
    }
  }

  // 3. Crear nuevo cliente
  const { data: nuevo, error } = await db
    .from('customer')
    .insert({
      full_name: nombre || 'Consumidor final',
      nit,
      phone: telefono ? Number(telefono) : null,
      address: datos.direccion?.trim() || null,
    })
    .select('id')
    .single()

  return nuevo?.id ?? null
}

// Obtener el cliente anónimo genérico usando admin client (bypasea RLS)
async function resolverClienteAnonimo(): Promise<number | null> {
  const db = createAdminClient()
  const { data: existente } = await db
    .from('customer')
    .select('id')
    .eq('full_name', 'Consumidor final')
    .is('phone', null)
    .is('nit', null)
    .maybeSingle()
  if (existente) return existente.id as number

  const { data: nuevo } = await db
    .from('customer')
    .insert({ full_name: 'Consumidor final' })
    .select('id')
    .single()
  return nuevo?.id ?? null
}

// Enviar pedido a cocina y registrar la orden sobre la mesa
export async function enviarPedidoCocina(
  mesaId: number,
  userId: string,
  items: ItemPedido[],
  gps?: number | null
) {
  const supabase = await createClient()

  const { data: orden, error: errorOrden } = await supabase
    .from('order')
    .insert({ table_id: mesaId, user_id: userId, status: 'pending', gps: gps ?? null })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    return { error: errorOrden?.message ?? 'Error al crear el pedido' }
  }

  // Insertar ítems y vincular sus complementos
  const errorItems = await insertarItemsConComplementos(supabase, orden.id, items)
  if (errorItems) return { error: errorItems }

  const { error: errorMesa } = await supabase
    .from('tables')
    .update({ status: true })
    .eq('id', mesaId)

  if (errorMesa) return { error: errorMesa.message }

  revalidatePath('/caja')
  return { error: null, ordenId: orden.id }
}

// Enviar pedido de domicilio a cocina — crea/vincula cliente y crea orden sin mesa
export async function enviarDomicilioCocina(
  userId: string,
  items: ItemPedido[],
  clienteDatos: { nombre: string; telefono: string; direccion: string }
) {
  const supabase = await createClient()

  const customerId = await resolverCliente({
    nombre: clienteDatos.nombre,
    telefono: clienteDatos.telefono,
    direccion: clienteDatos.direccion,
  })

  const { data: orden, error: errorOrden } = await supabase
    .from('order')
    .insert({ table_id: null, user_id: userId, status: 'pending', customer_id: customerId })
    .select('id')
    .single()

  if (errorOrden || !orden) {
    return { error: errorOrden?.message ?? 'Error al crear el pedido de domicilio' }
  }

  // Insertar ítems y vincular sus complementos
  const errorItems = await insertarItemsConComplementos(supabase, orden.id, items)
  if (errorItems) return { error: errorItems }

  revalidatePath('/caja')
  return { error: null, ordenId: orden.id }
}

// Obtener orden activa de una mesa (sin venta registrada, incluye órdenes 'ready' sin pagar)
export async function obtenerOrdenActivaMesa(mesaId: number) {
  const supabase = await createClient()

  const { data: ultimaOrden, error } = await supabase
    .from('order')
    .select('id, status, gps')
    .eq('table_id', mesaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !ultimaOrden) return { error: error?.message ?? null, orden: null }

  // Verificar que no tenga venta (orden abierta)
  const { data: venta } = await supabase
    .from('sales')
    .select('id')
    .eq('order_id', ultimaOrden.id)
    .maybeSingle()

  if (venta) return { error: null, orden: null }

  const { data: items } = await supabase
    .from('order_items')
    .select('id, product_id, price, quantity, notes, products(id, name, image_url)')
    .eq('order_id', ultimaOrden.id)

  // Complementos por ítem desde la tabla intermedia
  const itemIds = (items ?? []).map((i: any) => i.id as number)
  const { data: vinculos } = itemIds.length
    ? await supabase.from('order_item_adds_on').select('order_item_id, adds_on_id').in('order_item_id', itemIds)
    : { data: [] as { order_item_id: number; adds_on_id: number }[] }

  return {
    error: null,
    orden: {
      id: ultimaOrden.id,
      estaLista: ultimaOrden.status === 'ready',
      gps: (ultimaOrden as any).gps as number | null,
      items: (items ?? []).map((i: any) => ({
        productoId: i.product_id as number,
        nombre: (i.products as any)?.name ?? 'Producto',
        precio: i.price as number,
        cantidad: i.quantity as number,
        notas: (i.notes as string) ?? '',
        imagen: (i.products as any)?.image_url ?? null,
        // IDs de complementos asignados a este ítem
        addonIds: (vinculos ?? [])
          .filter((v: any) => v.order_item_id === i.id)
          .map((v: any) => v.adds_on_id as number),
      })),
    },
  }
}

// Agregar más ítems a una orden existente
export async function agregarItemsAOrden(ordenId: number, items: ItemPedido[]) {
  const supabase = await createClient()

  // Insertar ítems y vincular sus complementos
  const errorItems = await insertarItemsConComplementos(supabase, ordenId, items)
  if (errorItems) return { error: errorItems }

  // Si la orden estaba en 'ready' (marcada lista desde caja), volver a 'pending'
  // para que los nuevos ítems aparezcan en el display de cocina
  await supabase
    .from('order')
    .update({ status: 'pending' })
    .eq('id', ordenId)
    .in('status', ['ready'])

  revalidatePath('/caja')
  return { error: null }
}

// Marcar pedido como listo desde caja — sale de la cocina pero la mesa SIGUE ocupada
export async function marcarPedidoListo(ordenId: number) {
  const supabase = await createClient()

  // Marcar ítems pendientes como listos — dispara realtime en cocina para quitar la tarjeta
  await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', ordenId)
    .eq('status', 'pending')

  // Cambiar estado de la orden a 'ready' para excluirla del display de cocina
  // La mesa NO se libera: el cliente puede agregar más ítems o el cajero procesa el pago después
  await supabase
    .from('order')
    .update({ status: 'ready' })
    .eq('id', ordenId)

  revalidatePath('/cocina')
  return { error: null }
}

// Procesar pago de mesa: vincula cliente, crea venta, cierra orden y libera mesa
export async function procesarPago(
  ordenId: number,
  mesaId: number,
  metodoPago: string,
  subtotal: number,
  total: number,
  clienteDatos?: ClienteDatos | null,
  generarFactura = true
) {
  const supabase = await createClient()

  // Resolver cliente: si hay datos (nombre/nit/teléfono) crea o actualiza; si no, usa anónimo
  const tieneDatos = !!(clienteDatos?.nombre?.trim() || clienteDatos?.nit?.trim() || clienteDatos?.telefono?.trim())
  const customerId = tieneDatos
    ? await resolverCliente(clienteDatos!)
    : await resolverClienteAnonimo()

  if (customerId) {
    await supabase.from('order').update({ customer_id: customerId }).eq('id', ordenId)
  }

  // Marcar ítems pendientes como listos — dispara realtime en cocina para quitar la tarjeta
  await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', ordenId)
    .eq('status', 'pending')

  const { error: errorVenta } = await supabase.from('sales').insert({
    order_id: ordenId,
    subtotal,
    total: String(total),
    tax: '0',
    discount: '0',
    payment_method: metodoPago,
  })

  if (errorVenta) return { error: errorVenta.message }

  const { error: errorOrden } = await supabase
    .from('order')
    .update({ status: 'paid' })
    .eq('id', ordenId)

  if (errorOrden) return { error: errorOrden.message }

  const { error: errorMesa } = await supabase
    .from('tables')
    .update({ status: false })
    .eq('id', mesaId)

  if (errorMesa) return { error: errorMesa.message }

  if (generarFactura) await crearFactura(ordenId, customerId)

  revalidatePath('/caja')
  revalidatePath('/cocina')
  return { error: null }
}

// Procesar pago de domicilio — cliente ya vinculado; acepta NIT para actualizarlo en la factura
export async function procesarPagoDomicilio(
  ordenId: number,
  metodoPago: string,
  subtotal: number,
  total: number,
  nitCliente?: string | null,
  generarFactura = true
) {
  const supabase = await createClient()

  // Actualizar NIT del cliente si se provee (usa admin client para bypasear RLS)
  if (nitCliente?.trim()) {
    const { data: ordenInfo } = await supabase
      .from('order')
      .select('customer_id')
      .eq('id', ordenId)
      .single()

    if (ordenInfo?.customer_id) {
      const db = createAdminClient()
      await db
        .from('customer')
        .update({ nit: nitCliente.trim() })
        .eq('id', ordenInfo.customer_id)
    }
  }

  // Marcar ítems pendientes como listos — dispara realtime en cocina para quitar la tarjeta
  await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', ordenId)
    .eq('status', 'pending')

  const { error: errorVenta } = await supabase.from('sales').insert({
    order_id: ordenId,
    subtotal,
    total: String(total),
    tax: '0',
    discount: '0',
    payment_method: metodoPago,
  })

  if (errorVenta) return { error: errorVenta.message }

  const { error: errorOrden } = await supabase
    .from('order')
    .update({ status: 'paid' })
    .eq('id', ordenId)

  if (errorOrden) return { error: errorOrden.message }

  // Obtener cliente de la orden para crear la factura
  const { data: ordenInfo } = await supabase
    .from('order')
    .select('customer_id')
    .eq('id', ordenId)
    .single()

  if (generarFactura) await crearFactura(ordenId, ordenInfo?.customer_id ?? null)

  revalidatePath('/caja')
  revalidatePath('/cocina')
  return { error: null }
}

// Crear factura usando admin client (bypasea RLS — garantiza escritura en invoice)
async function crearFactura(ordenId: number, customerId: number | null): Promise<void> {
  try {
    const db = createAdminClient()
    const { data: factura, error } = await db
      .from('invoice')
      .insert({ order_id: ordenId, customer_id: customerId })
      .select('id')
      .single()

    if (error || !factura) return

    await db
      .from('invoice')
      .update({ invoice_number: `FV-${String(factura.id).padStart(5, '0')}` })
      .eq('id', factura.id)
  } catch (_) {
    // Error silencioso — el pago ya se procesó correctamente
  }
}

// Obtener historial de ventas para el módulo de caja (desde tabla sales con número FV)
export async function obtenerHistorialFacturas(limite = 100) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      subtotal,
      payment_method,
      created_at,
      order:order_id (
        id,
        table_id,
        customer_id,
        tables:table_id (number, name),
        customer:customer_id (id, full_name, nit, phone),
        invoice (invoice_number)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) return { error: error.message, facturas: [] }
  return { error: null, facturas: data ?? [] }
}

// Obtener detalle completo de una venta para imprimir o exportar PDF (con número FV DIAN)
export async function obtenerDetalleFactura(ventaId: number) {
  const supabase = await createClient()

  const { data: venta, error: errorVenta } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      subtotal,
      tax,
      discount,
      payment_method,
      created_at,
      order:order_id (
        id,
        table_id,
        customer_id,
        tables:table_id (number, name),
        customer:customer_id (full_name, nit, phone, address),
        invoice (invoice_number),
        order_items (
          id, quantity, price, notes,
          products:product_id (name)
        )
      )
    `)
    .eq('id', ventaId)
    .single()

  if (errorVenta) return { error: errorVenta.message, factura: null }
  return { error: null, factura: venta }
}
