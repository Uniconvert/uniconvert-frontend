import expenseDetailsMock from '@/mocks/expense-details.json'
import { getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { CreateExpenseInput, ExpenseDetail, UpdateExpenseInput } from '@/types/expense'

const STORAGE_KEY = 'uniconvert.mockExpenses.v2'

function seedExpenses() {
  if (!isSeededMockUser()) return []
  return structuredClone((expenseDetailsMock as ApiResponse<ExpenseDetail[]>).data)
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
    return JSON.parse(stored) as ExpenseDetail[]
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
