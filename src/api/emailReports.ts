import { getSessionUser } from '@/auth/session'
import type { EmailReportData } from '@/types/emailReport'
import { cachedApiRequest } from './cachedRequests'

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
  const { yearMonth, startDate, endDate } = getCurrentMonthRange()
  const params = new URLSearchParams({ startDate, endDate })
  const [summary, categoryReport] = await Promise.all([
    cachedApiRequest<ReportSummaryDto>(
      `/reports/summary?${params.toString()}`,
    ),
    cachedApiRequest<ReportCategoriesDto>(
      `/reports/categories?${params.toString()}`,
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
