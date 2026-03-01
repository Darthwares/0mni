'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { useSpacetimeDB } from 'spacetimedb/react'
import Link from 'next/link'

const modules = [
  {
    id: 'support',
    name: 'Support',
    description: 'AI-powered customer support with 80% auto-resolution',
    icon: '💬',
    href: '/support',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Intelligent lead qualification and deal management',
    icon: '💰',
    href: '/sales',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'recruitment',
    name: 'Recruitment',
    description: 'Automated candidate screening and interview scheduling',
    icon: '👥',
    href: '/recruitment',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Unified workspace for teams and AI agents',
    icon: '🤝',
    href: '/collaboration',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'AI code reviews and automated bug triage',
    icon: '⚙️',
    href: '/engineering',
    color: 'from-indigo-500 to-blue-500',
  },
]

export default function DashboardPage() {
  const { identity, isConnected } = useSpacetimeDB()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Omni</h1>
              <p className="text-sm text-muted-foreground">AI Operating Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Identity: </span>
                <span className="font-mono text-xs">{identity?.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Status: {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome to Omni</h2>
            <p className="text-muted-foreground">
              Select a module below to get started. Human and AI employees work together seamlessly.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group relative overflow-hidden rounded-lg border p-6 hover:shadow-lg transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative z-10">
                  <div className="text-4xl mb-3">{module.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{module.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Open Module
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active Tasks</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">AI Agents Online</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Messages Today</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Auto-Resolved</p>
              <p className="text-2xl font-bold">0%</p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
