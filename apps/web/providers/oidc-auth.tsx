'use client'

import { AuthProvider, type AuthProviderProps } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'
import { useEffect, useState } from 'react'

const oidcConfig: AuthProviderProps = {
  authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID!,
  redirect_uri: process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI!,
  post_logout_redirect_uri: process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI!,
  scope: 'openid email profile',
  response_type: 'code',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

export function OidcAuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">Ω</span>
          </div>
          <div className="animate-pulse">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Initializing...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider
      {...oidcConfig}
      userStore={new WebStorageStateStore({ store: window.localStorage })}
    >
      {children}
    </AuthProvider>
  )
}
