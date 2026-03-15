'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Book,
  Package,
  Palette,
  Users,
  Settings,
  Rocket,
  Shield,
  FileText,
  Eye,
  ThumbsUp,
  Pin,
  ArrowLeft,
  Clock,
  BookOpen,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

// ---- Types ------------------------------------------------------------------

type ArticleCategory = 'engineering' | 'product' | 'design' | 'hr' | 'operations' | 'onboarding' | 'security' | 'general'

type Article = {
  id: string
  title: string
  content: string
  category: ArticleCategory
  author: string
  createdAt: Date
  updatedAt: Date
  views: number
  helpful: number
  tags: string[]
  pinned: boolean
}

// ---- Category config --------------------------------------------------------

const CATEGORY_CONFIG: Record<ArticleCategory, { icon: typeof Book; color: string; label: string }> = {
  engineering: { icon: Book, color: 'violet', label: 'Engineering' },
  product: { icon: Package, color: 'blue', label: 'Product' },
  design: { icon: Palette, color: 'pink', label: 'Design' },
  hr: { icon: Users, color: 'amber', label: 'HR & People' },
  operations: { icon: Settings, color: 'emerald', label: 'Operations' },
  onboarding: { icon: Rocket, color: 'orange', label: 'Onboarding' },
  security: { icon: Shield, color: 'red', label: 'Security' },
  general: { icon: FileText, color: 'neutral', label: 'General' },
}

function categoryBadgeClass(cat: ArticleCategory): string {
  const c = CATEGORY_CONFIG[cat].color
  return `bg-${c}-500/10 text-${c}-600 dark:text-${c}-400 border-${c}-500/20`
}

// ---- Sample data ------------------------------------------------------------

