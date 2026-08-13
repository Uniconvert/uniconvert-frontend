import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExpenseHistory } from '@/api/expenses'
import { getMonthlyReport } from '@/api/reports'
import type { ExpenseHistoryData } from '@/types/expense'
import type { MonthlyReportData } from '@/types/report'
import { getApiErrorNotice } from '@/utils/apiError'
import { getSessionUser } from '@/auth/session'

interface UseMonthlyReportDataOptions { reportYearMonth: string; budgetYearMonth: string }

export function useMonthlyReportData({ reportYearMonth, budgetYearMonth }: UseMonthlyReportDataOptions) {
  const queryClient = useQueryClient()
  const sessionUser = getSessionUser()
  const reportQuery = useQuery<MonthlyReportData>({
    queryKey: ['monthly-report', reportYearMonth],
    queryFn: () => getMonthlyReport(reportYearMonth),
  })
  const expenseQuery = useQuery<ExpenseHistoryData>({
    queryKey: ['expense-history', budgetYearMonth, 'month'],
    queryFn: () => getExpenseHistory(budgetYearMonth, 'month', sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null),
  })
  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['monthly-report', reportYearMonth] })
    void queryClient.invalidateQueries({ queryKey: ['expense-history', budgetYearMonth, 'month'] })
  }, [budgetYearMonth, queryClient, reportYearMonth])
  return {
    report: reportQuery.data ?? null,
    expenseHistory: expenseQuery.data ?? null,
    errorMessage: reportQuery.error ? getApiErrorNotice(reportQuery.error, '리포트를 불러오지 못했습니다.').title : '',
    isLoading: reportQuery.isLoading || expenseQuery.isLoading,
    retry,
  }
}
