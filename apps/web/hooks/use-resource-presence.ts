'use client'

import { useEffect, useMemo } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'

type ResourceType = 'Canvas' | 'Ticket' | 'Channel'

/**
 * Track and display presence for a resource (canvas, ticket, channel).
 * Automatically registers the current user as present and cleans up on unmount.
 */
export function useResourcePresence(resourceType: ResourceType, resourceId: bigint | number | null) {
  const { identity } = useSpacetimeDB()
  const setPresence = useReducer(reducers.setResourcePresence)
  const clearPresence = useReducer(reducers.clearResourcePresence)
  const [allPresence] = useTable(tables.resource_presence)
  const [allEmployees] = useTable(tables.employee)

  const myHex = identity?.toHexString() ?? ''

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Set presence when viewing a resource
  useEffect(() => {
    if (!resourceId || !identity) return

    const id = typeof resourceId === 'bigint' ? Number(resourceId) : resourceId
    try {
      setPresence({ resourceType: { tag: resourceType }, resourceId: BigInt(id) })
    } catch {}

    // Heartbeat every 30s
    const interval = setInterval(() => {
      try {
        setPresence({ resourceType: { tag: resourceType }, resourceId: BigInt(id) })
      } catch {}
    }, 30_000)

    return () => {
      clearInterval(interval)
      try { clearPresence({}) } catch {}
    }
  }, [resourceType, resourceId, identity])

  // Get other users present on this resource
  const presentUsers = useMemo(() => {
    if (!resourceId) return []
    const id = typeof resourceId === 'bigint' ? Number(resourceId) : resourceId
    const now = Date.now()
    return allPresence
      .filter((p) => {
        if (p.resourceType.tag !== resourceType) return false
        if (Number(p.resourceId) !== id) return false
        if (p.userId.toHexString() === myHex) return false
        // Only show users seen in last 60 seconds
        try {
          const lastSeen = p.lastSeenAt.toDate?.()?.getTime() ?? 0
          if (now - lastSeen > 60_000) return false
        } catch {}
        return true
      })
      .map((p) => {
        const emp = employeeMap.get(p.userId.toHexString())
        return {
          hex: p.userId.toHexString(),
          name: emp?.name ?? `user-${p.userId.toHexString().slice(0, 8)}`,
          status: emp?.status?.tag ?? 'Offline',
          avatarUrl: emp?.avatarUrl ?? null,
        }
      })
  }, [allPresence, resourceType, resourceId, myHex, employeeMap])

  return { presentUsers }
}
