import { getOnboardingSettings } from '@/auth/session'
import { getMockHomeCurrency, getMockMonthlyBudget } from '@/mocks/mockScenario'
import {
  convertCurrencyAmount,
  formatConvertedCurrencyAmount,
} from '@/utils/exchangeRate'

const currencySymbols: Record<string, string> = {
  KRW: '₩',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
  GBP: '£',
}

export interface MockAssetSummary {
  homeCurrency: string
  currencySymbol: string
  totalAssetHome: number
  localCurrency: string
  localCurrencyAmount: number
  localCurrencyAmountLabel: string
}

export function getMockAssetSummary(): MockAssetSummary {
  const homeCurrency = getMockHomeCurrency()
  const monthlyBudget = getMockMonthlyBudget()
  const selectedLocalCurrencies = getOnboardingSettings().localCurrencies ?? []
  const localCurrency = selectedLocalCurrencies[0] ?? (homeCurrency === 'KRW' ? 'USD' : 'KRW')
  const localCurrencyAmount = convertCurrencyAmount(monthlyBudget, homeCurrency, localCurrency)

  return {
    homeCurrency,
    currencySymbol: currencySymbols[homeCurrency] ?? homeCurrency,
    totalAssetHome: monthlyBudget,
    localCurrency,
    localCurrencyAmount,
    localCurrencyAmountLabel: formatConvertedCurrencyAmount(localCurrencyAmount, localCurrency),
  }
}
