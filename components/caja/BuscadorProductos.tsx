'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface BuscadorProductosProps {
  value: string
  onChange: (value: string) => void
  esDomicilio?: boolean
}

// Buscador de productos con reconocimiento de voz (Web Speech API)
export function BuscadorProductos({ value, onChange, esDomicilio }: BuscadorProductosProps) {
  const [escuchando, setEscuchando] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reconRef = useRef<any>(null)

  const toggleVoz = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SR) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    if (escuchando) {
      reconRef.current?.stop()
      return
    }

    const rec = new SR()
    rec.lang = 'es-CO'
    rec.interimResults = true
    rec.continuous = false

    rec.onstart = () => setEscuchando(true)
    rec.onend = () => setEscuchando(false)
    rec.onerror = () => setEscuchando(false)
    rec.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const texto = Object.values(e.results)
        .map(r => r[0].transcript)
        .join('')
      onChange(texto)
    }

    reconRef.current = rec
    rec.start()
  }, [escuchando, onChange])

  useEffect(() => {
    return () => { reconRef.current?.stop() }
  }, [])

  const focusColor = esDomicilio
    ? 'focus:ring-tertiary focus:border-tertiary'
    : 'focus:ring-primary focus:border-primary'

  return (
    <div className="relative w-60">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
        search
      </span>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar producto..."
        className={`w-full pl-9 pr-10 py-2 bg-surface-container-low border border-surface-variant rounded-full text-sm focus:ring-2 ${focusColor} outline-none transition-all`}
      />

      <button
        type="button"
        onClick={toggleVoz}
        title={escuchando ? 'Detener escucha' : 'Buscar por voz'}
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-all ${
          escuchando ? 'text-error animate-pulse' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {escuchando ? 'mic' : 'mic_none'}
        </span>
      </button>
    </div>
  )
}
