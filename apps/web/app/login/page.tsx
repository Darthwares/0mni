'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Aurora from '@/components/reactbits/Aurora'
import GradientText from '@/components/reactbits/GradientText'

export default function LoginPage() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push('/')
    }
  }, [auth.isAuthenticated, router])

  const handleGoogleLogin = () => {
    auth.signinRedirect()
  }

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-mono font-black text-2xl">0</span>
          </div>
          <div className="animate-pulse">
            <p className="text-sm font-medium text-neutral-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 p-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-30">
        <Aurora
          colorStops={['#7C3AED', '#A78BFA', '#5B21B6']}
          amplitude={1.0}
          blend={0.5}
          speed={0.6}
        />
      </div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />

      <div className="relative z-10 max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
            <span className="text-white font-mono font-black text-4xl">0</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            <GradientText
              colors={['#8B5CF6', '#C084FC', '#E9D5FF', '#A78BFA']}
              animationSpeed={6}
              className="text-4xl font-black"
            >
              <span className="font-mono">0</span>MNI
            </GradientText>
          </h1>
          <p className="text-sm text-neutral-400">
            The AI Operating Platform for hybrid teams
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-1 text-center">
            Sign in to your workspace
          </h2>
          <p className="text-sm text-neutral-500 mb-8 text-center">
            Use your organization account to continue
          </p>

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white rounded-xl hover:bg-neutral-100 transition-all text-neutral-800 font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google Workspace
            </button>

            <button
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-500 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              Microsoft &mdash; Coming Soon
            </button>
          </div>

          {auth.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                Authentication failed. Please try again.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-600 text-center mt-6">
          Secured by SpacetimeDB &middot; No credit card required
        </p>
      </div>
    </div>
  )
}
