import { getSessionUser } from '@/auth/session'
import reportMock from '@/mocks/report.json'
import { getStoredExpenses } from '@/mocks/expenseStore'
import { getMockHomeCurrency, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { MonthlyReportData } from '@/types/report'
import { apiRequest, isUsingMockApi } from './client'

interface ReportSummaryDto {
  totalAmount?: number
  dailyAmounts?: Array<{ date?: string; amount?: number }>
}

interface ReportCategoriesDto {
  categories?: Array<{
    categoryId?: number
    categoryName?: string | null
    iconKey?: string | null
    amount?: number
    percentage?: number
  }>
}

export const isUsingMockReportApi = isUsingMockApi

function getRecentYearMonths(yearMonth: string, count: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - count + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${yearMonth}-01`,
    endDate: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

function getDailyExpenses(yearMonth: string) {
  const dailyTotals = new Map<string, number>()

  getStoredExpenses()
    .filter((expense) => expense.spentAt.startsWith(yearMonth))
    .forEach((expense) => {
      const date = expense.spentAt.slice(0, 10)
      dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + expense.convertedAmountHome)
    })

  const sortedDates = [...dailyTotals.keys()].sort()
  const latestDate = sortedDates.at(-1) ?? `${yearMonth}-07`
  const [year, month, day] = latestDate.split('-').map(Number)
  const endDate = new Date(year, month - 1, day)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - (6 - index))
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
    return { date: dateKey, amountHome: dailyTotals.get(dateKey) ?? 0 }
  })
}

function requestSummary(yearMonth: string) {
  const params = new URLSearchParams(getMonthRange(yearMonth))
  return apiRequest<ReportSummaryDto>(
    `/reports/summary?${params.toString()}`,
    { data: { totalAmount: 0, dailyAmounts: [] } },
    { useMock: false },
  )
}

export async function getMonthlyReport(yearMonth: string): Promise<MonthlyReportData> {
  const mockReport = (reportMock as ApiResponse<MonthlyReportData>).data

  if (isUsingMockReportApi) {
    if (isSeededMockUser()) {
      const months = getRecentYearMonths(yearMonth, mockReport.monthlyExpenses.length)
      return {
        ...mockReport,
        yearMonth,
        dailyExpenses: getDailyExpenses(yearMonth),
        monthlyExpenses: mockReport.monthlyExpenses.map((expense, index) => ({
          ...expense,
          yearMonth: months[index],
        })),
      }
    }

    return {
      yearMonth,
      homeCurrency: getMockHomeCurrency(),
      totalExpenseHome: 0,
      dailyExpenses: getDailyExpenses(yearMonth),
      monthlyExpenses: [{ yearMonth, amountHome: 0 }],
      categoryBreakdown: [],
    }
  }

  const monthRange = getMonthRange(yearMonth)
  const monthParams = new URLSearchParams(monthRange)
  const recentMonths = getRecentYearMonths(yearMonth, 7)
  const [summary, categories, ...monthlySummaries] = await Promise.all([
    requestSummary(yearMonth),
    apiRequest<ReportCategoriesDto>(
      `/reports/categories?${monthParams.toString()}`,
      { data: { categories: [] } },
      { useMock: false },
    ),
    ...recentMonths.map(requestSummary),
  ])

  return {
    yearMonth,
    homeCurrency: getSessionUser()?.homeCurrencyCode || 'KRW',
    totalExpenseHome: summary.totalAmount ?? 0,
    dailyExpenses: (summary.dailyAmounts ?? []).map((item) => ({
      date: item.date ?? '',
      amountHome: item.amount ?? 0,
    })).filter((item) => item.date),
    monthlyExpenses: recentMonths.map((month, index) => ({
      yearMonth: month,
      amountHome: monthlySummaries[index]?.totalAmount ?? 0,
    })),
    categoryBreakdown: (categories.categories ?? []).map((category) => ({
      categoryId: category.categoryId ?? 0,
      name: category.categoryName?.trim() || '기타',
      amountHome: category.amount ?? 0,
      percent: category.percentage ?? 0,
      iconKey: category.iconKey?.replace(/^icon_/, '') || 'other',
    })),
  }
}

export function sendMonthlyReport() {
  return apiRequest<unknown>(
    '/reports/email/send',
    { data: true },
    { method: 'POST', useMock: isUsingMockReportApi },
  )
}
