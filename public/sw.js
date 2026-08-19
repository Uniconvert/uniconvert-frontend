const CACHE_NAME = 'uniconvert-app-shell-v1'

function extractAssetUrls(source) {
  const urls = []
  const pattern = /["'`](\/assets\/[^"'`\s)]+)["'`]/g
  let match
  while ((match = pattern.exec(source))) urls.push(match[1])
  return urls
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexResponse = await fetch('/index.html', { cache: 'no-store' })
  if (!indexResponse.ok) throw new Error('Unable to load app shell')

  const indexText = await indexResponse.text()
  await cache.put('/index.html', new Response(indexText, { headers: indexResponse.headers }))
  await cache.put('/', new Response(indexText, { headers: indexResponse.headers }))

  const queue = extractAssetUrls(indexText)
  const visited = new Set()
  while (queue.length) {
    const url = queue.shift()
    if (!url || visited.has(url)) continue
    visited.add(url)
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const responseCopy = response.clone()
      await cache.put(url, responseCopy)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('javascript') || contentType.includes('css')) {
        queue.push(...extractAssetUrls(await response.text()))
      }
    } catch {
      // An optional lazy asset can be fetched again when the app is online.
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell()
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  if (!['script', 'style', 'image', 'font'].includes(request.destination)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
        }
        return response
      }).catch(() => cached ?? Response.error())
    }),
  )
})
