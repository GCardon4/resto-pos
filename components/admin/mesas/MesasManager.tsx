'use client'

import { useState, useTransition } from 'react'
import { crearMesa, actualizarMesa, eliminarMesa } from '@/modules/mesas/actions'

interface Mesa { id: number; name: string; number: number; status: boolean }
interface FormMesa { nombre: string; numero: string; estado: boolean }

const FORM_VACIO: FormMesa = { nombre: '', numero: '', estado: false }

// Gestor CRUD de mesas del restaurante
export function MesasManager({ mesas }: { mesas: Mesa[] }) {
  const [modo, setModo] = useState<'lista' | 'crear' | 'editar'>('lista')
  const [editando, setEditando] = useState<Mesa | null>(null)
  const [form, setForm] = useState<FormMesa>(FORM_VACIO)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const abrirCrear = () => { setForm(FORM_VACIO); setEditando(null); setErrorMsg(null); setModo('crear') }
  const abrirEditar = (m: Mesa) => {
    setForm({ nombre: m.name, numero: String(m.number), estado: m.status })
    setEditando(m); setErrorMsg(null); setModo('editar')
  }
  const cancelar = () => { setModo('lista'); setEditando(null); setForm(FORM_VACIO); setErrorMsg(null) }

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const numero = parseInt(form.numero)
    if (!form.nombre.trim() || isNaN(numero) || numero < 1) { setErrorMsg('Nombre y número son requeridos'); return }
    setErrorMsg(null)
    startTransition(async () => {
      const result = modo === 'crear'
        ? await crearMesa({ nombre: form.nombre.trim(), numero })
        : await actualizarMesa(editando!.id, { nombre: form.nombre.trim(), numero, estado: form.estado })
      if (result?.error) setErrorMsg(result.error)
      else cancelar()
    })
  }

  const handleEliminar = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la mesa "${nombre}"?`)) return
    startTransition(async () => {
      const result = await eliminarMesa(id)
      if (result?.error) setErrorMsg(result.error)
    })
  }

  const input = 'w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant text-on-surface rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline'

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        {modo !== 'lista' ? (
          <button onClick={cancelar} className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver
          </button>
        ) : (
          <h2 className="font-display font-bold text-2xl text-on-surface">Mesas</h2>
        )}
        <div className="flex items-center gap-3">
          {modo !== 'lista' && (
            <h2 className="font-display font-semibold text-lg text-on-surface">
              {modo === 'crear' ? 'Nueva Mesa' : `Editar: ${editando?.name}`}
            </h2>
          )}
          {modo === 'lista' && (
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nueva Mesa
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {(modo === 'crear' || modo === 'editar') && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nombre</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Mesa Principal" className={input} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Número</label>
            <input type="number" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} min="1" placeholder="1" className={input} />
          </div>
          {modo === 'editar' && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Estado</label>
              <select value={form.estado ? '1' : '0'} onChange={e => setForm(f => ({ ...f, estado: e.target.value === '1' }))} className={input}>
                <option value="0">Disponible</option>
                <option value="1">Ocupada</option>
              </select>
            </div>
          )}
          {errorMsg && <p className="sm:col-span-3 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorMsg}</p>}
          <div className="sm:col-span-3 flex gap-3">
            <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelar} disabled={isPending} className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-6 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {modo === 'lista' && (
        <>
          {errorMsg && <p className="text-error text-sm bg-error-container px-3 py-2 rounded-lg mb-4">{errorMsg}</p>}
          {mesas.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline block mx-auto mb-3">table_restaurant</span>
              <p className="text-on-surface-variant text-sm">No hay mesas creadas</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden shadow-sm">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low/50">
                    {['#', 'Nombre', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {mesas.map(m => (
                    <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-primary font-display">{m.number}</td>
                      <td className="px-5 py-3.5 text-on-surface">{m.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.status ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status ? 'bg-primary' : 'bg-green-600'}`} />
                          {m.status ? 'Ocupada' : 'Disponible'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirEditar(m)} disabled={isPending} className="text-xs border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors">
                            Editar
                          </button>
                          <button onClick={() => handleEliminar(m.id, m.name)} disabled={isPending} className="text-xs bg-error-container text-error hover:bg-error/20 px-3 py-1.5 rounded-lg transition-colors">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sm:hidden divide-y divide-surface-variant">
                {mesas.map(m => (
                  <div key={m.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-display font-bold shrink-0">{m.number}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-medium">{m.name}</p>
                      <span className={`text-xs ${m.status ? 'text-primary' : 'text-green-700'}`}>{m.status ? 'Ocupada' : 'Disponible'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(m)} className="text-xs border border-surface-variant text-on-surface-variant px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => handleEliminar(m.id, m.name)} className="text-xs bg-error-container text-error px-3 py-1.5 rounded-lg">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
