'use client'

import { useTable, useSpacetimeDB, useReducer } from 'spacetimedb/react'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'motion/react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
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
  Sparkles,
  Zap,
  BarChart3,
  TrendingUp,
  Bot,
  ArrowUpRight,
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

/* ─── Stat card with mouse-tracking spotlight ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  index,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  href: string
  index: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const colorMap: Record<string, { bg: string; text: string; spotlight: string; border: string }> = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', spotlight: 'rgba(139,92,246,0.08)', border: 'hover:border-violet-500/30' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', spotlight: 'rgba(245,158,11,0.08)', border: 'hover:border-amber-500/30' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', spotlight: 'rgba(59,130,246,0.08)', border: 'hover:border-blue-500/30' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', spotlight: 'rgba(16,185,129,0.08)', border: 'hover:border-emerald-500/30' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', spotlight: 'rgba(244,63,94,0.08)', border: 'hover:border-rose-500/30' },
  }

  const c = colorMap[color] ?? colorMap.emerald

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={href}>
        <Card
          ref={cardRef}
          className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${c.border} hover:shadow-lg group`}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={isHovered ? {
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${c.spotlight}, transparent 70%)`,
          } : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon className={`size-4 ${c.text}`} />
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-y-0.5 translate-x-0.5" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight">
                <CountUp to={value} duration={1.2} separator="," />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

/* ─── Quick action card ─── */
function QuickNavCard({
  icon: Icon,
  label,
  description,
  href,
  color,
  index,
}: {
  icon: React.ElementType
  label: string
  description: string
  href: string
  color: string
  index: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const colorMap: Record<string, { bg: string; text: string; spotlight: string }> = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', spotlight: 'rgba(139,92,246,0.06)' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', spotlight: 'rgba(245,158,11,0.06)' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', spotlight: 'rgba(59,130,246,0.06)' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', spotlight: 'rgba(16,185,129,0.06)' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', spotlight: 'rgba(244,63,94,0.06)' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', spotlight: 'rgba(99,102,241,0.06)' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', spotlight: 'rgba(6,182,212,0.06)' },
  }
  const c = colorMap[color] ?? colorMap.emerald

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.06, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={href}>
        <div
          ref={cardRef}
          className="relative group flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={isHovered ? {
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${c.spotlight}, transparent 70%)`,
          } : undefined}
        >
          <div className={`p-2 rounded-lg ${c.bg} shrink-0`}>
            <Icon className={`size-4 ${c.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}

