# Configuración de QZ Tray con Certificados Digitales

Documentación de la configuración de certificados y firma digital para QZ Tray en Resto-POS.

## Descripción General

QZ Tray es una solución de impresión desde navegadores web a impresoras POS locales. Requiere que todas las peticiones sean firmadas digitalmente para evitar alertas de seguridad y permisos en tiempo de impresión.

La solución usa:
- **Node-Forge**: Para firma digital RSA-SHA512
- **Certificados PEM**: Pares de claves privada/pública
- **API Endpoint**: `/api/qz/sign` para firmar peticiones

## Estructura de Archivos

```
proyecto/
├── app/
│   └── api/
│       └── qz/
│           ├── sign/
│           │   ├── route.ts           # Endpoint de firma
│           │   ├── private-key.pem    # Clave privada (proteger)
│           │   └── digital-certificate.txt
│           └── certificate/
│               └── route.ts           # Endpoint de certificado público
├── lib/
│   └── qz/
│       ├── certificadoConfig.ts       # Carga de certificados
│       └── firmador.ts                # Servicio de firma con node-forge
└── public/
    └── qz-certificate.pem             # Certificado público (se sirve a clientes)
```

## Variables de Entorno Requeridas

Existen dos formas de proporcionar certificados:

### Opción 1: Variables de Entorno (Recomendado en Producción)

```bash
# Clave privada en Base64
QZ_PRIVATE_KEY_B64=<base64-encoded-private-key>

# Certificado público en Base64 (opcional, fallback a archivo)
QZ_CERTIFICATE_B64=<base64-encoded-certificate>
```

Para codificar la clave privada en Base64:

```bash
# En Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content app/api/qz/sign/private-key.pem -Raw))) | Set-Clipboard

# En Linux/Mac
cat app/api/qz/sign/private-key.pem | base64 | pbcopy
```

### Opción 2: Archivos Locales (Desarrollo)

Si no defines variables de entorno, la aplicación buscará:
- Clave privada: `app/api/qz/sign/private-key.pem`
- Certificado público: `public/qz-certificate.pem`

## Configuración en .env.local

```env
# Para desarrollo (no está en git por seguridad)
QZ_PRIVATE_KEY_B64=MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQD0jRMlu0XMyGBOoDWYwin...

# Opcional, si quieres servir certificado público desde env
# QZ_CERTIFICATE_B64=MIIC0TCCAbmgAwIBAgIBATANBgkqhkiG9w0BAQsFADAsMREwDwYDVQQDEwhRdWVl...
```

## Cómo Funciona la Firma

1. **Cliente (Frontend)** - Petición a QZ Tray
   ```javascript
   qz.api.setSecurity(
     function() { /* ... */ },
     function(request) { 
       return window.fetch('/api/qz/sign?request=' + request)
         .then(r => r.text())
     }
   )
   ```

2. **Servidor** - Endpoint de firma
   - Recibe el parámetro `request` (datos sin firmar)
   - Carga la clave privada desde env o archivo
   - Firma con RSA-SHA512 usando Node-Forge
   - Devuelve firma en Base64

3. **Cliente** - Usa firma en petición
   - Incluye la firma en la cabecera `X-Signature`
   - QZ Tray verifica la firma con el certificado público
   - Si la firma es válida, permite la impresión sin alertas

## Generación de Certificados Autofirmados

Si necesitas generar nuevos certificados:

### Con OpenSSL (Recomendado)

```bash
# Generar clave privada
openssl genrsa -out private-key.pem 2048

# Generar certificado autofirmado (10 años)
openssl req -new -x509 -key private-key.pem -out qz-certificate.pem -days 3650 \
  -subj "/CN=QueenPOS/O=Queen Broaster"

# Copiar archivos
cp private-key.pem app/api/qz/sign/private-key.pem
cp qz-certificate.pem public/qz-certificate.pem
```

### Con Node.js (selfsigned)

La dependencia `selfsigned` ya está instalada:

```bash
npm install selfsigned
```

Crear script `scripts/generarCertificadosQZ.js`:

