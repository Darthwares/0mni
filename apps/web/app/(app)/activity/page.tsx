'use client'

import { useMemo, useState } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Bot,
  Clock,
  TrendingUp,
  BarChart3,
  Zap,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { CountUp } from '@/components/reactbits/CountUp'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'

// ---- Constants ----------------------------------------------------------------

const ACTION_ICONS: Record<string, typeof Activity> = {
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

const ACTION_COLORS: Record<string, string> = {
  Created: 'bg-green-500/10 text-green-500',
  Updated: 'bg-blue-500/10 text-blue-500',
  Deleted: 'bg-red-500/10 text-red-500',
  Assigned: 'bg-purple-500/10 text-purple-500',
  Completed: 'bg-emerald-500/10 text-emerald-500',
  Escalated: 'bg-orange-500/10 text-orange-500',
  Commented: 'bg-sky-500/10 text-sky-500',
  Called: 'bg-indigo-500/10 text-indigo-500',
  Emailed: 'bg-violet-500/10 text-violet-500',
}

const ACTION_CARD_COLORS: Record<string, string> = {
  Created: 'rgba(34, 197, 94, 0.08)',
  Completed: 'rgba(16, 185, 129, 0.08)',
  Escalated: 'rgba(249, 115, 22, 0.08)',
}

type TimeFilter = 'all' | 'today' | 'week' | 'month'
type ActionFilter = 'all' | string

// ---- Helpers ----------------------------------------------------------------

function formatTimeAgo(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatFullTime(ts: any): string {
  try {
    return ts.toDate().toLocaleString([], {
      weekday: 'short',
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
    const yesterday = new Date(today.getTime() - 86400000)
    const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (entryDate.getTime() === today.getTime()) return 'Today'
    if (entryDate.getTime() === yesterday.getTime()) return 'Yesterday'
    if (now.getTime() - d.getTime() < 7 * 86400000) {
      return d.toLocaleDateString([], { weekday: 'long' })
    }
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

function isWithinTimeFilter(ts: any, filter: TimeFilter): boolean {
  if (filter === 'all') return true
  try {
    const d = ts.toDate()
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    switch (filter) {
      case 'today': return diffMs < 86400000
      case 'week': return diffMs < 7 * 86400000
      case 'month': return diffMs < 30 * 86400000
    }
  } catch {
    return true
  }
}

// ---- Main Page ----------------------------------------------------------------

export default function ActivityPage() {
  const { identity } = useSpacetimeDB()
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)

  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [personFilter, setPersonFilter] = useState<string>('all')

  // Employee lookup
  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // All activities sorted by time
  const allActivities = useMemo(
    () => [...allActivity].sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis())),
    [allActivity]
  )

  // Unique action types
  const actionTypes = useMemo(() => {
    const set = new Set<string>()
    allActivities.forEach((a) => set.add(a.action.tag))
    return Array.from(set).sort()
  }, [allActivities])

  // Unique actors
  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>()
    allActivities.forEach((a) => {
      const hex = a.actor.toHexString()
      if (!map.has(hex)) {
        const emp = employeeMap.get(hex)
        map.set(hex, emp?.name ?? `User ${hex.slice(0, 6)}`)
      }
    })
    return Array.from(map.entries())
  }, [allActivities, employeeMap])

  // Filtered activities
  const filteredActivities = useMemo(() => {
    let items = allActivities

    // Time filter
    items = items.filter((a) => isWithinTimeFilter(a.timestamp, timeFilter))

    // Action filter
    if (actionFilter !== 'all') {
      items = items.filter((a) => a.action.tag === actionFilter)
    }

    // Person filter
    if (personFilter !== 'all') {
      items = items.filter((a) => a.actor.toHexString() === personFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((a) => {
        const actorName = (employeeMap.get(a.actor.toHexString())?.name ?? '').toLowerCase()
        const entity = `${a.entityType} #${a.entityId}`.toLowerCase()
        const meta = (a.metadata ?? '').toLowerCase()
        return actorName.includes(q) || entity.includes(q) || meta.includes(q) || a.action.tag.toLowerCase().includes(q)
      })
    }

    return items
  }, [allActivities, timeFilter, actionFilter, personFilter, searchQuery, employeeMap])

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: typeof filteredActivities }[] = []
    let currentLabel = ''
    filteredActivities.forEach((a) => {
      const label = getDateGroup(a.timestamp)
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, items: [] })
      }
      groups[groups.length - 1].items.push(a)
    })
    return groups
  }, [filteredActivities])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const todayItems = allActivities.filter((a) => {
      try { return now.getTime() - a.timestamp.toDate().getTime() < 86400000 } catch { return false }
    })
    const yesterdayItems = allActivities.filter((a) => {
      try {
        const diff = now.getTime() - a.timestamp.toDate().getTime()
        return diff >= 86400000 && diff < 2 * 86400000
      } catch { return false }
    })

    const actionCounts: Record<string, number> = {}
    allActivities.forEach((a) => {
      actionCounts[a.action.tag] = (actionCounts[a.action.tag] || 0) + 1
    })

    const aiActions = allActivities.filter((a) => {
      const emp = employeeMap.get(a.actor.toHexString())
      return emp?.employeeType.tag === 'AiAgent'
    }).length

    const trendPct = yesterdayItems.length > 0
      ? Math.round(((todayItems.length - yesterdayItems.length) / yesterdayItems.length) * 100)
      : todayItems.length > 0 ? 100 : 0

    return {
      total: allActivities.length,
      today: todayItems.length,
      trend: trendPct,
      created: actionCounts['Created'] ?? 0,
      completed: actionCounts['Completed'] ?? 0,
      escalated: actionCounts['Escalated'] ?? 0,
      aiActions,
      uniqueActors: uniqueActors.length,
    }
  }, [allActivities, employeeMap, uniqueActors])

  // Helper functions
  const getActorName = (actorId: any) => {
    const emp = employeeMap.get(actorId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const getActorInitials = (actorId: any) => {
    const name = getActorName(actorId)
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isAI = (actorId: any) => {
    const emp = employeeMap.get(actorId.toHexString())
    return emp?.employeeType.tag === 'AiAgent'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-emerald-500" />
          <h1 className="text-lg font-bold">
            <GradientText colors={['#10b981', '#06b6d4', '#3b82f6']} animationSpeed={4}>
              Activity Feed
            </GradientText>
          </h1>
          <Badge variant="secondary" className="text-xs font-mono">
            <CountUp to={stats.total} duration={0.8} />
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PresenceBar />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.08)">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Today</CardTitle>
                  <Zap className="size-4 text-emerald-400" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">
                    <CountUp to={stats.today} duration={0.6} />
                  </div>
                  {stats.trend !== 0 && (
                    <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${stats.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.trend > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                      {Math.abs(stats.trend)}% vs yesterday
                    </div>
                  )}
                </CardContent>
              </Card>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.08)">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Created</CardTitle>
                  <Plus className="size-4 text-blue-400" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">
                    <CountUp to={stats.created} duration={0.6} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">total events</p>
                </CardContent>
              </Card>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.08)">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
                  <CheckCircle className="size-4 text-emerald-400" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">
                    <CountUp to={stats.completed} duration={0.6} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">tasks done</p>
                </CardContent>
              </Card>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.08)">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">AI Actions</CardTitle>
                  <Bot className="size-4 text-violet-400" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">
                    <CountUp to={stats.aiActions} duration={0.6} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stats.uniqueActors} active {stats.uniqueActors === 1 ? 'user' : 'users'}
                  </p>
                </CardContent>
              </Card>
            </SpotlightCard>
          </div>

          {/* Filters bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                <Clock className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                <Filter className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={personFilter} onValueChange={(v) => setPersonFilter(v)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                <Users className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {uniqueActors.map(([hex, name]) => (
                  <SelectItem key={hex} value={hex}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(timeFilter !== 'all' || actionFilter !== 'all' || personFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTimeFilter('all')
                  setActionFilter('all')
                  setPersonFilter('all')
                  setSearchQuery('')
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear filters
              </Button>
            )}

            <div className="ml-auto">
              <Badge variant="outline" className="text-[10px]">
                {filteredActivities.length} event{filteredActivities.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          {/* Activity action breakdown mini-bar */}
          {allActivities.length > 0 && (
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              {actionTypes.map((type) => {
                const count = allActivities.filter((a) => a.action.tag === type).length
                const pct = (count / allActivities.length) * 100
                if (pct < 1) return null
                const colors: Record<string, string> = {
                  Created: 'bg-green-500',
                  Updated: 'bg-blue-500',
                  Deleted: 'bg-red-500',
                  Assigned: 'bg-purple-500',
                  Completed: 'bg-emerald-500',
                  Escalated: 'bg-orange-500',
                  Commented: 'bg-sky-500',
                  Called: 'bg-indigo-500',
                  Emailed: 'bg-violet-500',
                }
                return (
                  <div
                    key={type}
                    className={`${colors[type] ?? 'bg-gray-500'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${type}: ${count} (${Math.round(pct)}%)`}
                  />
                )
              })}
            </div>
          )}

          {/* Grouped Timeline */}
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Activity className="size-7 opacity-30" />
              </div>
              <p className="text-sm font-medium">No activity found</p>
              <p className="text-[11px] mt-1 text-muted-foreground/60">
                {searchQuery || timeFilter !== 'all' || actionFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as events happen'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </h3>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {group.items.length}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>

                  <div className="relative ml-4 border-l-2 border-muted space-y-0">
                    {group.items.map((activity) => {
                      const IconComponent = ACTION_ICONS[activity.action.tag] ?? Activity
                      const colorClass = ACTION_COLORS[activity.action.tag] ?? 'bg-gray-500/10 text-gray-500'

                      return (
                        <div
                          key={String(activity.id)}
                          className="relative flex items-start gap-3 pl-6 py-2.5 hover:bg-accent/30 rounded-r-lg transition-colors group"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute -left-[9px] top-3.5 size-4 rounded-full border-2 border-background flex items-center justify-center ${colorClass}`}>
                            <IconComponent className="size-2" />
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className={`text-[9px] ${isAI(activity.actor) ? 'bg-violet-600 text-white' : ''}`}>
                              {isAI(activity.actor) ? <Bot className="size-3" /> : getActorInitials(activity.actor)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-tight">
                              <span className="font-medium">{getActorName(activity.actor)}</span>
                              {isAI(activity.actor) && (
                                <Badge variant="outline" className="ml-1 text-[9px] h-3.5 px-1 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                  AI
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                {' '}{activity.action.tag.toLowerCase()}{' '}
                              </span>
                              <span className="text-foreground/80">
                                {activity.entityType} #{String(activity.entityId)}
                              </span>
                            </p>
                            {activity.metadata && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-lg">
                                {activity.metadata}
                              </p>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" title={formatFullTime(activity.timestamp)}>
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
