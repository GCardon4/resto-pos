import { createClient } from '@/lib/supabase/server'
import { UsuariosManager } from '@/components/admin/usuarios/UsuariosManager'

// Página de gestión de usuarios y roles
export default async function UsuariosPage() {
  const supabase = await createClient()

  const [{ data: usuarios }, { data: roles }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role_id')
      .order('full_name'),
    supabase
      .from('roles')
      .select('id, name')
      .order('id'),
  ])

  return <UsuariosManager usuarios={usuarios ?? []} roles={roles ?? []} />
}
