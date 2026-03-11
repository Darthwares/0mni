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
import { useSpacetimeDB, useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated'
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
  isGlobal: boolean
  createdBy: any
  createdAt: any
}

interface EmployeeRow {
  id: any
  selectedOrgId: bigint | null | undefined
  [key: string]: any
}

interface OrgContextValue {
  status: OrgStatus
  currentOrgId: number | null
  currentOrg: OrganizationRow | null
  isGlobalOrg: boolean
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
  isGlobalOrg: false,
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

/** Map legacy DB org names to display names (UI-only, no DB writes) */
export function displayOrgName(name: string | undefined | null): string {
  if (!name) return 'World'
  if (name === 'Za Warudo') return 'World'
  return name
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { identity, isActive, getConnection } = useSpacetimeDB()
  const selectOrg = useReducer(reducers.selectOrg)
  const router = useRouter()

  const [memberships, setMemberships] = useState<OrgMembershipRow[]>([])
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [ready, setReady] = useState(false)

  // Subscribe to org_membership, organization, and employee tables
  useEffect(() => {
    if (!isActive || !identity) return

    const conn = getConnection()
    if (!conn) return

    let sub1Applied = false
    let sub2Applied = false
    let sub3Applied = false

    const checkReady = () => {
      if (sub1Applied && sub2Applied && sub3Applied) setReady(true)
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

    const refreshEmployees = () => {
      try {
        setEmployees(Array.from(conn.db.employee.iter()) as any[])
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

    const sub3 = conn
      .subscriptionBuilder()
      .onApplied(() => {
        refreshEmployees()
        sub3Applied = true
        checkReady()
      })
      .subscribe('SELECT * FROM employee')

    conn.db.org_membership.onInsert(() => refreshMemberships())
    conn.db.org_membership.onUpdate(() => refreshMemberships())
    conn.db.org_membership.onDelete(() => refreshMemberships())
    conn.db.organization.onInsert(() => refreshOrgs())
    conn.db.organization.onUpdate(() => refreshOrgs())
    conn.db.organization.onDelete(() => refreshOrgs())
    conn.db.employee.onInsert(() => refreshEmployees())
    conn.db.employee.onUpdate(() => refreshEmployees())
    conn.db.employee.onDelete(() => refreshEmployees())

    // Fallback timeout
    const timeout = setTimeout(() => {
      if (!ready) {
        refreshMemberships()
        refreshOrgs()
        refreshEmployees()
        setReady(true)
      }
    }, 3000)

    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
      sub3.unsubscribe()
      clearTimeout(timeout)
    }
  }, [isActive, identity, getConnection])

  // My employee record — read selected_org_id from DB
  const myEmployee = useMemo(() => {
    if (!identity) return null
    const myHex = identity.toHexString()
    return employees.find((e) => e.id && e.id.toHexString() === myHex) ?? null
  }, [identity, employees])

  const savedOrgId = useMemo(() => {
    if (!myEmployee?.selectedOrgId) return null
    return Number(myEmployee.selectedOrgId)
  }, [myEmployee])

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

  // Grace period: after subscriptions are ready, wait for client_connected auto-join
  // before declaring 'no-org' (the server auto-joins World on connect)
  const [graceExpired, setGraceExpired] = useState(false)
  useEffect(() => {
    if (!ready) {
      setGraceExpired(false)
      return
    }
    if (myMemberships.length > 0 || myPendingMemberships.length > 0) {
      setGraceExpired(true)
      return
    }
    const timer = setTimeout(() => setGraceExpired(true), 3000)
    return () => clearTimeout(timer)
  }, [ready, myMemberships.length, myPendingMemberships.length])

  // Determine status
  const status: OrgStatus = useMemo(() => {
    if (!identity || !ready) return 'loading'
    if (myMemberships.length > 0) return 'ready'
    if (myPendingMemberships.length > 0) return 'pending'
    if (!graceExpired) return 'loading'
    return 'no-org'
  }, [identity, ready, myMemberships, myPendingMemberships, graceExpired])

  // Auto-select org: prefer DB-saved selection, then World (global), then first
  const currentOrgId = useMemo(() => {
    if (myMemberships.length === 0) return null
    // Use saved selection from DB if it's a valid membership
    if (savedOrgId !== null) {
      const savedExists = myMemberships.some((m) => Number(m.orgId) === savedOrgId)
      if (savedExists) return savedOrgId
    }
    // Prefer global org (World) as default
    const globalOrg = organizations.find((o) => o.isGlobal)
    if (globalOrg) {
      const hasGlobal = myMemberships.some((m) => Number(m.orgId) === Number(globalOrg.id))
      if (hasGlobal) return Number(globalOrg.id)
    }
    return Number(myMemberships[0].orgId)
  }, [myMemberships, savedOrgId, organizations])

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

  // Check if current org is the Global org
  const isGlobalOrg = currentOrg?.isGlobal === true

  // All orgs user is in — Global first, then alphabetical
  const allOrgs = useMemo(() => {
    const orgIds = new Set(myMemberships.map((m) => Number(m.orgId)))
    return organizations
      .filter((o) => orgIds.has(Number(o.id)))
      .sort((a, b) => {
        if (a.isGlobal && !b.isGlobal) return -1
        if (!a.isGlobal && b.isGlobal) return 1
        return a.name.localeCompare(b.name)
      })
  }, [myMemberships, organizations])

  // Members of current org
  const orgMembers = useMemo(() => {
    if (currentOrgId === null) return []
    return memberships.filter((m) => Number(m.orgId) === currentOrgId)
  }, [memberships, currentOrgId])

  // Switch org — persists to DB via reducer
  const switchOrg = useCallback((orgId: number) => {
    selectOrg({ orgId: BigInt(orgId) }).catch((err) => {
      console.error('Failed to switch org:', err)
    })
  }, [selectOrg])

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
        isGlobalOrg,
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
