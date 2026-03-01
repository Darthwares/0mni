'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DbConnection } from 'spacetimedb'

interface SpacetimeDBContextType {
  connection: DbConnection | null
  identity: string | null
  isConnected: boolean
  connect: (token?: string) => Promise<void>
  disconnect: () => void
}

const SpacetimeDBContext = createContext<SpacetimeDBContextType | null>(null)

const DB_URI = process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'

export function SpacetimeDBProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<DbConnection | null>(null)
  const [identity, setIdentity] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = async (token?: string) => {
    try {
      const dbUri = `${DB_URI}/${DB_NAME}`

      const conn = await DbConnection.builder()
        .withUri(dbUri)
        .withModuleName(DB_NAME)
        .withToken(token)
        .onConnect((conn, identity, token) => {
          console.log('Connected to SpacetimeDB:', identity)
          setIdentity(identity)
          setIsConnected(true)

          // Save token for reconnection
          if (token) {
            localStorage.setItem('spacetimedb_token', token)
          }

          // Subscribe to all tables
          conn.subscription_builder()
            .on_applied(() => {
              console.log('Subscription applied')
            })
            .subscribe_to_all_tables()
        })
        .build()

      setConnection(conn)

      // Start processing messages
      conn.run_threaded()
    } catch (error) {
      console.error('Failed to connect to SpacetimeDB:', error)
      throw error
    }
  }

  const disconnect = () => {
    if (connection) {
      connection.close()
      setConnection(null)
      setIdentity(null)
      setIsConnected(false)
      localStorage.removeItem('spacetimedb_token')
    }
  }

  // Auto-connect with saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('spacetimedb_token')
    if (savedToken) {
      connect(savedToken).catch((error) => {
        console.error('Auto-connect failed:', error)
        localStorage.removeItem('spacetimedb_token')
      })
    }
  }, [])

  return (
    <SpacetimeDBContext.Provider value={{ connection, identity, isConnected, connect, disconnect }}>
      {children}
    </SpacetimeDBContext.Provider>
  )
}

export function useSpacetimeDB() {
  const context = useContext(SpacetimeDBContext)
  if (!context) {
    throw new Error('useSpacetimeDB must be used within SpacetimeDBProvider')
  }
  return context
}
