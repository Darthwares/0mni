'use client'

import { useTable } from 'spacetimedb/react'
import { useMemo } from 'react'
import { tables } from '@/generated'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GitPullRequest,
  Bug,
  GitBranch,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Database,
  Code2,
  Sparkles,
  Bot,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(ts: any): string {
  if (ts === undefined || ts === null) return '—'
  try { return ts.toDate().toLocaleDateString() } catch { return '—' }
}

function truncate(str: string | undefined | null, maxLen = 60): string {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ─── Badge helpers (dark-mode compatible) ────────────────────────────────────

function prStatusClass(tag: string): { cls: string; dot: string; label: string } {
  switch (tag) {
    case 'Open':             return { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500', label: 'Open' }
    case 'UnderReview':      return { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500', label: 'Under Review' }
    case 'ChangesRequested': return { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500', label: 'Changes Req.' }
    case 'Approved':         return { cls: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', dot: 'bg-green-500', label: 'Approved' }
    case 'Merged':           return { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dot: 'bg-purple-500', label: 'Merged' }
    case 'Closed':           return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400', label: 'Closed' }
    default:                 return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400', label: tag }
  }
}

function bugStatusClass(tag: string): { cls: string; dot: string; label: string } {
  switch (tag) {
    case 'New':          return { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500', label: 'New' }
    case 'Triaged':      return { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500', label: 'Triaged' }
    case 'InProgress':   return { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500', label: 'In Progress' }
    case 'FixInReview':  return { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dot: 'bg-purple-500', label: 'Fix In Review' }
    case 'Resolved':     return { cls: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', dot: 'bg-green-500', label: 'Resolved' }
    case 'Verified':     return { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Verified' }
    case 'Closed':       return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400', label: 'Closed' }
    default:             return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400', label: tag }
  }
}

function severityClass(tag: string): { cls: string; dot: string } {
  switch (tag) {
    case 'Critical': return { cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', dot: 'bg-red-500' }
    case 'High':     return { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' }
    case 'Medium':   return { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' }
    case 'Low':      return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' }
    default:         return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' }
  }
}

function priorityClass(tag: string): { cls: string; dot: string } {
  switch (tag) {
    case 'Urgent': return { cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', dot: 'bg-red-500' }
    case 'High':   return { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' }
    case 'Medium': return { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' }
    case 'Low':    return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' }
    default:       return { cls: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' }
  }
}

function StatusBadge({ tag, config }: { tag: string; config: { cls: string; dot: string; label: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function DotBadge({ tag, config }: { tag: string; config: { cls: string; dot: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {tag}
    </span>
  )
}

function PlatformBadge({ platform }: { platform: { tag: string } }) {
  const map: Record<string, string> = {
    GitHub: 'bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 border-transparent',
    GitLab: 'bg-orange-600 text-white border-transparent',
    Bitbucket: 'bg-blue-700 text-white border-transparent',
  }
  const cls = map[platform.tag] ?? 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {platform.tag}
    </span>
  )
}

function AiCheck({ value }: { value: boolean }) {
  return value ? (
    <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/10">
      <CheckCircle2 className="size-3.5 text-emerald-500" />
    </div>
  ) : (
    <div className="flex items-center justify-center size-6 rounded-full bg-neutral-100 dark:bg-neutral-800">
      <XCircle className="size-3.5 text-neutral-300 dark:text-neutral-600" />
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EngineeringPage() {
  const [allPRs] = useTable(tables.pull_request)
  const [allBugs] = useTable(tables.bug)
  const [allRepos] = useTable(tables.code_repository)

  const pullRequests = useMemo(
    () => [...allPRs].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allPRs]
  )

  const reposMap = useMemo(
    () => new Map(allRepos.map(r => [r.id, r])),
    [allRepos]
  )

  const prKpis = useMemo(() => {
    const total = pullRequests.length
    const open = pullRequests.filter(p => p.status.tag === 'Open').length
    const underReview = pullRequests.filter(p => p.status.tag === 'UnderReview').length
    const aiReviewedCount = pullRequests.filter(p => p.aiReviewed).length
    const aiReviewedPct = total > 0 ? Math.round((aiReviewedCount / total) * 100) : 0
    return { total, open, underReview, aiReviewedPct }
  }, [pullRequests])

  const bugs = useMemo(
    () => [...allBugs].sort((a, b) => Number(b.reportedAt.toMillis()) - Number(a.reportedAt.toMillis())),
    [allBugs]
  )

  const bugKpis = useMemo(() => {
    const total = bugs.length
    const critical = bugs.filter(b => b.severity.tag === 'Critical').length
    const inProgress = bugs.filter(b => b.status.tag === 'InProgress').length
    const aiTriagedCount = bugs.filter(b => b.aiTriaged).length
    const aiTriagedPct = total > 0 ? Math.round((aiTriagedCount / total) * 100) : 0
    return { total, critical, inProgress, aiTriagedPct }
  }, [bugs])

  const repos = useMemo(
    () => [...allRepos].sort((a, b) => a.name.localeCompare(b.name)),
    [allRepos]
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
          <Code2 className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#06b6d4', '#3b82f6', '#6366f1', '#06b6d4']}
              animationSpeed={6}
            >
              Engineering
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered code reviews, automated bug triage, and repository insights
          </p>
        </div>
      </div>

      <Tabs defaultValue="pull-requests">
        <TabsList variant="line" className="border-b border-border w-full rounded-none pb-0 mb-0">
          <TabsTrigger value="pull-requests" className="gap-1.5">
            <GitPullRequest className="size-4" />
            Pull Requests
            <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
              {pullRequests.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bugs" className="gap-1.5">
            <Bug className="size-4" />
            Bugs
            <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
              {bugs.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="repositories" className="gap-1.5">
            <GitBranch className="size-4" />
            Repositories
            <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
              {repos.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pull Requests ──────────────────────────────────────── */}
        <TabsContent value="pull-requests" className="mt-6 flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(6, 182, 212, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <GitPullRequest className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total PRs</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                <CountUp to={prKpis.total} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <GitPullRequest className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Open</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                <CountUp to={prKpis.open} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Code2 className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">In Review</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                <CountUp to={prKpis.underReview} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI Reviewed</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                <CountUp to={prKpis.aiReviewedPct} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
              </p>
            </SpotlightCard>
          </div>

          {/* PR Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Title</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Repository</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">AI</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <Shield className="size-3 text-red-500" />
                        Sec
                      </span>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <Zap className="size-3 text-amber-500" />
                        Perf
                      </span>
                    </TableHead>
                    <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pullRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                            <GitPullRequest className="size-6 opacity-40" />
                          </div>
                          <p className="font-medium">No pull requests yet</p>
                          <p className="text-sm mt-1">Connect your repositories to start tracking PRs.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pullRequests.map(pr => {
                      const repo = reposMap.get(pr.repositoryId)
                      return (
                        <TableRow key={pr.id.toString()} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                          <TableCell className="pl-4 max-w-xs">
                            <span className="font-medium text-sm line-clamp-1" title={pr.title}>
                              {pr.title}
                            </span>
                            {pr.externalId && (
                              <span className="text-[11px] text-muted-foreground font-mono ml-1">
                                #{pr.externalId}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {repo?.name ?? <span className="italic opacity-50">Unknown</span>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge tag={pr.status.tag} config={prStatusClass(pr.status.tag)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <AiCheck value={pr.aiReviewed} />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.securityIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center size-6 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold">
                                {pr.securityIssues.length}
                              </span>
                            ) : (
                              <span className="text-neutral-300 dark:text-neutral-600 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.performanceIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                {pr.performanceIssues.length}
                              </span>
                            ) : (
                              <span className="text-neutral-300 dark:text-neutral-600 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-4 text-sm text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(pr.createdAt)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Bugs ──────────────────────────────────────────────── */}
        <TabsContent value="bugs" className="mt-6 flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.1)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                  <Bug className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Bugs</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                <CountUp to={bugKpis.total} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-600 to-red-700">
                  <Shield className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Critical</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                <CountUp to={bugKpis.critical} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(249, 115, 22, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                  <Code2 className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">In Progress</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                <CountUp to={bugKpis.inProgress} duration={1.5} />
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                  <Bot className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI Triaged</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                <CountUp to={bugKpis.aiTriagedPct} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
              </p>
            </SpotlightCard>
          </div>

          {/* Bug Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Title</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Severity</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Priority</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">AI</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Suggested Fix</TableHead>
                    <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold">Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                            <Bug className="size-6 opacity-40" />
                          </div>
                          <p className="font-medium">No bugs reported</p>
                          <p className="text-sm mt-1">Your codebase is clean!</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bugs.map(bug => (
                      <TableRow key={bug.id.toString()} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                        <TableCell className="pl-4 max-w-xs">
                          <span className="font-medium text-sm line-clamp-1" title={bug.title}>
                            {bug.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DotBadge tag={bug.severity.tag} config={severityClass(bug.severity.tag)} />
                        </TableCell>
                        <TableCell>
                          <DotBadge tag={bug.priority.tag} config={priorityClass(bug.priority.tag)} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge tag={bug.status.tag} config={bugStatusClass(bug.status.tag)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <AiCheck value={bug.aiTriaged} />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {bug.aiSuggestedFix ? (
                            <span className="text-xs text-muted-foreground leading-relaxed line-clamp-1" title={bug.aiSuggestedFix}>
                              {truncate(bug.aiSuggestedFix, 55)}
                            </span>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-600 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(bug.reportedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Repositories ──────────────────────────────────────── */}
        <TabsContent value="repositories" className="mt-6">
          {repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Database className="size-7 opacity-40" />
              </div>
              <p className="text-lg font-medium">No repositories connected</p>
              <p className="text-sm max-w-sm mt-1">
                Connect your GitHub, GitLab, or Bitbucket repositories to start tracking code activity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map(repo => (
                <Card key={repo.id.toString()} className="flex flex-col group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                  {/* Top gradient accent */}
                  <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {repo.name}
                      </CardTitle>
                      <PlatformBadge platform={repo.platform} />
                    </div>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 truncate max-w-full"
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="truncate">{repo.url}</span>
                    </a>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-3 flex-1">
                    {repo.primaryLanguages.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Languages</p>
                        <div className="flex flex-wrap gap-1">
                          {repo.primaryLanguages.map(lang => (
                            <Badge key={lang} variant="secondary" className="text-xs px-1.5 py-0">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <div className={`size-5 rounded-full flex items-center justify-center ${repo.aiIndexed ? 'bg-purple-500/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                          <Sparkles className={`size-3 ${repo.aiIndexed ? 'text-purple-500' : 'text-neutral-300 dark:text-neutral-600'}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {repo.aiIndexed ? 'AI Indexed' : 'Not Indexed'}
                        </span>
                      </div>
                      {repo.aiIndexed && repo.lastIndexed != null && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatTimestamp(repo.lastIndexed)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
