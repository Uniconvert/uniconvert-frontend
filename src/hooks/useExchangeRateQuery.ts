import { useQuery } from '@tanstack/react-query'
import { getCurrentExchangeRate } from '@/api/exchangeRates'
import { exchangeRateKeys } from './exchangeRateKeys'

interface UseExchangeRateQueryOptions {
  enabled?: boolean
}

export function useExchangeRateQuery(from: string, to: string, options: UseExchangeRateQueryOptions = {}) {
  return useQuery({
    queryKey: exchangeRateKeys.current(from, to),
    queryFn: () => getCurrentExchangeRate(from, to),
    enabled: Boolean(from && to) && (options.enabled ?? true),
  })
}
