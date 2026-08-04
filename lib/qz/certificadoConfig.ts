// Configuración de Certificados para QZ Tray
import fs from 'fs'
import path from 'path'

let certificadoPrivadoEnMemoria: string | null = null
let certificadoPublicoEnMemoria: string | null = null

const cargarCertificadoPrivado = (): string => {
  if (certificadoPrivadoEnMemoria) {
    return certificadoPrivadoEnMemoria
  }

  const keyB64 = process.env.QZ_PRIVATE_KEY_B64
  if (keyB64) {
    certificadoPrivadoEnMemoria = Buffer.from(keyB64, 'base64').toString('utf-8')
    return certificadoPrivadoEnMemoria
  }

  try {
    const rutaCertificado = path.join(process.cwd(), 'app/api/qz/sign/private-key.pem')
    if (fs.existsSync(rutaCertificado)) {
      certificadoPrivadoEnMemoria = fs.readFileSync(rutaCertificado, 'utf-8')
      return certificadoPrivadoEnMemoria
    }
  } catch (error) {
    console.warn('[QZ Config] No se pudo cargar certificado privado desde archivo:', error)
  }

  throw new Error(
    'No se pudo cargar QZ_PRIVATE_KEY_B64 desde variables de entorno ni encontrar archivo de clave privada'
  )
}

const cargarCertificadoPublico = (): string => {
  if (certificadoPublicoEnMemoria) {
    return certificadoPublicoEnMemoria
  }

  const certB64 = process.env.QZ_CERTIFICATE_B64
  if (certB64) {
    certificadoPublicoEnMemoria = Buffer.from(certB64, 'base64').toString('utf-8')
    return certificadoPublicoEnMemoria
  }

  try {
    const rutaCertificado = path.join(process.cwd(), 'public/qz-certificate.pem')
    if (fs.existsSync(rutaCertificado)) {
      certificadoPublicoEnMemoria = fs.readFileSync(rutaCertificado, 'utf-8')
      return certificadoPublicoEnMemoria
    }
  } catch (error) {
    console.warn('[QZ Config] No se pudo cargar certificado público desde archivo:', error)
  }

  const certificadoPorDefecto = `-----BEGIN CERTIFICATE-----
MIIC0TCCAbmgAwIBAgIBATANBgkqhkiG9w0BAQsFADAsMREwDwYDVQQDEwhRdWVl
blBPUzEXMBUGA1UEChMOUXVlZW4gQnJvYXN0ZXIwHhcNMjYwNjAzMDA1ODQ0WhcN
MzYwNjAzMDA1ODQ0WjAsMREwDwYDVQQDEwhRdWVlblBPUzEXMBUGA1UEChMOUXVl
ZW4gQnJvYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCn3DH1
rf9Hh0Dy/i93rtZTlFBXbB2dADvnF8cCXUA93u/Y3CMOm653tkgjuCxWperswmHT
9GwEqz9f3ZOYg5zks4xBeFR8frvGd0NXHUTRQtFtyqzyU7MGAbdS8Ouxa9G2WNTR
MU6K552G7NGeAiCy4CF2LjWCVBYD8EmZgr89ZuloU76jM8DSU4vaYif9Y8f5ZuuN
dUU+ZwgtuvDwfO4RWzZ1RmPfeWMV/wUmp0AQeuXefFdupJLVl4GIvv1YVGZ4q7RZ
eXhnFwPCWYMaLwS0FtZeQ5iAXKAJWNO+TZ4jRpaF2GBXRhA/+mHepYZHFT9EP8HL
9P5U13h6EX+ADCIJAgMBAAEwDQYJKoZIhvcNAQELBQADggEBACg5vnlhnkbtz3G6
tsXml+wZQlA6Qty/S0epaTl7RPqjdLzo7z8eH6jUOJRqOxiNVj4K6WJU1tiGtbP0
ZrVy01yFqiV1YSuVYDFX7hr9rwVN6DAqlJITLSkK6h3+2FZzoYcBlSzEgDGq4Wmm
CVta5pqO+js8d9+I3Um1Y1iBVvbX2wHvZQvY0N6LkIpn559nw4rvKmiMo768cCCh
Z+2Nptwajc2E9gTKglGjb1Ke+zMTljAGCHQDMKvzW9ABv5pc9iCVAB3M7JK2bN4r
ixFShwvptzPRWh0KcJyMuA9rGDd4now5oqmsNLbbsB+IqL5VnMYm/McdXIiD7y0F
L4R+k4A=
-----END CERTIFICATE-----`

  certificadoPublicoEnMemoria = certificadoPorDefecto
  return certificadoPorDefecto
}

export { cargarCertificadoPrivado, cargarCertificadoPublico }
