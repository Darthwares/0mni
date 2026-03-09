'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import { useSpacetimeDB } from 'spacetimedb/react'
import { useRouter } from 'next/navigation'

type OrgStatus = 'loading' | 'ready' | 'no-org' | 'pending'

interface OrgMembershipRow {
  id: bigint
  orgId: bigint
  identity: any
  email: string
  role: { tag: string }
  status: { tag: string }
  invitedBy: any
  createdAt: any
  acceptedAt: any
}

interface OrganizationRow {
  id: bigint
  name: string
  domain: string | undefined
  autoApproveDomain: boolean
  createdBy: any
  createdAt: any
}

interface OrgContextValue {
  status: OrgStatus
  currentOrgId: number | null
  currentOrg: OrganizationRow | null
  myMemberships: OrgMembershipRow[]
  myRole: string | null
  isAdminOrOwner: boolean
  allOrgs: OrganizationRow[]
  orgMembers: OrgMembershipRow[]
  switchOrg: (orgId: number) => void
}

const OrgContext = createContext<OrgContextValue>({
  status: 'loading',
  currentOrgId: null,
  currentOrg: null,
  myMemberships: [],
  myRole: null,
  isAdminOrOwner: false,
  allOrgs: [],
  orgMembers: [],
  switchOrg: () => {},
})

export function useOrg() {
  return useContext(OrgContext)
}

const STORAGE_KEY = 'omni-current-org-id'

export function OrgProvider({ children }: { children: ReactNode }) {
  const { identity, isActive, getConnection } = useSpacetimeDB()
  const router = useRouter()

  const [memberships, setMemberships] = useState<OrgMembershipRow[]>([])
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [ready, setReady] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)

  // Load saved org from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSelectedOrgId(Number(saved))
    } catch {}
  }, [])

  // Subscribe to org_membership and organization tables
  useEffect(() => {
    if (!isActive || !identity) return

    const conn = getConnection()
    if (!conn) return

    let sub1Applied = false
    let sub2Applied = false

    const checkReady = () => {
      if (sub1Applied && sub2Applied) setReady(true)
    }

    const refreshMemberships = () => {
      try {
        setMemberships(Array.from(conn.db.org_membership.iter()) as any[])
      } catch {}
    }

    const refreshOrgs = () => {
      try {
        setOrganizations(Array.from(conn.db.organization.iter()) as any[])
      } catch {}
    }

    const sub1 = conn
      .subscriptionBuilder()
      .onApplied(() => {
        refreshMemberships()
        sub1Applied = true
        checkReady()
      })
      .subscribe('SELECT * FROM org_membership')

    const sub2 = conn
      .subscriptionBuilder()
      .onApplied(() => {
        refreshOrgs()
        sub2Applied = true
        checkReady()
      })
      .subscribe('SELECT * FROM organization')

    conn.db.org_membership.onInsert(() => refreshMemberships())
    conn.db.org_membership.onUpdate(() => refreshMemberships())
    conn.db.org_membership.onDelete(() => refreshMemberships())
    conn.db.organization.onInsert(() => refreshOrgs())
    conn.db.organization.onUpdate(() => refreshOrgs())
    conn.db.organization.onDelete(() => refreshOrgs())

    // Fallback timeout
    const timeout = setTimeout(() => {
      if (!ready) {
        refreshMemberships()
        refreshOrgs()
        setReady(true)
      }
    }, 3000)

    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
      clearTimeout(timeout)
    }
  }, [isActive, identity, getConnection])

  // Derive my active memberships
  const myMemberships = useMemo(() => {
    if (!identity) return []
    const myHex = identity.toHexString()
    return memberships.filter(
      (m) => m.identity && m.identity.toHexString() === myHex && m.status.tag === 'Active'
    )
  }, [identity, memberships])

  const myPendingMemberships = useMemo(() => {
    if (!identity) return []
    const myHex = identity.toHexString()
    return memberships.filter(
      (m) => m.identity && m.identity.toHexString() === myHex && m.status.tag === 'Pending'
    )
  }, [identity, memberships])

  // Determine status
  const status: OrgStatus = useMemo(() => {
    if (!identity || !ready) return 'loading'
    if (myMemberships.length > 0) return 'ready'
    if (myPendingMemberships.length > 0) return 'pending'
    return 'no-org'
  }, [identity, ready, myMemberships, myPendingMemberships])

  // Auto-select org if none selected or selected org not in memberships
  const currentOrgId = useMemo(() => {
    if (myMemberships.length === 0) return null
    const selectedExists = selectedOrgId !== null && myMemberships.some((m) => Number(m.orgId) === selectedOrgId)
    if (selectedExists) return selectedOrgId
    return Number(myMemberships[0].orgId)
  }, [myMemberships, selectedOrgId])

  // Current org object
  const currentOrg = useMemo(() => {
    if (currentOrgId === null) return null
    return organizations.find((o) => Number(o.id) === currentOrgId) ?? null
  }, [organizations, currentOrgId])

  // My role in current org
  const myRole = useMemo(() => {
    if (currentOrgId === null) return null
    const membership = myMemberships.find((m) => Number(m.orgId) === currentOrgId)
    return membership?.role?.tag ?? null
  }, [myMemberships, currentOrgId])

  const isAdminOrOwner = myRole === 'Owner' || myRole === 'Admin'

  // All orgs user is in
  const allOrgs = useMemo(() => {
    const orgIds = new Set(myMemberships.map((m) => Number(m.orgId)))
    return organizations.filter((o) => orgIds.has(Number(o.id)))
  }, [myMemberships, organizations])

  // Members of current org
  const orgMembers = useMemo(() => {
    if (currentOrgId === null) return []
    return memberships.filter((m) => Number(m.orgId) === currentOrgId)
  }, [memberships, currentOrgId])

  const switchOrg = useCallback((orgId: number) => {
    setSelectedOrgId(orgId)
    try {
      localStorage.setItem(STORAGE_KEY, String(orgId))
    } catch {}
  }, [])

  // Redirect if no org
  useEffect(() => {
    if (status === 'no-org') {
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

  if (status !== 'ready') {
    return null
  }

  return (
    <OrgContext.Provider
      value={{
        status,
        currentOrgId,
        currentOrg,
        myMemberships,
        myRole,
        isAdminOrOwner,
        allOrgs,
        orgMembers,
        switchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}
