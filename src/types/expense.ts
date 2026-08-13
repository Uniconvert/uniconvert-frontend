export interface ExpenseCategorySummary {
  categoryId: string
  categoryName: string
  percentage: number
  amountHome: number
  color: string
  iconKey: string
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
  mascotMessages: MascotMessage[]
}

export interface MascotMessage {
  key: string
  message: string
  type: 'ENTRY' | 'INSIGHT' | 'RANDOM'
}

export interface UniMessageBundleDto {
  entryMessages?: Partial<MascotMessage>[]
  randomMessages?: Partial<MascotMessage>[]
}

export interface SavedExpense {
  expenseId: string
  merchantName: string
  convertedAmountHome: number
  iconKey: string
  spentAt: string
}

/** Swagger GET /expenses, GET /expenses/recent 응답 항목입니다. */
export interface ExpenseListItemDto {
  id?: number
  expenseId?: number | string
  merchantName?: string | null
  memo?: string | null
  note?: string | null
  description?: string | null
  categoryId?: number
  categoryName?: string | null
  iconKey?: string | null
  convertedAmountHome?: number
  totalAmountHome?: number
  homeAmount?: number
  convertedAmount?: number
  originalCurrency?: string | null
  originalAmount?: number
  spentAt?: string | null
}

/** Spring Data의 GET /expenses 페이지 응답입니다. */
export interface ExpensePageDto {
  totalElements?: number
  totalPages?: number
  size?: number
  content?: ExpenseListItemDto[]
  number?: number
  numberOfElements?: number
  first?: boolean
  last?: boolean
  empty?: boolean
}

/** Swagger GET /expenses의 data 응답입니다. */
export interface ExpenseListResponseDto {
  expenses?: ExpensePageDto
  content?: ExpenseListItemDto[]
  totalPages?: number
  totalElements?: number
  uniMessages?: UniMessageBundleDto
}

export interface BudgetResponseDto {
  budgetId?: number
  yearMonth?: string
  monthlyLimitHome?: number
}

export interface ReportSummaryResponseDto {
  totalAmount?: number
  uniMessages?: UniMessageBundleDto
}

export interface ReportCategoryItemDto {
  categoryId?: number
  categoryName?: string | null
  iconKey?: string | null
  amount?: number
  percentage?: number
}

export interface ReportCategoriesResponseDto {
  totalAmount?: number
  categories?: ReportCategoryItemDto[]
}

export interface ExpenseUserContextDto {
  homeCurrencyCode?: string | null
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

export interface CreateExpenseInput extends Omit<ExpenseDetail, 'expenseId'> {
  /** 실제 API의 카테고리 PK입니다. */
  categoryId?: number
}

export interface ExpenseResponseDto {
  id?: number
  originalAmount?: number
  originalCurrency?: string | null
  appliedRate?: number
  rateSource?: string | null
  rateDate?: string | null
  convertedAmountHome?: number
  merchantName?: string | null
  memo?: string | null
  categoryId?: number
  potId?: number | null
  spentAt?: string | null
}

export interface ExpenseImportResponseDto {
  provider?: string | null
  totalRowCount?: number
  savedCount?: number
  excludedCount?: number
  errorCount?: number
  errors?: unknown[]
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>
