'use client'

import { useMemo } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  KanbanSquare,
  Headphones,
  DollarSign,
  Briefcase,
  Bot,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { CountUp } from '@/components/reactbits/CountUp'
import { useOrg } from '@/components/org-context'

export default function AnalyticsPage() {
  const { identity } = useSpacetimeDB()
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allMemberships] = useTable(tables.org_membership)
  const { currentOrg } = useOrg()

  // Org-scoped employee list
  const orgEmployees = useMemo(() => {
    if (!currentOrg) return allEmployees
    const orgId = Number(currentOrg.id)
    const memberIds = new Set(
      allMemberships
        .filter((m) => Number(m.orgId) === orgId && m.status.tag === 'Active')
        .map((m) => m.userId.toHexString())
    )
    return allEmployees.filter((e) => memberIds.has(e.id.toHexString()))
  }, [allEmployees, allMemberships, currentOrg])

  // ── Workforce Stats ──────────────────────────
  const workforceStats = useMemo(() => {
    const total = orgEmployees.length
    const humans = orgEmployees.filter((e) => e.employeeType.tag === 'Human').length
    const ai = orgEmployees.filter((e) => e.employeeType.tag === 'AIAgent').length
    const online = orgEmployees.filter((e) => e.status.tag !== 'Offline').length
    const aiRatio = total > 0 ? Math.round((ai / total) * 100) : 0
    return { total, humans, ai, online, aiRatio }
  }, [orgEmployees])

  // ── Department Distribution ──────────────────
  const deptDistribution = useMemo(() => {
    const deptMap = new Map<string, { total: number; ai: number }>()
    orgEmployees.forEach((e) => {
      const dept = e.department.tag
      const existing = deptMap.get(dept) || { total: 0, ai: 0 }
      existing.total++
      if (e.employeeType.tag === 'AIAgent') existing.ai++
      deptMap.set(dept, existing)
    })
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [orgEmployees])

  // ── Task Analytics ───────────────────────────
  const taskStats = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.status.tag === 'Complete').length
    const inProgress = allTasks.filter((t) => t.status.tag === 'InProgress' || t.status.tag === 'Claimed').length
    const unclaimed = allTasks.filter((t) => t.status.tag === 'Unclaimed').length
    const needsReview = allTasks.filter((t) => t.status.tag === 'NeedsReview').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, unclaimed, needsReview, completionRate }
  }, [allTasks])

  // ── Support Analytics ────────────────────────
  const supportStats = useMemo(() => {
    const total = allTickets.length
    const open = allTickets.filter((t) => t.status.tag === 'Open' || t.status.tag === 'InProgress').length
    const resolved = allTickets.filter((t) => t.status.tag === 'Resolved' || t.status.tag === 'Closed').length
    const critical = allTickets.filter((t) => t.priority.tag === 'Critical').length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    return { total, open, resolved, critical, resolutionRate }
  }, [allTickets])

  // ── Sales Analytics ──────────────────────────
  const salesStats = useMemo(() => {
    const total = allLeads.length
    const active = allLeads.filter((l) => l.status.tag !== 'Converted' && l.status.tag !== 'Lost').length
    const converted = allLeads.filter((l) => l.status.tag === 'Converted').length
    const lost = allLeads.filter((l) => l.status.tag === 'Lost').length
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
    return { total, active, converted, lost, conversionRate }
  }, [allLeads])

  // ── Recruitment Analytics ────────────────────
  const recruitStats = useMemo(() => {
    const total = allCandidates.length
    const active = allCandidates.filter((c) => c.status.tag !== 'Hired' && c.status.tag !== 'Rejected').length
    const hired = allCandidates.filter((c) => c.status.tag === 'Hired').length
    const rejected = allCandidates.filter((c) => c.status.tag === 'Rejected').length
    const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0
    return { total, active, hired, rejected, hireRate }
  }, [allCandidates])

  // ── Top Performers ───────────────────────────
  const topPerformers = useMemo(() => {
    return [...orgEmployees]
      .sort((a, b) => Number(b.tasksCompleted) - Number(a.tasksCompleted))
      .slice(0, 8)
  }, [orgEmployees])

  // Department colors
  const DEPT_COLORS: Record<string, string> = {
    Support: '#3b82f6',
    Sales: '#10b981',
    Recruitment: '#a855f7',
    Engineering: '#f97316',
    Operations: '#f59e0b',
    Marketing: '#ec4899',
    Finance: '#06b6d4',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 text-white shadow-lg shadow-indigo-500/25">
          <BarChart3 className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#6366f1', '#8b5cf6', '#a78bfa']} animationSpeed={6}>
              Analytics
            </GradientText>
          </h1>
          <p className="text-muted-foreground text-sm">
            Cross-platform insights across your entire organization
          </p>
        </div>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team Size', value: workforceStats.total, color: '#6366f1', icon: Users },
          { label: 'Tasks Completed', value: taskStats.completed, color: '#22c55e', icon: KanbanSquare },
          { label: 'Support Tickets', value: supportStats.total, color: '#3b82f6', icon: Headphones },
          { label: 'Active Leads', value: salesStats.active, color: '#10b981', icon: DollarSign },
        ].map((kpi) => (
          <SpotlightCard key={kpi.label} spotlightColor={kpi.color} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">
                  <CountUp to={kpi.value} />
                </p>
              </div>
              <div className="rounded-lg p-2 bg-muted/50">
                <kpi.icon className="size-5 text-muted-foreground" />
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KanbanSquare className="size-4" />
                Task Pipeline
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {taskStats.completionRate}% completion
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Completed', value: taskStats.completed, total: taskStats.total, color: 'bg-green-500' },
              { label: 'In Progress', value: taskStats.inProgress, total: taskStats.total, color: 'bg-blue-500' },
              { label: 'Needs Review', value: taskStats.needsReview, total: taskStats.total, color: 'bg-amber-500' },
              { label: 'Unclaimed', value: taskStats.unclaimed, total: taskStats.total, color: 'bg-neutral-400' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium tabular-nums">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Support Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Headphones className="size-4" />
                Support Metrics
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {supportStats.resolutionRate}% resolved
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Open', value: supportStats.open, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Resolved', value: supportStats.resolved, color: 'text-green-600 dark:text-green-400' },
                { label: 'Critical', value: supportStats.critical, color: 'text-red-600 dark:text-red-400' },
                { label: 'Total', value: supportStats.total, color: 'text-foreground' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Resolution Rate</span>
                <span className="font-medium">{supportStats.resolutionRate}%</span>
              </div>
              <Progress value={supportStats.resolutionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4" />
                Sales Pipeline
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {salesStats.conversionRate}% conversion
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active Leads', value: salesStats.active, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Converted', value: salesStats.converted, color: 'text-green-600 dark:text-green-400' },
                { label: 'Lost', value: salesStats.lost, color: 'text-red-600 dark:text-red-400' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Conversion Rate</span>
                <span className="font-medium">{salesStats.conversionRate}%</span>
              </div>
              <Progress value={salesStats.conversionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recruitment Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="size-4" />
                Recruitment Pipeline
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {recruitStats.hireRate}% hire rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'In Pipeline', value: recruitStats.active, color: 'text-purple-600 dark:text-purple-400' },
                { label: 'Hired', value: recruitStats.hired, color: 'text-green-600 dark:text-green-400' },
                { label: 'Rejected', value: recruitStats.rejected, color: 'text-red-600 dark:text-red-400' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Hire Rate</span>
                <span className="font-medium">{recruitStats.hireRate}%</span>
              </div>
              <Progress value={recruitStats.hireRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Department Breakdown + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" />
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deptDistribution.map((dept) => {
                const color = DEPT_COLORS[dept.name] || '#6b7280'
                const percent = workforceStats.total > 0 ? Math.round((dept.total / workforceStats.total) * 100) : 0
                return (
                  <div key={dept.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm">{dept.name}</span>
                        {dept.ai > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            <Bot className="size-2 mr-0.5" />
                            {dept.ai} AI
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {dept.total} <span className="text-muted-foreground text-xs">({percent}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
              {deptDistribution.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No department data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPerformers.map((person, i) => (
                <div
                  key={person.id.toHexString()}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  <span className={`text-xs font-bold tabular-nums w-5 ${
                    i === 0 ? 'text-amber-500' : i === 1 ? 'text-neutral-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {person.department.tag} · {person.role || 'Team Member'}
                    </p>
                  </div>
                  {person.employeeType.tag === 'AIAgent' && (
                    <Bot className="size-3.5 text-purple-500 shrink-0" />
                  )}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{Number(person.tasksCompleted)}</p>
                    <p className="text-[10px] text-muted-foreground">tasks</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No performance data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Workforce Overview */}
      {workforceStats.ai > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="size-4" />
              AI Workforce Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{workforceStats.ai}</p>
                <p className="text-xs text-muted-foreground mt-1">AI Agents</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{workforceStats.aiRatio}%</p>
                <p className="text-xs text-muted-foreground mt-1">AI Workforce Ratio</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {orgEmployees
                    .filter((e) => e.employeeType.tag === 'AIAgent')
                    .reduce((sum, e) => sum + Number(e.tasksCompleted), 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">AI Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
