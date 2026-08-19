export interface ManualEmailReportAction {
  isPending: boolean
  send: () => Promise<unknown>
  onSuccess: () => void
  onError: (error: unknown) => void
}

/** 버튼 action의 단일 진입점입니다. 예약/시간 변경 등에서는 호출되지 않습니다. */
export async function executeManualEmailReport({
  isPending,
  send,
  onSuccess,
  onError,
}: ManualEmailReportAction): Promise<boolean> {
  if (isPending) return false

  try {
    await send()
    onSuccess()
    return true
  } catch (error) {
    onError(error)
    return false
  }
}

