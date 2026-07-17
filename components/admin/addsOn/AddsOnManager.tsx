'use client'

import { useState, useTransition } from 'react'
import { crearAddon, actualizarAddon, eliminarAddon } from '@/modules/addsOn/actions'

interface Addon { id: number; name: string; price: number }
interface FormAddon { nombre: string; precio: string }

const FORM_VACIO: FormAddon = { nombre: '', precio: '' }

// Gestor CRUD de complementos y adiciones del menú
export function AddsOnManager({ addons }: { addons: Addon[] }) {
  const [modo, setModo] = useState<'lista' | 'crear' | 'editar'>('lista')
  const [editando, setEditando] = useState<Addon | null>(null)
  const [form, setForm] = useState<FormAddon>(FORM_VACIO)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const abrirCrear = () => { setForm(FORM_VACIO); setEditando(null); setErrorMsg(null); setModo('crear') }
  const abrirEditar = (a: Addon) => {
    setForm({ nombre: a.name, precio: String(a.price) })
    setEditando(a); setErrorMsg(null); setModo('editar')
  }
  const cancelar = () => { setModo('lista'); setEditando(null); setForm(FORM_VACIO); setErrorMsg(null) }

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const precio = parseFloat(form.precio)
    if (!form.nombre.trim()) { setErrorMsg('El nombre es requerido'); return }
    if (isNaN(precio) || precio < 0) { setErrorMsg('El precio debe ser un número válido'); return }
    setErrorMsg(null)
    startTransition(async () => {
      const result = modo === 'crear'
        ? await crearAddon({ nombre: form.nombre.trim(), precio })
        : await actualizarAddon(editando!.id, { nombre: form.nombre.trim(), precio })
      if (result?.error) setErrorMsg(result.error)
      else cancelar()
    })
  }

  const handleEliminar = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el complemento "${nombre}"?`)) return
    startTransition(async () => {
      const result = await eliminarAddon(id)
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
          <h2 className="font-display font-bold text-2xl text-on-surface">Complementos y Adiciones</h2>
        )}
        <div className="flex items-center gap-3">
          {modo !== 'lista' && (
            <h2 className="font-display font-semibold text-lg text-on-surface">
              {modo === 'crear' ? 'Nuevo Complemento' : `Editar: ${editando?.name}`}
            </h2>
          )}
          {modo === 'lista' && (
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nuevo Complemento
            </button>
          )}
        </div>
      </div>

      {/* Formulario crear / editar */}
      {(modo === 'crear' || modo === 'editar') && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Salsa BBQ, Queso extra, Papas..."
              className={input}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Precio ($)</label>
            <input
              type="number"
              value={form.precio}
              onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              min="0"
              step="100"
              placeholder="0"
              className={input}
            />
          </div>
          {errorMsg && (
            <p className="sm:col-span-2 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorMsg}</p>
          )}
          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={isPending}
              className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de complementos */}
      {modo === 'lista' && (
        <>
          {errorMsg && (
            <p className="text-error text-sm bg-error-container px-3 py-2 rounded-lg mb-4">{errorMsg}</p>
          )}
          {addons.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline block mx-auto mb-3">tune</span>
              <p className="text-on-surface-variant text-sm">No hay complementos creados</p>
              <p className="text-xs text-outline mt-1">Agrega salsas, quesos, adiciones y variaciones del menú</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden shadow-sm">
              {/* Tabla desktop */}
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low/50">
                    {['Complemento', 'Precio', 'Acciones'].map(h => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide ${h === 'Acciones' ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {addons.map(a => (
                    <tr key={a.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
                          </div>
                          <span className="text-on-surface font-medium">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-display font-bold text-primary">
                          {a.price === 0
                            ? <span className="text-green-700 text-xs font-semibold uppercase tracking-wide">Gratis</span>
                            : `$${a.price.toLocaleString('es-CO')}`
                          }
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(a)}
                            disabled={isPending}
                            className="text-xs border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(a.id, a.name)}
                            disabled={isPending}
                            className="text-xs bg-error-container text-error hover:bg-error/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tarjetas móvil */}
              <div className="sm:hidden divide-y divide-surface-variant">
                {addons.map(a => (
                  <div key={a.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-medium truncate">{a.name}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">
                        {a.price === 0 ? 'Gratis' : `$${a.price.toLocaleString('es-CO')}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => abrirEditar(a)}
                        className="text-xs border border-surface-variant text-on-surface-variant px-3 py-1.5 rounded-lg"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(a.id, a.name)}
                        className="text-xs bg-error-container text-error px-3 py-1.5 rounded-lg"
                      >
                        Eliminar
                      </button>
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
