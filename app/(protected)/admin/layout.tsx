import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { ROLES } from '@/types'

// Layout del panel de administración con sidebar claro
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role_id')
    .eq('id', user.id)
    .single()

  if (profile?.role_id !== ROLES.ADMIN) {
    redirect(profile?.role_id === ROLES.COCINA ? '/cocina' : '/caja')
  }

  const nombreUsuario = profile?.full_name || user.email || 'Admin'

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <AdminNav nombreUsuario={nombreUsuario} />

      <div className="lg:ml-64 flex flex-col min-h-screen">

        {/* Barra superior */}
        <header className="sticky top-0 z-30 h-14 bg-surface/90 backdrop-blur-md border-b border-surface-variant flex items-center justify-between px-4 sm:px-8 shrink-0">

          {/* Logo visible solo en móvil */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="material-symbols-outlined text-primary text-[22px] filled-icon">restaurant_menu</span>
            <span className="font-display font-bold text-sm text-primary">Resto-POS</span>
          </div>
          <div className="hidden lg:block" />

          {/* Controles del header */}
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-surface-variant rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-52 transition-all"
              />
            </div>

            {/* Notificaciones */}
            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full relative transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
