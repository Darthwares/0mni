'use client'

import { useTable, useSpacetimeDB, useReducer } from 'spacetimedb/react'
import { useMemo, useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  MessageSquare,
  KanbanSquare,
  PenTool,
  Activity,
  Users,
  Globe,
  MapPin,
  Check,
  X,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Edit3,
  Trash2,
  Star,
  Clock,
  Sparkles,
  Zap,
  Target,
  Layers,
  TrendingUp,
  CalendarClock,
  Bell,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react'

const LiveGlobe = dynamic(() => import('@/components/live-globe').then(m => ({ default: m.LiveGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading globe...</div>
    </div>
  ),
})

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(ts: any): string {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(Number(ts))
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
    return d.toLocaleDateString()
  } catch { return '' }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'Created': return <FileText className="size-3.5 text-emerald-400" />
    case 'Completed': return <CheckCircle2 className="size-3.5 text-emerald-400" />
    case 'Updated': return <Edit3 className="size-3.5 text-blue-400" />
    case 'Deleted': return <Trash2 className="size-3.5 text-red-400" />
    case 'Assigned': return <UserPlus className="size-3.5 text-violet-400" />
    case 'Escalated': return <AlertCircle className="size-3.5 text-amber-400" />
    case 'Commented': return <MessageSquare className="size-3.5 text-blue-400" />
    default: return <Activity className="size-3.5 text-neutral-400" />
  }
}

function getActionVerb(action: string) {
  switch (action) {
    case 'Created': return 'created'
    case 'Updated': return 'updated'
    case 'Deleted': return 'deleted'
    case 'Assigned': return 'assigned'
    case 'Completed': return 'completed'
    case 'Escalated': return 'escalated'
    case 'Commented': return 'commented on'
    case 'Called': return 'called'
    case 'Emailed': return 'emailed'
    default: return action.toLowerCase()
  }
}

