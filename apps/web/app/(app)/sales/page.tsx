'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Search,
  AlertTriangle,
  Zap,
  DollarSign,
  Percent,
  User,
  Plus,
  Target,
  ArrowUpRight,
  Sparkles,
  Trophy,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function fmtCurrency(value: number) {
  return fmt.format(value)
}

function fmtDate(ts: any): string {
  if (ts == null) return '—'
  try {
    return ts.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch { return '—' }
}

function shortIdentity(id: { toHexString(): string } | undefined | null): string {
  if (!id) return '—'
  const hex = id.toHexString()
  return hex.slice(0, 8) + '…'
}

// ─── Lead status ─────────────────────────────────────────────────────────────

type LeadStatusTag = 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted' | 'Lost'
type LeadSourceTag = 'Inbound' | 'Outbound' | 'Referral' | 'AIProspecting'

function leadStatusBadgeClass(tag: string): string {
  switch (tag as LeadStatusTag) {
    case 'New':          return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Contacted':    return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
    case 'Qualified':    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Unqualified':  return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
    case 'Converted':    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Lost':         return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    default:             return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function leadStatusDot(tag: string): string {
  switch (tag as LeadStatusTag) {
    case 'New':          return 'bg-blue-500'
    case 'Contacted':    return 'bg-yellow-500'
    case 'Qualified':    return 'bg-green-500'
    case 'Unqualified':  return 'bg-neutral-400'
    case 'Converted':    return 'bg-emerald-500'
    case 'Lost':         return 'bg-red-500'
    default:             return 'bg-neutral-400'
  }
}

function sourceBadgeClass(tag: string): string {
  switch (tag as LeadSourceTag) {
    case 'Inbound':        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'Outbound':       return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case 'Referral':       return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'AIProspecting':  return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    default:               return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function sourceLabel(tag: string): string {
  if (tag === 'AIProspecting') return 'AI Prospecting'
  return tag
}

// Score visual
function scoreColor(score: number | null | undefined): string {
  if (score == null) return ''
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-green-500'
  if (score >= 40) return 'text-amber-500'
  if (score >= 20) return 'text-orange-500'
  return 'text-red-500'
}

function scoreBarWidth(score: number | null | undefined): string {
  if (score == null) return '0%'
  return `${Math.min(100, Math.max(0, score))}%`
}

function scoreBarColor(score: number | null | undefined): string {
  if (score == null) return 'bg-neutral-300'
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  if (score >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

// ─── Deal stage ───────────────────────────────────────────────────────────────

type DealStageTag =
  | 'Discovery'
  | 'Demo'
  | 'Proposal'
  | 'Negotiation'
  | 'ClosedWon'
  | 'ClosedLost'

const DEAL_STAGES: DealStageTag[] = [
  'Discovery',
  'Demo',
  'Proposal',
  'Negotiation',
  'ClosedWon',
  'ClosedLost',
]

function stageLabel(tag: DealStageTag): string {
  switch (tag) {
    case 'ClosedWon':  return 'Closed Won'
    case 'ClosedLost': return 'Closed Lost'
    default:           return tag
  }
}

interface StageStyle {
  column:    string
  header:    string
  card:      string
  badge:     string
  gradient:  string
  accent:    string
}

function stageStyle(tag: DealStageTag): StageStyle {
  switch (tag) {
    case 'Discovery':
      return {
        column: 'bg-blue-500/5 dark:bg-blue-500/5',
        header: 'text-blue-600 dark:text-blue-400',
        card:   'border-l-blue-500',
        badge:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        gradient: 'from-blue-500 to-blue-600',
        accent: 'bg-blue-500',
      }
    case 'Demo':
      return {
        column: 'bg-indigo-500/5 dark:bg-indigo-500/5',
        header: 'text-indigo-600 dark:text-indigo-400',
        card:   'border-l-indigo-500',
        badge:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        gradient: 'from-indigo-500 to-indigo-600',
        accent: 'bg-indigo-500',
      }
    case 'Proposal':
      return {
        column: 'bg-violet-500/5 dark:bg-violet-500/5',
        header: 'text-violet-600 dark:text-violet-400',
        card:   'border-l-violet-500',
        badge:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
        gradient: 'from-violet-500 to-violet-600',
        accent: 'bg-violet-500',
      }
    case 'Negotiation':
      return {
        column: 'bg-amber-500/5 dark:bg-amber-500/5',
        header: 'text-amber-600 dark:text-amber-400',
        card:   'border-l-amber-500',
        badge:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        gradient: 'from-amber-500 to-amber-600',
        accent: 'bg-amber-500',
      }
    case 'ClosedWon':
      return {
        column: 'bg-emerald-500/5 dark:bg-emerald-500/5',
        header: 'text-emerald-600 dark:text-emerald-400',
        card:   'border-l-emerald-500',
        badge:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        gradient: 'from-emerald-500 to-emerald-600',
        accent: 'bg-emerald-500',
      }
    case 'ClosedLost':
      return {
        column: 'bg-red-500/5 dark:bg-red-500/5',
        header: 'text-red-600 dark:text-red-400',
        card:   'border-l-red-500',
        badge:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        gradient: 'from-red-500 to-red-600',
        accent: 'bg-red-500',
      }
  }
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function SalesPage() {
  const { currentOrgId } = useOrg()
  const [allLeads] = useTable(tables.lead)
  const [allDeals] = useTable(tables.deal)
  const createLead = useSpacetimeReducer(reducers.createLead)

  // ── Add Lead dialog state
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [newLeadName, setNewLeadName] = useState('')
  const [newLeadEmail, setNewLeadEmail] = useState('')
  const [newLeadCompany, setNewLeadCompany] = useState('')
  const [newLeadSource, setNewLeadSource] = useState<string>('Inbound')

  function handleCreateLead() {
    if (!newLeadName.trim() || !newLeadEmail.trim() || currentOrgId === null) return
    createLead({
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      company: newLeadCompany.trim() || undefined,
      source: { tag: newLeadSource } as any,
      orgId: BigInt(currentOrgId),
    })
    setNewLeadName('')
    setNewLeadEmail('')
    setNewLeadCompany('')
    setNewLeadSource('Inbound')
    setAddLeadOpen(false)
  }

  // ── Leads filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery]   = useState('')

  // ── Sorted + filtered leads
  const leads = useMemo(
    () => [...allLeads].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allLeads]
  )

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status.tag !== statusFilter) return false
      if (sourceFilter !== 'all' && lead.source.tag !== sourceFilter)  return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName    = lead.name?.toLowerCase().includes(q)
        const matchEmail   = lead.email?.toLowerCase().includes(q)
        const matchCompany = lead.company?.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchCompany) return false
      }
      return true
    })
  }, [leads, statusFilter, sourceFilter, searchQuery])

  // ── KPIs
  const kpis = useMemo(() => {
    const total     = leads.length
    const qualified = leads.filter((l) => l.status.tag === 'Qualified').length
    const converted = leads.filter((l) => l.status.tag === 'Converted').length
    const scored    = leads.filter((l) => l.score != null)
    const avgScore  = scored.length
      ? Math.round(scored.reduce((s, l) => s + (l.score ?? 0), 0) / scored.length)
      : 0
    const convRate  = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, qualified, converted, avgScore, convRate }
  }, [leads])

  // ── Deals grouped by stage
  const deals = useMemo(() => [...allDeals], [allDeals])

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStageTag, typeof deals>()
    for (const stage of DEAL_STAGES) map.set(stage, [])
    for (const deal of deals) {
      const tag = deal.stage.tag as DealStageTag
      map.get(tag)?.push(deal)
    }
    return map
  }, [deals])

  const pipelineValue = useMemo(
    () => deals
      .filter((d) => d.stage.tag !== 'ClosedLost')
      .reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  )

  const wonValue = useMemo(
    () => deals
      .filter((d) => d.stage.tag === 'ClosedWon')
      .reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  )

  const avgProbability = useMemo(
    () => deals.length > 0
      ? Math.round(deals.reduce((s, d) => s + (d.probability ?? 0), 0) / deals.length)
      : 0,
    [deals]
  )

  // ── Active filter pills (for quick status filtering)
  const STATUS_PILLS: { label: string; value: string; dot: string }[] = [
    { label: 'All', value: 'all', dot: '' },
    { label: 'New', value: 'New', dot: 'bg-blue-500' },
    { label: 'Contacted', value: 'Contacted', dot: 'bg-yellow-500' },
    { label: 'Qualified', value: 'Qualified', dot: 'bg-green-500' },
    { label: 'Converted', value: 'Converted', dot: 'bg-emerald-500' },
    { label: 'Lost', value: 'Lost', dot: 'bg-red-500' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header with gradient */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <DollarSign className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText
                colors={['#10b981', '#14b8a6', '#06b6d4', '#10b981']}
                animationSpeed={6}
              >
                Sales & CRM
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Lead qualification and deal pipeline management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            <TrendingUp className="size-4" />
            {fmtCurrency(pipelineValue)}
          </div>

          <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 border-0">
                <Plus className="size-4 mr-1.5" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Name *</Label>
                  <Input
                    id="lead-name"
                    placeholder="John Doe"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email *</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="john@company.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-company">Company</Label>
                  <Input
                    id="lead-company"
                    placeholder="Acme Inc"
                    value={newLeadCompany}
                    onChange={(e) => setNewLeadCompany(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-source">Source</Label>
                  <Select value={newLeadSource} onValueChange={setNewLeadSource}>
                    <SelectTrigger id="lead-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inbound">Inbound</SelectItem>
                      <SelectItem value="Outbound">Outbound</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="AiProspecting">AI Prospecting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddLeadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLead}
                  disabled={!newLeadName.trim() || !newLeadEmail.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
                >
                  Create Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Users className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Leads</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={kpis.total} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <CheckCircle2 className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Qualified</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            <CountUp to={kpis.qualified} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <TrendingUp className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Converted</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CountUp to={kpis.converted} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Target className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Score</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={kpis.avgScore} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Percent className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Conv Rate</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp to={kpis.convRate} duration={1.5} />
            <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </SpotlightCard>
      </div>

      {/* ── Tabs */}
      <Tabs defaultValue="leads">
        <TabsList variant="line" className="border-b border-border w-full rounded-none pb-0 mb-0">
          <TabsTrigger value="leads" className="gap-1.5">
            <Users className="size-4" />
            Leads
            <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
              {leads.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <BarChart3 className="size-4" />
            Pipeline
            <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
              {deals.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1 — LEADS
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leads" className="mt-6 flex flex-col gap-5">

          {/* Status filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setStatusFilter(pill.value)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  statusFilter === pill.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700',
                ].join(' ')}
              >
                {pill.dot && <span className={`size-1.5 rounded-full ${pill.dot}`} />}
                {pill.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search leads…"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="Inbound">Inbound</SelectItem>
                <SelectItem value="Outbound">Outbound</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="AIProspecting">AI Prospecting</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== 'all' || sourceFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setSearchQuery('') }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {filteredLeads.length} of {leads.length} leads
            </span>
          </div>

          {/* Leads table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                    <Users className="size-6 opacity-40" />
                  </div>
                  <p className="font-medium">No leads found</p>
                  <p className="text-sm mt-1">
                    {leads.length === 0
                      ? 'Leads will appear here when they are created.'
                      : 'Try adjusting your filters.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Name</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Company</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Email</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Score</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Source</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Assigned</TableHead>
                      <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id.toString()}
                        className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold shrink-0">
                              {(lead.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {lead.name || <span className="text-muted-foreground italic">Unnamed</span>}
                              </p>
                              {lead.title && (
                                <p className="text-xs text-muted-foreground">{lead.title}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.company || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {lead.email || '—'}
                        </TableCell>
                        <TableCell>
                          {lead.score != null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-mono text-sm font-bold tabular-nums ${scoreColor(lead.score)}`}>
                                {lead.score}
                              </span>
                              <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${scoreBarColor(lead.score)}`}
                                  style={{ width: scoreBarWidth(lead.score) }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="block text-center text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                              sourceBadgeClass(lead.source.tag),
                            ].join(' ')}
                          >
                            {lead.source.tag === 'AIProspecting' && <Sparkles className="size-3" />}
                            {sourceLabel(lead.source.tag)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                              leadStatusBadgeClass(lead.status.tag),
                            ].join(' ')}
                          >
                            <span className={`size-1.5 rounded-full ${leadStatusDot(lead.status.tag)}`} />
                            {lead.status.tag}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {shortIdentity(lead.assignedTo)}
                        </TableCell>
                        <TableCell className="pr-4 text-muted-foreground text-xs">
                          {fmtDate(lead.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            TAB 2 — PIPELINE (KANBAN)
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="mt-6">
          {/* Pipeline summary strip */}
          <div className="mb-5 flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">{deals.length}</span>
              <span className="text-muted-foreground">deals</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-sm">
              <Trophy className="size-4 text-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmtCurrency(wonValue)}
              </span>
              <span className="text-muted-foreground">won</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 text-sm">
              <Percent className="size-4 text-violet-500" />
              <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                {avgProbability}%
              </span>
              <span className="text-muted-foreground">avg probability</span>
            </div>

            {/* Pipeline progress bar */}
            <div className="flex-1 min-w-48">
              <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                {DEAL_STAGES.map((stage) => {
                  const count = dealsByStage.get(stage)?.length ?? 0
                  if (count === 0 || deals.length === 0) return null
                  const pct = (count / deals.length) * 100
                  const style = stageStyle(stage)
                  return (
                    <div
                      key={stage}
                      className={`h-full ${style.accent} first:rounded-l-full last:rounded-r-full transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${stageLabel(stage)}: ${count}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Kanban board — horizontal scroll */}
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
              {DEAL_STAGES.map((stage) => {
                const stageDeals  = dealsByStage.get(stage) ?? []
                const stageVal    = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)
                const style       = stageStyle(stage)

                return (
                  <div
                    key={stage}
                    className={[
                      'flex flex-col rounded-xl border border-border/60 w-[280px] shrink-0 overflow-hidden',
                      style.column,
                    ].join(' ')}
                  >
                    {/* Column header with gradient accent line */}
                    <div className={`h-1 bg-gradient-to-r ${style.gradient}`} />
                    <div className="px-3 pt-3 pb-2 border-b border-border/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className={['font-semibold text-sm', style.header].join(' ')}>
                          {stageLabel(stage)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums bg-white/60 dark:bg-neutral-800/60 rounded-full px-2 py-0.5 border border-border/40">
                          {stageDeals.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium tabular-nums">
                        {fmtCurrency(stageVal)}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[calc(100vh-380px)]">
                      {stageDeals.length === 0 && (
                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
                          No deals
                        </div>
                      )}
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id.toString()}
                          className={[
                            'bg-white dark:bg-neutral-900 rounded-lg border border-border/60 border-l-[3px] p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default group/card',
                            style.card,
                          ].join(' ')}
                        >
                          {/* Deal name */}
                          <p className="font-medium text-sm leading-snug mb-2.5">
                            {deal.name}
                          </p>

                          {/* Value + probability */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {fmtCurrency(deal.value ?? 0)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                              {deal.probability ?? 0}%
                            </span>
                          </div>

                          {/* Probability bar */}
                          <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-2.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all`}
                              style={{ width: `${Math.min(100, deal.probability ?? 0)}%` }}
                            />
                          </div>

                          {/* Owner */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center justify-center size-5 rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-neutral-600 dark:to-neutral-700">
                              <User className="size-3 text-white" />
                            </div>
                            <span className="font-mono truncate text-[11px]">
                              {shortIdentity(deal.owner)}
                            </span>
                          </div>

                          {/* Risk factors */}
                          {deal.riskFactors && deal.riskFactors.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-2 py-1 mb-2">
                              <AlertTriangle className="size-3 shrink-0" />
                              <span className="font-medium">
                                {deal.riskFactors.length} risk factor
                                {deal.riskFactors.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Next best action */}
                          {deal.nextBestAction && (
                            <div className="flex items-start gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 rounded-md px-2 py-1.5">
                              <Zap className="size-3 shrink-0 mt-0.5" />
                              <span className="leading-snug line-clamp-2 font-medium">
                                {deal.nextBestAction}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </div>
  )
}
