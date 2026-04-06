'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { exportCSV } from '@/lib/csv-export'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
  Sparkles,
  Trash2,
  ChevronRight,
  X,
  ArrowRight,
  FileText,
  Edit3,
  UserCheck,
  XCircle,
  Download,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'
import { chartTooltipProps, chartAxisProps, chartGridProps } from '@/lib/chart-theme'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'

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
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Contacted':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Screening':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'Interview':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'Offer':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Hired':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Rejected':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
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
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'OnHold':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Filled':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Closed':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---- Interview type helpers --------------------------------------------------

type InterviewTypeTag = 'Screening' | 'Technical' | 'Behavioral' | 'Final'

function interviewTypeBadgeClass(tag: string): string {
  switch (tag as InterviewTypeTag) {
    case 'Screening':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Technical':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'Behavioral':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Final':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
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
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Yes':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Maybe':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'No':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'StrongNo':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
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
  const updateCandidateStatus = useSpacetimeReducer(reducers.updateCandidateStatus)
  const updateCandidate = useSpacetimeReducer(reducers.updateCandidate)
  const deleteCandidate = useSpacetimeReducer(reducers.deleteCandidate)
  const createJobPosting = useSpacetimeReducer(reducers.createJobPosting)
  const updateJobPostingStatus = useSpacetimeReducer(reducers.updateJobPostingStatus)
  const deleteJobPosting = useSpacetimeReducer(reducers.deleteJobPosting)
  const scheduleInterview = useSpacetimeReducer(reducers.scheduleInterview)
  const completeInterview = useSpacetimeReducer(reducers.completeInterview)
  const deleteInterview = useSpacetimeReducer(reducers.deleteInterview)

  const [candidateSearch, setCandidateSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')

  // Add Candidate dialog state
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false)
  const [newCandidateName, setNewCandidateName] = useState('')
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [newCandidateLinkedIn, setNewCandidateLinkedIn] = useState('')

  // Selected candidate detail panel
  const [selectedCandidateId, setSelectedCandidateId] = useState<bigint | null>(null)

  // Create Job Posting dialog state
  const [jobDialogOpen, setJobDialogOpen] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDesc, setNewJobDesc] = useState('')
  const [newJobDept, setNewJobDept] = useState('Engineering')
  const [newJobLocation, setNewJobLocation] = useState('')
  const [newJobRequirements, setNewJobRequirements] = useState('')
  const [newJobNiceToHave, setNewJobNiceToHave] = useState('')
  const [newJobAiSourcing, setNewJobAiSourcing] = useState(false)

  // Schedule Interview dialog state
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [newInterviewCandidateId, setNewInterviewCandidateId] = useState('')
  const [newInterviewJobId, setNewInterviewJobId] = useState('')
  const [newInterviewType, setNewInterviewType] = useState('Screening')
  const [newInterviewDate, setNewInterviewDate] = useState('')
  const [newInterviewDuration, setNewInterviewDuration] = useState('60')

  // Complete Interview dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingInterviewId, setCompletingInterviewId] = useState<bigint | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completeRec, setCompleteRec] = useState('')

  // Org-scoped data
  const orgCandidates = useMemo(
    () => allCandidates.filter(c => Number(c.orgId) === currentOrgId),
    [allCandidates, currentOrgId]
  )
  const orgJobPostings = useMemo(
    () => allJobPostings.filter(j => Number(j.orgId) === currentOrgId),
    [allJobPostings, currentOrgId]
  )
  const orgInterviews = useMemo(
    () => allInterviews.filter(i => Number(i.orgId) === currentOrgId),
    [allInterviews, currentOrgId]
  )

  // Sorted candidates
  const candidates = useMemo(
    () =>
      [...orgCandidates].sort(
        (a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())
      ),
    [orgCandidates]
  )

  // Sorted job postings
  const jobPostings = useMemo(
    () =>
      [...orgJobPostings].sort(
        (a, b) => Number(b.postedAt.toMillis()) - Number(a.postedAt.toMillis())
      ),
    [orgJobPostings]
  )

  // Sorted interviews (ascending by scheduled time)
  const interviews = useMemo(
    () =>
      [...orgInterviews].sort(
        (a, b) => Number(a.scheduledAt.toMillis()) - Number(b.scheduledAt.toMillis())
      ),
    [orgInterviews]
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
      c.status?.tag !== 'Hired' && c.status?.tag !== 'Rejected'
  ).length
  const interviewsScheduled = interviews.filter((i) => !i.completed).length
  const hired = candidates.filter((c) => c.status?.tag === 'Hired').length

  // Chart: pipeline funnel data
  const STATUS_CHART_COLORS: Record<string, string> = {
    Sourced: '#3b82f6', Contacted: '#f59e0b', Screening: '#f97316',
    Interview: '#8b5cf6', Offer: '#10b981', Hired: '#22c55e', Rejected: '#ef4444',
  }
  const FUNNEL_STAGES: CandidateStatusTag[] = ['Sourced', 'Contacted', 'Screening', 'Interview', 'Offer', 'Hired']
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of candidates) {
      const s = c.status?.tag ?? 'Sourced'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return FUNNEL_STAGES.map((stage) => ({
      name: stage,
      value: counts[stage] ?? 0,
      fill: STATUS_CHART_COLORS[stage] ?? '#737373',
    }))
  }, [candidates])

  // Chart: full status distribution (including Rejected)
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of candidates) {
      const s = c.status?.tag ?? 'Sourced'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_CHART_COLORS[name] ?? '#737373',
    }))
  }, [candidates])

  // Chart: job postings by status
  const JOB_STATUS_COLORS: Record<string, string> = { Draft: '#a3a3a3', Open: '#22c55e', OnHold: '#f59e0b', Filled: '#3b82f6', Closed: '#737373' }
  const jobStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const j of jobPostings) {
      const s = j.status?.tag ?? 'Draft'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'OnHold' ? 'On Hold' : name,
      value,
      color: JOB_STATUS_COLORS[name] ?? '#737373',
    }))
  }, [jobPostings])

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
        j.department?.tag.toLowerCase().includes(q)
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

  const selectedCandidate = useMemo(() => {
    if (selectedCandidateId === null) return null
    return candidates.find((c) => c.id === selectedCandidateId) ?? null
  }, [candidates, selectedCandidateId])

  const candidateInterviews = useMemo(() => {
    if (!selectedCandidate) return []
    return interviews.filter((i) => i.candidateId === selectedCandidate.id)
  }, [interviews, selectedCandidate])

  const statusPipeline: CandidateStatusTag[] = ['Sourced', 'Contacted', 'Screening', 'Interview', 'Offer', 'Hired']

  function handleAdvanceStatus(candidateId: bigint, nextStatus: string) {
    try {
      updateCandidateStatus({ candidateId, newStatus: { tag: nextStatus } as any })
    } catch (e) { console.error('Failed to update candidate status:', e) }
  }

  function handleRejectCandidate(candidateId: bigint) {
    try {
      updateCandidateStatus({ candidateId, newStatus: { tag: 'Rejected' } as any })
    } catch (e) { console.error('Failed to reject candidate:', e) }
  }

  function handleDeleteCandidate(candidateId: bigint) {
    if (!confirm('Delete this candidate and all their interviews? This cannot be undone.')) return
    try {
      deleteCandidate({ candidateId })
      setSelectedCandidateId(null)
    } catch (e) { console.error('Failed to delete candidate:', e) }
  }

  function handleCreateJobPosting() {
    if (!newJobTitle.trim() || currentOrgId === null) return
    try {
      createJobPosting({
        orgId: BigInt(currentOrgId),
        title: newJobTitle.trim(),
        description: newJobDesc.trim(),
        department: { tag: newJobDept } as any,
        location: newJobLocation.trim() || undefined,
        requirements: newJobRequirements.trim() ? newJobRequirements.split('\n').map(s => s.trim()).filter(Boolean) : [],
        niceToHave: newJobNiceToHave.trim() ? newJobNiceToHave.split('\n').map(s => s.trim()).filter(Boolean) : [],
        aiSourcingEnabled: newJobAiSourcing,
        idealCandidateProfile: undefined,
      })
    } catch (e) { console.error('Failed to create job posting:', e) }
    setJobDialogOpen(false)
    setNewJobTitle(''); setNewJobDesc(''); setNewJobDept('Engineering')
    setNewJobLocation(''); setNewJobRequirements(''); setNewJobNiceToHave('')
    setNewJobAiSourcing(false)
  }

  function handleDeleteJobPosting(jobId: bigint) {
    if (!confirm('Delete this job posting?')) return
    try { deleteJobPosting({ jobId }) } catch (e) { console.error('Failed to delete job posting:', e) }
  }

  function handleChangeJobStatus(jobId: bigint, newStatus: string) {
    try {
      updateJobPostingStatus({ jobId, newStatus: { tag: newStatus } as any })
    } catch (e) { console.error('Failed to update job status:', e) }
  }

  function handleScheduleInterview() {
    if (!newInterviewCandidateId || !newInterviewJobId || !newInterviewDate || currentOrgId === null) return
    try {
      scheduleInterview({
        orgId: BigInt(currentOrgId),
        candidateId: BigInt(newInterviewCandidateId),
        jobPostingId: BigInt(newInterviewJobId),
        interviewType: { tag: newInterviewType } as any,
        scheduledAt: BigInt(new Date(newInterviewDate).getTime() * 1000),
        durationMinutes: parseInt(newInterviewDuration) || 60,
        interviewers: [],
      })
    } catch (e) { console.error('Failed to schedule interview:', e) }
    setInterviewDialogOpen(false)
    setNewInterviewCandidateId(''); setNewInterviewJobId('')
    setNewInterviewType('Screening'); setNewInterviewDate(''); setNewInterviewDuration('60')
  }

  function handleCompleteInterview() {
    if (completingInterviewId === null) return
    try {
      completeInterview({
        interviewId: completingInterviewId,
        notes: completeNotes.trim() || undefined,
        recommendation: completeRec ? { tag: completeRec } as any : undefined,
      })
    } catch (e) { console.error('Failed to complete interview:', e) }
    setCompleteDialogOpen(false)
    setCompletingInterviewId(null); setCompleteNotes(''); setCompleteRec('')
  }

  function handleDeleteInterview(interviewId: bigint) {
    if (!confirm('Delete this interview?')) return
    try { deleteInterview({ interviewId }) } catch (e) { console.error('Failed to delete interview:', e) }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20">
            <Users className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText
                colors={['#ec4899', '#f43f5e', '#e11d48', '#ec4899']}
                animationSpeed={6}
              >
                Recruitment
              </GradientText>
            </h1>
            <BlurText
              text="Candidate pipeline, job postings, and interview scheduling"
              delay={35}
              animateBy="words"
              className="text-sm text-muted-foreground mt-0.5"
            />
          </div>
          <PagePresenceStrip className="hidden xl:flex" />
        </div>
        <div className="flex items-center gap-2">
          {filteredCandidates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV('candidates', [
                { header: 'Name', accessor: (c: typeof filteredCandidates[0]) => c.name },
                { header: 'Email', accessor: (c: typeof filteredCandidates[0]) => c.email },
                { header: 'Phone', accessor: (c: typeof filteredCandidates[0]) => c.phone },
                { header: 'Status', accessor: (c: typeof filteredCandidates[0]) => c.status?.tag ?? '' },
                { header: 'Position', accessor: (c: typeof filteredCandidates[0]) => c.position },
                { header: 'Source', accessor: (c: typeof filteredCandidates[0]) => c.source },
                { header: 'Notes', accessor: (c: typeof filteredCandidates[0]) => c.notes },
              ], filteredCandidates)}
            >
              <Download className="size-4 mr-1.5" />
              Export
            </Button>
          )}
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

            {/* Pipeline Insights */}
            {candidates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pipeline funnel */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hiring Funnel</h3>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} barSize={20} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <XAxis {...chartAxisProps} dataKey="name" />
                        <YAxis {...chartAxisProps} allowDecimals={false} />
                        <RechartsTooltip
                          {...chartTooltipProps}
                          formatter={(value: number, name: string) => [`${value} candidate${value !== 1 ? 's' : ''}`, 'Count']}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {funnelData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status distribution donut */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Candidate Status</h3>
                  <div className="h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                          {statusPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          {...chartTooltipProps}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                    {statusPieData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ background: d.color }} />
                        {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Job posting status donut */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Job Postings</h3>
                  {jobStatusData.length > 0 ? (
                    <>
                      <div className="h-[130px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={jobStatusData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                              {jobStatusData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              {...chartTooltipProps}
                              formatter={(value: number, name: string) => [value, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                        {jobStatusData.map((d) => (
                          <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="size-2 rounded-full" style={{ background: d.color }} />
                            {d.name} ({d.value})
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[150px]">
                      <p className="text-xs text-muted-foreground">No job postings yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* Candidates table + detail panel */}
            <div className="flex gap-4">
              <Card className={selectedCandidate ? 'flex-1 min-w-0' : 'w-full'}>
                <ScrollArea className="rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                            {candidateSearch ? 'No candidates match your search.' : 'No candidates yet.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCandidates.map((candidate) => (
                          <TableRow
                            key={candidate.id.toString()}
                            className={`cursor-pointer transition-colors ${selectedCandidateId === candidate.id ? 'bg-accent' : 'hover:bg-muted/50'}`}
                            onClick={() => setSelectedCandidateId(selectedCandidateId === candidate.id ? null : candidate.id)}
                          >
                            <TableCell className="font-medium">{candidate.name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{candidate.email}</TableCell>
                            <TableCell className="text-xs">{candidate.currentCompany ?? <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-xs">{candidate.currentTitle ?? <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[160px]">
                                {candidate.skills.length === 0 ? (
                                  <span className="text-muted-foreground text-xs">—</span>
                                ) : (
                                  candidate.skills.slice(0, 3).map((skill) => (
                                    <Badge key={skill} variant="outline" className="text-[10px] h-4 px-1.5">{skill}</Badge>
                                  ))
                                )}
                                {candidate.skills.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">+{candidate.skills.length - 3}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {candidate.overallScore != null ? (
                                <span className="font-medium">{candidate.overallScore.toFixed(1)}</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${candidateStatusBadgeClass(candidate.status?.tag)}`}>
                                {candidate.status?.tag}
                              </span>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className={`size-4 text-muted-foreground transition-transform ${selectedCandidateId === candidate.id ? 'rotate-90' : ''}`} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>

              {/* Candidate detail panel */}
              {selectedCandidate && (
                <Card className="w-[380px] shrink-0 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold truncate">{selectedCandidate.name}</h3>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50" onClick={() => handleDeleteCandidate(selectedCandidate.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedCandidateId(null)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-5">
                      {/* Status pipeline */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pipeline Stage</p>
                        {selectedCandidate.status?.tag === 'Rejected' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-600 border-red-500/20">
                              <XCircle className="size-3 mr-1" /> Rejected
                            </span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAdvanceStatus(selectedCandidate.id, 'Sourced')}>
                              Re-open
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              {statusPipeline.map((stage, i) => {
                                const currentIdx = statusPipeline.indexOf(selectedCandidate.status?.tag as CandidateStatusTag)
                                const isActive = i <= currentIdx
                                const isCurrent = i === currentIdx
                                return (
                                  <div key={stage} className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleAdvanceStatus(selectedCandidate.id, stage)}
                                      className={`h-6 px-2 rounded-full text-[10px] font-medium border transition-all ${
                                        isCurrent
                                          ? candidateStatusBadgeClass(stage) + ' ring-2 ring-offset-1 ring-current/20'
                                          : isActive
                                            ? candidateStatusBadgeClass(stage)
                                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                                      }`}
                                    >
                                      {stage === 'Hired' ? <UserCheck className="size-3" /> : stage.slice(0, 3)}
                                    </button>
                                    {i < statusPipeline.length - 1 && (
                                      <ArrowRight className={`size-2.5 ${isActive && i < currentIdx ? 'text-foreground' : 'text-muted-foreground/30'}`} />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs w-fit text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50" onClick={() => handleRejectCandidate(selectedCandidate.id)}>
                              <XCircle className="size-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Contact info */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact</p>
                        <div className="space-y-1 text-sm">
                          <p>{selectedCandidate.email}</p>
                          {selectedCandidate.phone && <p>{selectedCandidate.phone}</p>}
                          {selectedCandidate.linkedinUrl && (
                            <a href={selectedCandidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">LinkedIn Profile</a>
                          )}
                          {selectedCandidate.githubUrl && (
                            <a href={selectedCandidate.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">GitHub Profile</a>
                          )}
                        </div>
                      </div>

                      {/* Professional */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Professional</p>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Company:</span> {selectedCandidate.currentCompany || '—'}</p>
                          <p><span className="text-muted-foreground">Title:</span> {selectedCandidate.currentTitle || '—'}</p>
                          <p><span className="text-muted-foreground">Experience:</span> {selectedCandidate.experienceYears != null ? `${selectedCandidate.experienceYears} years` : '—'}</p>
                          <p><span className="text-muted-foreground">AI Score:</span> {selectedCandidate.overallScore != null ? selectedCandidate.overallScore.toFixed(1) : '—'}</p>
                        </div>
                      </div>

                      {/* Skills */}
                      {selectedCandidate.skills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCandidate.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interviews for this candidate */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Interviews ({candidateInterviews.length})</p>
                        {candidateInterviews.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No interviews scheduled.</p>
                        ) : (
                          <div className="space-y-2">
                            {candidateInterviews.map((iv) => {
                              const job = jobMap.get(iv.jobPostingId)
                              return (
                                <div key={iv.id.toString()} className="p-2 rounded-lg border bg-muted/30 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${interviewTypeBadgeClass(iv.interviewType.tag)}`}>
                                      {iv.interviewType.tag}
                                    </span>
                                    {iv.completed ? (
                                      <span className="flex items-center gap-0.5 text-green-600 font-medium"><CheckCircle2 className="size-3" /> Done</span>
                                    ) : (
                                      <span className="text-muted-foreground">Pending</span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground">{job?.title ?? 'Unknown role'}</p>
                                  <p className="text-muted-foreground">{formatDateTime(iv.scheduledAt)} · {iv.durationMinutes}min</p>
                                  {iv.recommendation && (
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${recommendationBadgeClass(iv.recommendation.tag)}`}>
                                      {recommendationLabel(iv.recommendation.tag)}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 2 — Job Postings                                              */}
        {/* ================================================================= */}
        <TabsContent value="jobs">
          <div className="flex flex-col gap-6 mt-4">
            {/* Search + Create */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search job postings..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="pl-9" />
              </div>
              <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
                <DialogTrigger render={<Button />}>
                  <Plus className="size-4" /> New Job Posting
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Create Job Posting</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-3 py-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Title *</Label>
                      <Input placeholder="Senior Software Engineer" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Description</Label>
                      <Textarea placeholder="Role description..." value={newJobDesc} onChange={(e) => setNewJobDesc(e.target.value)} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Department</Label>
                        <Select value={newJobDept} onValueChange={setNewJobDept}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Engineering', 'Sales', 'Marketing', 'Support', 'Operations', 'Finance', 'Recruitment'].map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Location</Label>
                        <Input placeholder="Remote / City" value={newJobLocation} onChange={(e) => setNewJobLocation(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Requirements (one per line)</Label>
                      <Textarea placeholder="5+ years experience&#10;TypeScript proficiency&#10;..." value={newJobRequirements} onChange={(e) => setNewJobRequirements(e.target.value)} rows={3} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Nice to Have (one per line)</Label>
                      <Textarea placeholder="Rust experience&#10;Open source contributions" value={newJobNiceToHave} onChange={(e) => setNewJobNiceToHave(e.target.value)} rows={2} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newJobAiSourcing} onChange={(e) => setNewJobAiSourcing(e.target.checked)} className="rounded" />
                      Enable AI Sourcing
                    </label>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateJobPosting} disabled={!newJobTitle.trim()}>Create Job Posting</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {filteredJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                {jobSearch ? 'No job postings match your search.' : 'No job postings yet. Create one above.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <Card key={job.id.toString()}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                        <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${jobStatusBadgeClass(job.status?.tag)}`}>
                          {job.status?.tag === 'OnHold' ? 'On Hold' : job.status?.tag}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{departmentLabel(job.department?.tag)}</Badge>
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{job.location}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {job.requirements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Requirements</p>
                          <ul className="space-y-0.5">
                            {job.requirements.slice(0, 4).map((req, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/60" />{req}
                              </li>
                            ))}
                            {job.requirements.length > 4 && <li className="text-xs text-muted-foreground pl-2.5">+{job.requirements.length - 4} more</li>}
                          </ul>
                        </div>
                      )}
                      {job.aiSourcingEnabled && (
                        <div className="flex items-center gap-1.5 text-xs text-violet-600">
                          <Bot className="size-3.5" /><span className="font-medium">AI Sourcing Enabled</span>
                        </div>
                      )}
                      {/* Action row */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Select value={job.status?.tag} onValueChange={(v) => handleChangeJobStatus(job.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Draft', 'Open', 'OnHold', 'Filled', 'Closed'].map((s) => (
                              <SelectItem key={s} value={s}>{s === 'OnHold' ? 'On Hold' : s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-7 text-xs ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50" onClick={() => handleDeleteJobPosting(job.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
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
            {/* Schedule Interview button + Complete Interview dialog */}
            <div className="flex items-center justify-end gap-2">
              <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
                <DialogTrigger render={<Button />}>
                  <Plus className="size-4" /> Schedule Interview
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-3 py-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Candidate *</Label>
                      <Select value={newInterviewCandidateId} onValueChange={setNewInterviewCandidateId}>
                        <SelectTrigger><SelectValue placeholder="Select candidate..." /></SelectTrigger>
                        <SelectContent>
                          {candidates.filter(c => c.status?.tag !== 'Hired' && c.status?.tag !== 'Rejected').map((c) => (
                            <SelectItem key={c.id.toString()} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Job Posting *</Label>
                      <Select value={newInterviewJobId} onValueChange={setNewInterviewJobId}>
                        <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                        <SelectContent>
                          {jobPostings.filter(j => j.status?.tag === 'Open').map((j) => (
                            <SelectItem key={j.id.toString()} value={j.id.toString()}>{j.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select value={newInterviewType} onValueChange={setNewInterviewType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Screening', 'Technical', 'Behavioral', 'Final'].map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Duration (min)</Label>
                        <Input type="number" value={newInterviewDuration} onChange={(e) => setNewInterviewDuration(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Scheduled Date & Time *</Label>
                      <Input type="datetime-local" value={newInterviewDate} onChange={(e) => setNewInterviewDate(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleScheduleInterview} disabled={!newInterviewCandidateId || !newInterviewJobId || !newInterviewDate}>Schedule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Complete Interview dialog */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Complete Interview</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Notes</Label>
                    <Textarea placeholder="Interview notes, observations..." value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={4} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Recommendation</Label>
                    <Select value={completeRec} onValueChange={setCompleteRec}>
                      <SelectTrigger><SelectValue placeholder="Select recommendation..." /></SelectTrigger>
                      <SelectContent>
                        {['StrongYes', 'Yes', 'Maybe', 'No', 'StrongNo'].map((r) => (
                          <SelectItem key={r} value={r}>{recommendationLabel(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCompleteInterview}>Mark Complete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                      <TableHead>Status</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                          No interviews scheduled yet. Create one above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      interviews.map((interview) => {
                        const candidate = candidateMap.get(interview.candidateId)
                        const job = jobMap.get(interview.jobPostingId)
                        return (
                          <TableRow key={interview.id.toString()}>
                            <TableCell className="font-medium">{candidate?.name ?? <span className="text-muted-foreground">Unknown</span>}</TableCell>
                            <TableCell>{job?.title ?? <span className="text-muted-foreground">Unknown</span>}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${interviewTypeBadgeClass(interview.interviewType.tag)}`}>
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
                                  <CheckCircle2 className="size-3.5" /> Done
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Pending</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.recommendation ? (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${recommendationBadgeClass(interview.recommendation.tag)}`}>
                                  {recommendationLabel(interview.recommendation.tag)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!interview.completed && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                                    setCompletingInterviewId(interview.id)
                                    setCompleteNotes(interview.notes ?? '')
                                    setCompleteRec(interview.recommendation?.tag ?? '')
                                    setCompleteDialogOpen(true)
                                  }}>
                                    <CheckCircle2 className="size-3" /> Complete
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50" onClick={() => handleDeleteInterview(interview.id)}>
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
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </div>
  )
}
