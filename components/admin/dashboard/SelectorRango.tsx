'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const OPCIONES = [
  { valor: 7, etiqueta: 'Últimos 7 días' },
  { valor: 30, etiqueta: 'Últimos 30 días' },
]

// Selector de rango de tiempo del dashboard — actualiza el parámetro ?rango en la URL
export function SelectorRango({ rango }: { rango: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const cambiarRango = (valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('rango', valor)
    startTransition(() => router.push(`/admin?${params.toString()}`))
  }

  return (
    <select
      value={rango}
      onChange={e => cambiarRango(e.target.value)}
      disabled={isPending}
      className="bg-surface border border-surface-variant rounded-lg text-sm text-on-surface px-4 py-2 focus:outline-none focus:border-primary disabled:opacity-60 transition-colors"
    >
      {OPCIONES.map(o => (
        <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
      ))}
    </select>
  )
}
