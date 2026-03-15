'use client'

import { useMemo, useState } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  KanbanSquare,
  MessageSquare,
  Headphones,
  GitPullRequest,
  Bot,
  Calendar,
  FileText,
  AlertTriangle,
  X,
  Filter,
  Inbox,
  Trash2,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- helpers ----------------------------------------------------------------

function timeAgo(ts: any): string {
  try {
    const diff = Date.now() - ts.toMillis()
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  } catch {
    return ''
  }
}

function notificationIcon(type: string) {
  switch (type) {
    case 'TaskAssigned': return KanbanSquare
    case 'TaskCompleted': return Check
    case 'MentionInMessage': return MessageSquare
    case 'TicketUpdate': return Headphones
    case 'PrReviewRequested': return GitPullRequest
    case 'AgentCompleted': return Bot
    case 'MeetingReminder': return Calendar
    case 'DocumentShared': return FileText
    case 'SystemAlert': return AlertTriangle
    default: return Bell
  }
}

function notificationGradient(type: string): string {
  switch (type) {
    case 'TaskAssigned': return 'from-violet-500 to-purple-500'
    case 'TaskCompleted': return 'from-emerald-500 to-green-500'
    case 'MentionInMessage': return 'from-blue-500 to-cyan-500'
    case 'TicketUpdate': return 'from-amber-500 to-orange-500'
    case 'PrReviewRequested': return 'from-indigo-500 to-blue-500'
    case 'AgentCompleted': return 'from-fuchsia-500 to-violet-500'
    case 'MeetingReminder': return 'from-rose-500 to-pink-500'
    case 'DocumentShared': return 'from-teal-500 to-emerald-500'
    case 'SystemAlert': return 'from-red-500 to-rose-500'
    default: return 'from-neutral-500 to-neutral-600'
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'Urgent': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'High': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'Normal': return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    case 'Low': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-500 border-neutral-500/20'
    default: return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  }
}

const FILTER_OPTIONS = ['All', 'Unread', 'Task', 'Message', 'Ticket', 'PR', 'AI', 'Meeting', 'System'] as const
type FilterType = (typeof FILTER_OPTIONS)[number]

function filterMatches(filter: FilterType, type: string): boolean {
  switch (filter) {
    case 'All': return true
    case 'Unread': return true // handled separately
    case 'Task': return type === 'TaskAssigned' || type === 'TaskCompleted'
    case 'Message': return type === 'MentionInMessage'
    case 'Ticket': return type === 'TicketUpdate'
    case 'PR': return type === 'PrReviewRequested'
    case 'AI': return type === 'AgentCompleted'
    case 'Meeting': return type === 'MeetingReminder'
    case 'System': return type === 'SystemAlert' || type === 'DocumentShared'
    default: return true
  }
}

// =============================================================================

