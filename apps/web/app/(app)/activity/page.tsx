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
} from 'lucide-react'
import { PagePresence } from '@/components/page-presence'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground text-sm">Real-time audit trail across all modules</p>
        </div>
        <PagePresence glowColor="rgba(6, 182, 212, 0.15)" shineColor="#22d3ee" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: activities.length, icon: Activity },
          { label: 'Created', value: actionCounts['Created'] ?? 0, icon: Plus },
          { label: 'Completed', value: actionCounts['Completed'] ?? 0, icon: CheckCircle },
          { label: 'Escalated', value: actionCounts['Escalated'] ?? 0, icon: AlertTriangle },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
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