const SAMPLE_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Getting Started with SpacetimeDB',
    content: `SpacetimeDB is a next-generation database that combines the power of a relational database with built-in application logic. This guide covers the essential concepts you need to know to get up and running.\n\nFirst, install the SpacetimeDB CLI using your preferred package manager. The CLI allows you to create, publish, and manage your database modules locally or in the cloud. Make sure to run spacetime start to spin up a local instance for development.\n\nTables are defined using Rust structs with the #[table] attribute. Each table needs an accessor name and can be marked as public for client subscriptions. Primary keys, auto-increment fields, and indexes are configured through column attributes.\n\nReducers are the transactional functions that modify your data. They receive a ReducerContext and must be deterministic. Never use filesystem access, network calls, or random number generators inside reducers. Use ctx.rng for randomness and ctx.timestamp for the current time.`,
    category: 'engineering',
    author: 'Sarah Chen',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-10'),
    views: 342,
    helpful: 89,
    tags: ['spacetimedb', 'getting-started', 'rust'],
    pinned: true,
  },
  {
    id: '2',
    title: 'Design System Guidelines v3',
    content: `Our design system is built on a foundation of consistency, accessibility, and developer experience. This document outlines the key principles and component usage patterns that every designer and developer should follow.\n\nColor tokens are defined in our Tailwind configuration and should always be referenced through semantic names rather than raw hex values. Use the dark mode variants (dark:) for all color applications. The primary palette uses violet/purple gradients for interactive elements.\n\nTypography follows a strict scale: text-xs for metadata, text-sm for body copy in compact layouts, text-base for standard body text, and text-lg through text-2xl for headings. Never use arbitrary font sizes outside the Tailwind scale.\n\nSpacing uses the 4px grid system. Components should use p-4 or p-6 for internal padding, and gap-4 or gap-6 for layout spacing. Maintain consistent border-radius values: rounded-lg for cards, rounded-xl for modals, and rounded-full for avatars and pills.`,
    category: 'design',
    author: 'Marcus Rivera',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-08'),
    views: 256,
    helpful: 67,
    tags: ['design-system', 'tailwind', 'components'],
    pinned: true,
  },
  {
    id: '3',
    title: 'New Employee Onboarding Checklist',
    content: `Welcome to the team! This checklist will guide you through your first two weeks. Complete each item in order to ensure you have access to all the tools and knowledge you need to be productive.\n\nWeek 1 focuses on access and orientation. Set up your development environment following the Engineering Setup Guide. Request access to GitHub, Vercel, and SpacetimeDB dashboard through the IT portal. Attend the Welcome session on Monday and the Architecture Overview on Wednesday.\n\nWeek 2 is about integration and first contributions. Pair with your assigned buddy on a starter task. Review the codebase architecture document and the relevant team-specific wiki pages. Submit your first pull request by end of week, even if it is a small documentation fix.\n\nDon't hesitate to ask questions in the #help Slack channel. Everyone remembers being new, and the team is here to support you. Your manager will schedule weekly 1:1s starting from your second week.`,
    category: 'onboarding',
    author: 'Priya Patel',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-02-28'),
    views: 189,
    helpful: 45,
    tags: ['onboarding', 'new-hire', 'checklist'],
    pinned: true,
  },
  {
    id: '4',
    title: 'Incident Response Procedure',
    content: `When a production incident is detected, the first responder must assess severity and begin the response protocol immediately. This document defines the severity levels and required actions for each.\n\nSEV-1 (Critical): Complete service outage or data loss. Page the on-call engineer immediately. Open a war room channel in Slack (#incident-YYYY-MM-DD). The on-call engineer becomes Incident Commander until a senior engineer takes over. All hands are expected to respond within 15 minutes.\n\nSEV-2 (Major): Significant degradation affecting more than 25% of users. Notify the on-call engineer via PagerDuty. Open an incident channel and begin diagnosis. Target resolution within 2 hours. Post status updates every 30 minutes.\n\nSEV-3 (Minor): Limited impact, workaround available. Create a ticket in the engineering queue. Address during normal working hours. Post a brief summary in #engineering once resolved. All incidents require a post-mortem within 48 hours of resolution.`,
    category: 'security',
    author: 'James Okonkwo',
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-03-01'),
    views: 178,
    helpful: 52,
    tags: ['incident-response', 'security', 'on-call'],
    pinned: false,
  },
  {
    id: '5',
    title: 'Product Roadmap Q2 2026',
    content: `This quarter we are focused on three key themes: real-time collaboration, AI-powered automation, and platform scalability. Each theme maps to specific deliverables with clear ownership and target dates.\n\nReal-time Collaboration: Launch the shared canvas feature with multi-cursor support by mid-April. The messaging system will get threaded replies and emoji reactions. The knowledge base (this very tool!) will support collaborative editing.\n\nAI-Powered Automation: Expand the AI agent capabilities to handle ticket triage, candidate screening, and sales lead qualification autonomously. The AI studio will get a new prompt playground for testing custom agent behaviors. Target: 40% of support tickets auto-resolved by end of Q2.\n\nPlatform Scalability: Migrate to SpacetimeDB 2.0 subscription model for improved real-time performance. Implement org-level data isolation and role-based access controls. Deploy to three additional cloud regions for latency reduction.`,
    category: 'product',
    author: 'Elena Vasquez',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-12'),
    views: 421,
    helpful: 93,
    tags: ['roadmap', 'q2-2026', 'strategy'],
    pinned: false,
  },
  {
    id: '6',
    title: 'Code Review Best Practices',
    content: `Code reviews are a critical part of our development process. They serve multiple purposes: catching bugs early, sharing knowledge across the team, maintaining code quality standards, and mentoring junior developers.\n\nAs an author, keep PRs small and focused. A good PR changes fewer than 400 lines and addresses a single concern. Write a clear description explaining the what, why, and how. Include screenshots for UI changes. Link the relevant ticket or issue.\n\nAs a reviewer, aim to complete reviews within 4 hours of being assigned. Start with the PR description and understand the context before reading code. Distinguish between blocking issues (must fix), suggestions (nice to have), and nits (style preferences). Use conventional comments: prefix with "blocking:", "suggestion:", or "nit:".\n\nAutomate what you can. Our CI pipeline runs linting, type checking, and tests automatically. Don't waste review time on issues that tooling can catch. Focus your human attention on logic, architecture, and edge cases.`,
    category: 'engineering',
    author: 'Alex Kim',
    createdAt: new Date('2026-01-25'),
    updatedAt: new Date('2026-02-20'),
    views: 298,
    helpful: 76,
    tags: ['code-review', 'best-practices', 'engineering'],
    pinned: false,
  },
  {
    id: '7',
    title: 'Remote Work & Time Off Policy',
    content: `We operate as a remote-first company with flexible working hours. This policy outlines the expectations and guidelines for remote work, time off, and communication norms.\n\nCore hours are 10:00 AM to 2:00 PM in your local timezone. During core hours, you should be available for synchronous communication (Slack, video calls). Outside core hours, you are free to structure your day as you see fit. Async communication is the default.\n\nPTO is unlimited but must be coordinated with your team. Submit time off requests at least 2 weeks in advance for planned absences. For emergencies, notify your manager as soon as possible. We encourage everyone to take at least 20 days off per year.\n\nSick days do not count against PTO. If you are unwell, notify your manager and take the time you need to recover. No doctor's note is required for absences under 5 consecutive days. Mental health days are treated the same as physical sick days.`,
    category: 'hr',
    author: 'Jordan Taylor',
    createdAt: new Date('2026-02-05'),
    updatedAt: new Date('2026-02-15'),
    views: 534,
    helpful: 112,
    tags: ['remote-work', 'pto', 'policy'],
    pinned: false,
  },
  {
    id: '8',
    title: 'Deployment Pipeline Overview',
    content: `Our deployment pipeline is designed for speed and safety. Every change goes through a standardized flow from commit to production, with automated checks at every stage.\n\nThe pipeline starts when you push to a feature branch. GitHub Actions runs lint, type checking, and unit tests in parallel. If all pass, a preview deployment is created on Vercel. The preview URL is posted as a comment on your PR for easy review.\n\nOnce the PR is approved and merged to main, the production deployment begins automatically. The backend module is published to SpacetimeDB maincloud using spacetime publish. The frontend deploys through Vercel's automatic GitHub integration. Both processes complete in under 3 minutes.\n\nRollbacks are handled by reverting the merge commit on main and pushing. Vercel will automatically redeploy the previous version. For backend rollbacks, use spacetime publish with the previous module version. Always verify rollbacks in the SpacetimeDB dashboard logs.`,
    category: 'operations',
    author: 'Sarah Chen',
    createdAt: new Date('2026-02-18'),
    updatedAt: new Date('2026-03-05'),
    views: 267,
    helpful: 58,
    tags: ['deployment', 'ci-cd', 'vercel', 'spacetimedb'],
    pinned: false,
  },
  {
    id: '9',
    title: 'Accessibility Standards & Testing',
    content: `All user-facing features must meet WCAG 2.1 Level AA compliance. This document explains our accessibility standards and the testing procedures required before any feature can ship.\n\nSemantic HTML is the foundation. Use proper heading hierarchy (h1 through h6), landmark regions (nav, main, aside), and interactive elements (button for actions, anchor for navigation). Never use div or span for clickable elements without proper ARIA roles.\n\nColor contrast must meet a minimum ratio of 4.5:1 for normal text and 3:1 for large text. Our dark mode palette has been audited for compliance, but always verify custom colors with a contrast checker. Do not rely on color alone to convey information.\n\nKeyboard navigation must work for all interactive flows. Every focusable element needs a visible focus indicator. Tab order should follow the visual reading order. Modals must trap focus. Test with screen readers (VoiceOver on Mac, NVDA on Windows) at least once per major feature.`,
    category: 'design',
    author: 'Marcus Rivera',
    createdAt: new Date('2026-02-22'),
    updatedAt: new Date('2026-03-07'),
    views: 145,
    helpful: 38,
    tags: ['accessibility', 'wcag', 'testing'],
    pinned: false,
  },
  {
    id: '10',
    title: 'API Authentication & Security Practices',
    content: `Security is everyone's responsibility. This guide covers the authentication patterns and security practices that must be followed in all backend and client code.\n\nAuthentication is handled through SpacetimeDB's built-in identity system. The ctx.sender field provides the authenticated identity of the caller. Never trust identity values passed as reducer arguments. Always use ctx.sender for authorization checks.\n\nAll tables containing sensitive data must be private (not marked with public). Use reducers to expose only the data each user is authorized to access. Implement org-scoped queries by filtering on the organization ID associated with the caller's identity.\n\nInput validation must happen in every reducer. Check string lengths, numeric ranges, and required fields before any database operations. Return descriptive error messages using Result<(), String>. Never panic in reducers as it destroys the WASM instance and provides no useful error to the client.`,
    category: 'security',
    author: 'James Okonkwo',
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date('2026-03-14'),
    views: 203,
    helpful: 61,
    tags: ['security', 'authentication', 'api'],
    pinned: false,
  },
]