export default function NotificationsPage() {
  const { identity } = useSpacetimeDB()
  const [allNotifications] = useTable(tables.notification)
  const markRead = useSpacetimeReducer(reducers.markNotificationRead)
  const markAllRead = useSpacetimeReducer(reducers.markAllNotificationsRead)
  const dismiss = useSpacetimeReducer(reducers.dismissNotification)

  const [filter, setFilter] = useState<FilterType>('All')

  // My notifications, newest first
  const myNotifications = useMemo(() => {
    if (!identity) return []
    const myHex = identity.toHexString()
    return [...allNotifications]
      .filter((n) => n.recipient.toHexString() === myHex && !n.dismissed)
      .sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis()))
  }, [allNotifications, identity])

  // Filtered
  const filteredNotifications = useMemo(() => {
    return myNotifications.filter((n) => {
      if (filter === 'Unread') return !n.read
      return filterMatches(filter, n.notificationType.tag)
    })
  }, [myNotifications, filter])

  // Stats
  const unreadCount = myNotifications.filter((n) => !n.read).length
  const todayCount = myNotifications.filter((n) => {
    try {
      return Date.now() - n.createdAt.toMillis() < 86_400_000
    } catch { return false }
  }).length
  const urgentCount = myNotifications.filter((n) => !n.read && n.priority.tag === 'Urgent').length

  function handleMarkRead(id: bigint) {
    try { markRead({ notificationId: id }) } catch {}
  }

  function handleMarkAllRead() {
    try { markAllRead({}) } catch {}
  }

  function handleDismiss(id: bigint) {
    try { dismiss({ notificationId: id }) } catch {}
  }

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filteredNotifications }[] = []
    const today: typeof filteredNotifications = []
    const yesterday: typeof filteredNotifications = []
    const thisWeek: typeof filteredNotifications = []
    const older: typeof filteredNotifications = []
    const now = Date.now()

    for (const n of filteredNotifications) {
      try {
        const age = now - n.createdAt.toMillis()
        if (age < 86_400_000) today.push(n)
        else if (age < 172_800_000) yesterday.push(n)
        else if (age < 604_800_000) thisWeek.push(n)
        else older.push(n)
      } catch {
        older.push(n)
      }
    }

    if (today.length > 0) groups.push({ label: 'Today', items: today })
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday })
    if (thisWeek.length > 0) groups.push({ label: 'This Week', items: thisWeek })
    if (older.length > 0) groups.push({ label: 'Older', items: older })

    return groups
  }, [filteredNotifications])

  return (
    <div className="p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#f59e0b', '#ef4444', '#8b5cf6']} animationSpeed={6}>
              Notifications
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Stay updated on tasks, messages, tickets, and AI activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleMarkAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'UNREAD',
            value: unreadCount,
            icon: Bell,
            gradient: 'from-violet-500 to-purple-500',
            spotlight: 'rgba(139,92,246,0.15)',
          },
          {
            label: 'TODAY',
            value: todayCount,
            icon: Clock,
            gradient: 'from-blue-500 to-cyan-500',
            spotlight: 'rgba(59,130,246,0.15)',
          },
          {
            label: 'URGENT',
            value: urgentCount,
            icon: AlertTriangle,
            gradient: 'from-red-500 to-rose-500',
            spotlight: 'rgba(239,68,68,0.15)',
          },
          {
            label: 'TOTAL',
            value: myNotifications.length,
            icon: Inbox,
            gradient: 'from-neutral-500 to-neutral-600',
            spotlight: 'rgba(115,115,115,0.15)',
          },
        ].map((kpi) => (
          <SpotlightCard
            key={kpi.label}
            className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
            spotlightColor={kpi.spotlight}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center`}>
                <kpi.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              <CountUp to={kpi.value} duration={1} />
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-neutral-400" />
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              filter === f
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {f}
            {f === 'Unread' && unreadCount > 0 && (
              <span className={`ml-1 ${filter === f ? 'text-violet-200' : 'text-neutral-400'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500">
            <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40 flex items-center justify-center mb-4">
              <BellOff className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-base font-medium text-neutral-500 dark:text-neutral-400">
              {filter === 'All' ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}
            </p>
            <p className="text-sm mt-1">
              {filter !== 'All' ? 'Try a different filter' : "You're all caught up"}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-[11px] text-neutral-300 dark:text-neutral-600 tabular-nums">
                  {group.items.length}
                </span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              </div>

              <div className="space-y-1.5">
                {group.items.map((n) => {
                  const Icon = notificationIcon(n.notificationType.tag)
                  const gradient = notificationGradient(n.notificationType.tag)
                  return (
                    <div
                      key={n.id.toString()}
                      className={`group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                        n.read
                          ? 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800'
                          : 'bg-white dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-800 shadow-sm'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-sm leading-snug ${
                              n.read
                                ? 'text-neutral-600 dark:text-neutral-400'
                                : 'font-medium text-neutral-900 dark:text-neutral-100'
                            }`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            )}
                          </div>

                          {/* Unread dot */}
                          {!n.read && (
                            <div className="h-2.5 w-2.5 rounded-full bg-violet-500 flex-shrink-0 mt-1.5 shadow-sm shadow-violet-500/30" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                            {timeAgo(n.createdAt)}
                          </span>
                          {n.priority.tag !== 'Normal' && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityBadge(n.priority.tag)}`}>
                              {n.priority.tag}
                            </span>
                          )}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800">
                            {n.notificationType.tag.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-neutral-400 hover:text-violet-600"
                            onClick={() => handleMarkRead(n.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-neutral-400 hover:text-red-500"
                          onClick={() => handleDismiss(n.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
