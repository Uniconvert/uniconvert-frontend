import { useCallback, useEffect } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface CalendarKeyboardEvent {
  key: string
  preventDefault: () => void
}

export interface CalendarKeyboardConfig {
  dayCount: number
  currentIndex: number
  onClose: () => void
  onFocusDay: (index: number) => void
  onRestoreFocus: () => void
}

export function getCalendarNavigationIndex(
  currentIndex: number,
  dayCount: number,
  key: string,
) {
  if (dayCount <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return dayCount - 1

  const offset = key === 'ArrowLeft'
    ? -1
    : key === 'ArrowRight'
      ? 1
      : key === 'ArrowUp'
        ? -7
        : key === 'ArrowDown'
          ? 7
          : 0
  if (offset === 0) return null

  const nextIndex = currentIndex + offset
  return nextIndex >= 0 && nextIndex < dayCount ? nextIndex : null
}

export function handleCalendarKeyDown(
  event: CalendarKeyboardEvent,
  config: CalendarKeyboardConfig,
) {
  if (event.key === 'Escape') {
    event.preventDefault()
    config.onClose()
    config.onRestoreFocus()
    return
  }

  const nextIndex = getCalendarNavigationIndex(
    config.currentIndex,
    config.dayCount,
    event.key,
  )
  if (nextIndex === null) return

  event.preventDefault()
  config.onFocusDay(nextIndex)
}

interface UseCalendarKeyboardOptions {
  open: boolean
  dayCount: number
  selectedIndex: number
  calendarId: string
  triggerId: string
  onClose: () => void
}

export function useCalendarKeyboard({
  open,
  dayCount,
  selectedIndex,
  calendarId,
  triggerId,
  onClose,
}: UseCalendarKeyboardOptions) {
  const focusTrigger = useCallback(() => {
    document.getElementById(triggerId)?.focus()
  }, [triggerId])

  const focusDay = useCallback((index: number) => {
    const dayButton = document.getElementById(calendarId)?.querySelector<HTMLButtonElement>(
      `[data-calendar-index="${index}"]`,
    )
    dayButton?.focus()
  }, [calendarId])

  useEffect(() => {
    if (!open) {
      focusTrigger()
      return
    }

    const focusSelectedDay = () => {
      const safeIndex = selectedIndex >= 0 && selectedIndex < dayCount ? selectedIndex : 0
      focusDay(safeIndex)
    }

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      focusSelectedDay()
      return
    }

    const frame = window.requestAnimationFrame(focusSelectedDay)
    return () => window.cancelAnimationFrame(frame)
  }, [dayCount, focusDay, focusTrigger, open, selectedIndex])

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const currentIndex = Number(target.dataset.calendarIndex ?? selectedIndex)
    handleCalendarKeyDown(event, {
      dayCount,
      currentIndex: Number.isFinite(currentIndex) ? currentIndex : selectedIndex,
      onClose,
      onFocusDay: focusDay,
      onRestoreFocus: focusTrigger,
    })
  }, [dayCount, focusDay, focusTrigger, onClose, selectedIndex])

  return { onKeyDown }
}

export function formatCalendarDateLabel(value: string, locale: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
}
