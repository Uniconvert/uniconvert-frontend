import emailReportMock from '@/mocks/email-report.json'
import { getMockHomeCurrency, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { EmailReportData } from '@/types/emailReport'
import { apiRequest, isUsingMockApi } from './client'

export function getEmailReportPreview() {
  if (isUsingMockApi && !isSeededMockUser()) {
    return Promise.resolve({
      isEnabled: false,
      yearMonth: new Date().toISOString().slice(0, 7),
      homeCurrency: getMockHomeCurrency(),
      totalExpenseHome: 0,
      categories: [],
    })
  }

  // TODO: Swagger 확정 후 이메일 리포트 미리보기 API 경로로 수정합니다.
  return apiRequest(
    '/email-reports/preview',
    emailReportMock as ApiResponse<EmailReportData>,
  )
}
