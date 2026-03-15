'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Search,
  MapPin,
  Bot,
  Clock,
  Star,
  Plus,
  TrendingUp,
  Filter,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- Candidate status helpers ------------------------------------------------

type CandidateStatusTag =
  | 'Sourced'
  | 'Contacted'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected'

function candidateStatusBadgeClass(tag: string): string {
  switch (tag as CandidateStatusTag) {
    case 'Sourced':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Contacted':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800'
    case 'Screening':
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
    case 'Interview':
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'Offer':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Hired':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
    case 'Rejected':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Job posting status helpers ----------------------------------------------

type JobStatusTag = 'Draft' | 'Open' | 'OnHold' | 'Filled' | 'Closed'

function jobStatusBadgeClass(tag: string): string {
  switch (tag as JobStatusTag) {
    case 'Draft':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    case 'Open':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
    case 'OnHold':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800'
    case 'Filled':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Closed':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Interview type helpers --------------------------------------------------

type InterviewTypeTag = 'Screening' | 'Technical' | 'Behavioral' | 'Final'

function interviewTypeBadgeClass(tag: string): string {
  switch (tag as InterviewTypeTag) {
    case 'Screening':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Technical':
      return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'
    case 'Behavioral':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'Final':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Recommendation helpers -------------------------------------------------

type RecommendationTag = 'StrongYes' | 'Yes' | 'Maybe' | 'No' | 'StrongNo'

function recommendationLabel(tag: string): string {
  switch (tag as RecommendationTag) {
    case 'StrongYes': return 'Strong Yes'
    case 'Yes': return 'Yes'
    case 'Maybe': return 'Maybe'
    case 'No': return 'No'
    case 'StrongNo': return 'Strong No'
    default: return tag
  }
}

function recommendationBadgeClass(tag: string): string {
  switch (tag as RecommendationTag) {
    case 'StrongYes':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
    case 'Yes':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Maybe':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800'
    case 'No':
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
    case 'StrongNo':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Department label -------------------------------------------------------

function departmentLabel(tag: string): string {
  switch (tag) {
    case 'Support': return 'Support'
    case 'Sales': return 'Sales'
    case 'Recruitment': return 'Recruitment'
    case 'Engineering': return 'Engineering'
    case 'Operations': return 'Operations'
    case 'Marketing': return 'Marketing'
    case 'Finance': return 'Finance'
    default: return tag
  }
}

// ---- Timestamp formatting ---------------------------------------------------

function formatDateTime(ts: any): string {
  try { return ts.toDate().toLocaleString() } catch { return '—' }
}

// =============================================================================
// Page component
// =============================================================================

export default function RecruitmentPage() {
  const { currentOrgId } = useOrg()
  const [allCandidates] = useTable(tables.candidate)
  const [allJobPostings] = useTable(tables.job_posting)
  const [allInterviews] = useTable(tables.interview)

  const createCandidate = useSpacetimeReducer(reducers.createCandidate)

  const [candidateSearch, setCandidateSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Add Candidate dialog state
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false)
  const [newCandidateName, setNewCandidateName] = useState('')
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [newCandidateLinkedIn, setNewCandidateLinkedIn] = useState('')

  // Sorted candidates
  const candidates = useMemo(
    () =>
      [...allCandidates].sort(
        (a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())
      ),
    [allCandidates]
  )

  // Sorted job postings
  const jobPostings = useMemo(
    () =>
      [...allJobPostings].sort(
        (a, b) => Number(b.postedAt.toMillis()) - Number(a.postedAt.toMillis())
      ),
    [allJobPostings]
  )

  // Sorted interviews (ascending by scheduled time)
  const interviews = useMemo(
    () =>
      [...allInterviews].sort(
        (a, b) => Number(a.scheduledAt.toMillis()) - Number(b.scheduledAt.toMillis())
      ),
    [allInterviews]
  )

  // Lookup maps
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
  )
  const jobMap = useMemo(
    () => new Map(jobPostings.map((j) => [j.id, j])),
    [jobPostings]
  )

  // KPI values
  const totalCandidates = candidates.length
  const inPipeline = candidates.filter(
    (c) => c.status.tag !== 'Hired' && c.status.tag !== 'Rejected'
  ).length
  const interviewsScheduled = interviews.filter((i) => !i.completed).length
  const hired = candidates.filter((c) => c.status.tag === 'Hired').length

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: candidates.length }
    candidates.forEach((c) => {
      counts[c.status.tag] = (counts[c.status.tag] || 0) + 1
    })
    return counts
  }, [candidates])

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    let result = candidates
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status.tag === statusFilter)
    }
    const q = candidateSearch.toLowerCase()
    if (!q) return result
    return result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.currentCompany ?? '').toLowerCase().includes(q) ||
        (c.currentTitle ?? '').toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
    )
  }, [candidates, candidateSearch, statusFilter])

  // Filtered job postings
  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase()
    if (!q) return jobPostings
    return jobPostings.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q) ||
        j.department.tag.toLowerCase().includes(q)
    )
  }, [jobPostings, jobSearch])

  function handleCreateCandidate() {
    if (!newCandidateName.trim() || !newCandidateEmail.trim() || currentOrgId === null) return
    try {
      createCandidate({
        name: newCandidateName.trim(),
        email: newCandidateEmail.trim(),
        linkedinUrl: newCandidateLinkedIn.trim() || undefined,
        orgId: BigInt(currentOrgId),
      })
    } catch (err) {
      console.error('Failed to create candidate:', err)
    }
    setCandidateDialogOpen(false)
    setNewCandidateName('')
    setNewCandidateEmail('')
    setNewCandidateLinkedIn('')
  }

  const statuses: string[] = ['all', 'Sourced', 'Contacted', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#8b5cf6', '#a855f7', '#c084fc', '#7c3aed']} animationSpeed={6}>
              Recruitment
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Candidate pipeline, job postings, and interview scheduling
          </p>
        </div>
        <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-sm" />}>
            <Plus className="size-4" />
            Add Candidate
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Candidate</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-name" className="text-xs font-medium text-muted-foreground">Name *</Label>
                <Input
                  id="candidate-name"
                  placeholder="Jane Doe"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-email" className="text-xs font-medium text-muted-foreground">Email *</Label>
                <Input
                  id="candidate-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={newCandidateEmail}
                  onChange={(e) => setNewCandidateEmail(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-linkedin" className="text-xs font-medium text-muted-foreground">LinkedIn URL</Label>
                <Input
                  id="candidate-linkedin"
                  placeholder="https://linkedin.com/in/jane"
                  value={newCandidateLinkedIn}
                  onChange={(e) => setNewCandidateLinkedIn(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateCandidate}
                disabled={!newCandidateName.trim() || !newCandidateEmail.trim()}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
              >
                Create Candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="candidates">
        <TabsList className="bg-neutral-100/80 dark:bg-neutral-800/80">
          <TabsTrigger value="candidates" className="gap-1.5 text-xs">
            <Users className="size-3.5" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5 text-xs">
            <Briefcase className="size-3.5" />
            Job Postings
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1.5 text-xs">
            <CalendarCheck className="size-3.5" />
            Interviews
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* Tab 1 — Candidates                                                */}
        {/* ================================================================= */}
        <TabsContent value="candidates">
          <div className="flex flex-col gap-5 mt-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Total Candidates', value: totalCandidates, icon: Users, color: 'from-purple-500 to-violet-500', spotlight: 'rgba(139, 92, 246, 0.15)' },
                { label: 'In Pipeline', value: inPipeline, icon: TrendingUp, color: 'from-blue-500 to-cyan-500', spotlight: 'rgba(59, 130, 246, 0.15)' },
                { label: 'Interviews', value: interviewsScheduled, icon: CalendarCheck, color: 'from-amber-500 to-orange-500', spotlight: 'rgba(245, 158, 11, 0.15)' },
                { label: 'Hired', value: hired, icon: CheckCircle2, color: 'from-green-500 to-emerald-500', spotlight: 'rgba(34, 197, 94, 0.15)' },
              ].map((kpi) => (
                <SpotlightCard key={kpi.label} spotlightColor={kpi.spotlight} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {kpi.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold">
                        <CountUp to={kpi.value} duration={1200} />
                      </span>
                      <div className={`rounded-lg p-1.5 bg-gradient-to-br ${kpi.color} text-white`}>
                        <kpi.icon className="size-4" />
                      </div>
                    </div>
                  </CardContent>
                </SpotlightCard>
              ))}
            </div>

            {/* Search + Status Filter */}
            <div className="flex flex-col gap-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="pl-9 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      statusFilter === s
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                    {statusCounts[s] ? ` (${statusCounts[s]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates table */}
            <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.08)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <ScrollArea className="rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-800/30">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Name</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Email</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Company</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Title</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Skills</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Score</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Exp</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-12"
                        >
                          <Users className="size-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">
                            {candidateSearch || statusFilter !== 'all'
                              ? 'No candidates match your filters.'
                              : 'No candidates yet. Add your first one above.'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <TableRow key={candidate.id.toString()} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                                {candidate.name[0]?.toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{candidate.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {candidate.email}
                          </TableCell>
                          <TableCell className="text-sm">
                            {candidate.currentCompany ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {candidate.currentTitle ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {candidate.skills.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                candidate.skills.slice(0, 3).map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 bg-neutral-50 dark:bg-neutral-800"
                                  >
                                    {skill}
                                  </Badge>
                                ))
                              )}
                              {candidate.skills.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 text-muted-foreground"
                                >
                                  +{candidate.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.overallScore !== undefined &&
                            candidate.overallScore !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="size-3 text-amber-400 fill-amber-400" />
                                <span className="font-medium text-sm">
                                  {candidate.overallScore.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {candidate.experienceYears !== undefined &&
                            candidate.experienceYears !== null ? (
                              <span>{candidate.experienceYears}y</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${candidateStatusBadgeClass(candidate.status.tag)}`}
                            >
                              {candidate.status.tag}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </SpotlightCard>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 2 — Job Postings                                              */}
        {/* ================================================================= */}
        <TabsContent value="jobs">
          <div className="flex flex-col gap-5 mt-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search job postings..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="pl-9 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
              />
            </div>

            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Briefcase className="size-10 mb-3 opacity-20" />
                <p className="text-sm">
                  {jobSearch
                    ? 'No job postings match your search.'
                    : 'No job postings yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <SpotlightCard key={job.id.toString()} spotlightColor="rgba(139, 92, 246, 0.1)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {job.title}
                        </CardTitle>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${jobStatusBadgeClass(job.status.tag)}`}
                        >
                          {job.status.tag === 'OnHold'
                            ? 'On Hold'
                            : job.status.tag}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                          {departmentLabel(job.department.tag)}
                        </Badge>
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {job.location}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-3">
                      {/* Requirements */}
                      {job.requirements.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                            Requirements
                          </p>
                          <ul className="space-y-1">
                            {job.requirements.slice(0, 4).map((req, i) => (
                              <li
                                key={i}
                                className="text-xs text-muted-foreground flex items-start gap-1.5"
                              >
                                <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-purple-400" />
                                {req}
                              </li>
                            ))}
                            {job.requirements.length > 4 && (
                              <li className="text-xs text-muted-foreground pl-2.5">
                                +{job.requirements.length - 4} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* AI Sourcing */}
                      {job.aiSourcingEnabled && (
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 rounded-md px-2 py-1 w-fit">
                          <Bot className="size-3.5" />
                          <span className="font-medium">AI Sourcing Enabled</span>
                        </div>
                      )}
                    </CardContent>
                  </SpotlightCard>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 3 — Interviews                                                */}
        {/* ================================================================= */}
        <TabsContent value="interviews">
          <div className="flex flex-col gap-4 mt-4">
            <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.08)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <ScrollArea className="rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-800/30">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Candidate</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Job Title</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Type</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Scheduled</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Duration</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-12"
                        >
                          <CalendarCheck className="size-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No interviews scheduled yet.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      interviews.map((interview) => {
                        const candidate = candidateMap.get(interview.candidateId)
                        const job = jobMap.get(interview.jobPostingId)
                        return (
                          <TableRow key={interview.id.toString()} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                                  {candidate?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-sm">
                                  {candidate?.name ?? (
                                    <span className="text-muted-foreground">Unknown</span>
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {job?.title ?? (
                                <span className="text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${interviewTypeBadgeClass(interview.interviewType.tag)}`}
                              >
                                {interview.interviewType.tag}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDateTime(interview.scheduledAt)}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <Clock className="size-3.5" />
                                {interview.durationMinutes}m
                              </span>
                            </TableCell>
                            <TableCell>
                              {interview.completed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded-full px-2 py-0.5">
                                  <CheckCircle2 className="size-3" />
                                  Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-full px-2 py-0.5">
                                  <Clock className="size-3" />
                                  Pending
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.recommendation ? (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${recommendationBadgeClass(interview.recommendation.tag)}`}
                                >
                                  {recommendationLabel(interview.recommendation.tag)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </SpotlightCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
