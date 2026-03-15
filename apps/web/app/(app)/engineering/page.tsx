'use client'

import { useTable } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables } from '@/generated'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
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
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  Clock,
  Bot,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(ts: any): string {
  if (ts === undefined || ts === null) return '—'
  try { return ts.toDate().toLocaleDateString() } catch { return '—' }
}

function truncate(str: string | undefined | null, maxLen = 60): string {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ─── Status Badges ──────────────────────────────────────────────────────────

const prStatusStyles: Record<string, string> = {
  Open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  UnderReview: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  ChangesRequested: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Merged: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Closed: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
}

function PrStatusBadge({ status }: { status: { tag: string } }) {
  const cls = prStatusStyles[status.tag] ?? prStatusStyles.Closed
  const label = status.tag === 'UnderReview' ? 'Under Review'
    : status.tag === 'ChangesRequested' ? 'Changes Req.'
    : status.tag
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{label}</span>
}

const bugStatusStyles: Record<string, string> = {
  New: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Triaged: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  InProgress: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  FixInReview: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Verified: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  Closed: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
}

function BugStatusBadge({ status }: { status: { tag: string } }) {
  const cls = bugStatusStyles[status.tag] ?? bugStatusStyles.Closed
  const label = status.tag === 'InProgress' ? 'In Progress' : status.tag === 'FixInReview' ? 'Fix In Review' : status.tag
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{label}</span>
}

const severityStyles: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Low: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
}

function SeverityBadge({ severity }: { severity: { tag: string } }) {
  const cls = severityStyles[severity.tag] ?? severityStyles.Low
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{severity.tag}</span>
}

function PriorityBadge({ priority }: { priority: { tag: string } }) {
  const map: Record<string, string> = {
    Urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    Low: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
  }
  const cls = map[priority.tag] ?? map.Low
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{priority.tag}</span>
}

const platformStyles: Record<string, string> = {
  GitHub: 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
  GitLab: 'bg-orange-600 text-white',
  Bitbucket: 'bg-blue-700 text-white',
}

function PlatformBadge({ platform }: { platform: { tag: string } }) {
  const cls = platformStyles[platform.tag] ?? 'bg-neutral-500 text-white'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{platform.tag}</span>
}

