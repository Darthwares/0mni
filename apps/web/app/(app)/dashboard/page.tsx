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
} from 'lucide-react'
import CountUp from '@/components/reactbits/CountUp'
import GradientText from '@/components/reactbits/GradientText'

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isGlobalOrg ? (
              <span className="flex items-center gap-2">
                <Globe className="size-5 text-amber-500" />
                <GradientText colors={['#F59E0B', '#F97316', '#EF4444']} animationSpeed={6} className="text-xl font-semibold">
                  World
                </GradientText>
              </span>
            ) : (
              <GradientText colors={['#8B5CF6', '#6366F1', '#3B82F6']} animationSpeed={6} className="text-xl font-semibold">
                Feed
              </GradientText>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isGlobalOrg ? 'Global workspace activity' : 'Latest activity in your workspace'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="size-2 rounded-full bg-emerald-500" />
            {onlineCount} online
          </div>
          <span>&middot;</span>
          <span>{orgMembers.length} members</span>
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

      {/* Quick nav cards (desktop: 3-col, mobile: 2-col with messages hidden since it has its own CTA above) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link href="/messages" className="group hidden md:block">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-md cursor-pointer border-violet-500/20 hover:border-violet-500/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <MessageSquare className="size-5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Messages</p>
                <p className="text-xs text-muted-foreground"><CountUp to={activeChannelCount} duration={1.2} className="font-medium" /> channels</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/tickets" className="group">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="p-3 md:p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <KanbanSquare className="size-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Tickets</p>
                <p className="text-xs text-muted-foreground"><CountUp to={openTaskCount} duration={1.2} className="font-medium" /> open</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/canvas" className="group">
          <Card className="hover:ring-ring/30 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="p-3 md:p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <PenTool className="size-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Canvas</p>
                <p className="text-xs text-muted-foreground"><CountUp to={docCount} duration={1.2} className="font-medium" /> docs</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity feed */}
      <div className="space-y-1">
        <div className="flex items-center justify-between py-2">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Activity Feed
          </h2>
          <Badge variant="outline" className="text-[10px]">
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
  )
}
