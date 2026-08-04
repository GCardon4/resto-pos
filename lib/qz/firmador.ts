// Servicio de Firma Digital con Node-Forge para QZ Tray
import forge from 'node-forge'
import { cargarCertificadoPrivado } from './certificadoConfig'

// Interfaz para resultado de firma
interface ResultadoFirma {
  exito: boolean
  firma?: string
  error?: string
}

const crearFirmador = () => {
  let privateKeyPem: string | null = null
  let privateKey: forge.pki.PrivateKey | null = null

  const inicializarClave = (): forge.pki.PrivateKey => {
    if (privateKey) {
      return privateKey
    }

    if (!privateKeyPem) {
      privateKeyPem = cargarCertificadoPrivado()
    }

    try {
      privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      return privateKey
    } catch (error: any) {
      throw new Error(`Error al parsear la clave privada: ${error.message}`)
    }
  }

  const firmarPeticion = (datosAFirmar: string): ResultadoFirma => {
    try {
      const clave = inicializarClave()

      // Usar signer para evitar problemas de tipos con forge
      const signer = forge.pki.createSigner('sha512', clave as any)
      signer.update(datosAFirmar, 'utf8')
      const firma = signer.sign() as string

      const firmaBase64 = forge.util.encode64(firma)

      return {
        exito: true,
        firma: firmaBase64,
      }
    } catch (error: any) {
      console.error('[QZ Firmador] Error al firmar:', error.message)
      return {
        exito: false,
        error: error.message,
      }
    }
  }

  return {
    firmarPeticion,
  }
}

const firmadorQZ = crearFirmador()

export { firmadorQZ, type ResultadoFirma }
