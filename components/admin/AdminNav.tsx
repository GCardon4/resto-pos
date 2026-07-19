'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/lib/auth/actions'
import InstallPWA from "@/components/pwa/InstallPWA";

const navItems = [
  { href: '/admin',           label: 'Dashboard',   icon: 'dashboard',        exact: true  },
  { href: '/admin/mesas',     label: 'Mesas',        icon: 'table_restaurant', exact: false },
  { href: '/admin/productos', label: 'Productos',    icon: 'fastfood',         exact: false },
  { href: '/admin/adds-on',   label: 'Complementos', icon: 'tune',             exact: false },
  { href: '/admin/usuarios',  label: 'Usuarios',     icon: 'group',            exact: false },
]

// Navegación lateral del panel de administración
export function AdminNav({ nombreUsuario }: { nombreUsuario: string }) {
  const pathname = usePathname()

  const estaActivo = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const iniciales = nombreUsuario
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <>
      {/* Sidebar fijo en desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface border-r border-surface-variant z-40">

        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-surface-variant">
          <span className="material-symbols-outlined text-primary text-[32px] filled-icon">restaurant_menu</span>
          <h1 className="font-display font-bold text-xl text-primary leading-tight">Resto-POS</h1>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const activo = estaActivo(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${activo ? 'filled-icon' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bloque soporte + usuario */}
        <div className="p-4 border-t border-surface-variant space-y-4">
          {/* Botón instalar PWA */}
          <div className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface leading-tight">Instalar App</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Acceso rápido en tu dispositivo</p>
            </div>
            <InstallPWA />
          </div>

          {/* Widget soporte */}
          <div className="bg-primary p-4 rounded-xl relative overflow-hidden">
            <div className="relative z-10">
              
              <p className="text-xs font-bold uppercase tracking-wider text-on-primary mb-2">Soporte</p>
              <button className="text-xs bg-on-primary text-primary px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-opacity">
                Contactar
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-[56px] text-on-primary opacity-10 select-none">
              support_agent
            </span>
          </div>

          {/* Info usuario + salir */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-display font-bold text-sm border-2 border-primary shrink-0">
              {iniciales}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-on-surface">{nombreUsuario}</p>
              <p className="text-xs text-on-surface-variant">Administrador</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Navegación inferior en móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-surface-variant flex lg:hidden h-16 shadow-lg">
        {navItems.map(item => {
          const activo = estaActivo(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                activo ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${activo ? 'filled-icon' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
        {/* Instalar PWA — solo si el navegador lo soporta */}
        <InstallPWA variante="footer" />
      </nav>
    </>
  )
}
