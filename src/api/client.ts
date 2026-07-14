import type { ApiResponse } from '@/types/api'

export const isUsingMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export async function apiRequest<T>(path: string, mockResponse: ApiResponse<T>, init?: RequestInit): Promise<T> {
  if (isUsingMockApi) return mockResponse.data

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다.')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    throw new Error(`API 요청에 실패했습니다. (${response.status})`)
  }

  const result = await response.json() as ApiResponse<T>
  return result.data
}
