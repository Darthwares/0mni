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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
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
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Edit3,
  Trash2,
  Star,
  Clock,
  TrendingUp,
  Headphones,
  Bot,
  Zap,
  BarChart3,
  Mail,
  Shield,
  Briefcase,
  Code2,
  Sparkles,
} from 'lucide-react'

const LiveGlobe = dynamic(() => import('@/components/live-globe').then(m => ({ default: m.LiveGlobe })), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square max-w-[420px] mx-auto flex items-center justify-center">
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

const actionColors: Record<string, string> = {
  Created: 'bg-emerald-500',
  Completed: 'bg-emerald-400',
  Updated: 'bg-blue-500',
  Deleted: 'bg-red-500',
  Assigned: 'bg-violet-500',
  Escalated: 'bg-amber-500',
  Commented: 'bg-sky-500',
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

  const myHex = identity?.toHexString() ?? ''
  const setUserLocation = useReducer(reducers.setUserLocation)
  const [feedTab, setFeedTab] = useState<'all' | 'messages' | 'activity'>('all')

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
        try { setUserLocation({ latitude, longitude }) } catch {}
        setLocationShared(true)
      },
      () => {
        localStorage.setItem('0mni-location-shared', 'denied')
        setLocationShared(false)
      }
    )
  }

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

  // Unified feed
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

  const filteredFeed = useMemo(() => {
    if (feedTab === 'all') return feedItems
    return feedItems.filter(i => i.type === (feedTab === 'messages' ? 'message' : 'activity'))
  }, [feedItems, feedTab])

  // Stats
  const recentMessageCount = orgMessages.length
  const activeChannelCount = orgChannels.filter(c => !c.name.startsWith('dm-')).length
  const openTaskCount = orgTasks.filter(t =>
    t.status.tag !== 'Completed' && t.status.tag !== 'Cancelled'
  ).length
  const completedTaskCount = orgTasks.filter(t => t.status.tag === 'Completed').length
  const docCount = orgDocs.length
  const onlineCount = orgMembers.filter(m => {
    const emp = employeeMap.get(m.identity?.toHexString?.() ?? '')
    return emp && (emp.status.tag === 'Online' || emp.status.tag === 'Busy')
  }).length

  // Action breakdown for mini chart
  const actionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of feedItems) {
      if (item.action) {
        counts[item.action] = (counts[item.action] || 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [feedItems])

  // Quick stats cards config
  const statCards = [
    {
      label: 'Messages',
      value: recentMessageCount,
      icon: MessageSquare,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      spotColor: 'rgba(139, 92, 246, 0.15)',
      href: '/messages',
    },
    {
      label: 'Open Tasks',
      value: openTaskCount,
      icon: KanbanSquare,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      spotColor: 'rgba(245, 158, 11, 0.15)',
      href: '/tickets',
    },
    {
      label: 'Documents',
      value: docCount,
      icon: PenTool,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      spotColor: 'rgba(59, 130, 246, 0.15)',
      href: '/canvas',
    },
    {
      label: 'Online Now',
      value: onlineCount,
      icon: Users,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      spotColor: 'rgba(16, 185, 129, 0.15)',
      href: '#',
    },
  ]

  // Module nav cards — quick access to all Omni modules
  const moduleCards = [
    { label: 'Messages', desc: `${activeChannelCount} channels`, icon: MessageSquare, href: '/messages', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Tickets', desc: `${openTaskCount} open`, icon: KanbanSquare, href: '/tickets', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Canvas', desc: `${docCount} docs`, icon: PenTool, href: '/canvas', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Email', desc: 'Inbox', icon: Mail, href: '/email', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Support', desc: 'Help desk', icon: Headphones, href: '/support', color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Sales & CRM', desc: 'Pipeline', icon: Briefcase, href: '/sales', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Engineering', desc: 'Code & PRs', icon: Code2, href: '/engineering', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'AI Agents', desc: 'Fleet', icon: Bot, href: '/ai-employees', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Hero header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isGlobalOrg ? (
              <span className="flex items-center gap-2">
                <Globe className="size-6 text-amber-500" />
                <GradientText colors={['#F59E0B', '#EF4444', '#8B5CF6']} animationSpeed={4} className="text-2xl font-bold">
                  World
                </GradientText>
              </span>
            ) : (
              <GradientText colors={['#8B5CF6', '#3B82F6', '#10B981']} animationSpeed={4} className="text-2xl font-bold">
                Dashboard
              </GradientText>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGlobalOrg ? 'Global workspace overview' : 'Your workspace at a glance'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{onlineCount} online</span>
          </div>
          <span className="text-muted-foreground/50">&middot;</span>
          <span>{orgMembers.length} members</span>
        </div>
      </div>

      {/* Stats row with SpotlightCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Link href={card.href} key={card.label}>
            <SpotlightCard
              className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow h-full"
              spotlightColor={card.spotColor}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`size-4 ${card.color}`} />
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground/40" />
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  <CountUp to={card.value} duration={1.2} separator="," />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </SpotlightCard>
          </Link>
        ))}
      </div>

      {/* Two-column layout: Globe + Module nav */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Live Globe */}
        <div className="relative">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative -mx-0">
                <LiveGlobe />
              </div>
              {/* Location participate strip */}
              {locationShared === null && (
                <div className="px-4 py-3 border-t bg-amber-500/5 flex items-center gap-3">
                  <MapPin className="size-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-muted-foreground flex-1">Share your location to appear on the live globe</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={handleShareLocation}
                  >
                    <Globe className="size-3 mr-1" />
                    Join
                  </Button>
                  <button
                    onClick={() => {
                      localStorage.setItem('0mni-location-shared', 'denied')
                      setLocationShared(false)
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Module quick-access grid */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" />
                Quick Access
              </h3>
              <Badge variant="outline" className="text-[10px] h-5">
                {moduleCards.length} modules
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moduleCards.map((mod) => (
                <Link href={mod.href} key={mod.label} className="group">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-all">
                    <div className={`p-1.5 rounded-md ${mod.bg}`}>
                      <mod.icon className={`size-3.5 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{mod.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{mod.desc}</p>
                    </div>
                    <ArrowRight className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task completion + action breakdown row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Task completion rate */}
        <SpotlightCard
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          spotlightColor="rgba(16, 185, 129, 0.12)"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Task Completion
              </h3>
              <Badge variant="secondary" className="text-[10px] h-5">
                {completedTaskCount}/{orgTasks.length}
              </Badge>
            </div>
            {orgTasks.length > 0 ? (
              <>
                <div className="flex items-end gap-3 mb-3">
                  <div className="text-3xl font-bold tabular-nums">
                    <CountUp
                      to={Math.round((completedTaskCount / orgTasks.length) * 100)}
                      duration={1.5}
                    />
                    <span className="text-lg text-muted-foreground">%</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-500 mb-1">
                    <TrendingUp className="size-3" />
                    on track
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                    style={{ width: `${(completedTaskCount / orgTasks.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                  <span>{completedTaskCount} completed</span>
                  <span>{openTaskCount} open</span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <KanbanSquare className="size-6 mx-auto mb-2 opacity-30" />
                No tasks yet
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Action breakdown */}
        <SpotlightCard
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          spotlightColor="rgba(139, 92, 246, 0.12)"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-violet-500" />
                Activity Breakdown
              </h3>
              <Badge variant="secondary" className="text-[10px] h-5">
                {feedItems.filter(i => i.type === 'activity').length} events
              </Badge>
            </div>
            {actionBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {actionBreakdown.map(([action, count]) => {
                  const total = feedItems.filter(i => i.type === 'activity').length
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={action} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-24 shrink-0">
                        {getActionIcon(action)}
                        <span className="text-xs truncate">{action}</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${actionColors[action] ?? 'bg-neutral-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Activity className="size-6 mx-auto mb-2 opacity-30" />
                No activity yet
              </div>
            )}
          </div>
        </SpotlightCard>
      </div>

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

      {/* Activity feed with tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Live Feed
          </h2>
          <Tabs value={feedTab} onValueChange={(v) => setFeedTab(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-xs px-2.5 h-5">All</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs px-2.5 h-5">Chat</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs px-2.5 h-5">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredFeed.length === 0 ? (
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
            {filteredFeed.map((item) => {
              const actor = employeeMap.get(item.actorHex)
              const actorName = actor?.name ?? `user-${item.actorHex.slice(0, 8)}`
              const isMe = item.actorHex === myHex

              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 md:p-4">
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
                            <p className="text-sm mt-2 text-foreground/90 whitespace-pre-wrap break-words line-clamp-3">
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
  )
}
