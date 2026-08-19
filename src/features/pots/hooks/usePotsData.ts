import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { allocatePotAmount, archivePot, createPot, getPots, updatePot } from '@/features/pots/api/pots'
import type { PotsData } from '@/features/pots/types'
import { getApiErrorNotice } from '@/utils/apiError'
import { potKeys } from '@/features/pots/potKeys'

export function usePotsData() {
  const queryClient = useQueryClient()
  const query = useQuery<PotsData, unknown>({ queryKey: potKeys.all, queryFn: getPots })
  const invalidatePots = () => queryClient.invalidateQueries({ queryKey: potKeys.all })
  const createMutation = useMutation({
    mutationFn: createPot,
    onSuccess: invalidatePots,
  })
  const updateMutation = useMutation({
    mutationFn: ({ potId, input }: { potId: string; input: Parameters<typeof updatePot>[1] }) => updatePot(potId, input),
    onSuccess: invalidatePots,
  })
  const allocateMutation = useMutation({
    mutationFn: ({ pot, amount }: { pot: Parameters<typeof allocatePotAmount>[0]; amount: number }) => allocatePotAmount(pot, amount),
    onSuccess: invalidatePots,
  })
  const archiveMutation = useMutation({
    mutationFn: (potId: string) => archivePot(potId),
    onSuccess: invalidatePots,
  })
  const refetch = useCallback(async () => {
    const response = await query.refetch()
    return response.data ?? null
  }, [query])
  const setData = useCallback((next: PotsData | null | ((current: PotsData | null) => PotsData | null)) => {
    queryClient.setQueryData<PotsData | null>(potKeys.all, (current) => (
      typeof next === 'function' ? next(current ?? null) : next
    ))
  }, [queryClient])

  return {
    data: query.data ?? null,
    setData,
    errorMessage: query.error && !query.data
      ? getApiErrorNotice(query.error, 'Pots 정보를 불러오지 못했습니다.').title
      : '',
    isInitialLoading: query.isLoading,
    isBackgroundFetching: query.isFetching,
    refetch,
    createPot: createMutation.mutateAsync,
    updatePot: updateMutation.mutateAsync,
    allocatePotAmount: allocateMutation.mutateAsync,
    archivePot: archiveMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending || allocateMutation.isPending || archiveMutation.isPending,
  }
}
