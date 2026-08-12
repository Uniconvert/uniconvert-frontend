import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyUser, updateMyProfile, type UpdateMyProfileInput } from '@/api/users'
export function useMyUserQuery() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['me'], queryFn: getMyUser, staleTime: 300_000, refetchOnMount: false })
  const update = async (input: UpdateMyProfileInput) => { const user = await updateMyProfile(input); queryClient.setQueryData(['me'], user); return user }
  return { ...query, update }
}
