export interface SendReportEmailInput {
  toEmail: string
  reportPeriod: string
  reportImage: string
}

export class ReportEmailSendError extends Error {
  constructor() {
    super('REPORT_EMAIL_SEND_FAILED')
    this.name = 'ReportEmailSendError'
  }
}

function getReportMailScriptUrl() {
  const url = String(import.meta.env.VITE_REPORT_MAIL_SCRIPT_URL ?? '').trim()
  if (!url) throw new ReportEmailSendError()
  return url
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<void> {
  if (!input.toEmail.trim() || !input.reportPeriod.trim() || !input.reportImage.startsWith('data:image/png')) {
    throw new ReportEmailSendError()
  }
  try {
    const response = await fetch(getReportMailScriptUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new ReportEmailSendError()
    const body = await response.text()
    let parsed: unknown
    try { parsed = JSON.parse(body) } catch { throw new ReportEmailSendError() }
    if (!parsed || typeof parsed !== 'object' || (parsed as { success?: unknown }).success !== true) {
      throw new ReportEmailSendError()
    }
  } catch (error) {
    if (error instanceof ReportEmailSendError) throw error
    throw new ReportEmailSendError()
  }
}
