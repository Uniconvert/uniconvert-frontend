import expenseDetailsMock from '@/mocks/expense-details.json'
import { getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { CreateExpenseInput, ExpenseDetail, UpdateExpenseInput } from '@/types/expense'

const STORAGE_KEY = 'uniconvert.mockExpenses.v2'
const SEEDED_EXPENSE_MONTH = '2026-07'

function normalizeSeedExpenseDates(expenses: ExpenseDetail[]) {
  if (!isSeededMockUser()) return expenses

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentYearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate()

  return expenses.map((expense) => {
    if (!expense.spentAt.startsWith(SEEDED_EXPENSE_MONTH)) return expense

    const day = Number(expense.spentAt.slice(8, 10))
    if (!Number.isFinite(day)) return expense
    const normalizedDay = String(Math.min(Math.max(day, 1), lastDayOfCurrentMonth)).padStart(2, '0')
    return {
      ...expense,
      spentAt: `${currentYearMonth}-${normalizedDay}${expense.spentAt.slice(10)}`,
    }
  })
}

function normalizeCategories(expenses: ExpenseDetail[]) {
  return expenses.map((expense) => expense.iconKey === 'medical'
    ? { ...expense, iconKey: 'communication', categoryName: '통신' }
    : expense)
}

function seedExpenses() {
  if (!isSeededMockUser()) return []
  return normalizeSeedExpenseDates(
    structuredClone((expenseDetailsMock as ApiResponse<ExpenseDetail[]>).data),
  )
}

export function getStoredExpenses(): ExpenseDetail[] {
  const storageKey = getMockStorageKey(STORAGE_KEY)
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    const initialExpenses = seedExpenses()
    localStorage.setItem(storageKey, JSON.stringify(initialExpenses))
    return initialExpenses
  }

  try {
    const expenses = normalizeSeedExpenseDates(
      normalizeCategories(JSON.parse(stored) as ExpenseDetail[]),
    )
    localStorage.setItem(storageKey, JSON.stringify(expenses))
    return expenses
  } catch {
    const initialExpenses = seedExpenses()
    localStorage.setItem(storageKey, JSON.stringify(initialExpenses))
    return initialExpenses
  }
}

function saveExpenses(expenses: ExpenseDetail[]) {
  localStorage.setItem(getMockStorageKey(STORAGE_KEY), JSON.stringify(expenses))
}

export function createStoredExpense(input: CreateExpenseInput) {
  const expenses = getStoredExpenses()
  const expense: ExpenseDetail = {
    expenseId: `expense-${Date.now()}`,
    ...input,
  }
  saveExpenses([expense, ...expenses])
  return expense
}

export function updateStoredExpense(expenseId: string, input: UpdateExpenseInput) {
  const expenses = getStoredExpenses()
  const current = expenses.find((expense) => expense.expenseId === expenseId)
  if (!current) return null

  const updated = { ...current, ...input, expenseId }
  saveExpenses(expenses.map((expense) => expense.expenseId === expenseId ? updated : expense))
  return updated
}

export function deleteStoredExpense(expenseId: string) {
  const expenses = getStoredExpenses()
  const nextExpenses = expenses.filter((expense) => expense.expenseId !== expenseId)
  if (nextExpenses.length === expenses.length) return false
  saveExpenses(nextExpenses)
  return true
}
