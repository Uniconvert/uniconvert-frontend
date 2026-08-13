import { ApiError, apiRequest } from './client'

export interface BudgetDto {
  budgetId?: number
  yearMonth?: string
  monthlyLimitHome?: number
}
const budgetRequests = new Map<string, Promise<BudgetDto>>()

export async function getBudget(yearMonth: string) {
  const cached = budgetRequests.get(yearMonth)
  if (cached) return cached
  const request = loadBudget(yearMonth).finally(() => budgetRequests.delete(yearMonth))
  budgetRequests.set(yearMonth, request)
  return request
}

async function loadBudget(yearMonth: string) {
  try {
    return await apiRequest<BudgetDto>(
      `/budgets/${encodeURIComponent(yearMonth)}`,
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { budgetId: 0, yearMonth, monthlyLimitHome: 0 }
    }
    throw error
  }
}

export function upsertBudget(yearMonth: string, monthlyLimitHome: number) {
  return apiRequest<BudgetDto>(
    `/budgets/${encodeURIComponent(yearMonth)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ monthlyLimitHome }),
    },
  )
}
