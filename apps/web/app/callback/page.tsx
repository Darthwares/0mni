'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CallbackPage() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/dashboard')
    }
    if (auth.error) {
      console.error('OIDC callback error:', auth.error)
      router.replace('/login')
    }
  }, [auth.isAuthenticated, auth.error, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
          <span className="text-white font-mono font-black text-2xl">0</span>
        </div>
        <div className="animate-pulse">
          <p className="text-sm font-medium text-neutral-400">
            Completing sign in...
          </p>
        </div>
      </div>
    </div>
  )
}