function AiCheck({ value }: { value: boolean }) {
  return value
    ? <CheckCircle2 className="size-4 text-emerald-500" />
    : <XCircle className="size-4 text-muted-foreground/30" />
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EngineeringPage() {
  const [allPRs] = useTable(tables.pull_request)
  const [allBugs] = useTable(tables.bug)
  const [allRepos] = useTable(tables.code_repository)
  const [prSearch, setPrSearch] = useState('')
  const [bugSearch, setBugSearch] = useState('')
  const [prStatusFilter, setPrStatusFilter] = useState<string>('all')
  const [bugSeverityFilter, setBugSeverityFilter] = useState<string>('all')

  const pullRequests = useMemo(
    () => [...allPRs].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allPRs]
  )

  const reposMap = useMemo(
    () => new Map(allRepos.map(r => [r.id, r])),
    [allRepos]
  )

  const filteredPRs = useMemo(() => {
    let prs = pullRequests
    if (prStatusFilter !== 'all') prs = prs.filter(p => p.status.tag === prStatusFilter)
    if (prSearch) {
      const q = prSearch.toLowerCase()
      prs = prs.filter(p => p.title.toLowerCase().includes(q))
    }
    return prs
  }, [pullRequests, prStatusFilter, prSearch])

  const prKpis = useMemo(() => {
    const total = pullRequests.length
    const open = pullRequests.filter(p => p.status.tag === 'Open').length
    const underReview = pullRequests.filter(p => p.status.tag === 'UnderReview').length
    const merged = pullRequests.filter(p => p.status.tag === 'Merged').length
    const aiReviewedCount = pullRequests.filter(p => p.aiReviewed).length
    const aiReviewedPct = total > 0 ? Math.round((aiReviewedCount / total) * 100) : 0
    return { total, open, underReview, merged, aiReviewedPct }
  }, [pullRequests])

  const bugs = useMemo(
    () => [...allBugs].sort((a, b) => Number(b.reportedAt.toMillis()) - Number(a.reportedAt.toMillis())),
    [allBugs]
  )

  const filteredBugs = useMemo(() => {
    let b = bugs
    if (bugSeverityFilter !== 'all') b = b.filter(bug => bug.severity.tag === bugSeverityFilter)
    if (bugSearch) {
      const q = bugSearch.toLowerCase()
      b = b.filter(bug => bug.title.toLowerCase().includes(q))
    }
    return b
  }, [bugs, bugSeverityFilter, bugSearch])

  const bugKpis = useMemo(() => {
    const total = bugs.length
    const critical = bugs.filter(b => b.severity.tag === 'Critical').length
    const inProgress = bugs.filter(b => b.status.tag === 'InProgress').length
    const resolved = bugs.filter(b => b.status.tag === 'Resolved' || b.status.tag === 'Verified' || b.status.tag === 'Closed').length
    const aiTriagedCount = bugs.filter(b => b.aiTriaged).length
    const aiTriagedPct = total > 0 ? Math.round((aiTriagedCount / total) * 100) : 0
    return { total, critical, inProgress, resolved, aiTriagedPct }
  }, [bugs])

  const repos = useMemo(
    () => [...allRepos].sort((a, b) => a.name.localeCompare(b.name)),
    [allRepos]
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#F97316', '#EF4444', '#8B5CF6']} animationSpeed={4} className="text-2xl font-bold">
              Engineering
            </GradientText>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered code reviews, automated bug triage, and repository insights
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Bot className="size-3" />
            {prKpis.aiReviewedPct}% AI coverage
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pull-requests">
        <TabsList>
          <TabsTrigger value="pull-requests" className="gap-1.5">
            <GitPullRequest className="size-3.5" />
            PRs ({pullRequests.length})
          </TabsTrigger>
          <TabsTrigger value="bugs" className="gap-1.5">
            <Bug className="size-3.5" />
            Bugs ({bugs.length})
          </TabsTrigger>
          <TabsTrigger value="repositories" className="gap-1.5">
            <GitBranch className="size-3.5" />
            Repos ({repos.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pull Requests ──────────────────────────────────────────── */}
        <TabsContent value="pull-requests" className="space-y-4 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total PRs', value: prKpis.total, icon: GitPullRequest, color: 'text-blue-500', bg: 'bg-blue-500/10', spot: 'rgba(59, 130, 246, 0.12)' },
              { label: 'Open', value: prKpis.open, icon: Code2, color: 'text-amber-500', bg: 'bg-amber-500/10', spot: 'rgba(245, 158, 11, 0.12)' },
              { label: 'Merged', value: prKpis.merged, icon: CheckCircle2, color: 'text-violet-500', bg: 'bg-violet-500/10', spot: 'rgba(139, 92, 246, 0.12)' },
              { label: 'AI Reviewed', value: prKpis.aiReviewedPct, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', spot: 'rgba(16, 185, 129, 0.12)', suffix: '%' },
            ].map((kpi) => (
              <SpotlightCard key={kpi.label} className="rounded-xl border bg-card text-card-foreground shadow-sm" spotlightColor={kpi.spot}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                      <kpi.icon className={`size-3.5 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    <CountUp to={kpi.value} duration={1.2} />
                    {'suffix' in kpi && <span className="text-sm text-muted-foreground">{(kpi as any).suffix}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search PRs..."
                className="pl-9 h-8 text-xs"
                value={prSearch}
                onChange={(e) => setPrSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              {['all', 'Open', 'UnderReview', 'Merged', 'Closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    prStatusFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'UnderReview' ? 'Review' : s}
                </button>
              ))}
            </div>
          </div>

          {/* PR Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Title</TableHead>
                    <TableHead>Repo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">AI</TableHead>
                    <TableHead className="text-center">
                      <Shield className="size-3 text-red-500 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center">
                      <Zap className="size-3 text-amber-500 mx-auto" />
                    </TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPRs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <GitPullRequest className="size-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No pull requests found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPRs.map(pr => {
                      const repo = reposMap.get(pr.repositoryId)
                      return (
                        <TableRow key={pr.id.toString()} className="group">
                          <TableCell className="max-w-xs">
                            <span className="text-sm font-medium line-clamp-1">{pr.title}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {pr.externalId || pr.author.toHexString().slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {repo?.name ?? '—'}
                          </TableCell>
                          <TableCell>
                            <PrStatusBadge status={pr.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center"><AiCheck value={pr.aiReviewed} /></div>
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.securityIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold">
                                {pr.securityIssues.length}
                              </span>
                            ) : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.performanceIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                {pr.performanceIssues.length}
                              </span>
                            ) : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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

        {/* ── Tab: Bugs ───────────────────────────────────────────────────── */}
        <TabsContent value="bugs" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Bugs', value: bugKpis.total, icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10', spot: 'rgba(239, 68, 68, 0.12)' },
              { label: 'Critical', value: bugKpis.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10', spot: 'rgba(220, 38, 38, 0.12)' },
              { label: 'Resolved', value: bugKpis.resolved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', spot: 'rgba(16, 185, 129, 0.12)' },
              { label: 'AI Triaged', value: bugKpis.aiTriagedPct, icon: Bot, color: 'text-violet-500', bg: 'bg-violet-500/10', spot: 'rgba(139, 92, 246, 0.12)', suffix: '%' },
            ].map((kpi) => (
              <SpotlightCard key={kpi.label} className="rounded-xl border bg-card text-card-foreground shadow-sm" spotlightColor={kpi.spot}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                      <kpi.icon className={`size-3.5 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    <CountUp to={kpi.value} duration={1.2} />
                    {'suffix' in kpi && <span className="text-sm text-muted-foreground">{(kpi as any).suffix}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Bug filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                className="pl-9 h-8 text-xs"
                value={bugSearch}
                onChange={(e) => setBugSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              {['all', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
                <button
                  key={s}
                  onClick={() => setBugSeverityFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    bugSeverityFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">AI</TableHead>
                    <TableHead>Suggested Fix</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Bug className="size-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No bugs found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBugs.map(bug => (
                      <TableRow key={bug.id.toString()}>
                        <TableCell className="max-w-xs">
                          <span className="text-sm font-medium line-clamp-1">{bug.title}</span>
                        </TableCell>
                        <TableCell><SeverityBadge severity={bug.severity} /></TableCell>
                        <TableCell><PriorityBadge priority={bug.priority} /></TableCell>
                        <TableCell><BugStatusBadge status={bug.status} /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center"><AiCheck value={bug.aiTriaged} /></div>
                        </TableCell>
                        <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                          <span title={bug.aiSuggestedFix ?? undefined}>{truncate(bug.aiSuggestedFix, 50)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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

        {/* ── Tab: Repositories ───────────────────────────────────────────── */}
        <TabsContent value="repositories" className="mt-4">
          {repos.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Database className="size-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No repositories connected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect your GitHub, GitLab, or Bitbucket repositories to start tracking code activity
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map(repo => (
                <SpotlightCard
                  key={repo.id.toString()}
                  className="rounded-xl border bg-card text-card-foreground shadow-sm"
                  spotlightColor={repo.aiIndexed ? 'rgba(139, 92, 246, 0.12)' : 'rgba(100, 100, 100, 0.08)'}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold">{repo.name}</p>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline mt-0.5 truncate max-w-full"
                        >
                          <ExternalLink className="size-2.5 shrink-0" />
                          <span className="truncate">{repo.url}</span>
                        </a>
                      </div>
                      <PlatformBadge platform={repo.platform} />
                    </div>

                    {repo.primaryLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {repo.primaryLanguages.map(lang => (
                          <Badge key={lang} variant="secondary" className="text-[10px] px-1.5 py-0">{lang}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        {repo.aiIndexed ? (
                          <>
                            <Zap className="size-3 text-violet-500" />
                            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">AI Indexed</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-3 text-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground">Not Indexed</span>
                          </>
                        )}
                      </div>
                      {repo.aiIndexed && repo.lastIndexed != null && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {formatTimestamp(repo.lastIndexed)}
                        </span>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
