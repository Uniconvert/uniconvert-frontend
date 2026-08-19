import { getCurrencyMetadata } from '@/types/currency'

const currencyLocales: Record<string, string> = {
  KRW: 'ko-KR',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  GBP: 'en-GB',
}

export function getCurrencyLocale(currency: string) {
  return currencyLocales[currency.trim().toUpperCase()] ?? 'en-US'
}

/** Returns a canonical dot-decimal string while enforcing the currency minor-unit rule. */
export function normalizeCurrencyAmountInput(value: string, currency: string) {
  const { maximumFractionDigits } = getCurrencyMetadata(currency)
  const stripped = value.replace(/[^\d.,]/g, '')
  if (!stripped) return ''

  if (maximumFractionDigits === 0) return stripped.replace(/\D/g, '')

  const locale = getCurrencyLocale(currency)
  const decimalSeparator = new Intl.NumberFormat(locale).formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.'
  const groupingSeparator = decimalSeparator === '.' ? ',' : '.'

  if (stripped.includes(decimalSeparator)) {
    const [integerPart, ...fractionParts] = stripped.split(decimalSeparator)
    const integerDigits = integerPart.replaceAll(groupingSeparator, '').replace(/\D/g, '')
    const fractionDigits = fractionParts.join('').replace(/\D/g, '').slice(0, maximumFractionDigits)
    return fractionDigits.length > 0
      ? `${integerDigits || '0'}.${fractionDigits}`
      : `${integerDigits || '0'}.`
  }

  // A decimal separator from another locale is accepted when it already has a valid precision.
  const alternateSeparator = decimalSeparator === '.' ? ',' : '.'
  const alternateIndex = stripped.lastIndexOf(alternateSeparator)
  if (alternateIndex >= 0) {
    const integerDigits = stripped.slice(0, alternateIndex).replace(/\D/g, '')
    const fractionDigits = stripped.slice(alternateIndex + 1).replace(/\D/g, '')
    if (fractionDigits.length > 0 && fractionDigits.length <= maximumFractionDigits) {
      return `${integerDigits || '0'}.${fractionDigits}`
    }
  }

  return stripped.replace(/\D/g, '')
}

export function normalizeCurrencyAmount(value: number, currency: string, min: number, max: number) {
  const { minorUnit } = getCurrencyMetadata(currency)
  const factor = 10 ** minorUnit
  const rounded = Math.round(value * factor) / factor
  return Math.min(Math.max(rounded, min), max)
}
