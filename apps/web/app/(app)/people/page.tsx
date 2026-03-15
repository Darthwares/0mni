'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Users2,
  Bot,
  Grid3X3,
  List,
  Mail,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock,
  Phone,
  Star,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import Link from 'next/link'

// ---- types ------------------------------------------------------------------

type DepartmentTag = 'Support' | 'Sales' | 'Recruitment' | 'Engineering' | 'Operations' | 'Marketing' | 'Finance'
type StatusTag = 'Online' | 'Busy' | 'Offline' | 'InCall'

const DEPARTMENT_FILTERS = ['All', 'Support', 'Sales', 'Recruitment', 'Engineering', 'Operations', 'Marketing', 'Finance'] as const
type DeptFilter = (typeof DEPARTMENT_FILTERS)[number]

const deptConfig: Record<DepartmentTag, { cls: string; dot: string }> = {
  Support: { cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  Sales: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  Recruitment: { cls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', dot: 'bg-pink-500' },
  Engineering: { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
  Operations: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  Marketing: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  Finance: { cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', dot: 'bg-teal-500' },
}

const statusConfig: Record<StatusTag, { cls: string; dot: string; label: string }> = {
  Online: { cls: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Online' },
  Busy: { cls: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', label: 'Busy' },
  Offline: { cls: 'text-neutral-400 dark:text-neutral-500', dot: 'bg-neutral-400', label: 'Offline' },
  InCall: { cls: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse', label: 'In Call' },
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// =============================================================================

export default function PeoplePage() {
  const [allEmployees] = useTable(tables.employee)

  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('All')
  const [typeFilter, setTypeFilter] = useState<'all' | 'human' | 'ai'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    return [...allEmployees]
      .filter((e) => {
        const matchesSearch = !searchQuery ||
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesDept = deptFilter === 'All' || e.department.tag === deptFilter
        const matchesType = typeFilter === 'all' ||
          (typeFilter === 'human' && e.employeeType.tag === 'Human') ||
          (typeFilter === 'ai' && e.employeeType.tag === 'AiAgent')
        return matchesSearch && matchesDept && matchesType
      })
      .sort((a, b) => {
        // Online first, then by name
        const statusOrder: Record<string, number> = { Online: 0, InCall: 1, Busy: 2, Offline: 3 }
        const diff = (statusOrder[a.status.tag] ?? 3) - (statusOrder[b.status.tag] ?? 3)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      })
  }, [allEmployees, searchQuery, deptFilter, typeFilter])

  // Stats
  const totalHumans = allEmployees.filter((e) => e.employeeType.tag === 'Human').length
  const totalAI = allEmployees.filter((e) => e.employeeType.tag === 'AiAgent').length
  const onlineCount = allEmployees.filter((e) => e.status.tag === 'Online' || e.status.tag === 'InCall').length
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allEmployees.forEach((e) => { counts[e.department.tag] = (counts[e.department.tag] || 0) + 1 })
    return counts
  }, [allEmployees])

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Users2 className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#6366f1', '#8b5cf6', '#7c3aed', '#6366f1']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                People
              </GradientText>
              <p className="text-xs text-muted-foreground">Team directory & organizational chart</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Type filter */}
            <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
              {([['all', 'All'], ['human', 'Humans'], ['ai', 'AI']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTypeFilter(val)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    typeFilter === val
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <Grid3X3 className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Team</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={allEmployees.length} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Users2 className="size-4 text-indigo-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Humans</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={totalHumans} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">AI Agents</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={totalAI} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Bot className="size-4 text-violet-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Online Now</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={onlineCount} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Search + department filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {DEPARTMENT_FILTERS.map((d) => {
              const cfg = d !== 'All' ? deptConfig[d] : null
              const count = d === 'All' ? allEmployees.length : (deptCounts[d] ?? 0)
              return (
                <button
                  key={d}
                  onClick={() => setDeptFilter(d)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    deptFilter === d
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cfg && <span className={`size-1.5 rounded-full ${cfg.dot}`} />}
                  {d}
                  {count > 0 && <span className="opacity-60 tabular-nums">{count}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* People list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center mb-3">
              <Users2 className="size-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">No people found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((person) => {
              const dept = deptConfig[person.department.tag as DepartmentTag]
              const status = statusConfig[person.status.tag as StatusTag]
              const isAI = person.employeeType.tag === 'AiAgent'

              return (
                <Link key={person.id.toHexString()} href={`/profile/${person.id.toHexString()}`}>
                  <SpotlightCard
                    spotlightColor="rgba(99, 102, 241, 0.08)"
                    className="rounded-xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="size-10">
                          {person.avatarUrl && <AvatarImage src={person.avatarUrl} />}
                          <AvatarFallback className={`text-xs font-medium ${isAI ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                            {isAI ? <Bot className="size-4" /> : getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${status?.dot ?? 'bg-neutral-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{person.name}</p>
                          {isAI && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              AI
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                      </div>
                    </div>

                    {/* Department + status */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${dept?.cls ?? ''}`}>
                        <span className={`size-1 rounded-full ${dept?.dot ?? ''}`} />
                        {person.department.tag}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${status?.cls ?? ''}`}>
                        <span className={`size-1.5 rounded-full ${status?.dot ?? ''}`} />
                        {status?.label ?? person.status.tag}
                      </span>
                    </div>

                    {/* Skills */}
                    {person.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {person.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted/60 text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                        {person.skills.length > 3 && (
                          <span className="px-1 py-0.5 text-[9px] text-muted-foreground">+{person.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        <Star className="size-2.5 inline mr-0.5" />
                        {person.tasksCompleted} tasks
                      </span>
                      {person.avgConfidenceScore !== null && person.avgConfidenceScore !== undefined && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {Math.round(person.avgConfidenceScore * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </SpotlightCard>
                </Link>
              )
            })}
          </div>
        ) : (
          /* List view */
          <div className="divide-y">
            {filtered.map((person) => {
              const dept = deptConfig[person.department.tag as DepartmentTag]
              const status = statusConfig[person.status.tag as StatusTag]
              const isAI = person.employeeType.tag === 'AiAgent'

              return (
                <Link
                  key={person.id.toHexString()}
                  href={`/profile/${person.id.toHexString()}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="size-9">
                      {person.avatarUrl && <AvatarImage src={person.avatarUrl} />}
                      <AvatarFallback className={`text-xs font-medium ${isAI ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                        {isAI ? <Bot className="size-3.5" /> : getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${status?.dot ?? 'bg-neutral-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{person.name}</span>
                      {isAI && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">AI</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{person.role}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${dept?.cls ?? ''}`}>
                    {person.department.tag}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${status?.cls ?? ''}`}>
                    <span className={`size-1.5 rounded-full ${status?.dot ?? ''}`} />
                    {status?.label ?? person.status.tag}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">
                    {person.tasksCompleted} tasks
                  </span>
                  {person.email && (
                    <Mail className="size-3.5 text-muted-foreground" />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
