'use client'

import { useTable } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
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
  type LucideIcon,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(ts: any): string {
  if (ts === undefined || ts === null) return '—'
  try { return ts.toDate().toLocaleDateString() } catch { return '—' }
}

function truncate(str: string | undefined | null, maxLen = 60): string {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ─── PR Status Badge ─────────────────────────────────────────────────────────

function PrStatusBadge({ status }: { status: { tag: string } }) {
  const map: Record<string, string> = {
    Open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    UnderReview: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    ChangesRequested: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    Approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    Merged: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    Closed: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  }
  const cls = map[status.tag] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.tag === 'UnderReview' ? 'Under Review' : status.tag === 'ChangesRequested' ? 'Changes Req.' : status.tag}
    </span>
  )
}

// ─── Bug Status Badge ─────────────────────────────────────────────────────────

function BugStatusBadge({ status }: { status: { tag: string } }) {
  const map: Record<string, string> = {
    New: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Triaged: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    InProgress: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    FixInReview: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    Resolved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    Verified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    Closed: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  }
  const cls = map[status.tag] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  const label =
    status.tag === 'InProgress' ? 'In Progress' :
    status.tag === 'FixInReview' ? 'Fix In Review' :
    status.tag
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

// ─── Bug Severity Badge ───────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: { tag: string } }) {
  const map: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    Low: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  }
  const cls = map[severity.tag] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {severity.tag}
    </span>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: { tag: string } }) {
  const map: Record<string, string> = {
    Urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    Low: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  }
  const cls = map[priority.tag] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {priority.tag}
    </span>
  )
}

// ─── Platform Badge ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: { tag: string } }) {
  const map: Record<string, string> = {
    GitHub: 'bg-gray-900 text-white border-gray-900',
    GitLab: 'bg-orange-600 text-white border-orange-600',
    Bitbucket: 'bg-blue-700 text-white border-blue-700',
  }
  const cls = map[platform.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {platform.tag}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  accent,
  gradientColor,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  subtitle?: string
  accent?: string
  gradientColor?: string
}) {
  const numValue = typeof value === 'number' ? value : parseInt(value as string)
  return (
    <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(99, 102, 241, 0.12)">
      <div className={`size-8 rounded-lg bg-gradient-to-br ${gradientColor ?? 'from-indigo-500/20 to-indigo-600/5'} flex items-center justify-center mb-2`}>
        <Icon className={`size-4 ${accent ?? 'text-foreground/70'}`} />
      </div>
      <div className={`text-2xl font-bold ${accent ?? ''}`}>
        {!isNaN(numValue) ? <CountUp to={numValue} duration={1.5} /> : value}
        {typeof value === 'string' && value.endsWith('%') && !isNaN(numValue) && '%'}
      </div>
      <div className="text-[11px] text-muted-foreground">{title}</div>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </SpotlightCard>
  )
}

// ─── AI Check Icon ────────────────────────────────────────────────────────────

