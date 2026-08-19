import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}))

vi.mock('./client', () => ({ apiRequest: apiRequestMock }))

import { cachedApiRequest } from './cachedRequests'

describe('cachedApiRequest', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
    vi.stubGlobal('window', { setTimeout: vi.fn() })
  })

  it('성공한 GET Promise를 TTL 동안 재사용한다', async () => {
    apiRequestMock.mockResolvedValue({ value: 'ok' })

    const first = cachedApiRequest<{ value: string }>('/cached-success')
    const second = cachedApiRequest<{ value: string }>('/cached-success')

    expect(first).toBe(second)
    await expect(first).resolves.toEqual({ value: 'ok' })
    expect(apiRequestMock).toHaveBeenCalledTimes(1)
  })

  it('실패한 GET Promise를 캐시에서 제거해 다음 요청이 새로 실행된다', async () => {
    const failure = new Error('temporary failure')
    apiRequestMock
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ value: 'retry success' })

    await expect(cachedApiRequest('/cached-failure')).rejects.toBe(failure)
    await expect(cachedApiRequest<{ value: string }>('/cached-failure')).resolves.toEqual({ value: 'retry success' })
    expect(apiRequestMock).toHaveBeenCalledTimes(2)
  })
})
