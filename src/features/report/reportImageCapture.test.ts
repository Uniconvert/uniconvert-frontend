import { describe, expect, it, vi } from 'vitest'
import { captureReportImage, ReportImageCaptureError } from './reportImageCapture'
import { toPng } from 'html-to-image'

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}))

describe('report image capture', () => {
  it('fails with a normalized error when the report element is missing', async () => {
    await expect(captureReportImage(null)).rejects.toBeInstanceOf(ReportImageCaptureError)
  })

  it('captures a PNG with a stable light background and excludes marked controls', async () => {
    const toPngMock = vi.mocked(toPng)
    toPngMock.mockResolvedValue('data:image/png;base64,captured-report')
    const FakeHTMLElement = class {}
    vi.stubGlobal('HTMLElement', FakeHTMLElement)
    const ignored = Object.assign(new FakeHTMLElement(), { dataset: { reportCaptureIgnore: 'true' } }) as unknown as HTMLElement
    const element = Object.assign(new FakeHTMLElement(), {
      scrollWidth: 420,
      clientWidth: 400,
      scrollHeight: 800,
      clientHeight: 780,
    }) as unknown as HTMLElement

    await expect(captureReportImage(element)).resolves.toBe('data:image/png;base64,captured-report')
    expect(toPngMock).toHaveBeenCalledOnce()
    const [capturedElement, options] = toPngMock.mock.calls[0]
    expect(capturedElement).toBe(element)
    expect(options).toMatchObject({ backgroundColor: '#ffffff', width: 420, height: 800 })
    expect(options?.filter?.(ignored)).toBe(false)
  })

  it('normalizes capture library failures without exposing raw details', async () => {
    const toPngMock = vi.mocked(toPng)
    toPngMock.mockRejectedValue(new Error('html-to-image raw failure'))
    const element = { scrollWidth: 1, clientWidth: 1, scrollHeight: 1, clientHeight: 1 } as unknown as HTMLElement

    await expect(captureReportImage(element)).rejects.toBeInstanceOf(ReportImageCaptureError)
    await expect(captureReportImage(element)).rejects.not.toThrow('html-to-image raw failure')
  })
})
