'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  Headset,
  TrendingUp,
  Users,
  Code,
  MessageSquare,
  Shield,
} from 'lucide-react'

export default function LandingPage() {
  const auth = useAuth()
  const router = useRouter()

  const handleGoogleSignIn = () => {
    auth.signinRedirect()
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Navigation */}
      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Ω</span>
            </div>
            <span className="font-semibold text-lg">Omni</span>
          </div>
          <div>
            {auth.isAuthenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium mb-8">
            <Bot className="w-3.5 h-3.5" />
            AI-Powered Workforce Platform
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-600 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
            The operating system for hybrid teams
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Omni unifies your human and AI workforce into a single platform.
            Manage support, sales, engineering, and recruitment with AI employees
            that work alongside your team in real-time.
          </p>

          {/* Sign-in CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
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
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                Sign in with Google Workspace
              </span>
            </button>

            <button
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-xl text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              <span className="font-medium">Microsoft — Coming Soon</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-center mb-4">
            Everything your hybrid team needs
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-center mb-12 max-w-xl mx-auto">
            One platform for your entire organization. AI employees handle
            routine work while your team focuses on what matters.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Headset className="w-5 h-5" />}
              title="Support"
              description="AI agents resolve tickets, escalate edge cases, and maintain SLAs around the clock."
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Sales"
              description="Track leads, automate outreach, and let AI qualify prospects before your team engages."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Recruitment"
              description="Screen candidates, schedule interviews, and manage your pipeline with AI assistance."
            />
            <FeatureCard
              icon={<Code className="w-5 h-5" />}
              title="Engineering"
              description="Triage bugs, manage sprints, and pair AI agents with developers on tasks."
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Collaboration"
              description="Real-time messaging and document collaboration with AI teammates built in."
            />
            <FeatureCard
              icon={<Bot className="w-5 h-5" />}
              title="AI Employees"
              description="Create, train, and deploy AI agents that integrate directly into your workflows."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Workspace SSO"
              description="Onboard your entire team with Google or Microsoft Workspace single sign-on."
            />
            <FeatureCard
              icon={<ArrowRight className="w-5 h-5" />}
              title="Get Started"
              description="Sign in with your workspace account. Your team can join instantly — no setup required."
              highlighted
              onClick={auth.isAuthenticated ? () => router.push('/dashboard') : handleGoogleSignIn}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">Ω</span>
            </div>
            <span>Omni by Darthwares</span>
          </div>
          <span>Powered by SpacetimeDB</span>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  highlighted,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  highlighted?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`text-left p-5 rounded-xl border transition-colors ${
        highlighted
          ? 'bg-violet-600 border-violet-500 text-white hover:bg-violet-700 cursor-pointer'
          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
          highlighted
            ? 'bg-white/20'
            : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
        }`}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p
        className={`text-sm leading-relaxed ${
          highlighted
            ? 'text-violet-100'
            : 'text-neutral-600 dark:text-neutral-400'
        }`}
      >
        {description}
      </p>
    </Comp>
  )
}
