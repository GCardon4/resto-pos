import { createClient } from '@/lib/supabase/server'
import { AddsOnManager } from '@/components/admin/addsOn/AddsOnManager'

// Página de gestión de complementos y adiciones del menú
export default async function AddsOnPage() {
  const supabase = await createClient()

  const { data: addons } = await supabase
    .from('adds-on')
    .select('id, name, price')
    .is('order_id', null)
    .order('name')

  return <AddsOnManager addons={addons ?? []} />
}
