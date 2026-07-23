import expenseHistoryMock from '@/mocks/expense-history.json'
import { createStoredExpense, deleteStoredExpense, getStoredExpenses, updateStoredExpense } from '@/mocks/expenseStore'
import { getMockHomeCurrency, getMockMonthlyBudget } from '@/mocks/mockScenario'
import { getStoredSavedExpenses, saveStoredSavedExpenses } from '@/mocks/savedExpenseStore'
import type { ApiResponse } from '@/types/api'
import type { CreateExpenseInput, ExpenseDetail, ExpenseHistoryData, SavedExpense, UpdateExpenseInput } from '@/types/expense'
import { apiRequest, isUsingMockApi } from './client'

const categoryColors: Record<string, string> = {
  food: '#366384', transport: '#a9cbfa', education: '#153047',
  travel: '#66a9e4', medical: '#e2efff', shopping: '#8bbbe8', other: '#cbd9e6',
}

function buildMockHistory(yearMonth: string): ExpenseHistoryData {
  const mockBase = (expenseHistoryMock as ApiResponse<ExpenseHistoryData>).data
  const base: ExpenseHistoryData = {
    ...mockBase,
    homeCurrency: getMockHomeCurrency(),
    monthlyBudgetHome: getMockMonthlyBudget(),
  }
  const expenses = getStoredExpenses()
    .filter((expense) => expense.spentAt.startsWith(yearMonth))
    .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
  const monthlyExpenseHome = expenses.reduce((sum, expense) => sum + expense.convertedAmountHome, 0)
  const categoryMap = new Map<string, { name: string; amount: number }>()

  expenses.forEach((expense) => {
    const current = categoryMap.get(expense.iconKey)
    categoryMap.set(expense.iconKey, {
      name: expense.categoryName,
      amount: (current?.amount ?? 0) + expense.convertedAmountHome,
    })
  })

  return {
    ...base,
    yearMonth,
    monthlyExpenseHome,
    remainingBudgetHome: Math.max(base.monthlyBudgetHome - monthlyExpenseHome, 0),
    budgetUsagePercent: base.monthlyBudgetHome > 0
      ? Math.round((monthlyExpenseHome / base.monthlyBudgetHome) * 1000) / 10
      : 0,
    categories: Array.from(categoryMap, ([categoryId, value]) => ({
      categoryId,
      categoryName: value.name,
      amountHome: value.amount,
      percentage: monthlyExpenseHome > 0 ? Math.round((value.amount / monthlyExpenseHome) * 100) : 0,
      color: categoryColors[categoryId] ?? categoryColors.other,
    })),
    recentExpenses: expenses.map((expense) => ({
      expenseId: expense.expenseId,
      merchantName: expense.merchantName,
      categoryName: expense.categoryName,
      convertedAmountHome: expense.convertedAmountHome,
      iconKey: expense.iconKey,
      spentAt: expense.spentAt,
    })),
  }
}

export function getExpenseHistory(yearMonth: string, range: string) {
  if (isUsingMockApi) return Promise.resolve(buildMockHistory(yearMonth))
  const params = new URLSearchParams({ yearMonth, range })
  return apiRequest(`/expenses?${params.toString()}`, { success: true, data: buildMockHistory(yearMonth) })
}

export function getExpenseDetail(expenseId: string) {
  if (isUsingMockApi) {
    return Promise.resolve(getStoredExpenses().find((expense) => expense.expenseId === expenseId) ?? null)
  }
  return apiRequest<ExpenseDetail | null>(`/expenses/${expenseId}`, { success: true, data: null })
}

export function createExpense(input: CreateExpenseInput) {
  if (isUsingMockApi) return Promise.resolve(createStoredExpense(input))
  return apiRequest('/expenses', { success: true, data: { expenseId: '', ...input } }, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
}

export function updateExpense(expenseId: string, input: UpdateExpenseInput) {
  if (isUsingMockApi) return Promise.resolve(updateStoredExpense(expenseId, input))
  return apiRequest<ExpenseDetail | null>(`/expenses/${expenseId}`, { success: true, data: null }, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
}

export function deleteExpense(expenseId: string) {
  if (isUsingMockApi) return Promise.resolve(deleteStoredExpense(expenseId))
  return apiRequest(`/expenses/${expenseId}`, { success: true, data: true }, { method: 'DELETE' })
}

export function getSavedExpenses() {
  if (isUsingMockApi) return Promise.resolve(getStoredSavedExpenses())
  return apiRequest<SavedExpense[]>('/saved-expenses', { success: true, data: [] })
}

export function updateSavedExpenseOrder(expenses: SavedExpense[]) {
  if (isUsingMockApi) {
    saveStoredSavedExpenses(expenses)
    return Promise.resolve(expenses)
  }
  return apiRequest<SavedExpense[]>('/saved-expenses/order', { success: true, data: expenses }, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseIds: expenses.map((expense) => expense.expenseId) }),
  })
}

export function deleteSavedExpense(expenseId: string) {
  if (isUsingMockApi) {
    const next = getStoredSavedExpenses().filter((expense) => expense.expenseId !== expenseId)
    saveStoredSavedExpenses(next)
    return Promise.resolve(true)
  }
  return apiRequest(`/saved-expenses/${expenseId}`, { success: true, data: true }, { method: 'DELETE' })
}
