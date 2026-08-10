import { useEffect, useState } from 'react'

import {
  getSessionUser,
  SESSION_USER_CHANGED_EVENT,
} from '@/auth/session'

export function useSessionUser() {
  const [sessionUser, setSessionUser] = useState(getSessionUser)

  useEffect(() => {
    const syncSessionUser = () => setSessionUser(getSessionUser())

    window.addEventListener(SESSION_USER_CHANGED_EVENT, syncSessionUser)
    window.addEventListener('storage', syncSessionUser)

    return () => {
      window.removeEventListener(SESSION_USER_CHANGED_EVENT, syncSessionUser)
      window.removeEventListener('storage', syncSessionUser)
    }
  }, [])

  return sessionUser
}
