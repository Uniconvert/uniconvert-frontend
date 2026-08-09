import expenseHistoryMock from '@/mocks/expense-history.json'
import { createStoredExpense, getStoredExpenses, updateStoredExpense } from '@/mocks/expenseStore'
import { getMockHomeCurrency, getMockMonthlyBudget } from '@/mocks/mockScenario'
import { getStoredSavedExpenses, saveStoredSavedExpenses } from '@/mocks/savedExpenseStore'
import type { ApiResponse } from '@/types/api'
import type {
  CreateExpenseInput,
  ExpenseHistoryData,
  ExpenseImportResponseDto,
  ExpenseListItem,
  ExpenseListItemDto,
  ExpensePageDto,
  ExpenseResponseDto,
  ExpenseUserContextDto,
  ReportCategoriesResponseDto,
  ReportCategoryItemDto,
  ReportSummaryResponseDto,
  SavedExpense,
} from '@/types/expense'
import { getBudget } from './budgets'
import { apiRequest, isUsingMockApi } from './client'

/** 전체 Mock 모드를 유지하면서 지출 도메인만 실제 API로 전환할 수 있습니다. */
export const isUsingMockExpenseApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_EXPENSE_API !== 'true'

/** 기존 화면 코드와의 호환을 위한 별칭입니다. */
export const isUsingMockExpenseReadApi = isUsingMockExpenseApi

const categoryColors: Record<string, string> = {
  food: '#366384', transport: '#a9cbfa', education: '#153047',
  travel: '#66a9e4', communication: '#e2efff', shopping: '#8bbbe8',
  housing: '#75b8a7', savings: '#9bc8ac', other: '#cbd9e6',
}

const iconKeyAliases: Record<string, string> = {
  telecom: 'communication',
  academic: 'education',
  etc: 'other',
}

export interface ExpenseListQuery {
  startAt?: string
  endAt?: string
  categoryId?: number
  page?: number
}

interface CategorySummaryWithMeta {
  categoryId: string
  categoryName: string
  amountHome: number
  percentage: number
  color: string
  iconKey: string
  latestSpentAt: string
}

function normalizeIconKey(iconKey?: string | null) {
  const normalized = iconKey?.trim().toLowerCase().replace(/^icon_/, '') || 'other'
  return iconKeyAliases[normalized] ?? normalized
}

