import type {
  CreateExpenseInput,
  ExpenseHistoryData,
  ExpenseImportResponseDto,
  ExpenseListItem,
  ExpenseListItemDto,
  MascotMessage,
  ExpensePageDto,
  ExpenseResponseDto,
  ExpenseUserContextDto,
  ReportCategoriesResponseDto,
  ReportCategoryItemDto,
  ReportSummaryResponseDto,
  SavedExpense,
} from '@/types/expense'
import { getBudget } from './budgets'
import { apiRequest } from './client'

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

function mapMascotMessages(summary: ReportSummaryResponseDto | null): MascotMessage[] {
  const messages = [
    ...(summary?.uniMessages?.entryMessages ?? []),
    ...(summary?.uniMessages?.randomMessages ?? []),
  ]

  return messages.flatMap((item, index) => {
    const message = item.message?.trim()
    if (!message) return []

    const type = item.type === 'ENTRY' || item.type === 'INSIGHT' || item.type === 'RANDOM'
      ? item.type
      : 'RANDOM'

    return [{
      key: item.key?.trim() || `report-message-${index}`,
      message,
      type,
    }]
  })
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
  return apiRequest<ExpensePageDto>(`/expenses?${params.toString()}`)
}

/** Swagger의 페이지 기반 GET /expenses를 그대로 노출합니다. */
export function getExpensePage(query: ExpenseListQuery = {}) {
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
  ))
  const rangeCategoryRequest = reportRange.startDate === monthRange.startDate
    && reportRange.endDate === monthRange.endDate
    ? monthCategoryRequest
    : resolveOrNull(apiRequest<ReportCategoriesResponseDto>(
      `/reports/categories?${new URLSearchParams(reportRange).toString()}`,
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
    resolveOrNull(getBudget(yearMonth)),
    resolveOrNull(apiRequest<number>(
      `/expenses/remaining-budget?${new URLSearchParams({ yearMonth }).toString()}`,
    )),
    resolveOrNull(apiRequest<ReportSummaryResponseDto>(
      `/reports/summary?${new URLSearchParams({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
      }).toString()}`,
    )),
    monthCategoryRequest,
    rangeCategoryRequest,
    resolveOrNull(apiRequest<ExpenseUserContextDto>(
      '/users/me',
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
    iconKey: category.iconKey,
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
    mascotMessages: mapMascotMessages(summary),
  }
}

export function getExpenseHistory(yearMonth: string, range: string) {
  return buildRealHistory(yearMonth, range)
}

export async function createExpense(input: CreateExpenseInput) {
  if (!input.categoryId) {
    throw new Error('지출 카테고리를 다시 선택해 주세요.')
  }

  const spentAt = input.spentAt.includes('T') ? input.spentAt : `${input.spentAt}T12:00:00`
  const response = await apiRequest<ExpenseResponseDto>(
    '/expenses',
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
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<ExpenseImportResponseDto>(
    '/expenses/import',
    { method: 'POST', body: formData },
  )
}

/** 최근 지출은 서버가 보장하는 최신순을 다시 정렬해 화면 모델로 변환합니다. */
export async function getRecentExpenses() {
  const recent = await resolveOrNull(apiRequest<ExpenseListItemDto[]>(
    '/expenses/recent',
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
  const { startDate, endDate } = getMonthBounds(yearMonth)
  const expenses = await getAllExpensePages({
    startAt: toDateTimeStart(startDate),
    endAt: toDateTimeEnd(endDate),
  })

  return expenses.map(toSavedExpense)
}

export function updateSavedExpenseOrder(expenses: SavedExpense[]) {
  void expenses
  return Promise.reject(new Error('실제 API에는 최근 지출 순서 저장 기능이 없습니다.'))
}

export function updateSavedExpenseName(expense: SavedExpense, merchantName: string) {
  const updatedExpense = { ...expense, merchantName: merchantName.trim() }

  return (async () => {
    const id = Number(expense.expenseId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('올바르지 않은 지출 ID입니다.')
    }

    // PATCH는 금액·통화·날짜·카테고리를 모두 요구한다. 목록에 없는 원본 값을
    // 먼저 단건 조회로 보존한 뒤 상점명만 변경해 보낸다.
    const current = await apiRequest<ExpenseResponseDto>(
      `/expenses/${id}`,
    )
    if (
      !Number.isFinite(current.originalAmount)
      || !current.originalCurrency
      || !current.spentAt
      || !Number.isSafeInteger(current.categoryId)
    ) {
      throw new Error('지출 상세 정보가 완전하지 않아 수정할 수 없습니다.')
    }

    const response = await apiRequest<ExpenseResponseDto>(
      `/expenses/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          originalAmount: current.originalAmount,
          originalCurrency: current.originalCurrency,
          spentAt: current.spentAt,
          categoryId: current.categoryId,
          merchantName: updatedExpense.merchantName,
          memo: current.memo ?? undefined,
          potId: current.potId ?? undefined,
        }),
      },
    )

    return {
      ...updatedExpense,
      merchantName: response.merchantName?.trim() || updatedExpense.merchantName,
      convertedAmountHome: response.convertedAmountHome ?? expense.convertedAmountHome,
      spentAt: response.spentAt ?? expense.spentAt,
    }
  })()
}

export async function deleteSavedExpense(expenseId: string) {
  const id = Number(expenseId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('올바르지 않은 지출 ID입니다.')
  }

  await apiRequest<void>(
    `/expenses/${id}`,
    { method: 'DELETE' },
  )
  return true
}
