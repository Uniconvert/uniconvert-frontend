import { getMockHomeCurrency, isSeededMockUser } from '@/mocks/mockScenario'

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
  const isSeeded = isSeededMockUser()

  return {
    homeCurrency,
    currencySymbol: currencySymbols[homeCurrency] ?? homeCurrency,
    totalAssetHome: isSeeded ? 1_250_000 : 0,
    secondaryLabel: isSeeded ? '$833.42' : '잔액 미설정',
  }
}
