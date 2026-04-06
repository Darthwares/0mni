'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { exportCSV } from '@/lib/csv-export'
import { Separator } from '@/components/ui/separator'
import { PresenceBar, PagePresenceStrip } from '@/components/presence-bar'
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
  ArrowDownRight,
  Sparkles,
  Trophy,
  Trash2,
  Download,
  Pencil,
  Clock,
  ArrowUpDown,
  Eye,
  CalendarDays,
  Activity,
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
} from 'recharts'
import { chartTooltipProps, chartAxisProps, chartGridProps } from '@/lib/chart-theme'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import ShinyText from '@/components/reactbits/ShinyText'
import BlurText from '@/components/reactbits/BlurText'

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

function daysBetween(a: any, b: any): number {
  try {
    const msA = a?.toDate?.()?.getTime?.() ?? 0
    const msB = b?.toDate?.()?.getTime?.() ?? 0
    if (!msA || !msB) return 0
    return Math.round(Math.abs(msB - msA) / (1000 * 60 * 60 * 24))
  } catch { return 0 }
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

const ACTIVE_STAGES: DealStageTag[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation']

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
  const updateLeadStatus = useSpacetimeReducer(reducers.updateLeadStatus)
  const updateLead = useSpacetimeReducer(reducers.updateLead)
  const deleteLead = useSpacetimeReducer(reducers.deleteLead)
  const createDeal = useSpacetimeReducer(reducers.createDeal)
  const updateDealStage = useSpacetimeReducer(reducers.updateDealStage)
  const updateDeal = useSpacetimeReducer(reducers.updateDeal)
  const deleteDeal = useSpacetimeReducer(reducers.deleteDeal)

  // ── Org-scoped data ────────────────────────────────────────────────────
  const orgLeads = useMemo(
    () => allLeads.filter(l => Number(l.orgId) === currentOrgId),
    [allLeads, currentOrgId]
  )
  const orgDeals = useMemo(
    () => allDeals.filter(d => Number(d.orgId) === currentOrgId),
    [allDeals, currentOrgId]
  )

  // ── Add Lead dialog state
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [newLeadName, setNewLeadName] = useState('')
  const [newLeadEmail, setNewLeadEmail] = useState('')
  const [newLeadCompany, setNewLeadCompany] = useState('')
  const [newLeadSource, setNewLeadSource] = useState<string>('Inbound')

  // ── Edit Lead dialog state
  const [editLeadOpen, setEditLeadOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<bigint | null>(null)
  const [editLeadName, setEditLeadName] = useState('')
  const [editLeadEmail, setEditLeadEmail] = useState('')
  const [editLeadCompany, setEditLeadCompany] = useState('')
  const [editLeadPhone, setEditLeadPhone] = useState('')
  const [editLeadTitle, setEditLeadTitle] = useState('')
  const [editLeadSource, setEditLeadSource] = useState<string>('Inbound')

  // ── Add Deal dialog state
  const [addDealOpen, setAddDealOpen] = useState(false)
  const [newDealName, setNewDealName] = useState('')
  const [newDealValue, setNewDealValue] = useState('')
  const [newDealStage, setNewDealStage] = useState<string>('Discovery')
  const [newDealLeadId, setNewDealLeadId] = useState<string>('')

  // ── Edit Deal dialog state
  const [editDealOpen, setEditDealOpen] = useState(false)
  const [editDealId, setEditDealId] = useState<bigint | null>(null)
  const [editDealName, setEditDealName] = useState('')
  const [editDealValue, setEditDealValue] = useState('')
  const [editDealLeadId, setEditDealLeadId] = useState<string>('')

  function openEditLead(lead: any) {
    setEditLeadId(lead.id)
    setEditLeadName(lead.name || '')
    setEditLeadEmail(lead.email || '')
    setEditLeadCompany(lead.company || '')
    setEditLeadPhone(lead.phone || '')
    setEditLeadTitle(lead.title || '')
    setEditLeadSource(lead.source?.tag || 'Inbound')
    setEditLeadOpen(true)
  }

  function handleEditLead() {
    if (!editLeadId || !editLeadName.trim() || !editLeadEmail.trim()) return
    updateLead({
      leadId: editLeadId,
      name: editLeadName.trim(),
      email: editLeadEmail.trim(),
      company: editLeadCompany.trim() || undefined,
      phone: editLeadPhone.trim() || undefined,
      title: editLeadTitle.trim() || undefined,
      source: { tag: editLeadSource } as any,
    })
    setEditLeadOpen(false)
  }

  function openEditDeal(deal: any) {
    setEditDealId(deal.id)
    setEditDealName(deal.name || '')
    setEditDealValue(String(deal.value ?? 0))
    setEditDealLeadId(deal.leadId ? deal.leadId.toString() : '')
    setEditDealOpen(true)
  }

  function handleEditDeal() {
    if (!editDealId || !editDealName.trim() || !editDealValue.trim()) return
    updateDeal({
      dealId: editDealId,
      name: editDealName.trim(),
      value: parseFloat(editDealValue) || 0,
      leadId: editDealLeadId ? BigInt(editDealLeadId) : undefined,
    })
    setEditDealOpen(false)
  }

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

  function handleCreateDeal() {
    if (!newDealName.trim() || !newDealValue.trim() || currentOrgId === null) return
    createDeal({
      orgId: BigInt(currentOrgId),
      name: newDealName.trim(),
      value: parseFloat(newDealValue) || 0,
      stageTag: newDealStage,
      leadId: newDealLeadId ? BigInt(newDealLeadId) : undefined,
    })
    setNewDealName('')
    setNewDealValue('')
    setNewDealStage('Discovery')
    setNewDealLeadId('')
    setAddDealOpen(false)
  }

  // ── Leads filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [leadSort, setLeadSort] = useState<'newest' | 'oldest' | 'name' | 'score'>('newest')

  // ── Pipeline filters
  const [dealSearch, setDealSearch] = useState('')

  // ── Sorted + filtered leads (org-scoped)
  const leads = useMemo(() => {
    const sorted = [...orgLeads]
    switch (leadSort) {
      case 'newest': sorted.sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())); break
      case 'oldest': sorted.sort((a, b) => Number(a.createdAt.toMillis()) - Number(b.createdAt.toMillis())); break
      case 'name': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break
      case 'score': sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)); break
    }
    return sorted
  }, [orgLeads, leadSort])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status?.tag !== statusFilter) return false
      if (sourceFilter !== 'all' && lead.source?.tag !== sourceFilter)  return false
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

  // ── KPIs (org-scoped)
  const kpis = useMemo(() => {
    const total     = leads.length
    const qualified = leads.filter((l) => l.status?.tag === 'Qualified').length
    const converted = leads.filter((l) => l.status?.tag === 'Converted').length
    const scored    = leads.filter((l) => l.score != null)
    const avgScore  = scored.length
      ? Math.round(scored.reduce((s, l) => s + (l.score ?? 0), 0) / scored.length)
      : 0
    const convRate  = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, qualified, converted, avgScore, convRate }
  }, [leads])

  // ── Deals (org-scoped) grouped by stage
  const deals = useMemo(() => [...orgDeals], [orgDeals])

  const filteredDeals = useMemo(() => {
    if (!dealSearch) return deals
    const q = dealSearch.toLowerCase()
    return deals.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      shortIdentity(d.owner).toLowerCase().includes(q)
    )
  }, [deals, dealSearch])

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStageTag, typeof filteredDeals>()
    for (const stage of DEAL_STAGES) map.set(stage, [])
    for (const deal of filteredDeals) {
      const tag = deal.stage?.tag as DealStageTag
      map.get(tag)?.push(deal)
    }
    return map
  }, [filteredDeals])

  const pipelineValue = useMemo(
    () => deals
      .filter((d) => d.stage?.tag !== 'ClosedLost')
      .reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  )

  const wonValue = useMemo(
    () => deals
      .filter((d) => d.stage?.tag === 'ClosedWon')
      .reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  )

  const avgProbability = useMemo(
    () => deals.length > 0
      ? Math.round(deals.reduce((s, d) => s + (d.probability ?? 0), 0) / deals.length)
      : 0,
    [deals]
  )

  // ── Forecast metrics
  const forecast = useMemo(() => {
    const activeDeals = deals.filter(d => !['ClosedWon', 'ClosedLost'].includes(d.stage?.tag))
    const closedWon = deals.filter(d => d.stage?.tag === 'ClosedWon')
    const closedLost = deals.filter(d => d.stage?.tag === 'ClosedLost')
    const totalClosed = closedWon.length + closedLost.length

    const weightedPipeline = activeDeals.reduce((s, d) => s + ((d.value ?? 0) * ((d.probability ?? 0) / 100)), 0)
    const winRate = totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 100) : 0
    const avgDealSize = closedWon.length > 0
      ? Math.round(closedWon.reduce((s, d) => s + (d.value ?? 0), 0) / closedWon.length)
      : 0
    const avgCycleTime = closedWon.length > 0
      ? Math.round(closedWon.reduce((s, d) => s + daysBetween(d.expectedClose, d.closedAt), 0) / closedWon.length)
      : 0

    // Stage funnel data
    const funnel = DEAL_STAGES.map(stage => {
      const stageDeals = deals.filter(d => d.stage?.tag === stage)
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + (d.value ?? 0), 0),
      }
    })

    // Source breakdown
    const sourceMap = new Map<string, { count: number; converted: number }>()
    for (const lead of orgLeads) {
      const tag = lead.source?.tag
      const entry = sourceMap.get(tag) || { count: 0, converted: 0 }
      entry.count++
      if (lead.status?.tag === 'Converted') entry.converted++
      sourceMap.set(tag, entry)
    }

    return {
      activeDeals: activeDeals.length,
      activePipelineValue: activeDeals.reduce((s, d) => s + (d.value ?? 0), 0),
      weightedPipeline,
      winRate,
      avgDealSize,
      avgCycleTime,
      closedWonCount: closedWon.length,
      closedLostCount: closedLost.length,
      funnel,
      sourceBreakdown: Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        ...data,
        rate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
      })),
    }
  }, [deals, orgLeads])

  // Chart: lead status distribution
  const LEAD_STATUS_COLORS: Record<string, string> = { New: '#3b82f6', Contacted: '#f59e0b', Qualified: '#22c55e', Converted: '#10b981', Lost: '#ef4444' }
  const leadStatusPieData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of orgLeads) {
      const s = l.status?.tag ?? 'New'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: LEAD_STATUS_COLORS[name] ?? '#737373',
    }))
  }, [orgLeads])

  // Chart: deal stage value bar
  const STAGE_CHART_COLORS: Record<string, string> = {
    Discovery: '#3b82f6', Demo: '#6366f1', Proposal: '#8b5cf6',
    Negotiation: '#f59e0b', ClosedWon: '#10b981', ClosedLost: '#ef4444',
  }
  const stageValueData = useMemo(() => {
    return forecast.funnel.map(f => ({
      name: stageLabel(f.stage),
      value: Math.round(f.value / 1000),
      count: f.count,
      fill: STAGE_CHART_COLORS[f.stage] ?? '#737373',
    }))
  }, [forecast.funnel])

  // Chart: source conversion bar
  const SOURCE_COLORS: Record<string, string> = { Inbound: '#3b82f6', Outbound: '#f97316', Referral: '#10b981', AIProspecting: '#8b5cf6', Event: '#ec4899', Partner: '#14b8a6' }
  const sourceBarData = useMemo(() => {
    return forecast.sourceBreakdown.map(s => ({
      name: s.source === 'AIProspecting' ? 'AI' : s.source,
      leads: s.count,
      converted: s.converted,
      rate: s.rate,
      fill: SOURCE_COLORS[s.source] ?? '#737373',
    }))
  }, [forecast.sourceBreakdown])

  // ── Active filter pills
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
            <BlurText text="Lead qualification and deal pipeline management" delay={35} animateBy="words" className="text-sm text-muted-foreground mt-0.5" />
          </div>
        </div>
        <PagePresenceStrip className="hidden xl:flex" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold tabular-nums">
            <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            <ShinyText
              text={fmtCurrency(pipelineValue)}
              speed={3}
              color="#059669"
              shineColor="#34d399"
              className="font-semibold"
            />
          </div>

          <Dialog open={addDealOpen} onOpenChange={setAddDealOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                <Plus className="size-4 mr-1.5" />
                New Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Deal</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="deal-name">Deal Name *</Label>
                  <Input id="deal-name" placeholder="Enterprise License - Acme" value={newDealName} onChange={(e) => setNewDealName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deal-value">Value ($) *</Label>
                    <Input id="deal-value" type="number" placeholder="50000" value={newDealValue} onChange={(e) => setNewDealValue(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stage</Label>
                    <Select value={newDealStage} onValueChange={setNewDealStage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.filter(s => s !== 'ClosedWon' && s !== 'ClosedLost').map(s => (
                          <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Link to Lead (optional)</Label>
                  <Select value={newDealLeadId} onValueChange={setNewDealLeadId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {leads.map(l => (
                        <SelectItem key={l.id.toString()} value={l.id.toString()}>{l.name} — {l.company || l.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDealOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDeal} disabled={!newDealName.trim() || !newDealValue.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0">
                  Create Deal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                  <Input id="lead-name" placeholder="John Doe" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email *</Label>
                  <Input id="lead-email" type="email" placeholder="john@company.com" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-company">Company</Label>
                  <Input id="lead-company" placeholder="Acme Inc" value={newLeadCompany} onChange={(e) => setNewLeadCompany(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-source">Source</Label>
                  <Select value={newLeadSource} onValueChange={setNewLeadSource}>
                    <SelectTrigger id="lead-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inbound">Inbound</SelectItem>
                      <SelectItem value="Outbound">Outbound</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="AIProspecting">AI Prospecting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateLead} disabled={!newLeadName.trim() || !newLeadEmail.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0">
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

      {/* ── Insights Charts */}
      {(orgLeads.length > 0 || deals.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lead status donut */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lead Status</h3>
            {leadStatusPieData.length > 0 ? (
              <>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadStatusPieData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value" stroke="none">
                        {leadStatusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        {...chartTooltipProps}
                        formatter={(value: number, name: string) => [`${value} lead${value !== 1 ? 's' : ''}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                  {leadStatusPieData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: d.color }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-xs text-muted-foreground">No leads yet</p>
              </div>
            )}
          </div>

          {/* Deal pipeline value by stage */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline by Stage ($K)</h3>
            {stageValueData.some(d => d.value > 0) ? (
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageValueData} barSize={22} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid {...chartGridProps} vertical={false} />
                    <XAxis {...chartAxisProps} dataKey="name" interval={0} angle={-20} textAnchor="end" height={35} />
                    <YAxis {...chartAxisProps} unit="K" />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value: number, name: string, props: any) => [`$${value}K (${props.payload.count} deals)`, 'Value']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {stageValueData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-xs text-muted-foreground">No deals yet</p>
              </div>
            )}
          </div>

          {/* Source conversion bar */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lead Sources</h3>
            {sourceBarData.length > 0 ? (
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceBarData} barSize={20} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis {...chartAxisProps} dataKey="name" />
                    <YAxis {...chartAxisProps} allowDecimals={false} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'leads') return [`${value} leads (${props.payload.rate}% conv)`, 'Total']
                        return [`${value} converted`, 'Won']
                      }}
                    />
                    <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                      {sourceBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} opacity={0.4} />
                      ))}
                    </Bar>
                    <Bar dataKey="converted" radius={[6, 6, 0, 0]}>
                      {sourceBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-xs text-muted-foreground">No source data</p>
              </div>
            )}
          </div>
        </div>
      )}

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
          <TabsTrigger value="forecast" className="gap-1.5">
            <Activity className="size-4" />
            Forecast
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

            <Select value={leadSort} onValueChange={(v) => setLeadSort(v as any)}>
              <SelectTrigger className="w-40">
                <ArrowUpDown className="size-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="score">Highest score</SelectItem>
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

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {filteredLeads.length} of {leads.length} leads
              </span>
              {filteredLeads.length > 0 && (
                <button
                  onClick={() => exportCSV('leads', [
                    { header: 'Name', accessor: (l: typeof filteredLeads[0]) => l.name },
                    { header: 'Email', accessor: (l: typeof filteredLeads[0]) => l.email },
                    { header: 'Company', accessor: (l: typeof filteredLeads[0]) => l.company },
                    { header: 'Status', accessor: (l: typeof filteredLeads[0]) => l.status?.tag ?? '' },
                    { header: 'Source', accessor: (l: typeof filteredLeads[0]) => l.source?.tag ?? '' },
                    { header: 'Score', accessor: (l: typeof filteredLeads[0]) => l.score },
                    { header: 'Phone', accessor: (l: typeof filteredLeads[0]) => l.phone },
                    { header: 'Title', accessor: (l: typeof filteredLeads[0]) => l.title },
                  ], filteredLeads)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="size-3.5" />
                  Export
                </button>
              )}
            </div>
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
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Created</TableHead>
                      <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold w-32" />
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
                              sourceBadgeClass(lead.source?.tag),
                            ].join(' ')}
                          >
                            {lead.source?.tag === 'AIProspecting' && <Sparkles className="size-3" />}
                            {sourceLabel(lead.source?.tag)}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={lead.status?.tag} onValueChange={(v) => { try { updateLeadStatus({ leadId: lead.id, newStatus: { tag: v } as any }) } catch (e) { console.error(e) } }}>
                            <SelectTrigger className={`h-7 w-[120px] text-xs border-0 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 ${leadStatusBadgeClass(lead.status?.tag)} rounded-full px-2`}>
                              <span className="flex items-center gap-1.5">
                                <span className={`size-1.5 rounded-full ${leadStatusDot(lead.status?.tag)}`} />
                                <SelectValue />
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'] as LeadStatusTag[]).map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {shortIdentity(lead.assignedTo)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {fmtDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEditLead(lead)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500/60 hover:text-red-500 hover:bg-red-500/10" onClick={() => { if (confirm('Delete this lead?')) deleteLead({ leadId: lead.id }) }}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
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
              <span className="font-medium tabular-nums">{filteredDeals.length}</span>
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

            {/* Deal search */}
            <div className="relative min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search deals…"
                className="pl-8 h-9"
                value={dealSearch}
                onChange={(e) => setDealSearch(e.target.value)}
              />
            </div>

            {/* Deal export */}
            <div className="ml-auto flex items-center gap-2">
              {deals.length > 0 && (
                <button
                  onClick={() => exportCSV('deals', [
                    { header: 'Name', accessor: (d: typeof deals[0]) => d.name },
                    { header: 'Value', accessor: (d: typeof deals[0]) => d.value },
                    { header: 'Stage', accessor: (d: typeof deals[0]) => d.stage?.tag ?? '' },
                    { header: 'Probability', accessor: (d: typeof deals[0]) => d.probability },
                    { header: 'Owner', accessor: (d: typeof deals[0]) => shortIdentity(d.owner) },
                    { header: 'Risk Factors', accessor: (d: typeof deals[0]) => d.riskFactors?.join('; ') ?? '' },
                    { header: 'Next Best Action', accessor: (d: typeof deals[0]) => d.nextBestAction ?? '' },
                  ], deals)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="size-3.5" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Pipeline progress bar */}
          <div className="mb-4">
            <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {DEAL_STAGES.map((stage) => {
                const count = dealsByStage.get(stage)?.length ?? 0
                if (count === 0 || filteredDeals.length === 0) return null
                const pct = (count / filteredDeals.length) * 100
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
                            <div className="flex items-start gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 rounded-md px-2 py-1.5 mb-2">
                              <Zap className="size-3 shrink-0 mt-0.5" />
                              <span className="leading-snug line-clamp-2 font-medium">
                                {deal.nextBestAction}
                              </span>
                            </div>
                          )}

                          {/* Actions — stage change + edit + delete */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity pt-1 border-t border-border/40">
                            <Select value={deal.stage?.tag} onValueChange={(v) => { try { updateDealStage({ dealId: deal.id, newStageTag: v }) } catch (e) { console.error(e) } }}>
                              <SelectTrigger className="h-6 flex-1 text-[11px] border-0 bg-neutral-100 dark:bg-neutral-800 rounded px-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DEAL_STAGES.map(s => (
                                  <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0" onClick={() => openEditDeal(deal)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 shrink-0" onClick={() => { if (confirm('Delete this deal?')) deleteDeal({ dealId: deal.id }) }}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            TAB 3 — FORECAST & ANALYTICS
        ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="forecast" className="mt-6 flex flex-col gap-6">

          {/* Forecast KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <DollarSign className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Weighted Pipeline</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtCurrency(forecast.weightedPipeline)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {forecast.activeDeals} active deals
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <Trophy className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Win Rate</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                <CountUp to={forecast.winRate} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {forecast.closedWonCount}W / {forecast.closedLostCount}L
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <BarChart3 className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Deal Size</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {fmtCurrency(forecast.avgDealSize)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                from {forecast.closedWonCount} closed won
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Clock className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Cycle</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                <CountUp to={forecast.avgCycleTime} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-1">days</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                time to close
              </p>
            </SpotlightCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  Pipeline Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col gap-2">
                  {forecast.funnel.map((item, i) => {
                    const maxVal = Math.max(...forecast.funnel.map(f => f.value), 1)
                    const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0
                    const style = stageStyle(item.stage)
                    return (
                      <div key={item.stage} className="flex items-center gap-3">
                        <div className="w-24 text-xs font-medium text-right shrink-0">
                          {stageLabel(item.stage)}
                        </div>
                        <div className="flex-1 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full bg-gradient-to-r ${style.gradient} rounded-lg transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(pct, item.count > 0 ? 4 : 0)}%` }}
                          />
                          <div className="absolute inset-0 flex items-center px-3 justify-between">
                            <span className="text-xs font-bold tabular-nums mix-blend-difference text-white">
                              {item.count} deals
                            </span>
                            <span className="text-xs font-semibold tabular-nums mix-blend-difference text-white">
                              {fmtCurrency(item.value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Lead Source Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="size-4 text-muted-foreground" />
                  Lead Source Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {forecast.sourceBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    No lead data available
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {forecast.sourceBreakdown.map(src => (
                      <div key={src.source} className="flex items-center gap-4">
                        <div className="w-28 shrink-0">
                          <span className={[
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                            sourceBadgeClass(src.source),
                          ].join(' ')}>
                            {src.source === 'AIProspecting' && <Sparkles className="size-3" />}
                            {sourceLabel(src.source)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{src.count} leads</span>
                            <span className="text-xs font-semibold tabular-nums">
                              {src.rate}% conversion
                            </span>
                          </div>
                          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${src.rate}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {src.converted}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">won</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue breakdown bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground" />
                Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Closed Won</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(wonValue)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUpRight className="size-3 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-500">{forecast.closedWonCount} deals</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Active Pipeline</p>
                  <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmtCurrency(forecast.activePipelineValue)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Eye className="size-3 text-blue-500" />
                    <span className="text-xs font-medium text-blue-500">{forecast.activeDeals} deals</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Closed Lost</p>
                  <p className="text-2xl font-bold tabular-nums text-red-500 dark:text-red-400">
                    {fmtCurrency(deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0))}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowDownRight className="size-3 text-red-500" />
                    <span className="text-xs font-medium text-red-500">{forecast.closedLostCount} deals</span>
                  </div>
                </div>
              </div>

              {/* Visual revenue bar */}
              {deals.length > 0 && (
                <div className="mt-4 flex h-4 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {wonValue > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                      style={{ width: `${(wonValue / Math.max(pipelineValue + deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0), 1)) * 100}%` }}
                      title={`Won: ${fmtCurrency(wonValue)}`}
                    />
                  )}
                  {forecast.activePipelineValue > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                      style={{ width: `${(forecast.activePipelineValue / Math.max(pipelineValue + deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0), 1)) * 100}%` }}
                      title={`Active: ${fmtCurrency(forecast.activePipelineValue)}`}
                    />
                  )}
                  {forecast.closedLostCount > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                      style={{ width: `${(deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0) / Math.max(pipelineValue + deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0), 1)) * 100}%` }}
                      title={`Lost: ${fmtCurrency(deals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + (d.value ?? 0), 0))}`}
                    />
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Won</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">Lost</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>

    {/* ── Edit Lead Dialog */}
    <Dialog open={editLeadOpen} onOpenChange={setEditLeadOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={editLeadName} onChange={(e) => setEditLeadName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input type="email" value={editLeadEmail} onChange={(e) => setEditLeadEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Company</Label>
              <Input value={editLeadCompany} onChange={(e) => setEditLeadCompany(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={editLeadPhone} onChange={(e) => setEditLeadPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editLeadTitle} onChange={(e) => setEditLeadTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={editLeadSource} onValueChange={setEditLeadSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inbound">Inbound</SelectItem>
                  <SelectItem value="Outbound">Outbound</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="AIProspecting">AI Prospecting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditLeadOpen(false)}>Cancel</Button>
          <Button onClick={handleEditLead} disabled={!editLeadName.trim() || !editLeadEmail.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Edit Deal Dialog */}
    <Dialog open={editDealOpen} onOpenChange={setEditDealOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Deal Name *</Label>
            <Input value={editDealName} onChange={(e) => setEditDealName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Value ($) *</Label>
              <Input type="number" value={editDealValue} onChange={(e) => setEditDealValue(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Link to Lead</Label>
              <Select value={editDealLeadId} onValueChange={setEditDealLeadId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {leads.map(l => (
                    <SelectItem key={l.id.toString()} value={l.id.toString()}>{l.name} — {l.company || l.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDealOpen(false)}>Cancel</Button>
          <Button onClick={handleEditDeal} disabled={!editDealName.trim() || !editDealValue.trim()} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}