function toFiniteNumber(value: number | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toExpenseListItem(response: ExpenseListItemDto): ExpenseListItem {
  const iconKey = normalizeIconKey(response.iconKey)
  const categoryName = response.categoryName?.trim() || '기타'

  return {
    expenseId: String(response.id ?? ''),
    merchantName: response.merchantName?.trim() || categoryName,
    categoryName,
    convertedAmountHome: toFiniteNumber(response.convertedAmountHome),
    iconKey,
    spentAt: response.spentAt || '',
  }
}

function toSavedExpense(response: ExpenseListItemDto): SavedExpense {
  const expense = toExpenseListItem(response)
  return {
    expenseId: expense.expenseId,
    merchantName: expense.merchantName,
    convertedAmountHome: expense.convertedAmountHome,
    iconKey: expense.iconKey,
    spentAt: expense.spentAt,
  }
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

function getMonthBounds(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = Number.isInteger(year) && month >= 1 && month <= 12
    ? new Date(year, month, 0).getDate()
    : 31
  return {
    startDate: `${yearMonth}-01`,
    endDate: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

function getReportRange(yearMonth: string, range: string) {
  const month = getMonthBounds(yearMonth)
  const today = formatLocalDate(new Date())
  const referenceDate = today.startsWith(yearMonth) ? today : month.endDate
  const startDate = getRangeStart(referenceDate, range)

  return {
    startDate: startDate < month.startDate ? month.startDate : startDate,
    endDate: referenceDate,
  }
}

function toDateTimeStart(date: string) {
  return `${date}T00:00:00`
}

function toDateTimeEnd(date: string) {
  return `${date}T23:59:59`
}

function buildExpenseListParams(query: ExpenseListQuery) {
  const params = new URLSearchParams()
  if (query.startAt) params.set('startAt', query.startAt)
  if (query.endAt) params.set('endAt', query.endAt)
  if (query.categoryId !== undefined) params.set('categoryId', String(query.categoryId))
  params.set('page', String(query.page ?? 0))
  return params
}

function requestExpensePage(query: ExpenseListQuery) {
  const params = buildExpenseListParams(query)
  return apiRequest<ExpensePageDto>(
    `/expenses?${params.toString()}`,
    { data: { content: [], number: query.page ?? 0, totalPages: 0, empty: true } },
    { useMock: false },
  )
}

function buildMockExpensePage(query: ExpenseListQuery): ExpensePageDto {
  const page = query.page ?? 0
  const pageSize = 6
  const content = getStoredExpenses()
    .filter((expense) => !query.startAt || expense.spentAt >= query.startAt)
    .filter((expense) => !query.endAt || expense.spentAt <= query.endAt)
    .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
    .map((expense, index): ExpenseListItemDto => ({
      id: Number.parseInt(expense.expenseId.replace(/\D/g, ''), 10) || index + 1,
      merchantName: expense.merchantName,
      categoryName: expense.categoryName,
      iconKey: expense.iconKey,
      convertedAmountHome: expense.convertedAmountHome,
      originalCurrency: expense.currency,
      originalAmount: expense.originalAmount,
      spentAt: expense.spentAt,
    }))
  const totalPages = Math.ceil(content.length / pageSize)
  const pageContent = content.slice(page * pageSize, (page + 1) * pageSize)

  return {
    content: pageContent,
    number: page,
    size: pageSize,
    numberOfElements: pageContent.length,
    totalElements: content.length,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: pageContent.length === 0,
  }
}

/** Swagger의 페이지 기반 GET /expenses를 그대로 노출합니다. */
export function getExpensePage(query: ExpenseListQuery = {}) {
  if (isUsingMockExpenseReadApi) return Promise.resolve(buildMockExpensePage(query))
  return requestExpensePage(query)
}

async function getAllExpensePages(query: Omit<ExpenseListQuery, 'page'>) {
  const firstPage = await requestExpensePage({ ...query, page: 0 })
  const totalPages = Math.max(1, toFiniteNumber(firstPage.totalPages, 1))
  const remainingPages = totalPages > 1
    ? await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => (
        requestExpensePage({ ...query, page: index + 1 })
      )),
    )
    : []

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.content ?? [])
    .sort((a, b) => (b.spentAt ?? '').localeCompare(a.spentAt ?? ''))
}

async function resolveOrNull<T>(request: Promise<T>) {
  try {
    return await request
  } catch {
    return null
  }
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

function buildCategorySummaryFromExpenses(expenses: ExpenseListItem[]): CategorySummaryWithMeta[] {
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.convertedAmountHome, 0)
  const categories = new Map<string, {
    categoryName: string
    amount: number
    latestSpentAt: string
  }>()

  expenses.forEach((expense) => {
    const current = categories.get(expense.iconKey)
    categories.set(expense.iconKey, {
      categoryName: expense.categoryName,
      amount: (current?.amount ?? 0) + expense.convertedAmountHome,
      latestSpentAt: current?.latestSpentAt && current.latestSpentAt > expense.spentAt
        ? current.latestSpentAt
        : expense.spentAt,
    })
  })

  return Array.from(categories, ([iconKey, category]) => ({
    categoryId: iconKey,
    categoryName: category.categoryName,
    amountHome: category.amount,
    percentage: totalAmount > 0 ? Math.round((category.amount / totalAmount) * 100) : 0,
    color: categoryColors[iconKey] ?? categoryColors.other,
    latestSpentAt: category.latestSpentAt,
    iconKey,
  })).sort((a, b) => b.amountHome - a.amountHome)
}

function mapReportCategories(
  categories: ReportCategoryItemDto[],
  totalAmount: number,
): CategorySummaryWithMeta[] {
  return categories.map((category, index) => {
    const iconKey = normalizeIconKey(category.iconKey)
    const amountHome = toFiniteNumber(category.amount)
    return {
      categoryId: String(category.categoryId ?? iconKey ?? index),
      categoryName: category.categoryName?.trim() || '기타',
      amountHome,
      percentage: toFiniteNumber(
        category.percentage,
        totalAmount > 0 ? Math.round((amountHome / totalAmount) * 100) : 0,
      ),
      color: categoryColors[iconKey] ?? categoryColors.other,
      iconKey,
      latestSpentAt: '',
    }
  }).sort((a, b) => b.amountHome - a.amountHome)
}

async function buildRealHistory(yearMonth: string, range: string): Promise<ExpenseHistoryData> {
  const monthRange = getMonthBounds(yearMonth)
  const reportRange = getReportRange(yearMonth, range)
  const monthQuery = {
    startAt: toDateTimeStart(monthRange.startDate),
    endAt: toDateTimeEnd(monthRange.endDate),
  }
  const monthCategoryRequest = resolveOrNull(apiRequest<ReportCategoriesResponseDto>(
    `/reports/categories?${new URLSearchParams({
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
    }).toString()}`,
    { data: { totalAmount: 0, categories: [] } },
    { useMock: false },
  ))
  const rangeCategoryRequest = reportRange.startDate === monthRange.startDate
    && reportRange.endDate === monthRange.endDate
    ? monthCategoryRequest
    : resolveOrNull(apiRequest<ReportCategoriesResponseDto>(
      `/reports/categories?${new URLSearchParams(reportRange).toString()}`,
      { data: { totalAmount: 0, categories: [] } },
      { useMock: false },
    ))

  // 집계 API가 아직 500을 반환하는 환경에서도 목록 데이터로 화면을 복구할 수 있게
  // 서로 독립적으로 요청하고 성공한 응답만 사용합니다.
  const [
    expenseResponses,
    budget,
    remainingBudget,
    summary,
    monthCategoryReport,
    rangeCategoryReport,
    userContext,
  ] = await Promise.all([
    resolveOrNull(getAllExpensePages(monthQuery)),
    resolveOrNull(getBudget(yearMonth, { useMock: false })),
    resolveOrNull(apiRequest<number>(
      `/expenses/remaining-budget?${new URLSearchParams({ yearMonth }).toString()}`,
      { data: 0 },
      { useMock: false },
    )),
    resolveOrNull(apiRequest<ReportSummaryResponseDto>(
      `/reports/summary?${new URLSearchParams({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
      }).toString()}`,
      { data: { totalAmount: 0 } },
      { useMock: false },
    )),
    monthCategoryRequest,
    rangeCategoryRequest,
    resolveOrNull(apiRequest<ExpenseUserContextDto>(
      '/users/me',
      { data: { homeCurrencyCode: 'KRW' } },
      { useMock: false },
    )),
  ])

  if (
    expenseResponses === null
    && summary === null
    && monthCategoryReport === null
    && rangeCategoryReport === null
  ) {
    throw new Error('지출 내역을 불러오지 못했습니다.')
  }

  const monthExpenses = (expenseResponses ?? []).map(toExpenseListItem)
  const fallbackMonthlyCategories = buildCategorySummaryFromExpenses(monthExpenses)
  const listMonthlyTotal = monthExpenses.reduce(
    (sum, expense) => sum + expense.convertedAmountHome,
    0,
  )
  const monthlyExpenseHome = toFiniteNumber(
    summary?.totalAmount,
    toFiniteNumber(monthCategoryReport?.totalAmount, listMonthlyTotal),
  )
  const monthlyCategorySource = monthCategoryReport
    ? mapReportCategories(monthCategoryReport.categories ?? [], monthlyExpenseHome)
    : fallbackMonthlyCategories
  const categories = monthlyCategorySource.map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    amountHome: category.amountHome,
    percentage: category.percentage,
    color: category.color,
  }))
  const rangeExpenses = monthExpenses.filter((expense) => {
    const spentDate = expense.spentAt.slice(0, 10)
    return spentDate >= reportRange.startDate && spentDate <= reportRange.endDate
  })
  const fallbackRangeCategories = buildCategorySummaryFromExpenses(rangeExpenses)
  const rangeTotal = toFiniteNumber(
    rangeCategoryReport?.totalAmount,
    rangeExpenses.reduce((sum, expense) => sum + expense.convertedAmountHome, 0),
  )
  const rangeCategories = rangeCategoryReport
    ? mapReportCategories(rangeCategoryReport.categories ?? [], rangeTotal)
    : fallbackRangeCategories
  const monthlyBudgetHome = toFiniteNumber(budget?.monthlyLimitHome)
  const remainingBudgetHome = remainingBudget === null
    ? Math.max(monthlyBudgetHome - monthlyExpenseHome, 0)
    : Math.max(remainingBudget, 0)
  const usedBudget = Math.max(monthlyBudgetHome - remainingBudgetHome, 0)

  return {
    yearMonth,
    homeCurrency: userContext?.homeCurrencyCode || 'KRW',
    monthlyBudgetHome,
    monthlyExpenseHome,
    remainingBudgetHome,
    budgetUsagePercent: monthlyBudgetHome > 0
      ? Math.round((usedBudget / monthlyBudgetHome) * 1000) / 10
      : 0,
    categories,
    recentExpenses: rangeCategories.map((category) => ({
      expenseId: `category-${range}-${category.categoryId}`,
      merchantName: category.categoryName,
      categoryName: category.categoryName,
      convertedAmountHome: category.amountHome,
      iconKey: category.iconKey,
      spentAt: category.latestSpentAt || `${reportRange.endDate}T23:59:59`,
    })),
  }
}

