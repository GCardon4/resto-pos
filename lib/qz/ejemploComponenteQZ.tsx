// Ejemplo de componente React para usar QZ Tray con firma digital
// Este archivo es solo de referencia, adapta según tu proyecto

'use client'

import { useEffect, useState } from 'react'
import { crearHelperQZ, type ResultadoImpresion } from './qzTrayHelper'

const helperQZ = crearHelperQZ({
  urlServidor: typeof window !== 'undefined' ? window.location.origin : '',
  timeoutMs: 5000
})

interface EstadoImpresion {
  imprimiendo: boolean
  impresoras: string[]
  conectado: boolean
  mensajeEstado: string
}

export function ComponenteImpresionPOS() {
  const [estado, setEstado] = useState<EstadoImpresion>({
    imprimiendo: false,
    impresoras: [],
    conectado: false,
    mensajeEstado: 'Cargando...'
  })

  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState<string>('')

  // Inicializar conexión al montar el componente
  useEffect(() => {
    const inicializar = async () => {
      try {
        // Conectar a QZ Tray
        const resultadoConexion = await helperQZ.conectarQZ()

        if (resultadoConexion.conectado) {
          setEstado(prev => ({
            ...prev,
            conectado: true,
            mensajeEstado: `✅ Conectado a QZ Tray v${resultadoConexion.version}`
          }))

          // Obtener lista de impresoras
          const impresoras = await helperQZ.obtenerImpresoras()
          if (impresoras.length > 0) {
            setEstado(prev => ({
              ...prev,
              impresoras,
              mensajeEstado: `✅ ${impresoras.length} impresoras disponibles`
            }))
            setImpresoraSeleccionada(impresoras[0])
          } else {
            setEstado(prev => ({
              ...prev,
              impresoras: [],
              mensajeEstado: '⚠️ No se encontraron impresoras'
            }))
          }
        } else {
          setEstado(prev => ({
            ...prev,
            conectado: false,
            mensajeEstado: `❌ Error: ${resultadoConexion.error}`
          }))
        }
      } catch (error: any) {
        setEstado(prev => ({
          ...prev,
          conectado: false,
          mensajeEstado: `❌ Error al inicializar: ${error.message}`
        }))
      }
    }

    inicializar()

    // Limpiar al desmontar
    return () => {
      helperQZ.desconectarQZ()
    }
  }, [])

  const manejarImpresion = async () => {
    if (!impresoraSeleccionada) {
      setEstado(prev => ({
        ...prev,
        mensajeEstado: '❌ Selecciona una impresora'
      }))
      return
    }

    setEstado(prev => ({
      ...prev,
      imprimiendo: true,
      mensajeEstado: 'Imprimiendo...'
    }))

    try {
      // Ejemplo de datos de impresión (etiqueta)
      const datosImpresion = {
        type: 'label',
        format: 'html',
        data: `
          <h1>Número de Orden: #001</h1>
          <p>Cliente: Juan Pérez</p>
          <p>Total: $25.50</p>
          <hr/>
          <p style="text-align: center; font-weight: bold;">QUEEN BROASTER</p>
        `
      }

      const resultado: ResultadoImpresion = await helperQZ.imprimirEtiqueta(
        impresoraSeleccionada,
        datosImpresion
      )

      if (resultado.exito) {
        setEstado(prev => ({
          ...prev,
          imprimiendo: false,
          mensajeEstado: '✅ Impresión enviada sin alertas'
        }))
      } else {
        setEstado(prev => ({
          ...prev,
          imprimiendo: false,
          mensajeEstado: `❌ Error: ${resultado.error}`
        }))
      }
    } catch (error: any) {
      setEstado(prev => ({
        ...prev,
        imprimiendo: false,
        mensajeEstado: `❌ Error: ${error.message}`
      }))
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Sistema de Impresión POS-80</h2>

      {/* Estado de conexión */}
      <div
        style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: estado.conectado ? '#e8f5e9' : '#ffebee',
          color: estado.conectado ? '#2e7d32' : '#c62828',
          border: `1px solid ${estado.conectado ? '#81c784' : '#e57373'}`
        }}
      >
        {estado.mensajeEstado}
      </div>

      {/* Selector de impresora */}
      {estado.impresoras.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="impresora" style={{ display: 'block', marginBottom: '8px' }}>
            Selecciona impresora:
          </label>
          <select
            id="impresora"
            value={impresoraSeleccionada}
            onChange={e => setImpresoraSeleccionada(e.target.value)}
            style={{
              padding: '8px',
              width: '100%',
              maxWidth: '300px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            {estado.impresoras.map(impresora => (
              <option key={impresora} value={impresora}>
                {impresora}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Botón de impresión */}
      <button
        onClick={manejarImpresion}
        disabled={!estado.conectado || estado.imprimiendo || !impresoraSeleccionada}
        style={{
          padding: '10px 20px',
          backgroundColor: estado.conectado ? '#1976d2' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: estado.conectado ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {estado.imprimiendo ? 'Imprimiendo...' : 'Imprimir Orden'}
      </button>

      {/* Información técnica */}
      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <h3>Información Técnica</h3>
        <ul>
          <li>✅ Firma digital: RSA-SHA512 con node-forge</li>
          <li>✅ Certificados: Cargados desde servidor</li>
          <li>✅ Sin alertas de permisos: Peticiones pre-firmadas</li>
          <li>Impresoras detectadas: {estado.impresoras.length}</li>
        </ul>
      </div>
    </div>
  )
}

// Uso en página:
// import { ComponenteImpresionPOS } from '@/lib/qz/ejemploComponenteQZ'
//
// export default function PaginaOrdenPOS() {
//   return (
//     <div>
//       <ComponenteImpresionPOS />
//     </div>
//   )
// }
