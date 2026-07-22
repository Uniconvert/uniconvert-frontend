export interface ExpenseCategorySummary {
  categoryId: string
  categoryName: string
  percentage: number
  amountHome: number
  color: string
}

export interface ExpenseListItem {
  expenseId: string
  merchantName: string
  categoryName: string
  convertedAmountHome: number
  iconKey: string
  spentAt: string
}

export interface ExpenseHistoryData {
  yearMonth: string
  homeCurrency: string
  monthlyBudgetHome: number
  monthlyExpenseHome: number
  remainingBudgetHome: number
  budgetUsagePercent: number
  categories: ExpenseCategorySummary[]
  recentExpenses: ExpenseListItem[]
}

export interface SavedExpense {
  expenseId: string
  merchantName: string
  convertedAmountHome: number
  iconKey: string
  spentAt: string
}

export interface ExpenseDetail {
  expenseId: string
  currency: 'USD' | 'EUR' | 'JPY' | 'CNY' | 'KRW'
  originalAmount: number
  convertedAmountHome: number
  appliedRate: number
  spentAt: string
  merchantName: string
  categoryName: string
  iconKey: string
  memo: string
}

export type CreateExpenseInput = Omit<ExpenseDetail, 'expenseId'>
export type UpdateExpenseInput = Partial<CreateExpenseInput>
