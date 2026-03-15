'use client'

import { useMemo, useState, useCallback } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Bell,
  CheckCheck,
  X,
  ClipboardList,
  CheckCircle2,
  AtSign,
  Ticket,
  GitPullRequest,
  Bot,
  Calendar,
  FileText,
  AlertTriangle,
} from 'lucide-react'

const typeIcons: Record<string, typeof Bell> = {
  TaskAssigned: ClipboardList,
  TaskCompleted: CheckCircle2,
  MentionInMessage: AtSign,
  TicketUpdate: Ticket,
  PrReviewRequested: GitPullRequest,
  AgentCompleted: Bot,
  MeetingReminder: Calendar,
  DocumentShared: FileText,
  SystemAlert: AlertTriangle,
}

const typeColors: Record<string, string> = {
  TaskAssigned: 'bg-blue-500/10 text-blue-500',
  TaskCompleted: 'bg-green-500/10 text-green-500',
  MentionInMessage: 'bg-violet-500/10 text-violet-500',
  TicketUpdate: 'bg-orange-500/10 text-orange-500',
  PrReviewRequested: 'bg-cyan-500/10 text-cyan-500',
  AgentCompleted: 'bg-fuchsia-500/10 text-fuchsia-500',
  MeetingReminder: 'bg-amber-500/10 text-amber-500',
  DocumentShared: 'bg-indigo-500/10 text-indigo-500',
  SystemAlert: 'bg-red-500/10 text-red-500',
}

const priorityDots: Record<string, string> = {
  Urgent: 'bg-red-500',
  High: 'bg-orange-500',
  Normal: 'bg-blue-500',
  Low: 'bg-gray-400',
}

function timeAgo(ts: any): string {
  try {
    const diff = Date.now() - ts.toDate().getTime()
    if (diff < 60_000) return 'now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
    return `${Math.floor(diff / 86_400_000)}d`
  } catch { return '' }
}

export function NotificationBell() {
  const { identity } = useSpacetimeDB()
  const { orgId } = useOrg()
  const [allNotifications] = useTable(tables.notification)
  const markRead = useSpacetimeReducer(reducers.markNotificationRead)
  const markAllRead = useSpacetimeReducer(reducers.markAllNotificationsRead)
  const dismiss = useSpacetimeReducer(reducers.dismissNotification)
  const [open, setOpen] = useState(false)

  const myNotifs = useMemo(() => {
    if (!identity) return []
    return [...allNotifications]
      .filter(n =>
        n.recipient.toHexString() === identity.toHexString() &&
        Number(n.orgId) === Number(orgId) &&
        !n.dismissed
      )
      .sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis()))
  }, [allNotifications, identity, orgId])

  const unreadCount = myNotifs.filter(n => !n.read).length

  const handleMarkAllRead = useCallback(() => {
    if (orgId) markAllRead(BigInt(orgId))
  }, [orgId, markAllRead])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[400px]">
          {myNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-0.5">You're all caught up</p>
            </div>
          ) : (
            <div>
              {myNotifs.map(notif => {
                const Icon = typeIcons[notif.notificationType.tag] ?? Bell
                const colorClass = typeColors[notif.notificationType.tag] ?? 'bg-gray-500/10 text-gray-500'
                const dotColor = priorityDots[notif.priority.tag] ?? priorityDots.Normal

                return (
                  <div
                    key={Number(notif.id)}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors hover:bg-muted/50 ${
                      !notif.read ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <div className={`rounded-full p-1.5 mt-0.5 shrink-0 ${colorClass}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notif.read ? 'font-medium' : ''}`}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.read && <div className={`size-1.5 rounded-full ${dotColor}`} />}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(notif.createdAt)}</span>
                        </div>
                      </div>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        {!notif.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-1.5 text-muted-foreground"
                            onClick={() => markRead(notif.id)}
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5 text-muted-foreground"
                          onClick={() => dismiss(notif.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
