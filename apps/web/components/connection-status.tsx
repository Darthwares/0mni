'use client'

import { useOmniAuth, type ConnectionState } from '@/hooks/use-omni-auth'
import { useEffect, useState } from 'react'

const STATUS_CONFIG: Record<
  ConnectionState,
  { label: string; color: string; pulse: boolean; visible: boolean }
> = {
  connected: { label: 'Connected', color: 'bg-emerald-500', pulse: false, visible: false },
  connecting: { label: 'Connecting...', color: 'bg-amber-500', pulse: true, visible: true },
  reconnecting: { label: 'Reconnecting...', color: 'bg-amber-500', pulse: true, visible: true },
  error: { label: 'Connection lost', color: 'bg-red-500', pulse: false, visible: true },
  disconnected: { label: 'Disconnected', color: 'bg-neutral-500', pulse: false, visible: false },
}

export function ConnectionStatus() {
  const { connectionState, reconnect, error } = useOmniAuth()
  const [showConnected, setShowConnected] = useState(false)

  // Briefly flash "Connected" when reconnection succeeds
  useEffect(() => {
    if (connectionState === 'connected') {
      setShowConnected(true)
      const timer = setTimeout(() => setShowConnected(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [connectionState])

  const config = STATUS_CONFIG[connectionState]
  const isVisible = config.visible || showConnected

  if (!isVisible) return null

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.color} opacity-75`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            showConnected && connectionState === 'connected'
              ? 'bg-emerald-500'
              : config.color
          }`}
        />
      </span>
      <span className="text-neutral-400">
        {showConnected && connectionState === 'connected'
          ? 'Connected'
          : config.label}
      </span>
      {connectionState === 'error' && (
        <button
          onClick={reconnect}
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
