'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)
  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const activities = useMemo(
    () => [...allActivity].sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis())),
    [allActivity]
  )

  const filteredActivities = useMemo(() => {
    let list = activities
    if (actionFilter !== 'all') {
      list = list.filter((a) => a.action.tag === actionFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) => {
        const actorName = employeeMap.get(a.actor.toHexString())?.name ?? ''
        return (
          actorName.toLowerCase().includes(q) ||
          a.entityType.toLowerCase().includes(q) ||
          (a.metadata ?? '').toLowerCase().includes(q) ||
          a.action.tag.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [activities, actionFilter, searchQuery, employeeMap])

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

  return (
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
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time audit trail across all modules
            </p>
          </div>
        </div>
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

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search activity…"
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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
                      const config = actionConfig[activity.action.tag] ?? defaultConfig
                      const IconComponent = actionIcons[activity.action.tag] ?? Activity
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
                                {' '}{actionVerb(activity.action.tag)}{' '}
                              </span>
                              <span className="font-medium text-foreground/80">
                                {activity.entityType}
                              </span>
                              <span className="text-muted-foreground font-mono text-xs ml-1">
                                #{String(activity.entityId)}
                              </span>
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
  )
}
