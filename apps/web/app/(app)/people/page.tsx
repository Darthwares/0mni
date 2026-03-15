'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import {
  Search,
  Users,
  UserCircle,
  Grid3X3,
  LayoutList,
  Bot,
  Globe,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Github,
  Linkedin,
  Clock,
  Circle,
  Zap,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- helpers ----------------------------------------------------------------

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function avatarGradient(name: string) {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-fuchsia-500 to-violet-600',
    'from-teal-500 to-emerald-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return gradients[Math.abs(hash) % gradients.length]
}

function statusDot(tag: string): string {
  switch (tag) {
    case 'Online': return 'bg-emerald-500'
    case 'Busy': return 'bg-amber-500'
    case 'InCall': return 'bg-blue-500'
    case 'Idle': return 'bg-yellow-500'
    default: return 'bg-neutral-400'
  }
}

function statusLabel(tag: string): string {
  switch (tag) {
    case 'Online': return 'Online'
    case 'Busy': return 'Busy'
    case 'InCall': return 'In Call'
    case 'Idle': return 'Idle'
    case 'Offline': return 'Offline'
    default: return tag
  }
}

function departmentColor(dept: string): string {
  switch (dept) {
    case 'Engineering': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Sales': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Support': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'Recruitment': return 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
    case 'Marketing': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'Operations': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Finance': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    default: return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  }
}

type ViewMode = 'grid' | 'list'
const DEPARTMENTS = ['All', 'Engineering', 'Sales', 'Support', 'Recruitment', 'Marketing', 'Operations', 'Finance'] as const

// =============================================================================

export default function PeoplePage() {
  const { currentOrgId } = useOrg()
  const [allEmployees] = useTable(tables.employee)

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [deptFilter, setDeptFilter] = useState<string>('All')

  // Filter employees
  const employees = useMemo(() => {
    return allEmployees
      .filter((e) => {
        if (e.employeeType.tag === 'AiAgent') return false // Separate from AI Employees page
        const matchSearch = !searchQuery ||
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchDept = deptFilter === 'All' || e.department.tag === deptFilter
        return matchSearch && matchDept
      })
      .sort((a, b) => {
        // Online first, then alphabetical
        const aOnline = a.status.tag === 'Online' || a.status.tag === 'Busy' || a.status.tag === 'InCall' ? 0 : 1
        const bOnline = b.status.tag === 'Online' || b.status.tag === 'Busy' || b.status.tag === 'InCall' ? 0 : 1
        if (aOnline !== bOnline) return aOnline - bOnline
        return a.name.localeCompare(b.name)
      })
  }, [allEmployees, searchQuery, deptFilter])

  // Department counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 }
    for (const e of allEmployees) {
      if (e.employeeType.tag === 'AiAgent') continue
      counts.All = (counts.All || 0) + 1
      counts[e.department.tag] = (counts[e.department.tag] || 0) + 1
    }
    return counts
  }, [allEmployees])

  // Stats
  const onlineCount = allEmployees.filter(
    (e) => e.employeeType.tag !== 'AiAgent' && (e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall')
  ).length
  const aiCount = allEmployees.filter((e) => e.employeeType.tag === 'AiAgent').length
  const totalHuman = allEmployees.filter((e) => e.employeeType.tag !== 'AiAgent').length
  const uniqueDepts = new Set(allEmployees.filter((e) => e.employeeType.tag !== 'AiAgent').map((e) => e.department.tag)).size

  return (
    <div className="p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#3b82f6', '#8b5cf6', '#ec4899']} animationSpeed={6}>
              People
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team directory, skills, and org structure
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'TEAM MEMBERS', value: totalHuman, icon: Users, gradient: 'from-blue-500 to-cyan-500', spotlight: 'rgba(59,130,246,0.15)' },
          { label: 'ONLINE NOW', value: onlineCount, icon: Circle, gradient: 'from-emerald-500 to-green-500', spotlight: 'rgba(16,185,129,0.15)' },
          { label: 'AI AGENTS', value: aiCount, icon: Bot, gradient: 'from-violet-500 to-fuchsia-500', spotlight: 'rgba(139,92,246,0.15)' },
          { label: 'DEPARTMENTS', value: uniqueDepts, icon: Briefcase, gradient: 'from-amber-500 to-orange-500', spotlight: 'rgba(245,158,11,0.15)' },
        ].map((kpi) => (
          <SpotlightCard
            key={kpi.label}
            className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
            spotlightColor={kpi.spotlight}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center`}>
                <kpi.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              <CountUp to={kpi.value} duration={1} />
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Search + Dept filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-700"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {DEPARTMENTS.map((dept) => {
            const count = deptCounts[dept] ?? 0
            return (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  deptFilter === dept
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {dept}
                {count > 0 && (
                  <span className={`ml-1 ${deptFilter === dept ? 'text-violet-200' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium tracking-wide uppercase">
        {employees.length} people
      </div>

      {/* People grid/list */}
      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
          <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 opacity-30" />
          </div>
          <p className="text-base font-medium text-neutral-500 dark:text-neutral-400">No people found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {employees.map((emp) => (
            <Link key={emp.id.toHexString()} href={`/profile/${emp.id.toHexString()}`}>
              <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-neutral-800">
                        {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} />}
                        <AvatarFallback className={`bg-gradient-to-br ${avatarGradient(emp.name)} text-white text-sm font-semibold`}>
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-neutral-800 ${statusDot(emp.status.tag)}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {emp.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {emp.role}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${departmentColor(emp.department.tag)}`}>
                          {emp.department.tag}
                        </span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {statusLabel(emp.status.tag)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills preview */}
                  {emp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {emp.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          {skill}
                        </span>
                      ))}
                      {emp.skills.length > 3 && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          +{emp.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                      <Zap className="h-3 w-3" />
                      <span className="tabular-nums">{Number(emp.tasksCompleted)}</span>
                      <span>tasks</span>
                    </div>
                    {emp.email && (
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* List view */
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_100px_140px_80px] gap-4 px-4 py-2.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              <span>Person</span>
              <span>Department</span>
              <span>Status</span>
              <span>Email</span>
              <span className="text-right">Tasks</span>
            </div>

            {employees.map((emp) => (
              <Link
                key={emp.id.toHexString()}
                href={`/profile/${emp.id.toHexString()}`}
                className="grid grid-cols-[1fr_120px_100px_140px_80px] gap-4 px-4 py-3 items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-neutral-800">
                      {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} />}
                      <AvatarFallback className={`bg-gradient-to-br ${avatarGradient(emp.name)} text-white text-[10px] font-bold`}>
                        {getInitials(emp.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-800 ${statusDot(emp.status.tag)}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {emp.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{emp.role}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border w-fit ${departmentColor(emp.department.tag)}`}>
                  {emp.department.tag}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {statusLabel(emp.status.tag)}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                  {emp.email ?? '—'}
                </span>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 tabular-nums text-right">
                  {Number(emp.tasksCompleted)}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
