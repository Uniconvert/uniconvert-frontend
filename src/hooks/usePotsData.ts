import { useCallback, useEffect, useState } from 'react'

import { getPots } from '@/api/pots'
import type { PotsData } from '@/types/pot'
import { getApiErrorNotice } from '@/utils/apiError'

export function usePotsData() {
  const [data, setData] = useState<PotsData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const refetch = useCallback(async () => {
    const response = await getPots()
    setData(response)
    setErrorMessage('')
    return response
  }, [])

  useEffect(() => {
    let isActive = true

    getPots()
      .then((response) => {
        if (!isActive) return
        setData(response)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!isActive) return
        setErrorMessage(getApiErrorNotice(error, 'Pots 정보를 불러오지 못했습니다.').title)
      })

    return () => {
      isActive = false
    }
  }, [])

  return { data, setData, errorMessage, refetch }
}
