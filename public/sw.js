// Queen POS — Service Worker
// Estrategia: Network-first con fallback a caché (siempre datos frescos en el POS)

const CACHE = 'queen-pos-v1'
const PRECACHE = ['/', '/login', '/offline']

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  // Solo interceptar GET; dejar pasar todo lo demás (POST de server actions, etc.)
  if (event.request.method !== 'GET') return

  // No interceptar requests a Supabase ni APIs externas
  const url = new URL(event.request.url)
  if (url.hostname !== self.location.hostname) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar en caché solo respuestas válidas de páginas/assets estáticos
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
