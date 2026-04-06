'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const auth = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push('/dashboard')
    }
  }, [auth.isAuthenticated, router])

  const handleGoogleLogin = () => {
    setIsSigningIn(true)
    auth.signinRedirect()
  }

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <Logo size="lg" />
          <div className="mt-6 animate-pulse">
            <p className="text-sm font-medium text-neutral-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-neutral-950 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[30%] h-[600px] w-[600px] rounded-full bg-violet-600/8 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full bg-purple-600/6 blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Left: branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
        <div className="max-w-md px-8">
          <Logo size="xl" />
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-white leading-tight">
            Your team&apos;s
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-300 bg-clip-text text-transparent">
              AI operating system
            </span>
          </h1>
          <p className="mt-4 text-base text-neutral-400 leading-relaxed">
            Real-time collaboration, AI employees, and intelligent workflows — unified in one platform.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {['Real-time sync', 'AI agents', 'Team chat', 'Workflows'].map(
              (feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-400"
                >
                  <span className="h-1 w-1 rounded-full bg-violet-400" />
                  {feature}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right: sign-in card */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <Logo size="lg" />
            <h1 className="mt-4 text-2xl font-bold text-white">
              <span className="font-mono">0</span>MNI
            </h1>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                Sign in to your workspace
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Use your organization account to continue
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {/* Google sign-in */}
              <button
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="group relative w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-medium text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSigningIn ? (
                  <>
                    <Spinner />
                    <span>Redirecting...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Microsoft — coming soon */}
              <button
                disabled
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-neutral-500 cursor-not-allowed"
              >
                <MicrosoftIcon />
                <span>Microsoft</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-neutral-600 font-medium">
                  Soon
                </span>
              </button>
            </div>

            {auth.error && (
              <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/15 p-3 text-center">
                <p className="text-sm text-red-400">
                  Authentication failed. Please try again.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-neutral-600">
            By continuing, you agree to our{' '}
            <a href="#" className="text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-2">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Logo({ size = 'md' }: { size?: 'md' | 'lg' | 'xl' }) {
  const dims = { md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-2xl', xl: 'w-16 h-16 text-3xl' }
  return (
    <div
      className={`${dims[size]} bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20`}
    >
      <span className="text-white font-mono font-black">0</span>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  )
}
