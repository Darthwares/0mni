'use client'

import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { useMemo, useState, useCallback } from 'react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import { exportCSV } from '@/lib/csv-export'
import {
  Users,
  TicketCheck,
  FileText,
  ListChecks,
  Headset,
  TrendingUp,
  TrendingDown,
  UserSearch,
  Building2,
  Bot,
  Trophy,
  BarChart3,
  Target,
  Sparkles,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Receipt,
  Wallet,
  Clock,
  Calendar,
  Zap,
  MessageSquare,
  Activity,
  PieChart,
} from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function tsToMs(ts: any): number {
  try { return ts.toDate?.().getTime() ?? 0 } catch { return 0 }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100)
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

type TimeRange = '7d' | '30d' | '90d' | 'all'
type Tab = 'overview' | 'productivity' | 'revenue' | 'people'

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
]

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'productivity', label: 'Productivity', icon: Zap },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'people', label: 'People', icon: Users },
]

function getRangeMs(range: TimeRange): number {
  if (range === '7d') return 7 * 86_400_000
  if (range === '30d') return 30 * 86_400_000
  if (range === '90d') return 90 * 86_400_000
  return Infinity
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[10px] text-muted-foreground">—</span>
  if (previous === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
      <ArrowUp className="size-3" />new
    </span>
  )
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
      <Minus className="size-3" />0%
    </span>
  )
  const isUp = change > 0
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(change)}%
    </span>
  )
}

