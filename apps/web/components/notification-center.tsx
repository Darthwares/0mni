'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  KanbanSquare,
  UserPlus,
  AlertTriangle,
  FileText,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Activity,
  CheckCheck,
  X,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
]

function nameToColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  Created: FileText,
  Updated: Pencil,
  Deleted: Trash2,
  Assigned: UserPlus,
  Completed: CheckCircle2,
  Escalated: AlertTriangle,
  Commented: MessageSquare,
  Called: Phone,
  Emailed: Mail,
}

const ACTION_COLORS: Record<string, string> = {
  Created: 'text-emerald-500 bg-emerald-500/10',
  Updated: 'text-blue-500 bg-blue-500/10',
  Deleted: 'text-red-500 bg-red-500/10',
  Assigned: 'text-violet-500 bg-violet-500/10',
  Completed: 'text-emerald-500 bg-emerald-500/10',
  Escalated: 'text-amber-500 bg-amber-500/10',
  Commented: 'text-sky-500 bg-sky-500/10',
  Called: 'text-indigo-500 bg-indigo-500/10',
  Emailed: 'text-violet-500 bg-violet-500/10',
}

type NotifItem = {
  id: string
  type: 'activity' | 'message' | 'task'
  timestamp: number
  actorHex: string
  title: string
  body: string
  href: string
  action?: string
}

const STORAGE_KEY = 'omni-notif-read'
const MAX_NOTIFICATIONS = 50

function loadReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    return new Set(JSON.parse(stored))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    // Only keep the most recent 200 read IDs to avoid bloat
    const arr = [...ids].slice(-200)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {}
}

// ── Component ────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'messages' | 'tasks' | 'activity'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds())
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { identity } = useSpacetimeDB()
  const [allActivityLogs] = useTable(tables.activity_log)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allChannels] = useTable(tables.channel)
  const [allTasks] = useTable(tables.task)

  const myHex = identity?.toHexString() ?? ''

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const channelMap = useMemo(
    () => new Map(allChannels.map((c) => [c.id.toString(), c])),
    [allChannels]
  )

  // Build unified notification list
  const notifications = useMemo(() => {
    const items: NotifItem[] = []

    // Activity logs (skip own actions)
    for (const log of allActivityLogs) {
      if (log.actor.toHexString() === myHex) continue
      try {
        const ts = log.timestamp.toDate?.()?.getTime() ?? 0
        if (!ts) continue
        const actorName = employeeMap.get(log.actor.toHexString())?.name ?? 'Someone'
        items.push({
          id: `act-${log.id}`,
          type: 'activity',
          timestamp: ts,
          actorHex: log.actor.toHexString(),
          title: `${actorName} ${log.action.tag.toLowerCase()} ${log.entityType}`,
          body: log.metadata ?? `#${log.entityId}`,
          href: log.entityType === 'Task' ? '/tickets' : log.entityType === 'Document' ? '/canvas' : '/activity',
          action: log.action.tag,
        })
      } catch {}
    }

    // Messages from others (non-DM channels I'm in)
    for (const msg of allMessages) {
      if (msg.sender.toHexString() === myHex) continue
      if (msg.deleted) continue
      if (msg.content.startsWith('[system]')) continue
      if (msg.contextType?.tag !== 'Channel') continue
      try {
        const ts = msg.sentAt.toDate?.()?.getTime() ?? 0
        if (!ts) continue
        const channel = channelMap.get(msg.contextId.toString())
        if (!channel) continue
        const senderName = employeeMap.get(msg.sender.toHexString())?.name ?? 'Someone'
        const isDm = channel.name.startsWith('dm-')
        items.push({
          id: `msg-${msg.id}`,
          type: 'message',
          timestamp: ts,
          actorHex: msg.sender.toHexString(),
          title: isDm ? `${senderName}` : `${senderName} in #${channel.name}`,
          body: msg.content.length > 120 ? msg.content.slice(0, 120) + '…' : msg.content,
          href: '/messages',
        })
      } catch {}
    }

    // Task assignments to me
    for (const task of allTasks) {
      if (!task.assignee) continue
      if (task.assignee.toHexString() !== myHex) continue
      try {
        const ts = task.createdAt?.toDate?.()?.getTime() ?? 0
        if (!ts) continue
        const creatorName = employeeMap.get(task.creator?.toHexString?.() ?? '')?.name ?? 'Someone'
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          timestamp: ts,
          actorHex: task.creator?.toHexString?.() ?? '',
          title: `${creatorName} assigned you a task`,
          body: task.title.length > 120 ? task.title.slice(0, 120) + '…' : task.title,
          href: '/tickets',
          action: 'Assigned',
        })
      } catch {}
    }

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_NOTIFICATIONS)
  }, [allActivityLogs, allMessages, allTasks, myHex, employeeMap, channelMap])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter((n) => {
      if (filter === 'messages') return n.type === 'message'
      if (filter === 'tasks') return n.type === 'task'
      return n.type === 'activity'
    })
  }, [notifications, filter])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  )

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      notifications.forEach((n) => next.add(n.id))
      saveReadIds(next)
      return next
    })
  }, [notifications])

  const handleClick = useCallback(
    (notif: NotifItem) => {
      markRead(notif.id)
      setOpen(false)
      router.push(notif.href)
    },
    [markRead, router]
  )

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'messages', label: 'Messages' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-500 text-[9px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] rounded-xl border bg-card shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllRead}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    <CheckCheck className="size-3" />
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-2 border-b flex gap-1 shrink-0">
              {filterButtons.map((fb) => (
                <button
                  key={fb.id}
                  onClick={() => setFilter(fb.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === fb.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {fb.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs mt-0.5">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div>
                  {filtered.map((notif, i) => {
                    const isRead = readIds.has(notif.id)
                    const emp = employeeMap.get(notif.actorHex)
                    const Icon = notif.action ? (ACTION_ICONS[notif.action] ?? Activity) : (notif.type === 'message' ? MessageSquare : KanbanSquare)
                    const colorClass = notif.action ? (ACTION_COLORS[notif.action] ?? 'text-neutral-500 bg-neutral-500/10') : (notif.type === 'message' ? 'text-blue-500 bg-blue-500/10' : 'text-violet-500 bg-violet-500/10')

                    return (
                      <motion.button
                        key={notif.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                        onClick={() => handleClick(notif)}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                          !isRead ? 'bg-primary/[0.03]' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar className="size-8">
                            {emp?.avatarUrl && <AvatarImage src={emp.avatarUrl} />}
                            <AvatarFallback className={`text-[10px] font-bold text-white ${nameToColor(emp?.name ?? 'U')}`}>
                              {getInitials(emp?.name ?? 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center ${colorClass}`}>
                            <Icon className="size-2.5" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs leading-tight ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                              {timeAgo(notif.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!isRead && (
                          <div className="shrink-0 mt-1.5">
                            <div className="size-2 rounded-full bg-blue-500" />
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setOpen(false)
                    router.push('/activity')
                  }}
                >
                  View all activity
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
