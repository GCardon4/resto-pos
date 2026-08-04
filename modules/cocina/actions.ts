'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Marcar todos los ítems pendientes de una orden como listos, actualizar estado y liberar la mesa
export async function marcarOrdenLista(ordenId: number) {
  const supabase = await createClient()

  console.log('👨‍🍳 Marcando orden', ordenId, 'como lista en cocina...')
  const { error: errorItems } = await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', ordenId)
    .eq('status', 'pending')

  console.log('📋 Resultado actualización items:', { errorItems })

  if (errorItems) {
    console.log('❌ Error al actualizar items:', errorItems.message)
    return { error: errorItems.message }
  }

  console.log('✅ Items marcados como ready')

  // Obtener table_id antes de actualizar el estado
  console.log('🔍 Obteniendo table_id de la orden...')
  const { data: orden } = await supabase
    .from('order')
    .select('table_id')
    .eq('id', ordenId)
    .maybeSingle()

  console.log('📊 Datos de orden:', { tabla_id: orden?.table_id })

  console.log('📝 Actualizando estado de orden a "ready"...')
  const { error: errorOrden } = await supabase
    .from('order')
    .update({ status: 'ready' })
    .eq('id', ordenId)

  console.log('📋 Resultado actualización orden:', { errorOrden })

  if (errorOrden) {
    console.log('❌ Error al actualizar orden:', errorOrden.message)
    return { error: errorOrden.message }
  }

  console.log('✅ Orden actualizada a ready')

  // Liberar la mesa (solo si tiene mesa asignada — no aplica a domicilios)
  if (orden?.table_id) {
    console.log('🪑 Liberando mesa ID:', orden.table_id)
    await supabase
      .from('tables')
      .update({ status: false })
      .eq('id', orden.table_id)
    console.log('✅ Mesa liberada')
  } else {
    console.log('⏭️ Orden sin mesa (domicilio), no libera mesa')
  }

  revalidatePath('/caja')
  revalidatePath('/cocina')
  console.log('✅ Orden marcada como lista exitosamente')
  return { error: null }
}
