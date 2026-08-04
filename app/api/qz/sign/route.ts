import { NextRequest, NextResponse } from 'next/server'
import { firmadorQZ } from '@/lib/qz/firmador'

// Firma petición para QZ Tray con node-forge
export async function GET(req: NextRequest) {
  const datosAFirmar = req.nextUrl.searchParams.get('request')
  if (!datosAFirmar) {
    return new NextResponse('Falta parámetro request', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  try {
    const resultado = firmadorQZ.firmarPeticion(datosAFirmar)

    if (!resultado.exito || !resultado.firma) {
      console.error('[QZ Sign API] Error de firma:', resultado.error)
      return new NextResponse(`ERROR_FIRMA: ${resultado.error}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return new NextResponse(resultado.firma, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error: any) {
    console.error('[QZ Sign API] Excepción:', error.message)
    return new NextResponse(`ERROR_SISTEMA: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
