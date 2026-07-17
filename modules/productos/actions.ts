'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface DatosProducto {
  nombre: string
  sku: number | null
  precio: number
  costo: number
  descripcion: string
  categoriaId: number | null
  stock: number
  cocina: boolean
  imagen: string | null
}

// Crear un nuevo producto
export async function crearProducto(data: DatosProducto) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    name: data.nombre,
    sku: data.sku,
    price: data.precio,
    cost: data.costo,
    description: data.descripcion || null,
    category_id: data.categoriaId,
    stock: data.stock,
    cook: data.cocina,
    image_url: data.imagen,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/productos')
  return { error: null }
}

// Actualizar datos de un producto existente
export async function actualizarProducto(id: number, data: DatosProducto) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({
      name: data.nombre,
      sku: data.sku,
      price: data.precio,
      cost: data.costo,
      description: data.descripcion || null,
      category_id: data.categoriaId,
      stock: data.stock,
      cook: data.cocina,
      image_url: data.imagen,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/productos')
  return { error: null }
}

// Eliminar un producto por id
export async function eliminarProducto(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/productos')
  return { error: null }
}

// Crear una nueva categoría de producto
export async function crearCategoria(nombre: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ name: nombre })
  if (error) return { error: error.message }
  revalidatePath('/admin/productos')
  return { error: null }
}
