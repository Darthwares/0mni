'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SpacetimeDBProvider, useSpacetimeDB } from 'spacetimedb/react'
import { DbConnection } from '@/generated'
import { useAuth } from 'react-oidc-context'
import type { User as OidcUser } from 'oidc-client-ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

interface OmniAuthContextValue {
  /** True when OIDC is authenticated AND SpacetimeDB is connected */
  isReady: boolean
  /** OIDC authentication state */
  isAuthenticated: boolean
  /** OIDC is still loading */
  isLoading: boolean
  /** SpacetimeDB connection state */
  connectionState: ConnectionState
  /** OIDC user profile */
  user: OidcUser | null
  /** Coordinated sign-out: disconnects SpacetimeDB, then OIDC logout */
  signOut: () => Promise<void>
  /** Manually trigger reconnection (e.g. after prolonged offline) */
  reconnect: () => void
  /** Last connection error message, if any */
  error: string | null
}

const OmniAuthContext = createContext<OmniAuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_URI =
  process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'
const DB_NAME =
  process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'

const RETRY_BASE_MS = 1_000
const RETRY_MAX_MS = 30_000
const MAX_RETRIES = 10

// ---------------------------------------------------------------------------
// Inner provider — lives inside SpacetimeDBProvider so useSpacetimeDB works
// ---------------------------------------------------------------------------

