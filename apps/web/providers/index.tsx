'use client'

import { OidcAuthProvider } from './oidc-auth'
import { OmniAuthProvider } from './omni-auth'
import { ThemeProvider } from '@/components/theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OidcAuthProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <OmniAuthProvider>{children}</OmniAuthProvider>
      </ThemeProvider>
    </OidcAuthProvider>
  )
}
