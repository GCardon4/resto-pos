import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MesasGrid } from '@/components/caja/MesasGrid'

// Panel de caja con listado de mesas y selección de productos
export default async function CajaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: mesas }, { data: productos }, { data: categorias }, { data: addsOnCatalogo }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('tables').select('id, name, number, status').order('number'),
    supabase.from('products').select('id, name, price, description, category_id, image_url').order('name'),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('adds-on').select('id, name, price').order('name'),
  ])

  const nombreUsuario = profile?.full_name || user.email || 'Usuario'

  return (
    <MesasGrid
      mesas={mesas ?? []}
      productos={productos ?? []}
      categorias={categorias ?? []}
      addsOnCatalogo={addsOnCatalogo ?? []}
      nombreUsuario={nombreUsuario}
      userId={user.id}
    />
  )
}
