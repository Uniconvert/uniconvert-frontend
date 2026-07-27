import { apiRequest, isUsingMockApi } from '@/api/client'
import { getStoredExpenses, updateStoredExpense } from '@/mocks/expenseStore'
import type { ExpenseMemo } from '@/types/memo'

function toExpenseMemo(expense: ReturnType<typeof getStoredExpenses>[number]): ExpenseMemo {
  return {
    expenseId: expense.expenseId,
    categoryName: expense.categoryName,
    iconKey: expense.iconKey,
    merchantName: expense.merchantName,
    memo: expense.memo,
    spentAt: expense.spentAt,
  }
}

export function getExpenseMemos() {
  if (isUsingMockApi) {
    const memos = getStoredExpenses()
      .filter((expense) => expense.memo.trim().length > 0)
      .map(toExpenseMemo)

    return Promise.resolve(memos)
  }

  return apiRequest<ExpenseMemo[]>('/expenses/memos', { success: true, data: [] })
}

export function updateExpenseMemo(expenseId: string, memo: string) {
  if (isUsingMockApi) {
    const updated = updateStoredExpense(expenseId, { memo: memo.trim() })
    return Promise.resolve(updated ? toExpenseMemo(updated) : null)
  }

  return apiRequest<ExpenseMemo>(
    `/expenses/${expenseId}/memo`,
    { success: true, data: {} as ExpenseMemo },
    {
      method: 'PATCH',
      body: JSON.stringify({ memo: memo.trim() }),
    },
  )
}

export async function deleteExpenseMemos(expenseIds: string[]) {
  if (isUsingMockApi) {
    expenseIds.forEach((expenseId) => updateStoredExpense(expenseId, { memo: '' }))
    return true
  }

  await apiRequest(
    '/expenses/memos',
    { success: true, data: true },
    {
      method: 'DELETE',
      body: JSON.stringify({ expenseIds }),
    },
  )
  return true
}
