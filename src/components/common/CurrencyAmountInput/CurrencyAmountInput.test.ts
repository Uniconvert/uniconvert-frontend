import { describe, expect, it } from 'vitest'
import {
  normalizeCurrencyAmount,
  normalizeCurrencyAmountInput,
} from './CurrencyAmountInput'

describe('CurrencyAmountInput amount rules', () => {
  it('zero-decimal currencies reject fractional digits', () => {
    expect(normalizeCurrencyAmountInput('12.34', 'KRW')).toBe('1234')
    expect(normalizeCurrencyAmount(12.6, 'JPY', 0, 10_000)).toBe(13)
  })

  it('fractional currencies preserve at most two minor-unit digits', () => {
    expect(normalizeCurrencyAmountInput('12.345', 'USD')).toBe('12.34')
    expect(normalizeCurrencyAmountInput('1.234,56', 'EUR')).toBe('1234.56')
    expect(normalizeCurrencyAmount(12.345, 'USD', 0, 100)).toBe(12.35)
  })

  it('invalid and empty input normalizes to an empty draft', () => {
    expect(normalizeCurrencyAmountInput('abc', 'USD')).toBe('')
    expect(normalizeCurrencyAmountInput('', 'USD')).toBe('')
  })
})
