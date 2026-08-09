import { getSessionUser } from '@/auth/session'
import emailReportMock from '@/mocks/email-report.json'
import { getMockHomeCurrency, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { EmailReportData } from '@/types/emailReport'
import { apiRequest } from './client'
import { isUsingMockReportApi } from './reports'

interface ReportSummaryDto {
  totalAmount?: number
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

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(year, month, 0).getDate()
  return {
    yearMonth,
    startDate: `${yearMonth}-01`,
    endDate: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

export async function getEmailReportPreview(): Promise<EmailReportData> {
  if (isUsingMockReportApi) {
    if (isSeededMockUser()) {
      return (emailReportMock as ApiResponse<EmailReportData>).data
    }
    return {
      isEnabled: false,
      yearMonth: new Date().toISOString().slice(0, 7),
      homeCurrency: getMockHomeCurrency(),
      totalExpenseHome: 0,
      categories: [],
    }
  }

  const { yearMonth, startDate, endDate } = getCurrentMonthRange()
  const params = new URLSearchParams({ startDate, endDate })
  const [summary, categoryReport] = await Promise.all([
    apiRequest<ReportSummaryDto>(
      `/reports/summary?${params.toString()}`,
      { data: { totalAmount: 0 } },
      { useMock: false },
    ),
    apiRequest<ReportCategoriesDto>(
      `/reports/categories?${params.toString()}`,
      { data: { categories: [] } },
      { useMock: false },
    ),
  ])

  return {
    // 수신 여부·주기·시간을 저장하는 API는 아직 없으므로 화면 로컬 상태로만 관리합니다.
    isEnabled: false,
    yearMonth,
    homeCurrency: getSessionUser()?.homeCurrencyCode || 'KRW',
    totalExpenseHome: summary.totalAmount ?? 0,
    categories: (categoryReport.categories ?? []).map((category) => ({
      categoryId: String(category.categoryId ?? ''),
      categoryName: category.categoryName?.trim() || '기타',
      amountHome: category.amount ?? 0,
      ratio: category.percentage ?? 0,
      iconKey: category.iconKey?.replace(/^icon_/, '') || 'other',
    })),
  }
}
