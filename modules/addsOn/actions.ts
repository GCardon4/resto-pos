'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Crear nuevo complemento en el catálogo
export async function crearAddon(data: { nombre: string; precio: number }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('adds-on')
    .insert({ name: data.nombre, price: data.precio })
  if (error) return { error: error.message }
  revalidatePath('/admin/adds-on')
  return { error: null }
}

// Actualizar nombre y precio de un complemento
export async function actualizarAddon(id: number, data: { nombre: string; precio: number }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('adds-on')
    .update({ name: data.nombre, price: data.precio })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/adds-on')
  return { error: null }
}

// Eliminar complemento del catálogo
export async function eliminarAddon(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('adds-on').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/adds-on')
  return { error: null }
}
