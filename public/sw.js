const CACHE_NAME = 'uniconvert-app-shell-v2'

// These resources are app-shell dependencies only. API responses are never
// part of this list or of the runtime cache strategy below.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/fonts/Helvetica.ttc',
  '/fonts/Helvetica(TeX_Gyre_Heros)/texgyreheros-regular.otf',
  '/fonts/Helvetica(TeX_Gyre_Heros)/texgyreheros-bold.otf',
  '/fonts/Pretendard/Pretendard-Regular.woff2',
  '/fonts/Pretendard/Pretendard-Bold.woff2',
]

function extractAssetUrls(source) {
  const urls = []
  const pattern = /["'`](\/(?:assets|fonts)\/[^"'`\s)]+)["'`]/g
  let match
  while ((match = pattern.exec(source))) urls.push(match[1])

  const rootAssetPattern = /["'`](\/(?:favicon-[^"'`\s)]+\.png|favicon\.ico|apple-touch-icon\.png|og-image\.png|manifest\.webmanifest))["'`]/g
  while ((match = rootAssetPattern.exec(source))) urls.push(match[1])
  return urls
}

function isCacheableStaticRequest(request, url) {
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return false
  return ['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)
}

async function cacheStaticAsset(cache, url) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (response.ok) await cache.put(url, response.clone())
    return response
  } catch {
    return null
  }
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexResponse = await fetch('/index.html', { cache: 'no-store' })
  if (!indexResponse.ok) throw new Error('Unable to load app shell')

  const indexText = await indexResponse.text()
  await cache.put('/index.html', new Response(indexText, { headers: indexResponse.headers }))
  await cache.put('/', new Response(indexText, { headers: indexResponse.headers }))

  const queue = [...STATIC_ASSETS, ...extractAssetUrls(indexText)]
  const visited = new Set()
  while (queue.length) {
    const url = queue.shift()
    if (!url || visited.has(url)) continue
    visited.add(url)

    const response = await cacheStaticAsset(cache, url)
    if (!response?.ok) continue

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('javascript') || contentType.includes('css')) {
      queue.push(...extractAssetUrls(await response.text()))
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
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  if (!isCacheableStaticRequest(request, url)) return

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
