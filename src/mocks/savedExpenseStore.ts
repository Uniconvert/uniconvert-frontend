import savedExpensesMock from '@/mocks/saved-expenses.json'
import { getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { SavedExpense } from '@/types/expense'

const STORAGE_KEY = 'uniconvert.mockSavedExpenses.v2'

function normalizeCategories(expenses: SavedExpense[]) {
  return expenses.map((expense) => expense.iconKey === 'medical'
    ? { ...expense, iconKey: 'communication' }
    : expense)
}

export function getStoredSavedExpenses(): SavedExpense[] {
  const storageKey = getMockStorageKey(STORAGE_KEY)
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    const initial = isSeededMockUser()
      ? structuredClone((savedExpensesMock as ApiResponse<SavedExpense[]>).data)
      : []
    localStorage.setItem(storageKey, JSON.stringify(initial))
    return initial
  }
  try {
    const expenses = normalizeCategories(JSON.parse(stored) as SavedExpense[])
    localStorage.setItem(storageKey, JSON.stringify(expenses))
    return expenses
  } catch {
    localStorage.removeItem(storageKey)
    return getStoredSavedExpenses()
  }
}

export function saveStoredSavedExpenses(expenses: SavedExpense[]) {
  localStorage.setItem(getMockStorageKey(STORAGE_KEY), JSON.stringify(expenses))
}
