import { CURRENCY_OPTIONS } from '@/components/onboarding/CurrencySelection/currencyOptions'
import type { CurrencyOption } from '@/components/onboarding/CurrencySelection/CurrencySelection'
import { apiRequest } from './client'

interface CurrencyResponseDto {
  code?: string | null
  koreanName?: string | null
  englishName?: string | null
  symbol?: string | null
}

export async function getCurrencies(): Promise<CurrencyOption[]> {
  const response = await apiRequest<CurrencyResponseDto[]>('/currencies')

  const currencies = response
    .filter((item): item is CurrencyResponseDto & { code: string } => Boolean(item.code?.trim()))
    .map((item) => ({
      code: item.code.trim().toUpperCase(),
      name: item.koreanName?.trim() || item.englishName?.trim() || item.code.trim().toUpperCase(),
      symbol: item.symbol?.trim() || item.code.trim().toUpperCase(),
    }))

  return currencies.length > 0 ? currencies : [...CURRENCY_OPTIONS]
}
