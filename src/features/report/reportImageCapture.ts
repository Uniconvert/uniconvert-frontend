import { toPng } from 'html-to-image'

export class ReportImageCaptureError extends Error {
  constructor() {
    super('REPORT_IMAGE_CAPTURE_FAILED')
    this.name = 'ReportImageCaptureError'
  }
}

function isCaptureIgnoredNode(node: HTMLElement) {
  return node.dataset.reportCaptureIgnore === 'true'
}

/** Captures only the visible report surface and excludes the send action. */
export async function captureReportImage(element: HTMLElement | null): Promise<string> {
  if (!element) throw new ReportImageCaptureError()

  try {
    const width = Math.max(element.scrollWidth, element.clientWidth)
    const height = Math.max(element.scrollHeight, element.clientHeight)
    return await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      width,
      height,
      backgroundColor: '#ffffff',
      style: {
        animation: 'none',
        transition: 'none',
      },
      filter: (node) => !(node instanceof HTMLElement && isCaptureIgnoredNode(node)),
    })
  } catch {
    throw new ReportImageCaptureError()
  }
}
