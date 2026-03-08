'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CallbackPage() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/')
    }
    if (auth.error) {
      console.error('OIDC callback error:', auth.error)
      router.replace('/login')
    }
  }, [auth.isAuthenticated, auth.error, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">Ω</span>
        </div>
        <div className="animate-pulse">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Completing sign in...
          </p>
        </div>
      </div>
    </div>
  )
}
