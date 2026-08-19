import { describe, expect, it, vi } from 'vitest'
import { executeManualEmailReport } from './manualEmailReport'

describe('manual email report action', () => {
  it('does not duplicate a pending send', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const onError = vi.fn()

    const result = await executeManualEmailReport({
      isPending: true,
      send,
      onSuccess,
      onError,
    })

    expect(result).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls the sender and success feedback only for a manual action', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const result = await executeManualEmailReport({
      isPending: false,
      send,
      onSuccess,
      onError: vi.fn(),
    })

    expect(result).toBe(true)
    expect(send).toHaveBeenCalledOnce()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('routes failures to generic UI feedback without rethrowing provider details', async () => {
    const failure = new Error('provider response body')
    const onError = vi.fn()

    const result = await executeManualEmailReport({
      isPending: false,
      send: vi.fn().mockRejectedValue(failure),
      onSuccess: vi.fn(),
      onError,
    })

    expect(result).toBe(false)
    expect(onError).toHaveBeenCalledWith(failure)
  })
})

