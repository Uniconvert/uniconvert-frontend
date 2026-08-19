import { getCurrencyMetadata } from '@/types/currency'

const currencyLocales: Record<string, string> = {
  KRW: 'ko-KR',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  GBP: 'en-GB',
}

export function formatCurrencyAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(currencyLocales[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: getCurrencyMetadata(currency).maximumFractionDigits,
  }).format(amount)
}

export function getCurrentYearMonth() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 7)
}
