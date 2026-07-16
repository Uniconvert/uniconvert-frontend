import emailReportMock from '@/mocks/email-report.json'
import type { ApiResponse } from '@/types/api'
import type { EmailReportData } from '@/types/emailReport'
import { apiRequest } from './client'

export function getEmailReportPreview() {
  // TODO: Swagger 확정 후 이메일 리포트 미리보기 API 경로로 수정합니다.
  return apiRequest(
    '/email-reports/preview',
    emailReportMock as ApiResponse<EmailReportData>,
  )
}
