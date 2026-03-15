'use client'

import { useTable, useSpacetimeDB, useReducer } from 'spacetimedb/react'
import { useMemo, useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare,
  KanbanSquare,
  PenTool,
  Activity,
  Users,
  Globe,
  MapPin,
  X,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Edit3,
  Trash2,
  Clock,
  Headphones,
  TrendingUp,
  Bot,
  Zap,
  BarChart3,
  Mail,
  Code2,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

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
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allPRs] = useTable(tables.pull_request)

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

  // Build unified feed
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

  // Stats
  const recentMessageCount = orgMessages.length
  const activeChannelCount = orgChannels.filter(c => !c.name.startsWith('dm-')).length
  const openTaskCount = orgTasks.filter(t =>
    t.status.tag !== 'Complete' && t.status.tag !== 'Cancelled'
  ).length
  const docCount = orgDocs.length
  const onlineCount = orgMembers.filter(m => {
    const emp = employeeMap.get(m.identity?.toHexString?.() ?? '')
    return emp && (emp.status.tag === 'Online' || emp.status.tag === 'Busy')
  }).length
  const humanCount = allEmployees.filter(e => e.employeeType.tag === 'Human').length
  const aiCount = allEmployees.filter(e => e.employeeType.tag === 'AiAgent').length
  const openTickets = allTickets.filter(t => t.status.tag !== 'Closed' && t.status.tag !== 'Resolved').length
  const activeLeads = allLeads.filter(l => l.status.tag !== 'Converted' && l.status.tag !== 'Lost').length
  const activeCandidates = allCandidates.filter(c => c.status.tag !== 'Hired' && c.status.tag !== 'Rejected').length
  const openPRs = allPRs.filter(p => p.status.tag === 'Open' || p.status.tag === 'InReview').length

  // Quick-nav modules
  const quickNavModules = [
    { href: '/messages', label: 'Messages', icon: MessageSquare, stat: `${activeChannelCount} channels`, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', spotlight: 'rgba(139, 92, 246, 0.12)' },
    { href: '/tickets', label: 'Tickets', icon: KanbanSquare, stat: `${openTaskCount} open`, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', spotlight: 'rgba(245, 158, 11, 0.12)' },
    { href: '/canvas', label: 'Canvas', icon: PenTool, stat: `${docCount} docs`, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', spotlight: 'rgba(59, 130, 246, 0.12)' },
    { href: '/support', label: 'Support', icon: Headphones, stat: `${openTickets} open`, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', spotlight: 'rgba(168, 85, 247, 0.12)', globalHidden: true },
    { href: '/sales', label: 'Sales', icon: TrendingUp, stat: `${activeLeads} leads`, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', spotlight: 'rgba(16, 185, 129, 0.12)', globalHidden: true },
    { href: '/recruitment', label: 'Recruitment', icon: Users, stat: `${activeCandidates} active`, gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20', spotlight: 'rgba(236, 72, 153, 0.12)', globalHidden: true },
    { href: '/engineering', label: 'Engineering', icon: Code2, stat: `${openPRs} PRs`, gradient: 'from-orange-500 to-red-600', shadow: 'shadow-orange-500/20', spotlight: 'rgba(249, 115, 22, 0.12)', globalHidden: true },
    { href: '/email', label: 'Email', icon: Mail, stat: 'Inbox', gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20', spotlight: 'rgba(14, 165, 233, 0.12)', globalHidden: true },
  ]

  const visibleModules = isGlobalOrg ? quickNavModules.filter(m => !m.globalHidden) : quickNavModules

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

          {/* ---- Hero header ---- */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
                <Zap className="size-5.5 text-white" />
              </div>
              <div>
                <GradientText
                  colors={['#6366f1', '#8b5cf6', '#a855f7', '#6366f1']}
                  animationSpeed={5}
                  className="text-2xl font-bold"
                >
                  {isGlobalOrg ? 'World' : 'Dashboard'}
                </GradientText>
                <p className="text-xs text-muted-foreground">
                  {isGlobalOrg ? 'Global workspace overview' : 'Your AI-powered command center'}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium tabular-nums"><CountUp to={onlineCount} /> online</span>
              </div>
              <span className="text-muted-foreground">&middot;</span>
              <span className="text-muted-foreground tabular-nums">{humanCount} humans &middot; {aiCount} AI</span>
            </div>
          </div>

          {/* ---- Top KPI row ---- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Messages</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    <CountUp to={recentMessageCount} />
                  </p>
                </div>
                <div className="size-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <MessageSquare className="size-4 text-violet-500" />
                </div>
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Open Tasks</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    <CountUp to={openTaskCount} />
                  </p>
                </div>
                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <KanbanSquare className="size-4 text-amber-500" />
                </div>
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    <CountUp to={docCount} />
                  </p>
                </div>
                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="size-4 text-blue-500" />
                </div>
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Team</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    <CountUp to={orgMembers.length} />
                  </p>
                </div>
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Users className="size-4 text-emerald-500" />
                </div>
              </div>
            </SpotlightCard>
          </div>

          {/* ---- Globe ---- */}
          <div className="relative -mx-6 md:mx-0">
            <LiveGlobe />
          </div>

          {/* Location participate */}
          {locationShared === null && (
            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.1)" className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                  <MapPin className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Join the Globe</p>
                  <p className="text-xs text-muted-foreground">Share your location to appear on the live community map</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
                    onClick={handleShareLocation}
                  >
                    <Globe className="size-3.5 mr-1.5" />
                    Participate
                  </Button>
                  <button
                    onClick={() => { localStorage.setItem('0mni-location-shared', 'denied'); setLocationShared(false) }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            </SpotlightCard>
          )}

          {/* ---- Module quick-nav ---- */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modules</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {visibleModules.map((mod) => {
                const Icon = mod.icon
                return (
                  <Link key={mod.href} href={mod.href} className="group">
                    <SpotlightCard
                      spotlightColor={mod.spotlight}
                      className="rounded-xl border bg-card p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`size-8 rounded-lg bg-gradient-to-br ${mod.gradient} ${mod.shadow} shadow-lg flex items-center justify-center shrink-0`}>
                          <Icon className="size-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{mod.label}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{mod.stat}</p>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </SpotlightCard>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ---- Activity Feed ---- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="size-3.5" />
                Activity Feed
              </h2>
              <span className="text-[10px] text-muted-foreground tabular-nums">{feedItems.length} updates</span>
            </div>

            {feedItems.length === 0 ? (
              <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.08)" className="rounded-xl border bg-card">
                <div className="py-12 text-center">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                    <Activity className="size-5 opacity-40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a conversation in{' '}
                    <Link href="/messages" className="text-violet-500 hover:underline">Messages</Link>
                    {' '}to get things going!
                  </p>
                </div>
              </SpotlightCard>
            ) : (
              <div className="space-y-1.5">
                {feedItems.map((item) => {
                  const actor = employeeMap.get(item.actorHex)
                  const actorName = actor?.name ?? `user-${item.actorHex.slice(0, 8)}`
                  const isMe = item.actorHex === myHex

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <Avatar className="size-8 shrink-0">
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
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                              <Clock className="size-2.5" />
                              {timeAgo({ toDate: () => new Date(item.timestamp) })}
                            </span>
                          </div>

                          {item.type === 'message' ? (
                            <>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 mt-0.5">
                                <MessageSquare className="size-2" />
                                #{item.channelName}
                              </span>
                              <p className="text-sm mt-1.5 text-foreground/90 whitespace-pre-wrap break-words line-clamp-3">
                                {item.content}
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getActionIcon(item.action ?? '')}
                              <span className="text-sm text-foreground/80">{item.content}</span>
                            </div>
                          )}

                          {item.metadata && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.metadata}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
