'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearProducto, actualizarProducto, eliminarProducto, crearCategoria } from '@/modules/productos/actions'

interface Categoria { id: number; name: string }
interface Producto { id: number; name: string; sku: number | null; price: number; cost: number; description: string | null; category_id: number | null; stock: number; cook: boolean; image_url: string | null }
interface FormProducto { nombre: string; sku: string; precio: string; costo: string; descripcion: string; categoriaId: string; stock: string; cocina: boolean; imagen: string }

const FORM_VACIO: FormProducto = { nombre: '', sku: '', precio: '', costo: '', descripcion: '', categoriaId: '', stock: '0', cocina: false, imagen: '' }

const IMAGENES_PRODUCTOS = [
  { archivo: '/products/broaster-one.png', etiqueta: 'Broaster' },
  { archivo: '/products/chicken.png', etiqueta: 'Pollo' },
  { archivo: '/products/burguer.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/burguer-02.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/burguer-03.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/burguer-04.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/burguer-05.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/burguer-07.png', etiqueta: 'Hamburguesa' },
  { archivo: '/products/bebidas.png', etiqueta: 'Bebidas' },
  { archivo: '/products/sodas.png', etiqueta: 'Sodas' },
  { archivo: '/products/lemonade.png', etiqueta: 'Limonada' },
  { archivo: '/products/te.png', etiqueta: 'Te o Aromatica' },
  { archivo: '/products/coffee.png', etiqueta: 'Cafe' },
  { archivo: '/products/beer.png', etiqueta: 'Cerveza' },
  { archivo: '/products/salchipapa.png', etiqueta: 'Salchipapa' },
  { archivo: '/products/salad.png', etiqueta: 'Ensalada' },
  { archivo: '/products/wings.png', etiqueta: 'Wings' },
  { archivo: '/products/wings-02.png', etiqueta: 'Wings' },
  { archivo: '/products/wings-03.png', etiqueta: 'Wings' },
  { archivo: '/products/chuzo.png', etiqueta: 'Chuzo' },
  { archivo: '/products/nuggets.png', etiqueta: 'Nuggets' },
  { archivo: '/products/nuggets-02.png', etiqueta: 'Nuggets' },
  { archivo: '/products/juice.png', etiqueta: 'Jugo' },
  { archivo: '/products/combo.png', etiqueta: 'Combo' },
]

