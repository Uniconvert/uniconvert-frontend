import { isCurrencyCode, type CurrencyCode } from '@/types/currency'
import type { ExchangeRateDto } from '@/api/exchangeRates'

export interface CachedExchangeRate {
  fromCurrency: CurrencyCode
  toCurrency: CurrencyCode
  rate: number
  rateDate: string
  cachedAt: number
}

const CACHE_KEY_PREFIX = 'uniconvert:exchange-rate:'

function getCacheKey(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  return `${CACHE_KEY_PREFIX}${fromCurrency}:${toCurrency}`
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function isValidCachedExchangeRate(
  value: unknown,
  fromCurrency?: CurrencyCode,
  toCurrency?: CurrencyCode,
): value is CachedExchangeRate {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<CachedExchangeRate>
  return (
    isCurrencyCode(candidate.fromCurrency) &&
    isCurrencyCode(candidate.toCurrency) &&
    (fromCurrency === undefined || candidate.fromCurrency === fromCurrency) &&
    (toCurrency === undefined || candidate.toCurrency === toCurrency) &&
    typeof candidate.rate === 'number' &&
    Number.isFinite(candidate.rate) &&
    candidate.rate > 0 &&
    typeof candidate.rateDate === 'string' &&
    typeof candidate.cachedAt === 'number' &&
    Number.isFinite(candidate.cachedAt) &&
    candidate.cachedAt > 0
  )
}

export function getCachedExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): CachedExchangeRate | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const rawValue = storage.getItem(getCacheKey(fromCurrency, toCurrency))
    if (!rawValue) return null
    const parsedValue: unknown = JSON.parse(rawValue)
    return isValidCachedExchangeRate(parsedValue, fromCurrency, toCurrency) ? parsedValue : null
  } catch {
    return null
  }
}

export function setCachedExchangeRate(rate: ExchangeRateDto): CachedExchangeRate | null {
  const fromCurrency = isCurrencyCode(rate.fromCurrency) ? rate.fromCurrency : null
  const toCurrency = isCurrencyCode(rate.toCurrency) ? rate.toCurrency : null
  const numericRate = rate.rate
  if (!fromCurrency || !toCurrency || rate.available === false || typeof numericRate !== 'number' || !Number.isFinite(numericRate) || numericRate <= 0) return null

  const cachedRate: CachedExchangeRate = {
    fromCurrency,
    toCurrency,
    rate: numericRate,
    rateDate: rate.rateDate ?? '',
    cachedAt: Date.now(),
  }
  const storage = getStorage()
  if (!storage) return cachedRate

  try {
    storage.setItem(getCacheKey(fromCurrency, toCurrency), JSON.stringify(cachedRate))
  } catch {
    // Storage can be unavailable in private browsing or when it is full.
  }
  return cachedRate
}
