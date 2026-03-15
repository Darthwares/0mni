'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
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
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

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
  return hex.slice(0, 8) + '...'
}

// ─── Lead status ─────────────────────────────────────────────────────────────

type LeadStatusTag = 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted' | 'Lost'
type LeadSourceTag = 'Inbound' | 'Outbound' | 'Referral' | 'AIProspecting'

function leadStatusBadgeClass(tag: string): string {
  switch (tag as LeadStatusTag) {
    case 'New':          return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Contacted':    return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800'
    case 'Qualified':    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
    case 'Unqualified':  return 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
    case 'Converted':    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Lost':         return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
    default:             return 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

function sourceBadgeClass(tag: string): string {
  switch (tag as LeadSourceTag) {
    case 'Inbound':        return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'
    case 'Outbound':       return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
    case 'Referral':       return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'AIProspecting':  return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    default:               return 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

function sourceLabel(tag: string): string {
  if (tag === 'AIProspecting') return 'AI Prospecting'
  return tag
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
  column:  string
  header:  string
  card:    string
  badge:   string
}

function stageStyle(tag: DealStageTag): StageStyle {
  switch (tag) {
    case 'Discovery':
      return {
        column: 'bg-blue-50/60 dark:bg-blue-950/15',
        header: 'text-blue-700 dark:text-blue-300',
        card:   'border-l-blue-400 dark:border-l-blue-500',
        badge:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      }
    case 'Demo':
      return {
        column: 'bg-indigo-50/60 dark:bg-indigo-950/15',
        header: 'text-indigo-700 dark:text-indigo-300',
        card:   'border-l-indigo-400 dark:border-l-indigo-500',
        badge:  'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      }
    case 'Proposal':
      return {
        column: 'bg-violet-50/60 dark:bg-violet-950/15',
        header: 'text-violet-700 dark:text-violet-300',
        card:   'border-l-violet-400 dark:border-l-violet-500',
        badge:  'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
      }
    case 'Negotiation':
      return {
        column: 'bg-amber-50/60 dark:bg-amber-950/15',
        header: 'text-amber-700 dark:text-amber-300',
        card:   'border-l-amber-400 dark:border-l-amber-500',
        badge:  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      }
    case 'ClosedWon':
      return {
        column: 'bg-emerald-50/60 dark:bg-emerald-950/15',
        header: 'text-emerald-700 dark:text-emerald-300',
        card:   'border-l-emerald-400 dark:border-l-emerald-500',
        badge:  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      }
    case 'ClosedLost':
      return {
        column: 'bg-red-50/60 dark:bg-red-950/15',
        header: 'text-red-700 dark:text-red-300',
        card:   'border-l-red-400 dark:border-l-red-500',
        badge:  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
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
    return { total, qualified, converted, avgScore }
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
    () => deals.filter((d) => d.stage.tag === 'ClosedWon').reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Page title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#10b981', '#059669', '#34d399', '#06b6d4']} animationSpeed={6}>
              Sales & CRM
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lead qualification and deal pipeline management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <DollarSign className="size-3.5" />
            Pipeline: {fmtCurrency(pipelineValue)}
          </div>

          <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-sm">
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
                  <Label htmlFor="lead-name" className="text-xs font-medium text-muted-foreground">Name *</Label>
                  <Input
                    id="lead-name"
                    placeholder="John Doe"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email" className="text-xs font-medium text-muted-foreground">Email *</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="john@company.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-company" className="text-xs font-medium text-muted-foreground">Company</Label>
                  <Input
                    id="lead-company"
                    placeholder="Acme Inc"
                    value={newLeadCompany}
                    onChange={(e) => setNewLeadCompany(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-source" className="text-xs font-medium text-muted-foreground">Source</Label>
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
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                >
                  Create Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Tabs */}
      <Tabs defaultValue="leads">
        <TabsList variant="line" className="border-b border-border w-full rounded-none pb-0 mb-0">
          <TabsTrigger value="leads" className="gap-1.5">
            <Users className="size-4" />
            Leads
            <span className="ml-1 rounded-full bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 text-xs font-mono leading-none">
              {leads.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <BarChart3 className="size-4" />
            Pipeline
            <span className="ml-1 rounded-full bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 text-xs font-mono leading-none">
              {deals.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1 — LEADS
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leads" className="mt-6 flex flex-col gap-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Leads', value: kpis.total, icon: Users, color: 'from-green-500 to-emerald-500', spotlight: 'rgba(16, 185, 129, 0.15)' },
              { label: 'Qualified', value: kpis.qualified, icon: CheckCircle2, color: 'from-blue-500 to-cyan-500', spotlight: 'rgba(59, 130, 246, 0.15)' },
              { label: 'Converted', value: kpis.converted, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', spotlight: 'rgba(20, 184, 166, 0.15)' },
              { label: 'Avg Score', value: kpis.avgScore, icon: BarChart3, color: 'from-violet-500 to-purple-500', spotlight: 'rgba(139, 92, 246, 0.15)' },
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search leads..."
                className="pl-8 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-neutral-50 dark:bg-neutral-800/50">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Unqualified">Unqualified</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44 bg-neutral-50 dark:bg-neutral-800/50">
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

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredLeads.length} of {leads.length} leads
            </span>
          </div>

          {/* Leads table */}
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.08)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="size-10 mb-3 opacity-20" />
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
                    <TableRow className="hover:bg-transparent bg-neutral-50/50 dark:bg-neutral-800/30">
                      <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Name</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Company</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Email</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider font-semibold">Score</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Source</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Assigned</TableHead>
                      <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id.toString()} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                              {(lead.name || '?')[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-sm">
                                {lead.name || <span className="text-muted-foreground italic">Unnamed</span>}
                              </span>
                              {lead.title && (
                                <p className="text-[11px] text-muted-foreground">{lead.title}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {lead.company || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {lead.email || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {lead.score != null ? (
                            <span className="font-mono text-sm font-medium">
                              {lead.score}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              sourceBadgeClass(lead.source.tag),
                            ].join(' ')}
                          >
                            {sourceLabel(lead.source.tag)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              leadStatusBadgeClass(lead.status.tag),
                            ].join(' ')}
                          >
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
          </SpotlightCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            TAB 2 — PIPELINE (KANBAN)
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="mt-6">
          {/* Pipeline summary strip */}
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/30 text-sm">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">{deals.length} deals</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-sm">
              <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">{fmtCurrency(wonValue)} won</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/30 text-sm">
              <Percent className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {deals.length > 0
                  ? Math.round(
                      deals.reduce((s, d) => s + (d.probability ?? 0), 0) / deals.length
                    )
                  : 0}% avg probability
              </span>
            </div>
          </div>

          {/* Kanban board — horizontal scroll */}
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
              {DEAL_STAGES.map((stage) => {
                const stageDeals  = dealsByStage.get(stage) ?? []
                const stageVal    = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)
                const style       = stageStyle(stage)

                return (
                  <div
                    key={stage}
                    className={[
                      'flex flex-col rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 w-64 shrink-0',
                      style.column,
                    ].join(' ')}
                  >
                    {/* Column header */}
                    <div className="px-3 pt-3 pb-2 border-b border-neutral-200/60 dark:border-neutral-700/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className={['font-semibold text-sm', style.header].join(' ')}>
                          {stageLabel(stage)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono bg-white/60 dark:bg-neutral-800/60 rounded-full px-1.5 py-0.5 border border-neutral-200/40 dark:border-neutral-700/40">
                          {stageDeals.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtCurrency(stageVal)}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
                      {stageDeals.length === 0 && (
                        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground/60">
                          No deals
                        </div>
                      )}
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id.toString()}
                          className={[
                            'bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/60 dark:border-neutral-700/40 border-l-4 p-3 shadow-sm hover:shadow-md transition-shadow cursor-default',
                            style.card,
                          ].join(' ')}
                        >
                          {/* Deal name */}
                          <p className="font-medium text-sm leading-snug mb-2">
                            {deal.name}
                          </p>

                          {/* Value + probability */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {fmtCurrency(deal.value ?? 0)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {deal.probability ?? 0}%
                            </span>
                          </div>

                          {/* Probability bar */}
                          <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, deal.probability ?? 0)}%` }}
                            />
                          </div>

                          {/* Owner */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <User className="size-3 shrink-0" />
                            <span className="font-mono truncate">
                              {shortIdentity(deal.owner)}
                            </span>
                          </div>

                          {/* Risk factors */}
                          {deal.riskFactors && deal.riskFactors.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-2">
                              <AlertTriangle className="size-3 shrink-0" />
                              <span>
                                {deal.riskFactors.length} risk factor
                                {deal.riskFactors.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Next best action */}
                          {deal.nextBestAction && (
                            <div className="flex items-start gap-1 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 rounded-md px-2 py-1">
                              <Zap className="size-3 shrink-0 mt-0.5" />
                              <span className="leading-snug line-clamp-2">
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
  )
}
