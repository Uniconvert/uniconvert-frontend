import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'

const {
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  keepPreviousDataMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  keepPreviousDataMock: vi.fn((value: unknown) => value),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useCallback: (callback: unknown) => callback,
  }
})

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: keepPreviousDataMock,
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('@/api/expenses', () => ({
  deleteSavedExpense: vi.fn(),
  getExpenseHistory: vi.fn(),
  getExpensesForMonth: vi.fn(),
  getRecentExpenses: vi.fn(),
  updateSavedExpenseName: vi.fn(),
}))

vi.mock('@/auth/session', () => ({
  getSessionUser: () => ({ homeCurrencyCode: 'KRW' }),
}))

import { useExpenseHistoryData } from './useExpenseHistoryData'
import { expenseKeys } from '@/hooks/expenseKeys'

const baseData: ExpenseHistoryData = {
  yearMonth: '2026-08',
  homeCurrency: 'KRW',
  monthlyBudgetHome: 1_000_000,
  monthlyExpenseHome: 100_000,
  remainingBudgetHome: 900_000,
  budgetUsagePercent: 10,
  categories: [],
  recentExpenses: [],
  mascotMessages: [],
}

const recentExpense: SavedExpense = {
  expenseId: 'recent-1',
  merchantName: 'Cafe',
  convertedAmountHome: 8_500,
  iconKey: 'food',
  spentAt: '2026-08-18T12:30:00',
}

const queryClient = {
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
}

function setQueryResults(historyResult: Record<string, unknown>) {
  useQueryMock
    .mockReturnValueOnce(historyResult)
    .mockReturnValueOnce({ data: [recentExpense], error: null, isLoading: false, isFetching: false })
    .mockReturnValueOnce({ data: [], error: null, isLoading: false, isFetching: false })
  useMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
}

function useHistory(range: string) {
  return useExpenseHistoryData({
    yearMonth: '2026-08',
    range,
    isRecentModalOpen: false,
    recentModalYearMonth: '2026-08',
  })
}

describe('useExpenseHistoryData range transition', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset().mockReturnValue(queryClient)
    queryClient.invalidateQueries.mockReset()
    queryClient.setQueryData.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the initial full loading state when no history data exists', () => {
    setQueryResults({ data: undefined, error: null, isLoading: true, isFetching: true, isPlaceholderData: false })

    const result = useHistory('day')

    expect(result.data).toBeNull()
    expect(result.isInitialLoading).toBe(true)
    expect(result.isPlaceholderData).toBe(false)
    expect(result.isBackgroundFetching).toBe(true)
  })

  it('returns the successful day history data without entering initial loading', () => {
    setQueryResults({ data: baseData, error: null, isLoading: false, isFetching: false, isPlaceholderData: false })

    const result = useHistory('day')

    expect(result.data).toBe(baseData)
    expect(result.isInitialLoading).toBe(false)
    expect(result.isBackgroundFetching).toBe(false)
  })

  it('keeps day data while the week query is fetching and preserves the range query key', () => {
    setQueryResults({ data: baseData, error: null, isLoading: false, isFetching: true, isPlaceholderData: true })

    const result = useHistory('week')
    const historyOptions = useQueryMock.mock.calls[0][0] as { queryKey: unknown; placeholderData: unknown }

    expect(result.data).toBe(baseData)
    expect(result.isInitialLoading).toBe(false)
    expect(result.isBackgroundFetching).toBe(true)
    expect(result.isPlaceholderData).toBe(true)
    expect(historyOptions.queryKey).toEqual(expenseKeys.historyFor('2026-08', 'week'))
    expect(historyOptions.placeholderData).toBe(keepPreviousDataMock)
  })

  it('uses the new week data after the range request succeeds', () => {
    const weekData = { ...baseData, recentExpenses: [recentExpense] }
    setQueryResults({ data: weekData, error: null, isLoading: false, isFetching: false, isPlaceholderData: false })

    const result = useHistory('week')

    expect(result.data).toBe(weekData)
    expect(result.isBackgroundFetching).toBe(false)
    expect(result.isPlaceholderData).toBe(false)
  })

  it('keeps the existing error and retry contract when the new range request fails', () => {
    const failure = new Error('지출 내역을 불러오지 못했습니다.')
    setQueryResults({ data: undefined, error: failure, isLoading: false, isFetching: false, isPlaceholderData: false })

    const result = useHistory('week')

    expect(result.data).toBeNull()
    expect(result.errorMessage).toBe('지출 내역을 불러오지 못했습니다.')
    result.retry()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: expenseKeys.history })
  })
})
