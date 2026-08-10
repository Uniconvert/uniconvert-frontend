import { getExchangeRate } from '@/utils/exchangeRate'
import { apiRequest, isUsingMockApi } from './client'

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

export const isUsingMockExchangeApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_EXCHANGE_API !== 'true'

export function getCurrentExchangeRate(from: string, to: string) {
  const normalizedFrom = from.toUpperCase()
  const normalizedTo = to.toUpperCase()
  const mockRate = normalizedFrom === normalizedTo
    ? 1
    : getExchangeRate(normalizedFrom, normalizedTo)

  if (normalizedFrom === normalizedTo || isUsingMockExchangeApi) {
    return Promise.resolve<ExchangeRateDto>({
      available: true,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
      rate: mockRate,
      rateDate: new Date().toISOString().slice(0, 10),
    })
  }

  const params = new URLSearchParams({ from: normalizedFrom, to: normalizedTo })
  return apiRequest<ExchangeRateDto>(
    `/exchange-rates/current?${params.toString()}`,
    { data: { available: true, fromCurrency: normalizedFrom, toCurrency: normalizedTo, rate: mockRate } },
    { useMock: false },
  )
}

export function getExchangeQuote(from: string, to: string, amount: number, date?: string) {
  const normalizedFrom = from.toUpperCase()
  const normalizedTo = to.toUpperCase()
  const rate = normalizedFrom === normalizedTo ? 1 : getExchangeRate(normalizedFrom, normalizedTo)

  if (normalizedFrom === normalizedTo || isUsingMockExchangeApi) {
    return Promise.resolve<ExchangeQuoteDto>({
      available: true,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
      amount,
      appliedRate: rate,
      convertedAmount: amount * rate,
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
    { data: { available: true, amount, appliedRate: rate, convertedAmount: amount * rate } },
    { useMock: false },
  )
}

export async function getExchangeQuoteHistory(page = 0, size = 10) {
  if (isUsingMockExchangeApi) return []

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const response = await apiRequest<ExchangeQuoteHistoryPageDto>(
    `/exchange-rates/quote/history?${params.toString()}`,
    { data: { content: [], totalElements: 0, totalPages: 0, number: page, last: true } },
    { useMock: false },
  )
  return response.content ?? []
}
