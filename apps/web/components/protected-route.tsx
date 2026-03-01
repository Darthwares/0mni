'use client'

import { useSpacetimeDB } from 'spacetimedb/react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected } = useSpacetimeDB()

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to Omni...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
