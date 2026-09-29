import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PagoPendienteModal } from '@/components/admin/PagoPendienteModal'
import { CompanyProvider } from '@/lib/context/CompanyContext'

// Verificar sesión activa para rutas protegidas
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Cliente admin: la tabla 'company' es config global sin políticas RLS propias
  const { data: empresa } = await createAdminClient()
    .from('company')
    .select('name, nit, address, phone, payment')
    .limit(1)
    .maybeSingle()
  const pagoPendiente = empresa?.payment === false

  return (
    <CompanyProvider empresa={empresa}>
      {children}
      {pagoPendiente && <PagoPendienteModal />}
    </CompanyProvider>
  )
}