export function getExpenseHistory(yearMonth: string, range: string) {
  if (isUsingMockExpenseApi) return Promise.resolve(buildMockHistory(yearMonth, range))
  return buildRealHistory(yearMonth, range)
}

export async function createExpense(input: CreateExpenseInput) {
  if (isUsingMockExpenseApi) {
    const expense = createStoredExpense(input)
    const savedExpense: SavedExpense = {
      expenseId: expense.expenseId,
      merchantName: expense.merchantName.trim() || expense.categoryName,
      convertedAmountHome: expense.convertedAmountHome,
      iconKey: expense.iconKey,
      spentAt: expense.spentAt,
    }
    saveStoredSavedExpenses([savedExpense, ...getStoredSavedExpenses()])
    return expense
  }

  if (!input.categoryId) {
    throw new Error('지출 카테고리를 다시 선택해 주세요.')
  }

  const spentAt = input.spentAt.includes('T') ? input.spentAt : `${input.spentAt}T12:00:00`
  const response = await apiRequest<ExpenseResponseDto>(
    '/expenses',
    {
      data: {
        id: 0,
        originalAmount: input.originalAmount,
        originalCurrency: input.currency,
        appliedRate: input.appliedRate,
        convertedAmountHome: input.convertedAmountHome,
        merchantName: input.merchantName,
        memo: input.memo,
        categoryId: input.categoryId,
        spentAt,
      },
    },
    {
      method: 'POST',
      body: JSON.stringify({
        originalAmount: input.originalAmount,
        originalCurrency: input.currency,
        spentAt,
        categoryId: input.categoryId,
        merchantName: input.merchantName || undefined,
        memo: input.memo || undefined,
      }),
      useMock: false,
    },
  )

  return {
    expenseId: String(response.id ?? ''),
    currency: (response.originalCurrency?.toUpperCase() || input.currency) as CreateExpenseInput['currency'],
    originalAmount: response.originalAmount ?? input.originalAmount,
    convertedAmountHome: response.convertedAmountHome ?? input.convertedAmountHome,
    appliedRate: response.appliedRate ?? input.appliedRate,
    spentAt: response.spentAt ?? spentAt,
    merchantName: response.merchantName ?? input.merchantName,
    categoryName: input.categoryName,
    iconKey: input.iconKey,
    memo: response.memo ?? input.memo,
    categoryId: response.categoryId ?? input.categoryId,
  }
}

