'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Marcar todos los ítems pendientes de una orden como listos, actualizar estado y liberar la mesa
export async function marcarOrdenLista(ordenId: number) {
  const supabase = await createClient()

  const { error: errorItems } = await supabase
    .from('order_items')
    .update({ status: 'ready' })
    .eq('order_id', ordenId)
    .eq('status', 'pending')

  if (errorItems) return { error: errorItems.message }

  // Obtener table_id antes de actualizar el estado
  const { data: orden } = await supabase
    .from('order')
    .select('table_id')
    .eq('id', ordenId)
    .maybeSingle()

  const { error: errorOrden } = await supabase
    .from('order')
    .update({ status: 'ready' })
    .eq('id', ordenId)

  if (errorOrden) return { error: errorOrden.message }

  // Liberar la mesa (solo si tiene mesa asignada — no aplica a domicilios)
  if (orden?.table_id) {
    await supabase
      .from('tables')
      .update({ status: false })
      .eq('id', orden.table_id)
  }

  revalidatePath('/caja')
  revalidatePath('/cocina')
  return { error: null }
}
