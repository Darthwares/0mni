'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import GradientText from '@/components/reactbits/GradientText'
import {
  Mail,
  Globe,
  Clock,
  Briefcase,
  GraduationCap,
  Award,
  Activity,
  ExternalLink,
  Github,
  Linkedin,
  MapPin,
  ArrowLeft,
  MessageSquare,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Timer,
  FileText,
  Bot,
  Users,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timestampToDate(ts: any): Date {
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts / 1000)
  return new Date()
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; ring: string }> = {
  Online: { color: 'bg-emerald-500', bg: 'bg-emerald-500/10', label: 'Online', ring: 'ring-emerald-500/30' },
  Busy: { color: 'bg-amber-500', bg: 'bg-amber-500/10', label: 'Busy', ring: 'ring-amber-500/30' },
  Offline: { color: 'bg-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', label: 'Offline', ring: 'ring-neutral-400/30' },
  InCall: { color: 'bg-blue-500 animate-pulse', bg: 'bg-blue-500/10', label: 'In Call', ring: 'ring-blue-500/30' },
}

const DEPT_GRADIENTS: Record<string, string> = {
  Engineering: 'from-blue-500 to-cyan-500',
  Sales: 'from-emerald-500 to-green-500',
  Marketing: 'from-purple-500 to-violet-500',
  Support: 'from-amber-500 to-orange-500',
  Design: 'from-pink-500 to-rose-500',
  HR: 'from-teal-500 to-emerald-500',
  Operations: 'from-orange-500 to-red-500',
  Finance: 'from-cyan-500 to-blue-500',
  Legal: 'from-rose-500 to-pink-500',
  Executive: 'from-indigo-500 to-violet-500',
}

