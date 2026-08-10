import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from './client'

const mockResponse = { data: { source: 'mock' as const } }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test.local')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('Mock 모드에서는 네트워크 요청 없이 Mock 데이터를 반환한다', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/test', mockResponse, { useMock: true })).resolves.toEqual({
      source: 'mock',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('공통 성공 응답의 data를 화면에 반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        code: 'SUCCESS',
        message: '요청이 성공했습니다.',
        data: { source: 'server' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/test', mockResponse, {
        useMock: false,
        skipAuth: true,
      }),
    ).resolves.toEqual({ source: 'server' })

    const [, request] = fetchMock.mock.calls[0]
    const headers = request.headers as Headers
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('X-Browser-Language')).toBeTruthy()
  })

  it('백엔드 실패 응답을 상태·코드·메시지가 있는 ApiError로 변환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            code: 'INVALID_REQUEST',
            message: '요청값을 확인해 주세요.',
            data: null,
          },
          400,
        ),
      ),
    )

    const error = await apiRequest('/test', mockResponse, {
      useMock: false,
      skipAuth: true,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'INVALID_REQUEST',
      message: '요청값을 확인해 주세요.',
    })
  })

  it('통신 실패를 사용자용 네트워크 오류로 변환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(
      apiRequest('/test', mockResponse, {
        useMock: false,
        skipAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })
})
