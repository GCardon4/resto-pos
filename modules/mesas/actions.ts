'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Crear nueva mesa
export async function crearMesa(data: { nombre: string; numero: number }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tables')
    .insert({ name: data.nombre, number: data.numero, status: false })
  if (error) return { error: error.message }
  revalidatePath('/admin/mesas')
  return { error: null }
}

// Actualizar datos de una mesa
export async function actualizarMesa(
  id: number,
  data: { nombre: string; numero: number; estado: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tables')
    .update({ name: data.nombre, number: data.numero, status: data.estado })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mesas')
  return { error: null }
}

// Eliminar una mesa por id
export async function eliminarMesa(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mesas')
  return { error: null }
}
