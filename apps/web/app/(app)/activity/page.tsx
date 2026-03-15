'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
  CircleDot,
  Bot,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

// ── config ───────────────────────────────────────────────

const actionConfig: Record<string, { icon: typeof Activity; color: string; bg: string; label: string }> = {
  Created:   { icon: Plus,           color: 'text-green-400',   bg: 'bg-green-500/15',   label: 'Created' },
  Updated:   { icon: Pencil,         color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Updated' },
  Deleted:   { icon: Trash2,         color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Deleted' },
  Assigned:  { icon: UserCheck,      color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Assigned' },
  Completed: { icon: CheckCircle,    color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Completed' },
  Escalated: { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Escalated' },
  Commented: { icon: MessageSquare,  color: 'text-sky-400',     bg: 'bg-sky-500/15',     label: 'Commented' },
  Called:    { icon: Phone,          color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Called' },
  Emailed:   { icon: Mail,           color: 'text-pink-400',    bg: 'bg-pink-500/15',    label: 'Emailed' },
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatTimeAgo(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDateGroup(d: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  if (d >= weekAgo) return 'This Week'
  return 'Older'
}

type ActionFilter = string | 'all'

// ── main component ───────────────────────────────────────

export default function ActivityPage() {
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)

  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const getActor = (actorId: { toHexString: () => string }) =>
    employeeMap.get(actorId.toHexString())

  const activities = useMemo(() => {
    let items = [...allActivity].sort(
      (a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis())
    )

    if (actionFilter !== 'all') {
      items = items.filter(a => a.action.tag === actionFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(a => {
        const actor = getActor(a.actor)
        return (
          (actor?.name ?? '').toLowerCase().includes(q) ||
          a.entityType.toLowerCase().includes(q) ||
          (a.metadata ?? '').toLowerCase().includes(q) ||
          a.action.tag.toLowerCase().includes(q)
        )
      })
    }

    return items
  }, [allActivity, actionFilter, searchQuery, employeeMap])

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: typeof activities }[] = []
    let currentGroup = ''

    for (const activity of activities) {
      let d: Date
      try { d = activity.timestamp.toDate() } catch { d = new Date() }
      const group = getDateGroup(d)
      if (group !== currentGroup) {
        currentGroup = group
        groups.push({ label: group, items: [] })
      }
      groups[groups.length - 1].items.push(activity)
    }

    return groups
  }, [activities])

  // Stats
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allActivity.forEach((a) => {
      counts[a.action.tag] = (counts[a.action.tag] || 0) + 1
    })
    return counts
  }, [allActivity])

  const totalToday = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allActivity.filter(a => {
      try { return a.timestamp.toDate() >= today } catch { return false }
    }).length
  }, [allActivity])

  const uniqueActors = useMemo(() => {
    const actors = new Set<string>()
    allActivity.forEach(a => actors.add(a.actor.toHexString()))
    return actors.size
  }, [allActivity])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="size-6 text-cyan-400" />
            Activity Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time audit trail across all modules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              className="pl-9 h-9 w-56"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={Activity} label="Total Events" value={allActivity.length} color="text-cyan-400 bg-cyan-500/10" />
        <StatChip icon={Zap} label="Today" value={totalToday} color="text-amber-400 bg-amber-500/10" />
        <StatChip icon={CheckCircle} label="Completed" value={actionCounts['Completed'] ?? 0} color="text-emerald-400 bg-emerald-500/10" />
        <StatChip icon={UserCheck} label="Active People" value={uniqueActors} color="text-violet-400 bg-violet-500/10" />
      </div>

      {/* Action type filter */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          <Button
            variant={actionFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActionFilter('all')}
          >
            All
          </Button>
          {Object.entries(actionConfig).map(([key, cfg]) => {
            const count = actionCounts[key] ?? 0
            if (count === 0) return null
            return (
              <Button
                key={key}
                variant={actionFilter === key ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setActionFilter(actionFilter === key ? 'all' : key)}
              >
                <cfg.icon className={`size-3 ${cfg.color}`} />
                {cfg.label}
                <span className="text-muted-foreground">({count})</span>
              </Button>
            )
          })}
        </motion.div>
      )}

      {/* Timeline */}
      <div className="relative">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Activity className="size-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No activity found</p>
            <p className="text-xs mt-1">
              {searchQuery || actionFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Activity events will appear here in real-time'
              }
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{group.items.length} events</span>
                </div>

                {/* Events in group */}
                <div className="relative ml-4 border-l-2 border-border/50 pl-6 flex flex-col gap-0.5">
                  {group.items.map((activity, idx) => {
                    const cfg = actionConfig[activity.action.tag] ?? {
                      icon: Activity, color: 'text-zinc-400', bg: 'bg-zinc-500/15', label: activity.action.tag,
                    }
                    const actor = getActor(activity.actor)
                    const actorName = actor?.name ?? 'Unknown'
                    const isAI = actor?.employeeType?.tag === 'AIAgent'
                    let timeStr: string
                    try { timeStr = formatTimeAgo(activity.timestamp.toDate()) } catch { timeStr = '' }

                    return (
                      <motion.div
                        key={String(activity.id)}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: Math.min(idx * 0.02, 0.3),
                          type: 'spring',
                          stiffness: 400,
                          damping: 30,
                        }}
                        className="flex items-start gap-3 py-2.5 group relative"
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-[31px] top-3.5 size-3 rounded-full border-2 border-background ${cfg.bg} ${cfg.color} flex items-center justify-center`}>
                          <div className={`size-1.5 rounded-full ${cfg.bg.replace('/15', '')}`} />
                        </div>

                        {/* Action icon */}
                        <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${cfg.bg}`}>
                          <cfg.icon className={`size-3.5 ${cfg.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">
                            <span className="font-medium">{actorName}</span>
                            {isAI && (
                              <Badge variant="outline" className="ml-1 text-[9px] h-3.5 px-1 gap-0.5 align-middle">
                                <Bot className="size-2" />
                                AI
                              </Badge>
                            )}
                            <span className="text-muted-foreground">
                              {' '}{activity.action.tag.toLowerCase()} {activity.entityType.toLowerCase()}
                            </span>
                            <span className="text-muted-foreground/60"> #{String(activity.entityId)}</span>
                          </p>
                          {activity.metadata && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                              {activity.metadata}
                            </p>
                          )}
                        </div>

                        {/* Time + avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Avatar className="size-6 hidden sm:flex">
                            {actor?.avatarUrl && <AvatarImage src={actor.avatarUrl} />}
                            <AvatarFallback className={`text-[8px] text-white ${avatarColor(actorName)}`}>
                              {getInitials(actorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
                            {timeStr}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────

function StatChip({ icon: Icon, label, value, color }: {
  icon: typeof Activity
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className={`flex items-center justify-center size-9 rounded-lg ${color}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}
