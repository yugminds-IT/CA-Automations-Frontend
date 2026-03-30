'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

type Status = 'online' | 'offline' | 'restored'

export function NetworkStatus() {
  const [status, setStatus] = useState<Status>('online')

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout>

    const goOffline = () => {
      clearTimeout(restoreTimer)
      setStatus('offline')
    }

    const goOnline = () => {
      if (status === 'offline') {
        setStatus('restored')
        restoreTimer = setTimeout(() => setStatus('online'), 3000)
      }
    }

    // Browser online/offline events
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    // Custom event fired by the API interceptor on fetch failure (status 0)
    const handleApiNetworkError = () => {
      if (navigator.onLine === false) goOffline()
      else goOffline() // server unreachable even if OS thinks it's online
    }
    window.addEventListener('api-network-error', handleApiNetworkError)

    return () => {
      clearTimeout(restoreTimer)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('api-network-error', handleApiNetworkError)
    }
  }, [status])

  if (status === 'online') return null

  if (status === 'restored') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <Wifi className="h-4 w-4 shrink-0" />
        Back online — connection restored
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        <strong>Network connection lost.</strong> Please check your internet connection — changes won&apos;t be saved until you&apos;re back online.
      </span>
    </div>
  )
}
