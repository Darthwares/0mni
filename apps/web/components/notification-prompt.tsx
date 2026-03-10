'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, X } from 'lucide-react'

export function NotificationPrompt() {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!isSupported || permission !== 'default') return
    // Show after short delay for better UX
    const stored = localStorage.getItem('omni-notif-dismissed')
    if (stored) return
    const timer = setTimeout(() => setDismissed(false), 3000)
    return () => clearTimeout(timer)
  }, [isSupported, permission])

  if (dismissed || !isSupported || permission !== 'default') return null

  const handleEnable = async () => {
    await requestPermission()
    setDismissed(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('omni-notif-dismissed', '1')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
            <Bell className="size-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">Stay in the loop</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get notified about ticket assignments, mentions, and activity updates.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleEnable} className="h-7 text-xs gap-1.5">
                <Bell className="size-3" />
                Enable notifications
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-7 text-xs">
                Not now
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