function OmniAuthInner({
  children,
  connectionState,
  error,
  signOut,
  reconnect,
}: {
  children: ReactNode
  connectionState: ConnectionState
  error: string | null
  signOut: () => Promise<void>
  reconnect: () => void
}) {
  const auth = useAuth()
  const { identity } = useSpacetimeDB()

  const value: OmniAuthContextValue = {
    isReady: auth.isAuthenticated && connectionState === 'connected' && !!identity,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    connectionState,
    user: auth.user ?? null,
    signOut,
    reconnect,
    error,
  }

  return (
    <OmniAuthContext.Provider value={value}>
      {children}
    </OmniAuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Fallback context when not connected (no SpacetimeDBProvider yet)
// ---------------------------------------------------------------------------

function OmniAuthFallback({
  children,
  connectionState,
  error,
  signOut,
  reconnect,
}: {
  children: ReactNode
  connectionState: ConnectionState
  error: string | null
  signOut: () => Promise<void>
  reconnect: () => void
}) {
  const auth = useAuth()

  const value: OmniAuthContextValue = {
    isReady: false,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    connectionState,
    user: auth.user ?? null,
    signOut,
    reconnect,
    error,
  }

  return (
    <OmniAuthContext.Provider value={value}>
      {children}
    </OmniAuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Main provider — manages SpacetimeDB connection lifecycle
// ---------------------------------------------------------------------------

export function OmniAuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  const [connectionBuilder, setConnectionBuilder] = useState<any>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)

  // Refs for retry logic — avoid stale closures
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectedRef = useRef(false)
  // Track the OIDC sub claim to detect actual user changes vs token refresh
  const lastSubRef = useRef<string | null>(null)
  // Track if we intentionally disconnected (sign-out)
  const intentionalDisconnectRef = useRef(false)

  // ------ Build a new connection ------
  const buildConnection = useCallback(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) return

    const idToken = auth.user.id_token
    const profile = auth.user.profile

    const isRetry = retryCountRef.current > 0
    setConnectionState(isRetry ? 'reconnecting' : 'connecting')
    setError(null)

    console.log(
      `[OmniAuth] ${isRetry ? 'Reconnecting' : 'Connecting'} to SpacetimeDB (attempt ${retryCountRef.current + 1})`
    )

    const builder = DbConnection.builder()
      .withUri(DB_URI)
      .withDatabaseName(DB_NAME)
      .withToken(idToken)
      .onConnect((conn, identity, _token) => {
        connectedRef.current = true
        retryCountRef.current = 0
        intentionalDisconnectRef.current = false
        setConnectionState('connected')
        setError(null)

        console.log(
          '[OmniAuth] Connected! Identity:',
          identity.toHexString().slice(0, 16) + '...'
        )

        // Sync OIDC profile to employee record — only if we have profile data
        if (profile?.name) {
          conn.reducers.syncIdentity({
            name: profile.name,
            email: profile.email ?? undefined,
            avatarUrl: profile.picture ?? undefined,
          })
        }
      })
      .onDisconnect((_ctx: any, err: any) => {
        connectedRef.current = false

        if (intentionalDisconnectRef.current) {
          setConnectionState('disconnected')
          console.log('[OmniAuth] Disconnected (intentional)')
          return
        }

        if (err) {
          console.error('[OmniAuth] Disconnected with error:', err)
          setError(typeof err === 'string' ? err : 'Connection lost')
          setConnectionState('error')
        } else {
          console.warn('[OmniAuth] Disconnected unexpectedly')
          setConnectionState('disconnected')
        }

        // Auto-reconnect if still authenticated and not intentional
        if (auth.isAuthenticated && retryCountRef.current < MAX_RETRIES) {
          scheduleRetry()
        }
      })
      .onConnectError((_ctx: any, err: any) => {
        connectedRef.current = false
        const msg = typeof err === 'string' ? err : 'Connection failed'
        console.error('[OmniAuth] Connection error:', msg)
        setError(msg)
        setConnectionState('error')

        if (retryCountRef.current < MAX_RETRIES) {
          scheduleRetry()
        }
      })

    setConnectionBuilder(builder)
  }, [auth.isAuthenticated, auth.user?.id_token, auth.user?.profile])

  // ------ Retry with exponential backoff ------
  const scheduleRetry = useCallback(() => {
    const delay = Math.min(
      RETRY_BASE_MS * Math.pow(2, retryCountRef.current),
      RETRY_MAX_MS
    )
    retryCountRef.current += 1
    console.log(
      `[OmniAuth] Scheduling retry #${retryCountRef.current} in ${delay}ms`
    )
    retryTimerRef.current = setTimeout(() => {
      buildConnection()
    }, delay)
  }, [buildConnection])

  // ------ Connect when authenticated ------
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) {
      // Not authenticated — clear connection
      setConnectionBuilder(null)
      setConnectionState('disconnected')
      connectedRef.current = false
      lastSubRef.current = null
      return
    }

    const currentSub = auth.user.profile?.sub ?? null

    // Token refresh (same user) — don't reconnect if already connected
    if (connectedRef.current && currentSub === lastSubRef.current) {
      return
    }

    lastSubRef.current = currentSub

    // Clear any pending retry
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
    }
    retryCountRef.current = 0

    buildConnection()
  }, [auth.isAuthenticated, auth.user?.id_token, buildConnection])

  // ------ Cleanup on unmount ------
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  // ------ Coordinated sign-out ------
  // Local-only logout: clears OIDC tokens + SpacetimeDB connection, then
  // redirects to /login. Avoids hitting SpacetimeAuth's end_session_endpoint
  // which shows an ugly "Do you want to sign out?" confirmation page.
  const signOut = useCallback(async () => {
    intentionalDisconnectRef.current = true

    // Clear retry timers
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryCountRef.current = 0

    // Clear SpacetimeDB connection
    connectedRef.current = false
    setConnectionBuilder(null)
    setConnectionState('disconnected')

    // Clear OIDC local state (tokens, session) without hitting end_session_endpoint
    try {
      await auth.removeUser()
    } catch (e) {
      console.error('[OmniAuth] Error clearing session:', e)
    }

    // Hard navigate to login
    window.location.href = '/login'
  }, [auth])

  // ------ Manual reconnect ------
  const reconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryCountRef.current = 0
    intentionalDisconnectRef.current = false
    buildConnection()
  }, [buildConnection])

  // ------ Render ------

  // Not authenticated or no connection builder yet — render with fallback context
  if (!auth.isAuthenticated || !connectionBuilder) {
    return (
      <OmniAuthFallback
        connectionState={connectionState}
        error={error}
        signOut={signOut}
        reconnect={reconnect}
      >
        {children}
      </OmniAuthFallback>
    )
  }

  // Authenticated with connection builder — wrap in SpacetimeDBProvider
  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <OmniAuthInner
        connectionState={connectionState}
        error={error}
        signOut={signOut}
        reconnect={reconnect}
      >
        {children}
      </OmniAuthInner>
    </SpacetimeDBProvider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOmniAuth(): OmniAuthContextValue {
  const ctx = useContext(OmniAuthContext)
  if (!ctx) {
    throw new Error('useOmniAuth must be used within OmniAuthProvider')
  }
  return ctx
}
