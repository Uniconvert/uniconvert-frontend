import { getSessionUser } from '@/auth/session'
import type { MonthlyReportData, UniMessage } from '@/types/report'
import { apiRequest } from './client'

interface ReportSummaryDto {
  totalAmount?: number
  dailyAmounts?: Array<{ date?: string; amount?: number }>
  uniMessages?: {
    entryMessages?: Array<{ key?: string; message?: string; type?: UniMessage['type'] }>
    randomMessages?: Array<{ key?: string; message?: string; type?: UniMessage['type'] }>
  }
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

function requestSummary(yearMonth: string) {
  const params = new URLSearchParams(getMonthRange(yearMonth))
  return apiRequest<ReportSummaryDto>(`/reports/summary?${params.toString()}`)
}

function mapUniMessages(summary?: ReportSummaryDto): UniMessage[] {
  const bundle = summary?.uniMessages
  const messages = [...(bundle?.entryMessages ?? []), ...(bundle?.randomMessages ?? [])]

  return messages.flatMap((item, index) => {
    const message = item.message?.trim()
    if (!message) return []

    return [{
      key: item.key ?? `uni-message-${index}`,
      message,
      type: item.type ?? 'RANDOM',
    }]
  })
}

export async function getMonthlyReport(yearMonth: string): Promise<MonthlyReportData> {
  const monthRange = getMonthRange(yearMonth)
  const monthParams = new URLSearchParams(monthRange)
  const recentMonths = getRecentYearMonths(yearMonth, 7)
  const [summary, categories, ...monthlySummaries] = await Promise.all([
    requestSummary(yearMonth),
    apiRequest<ReportCategoriesDto>(
      `/reports/categories?${monthParams.toString()}`,
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
    mascotMessages: mapUniMessages(summary),
  }
}

export function sendEmailReport(language: string = 'ko-KR') {
  return apiRequest<unknown>('/reports/email/send', {
    method: 'POST',
    headers: {
      'X-Browser-Language': language,
    },
    body: JSON.stringify({}),
  })
}

export function sendMonthlyEmailReport(language: string = 'ko-KR') {
  return apiRequest<unknown>('/reports/monthly/email', {
    method: 'POST',
    headers: {
      'X-Browser-Language': language,
    },
  })
}