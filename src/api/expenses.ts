import expenseHistoryMock from '@/mocks/expense-history.json'
import { createStoredExpense, getStoredExpenses } from '@/mocks/expenseStore'
import { getMockHomeCurrency, getMockMonthlyBudget } from '@/mocks/mockScenario'
import { getStoredSavedExpenses, saveStoredSavedExpenses } from '@/mocks/savedExpenseStore'
import type { ApiResponse } from '@/types/api'
import type { CreateExpenseInput, ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { apiRequest, isUsingMockApi } from './client'

const categoryColors: Record<string, string> = {
  food: '#366384', transport: '#a9cbfa', education: '#153047',
  travel: '#66a9e4', communication: '#e2efff', shopping: '#8bbbe8', other: '#cbd9e6',
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRangeStart(referenceDate: string, range: string) {
  if (range === 'month') return `${referenceDate.slice(0, 7)}-01`
  if (range === 'day') return referenceDate

  const [year, month, day] = referenceDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return formatLocalDate(date)
}

function buildCategoryTotals(
  expenses: ReturnType<typeof getStoredExpenses>,
  yearMonth: string,
  range: string,
) {
  const today = formatLocalDate(new Date())
  const referenceDate = today.startsWith(yearMonth)
    ? today
    : expenses[0]?.spentAt.slice(0, 10) ?? `${yearMonth}-01`
  const rangeStart = getRangeStart(referenceDate, range)
  const rangeEnd = range === 'month' ? `${yearMonth}-31` : referenceDate
  const totals = new Map<string, { categoryName: string; amount: number; spentAt: string }>()

  expenses
    .filter((expense) => {
      const spentDate = expense.spentAt.slice(0, 10)
      return spentDate >= rangeStart && spentDate <= rangeEnd
    })
    .forEach((expense) => {
      const current = totals.get(expense.iconKey)
      totals.set(expense.iconKey, {
        categoryName: expense.categoryName,
        amount: (current?.amount ?? 0) + expense.convertedAmountHome,
        spentAt: current?.spentAt && current.spentAt > expense.spentAt ? current.spentAt : expense.spentAt,
      })
    })

  return Array.from(totals, ([iconKey, value]) => ({
    expenseId: `category-${range}-${iconKey}`,
    merchantName: value.categoryName,
    categoryName: value.categoryName,
    convertedAmountHome: value.amount,
    iconKey,
    spentAt: value.spentAt,
  })).sort((a, b) => b.convertedAmountHome - a.convertedAmountHome)
}

function buildMockHistory(yearMonth: string, range: string): ExpenseHistoryData {
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
    recentExpenses: buildCategoryTotals(expenses, yearMonth, range),
  }
}

export function getExpenseHistory(yearMonth: string, range: string) {
  if (isUsingMockApi) return Promise.resolve(buildMockHistory(yearMonth, range))
  const params = new URLSearchParams({ yearMonth, range })
  return apiRequest(`/expenses?${params.toString()}`, { success: true, data: buildMockHistory(yearMonth, range) })
}

export function createExpense(input: CreateExpenseInput) {
  if (isUsingMockApi) {
    const expense = createStoredExpense(input)
    const savedExpense: SavedExpense = {
      expenseId: expense.expenseId,
      merchantName: expense.merchantName.trim() || expense.categoryName,
      convertedAmountHome: expense.convertedAmountHome,
      iconKey: expense.iconKey,
      spentAt: expense.spentAt,
    }
    saveStoredSavedExpenses([savedExpense, ...getStoredSavedExpenses()])
    return Promise.resolve(expense)
  }
  return apiRequest('/expenses', { success: true, data: { expenseId: '', ...input } }, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
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
