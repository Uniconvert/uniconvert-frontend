import { ApiError } from '@/api/client'

export interface ApiErrorNotice {
  title: string
  description?: string
}

export function getApiErrorNotice(
  error: unknown,
  fallbackTitle = '요청을 처리하지 못했습니다.',
): ApiErrorNotice {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.status === 0) {
      return {
        title: '서버에 연결할 수 없습니다.',
        description: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      }
    }

    if (error.status === 401) {
      return {
        title: '로그인이 만료되었습니다.',
        description: '다시 로그인해 주세요.',
      }
    }

    if (error.status === 403) {
      return { title: '요청을 처리할 권한이 없습니다.' }
    }

    if (error.status === 404) {
      return { title: '요청한 정보를 찾을 수 없습니다.' }
    }

    if (error.status === 429) {
      return {
        title: '요청이 너무 많습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      }
    }

    if (error.status >= 500) {
      return {
        title: '서버에서 요청을 처리하지 못했습니다.',
        description: '잠시 후 다시 시도해 주세요.',
      }
    }

    return { title: error.message || fallbackTitle }
  }

  if (error instanceof Error && error.message) {
    return { title: error.message }
  }

  return { title: fallbackTitle }
}