type TabView = 'overview' | 'tasks' | 'activity'

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const params = useParams()
  const profileId = params.id as string
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allDocuments] = useTable(tables.document)
  const [allMessages] = useTable(tables.message)
  const [allActivityLog] = useTable(tables.activity_log)
  const [activeTab, setActiveTab] = useState<TabView>('overview')

  const employee = useMemo(() => {
    return allEmployees.find((e) => e.id.toHexString() === profileId) ?? null
  }, [allEmployees, profileId])

  const isOwnProfile = useMemo(() => {
    if (!identity || !employee) return false
    return employee.id.toHexString() === identity.toHexString()
  }, [identity, employee])

  // Tasks assigned to this person
  const employeeTasks = useMemo(() => {
    if (!employee) return []
    const hex = employee.id.toHexString()
    return allTasks
      .filter((t) => t.assignee && t.assignee.toHexString() === hex)
      .sort((a, b) => timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime())
  }, [allTasks, employee])

  const currentTask = useMemo(() => {
    if (!employee?.currentTaskId) return null
    return allTasks.find((t) => t.id === employee.currentTaskId) ?? null
  }, [employee, allTasks])

  // Documents created by this person
  const personDocs = useMemo(() => {
    if (!employee) return []
    const hex = employee.id.toHexString()
    return allDocuments
      .filter((d) => d.owner.toHexString() === hex)
      .sort((a, b) => timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime())
      .slice(0, 5)
  }, [allDocuments, employee])

  // Activity log entries for this person
  const personActivity = useMemo(() => {
    if (!employee) return []
    const hex = employee.id.toHexString()
    return allActivityLog
      .filter((a) => a.actor.toHexString() === hex)
      .sort((a, b) => timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime())
      .slice(0, 20)
  }, [allActivityLog, employee])

  // Task stats
  const taskStats = useMemo(() => {
    const completed = employeeTasks.filter((t) => t.status?.tag === 'Done' || t.status?.tag === 'Verified').length
    const inProgress = employeeTasks.filter((t) => t.status?.tag === 'InProgress' || t.status?.tag === 'Claimed').length
    const open = employeeTasks.filter((t) => t.status?.tag === 'Open' || t.status?.tag === 'Todo').length
    return { completed, inProgress, open, total: employeeTasks.length }
  }, [employeeTasks])

  // Message count
  const messageCount = useMemo(() => {
    if (!employee) return 0
    const hex = employee.id.toHexString()
    return allMessages.filter((m) => m.sender.toHexString() === hex).length
  }, [allMessages, employee])

  // ── Not found / Own profile redirect ──

  if (!employee) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PresenceBar />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Employee not found.</p>
          <Link href="/people" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to People
          </Link>
        </div>
      </div>
    )
  }

  if (isOwnProfile) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PresenceBar />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">This is your profile.</p>
          <Link href="/profile" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Go to My Profile
          </Link>
        </div>
      </div>
    )
  }

  // ── Profile data ──

  const status = STATUS_CONFIG[employee.status?.tag] ?? STATUS_CONFIG.Offline
  const isAI = employee.employeeType?.tag === 'AiAgent'
  const deptGradient = DEPT_GRADIENTS[employee.department?.tag] ?? 'from-neutral-500 to-neutral-600'
  const skills: string[] = employee.skills ?? []

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
          {/* Hero section */}
          <div className={`relative h-32 bg-gradient-to-r ${deptGradient} opacity-80`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-3 left-4">
              <Link
                href="/people"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                People
              </Link>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 pb-8">
            {/* Avatar + Name Header */}
            <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
              <div className="relative">
                <Avatar className="size-28 border-4 border-white dark:border-neutral-900 shadow-xl">
                  {employee.avatarUrl && <AvatarImage src={employee.avatarUrl} alt={employee.name} />}
                  <AvatarFallback
                    className={`text-2xl font-bold text-white ${
                      isAI
                        ? 'bg-gradient-to-br from-purple-500 to-violet-600'
                        : `bg-gradient-to-br ${deptGradient}`
                    }`}
                  >
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-2 right-2 size-5 rounded-full border-[3px] border-white dark:border-neutral-900 ${status.color}`}
                  title={status.label}
                />
              </div>

              <div className="flex-1 min-w-0 pt-4 sm:pt-12">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {employee.name}
                  </h1>
                  {isAI && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-500 gap-1">
                      <Bot className="size-3" />
                      AI Agent
                    </Badge>
                  )}
                </div>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mb-3">
                  {employee.role || 'Team Member'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`bg-gradient-to-r ${deptGradient} text-white border-0`}>
                    {employee.department?.tag}
                  </Badge>
                  <Badge variant="outline" className={`gap-1 ${
                    employee.status?.tag === 'Online' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' :
                    employee.status?.tag === 'Busy' ? 'border-amber-500/50 text-amber-600 dark:text-amber-400' :
                    employee.status?.tag === 'InCall' ? 'border-blue-500/50 text-blue-600 dark:text-blue-400' :
                    'border-neutral-300 dark:border-neutral-700'
                  }`}>
                    <span className={`size-1.5 rounded-full ${status.color}`} />
                    {status.label}
                  </Badge>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 pt-4 sm:pt-12 shrink-0">
                <Link href="/messages" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
                  <MessageSquare className="size-3.5" />
                  Message
                </Link>
                <Link href="/calendar" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
                  <CalendarDays className="size-3.5" />
                  Schedule
                </Link>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <SpotlightCard
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                spotlightColor="rgba(16, 185, 129, 0.1)"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Tasks Done</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                      <CountUp to={Number(employee.tasksCompleted)} duration={1} />
                    </p>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                spotlightColor="rgba(59, 130, 246, 0.1)"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <CircleDot className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">In Progress</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                      <CountUp to={taskStats.inProgress} duration={1} />
                    </p>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                spotlightColor="rgba(139, 92, 246, 0.1)"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <MessageSquare className="size-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Messages</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                      <CountUp to={messageCount} duration={1} />
                    </p>
                  </div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                spotlightColor="rgba(245, 158, 11, 0.1)"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <TrendingUp className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Confidence</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                      {employee.avgConfidenceScore != null
                        ? `${Math.round(employee.avgConfidenceScore * 100)}%`
                        : '--'}
                    </p>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 mb-6 w-fit">
              {([
                { key: 'overview', label: 'Overview', icon: Sparkles },
                { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
                { key: 'activity', label: 'Activity', icon: Activity },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab: Overview ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Contact info */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                      <Globe className="size-4 text-neutral-400" />
                      Contact & Links
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {employee.email && (
                        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                          <Mail className="size-4 text-neutral-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Email</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{employee.email}</p>
                          </div>
                        </div>
                      )}
                      {employee.timezone && (
                        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                          <MapPin className="size-4 text-neutral-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Timezone</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{employee.timezone}</p>
                          </div>
                        </div>
                      )}
                      {employee.linkedinUrl && (
                        <a
                          href={employee.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-blue-500/5 transition-colors group"
                        >
                          <Linkedin className="size-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">LinkedIn</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              View Profile
                            </p>
                          </div>
                          <ExternalLink className="size-3 text-neutral-300 group-hover:text-blue-500 transition-colors" />
                        </a>
                      )}
                      {employee.githubUrl && (
                        <a
                          href={employee.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                        >
                          <Github className="size-4 text-neutral-700 dark:text-neutral-300 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">GitHub</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">View Profile</p>
                          </div>
                          <ExternalLink className="size-3 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {employee.bio && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <Activity className="size-4 text-neutral-400" />
                        About
                      </h3>
                      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                        {employee.bio}
                      </p>
                    </div>
                  )}

                  {/* Current task */}
                  {currentTask && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <Zap className="size-4 text-amber-500" />
                        Currently Working On
                      </h3>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{currentTask.title}</p>
                          {currentTask.description && (
                            <p className="text-xs text-neutral-500 truncate mt-0.5">{currentTask.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 ml-2">{currentTask.status?.tag}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Recent documents */}
                  {personDocs.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <FileText className="size-4 text-neutral-400" />
                        Recent Documents
                      </h3>
                      <div className="space-y-2">
                        {personDocs.map((doc) => (
                          <div
                            key={doc.id.toString()}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                          >
                            <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                              <FileText className="size-4 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{doc.title}</p>
                              <p className="text-[10px] text-neutral-400">{formatTimeAgo(timestampToDate(doc.updatedAt))}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{doc.docType?.tag ?? 'Doc'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <Sparkles className="size-4 text-violet-500" />
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task breakdown */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-neutral-400" />
                      Task Breakdown
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Completed</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{taskStats.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">In Progress</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{taskStats.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Open</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{taskStats.open}</span>
                      </div>
                      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Total</span>
                        <span className="text-sm font-bold tabular-nums">{taskStats.total}</span>
                      </div>
                      {taskStats.total > 0 && (
                        <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                          {taskStats.completed > 0 && (
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                            />
                          )}
                          {taskStats.inProgress > 0 && (
                            <div
                              className="bg-blue-500 h-full transition-all"
                              style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }}
                            />
                          )}
                          {taskStats.open > 0 && (
                            <div
                              className="bg-amber-500 h-full transition-all"
                              style={{ width: `${(taskStats.open / taskStats.total) * 100}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employment history */}
                  {employee.employmentHistory.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <Briefcase className="size-4 text-neutral-400" />
                        Experience
                      </h3>
                      <div className="space-y-3">
                        {employee.employmentHistory.map((entry, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="mt-1.5 flex flex-col items-center">
                              <div className="size-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
                              {i < employee.employmentHistory.length - 1 && (
                                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{entry}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {employee.education.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <GraduationCap className="size-4 text-neutral-400" />
                        Education
                      </h3>
                      <div className="space-y-2">
                        {employee.education.map((entry, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                            <GraduationCap className="size-4 text-blue-500 shrink-0" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{entry}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {employee.certifications.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                        <Award className="size-4 text-amber-500" />
                        Certifications
                      </h3>
                      <div className="space-y-2">
                        {employee.certifications.map((entry, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                            <Award className="size-4 text-amber-500 shrink-0" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{entry}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Tasks ── */}
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {employeeTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                      <CheckCircle2 className="size-6 text-neutral-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">No tasks assigned</p>
                    <p className="text-xs text-neutral-400">Tasks will appear here when assigned.</p>
                  </div>
                ) : (
                  employeeTasks.slice(0, 30).map((task) => {
                    const statusColors: Record<string, string> = {
                      Done: 'bg-emerald-500',
                      Verified: 'bg-emerald-500',
                      InProgress: 'bg-blue-500',
                      Claimed: 'bg-blue-500',
                      Open: 'bg-amber-500',
                      Todo: 'bg-amber-500',
                      Blocked: 'bg-red-500',
                    }
                    const dot = statusColors[task.status?.tag] ?? 'bg-neutral-400'
                    return (
                      <div
                        key={task.id.toString()}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`size-2 rounded-full ${dot} mt-2 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-0.5">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-neutral-500 line-clamp-1 mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                <span className={`size-1.5 rounded-full ${dot}`} />
                                {task.status?.tag}
                              </Badge>
                              {task.priority && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {task.priority?.tag}
                                </Badge>
                              )}
                              <span className="text-[10px] text-neutral-400">
                                {formatTimeAgo(timestampToDate(task.createdAt))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── Tab: Activity ── */}
            {activeTab === 'activity' && (
              <div className="space-y-2">
                {personActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                      <Activity className="size-6 text-neutral-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">No activity yet</p>
                    <p className="text-xs text-neutral-400">Recent actions will appear here.</p>
                  </div>
                ) : (
                  personActivity.map((entry) => (
                    <div
                      key={entry.id.toString()}
                      className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5"
                    >
                      <div className="size-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="size-3.5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{entry.action?.tag}</span>
                          {' '}
                          {entry.details}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {formatTimeAgo(timestampToDate(entry.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
