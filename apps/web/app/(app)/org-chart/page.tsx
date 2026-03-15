'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg, displayOrgName } from '@/components/org-context'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  Users,
  Search,
  GitBranch,
  List,
  Bot,
  Building2,
  Wifi,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Code,
  TrendingUp,
  Megaphone,
  Headphones,
  Palette,
  Heart,
  Settings,
  DollarSign,
  Scale,
  Crown,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

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

const DEPARTMENT_BG: Record<string, string> = {
  Engineering: 'from-blue-500 to-blue-600',
  Sales: 'from-emerald-500 to-emerald-600',
  Marketing: 'from-purple-500 to-purple-600',
  Support: 'from-amber-500 to-amber-600',
  Design: 'from-pink-500 to-pink-600',
  HR: 'from-teal-500 to-teal-600',
  Operations: 'from-orange-500 to-orange-600',
  Finance: 'from-cyan-500 to-cyan-600',
  Legal: 'from-rose-500 to-rose-600',
  Executive: 'from-indigo-500 to-indigo-600',
}

const DEPARTMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Engineering: Code,
  Sales: TrendingUp,
  Marketing: Megaphone,
  Support: Headphones,
  Design: Palette,
  HR: Heart,
  Operations: Settings,
  Finance: DollarSign,
  Legal: Scale,
  Executive: Crown,
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  Online: { color: 'bg-emerald-500', label: 'Online' },
  Busy: { color: 'bg-amber-500', label: 'Busy' },
  Offline: { color: 'bg-neutral-400', label: 'Offline' },
  InCall: { color: 'bg-blue-500 animate-pulse', label: 'In Call' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Chart: Person Node ───────────────────────────────────────────────────────

function PersonNode({
  person,
  isHighlighted,
}: {
  person: any
  isHighlighted: boolean
}) {
  const isAI = person.employeeType.tag === 'AiAgent'
  const status = getStatus(person.status.tag)
  const hexId = person.id.toHexString()

  return (
    <Link
      href={`/profile/${hexId}`}
      className={`group block w-44 transition-all duration-200 ${
        isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-950 rounded-xl' : ''
      }`}
    >
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-center transition-all hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5">
        <div className="relative inline-block mb-2">
          <Avatar className="size-10 mx-auto">
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
            title={status.label}
          />
        </div>
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]">
            {person.name}
          </p>
          {isAI && <Bot className="size-3 text-purple-500 shrink-0" />}
        </div>
        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
          {person.role}
        </p>
      </div>
    </Link>
  )
}

// ── Chart: Department Node ───────────────────────────────────────────────────

