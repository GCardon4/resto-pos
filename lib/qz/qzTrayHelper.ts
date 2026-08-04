// Helper para integración de QZ Tray con firma digital
// Simplifica la configuración y uso de QZ Tray en el frontend

type CallbackFirma = (datosAFirmar: string) => Promise<string>
type CallbackCertificado = () => Promise<string>

interface ConfiguracionQZTray {
  urlServidor?: string
  timeoutMs?: number
}

interface ResultadoConexion {
  conectado: boolean
  error?: string
  version?: string
}

interface ResultadoImpresion {
  exito: boolean
  error?: string
}

const crearHelperQZ = (config: ConfiguracionQZTray = {}) => {
  const {
    urlServidor = typeof window !== 'undefined' ? window.location.origin : '',
    timeoutMs = 5000
  } = config

  let qzConectado = false
  let moduloQZCache: any = null

  const obtenerModuloQZ = async () => {
    if (moduloQZCache) {
      return moduloQZCache
    }

    if (typeof window === 'undefined') {
      throw new Error('QZ Tray solo funciona en el navegador')
    }

    // Importar QZ Tray desde el CDN o módulo instalado
    try {
      // Si está disponible globalmente
      if ((window as any).qz) {
        moduloQZCache = (window as any).qz
        return moduloQZCache
      }

      // Intenta importar del módulo instalado
      const qzTray = await import('qz-tray')
      moduloQZCache = qzTray.default || qzTray
      return moduloQZCache
    } catch (error) {
      throw new Error('No se pudo cargar el módulo QZ Tray. Asegúrate de que esté instalado.')
    }
  }

  const obtenerCertificado: CallbackCertificado = async () => {
    try {
      const respuesta = await fetch(`${urlServidor}/api/qz/certificate`, {
        timeout: timeoutMs
      })

      if (!respuesta.ok) {
        throw new Error(`Error ${respuesta.status} al obtener certificado`)
      }

      return await respuesta.text()
    } catch (error: any) {
      console.error('[QZ Helper] Error al obtener certificado:', error.message)
      throw error
    }
  }

  const firmarPeticion: CallbackFirma = async (datosAFirmar: string) => {
    try {
      const urlCodificada = `${urlServidor}/api/qz/sign?request=${encodeURIComponent(datosAFirmar)}`
      const respuesta = await fetch(urlCodificada, {
        method: 'GET',
        timeout: timeoutMs
      })

      if (!respuesta.ok) {
        const errorTexto = await respuesta.text()
        throw new Error(`Error ${respuesta.status}: ${errorTexto}`)
      }

      return await respuesta.text()
    } catch (error: any) {
      console.error('[QZ Helper] Error al firmar petición:', error.message)
      throw error
    }
  }

  const configurarSeguridad = async (qz: any): Promise<void> => {
    const certificado = await obtenerCertificado()
    qz.api.setSecurity(
      () => Promise.resolve(certificado),
      (datosAFirmar: string) => firmarPeticion(datosAFirmar)
    )
  }

  const conectarQZ = async (): Promise<ResultadoConexion> => {
    try {
      const qz = await obtenerModuloQZ()

      // Configurar seguridad primero
      await configurarSeguridad(qz)

      // Conectar al websocket de QZ Tray
      await Promise.race([
        qz.websocket.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout conectando a QZ Tray')), timeoutMs)
        )
      ])

      qzConectado = true
      const version = await qz.api.getVersion()

      console.log('[QZ Helper] ✅ Conectado a QZ Tray v' + version)
      return {
        conectado: true,
        version
      }
    } catch (error: any) {
      console.error('[QZ Helper] ❌ Error al conectar:', error.message)
      qzConectado = false
      return {
        conectado: false,
        error: error.message
      }
    }
  }

  const desconectarQZ = async (): Promise<void> => {
    try {
      const qz = await obtenerModuloQZ()
      if (qz && qz.websocket) {
        await qz.websocket.disconnect()
        qzConectado = false
        console.log('[QZ Helper] Desconectado de QZ Tray')
      }
    } catch (error: any) {
      console.warn('[QZ Helper] Error al desconectar:', error.message)
    }
  }

  const imprimirEtiqueta = async (
    nombreImpresora: string,
    datosImpresion: any
  ): Promise<ResultadoImpresion> => {
    try {
      const qz = await obtenerModuloQZ()

      // Conectar si no está conectado
      if (!qzConectado) {
        const resultado = await conectarQZ()
        if (!resultado.conectado) {
          return {
            exito: false,
            error: 'No se pudo conectar a QZ Tray: ' + resultado.error
          }
        }
      }

      // Crear configuración de impresión
      const config = qz.configs.create(nombreImpresora)

      // Renderizar etiqueta (asume que datosImpresion tiene el formato correcto)
      const etiqueta = qz.render.label(datosImpresion)

      // Enviar a impresión
      await qz.print(config, etiqueta)

      console.log('[QZ Helper] ✅ Impresión enviada a ' + nombreImpresora)
      return { exito: true }
    } catch (error: any) {
      console.error('[QZ Helper] ❌ Error al imprimir:', error.message)
      return {
        exito: false,
        error: error.message
      }
    }
  }

  const obtenerImpresoras = async (): Promise<string[]> => {
    try {
      const qz = await obtenerModuloQZ()

      if (!qzConectado) {
        const resultado = await conectarQZ()
        if (!resultado.conectado) {
          throw new Error('No se pudo conectar a QZ Tray')
        }
      }

      const impresoras = await qz.printers.find()
      return impresoras
    } catch (error: any) {
      console.error('[QZ Helper] Error al obtener impresoras:', error.message)
      return []
    }
  }

  const verificarConexion = async (): Promise<boolean> => {
    try {
      const qz = await obtenerModuloQZ()
      const estado = await qz.websocket.isConnected()
      qzConectado = estado
      return estado
    } catch {
      qzConectado = false
      return false
    }
  }

  return {
    conectarQZ,
    desconectarQZ,
    imprimirEtiqueta,
    obtenerImpresoras,
    verificarConexion,
    estaConectado: () => qzConectado
  }
}

export { crearHelperQZ, type ConfiguracionQZTray, type ResultadoImpresion, type ResultadoConexion }
