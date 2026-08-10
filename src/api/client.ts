import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSessionTokens,
} from '@/auth/session'
import type { ApiResponse, MockApiResponse } from '@/types/api'

export const isUsingMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

interface ApiRequestOptions extends RequestInit {
  /** 전체 Mock 모드에서도 특정 도메인만 실제 API로 전환할 때 사용합니다. */
  useMock?: boolean
  /** 로그인·토큰 재발급처럼 Authorization 헤더가 필요하지 않은 요청입니다. */
  skipAuth?: boolean
  /** 401 응답에 대한 자동 토큰 재발급 여부입니다. */
  retryOnUnauthorized?: boolean
}

interface ReissueResponse {
  accessToken: string
  refreshToken: string
}

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

function resolveBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'ko-KR'

  const language = (navigator.languages?.[0] || navigator.language || '').toLowerCase()
  if (language.startsWith('ko')) return 'ko-KR'
  if (language.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    'data' in value
  )
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function requireApiBaseUrl() {
  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다.')
  }
  return apiBaseUrl
}

function buildHeaders(init: RequestInit, accessToken?: string | null) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Browser-Language', resolveBrowserLanguage())

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function fetchApi(path: string, init: RequestInit, accessToken?: string | null) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  try {
    return await fetch(`${requireApiBaseUrl()}${normalizedPath}`, {
      ...init,
      headers: buildHeaders(init, accessToken),
    })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0, 'NETWORK_ERROR')
  }
}

let reissuePromise: Promise<string> | null = null

async function reissueAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new ApiError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 401, 'UNAUTHORIZED')
  }

  const response = await fetchApi('/auth/reissue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const body = await readResponseBody(response)
  const result = isApiResponse<ReissueResponse>(body) ? body : null

  if (!response.ok || !result || result.success === false || !result.data?.accessToken) {
    throw new ApiError(
      result?.message || '로그인이 만료되었습니다. 다시 로그인해 주세요.',
      response.status,
      result?.code || 'UNAUTHORIZED',
    )
  }

  saveSessionTokens({
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken || refreshToken,
  })
  return result.data.accessToken
}

function getReissuedAccessToken() {
  if (!reissuePromise) {
    reissuePromise = reissueAccessToken().finally(() => {
      reissuePromise = null
    })
  }
  return reissuePromise
}

export async function apiRequest<T>(
  path: string,
  mockResponse: MockApiResponse<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    useMock = isUsingMockApi,
    skipAuth = false,
    retryOnUnauthorized = true,
    ...init
  } = options

  if (useMock) return mockResponse.data

  let response = await fetchApi(path, init, skipAuth ? null : getAccessToken())

  if (
    response.status === 401 &&
    !skipAuth &&
    retryOnUnauthorized &&
    getRefreshToken()
  ) {
    try {
      const accessToken = await getReissuedAccessToken()
      response = await fetchApi(path, init, accessToken)
    } catch (error) {
      clearSession()
      throw error
    }
  }

  const body = await readResponseBody(response)
  const result = isApiResponse<T>(body) ? body : null

  if (!response.ok || result?.success === false) {
    if (response.status === 401 && !skipAuth) clearSession()
    throw new ApiError(
      result?.message || `API 요청에 실패했습니다. (${response.status})`,
      response.status,
      result?.code || 'API_ERROR',
    )
  }

  if (result) return result.data
  if (body !== null) return body as T
  return undefined as T
}
