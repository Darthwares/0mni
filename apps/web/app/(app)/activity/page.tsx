'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'motion/react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
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
  Filter,
} from 'lucide-react'

const actionIcons: Record<string, typeof Activity> = {
  Created: Plus,
  Updated: Pencil,
  Deleted: Trash2,
  Assigned: UserCheck,
  Completed: CheckCircle,
  Escalated: AlertTriangle,
  Commented: MessageSquare,
  Called: Phone,
  Emailed: Mail,
}

const actionColors: Record<string, string> = {
  Created: 'bg-green-500/10 text-green-500',
  Updated: 'bg-blue-500/10 text-blue-500',
  Deleted: 'bg-red-500/10 text-red-500',
  Assigned: 'bg-purple-500/10 text-purple-500',
  Completed: 'bg-emerald-500/10 text-emerald-500',
  Escalated: 'bg-orange-500/10 text-orange-500',
  Commented: 'bg-sky-500/10 text-sky-500',
  Called: 'bg-indigo-500/10 text-indigo-500',
  Emailed: 'bg-violet-500/10 text-violet-500',
}

function avatarColor(name: string): string {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

/* ─── Stat card with spotlight ─── */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  index,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  index: number
  active?: boolean
  onClick?: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

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
      <Card
        ref={cardRef}
        className={`cursor-pointer transition-all duration-300 overflow-hidden ${
          active ? 'ring-2 ring-cyan-500/50 border-cyan-500/30' : 'hover:shadow-md'
        }`}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={isHovered ? {
          background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${color}, transparent 70%)`,
        } : undefined}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <CountUp to={value} duration={1} separator="," />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ActivityPage() {
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)
  const [filterAction, setFilterAction] = useState<string | null>(null)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const activities = useMemo(
    () => [...allActivity]
      .sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis()))
      .filter(a => !filterAction || a.action.tag === filterAction),
    [allActivity, filterAction]
  )

  const getActorName = (actorId: { toHexString: () => string }) => {
    const emp = employeeMap.get(actorId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const getActorInitials = (actorId: { toHexString: () => string }) => {
    const name = getActorName(actorId)
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isAI = (actorId: { toHexString: () => string }) => {
    const emp = employeeMap.get(actorId.toHexString())
    return emp?.employeeType.tag === 'AiAgent'
  }

  const fmtTime = (ts: any) => {
    try {
      return ts.toDate().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch { return '' }
  }

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allActivity.forEach((a) => {
      counts[a.action.tag] = (counts[a.action.tag] || 0) + 1
    })
    return counts
  }, [allActivity])

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <GradientText
            className="text-2xl font-bold"
            colors={['#06B6D4', '#22D3EE', '#67E8F9', '#22D3EE', '#06B6D4']}
            animationSpeed={6}
          >
            Activity Feed
          </GradientText>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time audit trail across all modules</p>
        </div>
        {filterAction && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 hover:bg-accent"
              onClick={() => setFilterAction(null)}
            >
              <Filter className="size-3" />
              {filterAction}
              <span className="text-muted-foreground">&times;</span>
            </Badge>
          </motion.div>
        )}
      </motion.div>

      {/* Summary cards — clickable to filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Events" value={allActivity.length} icon={Activity}
          color="rgba(6,182,212,0.06)" index={0}
          active={filterAction === null}
          onClick={() => setFilterAction(null)}
        />
        <StatCard
          label="Created" value={actionCounts['Created'] ?? 0} icon={Plus}
          color="rgba(34,197,94,0.06)" index={1}
          active={filterAction === 'Created'}
          onClick={() => setFilterAction(filterAction === 'Created' ? null : 'Created')}
        />
        <StatCard
          label="Completed" value={actionCounts['Completed'] ?? 0} icon={CheckCircle}
          color="rgba(16,185,129,0.06)" index={2}
          active={filterAction === 'Completed'}
          onClick={() => setFilterAction(filterAction === 'Completed' ? null : 'Completed')}
        />
        <StatCard
          label="Escalated" value={actionCounts['Escalated'] ?? 0} icon={AlertTriangle}
          color="rgba(249,115,22,0.06)" index={3}
          active={filterAction === 'Escalated'}
          onClick={() => setFilterAction(filterAction === 'Escalated' ? null : 'Escalated')}
        />
      </div>

      {/* Activity timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <AnimatePresence mode="wait">
                {activities.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center p-16 text-muted-foreground"
                  >
                    <Activity className="size-8 mb-3 opacity-50" />
                    <BlurText
                      text={filterAction ? `No ${filterAction.toLowerCase()} events` : 'No activity yet'}
                      className="text-sm block"
                      delay={50}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={filterAction ?? 'all'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="divide-y"
                  >
                    {activities.map((activity, i) => {
                      const IconComponent = actionIcons[activity.action.tag] ?? Activity
                      const colorClass = actionColors[activity.action.tag] ?? 'bg-gray-500/10 text-gray-500'
                      const actorName = getActorName(activity.actor)

                      return (
                        <motion.div
                          key={String(activity.id)}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }}
                          className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className={`rounded-full p-1.5 mt-0.5 ${colorClass}`}>
                            <IconComponent className="size-3.5" />
                          </div>
                          <Avatar className="size-7 shrink-0 mt-0.5">
                            <AvatarFallback className={`text-[10px] text-white ${avatarColor(actorName)}`}>
                              {getActorInitials(activity.actor)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{actorName}</span>
                              {isAI(activity.actor) && (
                                <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">AI</Badge>
                              )}
                              <span className="text-muted-foreground">
                                {' '}{activity.action.tag.toLowerCase()} {activity.entityType} #{String(activity.entityId)}
                              </span>
                            </p>
                            {activity.metadata && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {activity.metadata}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtTime(activity.timestamp)}
                          </span>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
