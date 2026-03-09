'use client'

import { useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useCallback } from 'react'

type OrgStatus = 'loading' | 'active' | 'pending' | 'none'

export function useOrgStatus(): { status: OrgStatus; orgId: number | null } {
  const { identity, isActive, getConnection } = useSpacetimeDB()
  const [memberships, setMemberships] = useState<any[]>([])
  const [ready, setReady] = useState(false)

  // Manually poll the connection's db for org_membership rows
  // This avoids useTable's subscription onApplied issue
  useEffect(() => {
    if (!isActive || !identity) return

    const conn = getConnection()
    if (!conn) return

    // Subscribe to org_membership table
    const sub = conn
      .subscriptionBuilder()
      .onApplied(() => {
        // Read rows from the local cache
        const rows = Array.from(conn.db.org_membership.iter())
        setMemberships(rows)
        setReady(true)
      })
      .subscribe('SELECT * FROM org_membership')

    // Also set up a listener for changes
    const onInsert = () => {
      const rows = Array.from(conn.db.org_membership.iter())
      setMemberships(rows)
    }
    const onUpdate = () => {
      const rows = Array.from(conn.db.org_membership.iter())
      setMemberships(rows)
    }
    const onDelete = () => {
      const rows = Array.from(conn.db.org_membership.iter())
      setMemberships(rows)
    }

    conn.db.org_membership.onInsert(onInsert)
    conn.db.org_membership.onUpdate(onUpdate)
    conn.db.org_membership.onDelete(onDelete)

    // Fallback: if onApplied doesn't fire within 3s, check anyway
    const timeout = setTimeout(() => {
      if (!ready) {
        try {
          const rows = Array.from(conn.db.org_membership.iter())
          setMemberships(rows)
        } catch {}
        setReady(true)
      }
    }, 3000)

    return () => {
      sub.unsubscribe()
      clearTimeout(timeout)
    }
  }, [isActive, identity, getConnection])

  return useMemo(() => {
    if (!identity || !ready) {
      return { status: 'loading' as const, orgId: null }
    }

    const myHex = identity.toHexString()
    const myMemberships = memberships.filter(
      (m: any) => m.identity && m.identity.toHexString() === myHex
    )

    const active = myMemberships.find((m: any) => m.status?.tag === 'Active')
    if (active) return { status: 'active' as const, orgId: Number(active.orgId) }

    const pending = myMemberships.find((m: any) => m.status?.tag === 'Pending')
    if (pending) return { status: 'pending' as const, orgId: Number(pending.orgId) }

    return { status: 'none' as const, orgId: null }
  }, [identity, memberships, ready])
}

export default function OrgGate({ children }: { children: React.ReactNode }) {
  const { status } = useOrgStatus()
  const router = useRouter()

  useEffect(() => {
    if (status === 'none') {
      router.replace('/setup')
    } else if (status === 'pending') {
      router.replace('/setup?pending=1')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div className="animate-pulse">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Loading workspace...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'active') {
    return null
  }

  return <>{children}</>
}
