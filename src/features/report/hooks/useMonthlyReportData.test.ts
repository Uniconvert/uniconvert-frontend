import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MonthlyReportData } from '@/types/report'

const { useQueryMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, useCallback: (callback: unknown) => callback }
})
vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))
vi.mock('@/api/reports', () => ({ getMonthlyReport: vi.fn() }))
vi.mock('@/api/expenses', () => ({ getExpenseHistory: vi.fn() }))
vi.mock('@/auth/session', () => ({ getSessionUser: () => ({ homeCurrencyCode: 'KRW' }) }))

import { useMonthlyReportData } from './useMonthlyReportData'

const reportData: MonthlyReportData = {
  yearMonth: '2026-08',
  homeCurrency: 'KRW',
  totalExpenseHome: 100,
  dailyExpenses: [],
  monthlyExpenses: [],
  categoryBreakdown: [],
  mascotMessages: [],
}

function setup(reportQuery: Partial<Record<string, unknown>>, expenseQuery: Partial<Record<string, unknown>>) {
  useQueryMock
    .mockReturnValueOnce({ data: null, error: null, isLoading: false, isFetching: false, ...reportQuery })
    .mockReturnValueOnce({ data: null, error: null, isLoading: false, isFetching: false, ...expenseQuery })
}

describe('useMonthlyReportData partial failure contract', () => {
  afterEach(() => {
    useQueryMock.mockReset()
    invalidateQueriesMock.mockReset()
  })

  it('returns both data sources on full success', () => {
    setup(
      { data: reportData },
      { data: { yearMonth: '2026-08', homeCurrency: 'KRW', monthlyBudgetHome: 1_000, monthlyExpenseHome: 100, remainingBudgetHome: 900, budgetUsagePercent: 10, categories: [], recentExpenses: [], mascotMessages: [] } },
    )

    const result = useMonthlyReportData({ reportYearMonth: '2026-08', budgetYearMonth: '2026-08' })

    expect(result.report).toBe(reportData)
    expect(result.expenseHistory).not.toBeNull()
    expect(result.errorMessage).toBe('')
    expect(result.expenseHistoryErrorMessage).toBe('')
  })

  it('returns the full error when the report request fails without report data', () => {
    setup({ error: new Error('report unavailable') }, { data: null })

    const result = useMonthlyReportData({ reportYearMonth: '2026-08', budgetYearMonth: '2026-08' })

    expect(result.report).toBeNull()
    expect(result.errorMessage).toBe('report unavailable')
  })

  it('keeps report success while exposing expense history failure as partial data', () => {
    setup({ data: reportData }, { error: new Error('expense history unavailable') })

    const result = useMonthlyReportData({ reportYearMonth: '2026-08', budgetYearMonth: '2026-08' })

    expect(result.report).toBe(reportData)
    expect(result.expenseHistory).toBeNull()
    expect(result.errorMessage).toBe('')
    expect(result.expenseHistoryErrorMessage).toBe('expense history unavailable')
  })
})