function AiCheck({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-gray-300" />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EngineeringPage() {
  const [allPRs] = useTable(tables.pull_request)
  const [allBugs] = useTable(tables.bug)
  const [allRepos] = useTable(tables.code_repository)

  // ── Pull Requests ────────────────────────────────────────────────────────

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

  // ── Bugs ─────────────────────────────────────────────────────────────────

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

  // ── Repos ─────────────────────────────────────────────────────────────────

  const repos = useMemo(
    () => [...allRepos].sort((a, b) => a.name.localeCompare(b.name)),
    [allRepos]
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <Code2 className="size-4.5 text-white" />
          </div>
          <GradientText colors={['#6366f1', '#3b82f6', '#818cf8']} animationSpeed={6}>Engineering</GradientText>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-powered code reviews, automated bug triage, and repository insights
        </p>
      </div>

      <Tabs defaultValue="pull-requests">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="pull-requests" className="flex items-center gap-1.5">
            <GitPullRequest className="h-3.5 w-3.5" />
            Pull Requests
          </TabsTrigger>
          <TabsTrigger value="bugs" className="flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5" />
            Bugs
          </TabsTrigger>
          <TabsTrigger value="repositories" className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Repositories
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pull Requests ────────────────────────────────────────────── */}
        <TabsContent value="pull-requests" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Total PRs"
              value={prKpis.total}
              icon={GitPullRequest}
              subtitle="All time"
            />
            <KpiCard
              title="Open"
              value={prKpis.open}
              icon={GitPullRequest}
              subtitle="Awaiting review"
              accent="text-blue-600"
            />
            <KpiCard
              title="Under Review"
              value={prKpis.underReview}
              icon={Code2}
              subtitle="Active review"
              accent="text-yellow-600"
            />
            <KpiCard
              title="AI Reviewed"
              value={`${prKpis.aiReviewedPct}%`}
              icon={Zap}
              subtitle="AI coverage"
              accent="text-purple-600"
            />
          </div>

          {/* PR Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">AI Reviewed</TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <Shield className="h-3.5 w-3.5 text-red-500" />
                        Security
                      </span>
                    </TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        Perf.
                      </span>
                    </TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Merged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pullRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        No pull requests yet. Connect your repositories to start tracking PRs.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pullRequests.map(pr => {
                      const repo = reposMap.get(pr.repositoryId)
                      return (
                        <TableRow key={pr.id.toString()}>
                          <TableCell className="max-w-xs">
                            <span className="font-medium line-clamp-1" title={pr.title}>
                              {pr.title}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {repo?.name ?? <span className="italic text-gray-400">Unknown</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {pr.externalId || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[8rem] truncate">
                            {pr.author.toHexString().slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            <PrStatusBadge status={pr.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <AiCheck value={pr.aiReviewed} />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.securityIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                {pr.securityIssues.length}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pr.performanceIssues.length > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                                {pr.performanceIssues.length}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(pr.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {pr.mergedAt ? formatTimestamp(pr.mergedAt) : '—'}
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

        {/* ── Tab: Bugs ─────────────────────────────────────────────────────── */}
        <TabsContent value="bugs" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Total Bugs"
              value={bugKpis.total}
              icon={Bug}
              subtitle="All time"
            />
            <KpiCard
              title="Critical"
              value={bugKpis.critical}
              icon={Shield}
              subtitle="Needs immediate action"
              accent="text-red-600"
            />
            <KpiCard
              title="In Progress"
              value={bugKpis.inProgress}
              icon={Code2}
              subtitle="Actively being fixed"
              accent="text-orange-600"
            />
            <KpiCard
              title="AI Triaged"
              value={`${bugKpis.aiTriagedPct}%`}
              icon={Zap}
              subtitle="AI triage coverage"
              accent="text-purple-600"
            />
          </div>

          {/* Bug Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-center">AI Triaged</TableHead>
                    <TableHead>AI Suggested Fix</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No bugs reported yet. Your codebase is clean!
                      </TableCell>
                    </TableRow>
                  ) : (
                    bugs.map(bug => (
                      <TableRow key={bug.id.toString()}>
                        <TableCell className="max-w-xs">
                          <span className="font-medium line-clamp-1" title={bug.title}>
                            {bug.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={bug.severity} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={bug.priority} />
                        </TableCell>
                        <TableCell>
                          <BugStatusBadge status={bug.status} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {bug.assignedTo
                            ? `${bug.assignedTo.toHexString().slice(0, 8)}…`
                            : <span className="text-gray-400 italic not-italic font-sans">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <AiCheck value={bug.aiTriaged} />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                          <span title={bug.aiSuggestedFix ?? undefined}>
                            {truncate(bug.aiSuggestedFix, 55)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(bug.reportedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {bug.resolvedAt ? formatTimestamp(bug.resolvedAt) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Repositories ─────────────────────────────────────────────── */}
        <TabsContent value="repositories" className="mt-6">
          {repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
              <Database className="h-10 w-10 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No repositories connected</p>
              <p className="text-sm max-w-sm">
                Connect your GitHub, GitLab, or Bitbucket repositories to start tracking code activity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map(repo => (
                <Card key={repo.id.toString()} className="flex flex-col">
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
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 truncate max-w-full"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{repo.url}</span>
                    </a>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-3 flex-1">
                    {/* Primary Languages */}
                    {repo.primaryLanguages.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Languages</p>
                        <div className="flex flex-wrap gap-1">
                          {repo.primaryLanguages.map(lang => (
                            <Badge key={lang} variant="secondary" className="text-xs px-1.5 py-0">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Index Status */}
                    <div className="flex items-center justify-between pt-1 border-t">
                      <div className="flex items-center gap-1.5">
                        <Zap className={`h-3.5 w-3.5 ${repo.aiIndexed ? 'text-purple-500' : 'text-gray-300'}`} />
                        <span className="text-xs text-muted-foreground">
                          {repo.aiIndexed ? 'AI Indexed' : 'Not Indexed'}
                        </span>
                      </div>
                      {repo.aiIndexed && repo.lastIndexed != null && (
                        <span className="text-xs text-muted-foreground">
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
