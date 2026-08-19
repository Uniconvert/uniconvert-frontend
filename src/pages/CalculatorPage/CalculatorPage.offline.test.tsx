import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, useExchangeRateQueryMock, useOnlineStatusMock, getCachedRateMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useExchangeRateQueryMock: vi.fn(),
  useOnlineStatusMock: vi.fn(),
  getCachedRateMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }))
vi.mock('@/hooks/useExchangeRateQuery', () => ({ useExchangeRateQuery: useExchangeRateQueryMock }))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: useOnlineStatusMock }))
vi.mock('@/features/calculator/exchangeRateCache', () => ({
  getCachedExchangeRate: getCachedRateMock,
  setCachedExchangeRate: vi.fn(),
}))
vi.mock('@/auth/session', () => ({ getOnboardingSettings: () => ({ localCurrencies: ['USD'], baseCurrency: 'KRW' }) }))
vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string, values?: Record<string, string | number>) => `${key}${values ? JSON.stringify(values) : ''}`,
  }),
}))
vi.mock('@/hooks/useListboxKeyboard', () => ({
  useListboxKeyboard: () => ({
    listboxId: 'calculator-listbox',
    activeDescendantId: undefined,
    onTriggerClick: vi.fn(),
    onTriggerKeyDown: vi.fn(),
    onOptionClick: vi.fn(),
    onOptionPointerMove: vi.fn(),
    getOptionId: (index: number) => `calculator-option-${index}`,
  }),
}))
vi.mock('@/components/common/FloatingMascot/FloatingMascot', () => ({ default: () => null }))

import CalculatorPage from './CalculatorPage'

describe('public offline calculator states', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/offline' } })
    useOnlineStatusMock.mockReturnValue(true)
    getCachedRateMock.mockReturnValue(null)
    useExchangeRateQueryMock.mockReturnValue({
      data: { available: true, fromCurrency: 'USD', toCurrency: 'KRW', rate: 1415.2, rateDate: '2026-08-18', changeRate: 0.02 },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    useQueryMock.mockImplementation((options: { queryKey: readonly unknown[] }) => options.queryKey[0] === 'exchange-quote'
      ? { data: undefined, error: null, isFetching: false }
      : { data: [], error: null, isLoading: false, isFetching: false, refetch: vi.fn() })
  })

  it('shows the live rate from the current exchange-rate query', () => {
    const markup = renderToStaticMarkup(<CalculatorPage />)

    expect(markup).toContain('calculator.liveRate')
    expect(markup).toContain('1,415.2')
  })

  it('uses only the selected pair cache while offline', () => {
    useOnlineStatusMock.mockReturnValue(false)
    getCachedRateMock.mockReturnValue({
      fromCurrency: 'USD',
      toCurrency: 'KRW',
      rate: 1415.2,
      rateDate: '2026-08-18',
      cachedAt: Date.now(),
    })

    const markup = renderToStaticMarkup(<CalculatorPage />)

    expect(getCachedRateMock).toHaveBeenCalledWith('USD', 'KRW')
    expect(markup).toContain('calculator.cachedRate')
    expect(markup).toContain('1,415.2')
  })

  it('shows an unavailable message offline when the selected pair is not cached', () => {
    useOnlineStatusMock.mockReturnValue(false)

    const markup = renderToStaticMarkup(<CalculatorPage />)

    expect(markup).toContain('calculator.noRateCacheDescription')
  })

  it('keeps the public offline view focused on conversion only', () => {
    const markup = renderToStaticMarkup(<CalculatorPage />)

    expect(markup).not.toContain('calculator.history')
    expect(markup).not.toContain('mascot-')
    expect(markup).not.toContain('/assets/')
    expect(markup).toContain('calculator.offlineTitle')
    expect(markup).toContain('calculator.onlineStatus')
    expect(markup).toContain('calculator.goHome')
  })
})
