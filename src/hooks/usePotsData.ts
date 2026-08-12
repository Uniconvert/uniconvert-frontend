import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPots } from '@/api/pots'
import type { PotsData } from '@/types/pot'
import { getApiErrorNotice } from '@/utils/apiError'

export function usePotsData() {
  const queryClient = useQueryClient()
  const query = useQuery<PotsData, unknown>({ queryKey: ['pots'], queryFn: getPots })
  const refetch = useCallback(async () => {
    const response = await query.refetch()
    return response.data as PotsData
  }, [query])
  const setData = useCallback((next: PotsData | null | ((current: PotsData | null) => PotsData | null)) => {
    queryClient.setQueryData<PotsData | null>(['pots'], (current) => (
      typeof next === 'function' ? next(current ?? null) : next
    ))
  }, [queryClient])

  return {
    data: query.data ?? null,
    setData,
    errorMessage: query.error ? getApiErrorNotice(query.error, 'Pots 정보를 불러오지 못했습니다.').title : '',
    refetch,
  }
}
