# QZ Tray - Guía Rápida de Inicio

Configuración rápida para usar QZ Tray con firma digital en tu restaurante.

## Paso 1: Configurar Variables de Entorno (2 minutos)

```bash
# Codificar clave privada en Base64
# En PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content app/api/qz/sign/private-key.pem -Raw))) | Set-Clipboard

# Crear .env.local
cp .env.example .env.local

# Pegar el valor en QZ_PRIVATE_KEY_B64 en .env.local
```

**.env.local:**
```env
QZ_PRIVATE_KEY_B64=MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSi...
```

✅ **Listo** - Ya puedes firmar peticiones digitalmente.

## Paso 2: Usar en tu Componente (5 minutos)

```typescript
// pages/impresion.tsx
'use client'

import { crearHelperQZ } from '@/lib/qz'

export default function PaginaImpresion() {
  const qz = crearHelperQZ()

  const imprimirOrden = async () => {
    // Conectar a QZ Tray (primera vez es automática)
    const conexion = await qz.conectarQZ()
    if (!conexion.conectado) {
      alert('❌ No se pudo conectar a QZ Tray: ' + conexion.error)
      return
    }

    // Obtener impresoras disponibles
    const impresoras = await qz.obtenerImpresoras()
    console.log('Impresoras disponibles:', impresoras)

    // Imprimir etiqueta
    const resultado = await qz.imprimirEtiqueta('POS-80', {
      type: 'label',
      format: 'html',
      data: `
        <h1>Orden #001</h1>
        <p>Cliente: Juan Pérez</p>
        <p>Total: $25.50</p>
      `
    })

    if (resultado.exito) {
      alert('✅ Impresión enviada sin alertas de permisos')
    } else {
      alert('❌ Error: ' + resultado.error)
    }
  }

  return (
    <button onClick={imprimirOrden}>
      Imprimir Orden
    </button>
  )
}
```

✅ **Listo** - Tus órdenes se imprimirán sin alertas de permisos.

## Paso 3: Verificar que Funciona

1. **Abre tu aplicación en el navegador**
   ```bash
   npm run dev
   # Abre http://localhost:3000
   ```

2. **Verifica los logs del servidor**
   Deberías ver:
   ```
   [QZ Helper] ✅ Conectado a QZ Tray v2.2.6
   [QZ Helper] ✅ Impresión enviada a POS-80
   ```

3. **Prueba a imprimir**
   - Haz clic en el botón "Imprimir Orden"
   - **Importante**: No deberías ver alertas de permisos
   - La impresora POS-80 debe imprimir la orden

✅ **Todo funciona correctamente**

## ¿Qué sucede internamente?

```
Tu Componente React
        ↓
    crearHelperQZ()
        ↓
    [1] Obtiene el certificado público: GET /api/qz/certificate
    [2] Conecta a QZ Tray
        ↓
    Para cada impresión:
    [3] Envía datos a firmar: GET /api/qz/sign?request=DATOS
        ↓
    En el servidor:
    [4] Lee la clave privada desde QZ_PRIVATE_KEY_B64
    [5] Firma con RSA-SHA512 usando node-forge
    [6] Devuelve firma en Base64
        ↓
    QZ Tray verifica la firma
        ↓
    ✅ Impresión sin alertas
```

## Solucionar Problemas

### "❌ QZ_PRIVATE_KEY_B64 no configurado"

```bash
# 1. Verifica que .env.local existe
ls .env.local

# 2. Verifica que tiene el valor
grep QZ_PRIVATE_KEY_B64 .env.local

# 3. Si falta, re-genera:
# PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content app/api/qz/sign/private-key.pem -Raw))) | Set-Clipboard
# Pégalo en .env.local
```

### "❌ No se pudo conectar a QZ Tray"

1. Verifica que QZ Tray está instalado en tu Windows
2. Asegúrate de que QZ Tray está corriendo
3. Revisa los logs del servidor: `[QZ Helper]` errores

### "❌ Aún aparecen alertas de permisos"

1. Verifica que la firma funciona: revisa logs de `[QZ Sign API]`
2. Actualiza QZ Tray a versión 2.2.6 o superior
3. Regenera los certificados (ver documentación completa)

## Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `lib/qz/qzTrayHelper.ts` | Helper principal para usar QZ Tray |
| `lib/qz/firmador.ts` | Servicio que firma peticiones |
| `lib/qz/certificadoConfig.ts` | Carga de certificados |
| `app/api/qz/sign/route.ts` | Endpoint de firma |
| `app/api/qz/certificate/route.ts` | Endpoint del certificado público |
| `docs/QZ_TRAY_CERTIFICADOS.md` | Documentación completa |

## API Rápida del Helper

```typescript
import { crearHelperQZ } from '@/lib/qz'

const qz = crearHelperQZ()

// Conectar a QZ Tray
const conexion = await qz.conectarQZ()
// Retorna: { conectado: boolean, error?: string, version?: string }

// Desconectar
await qz.desconectarQZ()

// Obtener impresoras
const impresoras = await qz.obtenerImpresoras()
// Retorna: string[]

// Imprimir
const resultado = await qz.imprimirEtiqueta('POS-80', {
  type: 'label',
  format: 'html',
  data: '<h1>Orden</h1>'
})
// Retorna: { exito: boolean, error?: string }

// Verificar conexión
const conectado = await qz.verificarConexion()
// Retorna: boolean
```

## Próximos Pasos

1. ✅ **Configuración básica** (este documento)
2. 📖 **Documentación completa**: `docs/QZ_TRAY_CERTIFICADOS.md`
3. 🔄 **Integración en tu flujo POS**: Adaptar a tus módulos de órdenes
4. 🧪 **Testing**: Prueba con diferentes órdenes y impresoras
5. 🔐 **Producción**: Configura `QZ_PRIVATE_KEY_B64` en tus variables de producción

## Soporte

Si tienes problemas:
1. Revisa los logs del servidor (consola de `npm run dev`)
2. Consulta `docs/QZ_TRAY_CERTIFICADOS.md` - sección Troubleshooting
3. Verifica que QZ Tray está actualizado
