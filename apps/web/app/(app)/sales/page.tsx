'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState } from 'react'
import { tables, reducers } from '@/generated'
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
    case 'New':          return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Contacted':    return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Qualified':    return 'bg-green-100 text-green-700 border-green-200'
    case 'Unqualified':  return 'bg-neutral-100 text-neutral-500 border-neutral-200'
    case 'Converted':    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Lost':         return 'bg-red-100 text-red-700 border-red-200'
    default:             return 'bg-neutral-100 text-neutral-500 border-neutral-200'
  }
}

function sourceBadgeClass(tag: string): string {
  switch (tag as LeadSourceTag) {
    case 'Inbound':        return 'bg-violet-100 text-violet-700 border-violet-200'
    case 'Outbound':       return 'bg-sky-100 text-sky-700 border-sky-200'
    case 'Referral':       return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'AIProspecting':  return 'bg-purple-100 text-purple-700 border-purple-200'
    default:               return 'bg-neutral-100 text-neutral-500 border-neutral-200'
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
  column:  string   // column bg
  header:  string   // header text + accent
  card:    string   // card border-left accent
  badge:   string   // stage badge
}

function stageStyle(tag: DealStageTag): StageStyle {
  switch (tag) {
    case 'Discovery':
      return {
        column: 'bg-blue-50/60',
        header: 'text-blue-700',
        card:   'border-l-blue-400',
        badge:  'bg-blue-100 text-blue-700 border-blue-200',
      }
    case 'Demo':
      return {
        column: 'bg-indigo-50/60',
        header: 'text-indigo-700',
        card:   'border-l-indigo-400',
        badge:  'bg-indigo-100 text-indigo-700 border-indigo-200',
      }
    case 'Proposal':
      return {
        column: 'bg-violet-50/60',
        header: 'text-violet-700',
        card:   'border-l-violet-400',
        badge:  'bg-violet-100 text-violet-700 border-violet-200',
      }
    case 'Negotiation':
      return {
        column: 'bg-amber-50/60',
        header: 'text-amber-700',
        card:   'border-l-amber-400',
        badge:  'bg-amber-100 text-amber-700 border-amber-200',
      }
    case 'ClosedWon':
      return {
        column: 'bg-emerald-50/60',
        header: 'text-emerald-700',
        card:   'border-l-emerald-400',
        badge:  'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    case 'ClosedLost':
      return {
        column: 'bg-red-50/60',
        header: 'text-red-700',
        card:   'border-l-red-400',
        badge:  'bg-red-100 text-red-700 border-red-200',
      }
  }
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function SalesPage() {
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
    if (!newLeadName.trim() || !newLeadEmail.trim()) return
    createLead({
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      company: newLeadCompany.trim() || undefined,
      source: { tag: newLeadSource } as any,
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Page title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Sales &amp; CRM
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lead qualification and deal pipeline management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <DollarSign className="size-3.5 text-emerald-500" />
            Pipeline: {fmtCurrency(pipelineValue)}
          </div>

          <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
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
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {kpis.total}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-green-500" />
                  Qualified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {kpis.qualified}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-emerald-500" />
                  Converted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">
                  {kpis.converted}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 text-violet-500" />
                  Avg Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {kpis.avgScore}
                </p>
              </CardContent>
            </Card>
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
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
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredLeads.length} of {leads.length} leads
            </span>
          </div>

          {/* Leads table */}
          <Card>
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="size-10 mb-3 opacity-30" />
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
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="pr-4">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id.toString()}>
                        <TableCell className="pl-4 font-medium">
                          {lead.name || <span className="text-muted-foreground italic">Unnamed</span>}
                          {lead.title && (
                            <p className="text-xs text-muted-foreground font-normal">{lead.title}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                              sourceBadgeClass(lead.source.tag),
                            ].join(' ')}
                          >
                            {sourceLabel(lead.source.tag)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
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
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            TAB 2 — PIPELINE (KANBAN)
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="mt-6">
          {/* Pipeline summary strip */}
          <div className="mb-4 flex items-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="size-4" />
              <span>{deals.length} total deals</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <DollarSign className="size-4" />
              <span>
                {fmtCurrency(
                  deals
                    .filter((d) => d.stage.tag === 'ClosedWon')
                    .reduce((s, d) => s + (d.value ?? 0), 0)
                )}{' '}
                won
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Percent className="size-4" />
              <span>
                {deals.length > 0
                  ? Math.round(
                      deals.reduce((s, d) => s + (d.probability ?? 0), 0) / deals.length
                    )
                  : 0}
                % avg probability
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
                      'flex flex-col rounded-xl border border-border/60 w-64 shrink-0',
                      style.column,
                    ].join(' ')}
                  >
                    {/* Column header */}
                    <div className="px-3 pt-3 pb-2 border-b border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className={['font-semibold text-sm', style.header].join(' ')}>
                          {stageLabel(stage)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono bg-white/60 dark:bg-neutral-800/60 rounded-full px-1.5 py-0.5 border border-border/40">
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
                            'bg-white dark:bg-neutral-900 rounded-lg border border-border/60 border-l-4 p-3 shadow-sm hover:shadow-md transition-shadow cursor-default',
                            style.card,
                          ].join(' ')}
                        >
                          {/* Deal name */}
                          <p className="font-medium text-sm leading-snug text-neutral-900 dark:text-neutral-100 mb-2">
                            {deal.name}
                          </p>

                          {/* Value + probability */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-emerald-600">
                              {fmtCurrency(deal.value ?? 0)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {deal.probability ?? 0}%
                            </span>
                          </div>

                          {/* Probability bar */}
                          <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400"
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
                            <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                              <AlertTriangle className="size-3 shrink-0" />
                              <span>
                                {deal.riskFactors.length} risk factor
                                {deal.riskFactors.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Next best action */}
                          {deal.nextBestAction && (
                            <div className="flex items-start gap-1 text-xs text-violet-600 bg-violet-50 dark:bg-violet-900/20 rounded-md px-2 py-1">
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
