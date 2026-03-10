'use client'

import { SpacetimeDBProvider } from 'spacetimedb/react'
import { DbConnection } from '@/generated'
import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { OidcAuthProvider } from './oidc-auth'
import { ThemeProvider } from '@/components/theme-provider'

const DB_URI = process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'

function SpacetimeDBWithAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [connectionBuilder, setConnectionBuilder] = useState<any>(null)

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) {
      setConnectionBuilder(null)
      return
    }

    const idToken = auth.user.id_token
    const profile = auth.user.profile

    console.log('[Omni] Building SpacetimeDB connection to', DB_URI, '/', DB_NAME)

    const builder = DbConnection.builder()
      .withUri(DB_URI)
      .withDatabaseName(DB_NAME)
      .withToken(idToken)
      .onConnect((conn, identity, _token) => {
        console.log('[Omni] Connected to SpacetimeDB! Identity:', identity.toHexString())

        // Sync OIDC profile (name, email, avatar) to employee record
        if (profile?.name) {
          conn.reducers.syncIdentity({
            name: profile.name,
            email: profile.email ?? undefined,
            avatarUrl: profile.picture ?? undefined,
          })
        }
      })
      .onDisconnect((_ctx, error) => {
        if (error) {
          console.error('[Omni] Disconnected from SpacetimeDB with error:', error)
        } else {
          console.warn('[Omni] Disconnected from SpacetimeDB')
        }
      })
      .onConnectError((_ctx, error) => {
        console.error('[Omni] SpacetimeDB connection error:', error)
      })

    setConnectionBuilder(builder)
  }, [auth.isAuthenticated, auth.user?.id_token])

  // Not authenticated — children handle redirect to /login
  if (!auth.isAuthenticated || !auth.user?.id_token) {
    return <>{children}</>
  }

  // Waiting for connection builder
  if (!connectionBuilder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">Ω</span>
          </div>
          <div className="animate-pulse">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Connecting...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OidcAuthProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <SpacetimeDBWithAuth>{children}</SpacetimeDBWithAuth>
      </ThemeProvider>
    </OidcAuthProvider>
  )
}
