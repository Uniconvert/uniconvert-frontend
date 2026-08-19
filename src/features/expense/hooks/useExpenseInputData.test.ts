import { afterEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, useExchangeRateQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useExchangeRateQueryMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: (initial: unknown) => [typeof initial === 'function' ? (initial as () => unknown)() : initial, vi.fn()],
    useEffect: vi.fn(),
    useCallback: (callback: unknown) => callback,
  }
})

vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }))
vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
  getFallbackCategories: () => [{ id: 'food', serverId: 1, label: 'Food', iconKey: 'food', iconSrc: '/food.png' }],
}))
vi.mock('@/api/expenses', () => ({ getExpenseHistory: vi.fn() }))
vi.mock('@/hooks/useExchangeRateQuery', () => ({ useExchangeRateQuery: useExchangeRateQueryMock }))
vi.mock('@/auth/session', () => ({ getSessionUser: () => ({ homeCurrencyCode: 'USD' }) }))
vi.mock('@/utils/exchangeRate', () => ({ getExchangeRate: vi.fn(() => 999) }))

import { useExpenseInputData } from './useExpenseInputData'

function setupQueries({ budget, budgetQuery }: { budget?: unknown; budgetQuery?: Partial<Record<string, unknown>> }) {
  useQueryMock
    .mockReturnValueOnce({ data: [{ id: 'food', serverId: 1, label: 'Food', iconKey: 'food', iconSrc: '/food.png' }], error: null, isLoading: false, isFetching: false })
    .mockReturnValueOnce({ data: budget, error: null, isLoading: false, isFetching: false, refetch: vi.fn(), ...budgetQuery })
  useExchangeRateQueryMock.mockReturnValue({
    data: { available: true, rate: 1.25 },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  })
}

describe('useExpenseInputData budget readiness', () => {
  afterEach(() => {
    useQueryMock.mockReset()
    useExchangeRateQueryMock.mockReset()
  })

  it('does not use fallback KRW or start a rate query while budget is loading', () => {
    setupQueries({ budget: undefined, budgetQuery: { isLoading: true } })

    const result = useExpenseInputData({ yearMonth: '2026-08', currency: 'EUR', onWarning: vi.fn() })

    expect(result.budgetStatus).toBe('loading')
    expect(result.rateStatus).toBe('loading')
    expect(result.rate).toBe(0)
    expect(useExchangeRateQueryMock).toHaveBeenCalledWith('EUR', '')
  })

  it('blocks readiness when the budget query fails', () => {
    setupQueries({ budget: undefined, budgetQuery: { error: new Error('budget unavailable') } })

    const result = useExpenseInputData({ yearMonth: '2026-08', currency: 'EUR', onWarning: vi.fn() })

    expect(result.budgetStatus).toBe('error')
    expect(result.rateStatus).toBe('error')
    expect(result.rate).toBe(0)
  })

  it('uses the actual non-KRW home currency once budget data is ready', () => {
    setupQueries({
      budget: {
        homeCurrency: 'USD',
        monthlyBudgetHome: 1_000,
        monthlyExpenseHome: 100,
        remainingBudgetHome: 900,
      },
    })

    const result = useExpenseInputData({ yearMonth: '2026-08', currency: 'EUR', onWarning: vi.fn() })

    expect(result.budgetStatus).toBe('ready')
    expect(result.rateStatus).toBe('ready')
    expect(result.budgetSummary.homeCurrency).toBe('USD')
    expect(result.rate).toBe(1.25)
    expect(useExchangeRateQueryMock).toHaveBeenCalledWith('EUR', 'USD')
  })

  it('passes mapped API rate 1415.2 through to the ready state', () => {
    setupQueries({
      budget: {
        homeCurrency: 'KRW',
        monthlyBudgetHome: 1_000_000,
        monthlyExpenseHome: 0,
        remainingBudgetHome: 1_000_000,
      },
    })
    useExchangeRateQueryMock.mockReturnValue({
      data: {
        available: true,
        fromCurrency: 'USD',
        toCurrency: 'KRW',
        rate: 1415.2,
        rateDate: '2026-08-18',
        changeRate: 0.02,
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    const result = useExpenseInputData({ yearMonth: '2026-08', currency: 'USD', onWarning: vi.fn() })

    expect(result.rateStatus).toBe('ready')
    expect(result.rate).toBe(1415.2)
  })
})