export default function DashboardPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId, isGlobalOrg, orgMembers } = useOrg()
  const [allMessages] = useTable(tables.message)
  const [allChannels] = useTable(tables.channel)
  const [allTasks] = useTable(tables.task)
  const [allDocuments] = useTable(tables.document)
  const [allEmployees] = useTable(tables.employee)
  const [allActivityLogs] = useTable(tables.activity_log)
  const [allSprints] = useTable(tables.sprint)
  const [allEpics] = useTable(tables.epic)
  const [allTaskExtensions] = useTable(tables.task_extension)
  const [allNotifications] = useTable(tables.notification)
  const [allDeals] = useTable(tables.deal)
  const [allTickets] = useTable(tables.ticket)

  const myHex = identity?.toHexString() ?? ''
  const setUserLocation = useReducer(reducers.setUserLocation)

  // Location sharing state
  const [locationShared, setLocationShared] = useState<boolean | null>(null)
  useEffect(() => {
    const stored = localStorage.getItem('0mni-location-shared')
    setLocationShared(stored !== null && stored !== 'denied' ? true : stored === 'denied' ? false : null)
  }, [])

  const handleShareLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        localStorage.setItem('0mni-location-shared', JSON.stringify({ latitude, longitude, ts: Date.now() }))
        // Persist to SpacetimeDB so globe shows real location
        try { setUserLocation({ latitude, longitude }) } catch {}
        setLocationShared(true)
      },
      () => {
        localStorage.setItem('0mni-location-shared', 'denied')
        setLocationShared(false)
      }
    )
  }

  // On mount, if location was previously shared, re-sync to DB
  useEffect(() => {
    const stored = localStorage.getItem('0mni-location-shared')
    if (stored && stored !== 'denied') {
      try {
        const { latitude, longitude } = JSON.parse(stored)
        if (latitude && longitude) {
          setUserLocation({ latitude, longitude }).catch(() => {})
        }
      } catch {}
    }
  }, [setUserLocation])

  const employeeMap = useMemo(
    () => new Map(allEmployees.map(e => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Filter to current org
  const orgChannels = useMemo(
    () => allChannels.filter(c => Number(c.orgId) === currentOrgId),
    [allChannels, currentOrgId]
  )
  const orgChannelIds = useMemo(
    () => new Set(orgChannels.map(c => c.id)),
    [orgChannels]
  )
  const orgMessages = useMemo(
    () => allMessages.filter(m => m.contextType.tag === 'Channel' && orgChannelIds.has(m.contextId)),
    [allMessages, orgChannelIds]
  )
  const orgTasks = useMemo(
    () => allTasks.filter(t => Number(t.orgId) === currentOrgId),
    [allTasks, currentOrgId]
  )
  const orgDocs = useMemo(
    () => allDocuments.filter(d => Number(d.orgId) === currentOrgId),
    [allDocuments, currentOrgId]
  )

  // Build unified feed items from activity logs + recent messages
  type FeedItem = {
    id: string
    type: 'activity' | 'message'
    timestamp: number
    actorHex: string
    content: string
    metadata?: string
    action?: string
    entityType?: string
    channelName?: string
  }

  const feedItems = useMemo(() => {
    const items: FeedItem[] = []

    // Activity logs
    for (const log of allActivityLogs) {
      try {
        items.push({
          id: `act-${log.id}`,
          type: 'activity',
          timestamp: log.timestamp.toDate?.().getTime() ?? 0,
          actorHex: log.actor.toHexString(),
          content: `${getActionVerb(log.action.tag)} ${log.entityType} #${log.entityId}`,
          metadata: log.metadata ?? undefined,
          action: log.action.tag,
          entityType: log.entityType,
        })
      } catch {}
    }

    // Recent messages (non-DM channels only, show as chat activity)
    for (const msg of orgMessages) {
      if (msg.content.startsWith('[system]')) continue
      const channel = orgChannels.find(c => c.id === msg.contextId)
      if (!channel || channel.name.startsWith('dm-')) continue
      try {
        items.push({
          id: `msg-${msg.id}`,
          type: 'message',
          timestamp: msg.sentAt.toDate?.().getTime() ?? 0,
          actorHex: msg.sender.toHexString(),
          content: msg.content,
          channelName: channel.name,
        })
      } catch {}
    }

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
  }, [allActivityLogs, orgMessages, orgChannels])

  // Stats
  const recentMessageCount = orgMessages.length
  const activeChannelCount = orgChannels.filter(c => !c.name.startsWith('dm-')).length
  const openTaskCount = orgTasks.filter(t =>
    t.status.tag !== 'Completed' && t.status.tag !== 'Cancelled'
  ).length
  const docCount = orgDocs.length
  const onlineCount = orgMembers.filter(m => {
    const emp = employeeMap.get(m.identity?.toHexString?.() ?? '')
    return emp && (emp.status.tag === 'Online' || emp.status.tag === 'Busy')
  }).length

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const me = identity ? employeeMap.get(myHex) : null
  const firstName = me?.name?.split(' ')[0] ?? ''

  // Extension map for story points
  const extensionMap = useMemo(() => {
    const map = new Map<string, any>()
    allTaskExtensions.forEach((ext) => map.set(ext.taskId.toString(), ext))
    return map
  }, [allTaskExtensions])

  // My Tasks
  const myTasks = useMemo(() => {
    return orgTasks.filter((t) => {
      if (!identity) return false
      return t.assignee?.toHexString() === myHex &&
        t.status.tag !== 'Completed' && t.status.tag !== 'Cancelled'
    }).sort((a, b) => {
      const pOrder = ['Urgent', 'High', 'Medium', 'Low']
      return pOrder.indexOf(a.priority.tag) - pOrder.indexOf(b.priority.tag)
    }).slice(0, 6)
  }, [orgTasks, identity, myHex])

  // Active sprint
  const activeSprint = useMemo(() => {
    return allSprints.find((s) =>
      Number(s.orgId) === currentOrgId && s.status.tag === 'Active'
    ) || null
  }, [allSprints, currentOrgId])

  // Sprint stats
  const sprintStats = useMemo(() => {
    if (!activeSprint) return null
    const sprintId = activeSprint.id.toString()
    const tasks = orgTasks.filter((t) => {
      const ext = extensionMap.get(t.id.toString())
      return ext?.sprintId?.toString() === sprintId
    })
    const completed = tasks.filter((t) => t.status.tag === 'Completed').length
    const totalPoints = tasks.reduce((sum, t) => sum + (extensionMap.get(t.id.toString())?.storyPoints ?? 0), 0)
    const completedPoints = tasks.filter((t) => t.status.tag === 'Completed')
      .reduce((sum, t) => sum + (extensionMap.get(t.id.toString())?.storyPoints ?? 0), 0)
    return { total: tasks.length, completed, totalPoints, completedPoints }
  }, [activeSprint, orgTasks, extensionMap])

  // Task status distribution for chart
  const statusDistribution = useMemo(() => {
    const dist = { Unclaimed: 0, Claimed: 0, InProgress: 0, NeedsReview: 0, Completed: 0, Escalated: 0 }
    orgTasks.forEach((t) => {
      if (t.status.tag in dist) dist[t.status.tag as keyof typeof dist]++
    })
    return dist
  }, [orgTasks])

  // Weekly velocity — tasks completed per day (last 7 days)
  const weeklyVelocity = useMemo(() => {
    const days: { label: string; count: number }[] = []
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 86400000
      const dayEnd = dayStart + 86400000
      const label = new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' })
      const count = orgTasks.filter((t) => {
        if (t.status.tag !== 'Completed') return false
        try {
          const ts = t.completedAt?.toDate()?.getTime() ?? 0
          return ts >= dayStart && ts < dayEnd
        } catch { return false }
      }).length
      days.push({ label, count })
    }
    return days
  }, [orgTasks])

  const maxVelocity = Math.max(...weeklyVelocity.map((d) => d.count), 1)

  // Unread notifications
  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.read && !n.dismissed).length,
    [allNotifications]
  )

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const now = Date.now()
    return orgTasks.filter((t) => {
      if (t.status.tag === 'Completed' || t.status.tag === 'Cancelled') return false
      try {
        const due = t.dueAt?.toDate()?.getTime()
        return due && due < now
      } catch { return false }
    })
  }, [orgTasks])

  // Deals pipeline value
  const dealStats = useMemo(() => {
    const orgDeals = allDeals.filter((d) => Number(d.orgId) === currentOrgId)
    const totalValue = orgDeals.reduce((sum, d) => sum + Number(d.value), 0)
    const wonValue = orgDeals.filter((d) => d.stage.tag === 'ClosedWon')
      .reduce((sum, d) => sum + Number(d.value), 0)
    return { total: orgDeals.length, totalValue, wonValue }
  }, [allDeals, currentOrgId])

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          {isGlobalOrg ? (
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <Globe className="size-4 text-white" />
              </div>
              <GradientText
                colors={['#F59E0B', '#EA580C', '#F59E0B', '#D97706']}
                animationSpeed={6}
                className="font-bold"
              >
                World
              </GradientText>
            </h1>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">
            {isGlobalOrg ? 'Global workspace activity' : 'Here\'s what\'s happening in your workspace'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {unreadCount > 0 && (
            <Link href="/notifications">
              <div className="flex items-center gap-2 rounded-lg border bg-red-500/5 border-red-500/10 px-3 py-1.5 hover:bg-red-500/10 transition-colors cursor-pointer">
                <Bell className="size-3 text-red-500" />
                <span className="text-xs font-medium tabular-nums text-red-600 dark:text-red-400"><CountUp to={unreadCount} duration={1} /></span>
                <span className="text-[10px] text-red-500/70">unread</span>
              </div>
            </Link>
          )}
          <div className="flex items-center gap-2 rounded-lg border bg-emerald-500/5 border-emerald-500/10 px-3 py-1.5">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium tabular-nums"><CountUp to={onlineCount} duration={1} /></span>
            <span className="text-[10px] text-muted-foreground">online</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <Users className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium tabular-nums">{orgMembers.length}</span>
            <span className="text-[10px] text-muted-foreground">members</span>
          </div>
        </div>
      </div>

      {/* Live Globe — shows real-time message activity */}
      <div className="relative -mx-4 md:mx-0">
        <LiveGlobe />
      </div>

      {/* Location participate button */}
      {locationShared === null && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <MapPin className="size-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Join the Globe</p>
              <p className="text-xs text-muted-foreground">Share your location to appear on the live community map</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={handleShareLocation}
              >
                <Globe className="size-3.5 mr-1.5" />
                Participate
              </Button>
              <button
                onClick={() => {
                  localStorage.setItem('0mni-location-shared', 'denied')
                  setLocationShared(false)
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Prominent Messages CTA (mobile) */}
      <Link href="/messages" className="block md:hidden">
        <Card className="border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20">
              <MessageSquare className="size-6 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Messages</p>
              <p className="text-xs text-muted-foreground">{activeChannelCount} channels &middot; {recentMessageCount} messages</p>
            </div>
            <ArrowRight className="size-5 text-violet-400" />
          </CardContent>
        </Card>
      </Link>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SpotlightCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <KanbanSquare className="size-3.5 text-amber-500" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Open Tasks</span>
          </div>
          <p className="text-2xl font-bold tabular-nums"><CountUp to={openTaskCount} duration={1} /></p>
          {overdueTasks.length > 0 && (
            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="size-3" />
              {overdueTasks.length} overdue
            </p>
          )}
        </SpotlightCard>

        <SpotlightCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <MessageSquare className="size-3.5 text-violet-500" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Messages</span>
          </div>
          <p className="text-2xl font-bold tabular-nums"><CountUp to={recentMessageCount} duration={1} /></p>
          <p className="text-[10px] text-muted-foreground mt-1">{activeChannelCount} channels</p>
        </SpotlightCard>

        <SpotlightCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <PenTool className="size-3.5 text-blue-500" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Documents</span>
          </div>
          <p className="text-2xl font-bold tabular-nums"><CountUp to={docCount} duration={1} /></p>
        </SpotlightCard>

        <SpotlightCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">${Math.round(dealStats.totalValue / 100).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{dealStats.total} deals</p>
        </SpotlightCard>
      </div>

      {/* My Work + Sprint Progress (side by side on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Work */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="size-3" />
              My Work
            </h2>
            <Link href="/tickets" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {myTasks.length > 0 ? (
            <div className="space-y-2">
              {myTasks.map((task) => {
                const ext = extensionMap.get(task.id.toString())
                return (
                  <Link key={task.id.toString()} href="/tickets" className="block">
                    <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`size-2 rounded-full shrink-0 ${
                          task.priority.tag === 'Urgent' ? 'bg-red-500' :
                          task.priority.tag === 'High' ? 'bg-orange-500' :
                          task.priority.tag === 'Medium' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">T-{task.id.toString()}</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{task.status.tag.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                          </div>
                        </div>
                        {ext?.storyPoints != null && (
                          <span className="size-6 rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-500 flex items-center justify-center tabular-nums">
                            {ext.storyPoints}
                          </span>
                        )}
                        {task.dueAt && (() => {
                          try {
                            const due = task.dueAt.toDate()
                            const isOverdue = due.getTime() < Date.now()
                            return (
                              <span className={`text-[10px] ${isOverdue ? 'text-red-500' : 'text-muted-foreground'} flex items-center gap-0.5`}>
                                <CalendarClock className="size-3" />
                                {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )
                          } catch { return null }
                        })()}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No tasks assigned to you</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Panel */}
        <div className="space-y-4">
          {/* Sprint Progress */}
          {activeSprint && sprintStats && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-violet-500" />
                    <span className="text-sm font-medium">{activeSprint.name}</span>
                  </div>
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {sprintStats.completed}<span className="text-sm text-muted-foreground font-normal">/{sprintStats.total}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">tasks done</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-violet-500">
                      {sprintStats.completedPoints}<span className="text-sm text-muted-foreground font-normal">/{sprintStats.totalPoints}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">story points</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                    style={{ width: sprintStats.total > 0 ? `${(sprintStats.completed / sprintStats.total) * 100}%` : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Velocity Chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="size-3" />
                Weekly Velocity
              </h3>
              <div className="flex items-end gap-1.5 h-20">
                {weeklyVelocity.map((day, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${
                            day.count > 0
                              ? 'bg-gradient-to-t from-violet-500/60 to-violet-400/60'
                              : 'bg-muted/30'
                          }`}
                          style={{ height: `${Math.max(4, (day.count / maxVelocity) * 64)}px` }}
                        />
                        <span className="text-[9px] text-muted-foreground">{day.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {day.count} completed
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Task Status Distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <KanbanSquare className="size-3" />
                Task Distribution
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'Unclaimed', label: 'Backlog', color: 'bg-neutral-400' },
                  { key: 'InProgress', label: 'In Progress', color: 'bg-amber-500' },
                  { key: 'NeedsReview', label: 'Review', color: 'bg-violet-500' },
                  { key: 'Completed', label: 'Done', color: 'bg-emerald-500' },
                ].map(({ key, label, color }) => {
                  const count = statusDistribution[key as keyof typeof statusDistribution] || 0
                  const total = orgTasks.length || 1
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16 text-right">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium tabular-nums w-6 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/messages" className="group">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer border-violet-500/20 hover:border-violet-500/40 hover:-translate-y-0.5">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <MessageSquare className="size-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Messages</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">{activeChannelCount} channels</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tickets" className="group">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer hover:border-amber-500/30 hover:-translate-y-0.5">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <KanbanSquare className="size-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Tickets</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">{openTaskCount} open</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/canvas" className="group">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer hover:border-blue-500/30 hover:-translate-y-0.5">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <PenTool className="size-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Canvas</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">{docCount} docs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity feed */}
      <div className="space-y-1">
        <div className="flex items-center justify-between py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3" />
            Activity Feed
          </h2>
          <Badge className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10 tabular-nums">
            {feedItems.length} updates
          </Badge>
        </div>

        {feedItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="size-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a conversation in{' '}
                <Link href="/messages" className="text-violet-400 hover:underline">Messages</Link>
                {' '}to get things going!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {feedItems.map((item) => {
              const actor = employeeMap.get(item.actorHex)
              const actorName = actor?.name ?? `user-${item.actorHex.slice(0, 8)}`
              const isMe = item.actorHex === myHex

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-3 md:p-4">
                    {/* Post header */}
                    <div className="flex items-start gap-2.5 md:gap-3">
                      <Avatar className="size-8 md:size-9 shrink-0">
                        {actor?.avatarUrl && <AvatarImage src={actor.avatarUrl} />}
                        <AvatarFallback className={`text-xs text-white ${avatarColor(actorName)}`}>
                          {getInitials(actorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {actorName}
                            {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="size-3" />
                            {timeAgo({ toDate: () => new Date(item.timestamp) })}
                          </span>
                        </div>

                        {item.type === 'message' ? (
                          <>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] gap-0.5 py-0 px-1.5 h-4">
                                <MessageSquare className="size-2.5" />
                                #{item.channelName}
                              </Badge>
                            </div>
                            <p className="text-sm mt-2 text-foreground/90 whitespace-pre-wrap break-words line-clamp-4">
                              {item.content}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1">
                            {getActionIcon(item.action ?? '')}
                            <span className="text-sm text-foreground/80">
                              {item.content}
                            </span>
                          </div>
                        )}

                        {item.metadata && (
                          <p className="text-xs text-muted-foreground mt-1.5 truncate">
                            {item.metadata}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
  )
}
