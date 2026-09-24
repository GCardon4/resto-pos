'use server'

import { revalidatePath } from 'next/cache'
import { readdir, writeFile, unlink } from 'fs/promises'
import path from 'path'

const CARPETA_PRODUCTOS = path.join(process.cwd(), 'public', 'products')
const EXTENSIONES_VALIDAS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const TAMANO_MAXIMO = 2 * 1024 * 1024 // 2MB

interface ImagenProducto { archivo: string; etiqueta: string }

// Listar las imágenes disponibles en public/products
export async function listarImagenesProductos(): Promise<ImagenProducto[]> {
  const archivos = await readdir(CARPETA_PRODUCTOS)
  return archivos
    .filter(nombre => EXTENSIONES_VALIDAS.has(path.extname(nombre).toLowerCase()))
    .sort()
    .map(nombre => ({
      archivo: `/products/${nombre}`,
      etiqueta: path.basename(nombre, path.extname(nombre)),
    }))
}

// Subir una nueva imagen de producto (recibida como .webp desde el cliente)
export async function subirImagenProducto(nombre: string, base64: string) {
  const nombreLimpio = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!nombreLimpio) return { error: 'Nombre de imagen inválido' }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > TAMANO_MAXIMO) return { error: 'La imagen supera el tamaño máximo de 2MB' }

  const archivo = `${nombreLimpio}.webp`
  await writeFile(path.join(CARPETA_PRODUCTOS, archivo), buffer)
  revalidatePath('/admin/productos')
  revalidatePath('/caja')
  return { error: null, archivo: `/products/${archivo}` }
}

// Eliminar una imagen de producto de public/products
export async function eliminarImagenProducto(archivo: string) {
  const nombreArchivo = path.basename(archivo)
  if (!EXTENSIONES_VALIDAS.has(path.extname(nombreArchivo).toLowerCase())) {
    return { error: 'Archivo inválido' }
  }
  try {
    await unlink(path.join(CARPETA_PRODUCTOS, nombreArchivo))
  } catch {
    return { error: 'No se pudo eliminar la imagen' }
  }
  revalidatePath('/admin/productos')
  return { error: null }
}
