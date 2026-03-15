'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  Users,
  Search,
  LayoutGrid,
  List,
  Bot,
  User,
  Building2,
  Wifi,
  Sparkles,
  Mail,
  ChevronRight,
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────

const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Sales: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Marketing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  Support: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Design: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  HR: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  Operations: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Finance: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  Legal: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  Executive: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  Online: { color: 'bg-emerald-500', label: 'Online' },
  Busy: { color: 'bg-amber-500', label: 'Busy' },
  Offline: { color: 'bg-neutral-400', label: 'Offline' },
  InCall: { color: 'bg-blue-500 animate-pulse', label: 'In Call' },
}

type FilterTab = 'all' | 'humans' | 'ai'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getDeptColor(dept: string) {
  return DEPARTMENT_COLORS[dept] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
}

function getStatus(tag: string) {
  return STATUS_CONFIG[tag] ?? { color: 'bg-neutral-400', label: tag }
}

// ─── Person Card (Grid View) ────────────────────────────────────────────────

function PersonCard({
  person,
  isMe,
}: {
  person: any
  isMe: boolean
}) {
  const isAI = person.employeeType.tag === 'AiAgent'
  const status = getStatus(person.status.tag)
  const skills: string[] = person.skills ?? []
  const hexId = person.id.toHexString()

  return (
    <Link href={`/profile/${hexId}`} className="group block">
      <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden transition-all duration-200 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5">
        {/* Top accent gradient */}
        <div
          className={`absolute inset-x-0 top-0 h-0.5 ${
            isAI
              ? 'bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500'
              : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500'
          } opacity-80`}
        />

        <div className="p-5 pt-6">
          {/* Avatar + status */}
          <div className="flex items-start gap-3.5 mb-4">
            <div className="relative shrink-0">
              <Avatar className="size-12">
                {person.avatarUrl && <AvatarImage src={person.avatarUrl} />}
                <AvatarFallback
                  className={`text-sm font-semibold text-white ${
                    isAI
                      ? 'bg-gradient-to-br from-purple-500 to-violet-600'
                      : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                  }`}
                >
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white dark:border-neutral-900 ${status.color}`}
                title={status.label}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {person.name}
                </h3>
                {isMe && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    you
                  </span>
                )}
                {isAI && (
                  <Bot className="size-3.5 text-purple-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {person.role}
              </p>
            </div>
          </div>

          {/* Department + status */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getDeptColor(person.department.tag)}`}
            >
              {person.department.tag}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              <span className={`size-1.5 rounded-full ${status.color}`} />
              {status.label}
            </span>
          </div>

          {/* Skills preview */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                  +{skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover footer */}
        <div className="px-5 pb-4 pt-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 font-medium">
            View profile
            <ChevronRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Person Row (List View) ─────────────────────────────────────────────────

function PersonRow({
  person,
  isMe,
}: {
  person: any
  isMe: boolean
}) {
  const isAI = person.employeeType.tag === 'AiAgent'
  const status = getStatus(person.status.tag)
  const skills: string[] = person.skills ?? []
  const hexId = person.id.toHexString()

  return (
    <Link
      href={`/profile/${hexId}`}
      className="group flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 transition-all hover:border-teal-500/40 hover:shadow-sm hover:bg-teal-500/[0.02]"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="size-10">
          {person.avatarUrl && <AvatarImage src={person.avatarUrl} />}
          <AvatarFallback
            className={`text-xs font-semibold text-white ${
              isAI
                ? 'bg-gradient-to-br from-purple-500 to-violet-600'
                : 'bg-gradient-to-br from-teal-500 to-emerald-600'
            }`}
          >
            {getInitials(person.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-neutral-900 ${status.color}`}
        />
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {person.name}
          </span>
          {isMe && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-1.5 py-0.5 text-[10px] font-medium">
              you
            </span>
          )}
          {isAI && <Bot className="size-3 text-purple-500 shrink-0" />}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {person.role}
        </p>
      </div>

      {/* Department */}
      <span
        className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${getDeptColor(person.department.tag)}`}
      >
        {person.department.tag}
      </span>

      {/* Email */}
      {person.email && (
        <span className="hidden md:flex items-center gap-1 text-xs text-neutral-400 truncate max-w-[180px]">
          <Mail className="size-3 shrink-0" />
          {person.email}
        </span>
      )}

      {/* Skills */}
      <div className="hidden lg:flex items-center gap-1 shrink-0">
        {skills.slice(0, 2).map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400"
          >
            {skill}
          </span>
        ))}
        {skills.length > 2 && (
          <span className="text-[10px] text-neutral-400">+{skills.length - 2}</span>
        )}
      </div>

      {/* Status */}
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
        <span className={`size-2 rounded-full ${status.color}`} />
        {status.label}
      </span>

      <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const { identity } = useSpacetimeDB()
  const { orgMembers } = useOrg()
  const [allEmployees] = useTable(tables.employee)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const myHex = identity?.toHexString() ?? ''

  // Build set of org member identity hex strings
  const orgMemberHexSet = useMemo(
    () => new Set(orgMembers.map((m) => m.identity?.toHexString?.() ?? '')),
    [orgMembers]
  )

  // Filter employees to current org
  const orgEmployees = useMemo(
    () => allEmployees.filter((e) => orgMemberHexSet.has(e.id.toHexString())),
    [allEmployees, orgMemberHexSet]
  )

  // Apply filter tab
  const tabFiltered = useMemo(() => {
    if (tab === 'humans') return orgEmployees.filter((e) => e.employeeType.tag === 'Human')
    if (tab === 'ai') return orgEmployees.filter((e) => e.employeeType.tag === 'AiAgent')
    return orgEmployees
  }, [orgEmployees, tab])

  // Department counts (from tab-filtered set)
  const deptCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const emp of tabFiltered) {
      const dept = emp.department.tag
      counts.set(dept, (counts.get(dept) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [tabFiltered])

  // Apply department filter
  const deptFiltered = useMemo(
    () => (deptFilter ? tabFiltered.filter((e) => e.department.tag === deptFilter) : tabFiltered),
    [tabFiltered, deptFilter]
  )

  // Apply search
  const filtered = useMemo(() => {
    if (!search.trim()) return deptFiltered
    const q = search.toLowerCase()
    return deptFiltered.filter((e) => {
      const skills: string[] = e.skills ?? []
      return (
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        (e.email?.toLowerCase().includes(q) ?? false) ||
        e.department.tag.toLowerCase().includes(q) ||
        skills.some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [deptFiltered, search])

  // Sort: online first, then by name
  const sorted = useMemo(() => {
    const statusOrder: Record<string, number> = { Online: 0, Busy: 1, InCall: 2, Offline: 3 }
    return [...filtered].sort((a, b) => {
      const sa = statusOrder[a.status.tag] ?? 3
      const sb = statusOrder[b.status.tag] ?? 3
      if (sa !== sb) return sa - sb
      return a.name.localeCompare(b.name)
    })
  }, [filtered])

  // Stats
  const totalCount = orgEmployees.length
  const onlineCount = orgEmployees.filter(
    (e) => e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall'
  ).length
  const aiCount = orgEmployees.filter((e) => e.employeeType.tag === 'AiAgent').length
  const uniqueDepts = new Set(orgEmployees.map((e) => e.department.tag)).size

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
              <Users className="size-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              <GradientText
                colors={['#14b8a6', '#10b981', '#059669']}
                animationSpeed={6}
                className="font-bold"
              >
                People
              </GradientText>
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Your team directory — find anyone across the organization
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(20, 184, 166, 0.1)"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-teal-500/10">
                <Users className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">
                  Total People
                </p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={totalCount} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(16, 185, 129, 0.1)"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Wifi className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">
                  Online Now
                </p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={onlineCount} duration={1} />
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
                <Bot className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">
                  AI Agents
                </p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={aiCount} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(20, 184, 166, 0.1)"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-teal-500/10">
                <Building2 className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">
                  Departments
                </p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={uniqueDepts} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* ── Search + Controls ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              placeholder="Search by name, role, email, department, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center justify-center size-8 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center size-8 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5">
            {([
              { key: 'all', label: 'All', icon: Users },
              { key: 'humans', label: 'Humans', icon: User },
              { key: 'ai', label: 'AI Agents', icon: Bot },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setDeptFilter(null) }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === key
                    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-xs text-neutral-400 tabular-nums">
            {sorted.length} {sorted.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* ── Department Pills ── */}
        {deptCounts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDeptFilter(null)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                deptFilter === null
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                  : 'bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              All depts
            </button>
            {deptCounts.map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  deptFilter === dept
                    ? getDeptColor(dept)
                    : 'bg-white dark:bg-neutral-900 text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {dept}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── People Grid / List ── */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Users className="size-8 text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {search ? 'No results found' : 'No people yet'}
            </h3>
            <p className="text-sm text-neutral-400 max-w-xs">
              {search
                ? `No one matches "${search}". Try a different search term.`
                : 'People will appear here once team members join the organization.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((person) => (
              <PersonCard
                key={person.id.toHexString()}
                person={person}
                isMe={person.id.toHexString() === myHex}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((person) => (
              <PersonRow
                key={person.id.toHexString()}
                person={person}
                isMe={person.id.toHexString() === myHex}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
