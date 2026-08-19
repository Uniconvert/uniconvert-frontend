import { describe, expect, it, vi } from 'vitest'

import { formatCalendarDateLabel, getCalendarNavigationIndex, handleCalendarKeyDown } from './useCalendarKeyboard'

function createEvent(key: string) {
  return { key, preventDefault: vi.fn() }
}

describe('calendar keyboard contract', () => {
  it('moves between dates with horizontal and vertical arrow keys', () => {
    expect(getCalendarNavigationIndex(10, 31, 'ArrowLeft')).toBe(9)
    expect(getCalendarNavigationIndex(10, 31, 'ArrowRight')).toBe(11)
    expect(getCalendarNavigationIndex(10, 31, 'ArrowUp')).toBe(3)
    expect(getCalendarNavigationIndex(10, 31, 'ArrowDown')).toBe(17)
  })

  it('supports Home and End while keeping focus inside the current month', () => {
    expect(getCalendarNavigationIndex(10, 31, 'Home')).toBe(0)
    expect(getCalendarNavigationIndex(10, 31, 'End')).toBe(30)
    expect(getCalendarNavigationIndex(0, 31, 'ArrowLeft')).toBeNull()
    expect(getCalendarNavigationIndex(30, 31, 'ArrowDown')).toBeNull()
  })

  it('closes on Escape and restores focus to the trigger', () => {
    const onClose = vi.fn()
    const onRestoreFocus = vi.fn()
    const event = createEvent('Escape')

    handleCalendarKeyDown(event, {
      dayCount: 31,
      currentIndex: 10,
      onClose,
      onFocusDay: vi.fn(),
      onRestoreFocus,
    })

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onRestoreFocus).toHaveBeenCalledOnce()
  })

  it('produces a meaningful accessible date label', () => {
    expect(formatCalendarDateLabel('2026-08-18', 'en-US')).toContain('August 18, 2026')
  })
})
