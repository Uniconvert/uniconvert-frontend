import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportEmailSendError, sendReportEmail } from './emailReportSender'

describe('Google Apps Script report sender', () => {
  const fetchMock = vi.fn()
  const reportInput = {
    toEmail: 'user@example.com',
    reportPeriod: '2026-08-18',
    reportImage: 'data:image/png;base64,actual-report-image',
  }

  beforeEach(() => {
    vi.stubEnv('VITE_REPORT_MAIL_SCRIPT_URL', 'https://script.google.test/report')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does not call Apps Script before the explicit send action', () => {
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the recipient, period, and captured PNG once when explicitly invoked', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ success: true }) } as Response)

    await sendReportEmail(reportInput)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://script.google.test/report')
    expect(request.method).toBe('POST')
    expect(request.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
    expect(JSON.parse(String(request.body))).toEqual(reportInput)
  })

  it('requires Apps Script success:true instead of relying only on HTTP status', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ success: false }) } as Response)

    await expect(sendReportEmail(reportInput)).rejects.toBeInstanceOf(ReportEmailSendError)
  })

  it('normalizes provider and network failures without exposing raw details', async () => {
    fetchMock.mockResolvedValue({ ok: false, text: async () => 'Google internal stack 500' } as Response)

    await expect(sendReportEmail(reportInput)).rejects.toBeInstanceOf(ReportEmailSendError)
    await expect(sendReportEmail(reportInput)).rejects.not.toThrow('Google internal stack')

    fetchMock.mockRejectedValue(new Error('network raw details'))
    await expect(sendReportEmail(reportInput)).rejects.toBeInstanceOf(ReportEmailSendError)
    await expect(sendReportEmail(reportInput)).rejects.not.toThrow('network raw details')
  })

  it('fails before the request when recipient, image, or configuration is missing', async () => {
    await expect(sendReportEmail({ ...reportInput, toEmail: '' })).rejects.toBeInstanceOf(ReportEmailSendError)
    await expect(sendReportEmail({ ...reportInput, reportImage: 'not-a-png' })).rejects.toBeInstanceOf(ReportEmailSendError)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv('VITE_REPORT_MAIL_SCRIPT_URL', '')
    await expect(sendReportEmail(reportInput)).rejects.toBeInstanceOf(ReportEmailSendError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