export async function importExpenses(file: File) {
  if (isUsingMockExpenseApi) {
    return {
      provider: 'MOCK',
      totalRowCount: 1,
      savedCount: 1,
      excludedCount: 0,
      errorCount: 0,
      errors: [],
    } satisfies ExpenseImportResponseDto
  }

  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<ExpenseImportResponseDto>(
    '/expenses/import',
    { data: { totalRowCount: 0, savedCount: 0, excludedCount: 0, errorCount: 0, errors: [] } },
    { method: 'POST', body: formData, useMock: false },
  )
}

/** 최근 지출은 서버가 보장하는 최신순을 다시 정렬해 화면 모델로 변환합니다. */
export async function getRecentExpenses() {
  if (isUsingMockExpenseApi) return getStoredSavedExpenses()

  const recent = await resolveOrNull(apiRequest<ExpenseListItemDto[]>(
    '/expenses/recent',
    { data: [] },
    { useMock: false },
  ))
  if (recent) {
    return recent
      .map(toSavedExpense)
      .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
  }

  // 현재 실서버의 /expenses/recent가 실패하는 동안에는 동일한 최신순 페이지를 사용합니다.
  const firstPage = await resolveOrNull(requestExpensePage({ page: 0 }))
  if (!firstPage) {
    throw new Error('최근 지출을 불러오지 못했습니다.')
  }

  return (firstPage?.content ?? [])
    .map(toSavedExpense)
    .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
}

