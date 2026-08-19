export const CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'CNY', 'KRW'] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export interface CurrencyMetadata {
  code: CurrencyCode
  minorUnit: 0 | 2
  maximumFractionDigits: 0 | 2
  step: number
}

export const CURRENCY_METADATA: Record<CurrencyCode, CurrencyMetadata> = {
  USD: { code: 'USD', minorUnit: 2, maximumFractionDigits: 2, step: 0.01 },
  EUR: { code: 'EUR', minorUnit: 2, maximumFractionDigits: 2, step: 0.01 },
  JPY: { code: 'JPY', minorUnit: 0, maximumFractionDigits: 0, step: 1 },
  CNY: { code: 'CNY', minorUnit: 2, maximumFractionDigits: 2, step: 0.01 },
  KRW: { code: 'KRW', minorUnit: 0, maximumFractionDigits: 0, step: 1 },
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toUpperCase()
  return CURRENCY_CODES.some((code) => code === normalized)
}

export function normalizeCurrencyCode(
  value: unknown,
  fallback: CurrencyCode = 'USD',
): CurrencyCode {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return CURRENCY_CODES.find((code) => code === normalized) ?? fallback
}

export function getCurrencyMetadata(currency: string): CurrencyMetadata {
  return CURRENCY_METADATA[normalizeCurrencyCode(currency)]
}

/** Pots and budget sliders keep the existing coarse KRW step, while other currencies use whole units. */
export function getPotSliderStep(currency: string) {
  return normalizeCurrencyCode(currency) === 'KRW' ? 10_000 : 1
}
