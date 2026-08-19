import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequestMock, cachedApiRequestMock, getBudgetMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  cachedApiRequestMock: vi.fn(),
  getBudgetMock: vi.fn(),
}))

vi.mock('./client', () => ({ apiRequest: apiRequestMock }))
vi.mock('./cachedRequests', () => ({ cachedApiRequest: cachedApiRequestMock }))
vi.mock('./budgets', () => ({ getBudget: getBudgetMock }))

import { getExpenseHistory } from './expenses'

function setupSuccessfulRequests() {
  getBudgetMock.mockResolvedValue({ yearMonth: '2099-01', monthlyLimitHome: 1_000 })
  cachedApiRequestMock.mockResolvedValue({
    totalAmount: 200,
    categories: [{ categoryId: 1, categoryName: 'Food', iconKey: 'food', amount: 200, percentage: 100 }],
  })
  apiRequestMock.mockImplementation((path: string) => {
    if (path.startsWith('/expenses/remaining-budget')) return Promise.resolve(800)
    if (path.startsWith('/reports/summary')) return Promise.resolve({ totalAmount: 200 })
    if (path === '/users/me') return Promise.resolve({ homeCurrencyCode: 'KRW' })
    return Promise.reject(new Error(`Unexpected API path: ${path}`))
  })
}

describe('getExpenseHistory critical regression tests', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { setTimeout: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    apiRequestMock.mockReset()
    cachedApiRequestMock.mockReset()
    getBudgetMock.mockReset()
  })

  it('returns normal expense history data when all core APIs succeed', async () => {
    setupSuccessfulRequests()

    await expect(getExpenseHistory('2099-01', 'month', null)).resolves.toMatchObject({
      homeCurrency: 'KRW',
      monthlyBudgetHome: 1_000,
      monthlyExpenseHome: 200,
      remainingBudgetHome: 800,
      categories: [{ categoryName: 'Food', amountHome: 200 }],
    })
  })

  it('keeps partial expense history data when a non-critical API fails', async () => {
    getBudgetMock.mockRejectedValue(new Error('budget unavailable'))
    cachedApiRequestMock.mockRejectedValue(new Error('categories unavailable'))
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith('/reports/summary')) return Promise.resolve({ totalAmount: 200 })
      if (path === '/users/me') return Promise.resolve({ homeCurrencyCode: 'KRW' })
      return Promise.reject(new Error(`unavailable: ${path}`))
    })

    await expect(getExpenseHistory('2099-02', 'month', null)).resolves.toMatchObject({
      homeCurrency: 'KRW',
      monthlyBudgetHome: 0,
      monthlyExpenseHome: 200,
      categories: [],
    })
  })

  it('should throw an error when all expense history requests fail', async () => {
    getBudgetMock.mockRejectedValue(new Error('budget unavailable'))
    cachedApiRequestMock.mockRejectedValue(new Error('categories unavailable'))
    apiRequestMock.mockRejectedValue(new Error('core API unavailable'))

    // This is expected to fail against the current implementation: the service
    // substitutes an always-resolved empty expense response before checking failure.
    await expect(getExpenseHistory('2099-03', 'month', null))
      .rejects.toThrow('지출 내역을 불러오지 못했습니다.')
  })
})
