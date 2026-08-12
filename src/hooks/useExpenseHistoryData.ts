import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getExpenseHistory, getExpensesForMonth, getRecentExpenses } from '@/api/expenses'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { getApiErrorNotice } from '@/utils/apiError'
import { getSessionUser } from '@/auth/session'

interface UseExpenseHistoryDataOptions {
  yearMonth: string
  range: string
  isRecentModalOpen: boolean
  recentModalYearMonth: string
}

export function useExpenseHistoryData({ yearMonth, range, isRecentModalOpen, recentModalYearMonth }: UseExpenseHistoryDataOptions) {
  const queryClient = useQueryClient()
  const sessionUser = getSessionUser()
  const freshOnEntry = { staleTime: 0, refetchOnMount: 'always' as const, refetchOnWindowFocus: false }
  const history = useQuery({ queryKey: ['expense-history', yearMonth, range], queryFn: () => getExpenseHistory(yearMonth, range, sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null), ...freshOnEntry })
  const recent = useQuery({ queryKey: ['recent-expenses'], queryFn: getRecentExpenses, ...freshOnEntry })
  const modal = useQuery({
    queryKey: ['expenses-for-month', recentModalYearMonth],
    queryFn: () => getExpensesForMonth(recentModalYearMonth),
    enabled: isRecentModalOpen,
    ...freshOnEntry,
  })
  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['expense-history'] })
    void queryClient.invalidateQueries({ queryKey: ['recent-expenses'] })
    void queryClient.invalidateQueries({ queryKey: ['expenses-for-month', recentModalYearMonth] })
  }, [queryClient, recentModalYearMonth])
  const setRecentExpenses = useCallback((next: SavedExpense[] | ((current: SavedExpense[]) => SavedExpense[])) => {
    queryClient.setQueryData<SavedExpense[]>(['recent-expenses'], (current = []) => (
      typeof next === 'function' ? next(current) : next
    ))
  }, [queryClient])

  return {
    data: (history.data as ExpenseHistoryData | undefined) ?? null,
    errorMessage: history.error ? getApiErrorNotice(history.error, '지출 내역을 불러오지 못했습니다.').title : '',
    recentExpenses: (recent.data as SavedExpense[] | undefined) ?? [],
    setRecentExpenses,
    recentExpensesError: recent.error ? getApiErrorNotice(recent.error, '최근 지출을 불러오지 못했습니다.').title : '',
    modalExpenses: modal.data ?? [],
    isModalExpensesLoading: isRecentModalOpen && modal.isLoading,
    modalExpensesError: modal.error ? getApiErrorNotice(modal.error, '선택한 월의 지출 내역을 불러오지 못했습니다.').title : '',
    retry,
  }
}
