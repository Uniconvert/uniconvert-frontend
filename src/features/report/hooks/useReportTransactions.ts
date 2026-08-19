import { useQuery } from '@tanstack/react-query'
import { getExpensePage, mapExpenseListItemDto } from '@/api/expenses'
import type { ExpenseListItem } from '@/types/expense'
import { reportKeys } from '@/hooks/reportKeys'

export function useReportTransactions(targetDate: string, enabled: boolean) {
  const query = useQuery({
    queryKey: reportKeys.transactions(targetDate),
    queryFn: async (): Promise<ExpenseListItem[]> => {
      const response = await getExpensePage({
        startAt: `${targetDate}T00:00:00`,
        endAt: `${targetDate}T23:59:59`,
      })
      return response.content?.map(mapExpenseListItemDto) ?? []
    },
    enabled: enabled && Boolean(targetDate),
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
  })

  return {
    ...query,
    transactions: query.data ?? [],
  }
}
