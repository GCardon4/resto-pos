import type { Metadata, Viewport } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import PWAProvider from "@/components/pwa/PWAProvider";
import './globals.css'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Queen Broaster POS',
  description: 'Sistema de Punto de Venta - Queen Broaster',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QueenPOS',
    startupImage: '/icons/icon-512x512.png',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  themeColor: '#001623',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${inter.variable} h-full antialiased`}>
      <head>
        {/* Capturar beforeinstallprompt antes que React monte — evita que se pierda el evento */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaInstallEvent = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallEvent = e;
            window.dispatchEvent(new Event('pwaInstallReady'));
          });
        `}} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <PWAProvider />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
