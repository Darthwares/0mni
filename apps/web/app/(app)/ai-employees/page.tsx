'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { Timestamp } from 'spacetimedb'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  Bot,
  Brain,
  Zap,
  Shield,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Cpu,
  ListTodo,
  ChevronRight,
  Layers,
  UserCheck,
  Plus,
  CircleDot,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusDot(tag: string) {
  switch (tag) {
    case 'Online':  return 'bg-emerald-500'
    case 'Busy':    return 'bg-amber-400'
    case 'InCall':  return 'bg-sky-400'
    default:        return 'bg-neutral-400'
  }
}

function getStatusLabel(tag: string) {
  switch (tag) {
    case 'Online':  return 'Online'
    case 'Busy':    return 'Busy'
    case 'Offline': return 'Offline'
    case 'InCall':  return 'In Call'
    default:        return tag
  }
}

function getStatusBadgeClass(tag: string) {
  switch (tag) {
    case 'Online':  return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'Busy':    return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    case 'InCall':  return 'bg-sky-500/10 text-sky-600 border-sky-500/20'
    default:        return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
  }
}

function getTaskStatusBadge(tag: string) {
  switch (tag) {
    case 'InProgress':    return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'SelfChecking':  return 'bg-violet-500/10 text-violet-600 border-violet-500/20'
    case 'NeedsReview':   return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    case 'Completed':     return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'Escalated':     return 'bg-red-500/10 text-red-600 border-red-500/20'
    case 'Claimed':       return 'bg-sky-500/10 text-sky-600 border-sky-500/20'
    case 'Unclaimed':     return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
    default:              return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
  }
}

function getDeptColor(tag: string) {
  switch (tag) {
    case 'Support':     return 'bg-sky-500/10 text-sky-700 border-sky-500/20'
    case 'Sales':       return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    case 'Recruitment': return 'bg-purple-500/10 text-purple-700 border-purple-500/20'
    case 'Engineering': return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
    case 'Operations':  return 'bg-teal-500/10 text-teal-700 border-teal-500/20'
    case 'Marketing':   return 'bg-pink-500/10 text-pink-700 border-pink-500/20'
    case 'Finance':     return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'
    default:            return 'bg-neutral-500/10 text-neutral-700 border-neutral-500/20'
  }
}

function getThoughtTypeIcon(tag: string) {
  switch (tag) {
    case 'Planning':   return <Brain className="w-3.5 h-3.5 text-violet-500" />
    case 'Reasoning':  return <Cpu className="w-3.5 h-3.5 text-sky-500" />
    case 'SelfCheck':  return <Shield className="w-3.5 h-3.5 text-amber-500" />
    case 'Escalation': return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
    case 'Completion': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    default:           return <CircleDot className="w-3.5 h-3.5 text-neutral-500" />
  }
}

function formatCost(cost: number | undefined | null) {
  if (cost === undefined || cost === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost)
}

function formatTimestamp(ts: Timestamp) {
  try {
    const ms = Number(ts.__timestamp_micros_since_unix_epoch__) / 1000
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent ?? 'bg-neutral-100 dark:bg-neutral-800'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">{label}</p>
        <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none">{value}</p>
      </div>
    </div>
  )
}

// ─── AI Employee Card ─────────────────────────────────────────────────────────

type Employee = {
  id: { toHexString: () => string }
  name: string
  role: string
  department: { tag: string }
  status: { tag: string }
  aiConfig?: {
    model: string
    capabilities: string[]
    supervisorId?: string
    maxTaskDurationMinutes: number
    selfVerificationThreshold: number
  } | null
  currentTaskId?: bigint | null
  tasksCompleted: bigint
  avgConfidenceScore?: number | null
  costIncurred?: number | null
  avatarUrl?: string | null
}

