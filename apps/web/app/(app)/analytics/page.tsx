'use client'

import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { useMemo } from 'react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  Users,
  TicketCheck,
  FileText,
  ListChecks,
  Headset,
  TrendingUp,
  UserSearch,
  Building2,
  Bot,
  Trophy,
  BarChart3,
  Target,
  Sparkles,
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

// ── page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId, orgMembers } = useOrg()

  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allDocuments] = useTable(tables.document)
  const [allMemberships] = useTable(tables.org_membership)

  // ── Org member identities ──────────────────────────────────────────────────
  const orgMemberHexes = useMemo(() => {
    const set = new Set<string>()
    for (const m of orgMembers) {
      if (m.identity) set.add(m.identity.toHexString())
    }
    return set
  }, [orgMembers])

  // ── Employee map ───────────────────────────────────────────────────────────
  const employeeMap = useMemo(
    () => new Map(allEmployees.map(e => [e.id.toHexString(), e])),
    [allEmployees],
  )

  // ── Org-scoped employees (members with employee records) ───────────────────
  const orgEmployees = useMemo(
    () => allEmployees.filter(e => orgMemberHexes.has(e.id.toHexString())),
    [allEmployees, orgMemberHexes],
  )

  // ── Org-scoped data ────────────────────────────────────────────────────────
  const orgTasks = useMemo(
    () => allTasks.filter(t => Number(t.orgId) === currentOrgId),
    [allTasks, currentOrgId],
  )
  const orgTickets = useMemo(
    () => allTickets.filter(t => Number(t.orgId) === currentOrgId),
    [allTickets, currentOrgId],
  )
  const orgLeads = useMemo(
    () => allLeads.filter(l => Number(l.orgId) === currentOrgId),
    [allLeads, currentOrgId],
  )
  const orgCandidates = useMemo(
    () => allCandidates.filter(c => Number(c.orgId) === currentOrgId),
    [allCandidates, currentOrgId],
  )
  const orgDocs = useMemo(
    () => allDocuments.filter(d => Number(d.orgId) === currentOrgId),
    [allDocuments, currentOrgId],
  )

  // ════════════════════════════════════════════════════════════════════════════
  // KPIs
  // ════════════════════════════════════════════════════════════════════════════
  const totalMembers = orgMembers.length
  const activeTasks = orgTasks.filter(
    t => t.status.tag !== 'Completed' && t.status.tag !== 'Cancelled',
  ).length
  const openTickets = orgTickets.filter(
    t => t.status.tag !== 'Resolved' && t.status.tag !== 'Closed',
  ).length
  const docCount = orgDocs.length

  // ════════════════════════════════════════════════════════════════════════════
  // Task Pipeline
  // ════════════════════════════════════════════════════════════════════════════
  const taskPipeline = useMemo(() => {
    const total = orgTasks.length
    const completed = orgTasks.filter(t => t.status.tag === 'Completed').length
    const inProgress = orgTasks.filter(t => t.status.tag === 'InProgress' || t.status.tag === 'Claimed').length
    const needsReview = orgTasks.filter(t => t.status.tag === 'NeedsReview' || t.status.tag === 'SelfChecking').length
    const unclaimed = orgTasks.filter(t => t.status.tag === 'Unclaimed').length
    return { total, completed, inProgress, needsReview, unclaimed }
  }, [orgTasks])

  // ════════════════════════════════════════════════════════════════════════════
  // Support Metrics
  // ════════════════════════════════════════════════════════════════════════════
  const supportMetrics = useMemo(() => {
    const total = orgTickets.length
    const open = orgTickets.filter(
      t => t.status.tag === 'New' || t.status.tag === 'Open' || t.status.tag === 'Pending',
    ).length
    const resolved = orgTickets.filter(t => t.status.tag === 'Resolved').length
    const closed = orgTickets.filter(t => t.status.tag === 'Closed').length
    const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0
    const aiResolved = orgTickets.filter(t => t.aiAutoResolved).length
    return { total, open, resolved, closed, resolutionRate, aiResolved }
  }, [orgTickets])

  // ════════════════════════════════════════════════════════════════════════════
  // Sales Pipeline
  // ════════════════════════════════════════════════════════════════════════════
  const salesPipeline = useMemo(() => {
    const total = orgLeads.length
    const active = orgLeads.filter(
      l => l.status.tag !== 'Converted' && l.status.tag !== 'Lost',
    ).length
    const converted = orgLeads.filter(l => l.status.tag === 'Converted').length
    const lost = orgLeads.filter(l => l.status.tag === 'Lost').length
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, active, converted, lost, conversionRate }
  }, [orgLeads])

  // ════════════════════════════════════════════════════════════════════════════
  // Recruitment Pipeline
  // ════════════════════════════════════════════════════════════════════════════
  const recruitPipeline = useMemo(() => {
    const total = orgCandidates.length
    const inPipeline = orgCandidates.filter(
      c => c.status.tag !== 'Hired' && c.status.tag !== 'Rejected',
    ).length
    const hired = orgCandidates.filter(c => c.status.tag === 'Hired').length
    const rejected = orgCandidates.filter(c => c.status.tag === 'Rejected').length
    const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0
    return { total, inPipeline, hired, rejected, hireRate }
  }, [orgCandidates])

  // ════════════════════════════════════════════════════════════════════════════
  // Department Distribution
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
    return [...map.entries()]
      .sort((a, b) => b[1].total - a[1].total)
  }, [orgEmployees])

  const maxDeptCount = useMemo(
    () => Math.max(1, ...departments.map(([, v]) => v.total)),
    [departments],
  )

  // ════════════════════════════════════════════════════════════════════════════
  // Top Performers (by tasksCompleted)
  // ════════════════════════════════════════════════════════════════════════════
  const topPerformers = useMemo(() => {
    const completedCounts = new Map<string, number>()
    for (const task of orgTasks) {
      if (task.status.tag === 'Completed' && task.assignee) {
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
          isAi: emp?.employeeType?.tag === 'AiAgent',
          tasksCompleted: count,
        }
      })
  }, [orgTasks, employeeMap])

  // ════════════════════════════════════════════════════════════════════════════
  // AI Workforce Overview
  // ════════════════════════════════════════════════════════════════════════════
  const aiMetrics = useMemo(() => {
    const agents = orgEmployees.filter(e => e.employeeType?.tag === 'AiAgent')
    const agentCount = agents.length
    const totalEmp = orgEmployees.length
    const aiRatio = totalEmp > 0 ? Math.round((agentCount / totalEmp) * 100) : 0
    const agentHexes = new Set(agents.map(a => a.id.toHexString()))
    const aiTasks = orgTasks.filter(
      t => t.assignee && agentHexes.has(t.assignee.toHexString()),
    ).length
    return { agentCount, aiRatio, aiTasks }
  }, [orgEmployees, orgTasks])

  // ════════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
          <BarChart3 className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#6366f1', '#8b5cf6', '#a78bfa']}
              animationSpeed={6}
            >
              Analytics
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Executive overview across all modules
          </p>
        </div>
      </div>

      {/* ── Top-level KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Users className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Members</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={totalMembers} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
              <ListChecks className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Tasks</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CountUp to={activeTasks} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <TicketCheck className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Open Tickets</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp to={openTickets} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <FileText className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Documents</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={docCount} duration={1.5} />
          </p>
        </SpotlightCard>
      </div>

      {/* ── Task Pipeline ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-indigo-500" />
            <h2 className="text-sm font-semibold">Task Pipeline</h2>
          </div>
          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 tabular-nums">
            {taskPipeline.total} total
          </Badge>
        </div>
        <div className="space-y-3">
          {([
            { label: 'Completed', count: taskPipeline.completed, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'In Progress', count: taskPipeline.inProgress, color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
            { label: 'Needs Review', count: taskPipeline.needsReview, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
            { label: 'Unclaimed', count: taskPipeline.unclaimed, color: 'bg-neutral-400', textColor: 'text-neutral-500 dark:text-neutral-400' },
          ] as const).map(({ label, count, color, textColor }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-medium w-24 shrink-0 text-muted-foreground">{label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${pct(count, taskPipeline.total)}%` }}
                />
              </div>
              <span className={`text-xs font-bold tabular-nums w-12 text-right ${textColor}`}>
                {count}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                {pct(count, taskPipeline.total)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: Support Metrics + Sales Pipeline ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Metrics */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headset className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Support Metrics</h2>
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
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{supportMetrics.resolved}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Resolution Rate</span>
              <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {supportMetrics.resolutionRate}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${supportMetrics.resolutionRate}%` }}
              />
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

        {/* Sales Pipeline */}
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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Converted</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{salesPipeline.converted}</p>
            </div>
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lost</p>
              <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{salesPipeline.lost}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
              <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {salesPipeline.conversionRate}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700"
                style={{ width: `${salesPipeline.conversionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Recruitment Pipeline ─────────────────────────────────────────── */}
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

        <div className="grid grid-cols-3 gap-3 mb-4">
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
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Hire Rate</span>
            <span className="text-xs font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
              {recruitPipeline.hireRate}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
              style={{ width: `${recruitPipeline.hireRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column: Department Distribution + AI Workforce ───────────── */}
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
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                      style={{ width: `${pct(data.total, maxDeptCount)}%` }}
                    />
                    {data.ai > 0 && (
                      <div
                        className="absolute top-0 h-full rounded-full bg-purple-400/60"
                        style={{
                          left: `${pct(data.total - data.ai, maxDeptCount)}%`,
                          width: `${pct(data.ai, maxDeptCount)}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 w-16 justify-end shrink-0">
                    <span className="text-xs font-bold tabular-nums">{data.total}</span>
                    {data.ai > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                        <Bot className="size-2.5" />
                        {data.ai}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Workforce Overview */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-500" />
              <h2 className="text-sm font-semibold">AI Workforce</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Agents</p>
              <p className="text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                <CountUp to={aiMetrics.agentCount} duration={1.5} />
              </p>
            </div>
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Ratio</p>
              <p className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                <CountUp to={aiMetrics.aiRatio} duration={1.5} />
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </p>
            </div>
            <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Tasks</p>
              <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                <CountUp to={aiMetrics.aiTasks} duration={1.5} />
              </p>
            </div>
          </div>

          {/* AI ratio visual ring */}
          <div className="flex items-center justify-center py-2">
            <div className="relative size-28">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-100 dark:text-neutral-800" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                  stroke="url(#aiGrad)"
                  strokeLinecap="round"
                  strokeDasharray={`${aiMetrics.aiRatio * 2.64} ${264 - aiMetrics.aiRatio * 2.64}`}
                  className="transition-all duration-1000"
                />
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

      {/* ── Top Performers ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Top Performers</h2>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            by tasks completed
          </span>
        </div>

        {topPerformers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Target className="size-8 opacity-30 mb-2" />
            <p className="text-sm">No completed tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPerformers.map((performer, idx) => {
              const maxCompleted = topPerformers[0]?.tasksCompleted ?? 1
              const barWidth = pct(performer.tasksCompleted, maxCompleted)
              return (
                <div key={performer.hex} className="flex items-center gap-3 group">
                  {/* Rank */}
                  <span className={`text-xs font-bold tabular-nums w-5 text-center shrink-0 ${
                    idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-neutral-400' : idx === 2 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <div className={`flex items-center justify-center size-7 rounded-full text-white text-[10px] font-bold shrink-0 ${avatarColor(performer.name)}`}>
                    {performer.isAi ? <Bot className="size-3.5" /> : getInitials(performer.name)}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{performer.name}</span>
                      {performer.isAi && (
                        <Badge className="text-[9px] py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/10">
                          AI
                        </Badge>
                      )}
                    </div>
                    {performer.role && (
                      <p className="text-[10px] text-muted-foreground truncate">{performer.role}</p>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                          : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* Count */}
                  <span className="text-sm font-bold tabular-nums text-right w-8 shrink-0">
                    {performer.tasksCompleted}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