function DepartmentNode({
  dept,
  count,
  isHighlighted,
}: {
  dept: string
  count: number
  isHighlighted: boolean
}) {
  const Icon = DEPARTMENT_ICONS[dept] ?? Building2
  const gradient = DEPARTMENT_BG[dept] ?? 'from-neutral-500 to-neutral-600'

  return (
    <div
      className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-center w-40 transition-all ${
        isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-950' : ''
      }`}
    >
      <div className={`inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} mb-2`}>
        <Icon className="size-4 text-white" />
      </div>
      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{dept}</p>
      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
        {count} {count === 1 ? 'member' : 'members'}
      </p>
    </div>
  )
}

// ── Chart: Company Root Node ─────────────────────────────────────────────────

function CompanyNode({ name, total }: { name: string; total: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-center w-48">
      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 mb-2">
        <Sparkles className="size-5 text-white" />
      </div>
      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{name}</p>
      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
        {total} {total === 1 ? 'member' : 'members'}
      </p>
    </div>
  )
}

// ── Chart View ───────────────────────────────────────────────────────────────

function ChartView({
  orgName,
  departments,
  totalMembers,
  highlightedIds,
}: {
  orgName: string
  departments: { dept: string; members: any[] }[]
  totalMembers: number
  highlightedIds: Set<string>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.15, 2)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.15, 0.3)), [])
  const fitView = useCallback(() => {
    setZoom(0.75)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    // Only pan if clicking on the background, not on nodes
    if ((e.target as HTMLElement).closest('a, button')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    })
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(Math.max(z + delta, 0.3), 2))
  }, [])

  return (
    <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 shadow-sm">
        <button
          onClick={zoomIn}
          className="flex items-center justify-center size-7 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </button>
        <span className="text-[10px] text-neutral-400 tabular-nums w-8 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomOut}
          className="flex items-center justify-center size-7 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />
        <button
          onClick={fitView}
          className="flex items-center justify-center size-7 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Fit to view"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Chart canvas */}
      <div
        ref={containerRef}
        className="min-h-[500px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ overflow: 'hidden' }}
      >
        <div
          className="flex flex-col items-center py-10 transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Level 1: Company root */}
          <CompanyNode name={orgName} total={totalMembers} />

          {/* Connector: root to departments */}
          {departments.length > 0 && (
            <div className="w-px h-8 bg-neutral-300 dark:bg-neutral-700" />
          )}

          {/* Level 2: Departments */}
          {departments.length > 0 && (
            <div className="relative">
              {/* Horizontal connector bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{
                width: departments.length > 1
                  ? `calc(${(departments.length - 1) * 192}px)`
                  : '0px',
                height: '1px',
                background: departments.length > 1
                  ? 'var(--connector-color, rgb(212 212 216))'
                  : 'transparent',
              }}>
                <style>{`:root { --connector-color: rgb(212 212 216); } .dark { --connector-color: rgb(64 64 64); }`}</style>
              </div>

              <div className="flex gap-12 relative">
                {departments.map(({ dept, members }) => {
                  const deptHighlighted = members.some((m) => highlightedIds.has(m.id.toHexString()))
                  return (
                    <div key={dept} className="flex flex-col items-center">
                      {/* Vertical stub from horizontal bar to department */}
                      <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700" />

                      <DepartmentNode
                        dept={dept}
                        count={members.length}
                        isHighlighted={deptHighlighted}
                      />

                      {/* Connector: department to people */}
                      {members.length > 0 && (
                        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700" />
                      )}

                      {/* Level 3: People */}
                      <div className="flex flex-col items-center gap-2">
                        {members.map((person) => (
                          <div key={person.id.toHexString()} className="flex flex-col items-center">
                            {members.indexOf(person) > 0 && (
                              <div className="w-px h-2 bg-neutral-200 dark:bg-neutral-800" />
                            )}
                            <PersonNode
                              person={person}
                              isHighlighted={highlightedIds.has(person.id.toHexString())}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {departments.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-neutral-400">No departments to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── List View: Department Section ────────────────────────────────────────────

function DepartmentSection({
  dept,
  members,
  highlightedIds,
}: {
  dept: string
  members: any[]
  highlightedIds: Set<string>
}) {
  const [expanded, setExpanded] = useState(true)
  const Icon = DEPARTMENT_ICONS[dept] ?? Building2
  const gradient = DEPARTMENT_BG[dept] ?? 'from-neutral-500 to-neutral-600'

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
          <Icon className="size-4 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{dept}</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="size-4 text-neutral-400" />
        ) : (
          <ChevronRight className="size-4 text-neutral-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((person) => {
            const isAI = person.employeeType.tag === 'AiAgent'
            const status = getStatus(person.status.tag)
            const hexId = person.id.toHexString()
            const isHL = highlightedIds.has(hexId)

            return (
              <Link
                key={hexId}
                href={`/profile/${hexId}`}
                className={`group flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-teal-500/[0.02] ${
                  isHL ? 'bg-amber-500/5' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-8">
                    {person.avatarUrl && <AvatarImage src={person.avatarUrl} />}
                    <AvatarFallback
                      className={`text-[10px] font-semibold text-white ${
                        isAI
                          ? 'bg-gradient-to-br from-purple-500 to-violet-600'
                          : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                      }`}
                    >
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-neutral-900 ${status.color}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {person.name}
                    </span>
                    {isAI && <Bot className="size-3 text-purple-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {person.role}
                  </p>
                </div>
                <span
                  className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${getDeptColor(dept)}`}
                >
                  {isAI ? 'AI Agent' : 'Human'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0">
                  <span className={`size-1.5 rounded-full ${status.color}`} />
                  {status.label}
                </span>
                <ChevronRight className="size-3.5 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrg, orgMembers } = useOrg()
  const [allEmployees] = useTable(tables.employee)

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart')

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

  // Group by department
  const departments = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const emp of orgEmployees) {
      const dept = emp.department.tag
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(emp)
    }
    // Sort departments by size (largest first), then alphabetically
    return [...map.entries()]
      .sort((a, b) => {
        if (b[1].length !== a[1].length) return b[1].length - a[1].length
        return a[0].localeCompare(b[0])
      })
      .map(([dept, members]) => ({
        dept,
        members: [...members].sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [orgEmployees])

  // Search highlighting
  const highlightedIds = useMemo(() => {
    if (!search.trim()) return new Set<string>()
    const q = search.toLowerCase()
    const ids = new Set<string>()
    for (const emp of orgEmployees) {
      if (
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.tag.toLowerCase().includes(q) ||
        (emp.email?.toLowerCase().includes(q) ?? false)
      ) {
        ids.add(emp.id.toHexString())
      }
    }
    return ids
  }, [orgEmployees, search])

  // Stats
  const totalCount = orgEmployees.length
  const onlineCount = orgEmployees.filter(
    (e) => e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall'
  ).length
  const aiCount = orgEmployees.filter((e) => e.employeeType.tag === 'AiAgent').length
  const uniqueDepts = new Set(orgEmployees.map((e) => e.department.tag)).size

  const orgName = displayOrgName(currentOrg?.name)

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <GitBranch className="size-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              <GradientText
                colors={['#f59e0b', '#f97316', '#ef4444']}
                animationSpeed={6}
                className="font-bold"
              >
                Organization
              </GradientText>
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Visual hierarchy of your organization structure
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(245, 158, 11, 0.1)"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Users className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">
                  Total Members
                </p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={totalCount} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(249, 115, 22, 0.1)"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10">
                <Building2 className="size-5 text-orange-600 dark:text-orange-400" />
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
        </div>

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              placeholder="Search people to highlight..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
            {search && highlightedIds.size > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">
                {highlightedIds.size} found
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <GitBranch className="size-3.5" />
              Chart
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>
        </div>

        {/* Content */}
        {orgEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <GitBranch className="size-8 text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              No organization data yet
            </h3>
            <p className="text-sm text-neutral-400 max-w-xs">
              Team members will appear here once they join the organization.
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <ChartView
            orgName={orgName}
            departments={departments}
            totalMembers={totalCount}
            highlightedIds={highlightedIds}
          />
        ) : (
          <div className="space-y-3">
            {departments.map(({ dept, members }) => (
              <DepartmentSection
                key={dept}
                dept={dept}
                members={members}
                highlightedIds={highlightedIds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
      </div>
    </div>
  )
}
