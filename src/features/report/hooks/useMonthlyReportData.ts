import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExpenseHistory } from '@/api/expenses'
import { getMonthlyReport } from '@/api/reports'
import type { ExpenseHistoryData } from '@/types/expense'
import type { MonthlyReportData } from '@/types/report'
import { getApiErrorNotice } from '@/utils/apiError'
import { getSessionUser } from '@/auth/session'
import { reportKeys } from '@/hooks/reportKeys'
import { expenseKeys } from '@/hooks/expenseKeys'

interface UseMonthlyReportDataOptions { reportYearMonth: string; budgetYearMonth: string }

export function useMonthlyReportData({ reportYearMonth, budgetYearMonth }: UseMonthlyReportDataOptions) {
  const queryClient = useQueryClient()
  const sessionUser = getSessionUser()
  const reportQuery = useQuery<MonthlyReportData>({
    queryKey: reportKeys.monthly(reportYearMonth),
    queryFn: () => getMonthlyReport(reportYearMonth),
  })
  const expenseQuery = useQuery<ExpenseHistoryData>({
    queryKey: expenseKeys.historyFor(budgetYearMonth, 'month'),
    queryFn: () => getExpenseHistory(budgetYearMonth, 'month', sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null),
  })
  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: reportKeys.monthly(reportYearMonth) })
    void queryClient.invalidateQueries({ queryKey: expenseKeys.historyFor(budgetYearMonth, 'month') })
  }, [budgetYearMonth, queryClient, reportYearMonth])
  const queryError = reportQuery.error && !reportQuery.data
    ? reportQuery.error
      : !reportQuery.data
        ? expenseQuery.error
        : null
  const expenseHistoryErrorMessage = expenseQuery.error && !expenseQuery.data
    ? getApiErrorNotice(expenseQuery.error, '지출 내역을 불러오지 못했습니다.').title
    : ''
  return {
    report: reportQuery.data ?? null,
    expenseHistory: expenseQuery.data ?? null,
    errorMessage: queryError ? getApiErrorNotice(queryError, '리포트를 불러오지 못했습니다.').title : '',
    expenseHistoryErrorMessage,
    isInitialLoading: reportQuery.isLoading || expenseQuery.isLoading,
    isBackgroundFetching: reportQuery.isFetching || expenseQuery.isFetching,
    retry,
  }
}
