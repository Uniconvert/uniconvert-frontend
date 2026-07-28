const exchangeRatesInKrw: Record<string, number> = {
  KRW: 1,
  USD: 1499.07,
  EUR: 1711.83,
  JPY: 9.23,
  CNY: 207.65,
}

const zeroDecimalCurrencies = new Set(['KRW', 'JPY'])

export function getExchangeRate(sourceCurrency: string, targetCurrency: string) {
  const sourceRateInKrw = exchangeRatesInKrw[sourceCurrency] ?? 1
  const targetRateInKrw = exchangeRatesInKrw[targetCurrency] ?? 1
  return sourceRateInKrw / targetRateInKrw
}

export function convertCurrencyAmount(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
) {
  return amount * getExchangeRate(sourceCurrency, targetCurrency)
}

export function formatConvertedCurrencyAmount(amount: number, currency: string) {
  const fractionDigits = zeroDecimalCurrencies.has(currency) ? 0 : 2

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}
