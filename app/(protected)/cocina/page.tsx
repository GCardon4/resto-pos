import { createClient } from '@/lib/supabase/server'
import { CocinaDisplay } from '@/components/cocina/CocinaDisplay'

export const dynamic = 'force-dynamic'

// Panel de cocina: pedidos pendientes en tiempo real
export default async function CocinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)

  const [
    { data: profile },
    { data: rawOrdenes },
    { count: pedidosHoy },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('order')
      .select(`
        id,
        created_at,
        status,
        gps,
        customer:customer_id(full_name, phone, address),
        tables(id, name, number),
        order_items(id, quantity, notes, status, products(name))
      `)
      // Excluir órdenes ya pagadas o entregadas; incluir pending y null (órdenes antiguas)
      .or('status.eq.pending,status.is.null')
      // Último pedido recibido va primero
      .order('created_at', { ascending: false }),
    supabase
      .from('order')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', inicioHoy.toISOString()),
  ])

  // Solo órdenes que tengan al menos un ítem pendiente
  const rawFiltradas = (rawOrdenes ?? []).filter((o: any) =>
    Array.isArray(o.order_items) &&
    (o.order_items as any[]).some((i: any) => i.status === 'pending')
  )

  // Complementos por ítem — desde la tabla intermedia, resueltos contra el catálogo
  const itemIds = rawFiltradas.flatMap((o: any) =>
    ((o.order_items as any[]) ?? [])
      .filter((i: any) => i.status === 'pending')
      .map((i: any) => i.id as number)
  )
  const { data: vinculos } = itemIds.length
    ? await supabase.from('order_item_adds_on').select('order_item_id, adds_on_id').in('order_item_id', itemIds)
    : { data: [] as { order_item_id: number; adds_on_id: number }[] }

  const addonIds = [...new Set((vinculos ?? []).map((v: any) => v.adds_on_id as number))]
  const { data: catalogo } = addonIds.length
    ? await supabase.from('adds-on').select('id, name, price').in('id', addonIds)
    : { data: [] as { id: number; name: string; price: number }[] }
  const catalogoMap = new Map((catalogo ?? []).map((a: any) => [a.id as number, a]))

  // Complementos agrupados por ítem
  const addonsDeItem = (itemId: number) =>
    (vinculos ?? [])
      .filter((v: any) => v.order_item_id === itemId)
      .map((v: any) => catalogoMap.get(v.adds_on_id))
      .filter(Boolean)
      .map((a: any) => ({ id: a.id as number, nombre: a.name as string, precio: a.price as number }))

  const ordenes = rawFiltradas.map((o: any) => {
    const esDomicilio = o.tables === null
    const cliente = o.customer as any
    const customerInfo = esDomicilio && cliente
      ? [cliente.full_name, cliente.phone, cliente.address].filter(Boolean).join(' · ')
      : null
    return {
      id: o.id as number,
      tipo: (esDomicilio ? 'domicilio' : 'mesa') as 'mesa' | 'domicilio',
      customerInfo,
      tableName: (o.tables as any)?.name ?? '',
      tableNumber: Number((o.tables as any)?.number ?? 0),
      createdAt: o.created_at as string,
      gps: (o.gps as number | null) ?? null,
      items: ((o.order_items as any[]) ?? [])
        .filter((i: any) => i.status === 'pending')
        .map((i: any) => ({
          id: i.id as number,
          nombre: (i.products as any)?.name ?? 'Producto',
          cantidad: Number(i.quantity),
          notas: (i.notes as string | null),
          addons: addonsDeItem(i.id as number),
        })),
    }
  })

  return (
    <CocinaDisplay
      ordenes={ordenes}
      pedidosHoy={pedidosHoy ?? 0}
      nombreUsuario={profile?.full_name ?? user?.email ?? 'Chef'}
    />
  )
}