// ---- Sort options -----------------------------------------------------------

type SortOption = 'recent' | 'views' | 'helpful'

// =============================================================================
// Page component
// =============================================================================

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>(SAMPLE_ARTICLES)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  // Derived data
  const totalViews = useMemo(() => articles.reduce((sum, a) => sum + a.views, 0), [articles])
  const pinnedCount = useMemo(() => articles.filter((a) => a.pinned).length, [articles])
  const categories = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of articles) {
      counts[a.category] = (counts[a.category] || 0) + 1
    }
    return counts
  }, [articles])
  const uniqueCategories = useMemo(() => new Set(articles.map((a) => a.category)).size, [articles])

  // Filtered & sorted articles
  const filteredArticles = useMemo(() => {
    let result = [...articles]

    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.author.toLowerCase().includes(q)
      )
    }

    // Pinned articles first, then sort
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      switch (sortBy) {
        case 'views':
          return b.views - a.views
        case 'helpful':
          return b.helpful - a.helpful
        case 'recent':
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime()
      }
    })

    return result
  }, [articles, selectedCategory, searchQuery, sortBy])

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) ?? null,
    [articles, selectedArticleId]
  )

  // Pinned articles for sidebar
  const pinnedArticles = useMemo(() => articles.filter((a) => a.pinned), [articles])

  function handleHelpful(articleId: string) {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, helpful: a.helpful + 1 } : a))
    )
  }

  function handleViewArticle(articleId: string) {
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, views: a.views + 1 } : a))
    )
    setSelectedArticleId(articleId)
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
          <BookOpen className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#8b5cf6', '#7c3aed', '#6d28d9']} animationSpeed={6}>
              Knowledge Base
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Internal wiki, guides, and documentation
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SpotlightCard className="!bg-card !border-border" spotlightColor="rgba(139,92,246,0.15)">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Articles
          </p>
          <span className="text-3xl font-bold text-foreground">
            <CountUp to={articles.length} />
          </span>
        </SpotlightCard>
        <SpotlightCard className="!bg-card !border-border" spotlightColor="rgba(139,92,246,0.15)">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Categories
          </p>
          <span className="text-3xl font-bold text-foreground">
            <CountUp to={uniqueCategories} />
          </span>
        </SpotlightCard>
        <SpotlightCard className="!bg-card !border-border" spotlightColor="rgba(139,92,246,0.15)">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Views
          </p>
          <span className="text-3xl font-bold text-foreground">
            <CountUp to={totalViews} separator="," />
          </span>
        </SpotlightCard>
        <SpotlightCard className="!bg-card !border-border" spotlightColor="rgba(139,92,246,0.15)">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Pinned Articles
          </p>
          <span className="text-3xl font-bold text-foreground">
            <CountUp to={pinnedCount} />
          </span>
        </SpotlightCard>
      </div>

      {/* Search bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search articles, tags, or authors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6 min-h-0">
        {/* Left sidebar */}
        <div className="w-1/4 min-w-[220px] flex-shrink-0 space-y-6">
          {/* Category list */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>All Articles</span>
                <span className="text-xs tabular-nums">{articles.length}</span>
              </button>
              {(Object.keys(CATEGORY_CONFIG) as ArticleCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const Icon = config.icon
                const count = categories[cat] || 0
                if (count === 0) return null
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {config.label}
                    </span>
                    <span className="text-xs tabular-nums">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pinned articles */}
          {pinnedArticles.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Pin className="size-3.5" />
                Pinned
              </h3>
              <div className="space-y-2">
                {pinnedArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleViewArticle(article.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <p className="font-medium text-foreground truncate">{article.title}</p>
                    <p className="text-xs mt-0.5 truncate">
                      {CATEGORY_CONFIG[article.category].label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {selectedArticle ? (
            /* ---- Article reader ---- */
            <div className="rounded-xl border border-border bg-card">
              <div className="p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedArticleId(null)}
                  className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back to articles
                </Button>

                <h2 className="text-xl font-bold text-foreground mb-3">{selectedArticle.title}</h2>

                {/* Metadata bar */}
                <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedArticle.author}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {formatDate(selectedArticle.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {selectedArticle.views} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="size-3.5" />
                    {selectedArticle.helpful} helpful
                  </span>
                  <Badge
                    variant="outline"
                    className={categoryBadgeClass(selectedArticle.category)}
                  >
                    {CATEGORY_CONFIG[selectedArticle.category].label}
                  </Badge>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Content paragraphs */}
                <div className="space-y-4">
                  {selectedArticle.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Helpful button */}
                <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Was this helpful?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHelpful(selectedArticle.id)}
                    className="gap-1.5"
                  >
                    <ThumbsUp className="size-3.5" />
                    Yes ({selectedArticle.helpful})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ---- Article list ---- */
            <>
              {/* Sort bar */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground mr-1">Sort by:</span>
                {(['recent', 'views', 'helpful'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      sortBy === option
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {option === 'recent' ? 'Recent' : option === 'views' ? 'Most Viewed' : 'Most Helpful'}
                  </button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                </span>
              </div>

              <ScrollArea className="h-[calc(100vh-26rem)]">
                <div className="space-y-3">
                  {filteredArticles.length === 0 ? (
                    <div className="text-center py-16">
                      <BookOpen className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No articles found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Try a different search or category
                      </p>
                    </div>
                  ) : (
                    filteredArticles.map((article) => {
                      const config = CATEGORY_CONFIG[article.category]
                      const Icon = config.icon
                      const excerpt = article.content.slice(0, 120) + (article.content.length > 120 ? '...' : '')

                      return (
                        <button
                          key={article.id}
                          onClick={() => handleViewArticle(article.id)}
                          className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {article.pinned && (
                                  <Pin className="size-3.5 text-amber-500 flex-shrink-0" />
                                )}
                                <h3 className="text-sm font-semibold text-foreground truncate">
                                  {article.title}
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {excerpt}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-5 ${categoryBadgeClass(article.category)}`}
                                >
                                  <Icon className="size-3 mr-1" />
                                  {config.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {article.author}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(article.updatedAt)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Eye className="size-3" />
                                  {article.views}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ThumbsUp className="size-3" />
                                  {article.helpful}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
