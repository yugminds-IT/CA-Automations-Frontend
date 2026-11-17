'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from '@/lib/api/client'
import { API_CONFIG } from '@/lib/api/config'

let socket: Socket | null = null

/** Lazily creates (or reuses) a single shared socket connection for the whole app. */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null

  const token = getAccessToken()
  if (!token) return null

  if (!socket) {
    socket = io(API_CONFIG.baseUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    })
  }

  if (!socket.connected && !socket.active) {
    socket.auth = { token }
  }

  if (!socket.connected) {
    socket.connect()
  }

  return socket
}

/** Disconnects and clears the shared socket — call this on logout. */
export function disconnectRealtime(): void {
  socket?.disconnect()
  socket = null
}

/** Subscribes to a realtime event for the lifetime of the component. Connects the shared socket lazily. */
export function useRealtimeEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const instance = getSocket()
    if (!instance) return

    const listener = (payload: T) => handlerRef.current(payload)
    instance.on(event, listener)

    return () => {
      instance.off(event, listener)
    }
  }, [event])
}
