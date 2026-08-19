import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getEmailReportSetting, updateEmailReportSetting, type EmailReportSettingDto } from '@/api/users'
import { emailReportKeys } from '@/features/settings/emailReportKeys'

export function useEmailReportSetting() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: emailReportKeys.setting(),
    queryFn: getEmailReportSetting,
  })
  const updateMutation = useMutation({
    mutationFn: (data: EmailReportSettingDto) => updateEmailReportSetting(data),
    onSuccess: (data) => {
      queryClient.setQueryData(emailReportKeys.setting(), data)
    },
  })

  return {
    query,
    updateSetting: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