// Gestor CRUD de productos del restaurante
export function ProductosManager({ productos, categorias }: { productos: Producto[]; categorias: Categoria[] }) {
  const router = useRouter()
  const [modo, setModo] = useState<'lista' | 'crear' | 'editar'>('lista')
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState<FormProducto>(FORM_VACIO)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [mostrarFormCat, setMostrarFormCat] = useState(false)
  const [errorCategoria, setErrorCategoria] = useState<string | null>(null)

  const abrirCrear = () => { setForm(FORM_VACIO); setEditando(null); setErrorMsg(null); setModo('crear') }
  const abrirEditar = (p: Producto) => {
    setForm({ nombre: p.name, sku: p.sku ? String(p.sku) : '', precio: String(p.price), costo: String(p.cost), descripcion: p.description || '', categoriaId: p.category_id ? String(p.category_id) : '', stock: String(p.stock), cocina: p.cook, imagen: p.image_url || '' })
    setEditando(p); setErrorMsg(null); setModo('editar')
  }
  const cancelar = () => { setModo('lista'); setEditando(null); setForm(FORM_VACIO); setErrorMsg(null) }

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const precio = parseFloat(form.precio); const costo = parseFloat(form.costo); const stock = parseInt(form.stock)
    if (!form.nombre.trim() || isNaN(precio) || isNaN(costo) || isNaN(stock)) { setErrorMsg('Nombre, Precio, Costo y Stock son requeridos'); return }
    const datos = { nombre: form.nombre.trim(), sku: form.sku ? Number(form.sku) : null, precio, costo, descripcion: form.descripcion.trim(), categoriaId: form.categoriaId ? parseInt(form.categoriaId) : null, stock, cocina: form.cocina, imagen: form.imagen || null }
    setErrorMsg(null)
    startTransition(async () => {
      const result = modo === 'crear' ? await crearProducto(datos) : await actualizarProducto(editando!.id, datos)
      if (result?.error) setErrorMsg(result.error)
      else cancelar()
    })
  }

  const handleEliminar = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    startTransition(async () => { const result = await eliminarProducto(id); if (result?.error) setErrorMsg(result.error) })
  }

  const handleCrearCategoria = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!nuevaCategoria.trim()) return
    setErrorCategoria(null)
    startTransition(async () => {
      const result = await crearCategoria(nuevaCategoria.trim())
      if (result?.error) {
        setErrorCategoria(result.error)
      } else {
        setNuevaCategoria('')
        setMostrarFormCat(false)
        router.refresh()
      }
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
          <h2 className="font-display font-bold text-2xl text-on-surface">Productos</h2>
        )}
        <div className="flex items-center gap-2">
          {modo !== 'lista' && <h2 className="font-display font-semibold text-lg text-on-surface">{modo === 'crear' ? 'Nuevo Producto' : `Editar: ${editando?.name}`}</h2>}
          {modo === 'lista' && (
            <>
              <button onClick={() => setMostrarFormCat(v => !v)} className="text-sm border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-2 rounded-lg transition-colors">
                + Categoría
              </button>
              <button onClick={abrirCrear} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nuevo Producto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulario de categoría */}
      {mostrarFormCat && modo === 'lista' && (
        <form onSubmit={handleCrearCategoria} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-4 mb-4 shadow-sm">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nueva Categoría</label>
              <input type="text" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Pollos, Bebidas, Acompañamientos..." className={input} autoFocus />
            </div>
            <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">Agregar</button>
            <button type="button" onClick={() => { setMostrarFormCat(false); setErrorCategoria(null) }} className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
          {errorCategoria && <p className="mt-2 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorCategoria}</p>}
          {categorias.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categorias.map(c => <span key={c.id} className="text-xs bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full border border-surface-variant">{c.name}</span>)}
            </div>
          )}
        </form>
      )}

      {/* Formulario de producto */}
      {(modo === 'crear' || modo === 'editar') && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-surface-variant p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 shadow-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Nombre *</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Pollo Broaster" className={input} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">SKU</label>
            <input type="number" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="001" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Precio *</label>
            <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="15000" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Costo *</label>
            <input type="number" step="0.01" min="0" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="8000" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Stock *</label>
            <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Categoría</label>
            <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))} className={input}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">Descripción</label>
            <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del producto..." className={input} />
          </div>
          {/* Selector de imagen del producto */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wide">Imagen del Producto</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {IMAGENES_PRODUCTOS.map(img => (
                <button
                  key={img.archivo}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, imagen: f.imagen === img.archivo ? '' : img.archivo }))}
                  className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all ${form.imagen === img.archivo ? 'border-primary ring-2 ring-primary/30' : 'border-surface-variant hover:border-outline'}`}
                >
                  <img src={img.archivo} alt={img.etiqueta} className="w-full h-full object-cover" />
                  {form.imagen === img.archivo && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {form.imagen && (
              <button type="button" onClick={() => setForm(f => ({ ...f, imagen: '' }))} className="mt-2 text-xs text-on-surface-variant hover:text-error transition-colors">
                Quitar imagen
              </button>
            )}
          </div>
          {/* Toggle Cocina */}
          <div className="flex items-center gap-3 pt-4 lg:pt-0 lg:items-end">
            <label className="relative inline-flex items-center cursor-pointer gap-3">
              <div className="relative">
                <input type="checkbox" checked={form.cocina} onChange={e => setForm(f => ({ ...f, cocina: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-on-surface">Va a Cocina</span>
            </label>
          </div>
          {errorMsg && <p className="sm:col-span-2 lg:col-span-3 text-error text-sm bg-error-container px-3 py-2 rounded-lg">{errorMsg}</p>}
          <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
            <button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-semibold px-6 py-2 rounded-lg text-sm transition-colors">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelar} disabled={isPending} className="border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-6 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de productos */}
      {modo === 'lista' && (
        <>
          {errorMsg && <p className="text-error text-sm bg-error-container px-3 py-2 rounded-lg mb-4">{errorMsg}</p>}
          {productos.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline block mx-auto mb-3">fastfood</span>
              <p className="text-on-surface-variant text-sm">No hay productos creados</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden shadow-sm">
              <table className="w-full hidden lg:table">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-low/50">
                    {['Nombre', 'Precio', 'Costo', 'Stock', 'Categoría', 'Cocina', 'Acciones'].map(h => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {productos.map(p => (
                    <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-surface-variant shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-container border border-surface-variant shrink-0 flex items-center justify-center">
                              <span className="material-symbols-outlined text-outline text-[18px]">fastfood</span>
                            </div>
                          )}
                          <div>
                            <p className="text-on-surface font-medium">{p.name}</p>
                            {p.sku && <p className="text-on-surface-variant text-xs">SKU: {p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-display font-bold text-primary">${p.price.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant">${p.cost.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-on-surface">{p.stock}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant text-sm">{categorias.find(c => c.id === p.category_id)?.name ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${p.cook ? 'bg-secondary-container/40 text-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                          {p.cook ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirEditar(p)} disabled={isPending} className="text-xs border border-surface-variant text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                          <button onClick={() => handleEliminar(p.id, p.name)} disabled={isPending} className="text-xs bg-error-container text-error hover:bg-error/20 px-3 py-1.5 rounded-lg transition-colors">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="lg:hidden divide-y divide-surface-variant">
                {productos.map(p => (
                  <div key={p.id} className="p-4 flex items-start gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-surface-variant shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-container border border-surface-variant shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-[20px]">fastfood</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-medium">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="font-display font-bold text-primary text-sm">${p.price.toLocaleString()}</span>
                        <span className="text-on-surface-variant text-xs">Stock: {p.stock}</span>
                        {categorias.find(c => c.id === p.category_id)?.name && <span className="text-on-surface-variant text-xs">{categorias.find(c => c.id === p.category_id)?.name}</span>}
                        {p.cook && <span className="text-xs bg-secondary-container/40 text-secondary px-2 py-0.5 rounded-full">Cocina</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => abrirEditar(p)} className="text-xs border border-surface-variant text-on-surface-variant px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => handleEliminar(p.id, p.name)} className="text-xs bg-error-container text-error px-3 py-1.5 rounded-lg">Eliminar</button>
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
