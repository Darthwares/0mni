'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BarChart3,
  TrendingUp,
  Users,
  Ticket,
  Bot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  UserCheck,
  Code2,
  FileText,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- helpers ----------------------------------------------------------------

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1)
  const diff = d.getTime() - start.getTime()
  return Math.ceil((diff / 86_400_000 + start.getDay() + 1) / 7)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDate(ts: any): Date {
  try { return ts.toDate() } catch { return new Date() }
}

type TimeRange = '7d' | '30d' | '90d'

// ---- mini bar chart component -----------------------------------------------

function MiniBarChart({ data, color, maxHeight = 48 }: { data: number[]; color: string; maxHeight?: number }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[2px]" style={{ height: maxHeight }}>
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} transition-all`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, minWidth: 3 }}
        />
      ))}
    </div>
  )
}

// ---- trend indicator --------------------------------------------------------

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>
  const pctChange = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100)
  const isUp = pctChange > 0
  const isNeutral = pctChange === 0

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isNeutral
          ? 'text-muted-foreground'
          : isUp
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isNeutral ? <Minus className="size-3" /> : isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(pctChange)}%
    </span>
  )
}

// =============================================================================

export default function AnalyticsPage() {
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allDeals] = useTable(tables.deal)
  const [allCandidates] = useTable(tables.candidate)
  const [allTasks] = useTable(tables.task)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allDocuments] = useTable(tables.document)
  const [allMeetings] = useTable(tables.meeting)
  const [allPRs] = useTable(tables.pull_request)
  const [allBugs] = useTable(tables.bug)

  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
  const rangeStart = daysAgo(rangeDays)
  const prevStart = daysAgo(rangeDays * 2)

  // ---- Per-module analytics -------------------------------------------------

  // Support
  const supportMetrics = useMemo(() => {
    const current = allTickets.filter((t) => toDate(t.createdAt) >= rangeStart)
    const previous = allTickets.filter((t) => { const d = toDate(t.createdAt); return d >= prevStart && d < rangeStart })
    const resolved = current.filter((t) => t.status.tag === 'Resolved' || t.status.tag === 'Closed')
    const aiResolved = current.filter((t) => t.aiAutoResolved)

    // Daily buckets
    const daily = Array.from({ length: Math.min(rangeDays, 30) }, (_, i) => {
      const day = daysAgo(rangeDays - 1 - i)
      const next = daysAgo(rangeDays - 2 - i)
      return current.filter((t) => { const d = toDate(t.createdAt); return d >= day && d < next }).length
    })

    return {
      total: current.length,
      prevTotal: previous.length,
      resolved: resolved.length,
      aiResolved: aiResolved.length,
      aiRate: current.length > 0 ? Math.round((aiResolved.length / current.length) * 100) : 0,
      daily,
    }
  }, [allTickets, rangeStart, prevStart, rangeDays])

  // Sales
  const salesMetrics = useMemo(() => {
    const current = allLeads.filter((l) => toDate(l.createdAt) >= rangeStart)
    const previous = allLeads.filter((l) => { const d = toDate(l.createdAt); return d >= prevStart && d < rangeStart })
    const converted = current.filter((l) => l.status.tag === 'Converted')
    const currentDeals = allDeals.filter((d) => toDate(d.createdAt) >= rangeStart)
    const wonDeals = currentDeals.filter((d) => d.stage.tag === 'ClosedWon')
    const revenue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0)

    const daily = Array.from({ length: Math.min(rangeDays, 30) }, (_, i) => {
      const day = daysAgo(rangeDays - 1 - i)
      const next = daysAgo(rangeDays - 2 - i)
      return current.filter((l) => { const d = toDate(l.createdAt); return d >= day && d < next }).length
    })

    return {
      leads: current.length,
      prevLeads: previous.length,
      converted: converted.length,
      deals: currentDeals.length,
      wonDeals: wonDeals.length,
      revenue,
      daily,
    }
  }, [allLeads, allDeals, rangeStart, prevStart, rangeDays])

  // Recruitment
  const recruitMetrics = useMemo(() => {
    const current = allCandidates.filter((c) => toDate(c.createdAt) >= rangeStart)
    const previous = allCandidates.filter((c) => { const d = toDate(c.createdAt); return d >= prevStart && d < rangeStart })
    const hired = current.filter((c) => c.status.tag === 'Hired')

    const daily = Array.from({ length: Math.min(rangeDays, 30) }, (_, i) => {
      const day = daysAgo(rangeDays - 1 - i)
      const next = daysAgo(rangeDays - 2 - i)
      return current.filter((c) => { const d = toDate(c.createdAt); return d >= day && d < next }).length
    })

    return {
      candidates: current.length,
      prevCandidates: previous.length,
      hired: hired.length,
      daily,
    }
  }, [allCandidates, rangeStart, prevStart, rangeDays])

  // Engineering
  const engMetrics = useMemo(() => {
    const currentPRs = allPRs.filter((p) => toDate(p.createdAt) >= rangeStart)
    const prevPRs = allPRs.filter((p) => { const d = toDate(p.createdAt); return d >= prevStart && d < rangeStart })
    const mergedPRs = currentPRs.filter((p) => p.status.tag === 'Merged')
    const currentBugs = allBugs.filter((b) => toDate(b.createdAt) >= rangeStart)
    const fixedBugs = currentBugs.filter((b) => b.status.tag === 'Fixed')

    const daily = Array.from({ length: Math.min(rangeDays, 30) }, (_, i) => {
      const day = daysAgo(rangeDays - 1 - i)
      const next = daysAgo(rangeDays - 2 - i)
      return currentPRs.filter((p) => { const d = toDate(p.createdAt); return d >= day && d < next }).length
    })

    return {
      prs: currentPRs.length,
      prevPRs: prevPRs.length,
      merged: mergedPRs.length,
      bugs: currentBugs.length,
      fixed: fixedBugs.length,
      daily,
    }
  }, [allPRs, allBugs, rangeStart, prevStart, rangeDays])

  // Collaboration
  const collabMetrics = useMemo(() => {
    const currentDocs = allDocuments.filter((d) => toDate(d.createdAt) >= rangeStart)
    const prevDocs = allDocuments.filter((d) => { const dd = toDate(d.createdAt); return dd >= prevStart && dd < rangeStart })
    const currentMsgs = allMessages.filter((m) => toDate(m.sentAt) >= rangeStart)
    const prevMsgs = allMessages.filter((m) => { const d = toDate(m.sentAt); return d >= prevStart && d < rangeStart })
    const currentMeetings = allMeetings.filter((m) => toDate(m.scheduledAt) >= rangeStart)

    return {
      docs: currentDocs.length,
      prevDocs: prevDocs.length,
      messages: currentMsgs.length,
      prevMessages: prevMsgs.length,
      meetings: currentMeetings.length,
    }
  }, [allDocuments, allMessages, allMeetings, rangeStart, prevStart])

  // Team
  const teamMetrics = useMemo(() => {
    const humans = allEmployees.filter((e) => e.employeeType.tag === 'Human')
    const aiAgents = allEmployees.filter((e) => e.employeeType.tag === 'AiAgent')
    const online = allEmployees.filter((e) => e.status.tag === 'Online')
    const aiTasks = allTasks.filter((t) => {
      const assignee = allEmployees.find((e) => e.id.toHexString() === t.assignee?.toHexString())
      return assignee?.employeeType.tag === 'AiAgent'
    })
    const completedAiTasks = aiTasks.filter((t) => t.status.tag === 'Complete')

    return {
      totalHumans: humans.length,
      totalAI: aiAgents.length,
      online: online.length,
      aiTasks: aiTasks.length,
      aiCompleted: completedAiTasks.length,
    }
  }, [allEmployees, allTasks])

  // ---- Module sections ------------------------------------------------------

  const modules = [
    {
      title: 'Support',
      icon: Ticket,
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/20',
      spotlight: 'rgba(139, 92, 246, 0.12)',
      stats: [
        { label: 'Tickets Created', value: supportMetrics.total, prev: supportMetrics.prevTotal },
        { label: 'Resolved', value: supportMetrics.resolved },
        { label: 'AI Resolved', value: supportMetrics.aiResolved },
        { label: 'AI Resolution Rate', value: supportMetrics.aiRate, suffix: '%' },
      ],
      chart: supportMetrics.daily,
      chartColor: 'bg-violet-500',
    },
    {
      title: 'Sales',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      spotlight: 'rgba(16, 185, 129, 0.12)',
      stats: [
        { label: 'New Leads', value: salesMetrics.leads, prev: salesMetrics.prevLeads },
        { label: 'Converted', value: salesMetrics.converted },
        { label: 'Deals Won', value: salesMetrics.wonDeals },
        { label: 'Revenue', value: salesMetrics.revenue, prefix: '$' },
      ],
      chart: salesMetrics.daily,
      chartColor: 'bg-emerald-500',
    },
    {
      title: 'Recruitment',
      icon: UserCheck,
      gradient: 'from-pink-500 to-rose-600',
      shadow: 'shadow-pink-500/20',
      spotlight: 'rgba(236, 72, 153, 0.12)',
      stats: [
        { label: 'Candidates', value: recruitMetrics.candidates, prev: recruitMetrics.prevCandidates },
        { label: 'Hired', value: recruitMetrics.hired },
      ],
      chart: recruitMetrics.daily,
      chartColor: 'bg-pink-500',
    },
    {
      title: 'Engineering',
      icon: Code2,
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-orange-500/20',
      spotlight: 'rgba(249, 115, 22, 0.12)',
      stats: [
        { label: 'Pull Requests', value: engMetrics.prs, prev: engMetrics.prevPRs },
        { label: 'Merged', value: engMetrics.merged },
        { label: 'Bugs Filed', value: engMetrics.bugs },
        { label: 'Bugs Fixed', value: engMetrics.fixed },
      ],
      chart: engMetrics.daily,
      chartColor: 'bg-orange-500',
    },
  ]

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <BarChart3 className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#06b6d4', '#3b82f6', '#2563eb', '#06b6d4']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                Analytics
              </GradientText>
              <p className="text-xs text-muted-foreground">Cross-module performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeRange === r
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Top-level KPIs */}
        <div className="grid grid-cols-5 gap-3">
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Team</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={teamMetrics.totalHumans + teamMetrics.totalAI} />
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {teamMetrics.totalHumans} humans · {teamMetrics.totalAI} AI
                </p>
              </div>
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Online</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={teamMetrics.online} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Messages</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={collabMetrics.messages} />
                </p>
                <TrendBadge current={collabMetrics.messages} previous={collabMetrics.prevMessages} />
              </div>
              <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="size-4 text-amber-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={collabMetrics.docs} />
                </p>
                <TrendBadge current={collabMetrics.docs} previous={collabMetrics.prevDocs} />
              </div>
              <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FileText className="size-4 text-violet-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(236, 72, 153, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">AI Tasks</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={teamMetrics.aiCompleted} />
                  <span className="text-xs font-normal text-muted-foreground">/{teamMetrics.aiTasks}</span>
                </p>
              </div>
              <div className="size-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Bot className="size-4 text-pink-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Module sections */}
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-2 gap-4">
          {modules.map((mod) => {
            const ModIcon = mod.icon
            return (
              <SpotlightCard
                key={mod.title}
                spotlightColor={mod.spotlight}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Module header */}
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`size-7 rounded-lg bg-gradient-to-br ${mod.gradient} ${mod.shadow} shadow-lg flex items-center justify-center`}>
                      <ModIcon className="size-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold">{mod.title}</h3>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {mod.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold tabular-nums">
                            {stat.prefix ?? ''}<CountUp to={stat.value} />{stat.suffix ?? ''}
                          </span>
                          {stat.prev !== undefined && <TrendBadge current={stat.value} previous={stat.prev} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini chart */}
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Daily Activity</p>
                  <MiniBarChart data={mod.chart} color={mod.chartColor} />
                </div>
              </SpotlightCard>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
