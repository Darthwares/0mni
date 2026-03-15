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
} from 'lucide-react'
import { PagePresence } from '@/components/page-presence'

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
    Open: 'bg-blue-100 text-blue-700 border-blue-200',
    UnderReview: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ChangesRequested: 'bg-orange-100 text-orange-700 border-orange-200',
    Approved: 'bg-green-100 text-green-700 border-green-200',
    Merged: 'bg-purple-100 text-purple-700 border-purple-200',
    Closed: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = map[status.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.tag === 'UnderReview' ? 'Under Review' : status.tag === 'ChangesRequested' ? 'Changes Req.' : status.tag}
    </span>
  )
}

// ─── Bug Status Badge ─────────────────────────────────────────────────────────

function BugStatusBadge({ status }: { status: { tag: string } }) {
  const map: Record<string, string> = {
    New: 'bg-blue-100 text-blue-700 border-blue-200',
    Triaged: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    InProgress: 'bg-orange-100 text-orange-700 border-orange-200',
    FixInReview: 'bg-purple-100 text-purple-700 border-purple-200',
    Resolved: 'bg-green-100 text-green-700 border-green-200',
    Verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Closed: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = map[status.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'
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
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = map[severity.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {severity.tag}
    </span>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: { tag: string } }) {
  const map: Record<string, string> = {
    Urgent: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = map[priority.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'
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
}: {
  title: string
  value: string | number
  icon: React.ElementType
  subtitle?: string
  accent?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent ?? ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engineering</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered code reviews, automated bug triage, and repository insights
          </p>
        </div>
        <PagePresence glowColor="rgba(249, 115, 22, 0.15)" shineColor="#fb923c" />
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
