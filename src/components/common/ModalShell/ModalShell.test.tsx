import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import ModalShell from './ModalShell'
import {
  focusInitialElement,
  handleDialogKeyDown,
} from './dialogBehavior'

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    createPortal: (node: ReactNode) => node,
  }
})

vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

function createDialog(focusableElements: HTMLElement[]) {
  return {
    querySelectorAll: vi.fn(() => focusableElements),
    focus: vi.fn(),
  } as unknown as HTMLElement
}

describe('ModalShell', () => {
  it('renders dialog semantics, title, description, and close action', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body: { style: { overflow: '' } }, activeElement: null },
    })
    const markup = renderToStaticMarkup(
      <ModalShell
        title="지출 수정"
        description="변경 내용을 저장할 수 있습니다."
        onClose={() => { }}
      >
        <button type="button">저장</button>
      </ModalShell>,
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('aria-labelledby=')
    expect(markup).toContain('aria-describedby=')
    expect(markup).toContain('지출 수정')
    expect(markup).toContain('변경 내용을 저장할 수 있습니다.')
    expect(markup).toContain('common.close')
    Reflect.deleteProperty(globalThis, 'document')
  })

  it('focuses the first interactive element when the dialog opens', () => {
    const first = { focus: vi.fn() } as unknown as HTMLElement
    const dialog = createDialog([first])

    focusInitialElement(dialog)

    expect(first.focus).toHaveBeenCalledOnce()
  })

  it('traps forward and reverse Tab navigation within the dialog', () => {
    const first = { focus: vi.fn() } as unknown as HTMLElement
    const last = { focus: vi.fn() } as unknown as HTMLElement
    const dialog = createDialog([first, last])
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { activeElement: last },
    })
    const forwardEvent = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() }

    handleDialogKeyDown(dialog, forwardEvent, vi.fn())

    expect(forwardEvent.preventDefault).toHaveBeenCalledOnce()
    expect(first.focus).toHaveBeenCalledOnce()

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { activeElement: first },
    })
    const reverseEvent = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() }

    handleDialogKeyDown(dialog, reverseEvent, vi.fn())

    expect(reverseEvent.preventDefault).toHaveBeenCalledOnce()
    expect(last.focus).toHaveBeenCalledOnce()
    Reflect.deleteProperty(globalThis, 'document')
  })

  it('closes on Escape and prevents the browser default action', () => {
    const onEscape = vi.fn()
    const dialog = createDialog([])
    const event = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() }

    handleDialogKeyDown(dialog, event, onEscape)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(onEscape).toHaveBeenCalledOnce()
  })
})
