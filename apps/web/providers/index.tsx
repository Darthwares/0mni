'use client'

import { SpacetimeDBProvider } from 'spacetimedb/react'
import { DbConnectionBuilder } from '@/generated'

const DB_URI = process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'

// Create connection builder - make it optional to prevent server errors
let connectionBuilder: any = null

try {
  connectionBuilder = new DbConnectionBuilder()

  // Try different API patterns based on SpacetimeDB version
  if (typeof connectionBuilder.withUri === 'function') {
    connectionBuilder = connectionBuilder.withUri(`${DB_URI}/${DB_NAME}`)
  }
  if (typeof connectionBuilder.withModuleName === 'function') {
    connectionBuilder = connectionBuilder.withModuleName(DB_NAME)
  }
} catch (error) {
  console.warn('SpacetimeDB connection builder error:', error)
  connectionBuilder = null
}

export function Providers({ children }: { children: React.ReactNode }) {
  // If connection builder failed, just return children without SpacetimeDB provider
  if (!connectionBuilder) {
    return <>{children}</>
  }

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  )
}
