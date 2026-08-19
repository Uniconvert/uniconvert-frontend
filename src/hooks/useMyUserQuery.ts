import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyUser, updateMyProfile, type UpdateMyProfileInput } from '@/api/users'
import { userKeys } from './userKeys'

export function useMyUserQuery(enabled = true) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: userKeys.current, queryFn: getMyUser, staleTime: 300_000, refetchOnMount: false, enabled })
  const updateMutation = useMutation({
    mutationFn: (input: UpdateMyProfileInput) => updateMyProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.current, user)
    },
  })
  return {
    ...query,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
