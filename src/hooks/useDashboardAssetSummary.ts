import { useEffect, useState } from 'react'

import { getBudget, isUsingMockBudgetApi } from '@/api/budgets'
import { getCurrentExchangeRate } from '@/api/exchangeRates'
import { getMyUser } from '@/api/users'
import { getOnboardingSettings } from '@/auth/session'
import { getMockAssetSummary } from '@/mocks/dashboardStore'
import { formatConvertedCurrencyAmount } from '@/utils/exchangeRate'

const currencySymbols: Record<string, string> = {
  KRW: '₩',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
}

interface UseDashboardAssetSummaryOptions {
  yearMonth: string
  onError: () => void
}

export function useDashboardAssetSummary({
  yearMonth,
  onError,
}: UseDashboardAssetSummaryOptions) {
  const [assetSummary, setAssetSummary] = useState(getMockAssetSummary)

  useEffect(() => {
    if (isUsingMockBudgetApi) return

    let isActive = true

    Promise.all([
      getBudget(yearMonth),
      getMyUser({ useMock: false }),
    ])
      .then(async ([budget, user]) => {
        const settings = getOnboardingSettings()
        const homeCurrency = user.homeCurrencyCode || settings.baseCurrency || 'KRW'
        const localCurrency = user.localCurrencyCode
          || settings.localCurrencies?.[0]
          || (homeCurrency === 'KRW' ? 'USD' : 'KRW')
        const monthlyBudget = budget.monthlyLimitHome ?? 0
        const exchange = await getCurrentExchangeRate(homeCurrency, localCurrency)
          .catch(() => null)
        const exchangeRate = typeof exchange?.rate === 'number' ? exchange.rate : null
        const hasAvailableRate = exchange?.available !== false && exchangeRate !== null
        const localCurrencyAmount = hasAvailableRate
          ? monthlyBudget * exchangeRate
          : 0

        if (!isActive) return
        setAssetSummary({
          homeCurrency,
          currencySymbol: currencySymbols[homeCurrency] ?? homeCurrency,
          totalAssetHome: monthlyBudget,
          localCurrency,
          localCurrencyAmount,
          localCurrencyAmountLabel: hasAvailableRate
            ? formatConvertedCurrencyAmount(localCurrencyAmount, localCurrency)
            : '환율 정보 없음',
        })
      })
      .catch(() => {
        if (isActive) onError()
      })

    return () => {
      isActive = false
    }
  }, [onError, yearMonth])

  return { assetSummary, setAssetSummary }
}
