'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLES, type AuthState } from '@/types'

// Iniciar sesión del usuario
export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No se pudo autenticar al usuario.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .single()

  const roleId = profile?.role_id

  if (roleId === ROLES.ADMIN) redirect('/admin')
  else if (roleId === ROLES.COCINA) redirect('/cocina')
  else redirect('/caja')
}

// Cerrar sesión del usuario
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
