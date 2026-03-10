'use client'

import { useState, useEffect, useCallback } from 'react'

export type NotificationPermission = 'default' | 'granted' | 'denied'

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then(setRegistration)
      .catch((err) => console.warn('SW registration failed:', err))
  }, [])

  return registration
}

export function useNotifications() {
  const registration = useServiceWorker()
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission as NotificationPermission)
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission
    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermission)
    return result as NotificationPermission
  }, [])

  const sendNotification = useCallback(
    (title: string, options?: { body?: string; tag?: string; url?: string }) => {
      if (permission !== 'granted') return

      // If page is visible, don't show notification (user is already looking)
      if (document.visibilityState === 'visible') return

      if (registration) {
        registration.showNotification(title, {
          body: options?.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: options?.tag || 'omni-notification',
          data: { url: options?.url || '/dashboard' },
        })
      } else {
        // Fallback to basic Notification API
        new Notification(title, {
          body: options?.body,
          icon: '/icon-192.png',
          tag: options?.tag,
        })
      }
    },
    [permission, registration]
  )

  return {
    permission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    requestPermission,
    sendNotification,
  }
}
