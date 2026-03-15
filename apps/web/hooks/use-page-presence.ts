'use client'

import { useEffect, useMemo } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'

// Stable page IDs — deterministic mapping from page path to numeric ID
const PAGE_IDS: Record<string, number> = {
  '/dashboard': 100001,
  '/analytics': 100002,
  '/activity': 100003,
  '/messages': 100004,
  '/email': 100005,
  '/support': 100006,
  '/sales': 100007,
  '/recruitment': 100008,
  '/tickets': 100009,
  '/canvas': 100010,
  '/engineering': 100011,
  '/collaboration': 100012,
  '/ai-employees': 100013,
  '/agent-studio': 100014,
  '/settings': 100015,
  '/profile': 100016,
}

export function usePagePresence(pagePath: string) {
  const { identity } = useSpacetimeDB()
  const setPresence = useReducer(reducers.setResourcePresence)
  const clearPresence = useReducer(reducers.clearResourcePresence)
  const [allPresence] = useTable(tables.resource_presence)
  const [allEmployees] = useTable(tables.employee)

  const myHex = identity?.toHexString() ?? ''
  const pageId = PAGE_IDS[pagePath] ?? 0

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Set page presence
  useEffect(() => {
    if (!pageId || !identity) return

    try {
      setPresence({ resourceType: { tag: 'Page' } as any, resourceId: BigInt(pageId) })
    } catch {}

    const interval = setInterval(() => {
      try {
        setPresence({ resourceType: { tag: 'Page' } as any, resourceId: BigInt(pageId) })
      } catch {}
    }, 30_000)

    return () => {
      clearInterval(interval)
      try { clearPresence({}) } catch {}
    }
  }, [pagePath, pageId, identity])

  // Get other users on this page
  const presentUsers = useMemo(() => {
    if (!pageId) return []
    const now = Date.now()
    return allPresence
      .filter((p) => {
        if (p.resourceType.tag !== 'Page') return false
        if (Number(p.resourceId) !== pageId) return false
        if (p.userId.toHexString() === myHex) return false
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
  }, [allPresence, pageId, myHex, employeeMap])

  return { presentUsers, pageId }
}
