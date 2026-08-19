import type { ExpenseHistoryData } from '@/types/expense'

export interface MobileBudgetMetrics {
  usagePercent: number
  remainingBudgetHome: number
}

/**
 * Uses the values already produced by the Expense History service. When that
 * query has no data, the dashboard must not invent a budget or usage value.
 */
export function getMobileBudgetMetrics(
  data: Pick<ExpenseHistoryData, 'budgetUsagePercent' | 'remainingBudgetHome'> | null,
): MobileBudgetMetrics | null {
  if (!data) return null

  const usagePercent = Number(data.budgetUsagePercent)
  const remainingBudgetHome = Number(data.remainingBudgetHome)
  if (!Number.isFinite(usagePercent) || !Number.isFinite(remainingBudgetHome)) return null

  return {
    usagePercent: Math.min(Math.max(usagePercent, 0), 100),
    remainingBudgetHome: Math.max(remainingBudgetHome, 0),
  }
}
