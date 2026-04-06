'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function CallbackPage() {
  const auth = useAuth()
  const router = useRouter()
  const [stage, setStage] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const redirectedRef = useRef(false)

  // Stage 0 shows immediately, stage 1 after 600ms
  useEffect(() => {
    const t = setTimeout(() => setStage((s) => Math.max(s, 1)), 600)
    return () => clearTimeout(t)
  }, [])

  // When authenticated — redirect immediately (survives re-mounts)
  useEffect(() => {
    if (auth.isAuthenticated && !redirectedRef.current) {
      redirectedRef.current = true
      setStage(2)
      // Hard navigate to avoid being interrupted by provider re-mounts
      window.location.href = '/dashboard'
    }
  }, [auth.isAuthenticated])

  // Handle error
  useEffect(() => {
    if (auth.error) {
      console.error('OIDC callback error:', auth.error)
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    }
  }, [auth.error])

  // Fallback: if stuck for 12s, show retry
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 12_000)
    return () => clearTimeout(t)
  }, [])

  const stages = [
    { text: 'Verifying credentials...', done: stage > 0 },
    { text: 'Securing session...', done: stage > 1 },
    { text: 'Loading workspace...', done: auth.isAuthenticated },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="w-full max-w-xs text-center">
        {/* Logo with pulse */}
        <div className="relative mx-auto mb-8 w-16 h-16">
          {!auth.isAuthenticated && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-20 animate-ping" />
          )}
          <div className="relative w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-white font-mono font-black text-3xl">0</span>
          </div>
        </div>

        {/* Progress stages */}
        <div className="space-y-3">
          {stages.map(({ text, done }, i) => {
            const isActive = i <= stage && !done
            const isVisible = i <= stage
            return (
              <div
                key={text}
                className={`flex items-center gap-3 justify-center transition-all duration-500 ${
                  isVisible ? 'opacity-100' : 'opacity-0 translate-y-2'
                }`}
              >
                {done ? (
                  <CheckIcon />
                ) : isActive ? (
                  <SpinnerIcon />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <span
                  className={`text-sm transition-colors duration-300 ${
                    done
                      ? 'text-neutral-500'
                      : isActive
                        ? 'text-neutral-300'
                        : 'text-neutral-600'
                  }`}
                >
                  {text}
                </span>
              </div>
            )
          })}
        </div>

        {/* Timeout fallback */}
        {timedOut && !auth.isAuthenticated && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-neutral-500">
              Taking longer than expected.
            </p>
            <button
              onClick={() => { window.location.href = '/login' }}
              className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Return to login
            </button>
          </div>
        )}

        {/* Error state */}
        {auth.error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/15 p-3">
            <p className="text-sm text-red-400">
              Something went wrong. Redirecting to login...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-violet-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
