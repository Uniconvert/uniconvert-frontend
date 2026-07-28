import { useCallback, useRef, useState } from 'react'
import type { ToastVariant } from './Toast'

export interface ToastMessage {
  variant: ToastVariant
  title: string
  description?: string
}

interface ToastQueueItem extends ToastMessage {
  id: number
}

export function useToastQueue() {
  const nextId = useRef(0)
  const [queue, setQueue] = useState<ToastQueueItem[]>([])

  const showToast = useCallback((message: ToastMessage) => {
    nextId.current += 1
    setQueue((current) => [...current, { ...message, id: nextId.current }])
  }, [])

  const closeToast = useCallback(() => {
    setQueue((current) => current.slice(1))
  }, [])

  return {
    toast: queue[0] ?? null,
    showToast,
    closeToast,
  }
}
