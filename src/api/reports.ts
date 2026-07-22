import reportMock from '@/mocks/report.json'
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

export function getMonthlyReport(yearMonth: string) {
  const params = new URLSearchParams({ yearMonth })
  const mockReport = (reportMock as ApiResponse<MonthlyReportData>).data

  if (isUsingMockApi) {
    if (isSeededMockUser()) {
      const months = getRecentYearMonths(yearMonth, mockReport.monthlyExpenses.length)
      return Promise.resolve({
        ...mockReport,
        yearMonth,
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
