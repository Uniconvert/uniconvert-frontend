import { getMockHomeCurrency, getMockMonthlyBudget } from '@/mocks/mockScenario'

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
  secondaryLabel: string
}

export function getMockAssetSummary(): MockAssetSummary {
  const homeCurrency = getMockHomeCurrency()
  const monthlyBudget = getMockMonthlyBudget()

  return {
    homeCurrency,
    currencySymbol: currencySymbols[homeCurrency] ?? homeCurrency,
    totalAssetHome: monthlyBudget,
    secondaryLabel: monthlyBudget > 0 ? '월 예산' : '잔액 미설정',
  }
}
