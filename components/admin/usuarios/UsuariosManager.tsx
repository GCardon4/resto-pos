'use client'

import { useState, useTransition } from 'react'
import { actualizarUsuario, crearUsuario, eliminarUsuario } from '@/modules/usuarios/actions'

interface Rol { id: number; name: string }
interface Usuario { id: string; full_name: string | null; email: string | null; role_id: number | null }

const ETIQUETA_ROL: Record<number, string> = { 1: 'Administrador', 2: 'Cajero', 3: 'Cocina' }
const COLOR_ROL: Record<number, string> = {
  1: 'bg-secondary-container/40 text-secondary',
  2: 'bg-green-100 text-green-700',
  3: 'bg-tertiary-container/60 text-tertiary',
}

interface FormCrear { nombreCompleto: string; email: string; password: string; confirmPassword: string; roleId: string }
interface FormEditar { nombreCompleto: string; roleId: string }

const FORM_CREAR_VACIO: FormCrear = { nombreCompleto: '', email: '', password: '', confirmPassword: '', roleId: '' }

// Gestor CRUD de usuarios del sistema
export function UsuariosManager({ usuarios, roles }: { usuarios: Usuario[]; roles: Rol[] }) {
  const [modo, setModo] = useState<'lista' | 'crear' | 'editar'>('lista')
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [formEditar, setFormEditar] = useState<FormEditar>({ nombreCompleto: '', roleId: '' })
  const [formCrear, setFormCrear] = useState<FormCrear>(FORM_CREAR_VACIO)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const abrirCrear = () => { setFormCrear(FORM_CREAR_VACIO); setErrorMsg(null); setModo('crear') }
  const abrirEditar = (u: Usuario) => {
    setFormEditar({ nombreCompleto: u.full_name || '', roleId: String(u.role_id || '') })
    setEditando(u); setErrorMsg(null); setModo('editar')
  }
  const cancelar = () => { setModo('lista'); setEditando(null); setFormEditar({ nombreCompleto: '', roleId: '' }); setFormCrear(FORM_CREAR_VACIO); setErrorMsg(null) }

  const handleCrear = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!formCrear.nombreCompleto.trim()) { setErrorMsg('El nombre es requerido'); return }
    if (!formCrear.email.trim()) { setErrorMsg('El correo es requerido'); return }
    if (formCrear.password.length < 8) { setErrorMsg('La contraseña debe tener mínimo 8 caracteres'); return }
    if (formCrear.password !== formCrear.confirmPassword) { setErrorMsg('Las contraseñas no coinciden'); return }
    if (!formCrear.roleId) { setErrorMsg('Selecciona un rol'); return }
    setErrorMsg(null)
    startTransition(async () => {
      const result = await crearUsuario({ nombreCompleto: formCrear.nombreCompleto.trim(), email: formCrear.email.trim(), password: formCrear.password, roleId: parseInt(formCrear.roleId) })
      if (result?.error) setErrorMsg(result.error)
      else cancelar()
    })
  }

  const handleEditar = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!formEditar.nombreCompleto.trim() || !formEditar.roleId) { setErrorMsg('Nombre y rol son requeridos'); return }
    setErrorMsg(null)
    startTransition(async () => {
      const result = await actualizarUsuario(editando!.id, { nombreCompleto: formEditar.nombreCompleto.trim(), roleId: parseInt(formEditar.roleId) })
      if (result?.error) setErrorMsg(result.error)
      else cancelar()
    })
  }

  const handleEliminar = (u: Usuario) => {
    if (!confirm(`¿Eliminar a "${u.full_name || u.email}"?`)) return
    startTransition(async () => {
      const result = await eliminarUsuario(u.id)
      if (result?.error) setErrorMsg(result.error)
    })
  }

  const input = 'w-full px-3 py-2.5 bg-surface-container-low border border-surface-variant text-on-surface rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline'
  const inicialNombre = (u: Usuario) => ((u.full_name || u.email || '?')[0] ?? '?').toUpperCase()

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
          <h2 className="font-display font-bold text-2xl text-on-surface">Usuarios</h2>
        )}
        <div className="flex items-center gap-3">
          {modo !== 'lista' && <h2 className="font-display font-semibold text-lg text-on-surface">{modo === 'crear' ? 'Nuevo Usuario' : `Editar: ${editando?.full_name || editando?.email}`}</h2>}
          {modo === 'lista' && (
            <button onClick={abrirCrear} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Formulario de creación */}
      {modo === 'crear' && (
        <form onSubmit={handleCrear} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nombre Completo *</label>
            <input type="text" value={formCrear.nombreCompleto} onChange={e => setFormCrear(f => ({ ...f, nombreCompleto: e.target.value }))} placeholder="Juan García" className={input} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Correo Electrónico *</label>
            <input type="email" value={formCrear.email} onChange={e => setFormCrear(f => ({ ...f, email: e.target.value }))} placeholder="cajero@queenbroaster.com" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Contraseña *</label>
            <input type="password" value={formCrear.password} onChange={e => setFormCrear(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Confirmar Contraseña *</label>
            <input type="password" value={formCrear.confirmPassword} onChange={e => setFormCrear(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repetir contraseña" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Rol *</label>
            <select value={formCrear.roleId} onChange={e => setFormCrear(f => ({ ...f, roleId: e.target.value }))} className={input}>
              <option value="">Seleccionar rol...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{ETIQUETA_ROL[r.id] || r.name}</option>)}
            </select>
          </div>
          {errorMsg && <p className="sm:col-span-2 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorMsg}</p>}
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
              {isPending ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button type="button" onClick={cancelar} disabled={isPending} className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-6 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Formulario de edición */}
      {modo === 'editar' && editando && (
        <form onSubmit={handleEditar} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-5 mb-6 shadow-sm">
          <p className="text-xs text-on-surface-variant mb-4">{editando.email}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nombre Completo</label>
              <input type="text" value={formEditar.nombreCompleto} onChange={e => setFormEditar(f => ({ ...f, nombreCompleto: e.target.value }))} placeholder="Juan García" className={input} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Rol</label>
              <select value={formEditar.roleId} onChange={e => setFormEditar(f => ({ ...f, roleId: e.target.value }))} className={input}>
                <option value="">Seleccionar rol...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{ETIQUETA_ROL[r.id] || r.name}</option>)}
              </select>
            </div>
            {errorMsg && <p className="sm:col-span-2 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorMsg}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={cancelar} disabled={isPending} className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-6 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Mensaje de error global en lista */}
      {modo === 'lista' && errorMsg && <p className="text-error text-sm bg-error-container px-3 py-2 rounded-lg mb-4">{errorMsg}</p>}

      {/* Lista de usuarios */}
      {modo === 'lista' && (
        <>
          {usuarios.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline block mx-auto mb-3">group</span>
              <p className="text-on-surface-variant text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden shadow-sm">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low/50">
                    {['Nombre', 'Email', 'Rol', 'Acciones'].map(h => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5">{u.full_name ? <span className="text-on-surface">{u.full_name}</span> : <span className="text-on-surface-variant italic text-sm">Sin nombre</span>}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant text-sm">{u.email}</td>
                      <td className="px-5 py-3.5">
                        {u.role_id ? (
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${COLOR_ROL[u.role_id] ?? 'bg-surface-container text-on-surface-variant'}`}>
                            {ETIQUETA_ROL[u.role_id] ?? `Rol ${u.role_id}`}
                          </span>
                        ) : <span className="text-on-surface-variant text-xs italic">Sin rol</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirEditar(u)} disabled={isPending} className="text-xs border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                          <button onClick={() => handleEliminar(u)} disabled={isPending} className="text-xs bg-error-container text-error hover:bg-error/20 px-3 py-1.5 rounded-lg transition-colors">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sm:hidden divide-y divide-surface-variant">
                {usuarios.map(u => (
                  <div key={u.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface font-bold text-sm shrink-0">{inicialNombre(u)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-medium truncate">{u.full_name || 'Sin nombre'}</p>
                      <p className="text-on-surface-variant text-xs truncate">{u.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => abrirEditar(u)} className="text-xs border border-surface-variant text-on-surface-variant px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => handleEliminar(u)} className="text-xs bg-error-container text-error px-3 py-1.5 rounded-lg">Eliminar</button>
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
