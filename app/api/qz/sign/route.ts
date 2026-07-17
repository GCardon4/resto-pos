import { NextRequest, NextResponse } from 'next/server'
import { createSign } from 'crypto'

export async function GET(req: NextRequest) {
  const toSign = req.nextUrl.searchParams.get('request')
  if (!toSign) {
    return new NextResponse('Missing request parameter', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const keyB64 = process.env.QZ_PRIVATE_KEY_B64
  if (!keyB64) {
    console.error('[QZ Sign] QZ_PRIVATE_KEY_B64 no está configurado en las variables de entorno')
    return new NextResponse('ENV_MISSING: QZ_PRIVATE_KEY_B64 no configurado en el servidor', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  try {
    const privateKey = Buffer.from(keyB64, 'base64').toString('utf-8')
    const sign = createSign('RSA-SHA512')
    sign.update(toSign)
    const signature = sign.sign(privateKey, 'base64')
    return new NextResponse(signature, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (e: any) {
    console.error('[QZ Sign] Error al firmar:', e.message)
    return new NextResponse(`SIGN_ERROR: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