// SVG Donut chart component
function DonutChart({ segments, size = 120, thickness = 16 }: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  thickness?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="text-xs text-muted-foreground">No data</span>
    </div>
  )
  const r = (size - thickness) / 2
  const c = Math.PI * 2 * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={thickness} className="text-neutral-100 dark:text-neutral-800" />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pctVal = seg.value / total
        const dash = pctVal * c
        const gap = c - dash
        const currentOffset = offset
        offset += dash
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness} strokeLinecap="butt"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-currentOffset}
            className="transition-all duration-700" />
        )
      })}
    </svg>
  )
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId, orgMembers } = useOrg()

  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState<TimeRange>('30d')

  const allEmployees = useTable(tables.employee)
  const allTasks = useTable(tables.task)
  const allTickets = useTable(tables.ticket)
  const allLeads = useTable(tables.lead)
  const allCandidates = useTable(tables.candidate)
  const allDocuments = useTable(tables.document)
  const allDeals = useTable(tables.deal)
  const allInvoices = useTable(tables.invoice)
  const allInvoiceLineItems = useTable(tables.invoice_line_item)
  const allExpenses = useTable(tables.expense)
  const allActivityLogs = useTable(tables.activity_log)
  const allMessages = useTable(tables.message)
  const allChannels = useTable(tables.channel)
  const allTimeEntries = useTable(tables.time_entry)

  // ── Time boundaries ────────────────────────────────────────────────────────
  const now = Date.now()
  const rangeMs = getRangeMs(range)
  const periodStart = range === 'all' ? 0 : now - rangeMs
  const prevPeriodStart = range === 'all' ? 0 : now - rangeMs * 2

  // ── Org member identities ────────────────────────────────────────────────
  const orgMemberHexes = useMemo(() => {
    const set = new Set<string>()
    for (const m of orgMembers) {
      if (m.identity) set.add(m.identity.toHexString())
    }
    return set
  }, [orgMembers])

  const employeeMap = useMemo(
    () => new Map(allEmployees.filter(e => e.id).map(e => [e.id.toHexString(), e])),
    [allEmployees],
  )

  const orgEmployees = useMemo(
    () => allEmployees.filter(e => e.id && orgMemberHexes.has(e.id.toHexString())),
    [allEmployees, orgMemberHexes],
  )

  // ── Org-scoped data ──────────────────────────────────────────────────────
  const orgTasks = useMemo(() => allTasks.filter(t => Number(t.orgId) === currentOrgId), [allTasks, currentOrgId])
  const orgTickets = useMemo(() => allTickets.filter(t => Number(t.orgId) === currentOrgId), [allTickets, currentOrgId])
  const orgLeads = useMemo(() => allLeads.filter(l => Number(l.orgId) === currentOrgId), [allLeads, currentOrgId])
  const orgCandidates = useMemo(() => allCandidates.filter(c => Number(c.orgId) === currentOrgId), [allCandidates, currentOrgId])
  const orgDocs = useMemo(() => allDocuments.filter(d => Number(d.orgId) === currentOrgId), [allDocuments, currentOrgId])
  const orgDeals = useMemo(() => allDeals.filter(d => Number(d.orgId) === currentOrgId), [allDeals, currentOrgId])
  const orgInvoices = useMemo(() => allInvoices.filter(i => Number(i.orgId) === currentOrgId), [allInvoices, currentOrgId])
  const orgExpenses = useMemo(() => allExpenses.filter(e => Number(e.orgId) === currentOrgId), [allExpenses, currentOrgId])
  const orgActivities = useMemo(() => allActivityLogs.filter(a => Number(a.orgId) === currentOrgId), [allActivityLogs, currentOrgId])
  const orgChannels = useMemo(() => allChannels.filter(c => Number(c.orgId) === currentOrgId), [allChannels, currentOrgId])
  const orgChannelIds = useMemo(() => new Set(orgChannels.map(c => c.id)), [orgChannels])
  const orgMessages = useMemo(() => allMessages.filter(m => m.contextType?.tag === 'Channel' && orgChannelIds.has(m.contextId)), [allMessages, orgChannelIds])
  const orgTimeEntries = useMemo(() => allTimeEntries.filter(t => Number(t.orgId) === currentOrgId), [allTimeEntries, currentOrgId])

  // ── Period-filtered counts with trend comparison ─────────────────────────
  const inRange = useCallback((ts: any) => {
    const ms = tsToMs(ts)
    return ms >= periodStart
  }, [periodStart])

  const inPrevRange = useCallback((ts: any) => {
    const ms = tsToMs(ts)
    return ms >= prevPeriodStart && ms < periodStart
  }, [prevPeriodStart, periodStart])

  // ════════════════════════════════════════════════════════════════════════════
  // OVERVIEW KPIs (with trends)
  // ════════════════════════════════════════════════════════════════════════════
  const kpis = useMemo(() => {
    const tasksCreated = orgTasks.filter(t => inRange(t.createdAt)).length
    const tasksPrev = orgTasks.filter(t => inPrevRange(t.createdAt)).length
    const tasksCompleted = orgTasks.filter(t => t.status?.tag === 'Completed' && t.completedAt && inRange(t.completedAt)).length
    const tasksCompletedPrev = orgTasks.filter(t => t.status?.tag === 'Completed' && t.completedAt && inPrevRange(t.completedAt)).length
    const ticketsResolved = orgTickets.filter(t => (t.status?.tag === 'Resolved' || t.status?.tag === 'Closed') && inRange(t.createdAt)).length
    const ticketsResolvedPrev = orgTickets.filter(t => (t.status?.tag === 'Resolved' || t.status?.tag === 'Closed') && inPrevRange(t.createdAt)).length
    const docsCreated = orgDocs.filter(d => inRange(d.createdAt)).length
    const docsCreatedPrev = orgDocs.filter(d => inPrevRange(d.createdAt)).length
    const msgsSent = orgMessages.filter(m => inRange(m.sentAt)).length
    const msgsSentPrev = orgMessages.filter(m => inPrevRange(m.sentAt)).length
    const activeTasks = orgTasks.filter(t => t.status?.tag !== 'Completed' && t.status?.tag !== 'Cancelled').length

    return {
      tasksCreated, tasksPrev, tasksCompleted, tasksCompletedPrev,
      ticketsResolved, ticketsResolvedPrev, docsCreated, docsCreatedPrev,
      msgsSent, msgsSentPrev, activeTasks,
      totalMembers: orgMembers.length,
    }
  }, [orgTasks, orgTickets, orgDocs, orgMessages, orgMembers, inRange, inPrevRange])

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVITY HEATMAP (last 52 weeks or ranged)
  // ════════════════════════════════════════════════════════════════════════════
  const heatmapData = useMemo(() => {
    const weeks = 26 // ~6 months
    const totalDays = weeks * 7
    const dayMs = 86_400_000
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const startDate = new Date(todayStart.getTime() - (totalDays - 1) * dayMs)

    const dayCounts = new Map<string, number>()
    for (const act of orgActivities) {
      const ms = tsToMs(act.timestamp)
      if (ms < startDate.getTime()) continue
      const day = new Date(ms)
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    }
    // Also count messages as activity
    for (const msg of orgMessages) {
      const ms = tsToMs(msg.sentAt)
      if (ms < startDate.getTime()) continue
      const day = new Date(ms)
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    }

    const maxCount = Math.max(1, ...dayCounts.values())
    const grid: { date: Date; key: string; count: number; level: number }[][] = []
    let currentDay = new Date(startDate)

    // Align to start of week (Sunday)
    const dayOfWeek = currentDay.getDay()
    if (dayOfWeek > 0) {
      currentDay = new Date(currentDay.getTime() - dayOfWeek * dayMs)
    }

    for (let w = 0; w < weeks + 1; w++) {
      const week: typeof grid[0] = []
      for (let d = 0; d < 7; d++) {
        const key = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`
        const count = dayCounts.get(key) ?? 0
        const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4))
        week.push({ date: new Date(currentDay), key, count, level })
        currentDay = new Date(currentDay.getTime() + dayMs)
      }
      grid.push(week)
    }

    return { grid, maxCount }
  }, [orgActivities, orgMessages])

  // ════════════════════════════════════════════════════════════════════════════
  // TASK PIPELINE
  // ════════════════════════════════════════════════════════════════════════════
  const taskPipeline = useMemo(() => {
    const total = orgTasks.length
    const completed = orgTasks.filter(t => t.status?.tag === 'Completed').length
    const inProgress = orgTasks.filter(t => t.status?.tag === 'InProgress' || t.status?.tag === 'Claimed').length
    const needsReview = orgTasks.filter(t => t.status?.tag === 'NeedsReview' || t.status?.tag === 'SelfChecking').length
    const unclaimed = orgTasks.filter(t => t.status?.tag === 'Unclaimed').length
    const escalated = orgTasks.filter(t => t.status?.tag === 'Escalated').length
    return { total, completed, inProgress, needsReview, unclaimed, escalated }
  }, [orgTasks])

  // ════════════════════════════════════════════════════════════════════════════
  // VELOCITY (tasks completed per day, last N days based on range)
  // ════════════════════════════════════════════════════════════════════════════
  const velocityData = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 14 : range === '90d' ? 30 : 30
    const result: { label: string; count: number; date: Date }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - i * 86_400_000
      const dayEnd = dayStart + 86_400_000
      const d = new Date(dayStart)
      const label = days <= 14
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = orgTasks.filter(t => {
        if (t.status?.tag !== 'Completed' || !t.completedAt) return false
        const ms = tsToMs(t.completedAt)
        return ms >= dayStart && ms < dayEnd
      }).length
      result.push({ label, count, date: d })
    }
    return result
  }, [orgTasks, range, now])

  const maxVelocity = Math.max(1, ...velocityData.map(d => d.count))

  // ════════════════════════════════════════════════════════════════════════════
  // SUPPORT METRICS
  // ════════════════════════════════════════════════════════════════════════════
  const supportMetrics = useMemo(() => {
    const total = orgTickets.length
    const open = orgTickets.filter(t => t.status?.tag === 'New' || t.status?.tag === 'Open' || t.status?.tag === 'Pending').length
    const resolved = orgTickets.filter(t => t.status?.tag === 'Resolved').length
    const closed = orgTickets.filter(t => t.status?.tag === 'Closed').length
    const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0
    const aiResolved = orgTickets.filter(t => t.aiAutoResolved).length
    // Priority breakdown
    const critical = orgTickets.filter(t => t.priority?.tag === 'Critical').length
    const high = orgTickets.filter(t => t.priority?.tag === 'High').length
    const medium = orgTickets.filter(t => t.priority?.tag === 'Medium').length
    const low = orgTickets.filter(t => t.priority?.tag === 'Low').length
    return { total, open, resolved, closed, resolutionRate, aiResolved, critical, high, medium, low }
  }, [orgTickets])

  // ════════════════════════════════════════════════════════════════════════════
  // SALES PIPELINE
  // ════════════════════════════════════════════════════════════════════════════
  const salesPipeline = useMemo(() => {
    const total = orgLeads.length
    const active = orgLeads.filter(l => l.status?.tag !== 'Converted' && l.status?.tag !== 'Lost').length
    const converted = orgLeads.filter(l => l.status?.tag === 'Converted').length
    const lost = orgLeads.filter(l => l.status?.tag === 'Lost').length
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, active, converted, lost, conversionRate }
  }, [orgLeads])

  // ════════════════════════════════════════════════════════════════════════════
  // DEAL FUNNEL & REVENUE
  // ════════════════════════════════════════════════════════════════════════════
  const dealMetrics = useMemo(() => {
    const stages = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] as const
    const funnel = stages.map(stage => ({
      stage,
      count: orgDeals.filter(d => d.stage?.tag === stage).length,
      value: orgDeals.filter(d => d.stage?.tag === stage).reduce((s, d) => s + d.value, 0),
    }))
    const totalPipeline = orgDeals.filter(d => d.stage?.tag !== 'ClosedWon' && d.stage?.tag !== 'ClosedLost')
      .reduce((s, d) => s + d.value, 0)
    const wonValue = orgDeals.filter(d => d.stage?.tag === 'ClosedWon').reduce((s, d) => s + d.value, 0)
    const lostValue = orgDeals.filter(d => d.stage?.tag === 'ClosedLost').reduce((s, d) => s + d.value, 0)
    const avgDealSize = orgDeals.length > 0 ? orgDeals.reduce((s, d) => s + d.value, 0) / orgDeals.length : 0
    const winRate = (() => {
      const closed = orgDeals.filter(d => d.stage?.tag === 'ClosedWon' || d.stage?.tag === 'ClosedLost').length
      const won = orgDeals.filter(d => d.stage?.tag === 'ClosedWon').length
      return closed > 0 ? Math.round((won / closed) * 100) : 0
    })()
    return { funnel, totalPipeline, wonValue, lostValue, avgDealSize, winRate, total: orgDeals.length }
  }, [orgDeals])

  // ════════════════════════════════════════════════════════════════════════════
  // INVOICE METRICS
  // ════════════════════════════════════════════════════════════════════════════
  const invoiceMetrics = useMemo(() => {
    const lineItemMap = new Map<string, number>()
    for (const li of allInvoiceLineItems) {
      if (!li.invoiceId) continue
      const key = li.invoiceId.toString()
      lineItemMap.set(key, (lineItemMap.get(key) ?? 0) + Number(li.unitPriceCents) * li.quantity)
    }
    const totalRevenue = orgInvoices.reduce((s, inv) => s + (inv.id ? (lineItemMap.get(inv.id.toString()) ?? 0) : 0), 0)
    const paid = orgInvoices.filter(i => i.status?.tag === 'Paid')
    const paidRevenue = paid.reduce((s, inv) => s + (inv.id ? (lineItemMap.get(inv.id.toString()) ?? 0) : 0), 0)
    const overdue = orgInvoices.filter(i => i.status?.tag === 'Overdue').length
    const pending = orgInvoices.filter(i => i.status?.tag === 'Draft' || i.status?.tag === 'Sent').length
    return { total: orgInvoices.length, totalRevenue, paidRevenue, overdue, pending }
  }, [orgInvoices, allInvoiceLineItems])

  // ════════════════════════════════════════════════════════════════════════════
  // EXPENSE ANALYTICS
  // ════════════════════════════════════════════════════════════════════════════
  const expenseMetrics = useMemo(() => {
    const totalSpent = orgExpenses.reduce((s, e) => s + Number(e.amountCents), 0)
    const approved = orgExpenses.filter(e => e.status?.tag === 'Approved' || e.status?.tag === 'Reimbursed')
    const approvedTotal = approved.reduce((s, e) => s + Number(e.amountCents), 0)
    const pending = orgExpenses.filter(e => e.status?.tag === 'Pending').length
    // By category
    const byCategory = new Map<string, number>()
    for (const e of orgExpenses) {
      const cat = e.category?.tag
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(e.amountCents))
    }
    const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
    return { totalSpent, approvedTotal, pending, categories, total: orgExpenses.length }
  }, [orgExpenses])

  // ════════════════════════════════════════════════════════════════════════════
  // RECRUITMENT
  // ════════════════════════════════════════════════════════════════════════════
  const recruitPipeline = useMemo(() => {
    const total = orgCandidates.length
    const inPipeline = orgCandidates.filter(c => c.status?.tag !== 'Hired' && c.status?.tag !== 'Rejected').length
    const hired = orgCandidates.filter(c => c.status?.tag === 'Hired').length
    const rejected = orgCandidates.filter(c => c.status?.tag === 'Rejected').length
    const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0
    return { total, inPipeline, hired, rejected, hireRate }
  }, [orgCandidates])

  // ════════════════════════════════════════════════════════════════════════════
  // DEPARTMENT DISTRIBUTION
  // ════════════════════════════════════════════════════════════════════════════
  const departments = useMemo(() => {
    const map = new Map<string, { total: number; ai: number }>()
    for (const emp of orgEmployees) {
      const dept = emp.department?.tag ?? 'Other'
      const entry = map.get(dept) ?? { total: 0, ai: 0 }
      entry.total++
      if (emp.employeeType?.tag === 'AiAgent') entry.ai++
      map.set(dept, entry)
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [orgEmployees])

  const maxDeptCount = useMemo(
    () => Math.max(1, ...departments.map(([, v]) => v.total)),
    [departments],
  )

  // ════════════════════════════════════════════════════════════════════════════
  // TOP PERFORMERS
  // ════════════════════════════════════════════════════════════════════════════
  const topPerformers = useMemo(() => {
    const completedCounts = new Map<string, number>()
    for (const task of orgTasks) {
      if (task.status.tag === 'Completed' && task.assignee) {
        if (range !== 'all' && task.completedAt && !inRange(task.completedAt)) continue
        const hex = task.assignee.toHexString()
        completedCounts.set(hex, (completedCounts.get(hex) ?? 0) + 1)
      }
    }
    return [...completedCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hex, count]) => {
        const emp = employeeMap.get(hex)
        return {
          hex,
          name: emp?.name ?? `user-${hex.slice(0, 8)}`,
          role: emp?.role ?? '',
          department: emp?.department?.tag ?? '',
          isAi: emp?.employeeType?.tag === 'AiAgent',
          tasksCompleted: count,
        }
      })
  }, [orgTasks, employeeMap, range, inRange])

  // ════════════════════════════════════════════════════════════════════════════
  // AI WORKFORCE
  // ════════════════════════════════════════════════════════════════════════════
  const aiMetrics = useMemo(() => {
    const agents = orgEmployees.filter(e => e.employeeType?.tag === 'AiAgent')
    const agentCount = agents.length
    const totalEmp = orgEmployees.length
    const aiRatio = totalEmp > 0 ? Math.round((agentCount / totalEmp) * 100) : 0
    const agentHexes = new Set(agents.filter(a => a.id).map(a => a.id.toHexString()))
    const aiTasksCompleted = orgTasks.filter(t =>
      t.status?.tag === 'Completed' && t.assignee && agentHexes.has(t.assignee.toHexString()),
    ).length
    const aiTotalTasks = orgTasks.filter(t =>
      t.assignee && agentHexes.has(t.assignee.toHexString()),
    ).length
    return { agentCount, aiRatio, aiTasksCompleted, aiTotalTasks }
  }, [orgEmployees, orgTasks])

  // ════════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════════════════
  const handleExport = useCallback(() => {
    const rows = [
      { Metric: 'Total Members', Value: kpis.totalMembers.toString() },
      { Metric: 'Active Tasks', Value: kpis.activeTasks.toString() },
      { Metric: 'Tasks Created (period)', Value: kpis.tasksCreated.toString() },
      { Metric: 'Tasks Completed (period)', Value: kpis.tasksCompleted.toString() },
      { Metric: 'Messages Sent (period)', Value: kpis.msgsSent.toString() },
      { Metric: 'Tickets Resolved (period)', Value: kpis.ticketsResolved.toString() },
      { Metric: 'Documents Created (period)', Value: kpis.docsCreated.toString() },
      { Metric: 'Support Resolution Rate', Value: `${supportMetrics.resolutionRate}%` },
      { Metric: 'Sales Conversion Rate', Value: `${salesPipeline.conversionRate}%` },
      { Metric: 'Deal Win Rate', Value: `${dealMetrics.winRate}%` },
      { Metric: 'Total Pipeline Value', Value: `$${Math.round(dealMetrics.totalPipeline).toLocaleString()}` },
      { Metric: 'Revenue Won', Value: `$${Math.round(dealMetrics.wonValue).toLocaleString()}` },
      { Metric: 'Invoice Revenue', Value: formatCurrency(invoiceMetrics.totalRevenue) },
      { Metric: 'Total Expenses', Value: formatCurrency(expenseMetrics.totalSpent) },
      { Metric: 'Recruitment Hire Rate', Value: `${recruitPipeline.hireRate}%` },
      { Metric: 'AI Workforce Ratio', Value: `${aiMetrics.aiRatio}%` },
    ]
    exportCSV(`analytics-${range}-${new Date().toISOString().slice(0, 10)}`, [
      { header: 'Metric', accessor: (r: any) => r.Metric },
      { header: 'Value', accessor: (r: any) => r.Value },
    ], rows)
  }, [kpis, supportMetrics, salesPipeline, dealMetrics, invoiceMetrics, expenseMetrics, recruitPipeline, aiMetrics, range])

  // ════════════════════════════════════════════════════════════════════════════
  // HEATMAP COLORS
  // ════════════════════════════════════════════════════════════════════════════
  const heatColors = ['bg-neutral-100 dark:bg-neutral-800', 'bg-emerald-200 dark:bg-emerald-900/60', 'bg-emerald-400 dark:bg-emerald-700/70', 'bg-emerald-500 dark:bg-emerald-600', 'bg-emerald-600 dark:bg-emerald-500']

  const EXPENSE_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                <BarChart3 className="size-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <GradientText colors={['#6366f1', '#8b5cf6', '#a78bfa']} animationSpeed={6}>
                    Analytics
                  </GradientText>
                </h1>
                <BlurText
                  text="Business intelligence across all modules"
                  delay={35}
                  animateBy="words"
                  className="text-sm text-muted-foreground mt-0.5"
                />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 h-8 shrink-0">
              <Download className="size-3.5" />
              Export
            </Button>
          </div>

          {/* ── Tabs + Time Range ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    tab === t.key
                      ? 'bg-white dark:bg-neutral-800 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
              {TIME_RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    range === r.key
                      ? 'bg-white dark:bg-neutral-800 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <>
              {/* KPI Cards with trends */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Tasks Created', value: kpis.tasksCreated, prev: kpis.tasksPrev, icon: ListChecks, color: 'from-indigo-500 to-violet-600', spotlight: 'rgba(99, 102, 241, 0.15)' },
                  { label: 'Completed', value: kpis.tasksCompleted, prev: kpis.tasksCompletedPrev, icon: Target, color: 'from-emerald-500 to-green-600', spotlight: 'rgba(34, 197, 94, 0.15)' },
                  { label: 'Messages', value: kpis.msgsSent, prev: kpis.msgsSentPrev, icon: MessageSquare, color: 'from-violet-500 to-purple-600', spotlight: 'rgba(139, 92, 246, 0.15)' },
                  { label: 'Documents', value: kpis.docsCreated, prev: kpis.docsCreatedPrev, icon: FileText, color: 'from-blue-500 to-indigo-600', spotlight: 'rgba(59, 130, 246, 0.15)' },
                ].map(({ label, value, prev, icon: Icon, color, spotlight }) => (
                  <SpotlightCard key={label} className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor={spotlight}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center size-7 rounded-lg bg-gradient-to-br ${color}`}>
                          <Icon className="size-3.5 text-white" />
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                      </div>
                      <TrendBadge current={value} previous={prev} />
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      <CountUp to={value} duration={1.5} separator="," />
                    </p>
                  </SpotlightCard>
                ))}
              </div>

              {/* Activity Heatmap */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-emerald-500" />
                    <h2 className="text-sm font-semibold">Activity Heatmap</h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>Less</span>
                    {heatColors.map((color, i) => (
                      <div key={i} className={`size-3 rounded-sm ${color}`} />
                    ))}
                    <span>More</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-[3px] min-w-fit">
                    {heatmapData.grid.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((day) => (
                          <Tooltip key={day.key}>
                            <TooltipTrigger>
                              <div className={`size-3 rounded-sm ${heatColors[day.level]} transition-colors`} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <span className="font-medium">{day.count}</span> activities on {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Two-column: Task Donut + Support */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Task Distribution Donut */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <PieChart className="size-4 text-indigo-500" />
                      <h2 className="text-sm font-semibold">Task Distribution</h2>
                    </div>
                    <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 tabular-nums">
                      {taskPipeline.total} total
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0">
                      <DonutChart
                        size={120}
                        thickness={16}
                        segments={[
                          { value: taskPipeline.completed, color: '#10b981', label: 'Done' },
                          { value: taskPipeline.inProgress, color: '#3b82f6', label: 'In Progress' },
                          { value: taskPipeline.needsReview, color: '#f59e0b', label: 'Review' },
                          { value: taskPipeline.unclaimed, color: '#9ca3af', label: 'Backlog' },
                          { value: taskPipeline.escalated, color: '#ef4444', label: 'Escalated' },
                        ]}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold tabular-nums">{taskPipeline.total > 0 ? pct(taskPipeline.completed, taskPipeline.total) : 0}%</span>
                        <span className="text-[9px] text-muted-foreground">done</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { label: 'Completed', count: taskPipeline.completed, dot: 'bg-emerald-500' },
                        { label: 'In Progress', count: taskPipeline.inProgress, dot: 'bg-blue-500' },
                        { label: 'Needs Review', count: taskPipeline.needsReview, dot: 'bg-amber-500' },
                        { label: 'Backlog', count: taskPipeline.unclaimed, dot: 'bg-neutral-400' },
                        { label: 'Escalated', count: taskPipeline.escalated, dot: 'bg-red-500' },
                      ].map(({ label, count, dot }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${dot}`} />
                          <span className="text-xs text-muted-foreground flex-1">{label}</span>
                          <span className="text-xs font-bold tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Support Quick Stats */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Headset className="size-4 text-amber-500" />
                      <h2 className="text-sm font-semibold">Support</h2>
                    </div>
                    <Badge className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 tabular-nums">
                      {supportMetrics.total} tickets
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Open</p>
                      <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{supportMetrics.open}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Resolved</p>
                      <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{supportMetrics.resolved + supportMetrics.closed}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Resolution Rate</span>
                      <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{supportMetrics.resolutionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                        style={{ width: `${supportMetrics.resolutionRate}%` }} />
                    </div>
                    {supportMetrics.aiResolved > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Bot className="size-3 text-violet-500" />
                        <span className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-violet-600 dark:text-violet-400">{supportMetrics.aiResolved}</span> auto-resolved by AI
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sales + Recruitment row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-500" />
                      <h2 className="text-sm font-semibold">Sales Pipeline</h2>
                    </div>
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 tabular-nums">
                      {salesPipeline.total} leads
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active</p>
                      <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">{salesPipeline.active}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Won</p>
                      <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{salesPipeline.converted}</p>
                    </div>
                    <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lost</p>
                      <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{salesPipeline.lost}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Conversion</span>
                    <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{salesPipeline.conversionRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700"
                      style={{ width: `${salesPipeline.conversionRate}%` }} />
                  </div>
                </div>

                {/* Recruitment */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserSearch className="size-4 text-cyan-500" />
                      <h2 className="text-sm font-semibold">Recruitment</h2>
                    </div>
                    <Badge className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10 tabular-nums">
                      {recruitPipeline.total} candidates
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pipeline</p>
                      <p className="text-lg font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{recruitPipeline.inPipeline}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hired</p>
                      <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{recruitPipeline.hired}</p>
                    </div>
                    <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rejected</p>
                      <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{recruitPipeline.rejected}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Hire Rate</span>
                    <span className="text-xs font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{recruitPipeline.hireRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                      style={{ width: `${recruitPipeline.hireRate}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PRODUCTIVITY TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {tab === 'productivity' && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                      <ListChecks className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Tasks</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums"><CountUp to={taskPipeline.total} duration={1.5} /></p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                      <Target className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    <CountUp to={kpis.tasksCompleted} duration={1.5} />
                  </p>
                  <TrendBadge current={kpis.tasksCompleted} previous={kpis.tasksCompletedPrev} />
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                      <Clock className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    <CountUp to={kpis.activeTasks} duration={1.5} />
                  </p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                      <Zap className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Completion %</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {pct(taskPipeline.completed, taskPipeline.total)}%
                  </p>
                </SpotlightCard>
              </div>

              {/* Velocity Chart */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-violet-500" />
                    <h2 className="text-sm font-semibold">Completion Velocity</h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {velocityData.reduce((s, d) => s + d.count, 0)} tasks completed
                  </span>
                </div>
                <div className="flex items-end gap-1 h-32">
                  {velocityData.map((day, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger className="flex-1">
                        <div className="flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                            {day.count > 0 ? day.count : ''}
                          </span>
                          <div
                            className={`w-full rounded-t transition-all duration-500 ${
                              day.count > 0
                                ? 'bg-gradient-to-t from-violet-500/70 to-violet-400/70'
                                : 'bg-muted/20'
                            }`}
                            style={{ height: `${Math.max(2, (day.count / maxVelocity) * 80)}px` }}
                          />
                          {velocityData.length <= 14 && (
                            <span className="text-[8px] text-muted-foreground truncate w-full text-center">{day.label}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {day.count} completed on {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Task Pipeline Bars + Priority Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="size-4 text-indigo-500" />
                    <h2 className="text-sm font-semibold">Task Pipeline</h2>
                  </div>
                  <div className="space-y-3">
                    {([
                      { label: 'Completed', count: taskPipeline.completed, color: 'bg-emerald-500', tc: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'In Progress', count: taskPipeline.inProgress, color: 'bg-blue-500', tc: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Needs Review', count: taskPipeline.needsReview, color: 'bg-amber-500', tc: 'text-amber-600 dark:text-amber-400' },
                      { label: 'Backlog', count: taskPipeline.unclaimed, color: 'bg-neutral-400', tc: 'text-neutral-500 dark:text-neutral-400' },
                      { label: 'Escalated', count: taskPipeline.escalated, color: 'bg-red-500', tc: 'text-red-600 dark:text-red-400' },
                    ] as const).map(({ label, count, color, tc }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-24 shrink-0 text-muted-foreground">{label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-700`}
                            style={{ width: `${pct(count, taskPipeline.total)}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-8 text-right ${tc}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Priority Breakdown */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="size-4 text-red-500" />
                    <h2 className="text-sm font-semibold">By Priority</h2>
                  </div>
                  {(() => {
                    const priorities = [
                      { tag: 'Urgent', color: '#ef4444', label: 'Urgent' },
                      { tag: 'High', color: '#f97316', label: 'High' },
                      { tag: 'Medium', color: '#eab308', label: 'Medium' },
                      { tag: 'Low', color: '#3b82f6', label: 'Low' },
                    ]
                    const data = priorities.map(p => ({
                      ...p,
                      count: orgTasks.filter(t => t.priority?.tag === p.tag).length,
                    }))
                    return (
                      <div className="flex items-center gap-6">
                        <div className="relative shrink-0">
                          <DonutChart
                            size={120}
                            thickness={16}
                            segments={data.map(d => ({ value: d.count, color: d.color, label: d.label }))}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold tabular-nums">{orgTasks.length}</span>
                            <span className="text-[9px] text-muted-foreground">total</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          {data.map(d => (
                            <div key={d.tag} className="flex items-center gap-2">
                              <div className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-xs text-muted-foreground flex-1">{d.label}</span>
                              <span className="text-xs font-bold tabular-nums">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Top Performers */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" />
                    <h2 className="text-sm font-semibold">Top Performers</h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">by tasks completed</span>
                </div>
                {topPerformers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Target className="size-8 opacity-30 mb-2" />
                    <p className="text-sm">No completed tasks yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topPerformers.map((p, idx) => {
                      const max = topPerformers[0]?.tasksCompleted ?? 1
                      const barWidth = pct(p.tasksCompleted, max)
                      return (
                        <div key={p.hex} className="flex items-center gap-3">
                          <span className={`text-xs font-bold tabular-nums w-5 text-center shrink-0 ${
                            idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-neutral-400' : idx === 2 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className={`flex items-center justify-center size-7 rounded-full text-white text-[10px] font-bold shrink-0 ${avatarColor(p.name)}`}>
                            {p.isAi ? <Bot className="size-3.5" /> : getInitials(p.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{p.name}</span>
                              {p.isAi && (
                                <Badge className="text-[9px] py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/10">AI</Badge>
                              )}
                            </div>
                            {p.role && <p className="text-[10px] text-muted-foreground truncate">{p.role}</p>}
                          </div>
                          <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden hidden sm:block">
                            <div className={`h-full rounded-full transition-all duration-700 ${
                              idx === 0 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                            }`} style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-sm font-bold tabular-nums w-8 text-right shrink-0">{p.tasksCompleted}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* REVENUE TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {tab === 'revenue' && (
            <>
              {/* Revenue KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                      <DollarSign className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pipeline</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums">${formatCompact(Math.round(dealMetrics.totalPipeline))}</p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <TrendingUp className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Won</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">${formatCompact(Math.round(dealMetrics.wonValue))}</p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                      <Receipt className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Invoiced</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(invoiceMetrics.totalRevenue)}</p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                      <Wallet className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expenses</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{formatCurrency(expenseMetrics.totalSpent)}</p>
                </SpotlightCard>
              </div>

              {/* Deal Funnel */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" />
                    <h2 className="text-sm font-semibold">Deal Funnel</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">Win Rate: <span className="font-bold text-emerald-600 dark:text-emerald-400">{dealMetrics.winRate}%</span></span>
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 tabular-nums">
                      {dealMetrics.total} deals
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const maxFunnel = Math.max(1, ...dealMetrics.funnel.map(f => f.count))
                    const stageColors: Record<string, string> = {
                      Discovery: 'bg-blue-500', Demo: 'bg-indigo-500', Proposal: 'bg-violet-500',
                      Negotiation: 'bg-amber-500', ClosedWon: 'bg-emerald-500', ClosedLost: 'bg-red-500',
                    }
                    const stageLabels: Record<string, string> = {
                      Discovery: 'Discovery', Demo: 'Demo', Proposal: 'Proposal',
                      Negotiation: 'Negotiation', ClosedWon: 'Closed Won', ClosedLost: 'Closed Lost',
                    }
                    return dealMetrics.funnel.map(f => (
                      <div key={f.stage} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-28 shrink-0 text-muted-foreground">{stageLabels[f.stage]}</span>
                        <div className="flex-1 h-6 rounded bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                          <div
                            className={`h-full rounded ${stageColors[f.stage]} opacity-80 transition-all duration-700`}
                            style={{ width: `${pct(f.count, maxFunnel)}%` }}
                          />
                          {f.count > 0 && (
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white mix-blend-difference">
                              {f.count} — ${formatCompact(Math.round(f.value))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Invoice + Expense side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice Metrics */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-amber-500" />
                      <h2 className="text-sm font-semibold">Invoices</h2>
                    </div>
                    <Badge className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 tabular-nums">
                      {invoiceMetrics.total} total
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Collected</p>
                      <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(invoiceMetrics.paidRevenue)}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pending</p>
                      <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{invoiceMetrics.pending}</p>
                    </div>
                    <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Overdue</p>
                      <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{invoiceMetrics.overdue}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Collection Rate</span>
                    <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {invoiceMetrics.totalRevenue > 0 ? Math.round((invoiceMetrics.paidRevenue / invoiceMetrics.totalRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${invoiceMetrics.totalRevenue > 0 ? (invoiceMetrics.paidRevenue / invoiceMetrics.totalRevenue) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-red-500" />
                      <h2 className="text-sm font-semibold">Expenses by Category</h2>
                    </div>
                    <Badge className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10 tabular-nums">
                      {expenseMetrics.total} items
                    </Badge>
                  </div>
                  {expenseMetrics.categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Wallet className="size-8 opacity-30 mb-2" />
                      <p className="text-sm">No expenses recorded</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0">
                        <DonutChart
                          size={120}
                          thickness={16}
                          segments={expenseMetrics.categories.map((c, i) => ({
                            value: c[1],
                            color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                            label: c[0],
                          }))}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold tabular-nums">{formatCurrency(expenseMetrics.totalSpent)}</span>
                          <span className="text-[9px] text-muted-foreground">total</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5 max-h-[140px] overflow-y-auto">
                        {expenseMetrics.categories.map(([cat, amt], i) => (
                          <div key={cat} className="flex items-center gap-2">
                            <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                            <span className="text-xs text-muted-foreground flex-1 truncate">{cat}</span>
                            <span className="text-xs font-bold tabular-nums">{formatCurrency(amt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PEOPLE TAB */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {tab === 'people' && (
            <>
              {/* People KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                      <Users className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Members</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums"><CountUp to={kpis.totalMembers} duration={1.5} /></p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                      <Bot className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI Agents</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400"><CountUp to={aiMetrics.agentCount} duration={1.5} /></p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(6, 182, 212, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                      <Building2 className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Departments</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums"><CountUp to={departments.length} duration={1.5} /></p>
                </SpotlightCard>
                <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                      <Sparkles className="size-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI Ratio</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{aiMetrics.aiRatio}%</p>
                </SpotlightCard>
              </div>

              {/* Department + AI side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Distribution */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-violet-500" />
                      <h2 className="text-sm font-semibold">Department Distribution</h2>
                    </div>
                    <Badge className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10 tabular-nums">
                      {orgEmployees.length} employees
                    </Badge>
                  </div>
                  {departments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No department data</p>
                  ) : (
                    <div className="space-y-3">
                      {departments.map(([dept, data]) => (
                        <div key={dept} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-24 shrink-0 truncate text-muted-foreground">{dept}</span>
                          <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                              style={{ width: `${pct(data.total, maxDeptCount)}%` }} />
                            {data.ai > 0 && (
                              <div className="absolute top-0 h-full rounded-full bg-purple-400/60"
                                style={{ left: `${pct(data.total - data.ai, maxDeptCount)}%`, width: `${pct(data.ai, maxDeptCount)}%` }} />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 w-16 justify-end shrink-0">
                            <span className="text-xs font-bold tabular-nums">{data.total}</span>
                            {data.ai > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                                <Bot className="size-2.5" />{data.ai}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Workforce */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-purple-500" />
                      <h2 className="text-sm font-semibold">AI Workforce</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tasks Done</p>
                      <p className="text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                        <CountUp to={aiMetrics.aiTasksCompleted} duration={1.5} />
                      </p>
                    </div>
                    <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Assigned</p>
                      <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        <CountUp to={aiMetrics.aiTotalTasks} duration={1.5} />
                      </p>
                    </div>
                  </div>
                  {/* AI ratio ring */}
                  <div className="flex items-center justify-center py-2">
                    <div className="relative size-28">
                      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-100 dark:text-neutral-800" />
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" stroke="url(#aiGrad)" strokeLinecap="round"
                          strokeDasharray={`${aiMetrics.aiRatio * 2.64} ${264 - aiMetrics.aiRatio * 2.64}`}
                          className="transition-all duration-1000" />
                        <defs>
                          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Bot className="size-4 text-purple-500 mb-0.5" />
                        <span className="text-lg font-bold tabular-nums">{aiMetrics.aiRatio}%</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">AI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recruitment Pipeline */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserSearch className="size-4 text-cyan-500" />
                    <h2 className="text-sm font-semibold">Recruitment Pipeline</h2>
                  </div>
                  <Badge className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10 tabular-nums">
                    {recruitPipeline.total} candidates
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">In Pipeline</p>
                    <p className="text-xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{recruitPipeline.inPipeline}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hired</p>
                    <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{recruitPipeline.hired}</p>
                  </div>
                  <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rejected</p>
                    <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{recruitPipeline.rejected}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hire Rate</p>
                    <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{recruitPipeline.hireRate}%</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
