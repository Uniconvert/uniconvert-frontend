import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteSavedExpense } from './expenses'
import { deleteExpenseMemos, getExpenseMemos } from './memos'

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({
    success: true,
    code: 'SUCCESS',
    message: '요청이 성공했습니다.',
    data,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('메모 및 지출 삭제 API', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test.local')
    const values = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('메모 페이지 응답을 화면 데이터로 변환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      content: [{
        id: 31,
        categoryId: 1,
        categoryName: '식비',
        iconKey: 'icon_food',
        memo: '점심 식사',
        spentAt: '2026-08-10T12:30:00',
      }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getExpenseMemos({ keyword: '점심', sort: 'oldest', page: 0 }))
      .resolves.toEqual({
        items: [{
          expenseId: '31',
          categoryName: '식비',
          iconKey: 'icon_food',
          merchantName: '',
          memo: '점심 식사',
          spentAt: '2026-08-10T12:30:00',
        }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.test.local/expenses/memos?keyword=%EC%A0%90%EC%8B%AC&sort=oldest&page=0',
    )
  })

  it('메모 다중 삭제 ID를 숫자 배열로 전송한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteExpenseMemos(['12', '34'])).resolves.toBe(true)

    const [, request] = fetchMock.mock.calls[0]
    expect(request.method).toBe('DELETE')
    expect(JSON.parse(request.body)).toEqual({ expenseIds: [12, 34] })
  })

  it('지출 삭제를 소프트 삭제 엔드포인트로 요청한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteSavedExpense('52')).resolves.toBe(true)

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test.local/expenses/52')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })
})
