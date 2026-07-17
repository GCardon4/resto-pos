import { redirect } from 'next/navigation'

// Redirigir a login desde la raíz
export default function Home() {
  redirect('/login')
}
