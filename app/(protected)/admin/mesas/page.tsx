import { createClient } from '@/lib/supabase/server'
import { MesasManager } from '@/components/admin/mesas/MesasManager'

// Página de gestión de mesas del restaurante
export default async function MesasPage() {
  const supabase = await createClient()

  const { data: mesas } = await supabase
    .from('tables')
    .select('id, name, number, status')
    .order('number')

  return <MesasManager mesas={mesas ?? []} />
}
