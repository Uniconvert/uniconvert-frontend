export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'video[controls]',
  'audio[controls]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface DialogKeyboardEvent {
  key: string
  shiftKey: boolean
  preventDefault: () => void
}

export function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

export function focusInitialElement(dialog: HTMLElement): void {
  const firstFocusableElement = getFocusableElements(dialog)[0] ?? dialog
  firstFocusableElement.focus()
}

export function handleDialogKeyDown(
  dialog: HTMLElement,
  event: DialogKeyboardEvent,
  onEscape: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    onEscape()
    return
  }

  if (event.key !== 'Tab') return

  const focusableElements = getFocusableElements(dialog)
  if (focusableElements.length === 0) {
    event.preventDefault()
    dialog.focus()
    return
  }

  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  const activeElement = typeof document === 'undefined' ? null : document.activeElement

  if (event.shiftKey && activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
