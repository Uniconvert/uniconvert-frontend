import { getAccessToken } from '@/auth/session'
import type { ApiResponse, MockApiResponse } from '@/types/api'

export const isUsingMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'
const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T> | null> {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null

  return response.json() as Promise<ApiResponse<T>>
}

export async function apiRequest<T>(path: string, mockResponse: MockApiResponse<T>, init?: RequestInit): Promise<T> {
  if (isUsingMockApi) return mockResponse.data

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다.')
  }

  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Browser-Language', navigator.language || 'ko-KR')

  const accessToken = getAccessToken()
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${normalizedPath}`, { ...init, headers })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0, 'NETWORK_ERROR')
  }

  const result = await readApiResponse<T>(response)

  if (!response.ok || result?.success === false) {
    throw new ApiError(
      result?.message || `API 요청에 실패했습니다. (${response.status})`,
      response.status,
      result?.code || 'API_ERROR',
    )
  }

  if (!result) return undefined as T
  return result.data
}
