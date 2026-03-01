'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSpacetimeDB } from './spacetimedb'

interface AuthContextType {
  isAuthenticated: boolean
  isBackdoorEnabled: boolean
  login: (username?: string, password?: string) => Promise<void>
  logout: () => void
  backdoorLogin: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Backdoor for local testing
const AUTH_BACKDOOR_ENABLED = process.env.NEXT_PUBLIC_AUTH_BACKDOOR_ENABLED === 'true'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { connect, disconnect, isConnected, identity } = useSpacetimeDB()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(isConnected && identity !== null)
  }, [isConnected, identity])

  const login = async (username?: string, password?: string) => {
    // TODO: Implement actual authentication
    // For now, just connect to SpacetimeDB
    try {
      await connect()
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const backdoorLogin = async () => {
    if (!AUTH_BACKDOOR_ENABLED) {
      throw new Error('Backdoor login is not enabled')
    }

    console.warn('🚪 BACKDOOR: Logging in without authentication (dev mode only)')
    await connect()
  }

  const logout = () => {
    disconnect()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isBackdoorEnabled: AUTH_BACKDOOR_ENABLED,
        login,
        logout,
        backdoorLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
