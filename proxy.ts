import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLES } from '@/types'

// Proteger rutas y redirigir según role_id del usuario
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Redirigir a login si no hay sesión
  if (!user) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Obtener role_id del perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .single()

  const roleId = profile?.role_id

  // Redirigir al panel correcto si ya tiene sesión y va al login
  if (pathname === '/login') {
    const destino =
      roleId === ROLES.ADMIN ? '/admin' :
      roleId === ROLES.COCINA ? '/cocina' :
      '/caja'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  // Proteger /admin solo para administradores
  if (pathname.startsWith('/admin') && roleId !== ROLES.ADMIN) {
    const destino = roleId === ROLES.COCINA ? '/cocina' : '/caja'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  // Proteger /cocina para rol cocina y admin
  if (pathname.startsWith('/cocina') && roleId !== ROLES.COCINA && roleId !== ROLES.ADMIN) {
    return NextResponse.redirect(new URL('/caja', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/qz/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
