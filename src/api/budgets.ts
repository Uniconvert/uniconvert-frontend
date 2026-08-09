import { getMockMonthlyBudget } from '@/mocks/mockScenario'
import { updateStoredMonthlyBudget } from '@/mocks/potStore'
import { apiRequest, isUsingMockApi } from './client'

export interface BudgetDto {
  budgetId?: number
  yearMonth?: string
  monthlyLimitHome?: number
}

export const isUsingMockBudgetApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_BUDGET_API !== 'true'

export function getBudget(yearMonth: string) {
  if (isUsingMockBudgetApi) {
    return Promise.resolve<BudgetDto>({
      budgetId: 0,
      yearMonth,
      monthlyLimitHome: getMockMonthlyBudget(),
    })
  }

  return apiRequest<BudgetDto>(
    `/budgets/${encodeURIComponent(yearMonth)}`,
    { data: { budgetId: 0, yearMonth, monthlyLimitHome: 0 } },
    { useMock: false },
  )
}

export function upsertBudget(yearMonth: string, monthlyLimitHome: number) {
  if (isUsingMockBudgetApi) {
    updateStoredMonthlyBudget(monthlyLimitHome)
    return Promise.resolve<BudgetDto>({ budgetId: 0, yearMonth, monthlyLimitHome })
  }

  return apiRequest<BudgetDto>(
    `/budgets/${encodeURIComponent(yearMonth)}`,
    { data: { budgetId: 0, yearMonth, monthlyLimitHome } },
    {
      method: 'PUT',
      body: JSON.stringify({ monthlyLimitHome }),
      useMock: false,
    },
  )
}
