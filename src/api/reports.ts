import reportMock from '@/mocks/report.json'
import { getStoredExpenses } from '@/mocks/expenseStore'
import { getMockHomeCurrency, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { MonthlyReportData } from '@/types/report'
import { apiRequest, isUsingMockApi } from './client'

interface MonthlyReportApiResponse {
  yearMonth: string
  homeCurrency: string
  totalExpenseHome: number
  dailyExpenses: Array<{ date: string; amountHome: number }>
  categoryBreakdown?: Array<{
    categoryId: number
    name: string
    amountHome: number
    percent: number
  }>
}

function getRecentYearMonths(yearMonth: string, count: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - count + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
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

export function getMonthlyReport(yearMonth: string) {
  const params = new URLSearchParams({ yearMonth })
  const mockReport = (reportMock as ApiResponse<MonthlyReportData>).data

  if (isUsingMockApi) {
    if (isSeededMockUser()) {
      const months = getRecentYearMonths(yearMonth, mockReport.monthlyExpenses.length)
      return Promise.resolve({
        ...mockReport,
        yearMonth,
        dailyExpenses: getDailyExpenses(yearMonth),
        monthlyExpenses: mockReport.monthlyExpenses.map((expense, index) => ({
          ...expense,
          yearMonth: months[index],
        })),
      })
    }

    return Promise.resolve({
      yearMonth,
      homeCurrency: getMockHomeCurrency(),
      totalExpenseHome: 0,
      dailyExpenses: getDailyExpenses(yearMonth),
      monthlyExpenses: [{ yearMonth, amountHome: 0 }],
      categoryBreakdown: [],
    })
  }

  return apiRequest<MonthlyReportApiResponse>(
    `/reports/monthly?${params.toString()}`,
    {
      data: {
        yearMonth,
        homeCurrency: getMockHomeCurrency(),
        totalExpenseHome: 0,
        dailyExpenses: [],
        categoryBreakdown: [],
      },
    },
  ).then((response): MonthlyReportData => ({
    yearMonth: response.yearMonth,
    homeCurrency: response.homeCurrency,
    totalExpenseHome: response.totalExpenseHome,
    dailyExpenses: response.dailyExpenses,
    // Swagger 초안에는 6개월 추이가 없어 현재 월 합계만 표시합니다.
    monthlyExpenses: [{ yearMonth: response.yearMonth, amountHome: response.totalExpenseHome }],
    categoryBreakdown: (response.categoryBreakdown ?? []).map((category) => ({
      ...category,
      iconKey: 'other',
    })),
  }))
}

export function sendMonthlyReport(yearMonth: string) {
  return apiRequest('/reports/monthly/email', { data: true }, {
    method: 'POST',
    body: JSON.stringify({ yearMonth }),
  })
}
