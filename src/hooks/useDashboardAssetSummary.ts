import { useEffect, useState } from 'react'

import { getCurrentExchangeRate } from '@/api/exchangeRates'
import { getOnboardingSettings } from '@/auth/session'
import { formatConvertedCurrencyAmount } from '@/utils/exchangeRate'
import { useBudgetQuery } from './useBudgetQuery'
import { useMyUserQuery } from './useMyUserQuery'

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

async function getRateInKrw(currency: string) {
  const normalizedCurrency = currency.toUpperCase()
  if (normalizedCurrency === 'KRW') return 1

  const exchange = await getCurrentExchangeRate(normalizedCurrency, 'KRW')
  const rate = typeof exchange.rate === 'number' ? exchange.rate : null

  if (exchange.available === false || rate === null || rate <= 0) return null
  return rate
}

async function convertBudgetToLocalCurrency(
  amount: number,
  homeCurrency: string,
  localCurrency: string,
) {
  const normalizedHomeCurrency = homeCurrency.toUpperCase()
  const normalizedLocalCurrency = localCurrency.toUpperCase()

  if (normalizedHomeCurrency === normalizedLocalCurrency) return amount

  // The exchange-rate API provides foreign-currency-to-KRW rates.
  // Convert through KRW so KRW-to-foreign and foreign-to-foreign pairs work too.
  const [homeRateInKrw, localRateInKrw] = await Promise.all([
    getRateInKrw(normalizedHomeCurrency),
    getRateInKrw(normalizedLocalCurrency),
  ])

  if (homeRateInKrw === null || localRateInKrw === null) return null
  return amount * homeRateInKrw / localRateInKrw
}

export function useDashboardAssetSummary({
  yearMonth,
  onError,
}: UseDashboardAssetSummaryOptions) {
  const budgetQuery = useBudgetQuery(yearMonth)
  const userQuery = useMyUserQuery()
  const [assetSummary, setAssetSummary] = useState({
    homeCurrency: 'KRW',
    currencySymbol: '₩',
    totalAssetHome: 0,
    localCurrency: 'USD',
    localCurrencyAmount: 0,
    localCurrencyAmountLabel: '환율 정보 없음',
  })

  useEffect(() => {
    if (!budgetQuery.data || !userQuery.data) return
    let isActive = true

    Promise.all([budgetQuery.data, userQuery.data])
      .then(([budget, user]) => {
        if (!budget || !user) throw new Error('dashboard data pending')
        return Promise.resolve([budget, user] as const)
      })
      .then(async ([budget, user]) => {
        const settings = getOnboardingSettings()
        const homeCurrency = user.homeCurrencyCode || settings.baseCurrency || 'KRW'
        const localCurrency = user.localCurrencyCode
          || settings.localCurrencies?.[0]
          || (homeCurrency === 'KRW' ? 'USD' : 'KRW')
        const monthlyBudget = budget.monthlyLimitHome ?? 0
        const convertedBudget = await convertBudgetToLocalCurrency(
          monthlyBudget,
          homeCurrency,
          localCurrency,
        ).catch(() => null)
        const hasAvailableRate = convertedBudget !== null
        const localCurrencyAmount = convertedBudget ?? 0

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
  }, [budgetQuery.data, onError, userQuery.data, yearMonth])

  return { assetSummary, setAssetSummary }
}
