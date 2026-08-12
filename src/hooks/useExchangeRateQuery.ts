import { useQuery } from '@tanstack/react-query'
import { getCurrentExchangeRate } from '@/api/exchangeRates'
export function useExchangeRateQuery(from: string, to: string) {
  return useQuery({
    queryKey: ['exchange-rate', from.toUpperCase(), to.toUpperCase()],
    queryFn: () => getCurrentExchangeRate(from, to),
    enabled: Boolean(from && to),
  })
}
