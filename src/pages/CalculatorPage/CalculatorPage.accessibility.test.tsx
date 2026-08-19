import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, useExchangeRateQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useExchangeRateQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }))
vi.mock('@/hooks/useExchangeRateQuery', () => ({ useExchangeRateQuery: useExchangeRateQueryMock }))
vi.mock('@/auth/session', () => ({ getOnboardingSettings: () => ({ localCurrencies: ['USD'], baseCurrency: 'KRW' }) }))
vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'en-US', t: (key: string) => key }),
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

describe('CalculatorPage accessibility', () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })
    useExchangeRateQueryMock.mockReturnValue({ data: { changeRate: 0 } })
  })

  it('connects visible amount and result labels to their inputs', () => {
    const markup = renderToStaticMarkup(<CalculatorPage />)

    expect(markup).toContain('for="calculator-from-amount"')
    expect(markup).toContain('id="calculator-from-amount"')
    expect(markup).toContain('for="calculator-to-amount"')
    expect(markup).toContain('id="calculator-to-amount"')
  })
})
