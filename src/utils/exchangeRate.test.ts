import { describe, expect, it } from 'vitest'

import {
  convertCurrencyAmount,
  formatConvertedCurrencyAmount,
  getExchangeRate,
} from './exchangeRate'

describe('exchangeRate', () => {
  it('기준 통화가 같으면 환율은 1이다', () => {
    expect(getExchangeRate('USD', 'USD')).toBe(1)
  })

  it('두 통화의 원화 기준 환율로 금액을 변환한다', () => {
    expect(convertCurrencyAmount(100, 'USD', 'KRW')).toBeCloseTo(149_907)
    expect(convertCurrencyAmount(149_907, 'KRW', 'USD')).toBeCloseTo(100)
  })

  it('통화별 소수점 정책에 맞춰 금액을 표시한다', () => {
    expect(formatConvertedCurrencyAmount(1350, 'KRW')).toBe('₩1,350')
    expect(formatConvertedCurrencyAmount(1350.5, 'USD')).toBe('$1,350.50')
  })
})
