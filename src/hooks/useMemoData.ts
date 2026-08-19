import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteExpenseMemos, getExpenseMemos, updateExpenseMemo } from '@/api/memos'
import type { ExpenseMemo, ExpenseMemoQuery } from '@/types/memo'
import { memoKeys } from './memoKeys'

interface UseMemoDataOptions {
  keyword: string
  sort: NonNullable<ExpenseMemoQuery['sort']>
  page: number
}

export function useMemoData({ keyword, sort, page }: UseMemoDataOptions) {
  const queryClient = useQueryClient()
  const requestQuery = {
    keyword,
    sort,
    page,
  } satisfies Required<Pick<ExpenseMemoQuery, 'keyword' | 'sort' | 'page'>>

  const query = useQuery({
    queryKey: memoKeys.list(requestQuery),
    queryFn: () => getExpenseMemos(requestQuery),
  })

  const deleteMutation = useMutation({
    mutationFn: (expenseIds: string[]) => deleteExpenseMemos(expenseIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoKeys.all }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ expense, memo }: { expense: ExpenseMemo; memo: string }) => updateExpenseMemo(expense, memo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoKeys.all }),
  })

  return {
    query,
    deleteMemos: deleteMutation.mutateAsync,
    updateMemo: updateMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
