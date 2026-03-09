'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSpacetimeDB, useReducer, useTable } from 'spacetimedb/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { reducers, tables } from '@/generated'
import { useAuth } from 'react-oidc-context'
import ProtectedRoute from '@/components/protected-route'

type SetupStep = 'choose' | 'create-org' | 'join-code' | 'pending'

export default function SetupPage() {
  return (
    <ProtectedRoute>
      <SetupContent />
    </ProtectedRoute>
  )
}

function SetupContent() {
  const { identity } = useSpacetimeDB()
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const createOrganization = useReducer(reducers.createOrganization)
  const joinOrgWithInviteCode = useReducer(reducers.joinOrgWithInviteCode)

  const [memberships] = useTable(tables.org_membership)

  const initialStep = searchParams.get('mode') === 'join' ? 'join-code' as SetupStep
    : searchParams.get('pending') === '1' ? 'pending' as SetupStep
    : 'choose' as SetupStep
  const [step, setStep] = useState<SetupStep>(initialStep)

  const [orgName, setOrgName] = useState('')
  const [orgDomain, setOrgDomain] = useState('')
  const [userName, setUserName] = useState('')
  const [joinEmail, setJoinEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-populate from OIDC profile
  useEffect(() => {
    if (auth.user?.profile) {
      setUserName(auth.user.profile.name || '')
      setJoinEmail(auth.user.profile.email || '')
      if (auth.user.profile.email) {
        const domain = auth.user.profile.email.split('@')[1]
        if (domain) setOrgDomain(domain)
      }
    }
  }, [auth.user?.profile])

  // Watch for active membership → redirect to dashboard
  const myActiveMembership = useMemo(() => {
    if (!identity) return null
    const myHex = identity.toHexString()
    return memberships.find(
      (m) => m.identity && m.identity.toHexString() === myHex && m.status.tag === 'Active'
    ) ?? null
  }, [identity, memberships])

  useEffect(() => {
    if (myActiveMembership) {
      router.replace('/dashboard')
    }
  }, [myActiveMembership, router])

  // Check if pending
  const isPending = useMemo(() => {
    if (!identity) return false
    const myHex = identity.toHexString()
    return memberships.some(
      (m) => m.identity && m.identity.toHexString() === myHex && m.status.tag === 'Pending'
    )
  }, [identity, memberships])

  useEffect(() => {
    if (isPending && step !== 'pending') {
      setStep('pending')
    }
  }, [isPending, step])

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !userName.trim()) return
    setError('')
    setIsSubmitting(true)

    try {
      await createOrganization({
        name: orgName.trim(),
        domain: orgDomain.trim() || undefined,
        email: joinEmail.trim(),
        displayName: userName.trim(),
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to create organization')
      setIsSubmitting(false)
    }
  }

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim() || !joinEmail.trim()) return
    setError('')
    setIsSubmitting(true)

    try {
      await joinOrgWithInviteCode({
        code: inviteCode.trim(),
        email: joinEmail.trim(),
        displayName: userName.trim(),
        avatarUrl: undefined,
      })
    } catch (err: any) {
      setError(err?.message || 'Invalid invite code')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
            <span className="text-white font-mono font-black text-3xl">0</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {step === 'pending' ? 'Waiting for Approval'
              : step === 'create-org' ? 'Create Organization'
              : step === 'join-code' ? 'Join Organization'
              : 'Welcome to Omni'}
          </h1>
          <p className="text-sm text-neutral-400">
            {step === 'pending'
              ? 'Your request is pending admin approval'
              : step === 'choose'
                ? 'Create or join an organization to get started'
                : step === 'create-org'
                  ? 'Set up your organization and invite your team'
                  : 'Enter your invite code to join'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('create-org')}
              className="w-full p-4 text-left bg-neutral-900 rounded-xl border border-neutral-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
            >
              <p className="font-semibold text-white">Create an Organization</p>
              <p className="text-xs text-neutral-400 mt-1">
                Start a new workspace and invite your team
              </p>
            </button>

            <button
              onClick={() => setStep('join-code')}
              className="w-full p-4 text-left bg-neutral-900 rounded-xl border border-neutral-800 hover:border-violet-400 dark:hover:border-violet-600 transition-colors"
            >
              <p className="font-semibold text-white">Join with Invite Link</p>
              <p className="text-xs text-neutral-400 mt-1">
                Enter an invite code from your team
              </p>
            </button>
          </div>
        )}

        {step === 'create-org' && (
          <form onSubmit={handleCreateOrg} className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., Darthwares"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Company Domain (optional)
              </label>
              <input
                type="text"
                value={orgDomain}
                onChange={(e) => setOrgDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., darthwares.com"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setStep('choose'); setError('') }}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !orgName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        )}

        {step === 'join-code' && (
          <form onSubmit={handleJoinWithCode} className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={joinEmail}
                onChange={(e) => setJoinEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Invite Code *
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono tracking-wider"
                placeholder="e.g., abc12345"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setStep('choose'); setError('') }}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !inviteCode.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Joining...' : 'Join Organization'}
              </button>
            </div>
          </form>
        )}

        {step === 'pending' && (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Pending Approval
            </h2>
            <p className="text-sm text-neutral-400 mb-4">
              Your request to join has been submitted. An admin will review and approve your access shortly.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              This page will automatically redirect once you're approved.
            </p>
          </div>
        )}

        {/* Back to dashboard link if user already has orgs */}
        {step === 'choose' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
