import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBudget, upsertBudget } from '@/api/budgets'
import { budgetKeys } from './budgetKeys'

export function useBudgetQuery(yearMonth: string, enabled = true) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: budgetKeys.forMonth(yearMonth), queryFn: () => getBudget(yearMonth), enabled })
  const save = async (monthlyLimitHome: number) => { const budget = await upsertBudget(yearMonth, monthlyLimitHome); queryClient.setQueryData(budgetKeys.forMonth(yearMonth), budget); return budget }
  return { ...query, save }
}
