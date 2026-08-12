import { apiRequest } from './client'

export interface ExchangeRateDto {
  available: boolean
  fromCurrency?: string
  toCurrency?: string
  rate?: number | null
  rateDate?: string | null
  changeRate?: number | null
  comparedDate?: string | null
}

export interface ExchangeQuoteDto {
  available: boolean
  fromCurrency?: string
  toCurrency?: string
  amount?: number
  appliedRate?: number | null
  convertedAmount?: number | null
  rateDate?: string | null
}

export interface ExchangeQuoteHistoryDto {
  id?: number
  fromCurrency?: string
  toCurrency?: string
  amount?: number
  convertedAmount?: number
  appliedRate?: number
  createdAt?: string
}

interface ExchangeQuoteHistoryPageDto {
  content?: ExchangeQuoteHistoryDto[]
  totalElements?: number
  totalPages?: number
  number?: number
  last?: boolean
}

export function getCurrentExchangeRate(from: string, to: string) {
  const normalizedFrom = from.toUpperCase()
  const normalizedTo = to.toUpperCase()

  if (normalizedFrom === normalizedTo) {
    return Promise.resolve<ExchangeRateDto>({
      available: true,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
      rate: 1,
      rateDate: new Date().toISOString().slice(0, 10),
    })
  }

  const params = new URLSearchParams({ from: normalizedFrom, to: normalizedTo })
  const key = `${normalizedFrom}:${normalizedTo}`
  const cached = exchangeRateRequests.get(key)
  if (cached) return cached
  const request = apiRequest<ExchangeRateDto>(
    `/exchange-rates/current?${params.toString()}`,
  )
  exchangeRateRequests.set(key, request)
  window.setTimeout(() => exchangeRateRequests.delete(key), 5_000)
  return request
}

export function getExchangeQuote(from: string, to: string, amount: number, date?: string) {
  const normalizedFrom = from.toUpperCase()
  const normalizedTo = to.toUpperCase()
  if (normalizedFrom === normalizedTo) {
    return Promise.resolve<ExchangeQuoteDto>({
      available: true,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
      amount,
      appliedRate: 1,
      convertedAmount: amount,
      rateDate: date ?? new Date().toISOString().slice(0, 10),
    })
  }

  const params = new URLSearchParams({
    from: normalizedFrom,
    to: normalizedTo,
    amount: String(amount),
  })
  if (date) params.set('date', date)

  return apiRequest<ExchangeQuoteDto>(
    `/exchange-rates/quote?${params.toString()}`,
  )
}
const exchangeRateRequests = new Map<string, Promise<ExchangeRateDto>>()

export async function getExchangeQuoteHistory(page = 0, size = 10) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const response = await apiRequest<ExchangeQuoteHistoryPageDto>(
    `/exchange-rates/quote/history?${params.toString()}`,
  )
  return response.content ?? []
}
