import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBudget, upsertBudget } from '@/api/budgets'
export function useBudgetQuery(yearMonth: string) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['budget', yearMonth], queryFn: () => getBudget(yearMonth) })
  const save = async (monthlyLimitHome: number) => { const budget = await upsertBudget(yearMonth, monthlyLimitHome); queryClient.setQueryData(['budget', yearMonth], budget); return budget }
  return { ...query, save }
}
