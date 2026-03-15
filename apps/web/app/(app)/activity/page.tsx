'use client'

import { useMemo } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  type LucideIcon,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

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

export default function ActivityPage() {
  const [allActivity] = useTable(tables.activity_log)
  const [allEmployees] = useTable(tables.employee)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const activities = useMemo(
    () => [...allActivity].sort((a, b) => Number(b.timestamp.toMillis()) - Number(a.timestamp.toMillis())),
    [allActivity]
  )

  const getActorName = (actorId: { toHexString: () => string }) => {
    const emp = employeeMap.get(actorId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const getActorInitials = (actorId: { toHexString: () => string }) => {
    const name = getActorName(actorId)
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
    } catch {
      return ''
    }
  }

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activities.forEach((a) => {
      counts[a.action.tag] = (counts[a.action.tag] || 0) + 1
    })
    return counts
  }, [activities])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
            <Activity className="size-4.5 text-white" />
          </div>
          <GradientText colors={['#0ea5e9', '#06b6d4', '#38bdf8']} animationSpeed={6}>Activity Feed</GradientText>
        </h1>
        <p className="text-muted-foreground text-sm">Real-time audit trail across all modules</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Total Events', value: activities.length, icon: Activity, color: 'from-sky-500/20 to-sky-600/5' },
          { label: 'Created', value: actionCounts['Created'] ?? 0, icon: Plus, color: 'from-green-500/20 to-green-600/5' },
          { label: 'Completed', value: actionCounts['Completed'] ?? 0, icon: CheckCircle, color: 'from-emerald-500/20 to-emerald-600/5' },
          { label: 'Escalated', value: actionCounts['Escalated'] ?? 0, icon: AlertTriangle, color: 'from-orange-500/20 to-orange-600/5' },
        ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map((stat) => (
          <SpotlightCard key={stat.label} className="!p-4 !rounded-xl" spotlightColor="rgba(14, 165, 233, 0.12)">
            <div className={`size-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="size-4 text-foreground/70" />
            </div>
            <div className="text-2xl font-bold"><CountUp to={stat.value} duration={1.5} /></div>
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </SpotlightCard>
        ))}
      </div>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Activity className="size-8 mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((activity) => {
                  const IconComponent = actionIcons[activity.action.tag] ?? Activity
                  const colorClass = actionColors[activity.action.tag] ?? 'bg-gray-500/10 text-gray-500'

                  return (
                    <div key={String(activity.id)} className="flex items-start gap-3 px-6 py-3">
                      <div className={`rounded-full p-1.5 mt-0.5 ${colorClass}`}>
                        <IconComponent className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{getActorName(activity.actor)}</span>
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
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
