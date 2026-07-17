'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Actualizar nombre y rol de un usuario existente
export async function actualizarUsuario(
  id: string,
  data: { nombreCompleto: string; roleId: number }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.nombreCompleto,
      role_id: data.roleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/usuarios')
  return { error: null }
}

// Crear nuevo usuario de caja o cocina en el sistema
export async function crearUsuario(data: {
  nombreCompleto: string
  email: string
  password: string
  roleId: number
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Agrega SUPABASE_SERVICE_ROLE_KEY en .env.local para crear usuarios.' }
  }

  const supabase = createAdminClient()
  const emailNorm = data.email.toLowerCase().trim()

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password: data.password,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'No se pudo crear el usuario.' }

  // Crear o actualizar perfil con nombre y rol
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      full_name: data.nombreCompleto.trim(),
      email: emailNorm,
      role_id: data.roleId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    // Revertir: eliminar usuario auth si el perfil falló
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/admin/usuarios')
  return { error: null }
}

// Eliminar usuario del sistema por ID
export async function eliminarUsuario(id: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Agrega SUPABASE_SERVICE_ROLE_KEY en .env.local para eliminar usuarios.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return { error: error.message }

  revalidatePath('/admin/usuarios')
  return { error: null }
}
