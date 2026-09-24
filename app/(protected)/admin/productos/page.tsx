import { createClient } from '@/lib/supabase/server'
import { ProductosManager } from '@/components/admin/productos/ProductosManager'
import { listarImagenesProductos } from '@/modules/productos/imagenes'

// Página de gestión de productos y categorías
export default async function ProductosPage() {
  const supabase = await createClient()

  const [{ data: productos, error: errorProductos }, { data: categorias }, imagenes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, price, cost, description, category_id, stock, cook, image_url')
      .order('name'),
    supabase
      .from('categories')
      .select('id, name')
      .order('name'),
    listarImagenesProductos(),
  ])

  if (errorProductos) {
    throw new Error(`Error cargando productos: ${errorProductos.message}`)
  }

  return (
    <ProductosManager
      productos={(productos as any) ?? []}
      categorias={categorias ?? []}
      imagenes={imagenes}
    />
  )
}