function AgentCard({
  agent,
  currentTask,
  onClick,
  selected,
}: {
  agent: Employee
  currentTask?: { title: string; status: { tag: string } } | null
  onClick: () => void
  selected: boolean
}) {
  const conf = agent.avgConfidenceScore ?? 0
  const confPct = Math.round(conf * 100)
  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden
        ${selected
          ? 'border-violet-500/60 ring-2 ring-violet-500/20 shadow-lg shadow-violet-500/10'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-violet-400/40 hover:shadow-md'
        }
        bg-white dark:bg-neutral-900
      `}
    >
      {/* Gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 opacity-80" />

      <div className="p-4 pt-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar + status dot */}
          <div className="relative shrink-0">
            <Avatar size="lg">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${getStatusDot(agent.status.tag)}`}
            />
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                {agent.name}
              </h3>
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(agent.status.tag)}`}>
                {getStatusLabel(agent.status.tag)}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{agent.role}</p>
          </div>

          {/* Dept badge */}
          <span className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${getDeptColor(agent.department.tag)}`}>
            {agent.department.tag}
          </span>
        </div>

        {/* Model */}
        {agent.aiConfig && (
          <div className="flex items-center gap-1.5 mb-3">
            <Cpu className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="text-xs font-mono text-neutral-500 truncate">{agent.aiConfig.model}</span>
          </div>
        )}

        {/* Capabilities */}
        {agent.aiConfig && agent.aiConfig.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.aiConfig.capabilities.slice(0, 4).map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-300"
              >
                {cap}
              </span>
            ))}
            {agent.aiConfig.capabilities.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                +{agent.aiConfig.capabilities.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Current task */}
        {currentTask && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 px-2.5 py-1.5">
            <ListTodo className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="text-xs text-violet-700 dark:text-violet-300 truncate flex-1">{currentTask.title}</span>
            <span className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${getTaskStatusBadge(currentTask.status.tag)}`}>
              {currentTask.status.tag}
            </span>
          </div>
        )}

        <Separator className="my-3" />

        {/* Confidence score */}
        {agent.avgConfidenceScore !== undefined && agent.avgConfidenceScore !== null && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-neutral-500">Avg Confidence</span>
              <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">{confPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  conf >= 0.8
                    ? 'bg-emerald-500'
                    : conf >= 0.6
                    ? 'bg-amber-400'
                    : 'bg-red-500'
                }`}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 mb-0.5">Completed</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {agent.tasksCompleted.toString()}
            </p>
          </div>
          <div className="text-center border-x border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] text-neutral-400 mb-0.5">Cost</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {formatCost(agent.costIncurred)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 mb-0.5">Verify %</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {agent.aiConfig
                ? `${Math.round(agent.aiConfig.selfVerificationThreshold * 100)}%`
                : '—'}
            </p>
          </div>
        </div>

        {/* Supervisor */}
        {agent.aiConfig?.supervisorId && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-neutral-400">
            <UserCheck className="w-3 h-3" />
            <span className="truncate">Supervisor: <span className="font-mono">{agent.aiConfig.supervisorId.slice(0, 12)}…</span></span>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  agentName,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any
  agentName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const conf = task.aiConfidence ?? null
  const confPct = conf !== null ? Math.round(conf * 100) : null

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`h-2 w-2 rounded-full shrink-0 ${
          task.status.tag === 'Completed' ? 'bg-emerald-500' :
          task.status.tag === 'InProgress' ? 'bg-blue-500' :
          task.status.tag === 'Escalated' ? 'bg-red-500' :
          task.status.tag === 'SelfChecking' ? 'bg-violet-500' :
          task.status.tag === 'NeedsReview' ? 'bg-amber-500' :
          'bg-neutral-400'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{task.title}</span>
            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getTaskStatusBadge(task.status.tag)}`}>
              {task.status.tag}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
            {agentName && <span>{agentName}</span>}
            {agentName && <span>·</span>}
            <span>{task.taskType.tag.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span>·</span>
            <span>{formatTimestamp(task.createdAt)}</span>
          </div>
        </div>

        {confPct !== null && (
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="h-1 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${confPct >= 80 ? 'bg-emerald-500' : confPct >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 w-6 text-right">{confPct}%</span>
          </div>
        )}

        <ChevronRight
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && task.thoughtTrace.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">Thought Trace</p>
          {task.thoughtTrace.map((thought, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="shrink-0 mt-0.5 text-[10px] font-mono text-neutral-300">{String(i + 1).padStart(2, '0')}</span>
              <p className="leading-relaxed">{thought}</p>
            </div>
          ))}
        </div>
      )}

      {expanded && task.thoughtTrace.length === 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 text-xs text-neutral-400 italic">
          No thought trace recorded for this task.
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AIEmployeesPage() {
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Filter to AI agents only
  const aiAgents = useMemo(
    () => allEmployees.filter((e) => e.employeeType.tag === 'AiAgent'),
    [allEmployees]
  )

  // Task map for lookups
  const taskMap = useMemo(
    () => new Map(allTasks.map((t) => [t.id, t])),
    [allTasks]
  )

  // Tasks assigned to AI agents (by assignee identity hex)
  const agentIdSet = useMemo(
    () => new Set(aiAgents.map((a) => a.id.toHexString())),
    [aiAgents]
  )

  const aiTasks = useMemo(
    () =>
      [...allTasks]
        .filter((t) => t.assignee && agentIdSet.has(t.assignee.toHexString()))
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt)),
    [allTasks, agentIdSet]
  )

  // Agent map for task lookup
  const agentMap = useMemo(
    () => new Map(aiAgents.map((a) => [a.id.toHexString(), a])),
    [aiAgents]
  )

  // Stats
  const stats = useMemo(() => {
    const total = aiAgents.length
    const online = aiAgents.filter((a) => a.status.tag === 'Online').length
    const busy = aiAgents.filter((a) => a.status.tag === 'Busy' || a.status.tag === 'InCall').length
    const tasksCompleted = aiAgents.reduce(
      (sum, a) => sum + Number(a.tasksCompleted),
      0
    )
    return { total, online, busy, tasksCompleted }
  }, [aiAgents])

  const selectedAgent = selectedId
    ? aiAgents.find((a) => a.id.toHexString() === selectedId) ?? null
    : null

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold">
                <GradientText colors={['#8B5CF6', '#D946EF', '#F43F5E']} animationSpeed={5} className="text-xl font-bold">
                  AI Employees
                </GradientText>
              </h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage and monitor your AI workforce across all departments
            </p>
          </div>
          <Button className="shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 border-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Create AI Employee
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Bot className="w-5 h-5 text-violet-600" />}
            label="Total AI Agents"
            value={stats.total}
            accent="bg-violet-50 dark:bg-violet-950/30"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-emerald-600" />}
            label="Online"
            value={stats.online}
            accent="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            label="Busy / In Call"
            value={stats.busy}
            accent="bg-amber-50 dark:bg-amber-950/30"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-sky-600" />}
            label="Tasks Completed"
            value={stats.tasksCompleted}
            accent="bg-sky-50 dark:bg-sky-950/30"
          />
        </div>

        {/* ── Tabs: Agents / Task Queue / Thought Feed ── */}
        <Tabs defaultValue="agents">
          <TabsList variant="line">
            <TabsTrigger value="agents">
              <Bot className="w-4 h-4" />
              AI Agents
              {aiAgents.length > 0 && (
                <span className="ml-1 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 font-medium">
                  {aiAgents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListTodo className="w-4 h-4" />
              Task Queue
              {aiTasks.length > 0 && (
                <span className="ml-1 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 font-medium">
                  {aiTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="thoughts">
              <Brain className="w-4 h-4" />
              Thought Feed
            </TabsTrigger>
          </TabsList>

          {/* ── Agent Grid ── */}
          <TabsContent value="agents" className="mt-4">
            {aiAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                  <Bot className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No AI Agents Yet</h3>
                <p className="text-sm text-neutral-400 max-w-xs">
                  Create your first AI employee to start automating workflows across departments.
                </p>
                <Button className="mt-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 border-0">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create AI Employee
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {aiAgents.map((agent) => {
                  const currentTask = agent.currentTaskId
                    ? taskMap.get(agent.currentTaskId) ?? null
                    : null
                  return (
                    <AgentCard
                      key={agent.id.toHexString()}
                      agent={agent}
                      currentTask={currentTask}
                      selected={selectedId === agent.id.toHexString()}
                      onClick={() =>
                        setSelectedId((prev) =>
                          prev === agent.id.toHexString() ? null : agent.id.toHexString()
                        )
                      }
                    />
                  )
                })}
              </div>
            )}

            {/* Agent detail panel when selected */}
            {selectedAgent && (
              <div className="mt-6 rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white font-semibold">
                        {selectedAgent.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedAgent.name}</h2>
                      <p className="text-xs text-neutral-500">{selectedAgent.role} · {selectedAgent.department.tag}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-neutral-100 dark:divide-neutral-800">
                  {/* Config details */}
                  <div className="px-5 py-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Configuration</h3>
                    {selectedAgent.aiConfig ? (
                      <>
                        <div>
                          <p className="text-[10px] text-neutral-400 mb-0.5">Model</p>
                          <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300">{selectedAgent.aiConfig.model}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-400 mb-1">Capabilities</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedAgent.aiConfig.capabilities.map((cap) => (
                              <span
                                key={cap}
                                className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-400 mb-0.5">Max Task Duration</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedAgent.aiConfig.maxTaskDurationMinutes} minutes</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-400 mb-0.5">Self-Verification Threshold</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">{Math.round(selectedAgent.aiConfig.selfVerificationThreshold * 100)}%</p>
                        </div>
                        {selectedAgent.aiConfig.supervisorId && (
                          <div>
                            <p className="text-[10px] text-neutral-400 mb-0.5">Supervisor ID</p>
                            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 break-all">{selectedAgent.aiConfig.supervisorId}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No AI config available</p>
                    )}
                  </div>

                  {/* Performance */}
                  <div className="px-5 py-4 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Performance</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5 text-center">
                        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                          {selectedAgent.tasksCompleted.toString()}
                        </p>
                        <p className="text-[10px] text-neutral-400">Tasks Completed</p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5 text-center">
                        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                          {selectedAgent.avgConfidenceScore !== null && selectedAgent.avgConfidenceScore !== undefined
                            ? `${Math.round(selectedAgent.avgConfidenceScore * 100)}%`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-neutral-400">Avg Confidence</p>
                      </div>
                    </div>

                    {selectedAgent.avgConfidenceScore !== null && selectedAgent.avgConfidenceScore !== undefined && (
                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                          <span>Confidence Score</span>
                          <span>{Math.round(selectedAgent.avgConfidenceScore * 100)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              selectedAgent.avgConfidenceScore >= 0.8
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                : selectedAgent.avgConfidenceScore >= 0.6
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${Math.round(selectedAgent.avgConfidenceScore * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-neutral-400">Total Cost Incurred</p>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatCost(selectedAgent.costIncurred)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current task + recent tasks */}
                  <div className="px-5 py-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Current Activity</h3>
                    {selectedAgent.currentTaskId ? (() => {
                      const t = taskMap.get(selectedAgent.currentTaskId!)
                      if (!t) return <p className="text-sm text-neutral-400 italic">Task not found</p>
                      return (
                        <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-950/20 px-3 py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{t.title}</p>
                            <span className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getTaskStatusBadge(t.status.tag)}`}>
                              {t.status.tag}
                            </span>
                          </div>
                          {t.aiConfidence !== null && t.aiConfidence !== undefined && (
                            <div className="flex items-center gap-2">
                              <Shield className="w-3 h-3 text-violet-400 shrink-0" />
                              <span className="text-[10px] text-violet-600 dark:text-violet-400">
                                {Math.round(t.aiConfidence * 100)}% confidence
                              </span>
                            </div>
                          )}
                          {t.thoughtTrace.length > 0 && (
                            <p className="text-[10px] text-neutral-500 italic line-clamp-2">
                              {t.thoughtTrace[t.thoughtTrace.length - 1]}
                            </p>
                          )}
                        </div>
                      )
                    })() : (
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <Clock className="w-4 h-4" />
                        <span>No active task</span>
                      </div>
                    )}

                    {/* Recent tasks for this agent */}
                    <div className="pt-2">
                      <p className="text-[10px] text-neutral-400 mb-2 font-medium">Recent Tasks</p>
                      <div className="space-y-1.5">
                        {aiTasks
                          .filter((t) => t.assignee?.toHexString() === selectedAgent.id.toHexString())
                          .slice(0, 5)
                          .map((t) => (
                            <div key={t.id.toString()} className="flex items-center gap-2 text-xs">
                              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                t.status.tag === 'Completed' ? 'bg-emerald-500' :
                                t.status.tag === 'Escalated' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`} />
                              <span className="truncate text-neutral-600 dark:text-neutral-400 flex-1">{t.title}</span>
                              <span className="shrink-0 text-neutral-400">{formatTimestamp(t.createdAt)}</span>
                            </div>
                          ))
                        }
                        {aiTasks.filter((t) => t.assignee?.toHexString() === selectedAgent.id.toHexString()).length === 0 && (
                          <p className="text-xs text-neutral-400 italic">No tasks found</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Task Queue ── */}
          <TabsContent value="tasks" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">AI Task Queue</h2>
                <p className="text-xs text-neutral-400">{aiTasks.length} tasks assigned to AI agents</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['InProgress', 'SelfChecking', 'NeedsReview', 'Completed', 'Escalated'] as const).map((status) => {
                  const count = aiTasks.filter((t) => t.status.tag === status).length
                  if (count === 0) return null
                  return (
                    <span
                      key={status}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getTaskStatusBadge(status)}`}
                    >
                      {count} {status}
                    </span>
                  )
                })}
              </div>
            </div>

            {aiTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-3">
                  <ListTodo className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">No tasks assigned to AI agents yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {aiTasks.map((task) => {
                  const agent = task.assignee
                    ? agentMap.get(task.assignee.toHexString())
                    : undefined
                  return (
                    <TaskRow
                      key={task.id.toString()}
                      task={task}
                      agentName={agent?.name}
                    />
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Thought Feed ── */}
          <TabsContent value="thoughts" className="mt-4">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                  <Brain className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">AI Thought Feed</h2>
                  <p className="text-xs text-neutral-400">Real-time agent reasoning stream</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-neutral-400">Live</span>
                </div>
              </div>

              {/* Thought entries from task thought traces */}
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {aiTasks
                  .filter((t) => t.thoughtTrace.length > 0)
                  .slice(0, 20)
                  .flatMap((task) => {
                    const agent = task.assignee
                      ? agentMap.get(task.assignee.toHexString())
                      : undefined
                    return task.thoughtTrace.map((thought, i) => ({
                      key: `${task.id}-${i}`,
                      taskTitle: task.title,
                      agentName: agent?.name ?? 'AI Agent',
                      thought,
                      index: i,
                      totalTrace: task.thoughtTrace.length,
                      timestamp: task.createdAt,
                    }))
                  })
                  .slice(0, 30)
                  .map((entry) => (
                    <div key={entry.key} className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950/40 mt-0.5">
                        <Brain className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{entry.agentName}</span>
                          <span className="text-[10px] text-neutral-400">on</span>
                          <span className="text-[10px] text-neutral-500 italic truncate">{entry.taskTitle}</span>
                          <span className="text-[10px] text-neutral-300 ml-auto">{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{entry.thought}</p>
                      </div>
                    </div>
                  ))
                }

                {aiTasks.filter((t) => t.thoughtTrace.length > 0).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-3">
                      <Brain className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-sm text-neutral-500 mb-1">No thought traces yet</p>
                    <p className="text-xs text-neutral-400 max-w-xs">
                      Agent reasoning will appear here as AI employees work through their task queues.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
