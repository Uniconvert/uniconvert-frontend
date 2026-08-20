import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCachedExchangeRate, setCachedExchangeRate } from './exchangeRateCache'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('exchange rate cache', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createStorage() })
  })

  it('stores and reads a valid rate for the exact currency pair', () => {
    setCachedExchangeRate({
      available: true,
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
    })

    expect(getCachedExchangeRate('USD', 'KRW')).toMatchObject({
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
    })
  })

  it('does not reuse a cached rate for a different pair', () => {
    setCachedExchangeRate({ available: true, fromCurrency: 'USD', toCurrency: 'KRW', rate: 1415.2 })

    expect(getCachedExchangeRate('EUR', 'KRW')).toBeNull()
  })

  it('does not cache unavailable or invalid rates', () => {
    expect(setCachedExchangeRate({ available: false, fromCurrency: 'USD', toCurrency: 'KRW', rate: 1415.2 })).toBeNull()
    expect(setCachedExchangeRate({ available: true, fromCurrency: 'USD', toCurrency: 'KRW', rate: 0 })).toBeNull()
    expect(getCachedExchangeRate('USD', 'KRW')).toBeNull()
  })

  it('does not let an invalid response overwrite a valid pair cache', () => {
    setCachedExchangeRate({
      available: true,
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
    })

    expect(setCachedExchangeRate({ available: false, fromCurrency: 'USD', toCurrency: 'KRW', rate: 999 })).toBeNull()
    expect(getCachedExchangeRate('USD', 'KRW')).toMatchObject({ rate: 1415.2, rateDate: '2026-08-18' })
  })

  it('ignores malformed stored values', () => {
    const storage = (window as Window).localStorage
    storage.setItem('uniconvert:exchange-rate:USD:KRW', '{not-json')

    expect(getCachedExchangeRate('USD', 'KRW')).toBeNull()
  })
})
