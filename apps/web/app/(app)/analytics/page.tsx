'use client'

import { useMemo } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  Headphones,
  TrendingUp,
  Users,
  KanbanSquare,
  FileText,
  Bot,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Target,
  GitPullRequest,
  Bug,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- color palette for charts ------------------------------------------------

const CHART_COLORS = {
  violet: 'hsl(263, 70%, 58%)',
  blue: 'hsl(217, 91%, 60%)',
  emerald: 'hsl(160, 84%, 39%)',
  amber: 'hsl(38, 92%, 50%)',
  rose: 'hsl(350, 89%, 60%)',
  cyan: 'hsl(189, 94%, 43%)',
  orange: 'hsl(25, 95%, 53%)',
  fuchsia: 'hsl(292, 84%, 61%)',
  neutral: 'hsl(0, 0%, 60%)',
}

// ---- helpers ----------------------------------------------------------------

function trendIndicator(current: number, previous: number) {
  if (previous === 0) return { icon: Minus, color: 'text-neutral-400', label: '—' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { icon: ArrowUpRight, color: 'text-emerald-500', label: `+${pct}%` }
  if (pct < 0) return { icon: ArrowDownRight, color: 'text-red-500', label: `${pct}%` }
  return { icon: Minus, color: 'text-neutral-400', label: '0%' }
}

function daysAgo(days: number): number {
  return Date.now() - days * 86_400_000
}

// =============================================================================

export default function AnalyticsPage() {
  const [allTickets] = useTable(tables.ticket)
  const [allCustomers] = useTable(tables.customer)
  const [allTasks] = useTable(tables.task)
  const [allDeals] = useTable(tables.deal)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allDocuments] = useTable(tables.document)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allBugs] = useTable(tables.bug)
  const [allPRs] = useTable(tables.pull_request)
  const [allActivity] = useTable(tables.activity_log)

  // ---- Support Analytics ----
  const supportStats = useMemo(() => {
    const now = Date.now()
    const thisWeek = allTickets.filter((t) => t.createdAt.toMillis() > daysAgo(7))
    const lastWeek = allTickets.filter(
      (t) => t.createdAt.toMillis() > daysAgo(14) && t.createdAt.toMillis() <= daysAgo(7)
    )
    const open = allTickets.filter((t) => t.status.tag === 'Open' || t.status.tag === 'New').length
    const resolved = allTickets.filter((t) => t.status.tag === 'Resolved' || t.status.tag === 'Closed').length
    const aiResolved = allTickets.filter((t) => t.aiAutoResolved).length
    const aiRate = allTickets.length > 0 ? Math.round((aiResolved / allTickets.length) * 100) : 0

    const byStatus: Record<string, number> = {}
    for (const t of allTickets) {
      byStatus[t.status.tag] = (byStatus[t.status.tag] || 0) + 1
    }

    const sentimentBreakdown: Record<string, number> = {}
    for (const c of allCustomers) {
      if (c.sentiment) {
        sentimentBreakdown[c.sentiment.tag] = (sentimentBreakdown[c.sentiment.tag] || 0) + 1
      }
    }

    return {
      total: allTickets.length,
      open,
      resolved,
      aiResolved,
      aiRate,
      thisWeekCount: thisWeek.length,
      lastWeekCount: lastWeek.length,
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      sentimentBreakdown: Object.entries(sentimentBreakdown).map(([name, value]) => ({ name, value })),
    }
  }, [allTickets, allCustomers])

  // ---- Sales Analytics ----
  const salesStats = useMemo(() => {
    const totalPipeline = allDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
    const wonDeals = allDeals.filter((d) => d.stage.tag === 'ClosedWon')
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
    const lostDeals = allDeals.filter((d) => d.stage.tag === 'ClosedLost')
    const winRate = wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0

    const bySource: Record<string, number> = {}
    for (const l of allLeads) {
      const src = l.source?.tag ?? 'Unknown'
      bySource[src] = (bySource[src] || 0) + 1
    }

    const byStage: Record<string, number> = {}
    for (const d of allDeals) {
      byStage[d.stage.tag] = (byStage[d.stage.tag] || 0) + 1
    }

    return {
      totalLeads: allLeads.length,
      totalDeals: allDeals.length,
      totalPipeline,
      wonValue,
      winRate,
      bySource: Object.entries(bySource).map(([name, value]) => ({ name, value })),
      byStage: Object.entries(byStage).map(([name, value]) => ({ name, value })),
    }
  }, [allDeals, allLeads])

  // ---- Task/Engineering Analytics ----
  const taskStats = useMemo(() => {
    const completed = allTasks.filter((t) => t.status.tag === 'Done' || t.status.tag === 'Closed').length
    const inProgress = allTasks.filter((t) => t.status.tag === 'InProgress').length
    const backlog = allTasks.filter((t) => t.status.tag === 'Backlog' || t.status.tag === 'Todo').length

    const byPriority: Record<string, number> = {}
    for (const t of allTasks) {
      byPriority[t.priority.tag] = (byPriority[t.priority.tag] || 0) + 1
    }

    const openBugs = allBugs.filter((b) => b.status.tag !== 'Closed' && b.status.tag !== 'Fixed').length
    const mergedPRs = allPRs.filter((p) => p.status.tag === 'Merged').length
    const openPRs = allPRs.filter((p) => p.status.tag === 'Open').length

    return {
      total: allTasks.length,
      completed,
      inProgress,
      backlog,
      openBugs,
      totalBugs: allBugs.length,
      mergedPRs,
      openPRs,
      totalPRs: allPRs.length,
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
    }
  }, [allTasks, allBugs, allPRs])

  // ---- Recruitment Analytics ----
  const recruitStats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const c of allCandidates) {
      byStatus[c.status.tag] = (byStatus[c.status.tag] || 0) + 1
    }
    const hired = allCandidates.filter((c) => c.status.tag === 'Hired').length
    const rejected = allCandidates.filter((c) => c.status.tag === 'Rejected').length
    const hireRate = hired + rejected > 0 ? Math.round((hired / (hired + rejected)) * 100) : 0

    return {
      total: allCandidates.length,
      hired,
      hireRate,
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    }
  }, [allCandidates])

  // ---- Activity over time (last 7 days) ----
  const activityOverTime = useMemo(() => {
    const days: { day: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = daysAgo(i + 1)
      const dayEnd = daysAgo(i)
      const count = allActivity.filter(
        (a) => a.timestamp.toMillis() > dayStart && a.timestamp.toMillis() <= dayEnd
      ).length
      const label = new Date(dayEnd).toLocaleDateString([], { weekday: 'short' })
      days.push({ day: label, count })
    }
    return days
  }, [allActivity])

  // ---- Platform overview ----
  const totalMessages = allMessages.length
  const totalDocs = allDocuments.length
  const totalEmployees = allEmployees.length

  // Ticket trend
  const ticketTrend = trendIndicator(supportStats.thisWeekCount, supportStats.lastWeekCount)
  const TicketTrendIcon = ticketTrend.icon

  // ---- Chart configs ----
  const ticketStatusConfig: ChartConfig = {
    New: { label: 'New', color: CHART_COLORS.blue },
    Open: { label: 'Open', color: CHART_COLORS.emerald },
    Pending: { label: 'Pending', color: CHART_COLORS.amber },
    Resolved: { label: 'Resolved', color: CHART_COLORS.neutral },
    Closed: { label: 'Closed', color: CHART_COLORS.neutral },
  }

  const sentimentConfig: ChartConfig = {
    Happy: { label: 'Happy', color: CHART_COLORS.emerald },
    Neutral: { label: 'Neutral', color: CHART_COLORS.neutral },
    Frustrated: { label: 'Frustrated', color: CHART_COLORS.amber },
    Angry: { label: 'Angry', color: CHART_COLORS.rose },
  }

  const leadSourceConfig: ChartConfig = {
    count: { label: 'Leads', color: CHART_COLORS.violet },
  }

  const taskPriorityConfig: ChartConfig = {
    Critical: { label: 'Critical', color: CHART_COLORS.rose },
    High: { label: 'High', color: CHART_COLORS.orange },
    Medium: { label: 'Medium', color: CHART_COLORS.amber },
    Low: { label: 'Low', color: CHART_COLORS.neutral },
  }

  const activityConfig: ChartConfig = {
    count: { label: 'Events', color: CHART_COLORS.violet },
  }

  const candidateConfig: ChartConfig = {
    count: { label: 'Candidates', color: CHART_COLORS.fuchsia },
  }

  const PIE_COLORS = [
    CHART_COLORS.violet,
    CHART_COLORS.blue,
    CHART_COLORS.emerald,
    CHART_COLORS.amber,
    CHART_COLORS.rose,
    CHART_COLORS.cyan,
    CHART_COLORS.orange,
    CHART_COLORS.fuchsia,
  ]

  const statusBarColors: Record<string, string> = {
    New: CHART_COLORS.blue,
    Open: CHART_COLORS.emerald,
    Pending: CHART_COLORS.amber,
    Resolved: CHART_COLORS.neutral,
    Closed: CHART_COLORS.neutral,
  }

  const priorityBarColors: Record<string, string> = {
    Critical: CHART_COLORS.rose,
    High: CHART_COLORS.orange,
    Medium: CHART_COLORS.amber,
    Low: CHART_COLORS.neutral,
  }

  return (
    <div className="p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#6366f1', '#a855f7', '#ec4899']} animationSpeed={6}>
              Analytics
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cross-module intelligence across your entire organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] gap-1 border-violet-500/20 text-violet-600 dark:text-violet-400">
            <Activity className="h-3 w-3" />
            Real-time
          </Badge>
        </div>
      </div>

      {/* ---- Platform KPIs ---- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'TICKETS',
            value: supportStats.total,
            icon: Headphones,
            gradient: 'from-blue-500 to-cyan-500',
            spotlight: 'rgba(59,130,246,0.15)',
            sub: `${supportStats.open} open`,
          },
          {
            label: 'TASKS',
            value: taskStats.total,
            icon: KanbanSquare,
            gradient: 'from-violet-500 to-purple-500',
            spotlight: 'rgba(139,92,246,0.15)',
            sub: `${taskStats.inProgress} in progress`,
          },
          {
            label: 'DEALS',
            value: salesStats.totalDeals,
            icon: TrendingUp,
            gradient: 'from-emerald-500 to-green-500',
            spotlight: 'rgba(16,185,129,0.15)',
            sub: `$${Math.round(salesStats.totalPipeline / 1000)}k pipeline`,
          },
          {
            label: 'CANDIDATES',
            value: recruitStats.total,
            icon: Users,
            gradient: 'from-fuchsia-500 to-pink-500',
            spotlight: 'rgba(217,70,239,0.15)',
            sub: `${recruitStats.hired} hired`,
          },
          {
            label: 'DOCUMENTS',
            value: totalDocs,
            icon: FileText,
            gradient: 'from-amber-500 to-orange-500',
            spotlight: 'rgba(245,158,11,0.15)',
            sub: `${totalMessages} messages`,
          },
          {
            label: 'AI RESOLVED',
            value: supportStats.aiRate,
            icon: Bot,
            gradient: 'from-violet-500 to-fuchsia-500',
            spotlight: 'rgba(168,85,247,0.15)',
            sub: `${supportStats.aiResolved} tickets`,
            suffix: '%',
          },
        ].map((kpi) => (
          <SpotlightCard
            key={kpi.label}
            className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
            spotlightColor={kpi.spotlight}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center`}>
                <kpi.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              <CountUp to={kpi.value} duration={1.5} />
              {kpi.suffix && <span className="text-lg ml-0.5">{kpi.suffix}</span>}
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{kpi.sub}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* ---- Row 1: Support + Sales ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Support: Tickets by Status */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">Tickets by Status</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <TicketTrendIcon className={`h-3.5 w-3.5 ${ticketTrend.color}`} />
                <span className={`text-xs font-medium ${ticketTrend.color}`}>{ticketTrend.label}</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">vs last week</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {supportStats.byStatus.length > 0 ? (
              <ChartContainer config={ticketStatusConfig} className="h-[200px] w-full">
                <BarChart data={supportStats.byStatus} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {supportStats.byStatus.map((entry) => (
                      <Cell key={entry.name} fill={statusBarColors[entry.name] ?? CHART_COLORS.neutral} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No ticket data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales: Lead Sources */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <PieChartIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {salesStats.winRate}% win rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {salesStats.bySource.length > 0 ? (
              <div className="flex items-center gap-6">
                <ChartContainer config={leadSourceConfig} className="h-[200px] w-[200px] flex-shrink-0">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={salesStats.bySource}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {salesStats.bySource.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex-1 space-y-2">
                  {salesStats.bySource.map((src, i) => (
                    <div key={src.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{src.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {src.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No lead data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Row 2: Activity + Engineering ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity over time */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Activity className="h-3.5 w-3.5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">Activity (7 days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activityOverTime.some((d) => d.count > 0) ? (
              <ChartContainer config={activityConfig} className="h-[200px] w-full">
                <AreaChart data={activityOverTime} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.violet} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.violet}
                    strokeWidth={2}
                    fill="url(#activityGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engineering: Tasks + Bugs + PRs */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">Engineering Health</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  <CountUp to={taskStats.completed} duration={1} />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">Tasks Done</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  <CountUp to={taskStats.openBugs} duration={1} />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">Open Bugs</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  <CountUp to={taskStats.mergedPRs} duration={1} />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">Merged PRs</p>
              </div>
            </div>

            {taskStats.byPriority.length > 0 ? (
              <ChartContainer config={taskPriorityConfig} className="h-[120px] w-full">
                <BarChart data={taskStats.byPriority} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {taskStats.byPriority.map((entry) => (
                      <Cell key={entry.name} fill={priorityBarColors[entry.name] ?? CHART_COLORS.neutral} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No task data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Row 3: Recruitment + Customer Sentiment + Deal Pipeline ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recruitment Funnel */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">Hiring Pipeline</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400">
                {recruitStats.hireRate}% hire rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recruitStats.byStatus.length > 0 ? (
              <ChartContainer config={candidateConfig} className="h-[180px] w-full">
                <BarChart data={recruitStats.byStatus} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                    {recruitStats.byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No candidate data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Sentiment */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">Customer Sentiment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {supportStats.sentimentBreakdown.length > 0 ? (
              <ChartContainer config={sentimentConfig} className="h-[180px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={supportStats.sentimentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {supportStats.sentimentBreakdown.map((entry) => {
                      const colorMap: Record<string, string> = {
                        Happy: CHART_COLORS.emerald,
                        Neutral: CHART_COLORS.neutral,
                        Frustrated: CHART_COLORS.amber,
                        Angry: CHART_COLORS.rose,
                      }
                      return <Cell key={entry.name} fill={colorMap[entry.name] ?? CHART_COLORS.neutral} />
                    })}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No sentiment data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Pipeline */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <CardTitle className="text-sm font-semibold">Deal Stages</CardTitle>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${Math.round(salesStats.wonValue / 1000)}k won
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {salesStats.byStage.length > 0 ? (
              <ChartContainer config={leadSourceConfig} className="h-[180px] w-full">
                <BarChart data={salesStats.byStage} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {salesStats.byStage.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                No deal data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Bottom stats row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: MessageSquare,
            label: 'Total Messages',
            value: totalMessages,
            color: 'from-sky-500 to-blue-500',
          },
          {
            icon: Bug,
            label: 'Open Bugs',
            value: taskStats.openBugs,
            color: 'from-red-500 to-rose-500',
          },
          {
            icon: GitPullRequest,
            label: 'Open PRs',
            value: taskStats.openPRs,
            color: 'from-green-500 to-emerald-500',
          },
          {
            icon: Users,
            label: 'Team Members',
            value: totalEmployees,
            color: 'from-indigo-500 to-violet-500',
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  <CountUp to={stat.value} duration={1.2} />
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