/* ─── Online presence strip ─── */
function PresenceStrip({
  employees,
  orgMembers,
}: {
  employees: Map<string, any>
  orgMembers: any[]
}) {
  const onlineMembers = useMemo(() => {
    return orgMembers
      .map(m => {
        const hex = m.identity?.toHexString?.() ?? ''
        const emp = employees.get(hex)
        return emp && (emp.status.tag === 'Online' || emp.status.tag === 'Busy') ? emp : null
      })
      .filter(Boolean)
      .slice(0, 12)
  }, [employees, orgMembers])

  if (onlineMembers.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-center gap-2"
    >
      <div className="flex -space-x-2">
        {onlineMembers.map((emp: any, i: number) => (
          <motion.div
            key={emp.id.toHexString()}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.04, type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Avatar className="size-7 border-2 border-background">
              {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} />}
              <AvatarFallback className={`text-[10px] text-white ${avatarColor(emp.name)}`}>
                {getInitials(emp.name)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {onlineMembers.length} online
      </span>
    </motion.div>
  )
}

/* ─── Main Dashboard ─── */
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

  // Feed tab state
  const [feedTab, setFeedTab] = useState<'all' | 'messages' | 'activity'>('all')
  const filteredFeed = useMemo(() => {
    if (feedTab === 'all') return feedItems
    return feedItems.filter(i => i.type === (feedTab === 'messages' ? 'message' : 'activity'))
  }, [feedItems, feedTab])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* ─── Header with presence ─── */}
      <div className="flex items-start justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {isGlobalOrg ? (
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Globe className="size-6 text-emerald-500" />
              </div>
              <div>
                <GradientText
                  className="text-2xl font-bold"
                  colors={['#10B981', '#14B8A6', '#06B6D4', '#14B8A6', '#10B981']}
                  animationSpeed={6}
                >
                  World
                </GradientText>
                <p className="text-sm text-muted-foreground">Global workspace</p>
              </div>
            </div>
          ) : (
            <div>
              <GradientText
                className="text-2xl font-bold"
                colors={['#10B981', '#14B8A6', '#06B6D4', '#14B8A6', '#10B981']}
                animationSpeed={6}
              >
                Dashboard
              </GradientText>
              <p className="text-sm text-muted-foreground mt-0.5">Your workspace at a glance</p>
            </div>
          )}
        </motion.div>

        <PresenceStrip employees={employeeMap} orgMembers={orgMembers} />
      </div>

      {/* ─── Stats grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Online now" value={onlineCount} color="emerald" href="/messages" index={0} />
        <StatCard icon={MessageSquare} label="Channels" value={activeChannelCount} color="violet" href="/messages" index={1} />
        <StatCard icon={KanbanSquare} label="Open tickets" value={openTaskCount} color="amber" href="/tickets" index={2} />
        <StatCard icon={CheckCircle2} label="Completed" value={completedTaskCount} color="blue" href="/tickets" index={3} />
        <StatCard icon={FileText} label="Documents" value={docCount} color="rose" href="/canvas" index={4} />
      </div>

      {/* ─── Live Globe ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative -mx-4 md:mx-0"
      >
        <LiveGlobe />
      </motion.div>

      {/* ─── Location CTA ─── */}
      <AnimatePresence>
        {locationShared === null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI Insights card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <Card className="relative overflow-hidden border-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
          <CardContent className="relative p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 shrink-0">
                <Sparkles className="size-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">AI Insights</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <Zap className="size-2.5 mr-0.5" />
                    Live
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {openTaskCount > 0 && (
                    <p className="flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-amber-500 shrink-0" />
                      <span><strong className="text-foreground">{openTaskCount}</strong> tickets need attention — {completedTaskCount > 0 ? `${completedTaskCount} resolved recently` : 'none resolved yet'}</span>
                    </p>
                  )}
                  {activeChannelCount > 0 && (
                    <p className="flex items-center gap-1.5">
                      <BarChart3 className="size-3 text-violet-500 shrink-0" />
                      <span><strong className="text-foreground">{activeChannelCount}</strong> active channels across the workspace</span>
                    </p>
                  )}
                  {onlineCount > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Users className="size-3 text-emerald-500 shrink-0" />
                      <span><strong className="text-foreground">{onlineCount}</strong> team members online right now</span>
                    </p>
                  )}
                  {feedItems.length === 0 && openTaskCount === 0 && (
                    <p>Your workspace is quiet. Start a conversation or create a ticket to get things moving!</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Quick navigation ─── */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3"
        >
          Quick Actions
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <QuickNavCard icon={MessageSquare} label="Messages" description={`${activeChannelCount} channels`} href="/messages" color="violet" index={0} />
          <QuickNavCard icon={KanbanSquare} label="Tickets" description={`${openTaskCount} open`} href="/tickets" color="amber" index={1} />
          <QuickNavCard icon={PenTool} label="Canvas" description={`${docCount} documents`} href="/canvas" color="blue" index={2} />
          <QuickNavCard icon={Bot} label="AI Employees" description="Manage AI agents" href="/ai-employees" color="emerald" index={3} />
          <QuickNavCard icon={Sparkles} label="Agent Studio" description="Build AI workflows" href="/agent-studio" color="indigo" index={4} />
          <QuickNavCard icon={Activity} label="Activity" description="Event log" href="/activity" color="cyan" index={5} />
        </div>
      </div>

      {/* ─── Activity Feed ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="size-3" />
              Activity Feed
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {feedItems.length} updates
            </Badge>
          </motion.div>

          {/* Feed tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative flex items-center bg-muted/50 rounded-lg p-0.5 text-xs"
          >
            {(['all', 'messages', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFeedTab(tab)}
                className={`relative px-2.5 py-1 rounded-md capitalize transition-colors ${
                  feedTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                {feedTab === tab && (
                  <motion.div
                    layoutId="feedTabIndicator"
                    className="absolute inset-0 bg-background rounded-md shadow-sm border"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {filteredFeed.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="py-16 text-center">
                  <Activity className="size-8 text-muted-foreground/30 mx-auto mb-4" />
                  <BlurText
                    text="No activity yet"
                    className="text-sm text-muted-foreground block mb-2"
                    delay={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Start a conversation in{' '}
                    <Link href="/messages" className="text-emerald-500 hover:underline">Messages</Link>
                    {' '}to get things going!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={feedTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredFeed.map((item, i) => {
                const actor = employeeMap.get(item.actorHex)
                const actorName = actor?.name ?? `user-${item.actorHex.slice(0, 8)}`
                const isMe = item.actorHex === myHex

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card className="overflow-hidden hover:shadow-sm transition-shadow">
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
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