/** 최근 지출 모달에서 선택한 월의 전체 페이지를 조회합니다. */
export async function getExpensesForMonth(yearMonth: string) {
  if (isUsingMockExpenseApi) {
    return getStoredSavedExpenses()
      .filter((expense) => expense.spentAt.startsWith(yearMonth))
      .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
  }

  const { startDate, endDate } = getMonthBounds(yearMonth)
  const expenses = await getAllExpensePages({
    startAt: toDateTimeStart(startDate),
    endAt: toDateTimeEnd(endDate),
  })

  return expenses.map(toSavedExpense)
}

export function updateSavedExpenseOrder(expenses: SavedExpense[]) {
  if (isUsingMockApi) {
    saveStoredSavedExpenses(expenses)
    return Promise.resolve(expenses)
  }
  return Promise.reject(new Error('실제 API에는 최근 지출 순서 저장 기능이 없습니다.'))
}

export function updateSavedExpenseName(expense: SavedExpense, merchantName: string) {
  const updatedExpense = { ...expense, merchantName: merchantName.trim() }

  if (isUsingMockApi) {
    const next = getStoredSavedExpenses().map((item) => (
      item.expenseId === expense.expenseId ? updatedExpense : item
    ))
    saveStoredSavedExpenses(next)
    updateStoredExpense(expense.expenseId, { merchantName: updatedExpense.merchantName })
    return Promise.resolve(updatedExpense)
  }

  return Promise.reject(new Error('지출 수정은 상세 데이터와 함께 별도 연동해야 합니다.'))
}

export function deleteSavedExpense(expenseId: string) {
  if (isUsingMockApi) {
    const next = getStoredSavedExpenses().filter((expense) => expense.expenseId !== expenseId)
    saveStoredSavedExpenses(next)
    return Promise.resolve(true)
  }
  return Promise.reject(new Error('지출 삭제는 이번 조회 연동 범위에 포함되지 않습니다.'))
}
