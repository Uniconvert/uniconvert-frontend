import { useEffect, useState } from 'react'

function getInitialOnlineStatus() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
