'use client'

import { useTable } from 'spacetimedb/react'
import { useMemo } from 'react'
import Link from 'next/link'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Ticket,
  Users,
  UserCheck,
  CheckSquare,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  CircleDot,
  Activity,
  DollarSign,
  Zap,
  Plus,
  UserPlus,
  Briefcase,
  HeadphonesIcon,
} from 'lucide-react'

export default function DashboardPage() {
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allTasks] = useTable(tables.task)
  const [allEmployees] = useTable(tables.employee)
  const [allActivityLogs] = useTable(tables.activity_log)

  // KPI Computations
  const openTickets = useMemo(
    () => allTickets.filter(t => t.status.tag === 'Open' || t.status.tag === 'New' || t.status.tag === 'Pending').length,
    [allTickets]
  )

  const activeLeads = useMemo(
    () => allLeads.filter(l => l.status.tag !== 'Converted' && l.status.tag !== 'Lost' && l.status.tag !== 'Unqualified').length,
    [allLeads]
  )

  const activeCandidates = useMemo(
    () => allCandidates.filter(c => c.status.tag !== 'Hired' && c.status.tag !== 'Rejected').length,
    [allCandidates]
  )

  const pendingTasks = useMemo(
    () => allTasks.filter(t =>
      t.status.tag === 'Unclaimed' ||
      t.status.tag === 'Claimed' ||
      t.status.tag === 'InProgress' ||
      t.status.tag === 'SelfChecking' ||
      t.status.tag === 'NeedsReview'
    ).length,
    [allTasks]
  )

  // AI Performance
  const aiEmployees = useMemo(
    () => allEmployees.filter(e => e.employeeType.tag === 'AiAgent'),
    [allEmployees]
  )

  const humanEmployees = useMemo(
    () => allEmployees.filter(e => e.employeeType.tag === 'Human'),
    [allEmployees]
  )

  const aiOnline = useMemo(
    () => aiEmployees.filter(e => e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall'),
    [aiEmployees]
  )

  const completedTasks = useMemo(
    () => allTasks.filter(t => t.status.tag === 'Completed'),
    [allTasks]
  )

  const aiCompletedTasks = useMemo(
    () => completedTasks.filter(t => {
      if (!t.assignee) return false
      return aiEmployees.some(e => e.id.toHexString() === t.assignee?.toHexString())
    }),
    [completedTasks, aiEmployees]
  )

  const humanCompletedTasks = useMemo(
    () => completedTasks.filter(t => {
      if (!t.assignee) return false
      return humanEmployees.some(e => e.id.toHexString() === t.assignee?.toHexString())
    }),
    [completedTasks, humanEmployees]
  )

  const avgAiConfidence = useMemo(() => {
    const scores = aiEmployees
      .map(e => e.avgConfidenceScore)
      .filter((s): s is number => s !== null && s !== undefined)
    if (scores.length === 0) return 0
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }, [aiEmployees])

  const totalCostSaved = useMemo(() => {
    return aiEmployees.reduce((sum, e) => sum + (e.costIncurred ?? 0), 0)
  }, [aiEmployees])

  const totalTasksCompleted = useMemo(() => {
    return allEmployees.reduce((sum, e) => sum + Number(e.tasksCompleted), 0)
  }, [allEmployees])

  const aiTaskShare = totalTasksCompleted > 0
    ? (aiCompletedTasks.length / Math.max(completedTasks.length, 1)) * 100
    : 0

  // Recent activity (latest 8)
  const recentActivity = useMemo(
    () => [...allActivityLogs]
      .sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis()))
      .slice(0, 8),
    [allActivityLogs]
  )

  // Task map for agent lookups
  const taskMap = useMemo(
    () => new Map(allTasks.map(t => [t.id, t])),
    [allTasks]
  )

  const getStatusDot = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Online': return 'bg-emerald-500'
      case 'Busy': return 'bg-amber-500'
      case 'InCall': return 'bg-blue-500'
      case 'Offline': return 'bg-muted-foreground/40'
      default: return 'bg-muted-foreground/40'
    }
  }

  const getStatusLabel = (status: { tag: string }) => {
    switch (status.tag) {
      case 'Online': return 'Online'
      case 'Busy': return 'Busy'
      case 'InCall': return 'In Call'
      case 'Offline': return 'Offline'
      default: return status.tag
    }
  }

  const getStatusBadgeVariant = (status: { tag: string }): 'default' | 'secondary' | 'outline' => {
    switch (status.tag) {
      case 'Online': return 'default'
      case 'Busy': return 'secondary'
      case 'InCall': return 'default'
      default: return 'outline'
    }
  }

  const getActionLabel = (action: { tag: string }) => {
    switch (action.tag) {
      case 'Created': return 'created'
      case 'Updated': return 'updated'
      case 'Deleted': return 'deleted'
      case 'Assigned': return 'assigned'
      case 'Completed': return 'completed'
      case 'Escalated': return 'escalated'
      case 'Commented': return 'commented on'
      case 'Called': return 'called'
      case 'Emailed': return 'emailed'
      default: return action.tag.toLowerCase()
    }
  }

  const getPriorityColor = (priority: { tag: string }) => {
    switch (priority.tag) {
      case 'Urgent': return 'text-red-500'
      case 'High': return 'text-orange-500'
      case 'Medium': return 'text-amber-500'
      case 'Low': return 'text-muted-foreground'
      default: return 'text-muted-foreground'
    }
  }

  const formatTimestamp = (ts: any) => {
    try {
      const d = ts.toDate()
      const now = Date.now()
      const diff = now - d.getTime()
      if (diff < 60_000) return 'just now'
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
      return d.toLocaleDateString()
    } catch { return '' }
  }

  const kpiCards = [
    {
      title: 'Open Tickets',
      value: openTickets,
      total: allTickets.length,
      icon: HeadphonesIcon,
      href: '/support',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      trend: openTickets > 5 ? 'up' : openTickets === 0 ? 'neutral' : 'down',
    },
    {
      title: 'Active Leads',
      value: activeLeads,
      total: allLeads.length,
      icon: TrendingUp,
      href: '/sales',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: activeLeads > 0 ? 'up' : 'neutral',
    },
    {
      title: 'Active Candidates',
      value: activeCandidates,
      total: allCandidates.length,
      icon: UserCheck,
      href: '/recruitment',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      trend: activeCandidates > 0 ? 'up' : 'neutral',
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks,
      total: allTasks.length,
      icon: CheckSquare,
      href: '/engineering',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: pendingTasks > 10 ? 'up' : pendingTasks === 0 ? 'neutral' : 'down',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of your AI-powered operations
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link key={kpi.title} href={kpi.href} className="group">
              <Card className="hover:ring-ring/30 transition-all hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                    <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                      <Icon className={`size-4 ${kpi.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold tabular-nums">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        of {kpi.total} total
                      </p>
                    </div>
                    <div className="pb-1">
                      {kpi.trend === 'up' && (
                        <TrendingUp className="size-4 text-emerald-500" />
                      )}
                      {kpi.trend === 'down' && (
                        <TrendingDown className="size-4 text-blue-500" />
                      )}
                      {kpi.trend === 'neutral' && (
                        <Minus className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Main Grid: AI Performance + Agents + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AI Performance Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                <CardTitle>AI Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Task Completion Split */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">AI Task Share</span>
                  <span className="text-sm font-bold tabular-nums text-violet-500">
                    {aiTaskShare.toFixed(0)}%
                  </span>
                </div>
                <Progress value={aiTaskShare} className="gap-0">
                  <ProgressTrack className="h-2">
                    <ProgressIndicator className="bg-violet-500" />
                  </ProgressTrack>
                </Progress>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Bot className="size-3" />
                    AI: {aiCompletedTasks.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    Human: {humanCompletedTasks.length}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Avg Confidence */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg AI Confidence</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-500">
                    {(avgAiConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={avgAiConfidence * 100} className="gap-0">
                  <ProgressTrack className="h-2">
                    <ProgressIndicator className="bg-emerald-500" />
                  </ProgressTrack>
                </Progress>
              </div>

              <Separator />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Bot className="size-3" />
                    AI Agents
                  </p>
                  <p className="text-xl font-bold tabular-nums">{aiEmployees.length}</p>
                  <p className="text-xs text-emerald-500">{aiOnline.length} online</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="size-3" />
                    API Cost
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    ${totalCostSaved.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">total incurred</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckSquare className="size-3" />
                    Tasks Done
                  </p>
                  <p className="text-xl font-bold tabular-nums">{completedTasks.length}</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="size-3" />
                    Auto-Resolved
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {allTickets.filter(t => t.aiAutoResolved).length}
                  </p>
                  <p className="text-xs text-muted-foreground">tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                <CardTitle>Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Link href="/support" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}>
                <Ticket className="size-4 text-blue-500" />
                Create Support Ticket
              </Link>
              <Link href="/sales" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}>
                <TrendingUp className="size-4 text-emerald-500" />
                Add Lead
              </Link>
              <Link href="/recruitment" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}>
                <Briefcase className="size-4 text-violet-500" />
                Post Job Opening
              </Link>
              <Link href="/recruitment" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}>
                <UserPlus className="size-4 text-amber-500" />
                Add Candidate
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* AI Employees Online */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-violet-500" />
                <CardTitle>AI Employees</CardTitle>
              </div>
              <Badge variant="secondary">
                {aiOnline.length} online
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3 p-0">
            <div className="divide-y">
              {aiEmployees.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No AI agents registered yet
                </div>
              ) : (
                aiEmployees
                  .sort((a, b) => {
                    const order: Record<string, number> = { Online: 0, Busy: 1, InCall: 2, Offline: 3 }
                    return (order[a.status.tag] ?? 4) - (order[b.status.tag] ?? 4)
                  })
                  .map((agent) => {
                    const currentTask = agent.currentTaskId
                      ? taskMap.get(agent.currentTaskId)
                      : null
                    return (
                      <div key={agent.id.toHexString()} className="px-4 py-3 flex items-start gap-3">
                        {/* Avatar / Status */}
                        <div className="relative shrink-0 mt-0.5">
                          <div className="size-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Bot className="size-4 text-violet-500" />
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${getStatusDot(agent.status)}`}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{agent.name}</p>
                            <Badge
                              variant={getStatusBadgeVariant(agent.status)}
                              className="shrink-0 text-xs"
                            >
                              {getStatusLabel(agent.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {agent.role} &middot; {agent.department.tag}
                          </p>
                          {currentTask && (
                            <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
                              <CircleDot className="size-3 text-amber-500 shrink-0" />
                              {currentTask.title}
                            </p>
                          )}
                          {agent.avgConfidenceScore !== null && agent.avgConfidenceScore !== undefined && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Progress value={agent.avgConfidenceScore * 100} className="gap-0 flex-1">
                                <ProgressTrack className="h-1">
                                  <ProgressIndicator className="bg-violet-500" />
                                </ProgressTrack>
                              </Progress>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {(agent.avgConfidenceScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-blue-500" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-3 p-0">
            <div className="divide-y">
              {recentActivity.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No activity recorded yet
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id.toString()} className="px-4 py-3 flex items-start gap-3">
                    {/* Action dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className="size-2 rounded-full bg-primary/60" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.actor.toHexString().slice(0, 8)}…
                        </span>{' '}
                        <span className="text-foreground">{getActionLabel(log.action)}</span>{' '}
                        <span className="font-medium capitalize">{log.entityType}</span>
                        {' '}
                        <span className="text-muted-foreground">#{log.entityId.toString()}</span>
                      </p>
                      {log.metadata && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {log.metadata}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Tasks by Priority + Ticket Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Tasks by Status */}
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-amber-500" />
              <CardTitle>Task Pipeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[
              { label: 'Unclaimed', tag: 'Unclaimed', color: 'bg-muted-foreground' },
              { label: 'In Progress', tag: 'InProgress', color: 'bg-blue-500' },
              { label: 'Self Checking', tag: 'SelfChecking', color: 'bg-violet-500' },
              { label: 'Needs Review', tag: 'NeedsReview', color: 'bg-amber-500' },
              { label: 'Escalated', tag: 'Escalated', color: 'bg-red-500' },
              { label: 'Completed', tag: 'Completed', color: 'bg-emerald-500' },
            ].map(({ label, tag, color }) => {
              const count = allTasks.filter(t => t.status.tag === tag).length
              const pct = allTasks.length > 0 ? (count / allTasks.length) * 100 : 0
              return (
                <div key={tag}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${color} shrink-0`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{count}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={pct} className="gap-0">
                    <ProgressTrack className="h-1.5">
                      <ProgressIndicator className={color} />
                    </ProgressTrack>
                  </Progress>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Tickets by Priority */}
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="size-4 text-blue-500" />
              <CardTitle>Ticket Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Priority breakdown */}
            <div className="space-y-3">
              {[
                { label: 'Urgent', tag: 'Urgent', color: 'bg-red-500', textColor: 'text-red-500' },
                { label: 'High', tag: 'High', color: 'bg-orange-500', textColor: 'text-orange-500' },
                { label: 'Medium', tag: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-500' },
                { label: 'Low', tag: 'Low', color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
              ].map(({ label, tag, color, textColor }) => {
                const count = allTickets.filter(t => t.priority.tag === tag).length
                const pct = allTickets.length > 0 ? (count / allTickets.length) * 100 : 0
                return (
                  <div key={tag}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${color} shrink-0`} />
                        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">{count}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} className="gap-0">
                      <ProgressTrack className="h-1.5">
                        <ProgressIndicator className={color} />
                      </ProgressTrack>
                    </Progress>
                  </div>
                )
              })}
            </div>

            <Separator />

            {/* Resolution stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-lg font-bold tabular-nums text-emerald-500">
                  {allTickets.filter(t => t.aiAutoResolved).length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">AI Resolved</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-lg font-bold tabular-nums text-blue-500">
                  {allTickets.filter(t => t.status.tag === 'Resolved').length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Resolved</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-lg font-bold tabular-nums">
                  {allTickets.filter(t => t.status.tag === 'Closed').length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
