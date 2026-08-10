import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatCurrencyAmount, getCurrentYearMonth } from './currency'

describe('currency', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('통화에 맞는 기호와 천 단위 구분자를 사용한다', () => {
    expect(formatCurrencyAmount(1_350_000, 'KRW')).toContain('1,350,000')
    expect(formatCurrencyAmount(1_350_000, 'KRW')).toContain('₩')
  })

  it('브라우저 현지 시간 기준의 연월을 반환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 9, 12, 0, 0))

    expect(getCurrentYearMonth()).toBe('2026-08')
  })
})
