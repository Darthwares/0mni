'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSpacetimeDB, useReducer, useTable } from 'spacetimedb/react'
import { useRouter, useParams } from 'next/navigation'
import { reducers, tables } from '@/generated'
import { useAuth } from 'react-oidc-context'
import ProtectedRoute from '@/components/protected-route'

// Outer wrapper — no SpacetimeDB hooks
export default function InvitePage() {
  return (
    <ProtectedRoute>
      <InviteContent />
    </ProtectedRoute>
  )
}

// Inner content — SpacetimeDB hooks safe here
function InviteContent() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const auth = useAuth()
  const { identity } = useSpacetimeDB()

  const joinOrgWithInviteCode = useReducer(reducers.joinOrgWithInviteCode)

  const [memberships] = useTable(tables.org_membership)
  const [inviteLinks] = useTable(tables.org_invite_link)
  const [organizations] = useTable(tables.organization)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-populate from OIDC
  useEffect(() => {
    if (auth.user?.profile) {
      setName(auth.user.profile.name || '')
      setEmail(auth.user.profile.email || '')
    }
  }, [auth.user?.profile])

  // Find the invite link details
  const inviteLink = useMemo(() => {
    return inviteLinks.find((l) => l.code === code && l.active) ?? null
  }, [inviteLinks, code])

  const org = useMemo(() => {
    if (!inviteLink) return null
    return organizations.find((o) => o.id === inviteLink.orgId) ?? null
  }, [inviteLink, organizations])

  // If already a member, redirect
  const isAlreadyMember = useMemo(() => {
    if (!identity) return false
    const myHex = identity.toHexString()
    return memberships.some(
      (m) => m.identity && m.identity.toHexString() === myHex && m.status.tag === 'Active'
    )
  }, [identity, memberships])

  useEffect(() => {
    if (isAlreadyMember) {
      router.replace('/feed')
    }
  }, [isAlreadyMember, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setIsSubmitting(true)

    try {
      await joinOrgWithInviteCode({
        code,
        email: email.trim(),
        displayName: name.trim(),
        avatarUrl: undefined,
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to join. The invite may be expired or invalid.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">O</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            {org ? `Join ${org.name === 'Za Warudo' ? 'World' : org.name}` : 'Join Organization'}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {org
              ? `You've been invited to join ${org.name === 'Za Warudo' ? 'World' : org.name} on Omni`
              : 'Complete your profile to accept this invite'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="you@company.com"
            />
          </div>

          <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
            Invite code: <code className="font-mono font-medium">{code}</code>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="w-full px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Joining...' : 'Accept Invite'}
          </button>
        </form>
      </div>
    </div>
  )
}
