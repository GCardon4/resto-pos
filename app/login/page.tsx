'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { loginAction } from '@/lib/auth/actions'
import type { AuthState } from '@/types'

const estadoInicial: AuthState = { error: null }

// Página de inicio de sesión con imagen corporativa
export default function LoginPage() {
  const [state, accion, cargando] = useActionState(loginAction, estadoInicial)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-red-950/40 to-zinc-950 p-4">
      <div className="w-full max-w-sm">

        {/* Logo corporativo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/logotipo-queen-broaster.svg"
            alt="Queen Broaster"
            width={260}
            height={130}
            priority
            className="drop-shadow-[0_4px_24px_rgba(239,68,68,0.3)]"
          />
        </div>

        {/* Tarjeta de login */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">
            Iniciar Sesión
          </h1>
          <p className="text-zinc-500 text-center text-sm mb-7">
            Accede al sistema POS
          </p>

          <form action={accion} className="flex flex-col gap-4">

            {/* Campo Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="usuario@queenbroaster.com"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm"
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm"
              />
            </div>

            {/* Mensaje de error */}
            {state.error && (
              <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            {/* Botón de ingreso */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-1 w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all text-sm tracking-wide"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-700 text-xs mt-8">
          Queen Broaster POS &copy; {new Date().getFullYear()}
        </p>

      </div>
    </div>
  )
}
