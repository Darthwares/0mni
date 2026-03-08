'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'react-oidc-context'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'
import { tables } from '@/generated'

export default function Home() {
  const router = useRouter()
  const auth = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (auth.isLoading) return

    if (!auth.isAuthenticated) {
      setIsChecking(false)
      // Redirect directly to SpacetimeAuth (skips intermediate login page)
      auth.signinRedirect()
    }
  }, [auth.isLoading, auth.isAuthenticated, auth, router])

  if (auth.isAuthenticated) {
    return <AuthenticatedHome />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">Ω</span>
        </div>
        <div className="animate-pulse">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {isChecking ? 'Loading Omni...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    </div>
  )
}

function AuthenticatedHome() {
  const router = useRouter()
  const { identity, isActive } = useSpacetimeDB()
  const [employees, isReady] = useTable(tables.employee)

  useEffect(() => {
    if (!isActive || !identity) return
    if (!isReady && employees.length === 0) return

    const employee = employees.find(
      (emp) => emp.id.toHexString() === identity.toHexString()
    )

    if (!employee) {
      router.push('/setup')
      return
    }

    const hasCompletedSetup = !employee.name.startsWith('user-')

    if (hasCompletedSetup) {
      router.push('/dashboard')
    } else {
      router.push('/setup')
    }
  }, [isActive, identity, isReady, employees, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">Ω</span>
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
