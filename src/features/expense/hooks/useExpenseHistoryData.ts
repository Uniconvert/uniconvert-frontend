import { useCallback } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSavedExpense, getExpenseHistory, getExpensesForMonth, getRecentExpenses, updateSavedExpenseName } from '@/api/expenses'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { getApiErrorNotice } from '@/utils/apiError'
import { getSessionUser } from '@/auth/session'
import { expenseKeys } from '@/hooks/expenseKeys'

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
  const history = useQuery<ExpenseHistoryData>({
    queryKey: expenseKeys.historyFor(yearMonth, range),
    queryFn: () => getExpenseHistory(yearMonth, range, sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null),
    placeholderData: keepPreviousData,
    ...freshOnEntry,
  })
  const recent = useQuery<SavedExpense[]>({ queryKey: expenseKeys.recent, queryFn: getRecentExpenses, ...freshOnEntry })
  const modal = useQuery<SavedExpense[]>({
    queryKey: expenseKeys.month(recentModalYearMonth),
    queryFn: () => getExpensesForMonth(recentModalYearMonth),
    enabled: isRecentModalOpen,
    ...freshOnEntry,
  })
  const invalidateHistoryQueries = () => {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.history })
    void queryClient.invalidateQueries({ queryKey: expenseKeys.recent })
    void queryClient.invalidateQueries({ queryKey: expenseKeys.month(recentModalYearMonth) })
  }
  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => deleteSavedExpense(expenseId),
    onSuccess: invalidateHistoryQueries,
  })
  const updateMutation = useMutation({
    mutationFn: ({ expense, merchantName }: { expense: SavedExpense; merchantName: string }) => updateSavedExpenseName(expense, merchantName),
    onSuccess: invalidateHistoryQueries,
  })
  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.history })
    void queryClient.invalidateQueries({ queryKey: expenseKeys.recent })
    void queryClient.invalidateQueries({ queryKey: expenseKeys.month(recentModalYearMonth) })
  }, [queryClient, recentModalYearMonth])
  const setRecentExpenses = useCallback((next: SavedExpense[] | ((current: SavedExpense[]) => SavedExpense[])) => {
    queryClient.setQueryData<SavedExpense[]>(expenseKeys.recent, (current = []) => (
      typeof next === 'function' ? next(current) : next
    ))
  }, [queryClient])

  return {
    data: history.data ?? null,
    errorMessage: history.error && !history.data
      ? getApiErrorNotice(history.error, '지출 내역을 불러오지 못했습니다.').title
      : '',
    isInitialLoading: history.isLoading,
    isPlaceholderData: history.isPlaceholderData,
    isBackgroundFetching: history.isFetching || recent.isFetching,
    recentExpenses: recent.data ?? [],
    setRecentExpenses,
    recentExpensesError: recent.error ? getApiErrorNotice(recent.error, '최근 지출을 불러오지 못했습니다.').title : '',
    modalExpenses: modal.data ?? [],
    isModalExpensesLoading: isRecentModalOpen && modal.isLoading,
    modalExpensesError: modal.error ? getApiErrorNotice(modal.error, '선택한 월의 지출 내역을 불러오지 못했습니다.').title : '',
    retry,
    deleteSavedExpense: deleteMutation.mutateAsync,
    updateSavedExpenseName: updateMutation.mutateAsync,
    isMutating: deleteMutation.isPending || updateMutation.isPending,
  }
}
