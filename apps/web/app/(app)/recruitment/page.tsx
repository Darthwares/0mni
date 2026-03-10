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
} from 'lucide-react'

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
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Contacted':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Screening':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'Interview':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'Offer':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Hired':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'Rejected':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Job posting status helpers ----------------------------------------------

type JobStatusTag = 'Draft' | 'Open' | 'OnHold' | 'Filled' | 'Closed'

function jobStatusBadgeClass(tag: string): string {
  switch (tag as JobStatusTag) {
    case 'Draft':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    case 'Open':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'OnHold':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Filled':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Closed':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Interview type helpers --------------------------------------------------

type InterviewTypeTag = 'Screening' | 'Technical' | 'Behavioral' | 'Final'

function interviewTypeBadgeClass(tag: string): string {
  switch (tag as InterviewTypeTag) {
    case 'Screening':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Technical':
      return 'bg-violet-100 text-violet-700 border-violet-200'
    case 'Behavioral':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Final':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Recommendation helpers -------------------------------------------------

type RecommendationTag = 'StrongYes' | 'Yes' | 'Maybe' | 'No' | 'StrongNo'

function recommendationLabel(tag: string): string {
  switch (tag as RecommendationTag) {
    case 'StrongYes':
      return 'Strong Yes'
    case 'Yes':
      return 'Yes'
    case 'Maybe':
      return 'Maybe'
    case 'No':
      return 'No'
    case 'StrongNo':
      return 'Strong No'
    default:
      return tag
  }
}

function recommendationBadgeClass(tag: string): string {
  switch (tag as RecommendationTag) {
    case 'StrongYes':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'Yes':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Maybe':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'No':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'StrongNo':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Department label -------------------------------------------------------

function departmentLabel(tag: string): string {
  switch (tag) {
    case 'Support':
      return 'Support'
    case 'Sales':
      return 'Sales'
    case 'Recruitment':
      return 'Recruitment'
    case 'Engineering':
      return 'Engineering'
    case 'Operations':
      return 'Operations'
    case 'Marketing':
      return 'Marketing'
    case 'Finance':
      return 'Finance'
    default:
      return tag
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
    (c) =>
      c.status.tag !== 'Hired' && c.status.tag !== 'Rejected'
  ).length
  const interviewsScheduled = interviews.filter((i) => !i.completed).length
  const hired = candidates.filter((c) => c.status.tag === 'Hired').length

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.currentCompany ?? '').toLowerCase().includes(q) ||
        (c.currentTitle ?? '').toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
    )
  }, [candidates, candidateSearch])

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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidate pipeline, job postings, and interview scheduling
          </p>
        </div>
        <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Add Candidate
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Candidate</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-name">Name *</Label>
                <Input
                  id="candidate-name"
                  placeholder="Jane Doe"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-email">Email *</Label>
                <Input
                  id="candidate-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={newCandidateEmail}
                  onChange={(e) => setNewCandidateEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-linkedin">LinkedIn URL</Label>
                <Input
                  id="candidate-linkedin"
                  placeholder="https://linkedin.com/in/jane"
                  value={newCandidateLinkedIn}
                  onChange={(e) => setNewCandidateLinkedIn(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateCandidate}
                disabled={!newCandidateName.trim() || !newCandidateEmail.trim()}
              >
                Create Candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">
            <Users className="size-4" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Briefcase className="size-4" />
            Job Postings
          </TabsTrigger>
          <TabsTrigger value="interviews">
            <CalendarCheck className="size-4" />
            Interviews
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* Tab 1 — Candidates                                                */}
        {/* ================================================================= */}
        <TabsContent value="candidates">
          <div className="flex flex-col gap-6 mt-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Candidates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {totalCandidates}
                    </span>
                    <Users className="size-5 text-muted-foreground mb-1" />
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    In Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {inPipeline}
                    </span>
                    <Star className="size-5 text-blue-400 mb-1" />
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Interviews Scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-purple-600">
                      {interviewsScheduled}
                    </span>
                    <CalendarCheck className="size-5 text-purple-400 mb-1" />
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Hired
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      {hired}
                    </span>
                    <CheckCircle2 className="size-5 text-green-400 mb-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Candidates table */}
            <Card>
              <ScrollArea className="rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Company</TableHead>
                      <TableHead>Current Title</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Exp (yrs)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-10"
                        >
                          {candidateSearch
                            ? 'No candidates match your search.'
                            : 'No candidates yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <TableRow key={candidate.id.toString()}>
                          <TableCell className="font-medium">
                            {candidate.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {candidate.email}
                          </TableCell>
                          <TableCell>
                            {candidate.currentCompany ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.currentTitle ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {candidate.skills.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                candidate.skills.slice(0, 4).map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5"
                                  >
                                    {skill}
                                  </Badge>
                                ))
                              )}
                              {candidate.skills.length > 4 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1.5 text-muted-foreground"
                                >
                                  +{candidate.skills.length - 4}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.overallScore !== undefined &&
                            candidate.overallScore !== null ? (
                              <span className="font-medium">
                                {candidate.overallScore.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.experienceYears !== undefined &&
                            candidate.experienceYears !== null ? (
                              candidate.experienceYears
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${candidateStatusBadgeClass(candidate.status.tag)}`}
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
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 2 — Job Postings                                              */}
        {/* ================================================================= */}
        <TabsContent value="jobs">
          <div className="flex flex-col gap-6 mt-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search job postings..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                {jobSearch
                  ? 'No job postings match your search.'
                  : 'No job postings yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <Card key={job.id.toString()}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {job.title}
                        </CardTitle>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${jobStatusBadgeClass(job.status.tag)}`}
                        >
                          {job.status.tag === 'OnHold'
                            ? 'On Hold'
                            : job.status.tag}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
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
                          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                            Requirements
                          </p>
                          <ul className="space-y-0.5">
                            {job.requirements.slice(0, 4).map((req, i) => (
                              <li
                                key={i}
                                className="text-xs text-muted-foreground flex items-start gap-1.5"
                              >
                                <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/60" />
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
                        <div className="flex items-center gap-1.5 text-xs text-violet-600">
                          <Bot className="size-3.5" />
                          <span className="font-medium">AI Sourcing Enabled</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
            <Card>
              <ScrollArea className="rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled At</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-10"
                        >
                          No interviews scheduled yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      interviews.map((interview) => {
                        const candidate = candidateMap.get(
                          interview.candidateId
                        )
                        const job = jobMap.get(interview.jobPostingId)
                        return (
                          <TableRow key={interview.id.toString()}>
                            <TableCell className="font-medium">
                              {candidate?.name ?? (
                                <span className="text-muted-foreground">
                                  Unknown
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {job?.title ?? (
                                <span className="text-muted-foreground">
                                  Unknown
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${interviewTypeBadgeClass(interview.interviewType.tag)}`}
                              >
                                {interview.interviewType.tag}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDateTime(interview.scheduledAt)}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="size-3.5" />
                                {interview.durationMinutes} min
                              </span>
                            </TableCell>
                            <TableCell>
                              {interview.completed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <CheckCircle2 className="size-3.5" />
                                  Done
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Pending
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.recommendation ? (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${recommendationBadgeClass(interview.recommendation.tag)}`}
                                >
                                  {recommendationLabel(
                                    interview.recommendation.tag
                                  )}
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
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
