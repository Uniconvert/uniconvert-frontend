import { apiRequest } from './client'
const cache = new Map<string, Promise<unknown>>()
export function cachedApiRequest<T>(path: string) {
  const current = cache.get(path)
  if (current) return current as Promise<T>
  const request = apiRequest<T>(path).catch((error: unknown) => {
    if (cache.get(path) === request) cache.delete(path)
    throw error
  })
  cache.set(path, request)
  window.setTimeout(() => cache.delete(path), 60_000)
  return request
}
