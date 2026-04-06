'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  Trash2,
  Search,
  Download,
} from 'lucide-react'
import { exportCSV } from '@/lib/csv-export'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { chartTooltipProps, chartAxisProps, chartGridProps } from '@/lib/chart-theme'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'

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
  const { currentOrgId } = useOrg()
  const [allPRs] = useTable(tables.pull_request)
  const [allBugs] = useTable(tables.bug)
  const [allRepos] = useTable(tables.code_repository)

  const createCodeRepository = useSpacetimeReducer(reducers.createCodeRepository)
  const deleteCodeRepository = useSpacetimeReducer(reducers.deleteCodeRepository)
  const createPullRequest = useSpacetimeReducer(reducers.createPullRequest)
  const updatePrStatus = useSpacetimeReducer(reducers.updatePrStatus)
  const deletePullRequest = useSpacetimeReducer(reducers.deletePullRequest)
  const createBug = useSpacetimeReducer(reducers.createBug)
  const updateBugStatus = useSpacetimeReducer(reducers.updateBugStatus)
  const deleteBug = useSpacetimeReducer(reducers.deleteBug)

  // Repo dialog state
  const [repoDialogOpen, setRepoDialogOpen] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoUrl, setNewRepoUrl] = useState('')
  const [newRepoPlatform, setNewRepoPlatform] = useState('GitHub')
  const [newRepoLanguages, setNewRepoLanguages] = useState('')

  // PR dialog state
  const [prDialogOpen, setPrDialogOpen] = useState(false)
  const [newPrRepoId, setNewPrRepoId] = useState('')
  const [newPrExternalId, setNewPrExternalId] = useState('')
  const [newPrTitle, setNewPrTitle] = useState('')
  const [newPrDesc, setNewPrDesc] = useState('')

  // Search state
  const [prSearch, setPrSearch] = useState('')
  const [bugSearch, setBugSearch] = useState('')

  // Bug dialog state
  const [bugDialogOpen, setBugDialogOpen] = useState(false)
  const [newBugTitle, setNewBugTitle] = useState('')
  const [newBugDesc, setNewBugDesc] = useState('')
  const [newBugSeverity, setNewBugSeverity] = useState('Medium')
  const [newBugPriority, setNewBugPriority] = useState('Medium')

  const handleCreateRepo = useCallback(() => {
    if (!newRepoName.trim() || !newRepoUrl.trim() || currentOrgId === null) return
    try {
      createCodeRepository({
        orgId: BigInt(currentOrgId),
        name: newRepoName.trim(),
        url: newRepoUrl.trim(),
        platform: { tag: newRepoPlatform } as any,
        primaryLanguages: newRepoLanguages.trim() ? newRepoLanguages.split(',').map(s => s.trim()).filter(Boolean) : [],
      })
    } catch (e) { console.error('Failed to create repository:', e) }
    setRepoDialogOpen(false)
    setNewRepoName(''); setNewRepoUrl(''); setNewRepoPlatform('GitHub'); setNewRepoLanguages('')
  }, [newRepoName, newRepoUrl, newRepoPlatform, newRepoLanguages, currentOrgId, createCodeRepository])

  const handleCreatePR = useCallback(() => {
    if (!newPrRepoId || !newPrTitle.trim() || currentOrgId === null) return
    try {
      createPullRequest({
        orgId: BigInt(currentOrgId),
        repositoryId: BigInt(newPrRepoId),
        externalId: newPrExternalId.trim(),
        title: newPrTitle.trim(),
        description: newPrDesc.trim(),
      })
    } catch (e) { console.error('Failed to create PR:', e) }
    setPrDialogOpen(false)
    setNewPrRepoId(''); setNewPrExternalId(''); setNewPrTitle(''); setNewPrDesc('')
  }, [newPrRepoId, newPrExternalId, newPrTitle, newPrDesc, currentOrgId, createPullRequest])

  const handleCreateBug = useCallback(() => {
    if (!newBugTitle.trim() || currentOrgId === null) return
    try {
      createBug({
        orgId: BigInt(currentOrgId),
        title: newBugTitle.trim(),
        description: newBugDesc.trim(),
        severity: { tag: newBugSeverity } as any,
        priority: { tag: newBugPriority } as any,
        assignedTo: undefined,
      })
    } catch (e) { console.error('Failed to create bug:', e) }
    setBugDialogOpen(false)
    setNewBugTitle(''); setNewBugDesc(''); setNewBugSeverity('Medium'); setNewBugPriority('Medium')
  }, [newBugTitle, newBugDesc, newBugSeverity, newBugPriority, currentOrgId, createBug])

  // Org-scoped data
  const orgPRs = useMemo(() => allPRs.filter(p => Number(p.orgId) === currentOrgId), [allPRs, currentOrgId])
  const orgBugs = useMemo(() => allBugs.filter(b => Number(b.orgId) === currentOrgId), [allBugs, currentOrgId])
  const orgRepos = useMemo(() => allRepos.filter(r => Number(r.orgId) === currentOrgId), [allRepos, currentOrgId])

  const pullRequests = useMemo(
    () => [...orgPRs].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [orgPRs]
  )

  const reposMap = useMemo(
    () => new Map(orgRepos.map(r => [r.id, r])),
    [orgRepos]
  )

  const prKpis = useMemo(() => {
    const total = pullRequests.length
    const open = pullRequests.filter(p => p.status?.tag === 'Open').length
    const underReview = pullRequests.filter(p => p.status?.tag === 'UnderReview').length
    const aiReviewedCount = pullRequests.filter(p => p.aiReviewed).length
    const aiReviewedPct = total > 0 ? Math.round((aiReviewedCount / total) * 100) : 0
    return { total, open, underReview, aiReviewedPct }
  }, [pullRequests])

  const bugs = useMemo(
    () => [...orgBugs].sort((a, b) => Number(b.reportedAt.toMillis()) - Number(a.reportedAt.toMillis())),
    [orgBugs]
  )

  const bugKpis = useMemo(() => {
    const total = bugs.length
    const critical = bugs.filter(b => b.severity?.tag === 'Critical').length
    const inProgress = bugs.filter(b => b.status?.tag === 'InProgress').length
    const aiTriagedCount = bugs.filter(b => b.aiTriaged).length
    const aiTriagedPct = total > 0 ? Math.round((aiTriagedCount / total) * 100) : 0
    return { total, critical, inProgress, aiTriagedPct }
  }, [bugs])

  // PR pipeline stages
  const prPipeline = useMemo(() => {
    const PR_STAGE_COLORS: Record<string, string> = {
      Open: '#3b82f6', UnderReview: '#f59e0b', ChangesRequested: '#f97316', Approved: '#22c55e', Merged: '#8b5cf6', Closed: '#737373',
    }
    const counts: Record<string, number> = {}
    for (const pr of pullRequests) counts[pr.status?.tag ?? 'Open'] = (counts[pr.status?.tag ?? 'Open'] ?? 0) + 1
    const stages = ['Open', 'UnderReview', 'ChangesRequested', 'Approved', 'Merged', 'Closed']
    return stages
      .filter(s => (counts[s] ?? 0) > 0)
      .map(s => ({ name: prStatusClass(s).label, value: counts[s] ?? 0, color: PR_STAGE_COLORS[s] ?? '#737373' }))
  }, [pullRequests])

  // Bug severity distribution
  const bugSeverityDist = useMemo(() => {
    const SEV_COLORS: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#a3a3a3' }
    const counts: Record<string, number> = {}
    for (const b of bugs) counts[b.severity?.tag ?? 'Medium'] = (counts[b.severity?.tag ?? 'Medium'] ?? 0) + 1
    return ['Critical', 'High', 'Medium', 'Low']
      .filter(s => (counts[s] ?? 0) > 0)
      .map(s => ({ name: s, value: counts[s] ?? 0, color: SEV_COLORS[s] ?? '#a3a3a3' }))
  }, [bugs])

  const filteredPRs = useMemo(() => {
    if (!prSearch.trim()) return pullRequests
    const q = prSearch.toLowerCase()
    return pullRequests.filter(pr => {
      const repo = reposMap.get(pr.repositoryId)
      return pr.title.toLowerCase().includes(q) || (pr.externalId?.toLowerCase().includes(q) ?? false) || (repo?.name.toLowerCase().includes(q) ?? false) || pr.status?.tag.toLowerCase().includes(q)
    })
  }, [pullRequests, prSearch, reposMap])

  const filteredBugs = useMemo(() => {
    if (!bugSearch.trim()) return bugs
    const q = bugSearch.toLowerCase()
    return bugs.filter(b => b.title.toLowerCase().includes(q) || b.severity?.tag.toLowerCase().includes(q) || b.priority?.tag.toLowerCase().includes(q) || b.status?.tag.toLowerCase().includes(q))
  }, [bugs, bugSearch])

  const handleExportPRs = useCallback(() => {
    exportCSV('pull-requests', [
      { header: 'Title', accessor: (pr: any) => pr.title },
      { header: 'PR #', accessor: (pr: any) => pr.externalId ?? '' },
      { header: 'Repository', accessor: (pr: any) => reposMap.get(pr.repositoryId)?.name ?? '' },
      { header: 'Status', accessor: (pr: any) => prStatusClass(pr.status?.tag).label },
      { header: 'AI Reviewed', accessor: (pr: any) => pr.aiReviewed ? 'Yes' : 'No' },
      { header: 'Security Issues', accessor: (pr: any) => pr.securityIssues.length },
      { header: 'Performance Issues', accessor: (pr: any) => pr.performanceIssues.length },
      { header: 'Created', accessor: (pr: any) => formatTimestamp(pr.createdAt) },
    ], filteredPRs)
  }, [filteredPRs, reposMap])

  const handleExportBugs = useCallback(() => {
    exportCSV('bugs', [
      { header: 'Title', accessor: (b: any) => b.title },
      { header: 'Severity', accessor: (b: any) => b.severity?.tag },
      { header: 'Priority', accessor: (b: any) => b.priority?.tag },
      { header: 'Status', accessor: (b: any) => bugStatusClass(b.status?.tag).label },
      { header: 'AI Triaged', accessor: (b: any) => b.aiTriaged ? 'Yes' : 'No' },
      { header: 'Suggested Fix', accessor: (b: any) => b.aiSuggestedFix ?? '' },
      { header: 'Reported', accessor: (b: any) => formatTimestamp(b.reportedAt) },
    ], filteredBugs)
  }, [filteredBugs])

  const repos = useMemo(
    () => [...orgRepos].sort((a, b) => a.name.localeCompare(b.name)),
    [orgRepos]
  )

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
      {/* ── Header */}
      <div className="flex items-center justify-between">
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
            <BlurText text="AI-powered code reviews, automated bug triage, and repository insights" delay={35} animateBy="words" className="text-sm text-muted-foreground mt-0.5" />
          </div>
          <PagePresenceStrip className="hidden xl:flex" />
        </div>
        <div className="flex items-center gap-2">
          {/* Create Repo Dialog */}
          <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <GitBranch className="size-4" /> Add Repo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Repository</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Name *</Label>
                  <Input placeholder="my-project" value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>URL *</Label>
                  <Input placeholder="https://github.com/org/repo" value={newRepoUrl} onChange={(e) => setNewRepoUrl(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Platform</Label>
                    <Select value={newRepoPlatform} onValueChange={setNewRepoPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GitHub">GitHub</SelectItem>
                        <SelectItem value="GitLab">GitLab</SelectItem>
                        <SelectItem value="Bitbucket">Bitbucket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Languages (comma-separated)</Label>
                    <Input placeholder="TypeScript, Rust" value={newRepoLanguages} onChange={(e) => setNewRepoLanguages(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateRepo} disabled={!newRepoName.trim() || !newRepoUrl.trim()}>Add Repository</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Create PR Dialog */}
          <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <GitPullRequest className="size-4" /> New PR
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Pull Request</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Repository *</Label>
                  <Select value={newPrRepoId} onValueChange={setNewPrRepoId}>
                    <SelectTrigger><SelectValue placeholder="Select repository..." /></SelectTrigger>
                    <SelectContent>
                      {repos.map((r) => (
                        <SelectItem key={r.id.toString()} value={r.id.toString()}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Title *</Label>
                    <Input placeholder="Fix auth timeout" value={newPrTitle} onChange={(e) => setNewPrTitle(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>PR # (External)</Label>
                    <Input placeholder="123" value={newPrExternalId} onChange={(e) => setNewPrExternalId(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="What does this PR do?" value={newPrDesc} onChange={(e) => setNewPrDesc(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreatePR} disabled={!newPrRepoId || !newPrTitle.trim()}>Create PR</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Create Bug Dialog */}
          <Dialog open={bugDialogOpen} onOpenChange={setBugDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Bug className="size-4" /> Report Bug
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Report Bug</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Title *</Label>
                  <Input placeholder="Login fails on Safari" value={newBugTitle} onChange={(e) => setNewBugTitle(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Steps to reproduce..." value={newBugDesc} onChange={(e) => setNewBugDesc(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Severity</Label>
                    <Select value={newBugSeverity} onValueChange={setNewBugSeverity}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Critical', 'High', 'Medium', 'Low'].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Priority</Label>
                    <Select value={newBugPriority} onValueChange={setNewBugPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Urgent', 'High', 'Medium', 'Low'].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateBug} disabled={!newBugTitle.trim()}>Report Bug</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

          {/* PR Pipeline + Bug Severity */}
          {(prPipeline.length > 0 || bugSeverityDist.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* PR Pipeline Funnel */}
              {prPipeline.length > 0 && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">PR Pipeline</h3>
                    <span className="text-[10px] text-muted-foreground">{pullRequests.length} total</span>
                  </div>
                  {/* Stacked horizontal bar */}
                  <div className="flex h-6 rounded-lg overflow-hidden mb-3">
                    {prPipeline.map(s => {
                      const pct = (s.value / pullRequests.length) * 100
                      return (
                        <div key={s.name} className="transition-all relative group/seg" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: s.color }} title={`${s.name}: ${s.value}`}>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/seg:opacity-100 transition-opacity">
                            <span className="text-[9px] font-bold text-white drop-shadow-sm">{s.value}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {prPipeline.map(s => (
                      <div key={s.name} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[11px] text-muted-foreground">{s.name}</span>
                        <span className="text-[11px] font-semibold tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bug Severity Chart */}
              {bugSeverityDist.length > 0 && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Bug Severity</h3>
                    <span className="text-[10px] text-muted-foreground">{bugs.length} total</span>
                  </div>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bugSeverityDist} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis {...chartAxisProps} type="category" dataKey="name" width={60} />
                        <RechartsTooltip {...chartTooltipProps} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                          {bugSeverityDist.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PR Search + Export */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search PRs by title, repo, status..." value={prSearch} onChange={e => setPrSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <span className="text-xs text-neutral-400 tabular-nums">{filteredPRs.length} PR{filteredPRs.length !== 1 ? 's' : ''}</span>
            <Button variant="outline" size="sm" onClick={handleExportPRs} className="gap-1.5 h-8 ml-auto">
              <Download className="size-3.5" />Export
            </Button>
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
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPRs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                            <GitPullRequest className="size-6 opacity-40" />
                          </div>
                          <p className="font-medium">{prSearch ? 'No matching PRs' : 'No pull requests yet'}</p>
                          <p className="text-sm mt-1">{prSearch ? 'Try a different search term' : 'Connect your repositories to start tracking PRs.'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPRs.map(pr => {
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
                            <StatusBadge tag={pr.status?.tag} config={prStatusClass(pr.status?.tag)} />
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
                          <TableCell className="pr-4">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Select value={pr.status?.tag} onValueChange={(v) => { try { updatePrStatus({ prId: pr.id, newStatus: { tag: v } as any }) } catch (e) { console.error(e) } }}>
                                <SelectTrigger className="h-6 text-[11px] w-[90px] px-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['Open', 'UnderReview', 'ChangesRequested', 'Approved', 'Merged', 'Closed'].map((s) => (
                                    <SelectItem key={s} value={s}>{s === 'UnderReview' ? 'In Review' : s === 'ChangesRequested' ? 'Changes' : s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { if (confirm('Delete this PR?')) try { deletePullRequest({ prId: pr.id }) } catch (e) { console.error(e) } }}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
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

          {/* Bug Search + Export */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search bugs by title, severity, priority..." value={bugSearch} onChange={e => setBugSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <span className="text-xs text-neutral-400 tabular-nums">{filteredBugs.length} bug{filteredBugs.length !== 1 ? 's' : ''}</span>
            <Button variant="outline" size="sm" onClick={handleExportBugs} className="gap-1.5 h-8 ml-auto">
              <Download className="size-3.5" />Export
            </Button>
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
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                            <Bug className="size-6 opacity-40" />
                          </div>
                          <p className="font-medium">{bugSearch ? 'No matching bugs' : 'No bugs reported'}</p>
                          <p className="text-sm mt-1">{bugSearch ? 'Try a different search term' : 'Your codebase is clean!'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBugs.map(bug => (
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
                          <DotBadge tag={bug.priority?.tag} config={priorityClass(bug.priority?.tag)} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge tag={bug.status?.tag} config={bugStatusClass(bug.status?.tag)} />
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
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Select value={bug.status?.tag} onValueChange={(v) => { try { updateBugStatus({ bugId: bug.id, newStatus: { tag: v } as any }) } catch (e) { console.error(e) } }}>
                              <SelectTrigger className="h-6 text-[11px] w-[90px] px-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['New', 'Triaged', 'InProgress', 'FixInReview', 'Resolved', 'Verified', 'Closed'].map((s) => (
                                  <SelectItem key={s} value={s}>{s === 'InProgress' ? 'In Prog.' : s === 'FixInReview' ? 'Fix Review' : s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { if (confirm('Delete this bug?')) try { deleteBug({ bugId: bug.id }) } catch (e) { console.error(e) } }}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
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
                      <div className="flex items-center gap-2">
                        {repo.aiIndexed && repo.lastIndexed != null && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatTimestamp(repo.lastIndexed)}
                          </span>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete repository "${repo.name}"?`)) try { deleteCodeRepository({ repoId: repo.id }) } catch (e) { console.error(e) } }}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </div>
  )
}
