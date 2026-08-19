import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequestMock, setTimeoutMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  setTimeoutMock: vi.fn(),
}))

vi.mock('./client', () => ({ apiRequest: apiRequestMock }))

import { getCurrentExchangeRate, mapExchangeRateResponse } from './exchangeRates'

describe('current exchange rate response mapping', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
    setTimeoutMock.mockReset()
    vi.stubGlobal('window', { setTimeout: setTimeoutMock })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('infers availability from a valid rate when the API data omits available', () => {
    expect(mapExchangeRateResponse({
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
      changeRate: 0.02,
    })).toMatchObject({
      available: true,
      rate: 1415.2,
    })
  })

  it('maps the already-unwrapped API data without a second data unwrap', async () => {
    apiRequestMock.mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
      changeRate: 0.02,
    })

    await expect(getCurrentExchangeRate('usd', 'krw')).resolves.toMatchObject({
      available: true,
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
    })
    expect(apiRequestMock).toHaveBeenCalledWith('/exchange-rates/current?from=USD&to=KRW')
  })
})
