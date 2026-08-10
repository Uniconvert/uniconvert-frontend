import { getMockMonthlyBudget } from '@/mocks/mockScenario'
import { updateStoredMonthlyBudget } from '@/mocks/potStore'
import { ApiError, apiRequest, isUsingMockApi } from './client'

export interface BudgetDto {
  budgetId?: number
  yearMonth?: string
  monthlyLimitHome?: number
}

export const isUsingMockBudgetApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_BUDGET_API !== 'true'

interface GetBudgetOptions {
  useMock?: boolean
}

export async function getBudget(
  yearMonth: string,
  { useMock = isUsingMockBudgetApi }: GetBudgetOptions = {},
) {
  if (useMock) {
    return Promise.resolve<BudgetDto>({
      budgetId: 0,
      yearMonth,
      monthlyLimitHome: getMockMonthlyBudget(),
    })
  }

  try {
    return await apiRequest<BudgetDto>(
      `/budgets/${encodeURIComponent(yearMonth)}`,
      { data: { budgetId: 0, yearMonth, monthlyLimitHome: 0 } },
      { useMock: false },
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { budgetId: 0, yearMonth, monthlyLimitHome: 0 }
    }
    throw error
  }
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