```javascript
const selfsigned = require('selfsigned');
const fs = require('fs');

const attrs = [{ name: 'commonName', value: 'QueenPOS' }];
const pems = selfsigned.generate(attrs, { days: 3650 });

fs.writeFileSync('app/api/qz/sign/private-key.pem', pems.private);
fs.writeFileSync('public/qz-certificate.pem', pems.cert);

console.log('✅ Certificados generados correctamente');
```

Ejecutar: `node scripts/generarCertificadosQZ.js`

## Servicio de Firma (lib/qz/firmador.ts)

El servicio maneja:

- **Carga y caché** de la clave privada
- **Firma RSA-SHA512** con Node-Forge
- **Manejo de errores** y logging
- **Interfaz tipada** con TypeScript

```typescript
import { firmadorQZ } from '@/lib/qz/firmador'

const resultado = firmadorQZ.firmarPeticion(datosAFirmar)
if (resultado.exito) {
  console.log('Firma:', resultado.firma)
} else {
  console.error('Error:', resultado.error)
}
```

## Integración en Frontend

Ejemplo completo de configuración de QZ Tray:

```typescript
// components/qz/QZConfig.ts
import qz from 'qz-tray'

export const configurarQZ = async () => {
  // Cargar certificado público
  const resp = await fetch('/api/qz/certificate')
  const cert = await resp.text()
  
  // Configurar seguridad
  qz.api.setSecurity(
    () => Promise.resolve(cert),
    (request: string) => 
      fetch(`/api/qz/sign?request=${encodeURIComponent(request)}`)
        .then(r => r.text())
  )

  // Conectar a QZ Tray
  return await qz.websocket.connect()
}

export const imprimirConQZ = async (datosImpresion: any) => {
  try {
    await configurarQZ()
    const config = qz.configs.create('POS-80')
    const etiqueta = qz.render.label(datosImpresion)
    await qz.print(config, etiqueta)
    console.log('✅ Impresión exitosa sin alertas')
  } catch (error) {
    console.error('❌ Error de impresión:', error)
  }
}
```

## Troubleshooting

### "QZ_PRIVATE_KEY_B64 no está configurado"

```bash
# Verifica que la variable existe en .env.local
grep QZ_PRIVATE_KEY_B64 .env.local

# Si no existe, encódifica tu clave privada en Base64 y agrégala
```

### "Error al parsear la clave privada"

- Verifica que el formato PEM es válido (debe empezar con `-----BEGIN PRIVATE KEY-----`)
- Asegúrate de usar Base64 válido si la variable de entorno contiene datos codificados
- La clave privada debe corresponderse con el certificado público

### Alertas de permisos aún aparecen

- Verifica que QZ Tray está actualizado a versión 2.2.6 o superior
- Asegúrate de que el certificado está registrado en QZ Tray
- Prueba regenerando los certificados con los comandos anteriores
- Comprueba en los logs del servidor que la firma se está realizando correctamente

### Errores en la firma: "sign is not a function"

- Verifica que node-forge está instalado: `npm list node-forge`
- Revisa que la clave privada se carga correctamente
- Comprueba los logs del servidor para ver detalles del error

## Seguridad

⚠️ **Importante:**
- Nunca commitees `private-key.pem` al repositorio
- Usa variables de entorno en producción (`QZ_PRIVATE_KEY_B64`)
- Protege el archivo `.env.local` (no está en git)
- La clave privada de desarrollo puede ser compartida solo dentro del equipo
- Rota certificados anualmente o cuando cambies de dispositivo de impresión

## Performance y Caché

El servicio `firmador.ts` implementa:
- **Caché en memoria** de la clave privada (se carga una sola vez)
- **Parsing lazy** de la PEM (solo cuando es necesario)
- Cada firma es rápida (~1-2ms con RSA-2048)

Para mediciones: comprueba los logs en la consola del servidor.

## Referencias

- [QZ Tray Documentation](https://qz.io/api)
- [Node-Forge Security](https://github.com/digitalbazaar/forge)
- [PKCS#8 Format](https://tools.ietf.org/html/rfc5208)
