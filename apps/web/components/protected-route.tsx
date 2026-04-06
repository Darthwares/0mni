'use client'

import { useOmniAuth } from '@/hooks/use-omni-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isReady, connectionState, error } = useOmniAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Still loading OIDC state
  if (isLoading) {
    return <AuthShell message="Checking authentication..." />
  }

  // Not authenticated — redirecting to login
  if (!isAuthenticated) {
    return <AuthShell message="Redirecting to login..." />
  }

  // Authenticated but SpacetimeDB not ready yet — block children
  // This prevents useSpacetimeDB() calls before SpacetimeDBProvider exists
  if (!isReady) {
    return (
      <AuthShell
        message={
          connectionState === 'error'
            ? 'Connection error — retrying...'
            : 'Connecting...'
        }
      />
    )
  }

  return <>{children}</>
}

function AuthShell({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
          <span className="text-white font-mono font-bold text-lg">0</span>
        </div>
        <div className="animate-pulse">
          <p className="text-sm font-medium text-neutral-400">{message}</p>
        </div>
      </div>
    </div>
  )
}
