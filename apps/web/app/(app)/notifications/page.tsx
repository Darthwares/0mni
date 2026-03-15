'use client'

import { useMemo, useState } from 'react'
import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Bell,
  CheckCheck,
  X,
  UserCheck,
  CheckCircle2,
  AtSign,
  Ticket,
  GitPullRequest,
  Bot,
  Calendar,
  FileText,
  AlertTriangle,
  Inbox,
  Filter,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- type helpers -----------------------------------------------------------

type NotificationTypeTag =
  | 'TaskAssigned'
  | 'TaskCompleted'
  | 'MentionInMessage'
  | 'TicketUpdate'
  | 'PrReviewRequested'
  | 'AgentCompleted'
  | 'MeetingReminder'
  | 'DocumentShared'
  | 'SystemAlert'

type PriorityTag = 'Low' | 'Normal' | 'High' | 'Urgent'

const TYPE_FILTERS = [
  'All',
  'TaskAssigned',
  'TaskCompleted',
  'MentionInMessage',
  'TicketUpdate',
  'PrReviewRequested',
  'AgentCompleted',
  'MeetingReminder',
  'DocumentShared',
  'SystemAlert',
] as const
type TypeFilter = (typeof TYPE_FILTERS)[number]

const typeConfig: Record<NotificationTypeTag, { icon: typeof Bell; label: string; cls: string; dot: string }> = {
  TaskAssigned: {
    icon: UserCheck,
    label: 'Task Assigned',
    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  TaskCompleted: {
    icon: CheckCircle2,
    label: 'Task Completed',
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  MentionInMessage: {
    icon: AtSign,
    label: 'Mention',
    cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  TicketUpdate: {
    icon: Ticket,
    label: 'Ticket Update',
    cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  PrReviewRequested: {
    icon: GitPullRequest,
    label: 'PR Review',
    cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  AgentCompleted: {
    icon: Bot,
    label: 'Agent Completed',
    cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
  },
  MeetingReminder: {
    icon: Calendar,
    label: 'Meeting Reminder',
    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  DocumentShared: {
    icon: FileText,
    label: 'Document Shared',
    cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  SystemAlert: {
    icon: AlertTriangle,
    label: 'System Alert',
    cls: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

const priorityConfig: Record<PriorityTag, { cls: string; dot: string }> = {
  Low: { cls: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' },
  Normal: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  High: { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
  Urgent: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', dot: 'bg-red-500' },
}

function typeFilterLabel(tag: TypeFilter): string {
  if (tag === 'All') return 'All'
  return typeConfig[tag]?.label ?? tag
}

function timeAgo(ts: any): string {
  try {
    const diff = Date.now() - ts.toDate().getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  } catch {
    return ''
  }
}

function getDateGroup(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86_400_000)
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

    if (d >= today) return 'Today'
    if (d >= yesterday) return 'Yesterday'
    if (d >= weekAgo) return 'This Week'
    return d.toLocaleDateString([], { month: 'long', year: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

// =============================================================================

export default function NotificationsPage() {
  const { currentOrgId } = useOrg()
  const auth = useAuth()
  const [allNotifications] = useTable(tables.notification)
  const markRead = useSpacetimeReducer(reducers.markNotificationRead)
  const dismiss = useSpacetimeReducer(reducers.dismissNotification)
  const markAllRead = useSpacetimeReducer(reducers.markAllNotificationsRead)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // All notifications for current org, newest first
  const notifications = useMemo(
    () =>
      [...allNotifications]
        .filter((n) => !n.dismissed)
        .sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allNotifications]
  )

  // Filtered
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesType = typeFilter === 'All' || n.notificationType.tag === typeFilter
      const matchesRead = !showUnreadOnly || !n.read
      return matchesType && matchesRead
    })
  }, [notifications, typeFilter, showUnreadOnly])

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = []
    const map = new Map<string, typeof filtered>()
    for (const n of filtered) {
      const label = getDateGroup(n.createdAt)
      if (!map.has(label)) {
        const items: typeof filtered = []
        map.set(label, items)
        groups.push({ label, items })
      }
      map.get(label)!.push(n)
    }
    return groups
  }, [filtered])

  // Stats
  const unreadCount = notifications.filter((n) => !n.read).length
  const todayCount = notifications.filter((n) => getDateGroup(n.createdAt) === 'Today').length
  const urgentCount = notifications.filter((n) => n.priority.tag === 'Urgent' || n.priority.tag === 'High').length

  const handleMarkRead = (notificationId: bigint) => {
    try {
      markRead({ notificationId })
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const handleDismiss = (notificationId: bigint) => {
    try {
      dismiss({ notificationId })
    } catch (err) {
      console.error('Failed to dismiss notification:', err)
    }
  }

  const handleMarkAllRead = () => {
    if (currentOrgId === null) return
    try {
      markAllRead({ orgId: BigInt(currentOrgId) })
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <Bell className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#f59e0b', '#f97316', '#ea580c', '#f59e0b']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                Notifications
              </GradientText>
              <p className="text-xs text-muted-foreground">Stay on top of everything</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={showUnreadOnly ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : ''}
            >
              <Filter className="size-3.5 mr-1.5" />
              {showUnreadOnly ? 'Unread Only' : 'Show All'}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="size-3.5 mr-1.5" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unread</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={unreadCount} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="size-4 text-amber-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={todayCount} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Inbox className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">High Priority</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={urgentCount} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="size-4 text-red-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {TYPE_FILTERS.map((t) => {
            const config = t !== 'All' ? typeConfig[t] : null
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  typeFilter === t
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {config && <span className={`size-1.5 rounded-full ${config.dot}`} />}
                {typeFilterLabel(t)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-3">
              <Bell className="size-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">
              {showUnreadOnly ? 'All caught up! No unread notifications.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-2">
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="sticky top-0 z-10 px-6 py-2 backdrop-blur-md bg-background/80">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>

                {/* Notifications in group */}
                <div className="space-y-px">
                  {group.items.map((notification) => {
                    const config = typeConfig[notification.notificationType.tag as NotificationTypeTag]
                    const Icon = config?.icon ?? Bell
                    const priorityCfg = priorityConfig[notification.priority.tag as PriorityTag]
                    const isUnread = !notification.read

                    return (
                      <div
                        key={String(notification.id)}
                        className={`group relative flex items-start gap-3 px-6 py-3 transition-colors hover:bg-muted/50 ${
                          isUnread ? 'bg-amber-500/[0.03]' : ''
                        }`}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <span className="absolute left-2 top-5 size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}

                        {/* Type icon */}
                        <div className={`rounded-lg p-2 mt-0.5 shrink-0 ${config?.cls ?? 'bg-muted'}`}>
                          <Icon className="size-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.body}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                              {timeAgo(notification.createdAt)}
                            </span>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config?.cls ?? ''}`}>
                              {config?.label ?? notification.notificationType.tag}
                            </span>
                            {(notification.priority.tag === 'High' || notification.priority.tag === 'Urgent') && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityCfg?.cls ?? ''}`}>
                                <span className={`size-1 rounded-full ${priorityCfg?.dot ?? ''}`} />
                                {notification.priority.tag}
                              </span>
                            )}
                            {notification.link && (
                              <a
                                href={notification.link}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View Details
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handleMarkRead(notification.id)}
                              title="Mark as read"
                            >
                              <CheckCheck className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleDismiss(notification.id)}
                            title="Dismiss"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
