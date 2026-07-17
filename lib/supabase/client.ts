import { createBrowserClient } from '@supabase/ssr'

// Crear cliente de Supabase para el navegador
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
