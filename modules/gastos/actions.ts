'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CategoriaGasto {
  id: number
  name: string
}

export interface Gasto {
  id: number
  expense_date: string
  description: string | null
  amount: number
  expense_category_id: number | null
  expense_categories: { id: number; name: string } | null
}

// Obtener categorías de gasto para el selector del formulario
export async function obtenerCategoriasGasto() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name')
    .order('name')

  if (error) return { error: error.message, categorias: [] as CategoriaGasto[] }
  return { error: null, categorias: (data ?? []) as CategoriaGasto[] }
}

// Obtener listado de gastos registrados
export async function obtenerGastos(limite = 200) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('id, expense_date, description, amount, expense_category_id, expense_categories:expense_category_id (id, name)')
    .order('expense_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limite)

  if (error) return { error: error.message, gastos: [] as Gasto[] }
  return { error: null, gastos: (data ?? []) as unknown as Gasto[] }
}

// Registrar un nuevo gasto
export async function crearGasto(datos: {
  fecha: string
  categoriaId: number
  descripcion: string
  monto: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').insert({
    expense_date: datos.fecha,
    expense_category_id: datos.categoriaId,
    description: datos.descripcion || null,
    amount: datos.monto,
  })

  if (error) return { error: error.message }
  revalidatePath('/caja')
  return { error: null }
}

// Eliminar un gasto registrado por error
export async function eliminarGasto(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/caja')
  return { error: null }
}
