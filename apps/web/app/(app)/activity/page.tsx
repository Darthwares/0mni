'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Phone,
  Mail,
  Search,
  Filter,
  Clock,
  Sparkles,
  Bot,
  ArrowUpRight,
  Download,
} from 'lucide-react'
import { exportCSV } from '@/lib/csv-export'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'
import { chartTooltipProps, chartAxisProps, chartGridProps } from '@/lib/chart-theme'

// ─── Action config ──────────────────────────────────────────────────────────

const actionIcons: Record<string, typeof Activity> = {
  Created: Plus,
  Updated: Pencil,
  Deleted: Trash2,
  Assigned: UserCheck,
  Completed: CheckCircle,
  Escalated: AlertTriangle,
  Commented: MessageSquare,
  Called: Phone,
  Emailed: Mail,
}

const actionConfig: Record<string, { icon: string; dot: string; bg: string; gradient: string }> = {
  Created:   { icon: 'text-emerald-500', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-green-600' },
  Updated:   { icon: 'text-blue-500',    dot: 'bg-blue-500',    bg: 'bg-blue-500/10',    gradient: 'from-blue-500 to-indigo-600' },
  Deleted:   { icon: 'text-red-500',     dot: 'bg-red-500',     bg: 'bg-red-500/10',     gradient: 'from-red-500 to-rose-600' },
  Assigned:  { icon: 'text-purple-500',  dot: 'bg-purple-500',  bg: 'bg-purple-500/10',  gradient: 'from-purple-500 to-violet-600' },
  Completed: { icon: 'text-emerald-500', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-teal-600' },
  Escalated: { icon: 'text-amber-500',   dot: 'bg-amber-500',   bg: 'bg-amber-500/10',   gradient: 'from-amber-500 to-orange-600' },
  Commented: { icon: 'text-sky-500',     dot: 'bg-sky-500',     bg: 'bg-sky-500/10',     gradient: 'from-sky-500 to-blue-600' },
  Called:    { icon: 'text-indigo-500',  dot: 'bg-indigo-500',  bg: 'bg-indigo-500/10',  gradient: 'from-indigo-500 to-violet-600' },
  Emailed:   { icon: 'text-violet-500',  dot: 'bg-violet-500',  bg: 'bg-violet-500/10',  gradient: 'from-violet-500 to-purple-600' },
}

const defaultConfig = { icon: 'text-neutral-400', dot: 'bg-neutral-400', bg: 'bg-neutral-500/10', gradient: 'from-neutral-500 to-neutral-600' }

// ─── Helpers ────────────────────────────────────────────────────────────────

function avatarGradient(name: string): string {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function actionVerb(tag: string): string {
  switch (tag) {
    case 'Created': return 'created'
    case 'Updated': return 'updated'
    case 'Deleted': return 'deleted'
    case 'Assigned': return 'assigned'
    case 'Completed': return 'completed'
    case 'Escalated': return 'escalated'
    case 'Commented': return 'commented on'
    case 'Called': return 'called'
    case 'Emailed': return 'emailed'
    default: return tag.toLowerCase()
  }
}

function entityIcon(entityType: string): string {
  switch (entityType.toLowerCase()) {
    case 'ticket': case 'task': return 'text-blue-500'
    case 'document': case 'canvas': return 'text-violet-500'
    case 'lead': case 'deal': return 'text-emerald-500'
    case 'message': case 'channel': return 'text-sky-500'
    default: return 'text-neutral-400'
  }
}

function fmtTime(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const diff = now.getTime() - d.getTime()

    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function fmtFullTime(ts: any): string {
  try {
    return ts.toDate().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function getDateGroup(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    if (d >= today) return 'Today'
    if (d >= yesterday) return 'Yesterday'
    if (d >= thisWeek) return 'This Week'
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

// ─── Filter pills ───────────────────────────────────────────────────────────

const ACTION_FILTERS = [
  { label: 'All', value: 'all', dot: '' },
  { label: 'Created', value: 'Created', dot: 'bg-emerald-500' },
  { label: 'Updated', value: 'Updated', dot: 'bg-blue-500' },
  { label: 'Completed', value: 'Completed', dot: 'bg-emerald-500' },
  { label: 'Assigned', value: 'Assigned', dot: 'bg-purple-500' },
  { label: 'Escalated', value: 'Escalated', dot: 'bg-amber-500' },
  { label: 'Deleted', value: 'Deleted', dot: 'bg-red-500' },
  { label: 'Commented', value: 'Commented', dot: 'bg-sky-500' },
]

// ─── Entity routing ─────────────────────────────────────────────────────────

const ENTITY_ROUTES: Record<string, string> = {
  ticket: '/tickets',
  task: '/tickets',
  document: '/canvas',
  canvas: '/canvas',
  lead: '/sales',
  deal: '/sales',
  message: '/messages',
  channel: '/messages',
  contact: '/contacts',
  invoice: '/invoicing',
  candidate: '/recruitment',
  expense: '/expenses',
  kb_article: '/knowledge-base',
  form: '/forms',
  approval: '/approvals',
  workflow: '/workflows',
  calendar: '/calendar',
  event: '/calendar',
  employee: '/people',
  agent: '/agent-studio',
}

function entityRoute(entityType: string): string | null {
  return ENTITY_ROUTES[entityType.toLowerCase()] ?? null
}

const ENTITY_TYPE_FILTERS = [
  { label: 'All Types', value: 'all' },
  { label: 'Tasks', value: 'task' },
  { label: 'Documents', value: 'document' },
  { label: 'Messages', value: 'message' },
  { label: 'Tickets', value: 'ticket' },
  { label: 'Deals', value: 'deal' },
  { label: 'Contacts', value: 'contact' },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { currentOrgId } = useOrg()
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)
  const [actionFilter, setActionFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const employeeMap = useMemo(
    () => new Map(allEmployees.filter(e => e.id).map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const orgActivity = useMemo(
    () => allActivity.filter(a => Number(a.orgId) === currentOrgId),
    [allActivity, currentOrgId]
  )

  const activities = useMemo(
    () => [...orgActivity].sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis())),
    [orgActivity]
  )

  const filteredActivities = useMemo(() => {
    let list = activities
    if (actionFilter !== 'all') {
      list = list.filter((a) => a.action?.tag === actionFilter)
    }
    if (entityTypeFilter !== 'all') {
      list = list.filter((a) => a.entityType.toLowerCase() === entityTypeFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) => {
        const actorName = employeeMap.get(a.actor.toHexString())?.name ?? ''
        return (
          actorName.toLowerCase().includes(q) ||
          a.entityType.toLowerCase().includes(q) ||
          (a.metadata ?? '').toLowerCase().includes(q) ||
          a.action?.tag.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [activities, actionFilter, entityTypeFilter, searchQuery, employeeMap])

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: typeof filteredActivities }[] = []
    let currentGroup = ''
    for (const activity of filteredActivities) {
      const group = getDateGroup(activity.timestamp)
      if (group !== currentGroup) {
        currentGroup = group
        groups.push({ label: group, items: [] })
      }
      groups[groups.length - 1].items.push(activity)
    }
    return groups
  }, [filteredActivities])

  const getActorName = (actorId: { toHexString: () => string }) => {
    return employeeMap.get(actorId.toHexString())?.name ?? 'Unknown'
  }

  const isAI = (actorId: { toHexString: () => string }) => {
    return employeeMap.get(actorId.toHexString())?.employeeType.tag === 'AiAgent'
  }

  // Stats
  const stats = useMemo(() => {
    const total = activities.length
    const today = activities.filter((a) => {
      try {
        return a.timestamp.toDate().toDateString() === new Date().toDateString()
      } catch { return false }
    }).length
    const aiActions = activities.filter((a) => isAI(a.actor)).length
    const uniqueActors = new Set(activities.map((a) => a.actor.toHexString())).size
    return { total, today, aiActions, uniqueActors }
  }, [activities, employeeMap])

  // Activity heatmap — last 12 weeks (84 days), 7 cols per week
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number; dayOfWeek: number; weekIdx: number }[] = []
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const countByDay = new Map<string, number>()
    for (const a of activities) {
      try {
        const key = a.timestamp.toDate().toISOString().slice(0, 10)
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
      } catch { /* skip */ }
    }
    // Build 12 weeks starting from the Monday 12 weeks ago
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 83)
    for (let i = 0; i < 84; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      days.push({
        date: key,
        count: countByDay.get(key) ?? 0,
        dayOfWeek: d.getDay(),
        weekIdx: Math.floor(i / 7),
      })
    }
    return days
  }, [activities])

  const heatmapMax = useMemo(() => Math.max(...heatmapData.map(d => d.count), 1), [heatmapData])

  // Top contributors — top 5 by activity count
  const topContributors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of activities) {
      const hex = a.actor.toHexString()
      counts.set(hex, (counts.get(hex) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([hex, count]) => ({ hex, name: employeeMap.get(hex)?.name ?? 'Unknown', count, isAI: employeeMap.get(hex)?.employeeType?.tag === 'AiAgent' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [activities, employeeMap])

  const topContributorMax = topContributors[0]?.count ?? 1

  // Module breakdown — activity by entity type
  const moduleBreakdown = useMemo(() => {
    const MODULE_COLORS: Record<string, string> = {
      task: '#6366f1', ticket: '#f59e0b', document: '#8b5cf6', message: '#0ea5e9',
      deal: '#10b981', lead: '#14b8a6', contact: '#ec4899', invoice: '#f97316',
      candidate: '#06b6d4', expense: '#ef4444', workflow: '#3b82f6', form: '#a855f7',
    }
    const counts = new Map<string, number>()
    for (const a of activities) {
      const key = a.entityType.toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const total = [...counts.values()].reduce((s, v) => s + v, 0) || 1
    return [...counts.entries()]
      .map(([key, count]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: count,
        color: MODULE_COLORS[key] ?? '#737373',
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.value - a.value)
  }, [activities])

  const handleExportActivity = useCallback(() => {
    exportCSV('activity-log', [
      { header: 'Actor', accessor: (a: any) => getActorName(a.actor) },
      { header: 'Action', accessor: (a: any) => a.action?.tag },
      { header: 'Entity Type', accessor: (a: any) => a.entityType },
      { header: 'Entity ID', accessor: (a: any) => a.entityId },
      { header: 'Metadata', accessor: (a: any) => a.metadata ?? '' },
      { header: 'Timestamp', accessor: (a: any) => fmtFullTime(a.timestamp) },
    ], filteredActivities)
  }, [filteredActivities, employeeMap])

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
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Activity className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText
                colors={['#8b5cf6', '#a855f7', '#6366f1', '#8b5cf6']}
                animationSpeed={6}
              >
                Activity Feed
              </GradientText>
            </h1>
            <BlurText
              text="Real-time audit trail across all modules"
              delay={35}
              animateBy="words"
              className="text-sm text-muted-foreground mt-0.5"
            />
          </div>
        </div>
        <PagePresenceStrip className="hidden xl:flex" />
      </div>

      {/* ── Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Activity className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Events</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={stats.total} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Clock className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <CountUp to={stats.today} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI Actions</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            <CountUp to={stats.aiActions} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <UserCheck className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Contributors</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CountUp to={stats.uniqueActors} duration={1.5} />
          </p>
        </SpotlightCard>
      </div>

      {/* ── Insights Row: Heatmap + Contributors + Module Breakdown */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Heatmap */}
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Activity Heatmap</h2>
              <span className="text-[10px] text-muted-foreground">Last 12 weeks</span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: 12 }, (_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const cell = heatmapData.find(d => d.weekIdx === weekIdx && d.dayOfWeek === dayIdx)
                    if (!cell) return <div key={dayIdx} className="size-[14px] rounded-[3px] bg-muted/30" />
                    const intensity = cell.count / heatmapMax
                    const bg = cell.count === 0
                      ? 'bg-muted/40 dark:bg-neutral-800'
                      : intensity > 0.75 ? 'bg-violet-500' : intensity > 0.5 ? 'bg-violet-400' : intensity > 0.25 ? 'bg-violet-300 dark:bg-violet-600' : 'bg-violet-200 dark:bg-violet-700'
                    return (
                      <div
                        key={dayIdx}
                        className={`size-[14px] rounded-[3px] ${bg} transition-colors`}
                        title={`${cell.date}: ${cell.count} events`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-[10px] text-muted-foreground">Less</span>
              <div className="flex gap-[2px]">
                <div className="size-[10px] rounded-[2px] bg-muted/40 dark:bg-neutral-800" />
                <div className="size-[10px] rounded-[2px] bg-violet-200 dark:bg-violet-700" />
                <div className="size-[10px] rounded-[2px] bg-violet-300 dark:bg-violet-600" />
                <div className="size-[10px] rounded-[2px] bg-violet-400" />
                <div className="size-[10px] rounded-[2px] bg-violet-500" />
              </div>
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>

          {/* Top Contributors + Module Breakdown stacked */}
          <div className="flex flex-col gap-4">
            {/* Top Contributors */}
            <div className="rounded-2xl border bg-card p-5 flex-1">
              <h2 className="text-sm font-semibold mb-3">Top Contributors</h2>
              {topContributors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topContributors.map((c, i) => (
                    <div key={c.hex} className="flex items-center gap-2.5">
                      <span className="text-[10px] text-muted-foreground w-4 text-right tabular-nums">{i + 1}</span>
                      <Avatar className="size-6">
                        <AvatarFallback className={`text-[8px] font-bold text-white bg-gradient-to-br ${avatarGradient(c.name)}`}>
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate">{c.name}</span>
                          {c.isAI && <Bot className="size-2.5 text-violet-500 shrink-0" />}
                        </div>
                        <div className="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all" style={{ width: `${(c.count / topContributorMax) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Module Breakdown */}
            <div className="rounded-2xl border bg-card p-5 flex-1">
              <h2 className="text-sm font-semibold mb-3">By Module</h2>
              {moduleBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="shrink-0 relative size-[90px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={moduleBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={2} strokeWidth={0}>
                          {moduleBreakdown.map(m => <Cell key={m.name} fill={m.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    {moduleBreakdown.slice(0, 4).map(m => (
                      <div key={m.name} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-[10px] truncate">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums ml-auto shrink-0">{m.pct}%</span>
                      </div>
                    ))}
                    {moduleBreakdown.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{moduleBreakdown.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {ACTION_FILTERS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setActionFilter(pill.value)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                actionFilter === pill.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700',
              ].join(' ')}
            >
              {pill.dot && <span className={`size-1.5 rounded-full ${pill.dot}`} />}
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ENTITY_TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEntityTypeFilter(f.value)}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                entityTypeFilter === f.value
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                  : 'bg-transparent text-muted-foreground border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search activity…"
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleExportActivity} className="gap-1.5 shrink-0 h-8">
          <Download className="size-3.5" /> Export
        </Button>

        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {filteredActivities.length} of {activities.length} events
        </span>
      </div>

      {/* ── Timeline */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-26rem)]">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                  <Activity className="size-6 opacity-40" />
                </div>
                <p className="font-medium">No activity found</p>
                <p className="text-sm mt-1">
                  {activities.length === 0
                    ? 'Activity events will appear here as actions occur.'
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div>
                {groupedActivities.map((group) => (
                  <div key={group.label}>
                    {/* Date group header */}
                    <div className="sticky top-0 z-10 px-6 py-2 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-sm border-b border-border/40">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                    </div>

                    {/* Events */}
                    {group.items.map((activity, idx) => {
                      const config = actionConfig[activity.action?.tag] ?? defaultConfig
                      const IconComponent = actionIcons[activity.action?.tag] ?? Activity
                      const actorName = getActorName(activity.actor)
                      const actorIsAI = isAI(activity.actor)

                      return (
                        <div
                          key={String(activity.id)}
                          className="group flex items-start gap-4 px-6 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors relative"
                        >
                          {/* Timeline connector line */}
                          {idx < group.items.length - 1 && (
                            <div className="absolute left-[39px] top-[52px] bottom-0 w-px bg-border/60" />
                          )}

                          {/* Avatar with action icon overlay */}
                          <div className="relative shrink-0">
                            <Avatar className="size-9">
                              <AvatarFallback className={`text-[11px] font-bold text-white bg-gradient-to-br ${avatarGradient(actorName)}`}>
                                {getInitials(actorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 size-5 rounded-full ${config.bg} border-2 border-white dark:border-neutral-950 flex items-center justify-center`}>
                              <IconComponent className={`size-2.5 ${config.icon}`} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold">{actorName}</span>
                              {actorIsAI && (
                                <Badge className="ml-1.5 text-[9px] h-3.5 px-1 bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400 align-middle">
                                  <Bot className="size-2 mr-0.5" />
                                  AI
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                {' '}{actionVerb(activity.action?.tag)}{' '}
                              </span>
                              {(() => {
                                const route = entityRoute(activity.entityType)
                                const label = (
                                  <>
                                    <span className="font-medium">{activity.entityType}</span>
                                    <span className="font-mono text-xs ml-1">#{String(activity.entityId)}</span>
                                  </>
                                )
                                return route ? (
                                  <Link
                                    href={route}
                                    className="inline-flex items-center gap-0.5 text-foreground/80 hover:text-violet-600 dark:hover:text-violet-400 transition-colors underline-offset-2 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {label}
                                    <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                  </Link>
                                ) : (
                                  <span className="text-foreground/80">{label}</span>
                                )
                              })()}
                            </p>
                            {activity.metadata && (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-md leading-relaxed">
                                {activity.metadata}
                              </p>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground tabular-nums group-hover:hidden">
                              {fmtTime(activity.timestamp)}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums hidden group-hover:inline">
                              {fmtFullTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
    </div>
    </div>
  )
}
