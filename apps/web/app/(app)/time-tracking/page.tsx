'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  Clock,
  Play,
  Square,
  Trash2,
  Pencil,
  DollarSign,
  Timer,
  CalendarDays,
  TrendingUp,
  ChevronDown,
  Check,
  X,
  Tag,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { tag: 'Development', label: 'Development', color: '#3b82f6' },
  { tag: 'Meeting', label: 'Meeting', color: '#8b5cf6' },
  { tag: 'Support', label: 'Support', color: '#ec4899' },
  { tag: 'Sales', label: 'Sales', color: '#f97316' },
  { tag: 'Recruitment', label: 'Recruitment', color: '#10b981' },
  { tag: 'Admin', label: 'Admin', color: '#06b6d4' },
  { tag: 'Review', label: 'Review', color: '#eab308' },
  { tag: 'Planning', label: 'Planning', color: '#a855f7' },
  { tag: 'Break', label: 'Break', color: '#64748b' },
  { tag: 'Other', label: 'Other', color: '#6b7280' },
] as const

type DateFilter = 'today' | 'week' | 'month'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatTimeRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return end ? `${fmt(start)} - ${fmt(end)}` : `${fmt(start)} - now`
}

function formatHours(ms: number): string {
  return (ms / 3600000).toFixed(1)
}

function getCategoryColor(tag: string): string {
  return CATEGORY_OPTIONS.find(c => c.tag === tag)?.color ?? '#6b7280'
}

function timestampToDate(ts: any): Date {
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts / 1000)
  return new Date()
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isThisWeek(d: Date): boolean {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

function isThisMonth(d: Date): boolean {
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function getDurationMs(entry: { startedAt: any; endedAt: any; durationMinutes: number }): number {
  if (entry.endedAt) {
    return timestampToDate(entry.endedAt).getTime() - timestampToDate(entry.startedAt).getTime()
  }
  // Active timer — compute from start to now
  return Date.now() - timestampToDate(entry.startedAt).getTime()
}

function getDayOfWeek(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1 // Mon=0 ... Sun=6
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allTimeEntries] = useTable(tables.timeEntry)
  const [employees] = useTable(tables.employee)

  const startTimeEntry = useReducer(reducers.startTimeEntry)
  const stopTimeEntry = useReducer(reducers.stopTimeEntry)
  const logTimeEntry = useReducer(reducers.logTimeEntry)
  const deleteTimeEntry = useReducer(reducers.deleteTimeEntry)

  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  // Timer UI state
  const [elapsed, setElapsed] = useState(0)
  const [timerDescription, setTimerDescription] = useState('')
  const [timerCategory, setTimerCategory] = useState('Development')
  const [timerBillable, setTimerBillable] = useState(true)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Edit state
  const [editingId, setEditingId] = useState<bigint | null>(null)
  const [editDescription, setEditDescription] = useState('')

  // Manual log state
  const [showManualLog, setShowManualLog] = useState(false)
  const [manualDesc, setManualDesc] = useState('')
  const [manualCategory, setManualCategory] = useState('Development')
  const [manualDuration, setManualDuration] = useState('')
  const [manualBillable, setManualBillable] = useState(true)

  // Filter entries for current org
  const orgEntries = useMemo(() => {
    if (currentOrgId === null) return []
    return allTimeEntries.filter(e => e.orgId === BigInt(currentOrgId))
  }, [allTimeEntries, currentOrgId])

  // My entries
  const myEntries = useMemo(() => {
    if (!identity) return []
    return orgEntries.filter(e => e.userId.toHexString() === identity.toHexString())
  }, [orgEntries, identity])

  // Find active timer (my entry with no endedAt)
  const activeTimer = useMemo(() => {
    return myEntries.find(e => !e.endedAt)
  }, [myEntries])

  // Live timer tick
  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Date.now() - timestampToDate(activeTimer.startedAt).getTime())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (currentOrgId === null) return
    try {
      await startTimeEntry({
        orgId: BigInt(currentOrgId),
        categoryTag: timerCategory,
        description: timerDescription || 'Untitled entry',
        taskId: null,
        ticketId: null,
        billable: timerBillable,
      })
      setTimerDescription('')
    } catch (e) {
      console.error('Failed to start timer:', e)
    }
  }, [currentOrgId, timerCategory, timerDescription, timerBillable, startTimeEntry])

  const handleStop = useCallback(async () => {
    if (!activeTimer) return
    try {
      await stopTimeEntry({ entryId: activeTimer.id })
    } catch (e) {
      console.error('Failed to stop timer:', e)
    }
  }, [activeTimer, stopTimeEntry])

  const handleDelete = useCallback(async (entryId: bigint) => {
    try {
      await deleteTimeEntry({ entryId })
    } catch (e) {
      console.error('Failed to delete entry:', e)
    }
  }, [deleteTimeEntry])

  const handleManualLog = useCallback(async () => {
    if (currentOrgId === null) return
    const minutes = parseInt(manualDuration, 10)
    if (!minutes || minutes <= 0) return
    try {
      await logTimeEntry({
        orgId: BigInt(currentOrgId),
        categoryTag: manualCategory,
        description: manualDesc || 'Manual entry',
        taskId: null,
        ticketId: null,
        durationMinutes: minutes,
        billable: manualBillable,
      })
      setShowManualLog(false)
      setManualDesc('')
      setManualDuration('')
    } catch (e) {
      console.error('Failed to log entry:', e)
    }
  }, [currentOrgId, manualCategory, manualDesc, manualDuration, manualBillable, logTimeEntry])

  // ─── Computed values ─────────────────────────────────────────────────────

  const completedEntries = useMemo(() => {
    return myEntries.filter(e => !!e.endedAt)
  }, [myEntries])

  const filteredEntries = useMemo(() => {
    const filterFn =
      dateFilter === 'today' ? isToday
        : dateFilter === 'week' ? isThisWeek
        : isThisMonth
    return completedEntries
      .filter(e => filterFn(timestampToDate(e.startedAt)))
      .sort((a, b) => timestampToDate(b.startedAt).getTime() - timestampToDate(a.startedAt).getTime())
  }, [completedEntries, dateFilter])

  const todayEntries = useMemo(
    () => completedEntries.filter(e => isToday(timestampToDate(e.startedAt))),
    [completedEntries]
  )

  const weekEntries = useMemo(
    () => completedEntries.filter(e => isThisWeek(timestampToDate(e.startedAt))),
    [completedEntries]
  )

  const hoursToday = useMemo(
    () => todayEntries.reduce((sum, e) => sum + getDurationMs(e), 0) / 3600000,
    [todayEntries]
  )

  const hoursThisWeek = useMemo(
    () => weekEntries.reduce((sum, e) => sum + getDurationMs(e), 0) / 3600000,
    [weekEntries]
  )

  const billableHours = useMemo(
    () =>
      weekEntries
        .filter(e => e.billable)
        .reduce((sum, e) => sum + getDurationMs(e), 0) / 3600000,
    [weekEntries]
  )

  // Weekly bar chart data (Mon-Sun)
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const hours = Array(7).fill(0) as number[]
    weekEntries.forEach(e => {
      hours[getDayOfWeek(timestampToDate(e.startedAt))] += getDurationMs(e) / 3600000
    })
    const max = Math.max(...hours, 1)
    return days.map((label, i) => ({ label, hours: hours[i], pct: (hours[i] / max) * 100 }))
  }, [weekEntries])

  const weeklyTotal = useMemo(
    () => weeklyData.reduce((s, d) => s + d.hours, 0),
    [weeklyData]
  )

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    weekEntries.forEach(e => {
      const cat = e.category?.tag ?? 'Other'
      map.set(cat, (map.get(cat) ?? 0) + getDurationMs(e) / 3600000)
    })
    const total = [...map.values()].reduce((s, h) => s + h, 0) || 1
    const items = [...map.entries()]
      .map(([tag, totalHours]) => ({ tag, color: getCategoryColor(tag), totalHours }))
      .sort((a, b) => b.totalHours - a.totalHours)
    return { items, total }
  }, [weekEntries])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Top header bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Clock className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              <GradientText colors={['#10b981', '#059669', '#047857']} animationSpeed={6}>
                Time Tracking
              </GradientText>
            </h1>
          </div>
        </div>
        <div className="ml-auto">
          <PresenceBar />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(16, 185, 129, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                  <Clock className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Hours Today</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                <CountUp to={parseFloat(hoursToday.toFixed(1))} from={0} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">h</span>
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(59, 130, 246, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <TrendingUp className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Hours This Week</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                <CountUp to={parseFloat(hoursThisWeek.toFixed(1))} from={0} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">h</span>
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(245, 158, 11, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Timer className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Timer</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {activeTimer ? formatDuration(elapsed) : (
                  <span className="text-muted-foreground">--:--:--</span>
                )}
              </p>
            </SpotlightCard>

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(168, 85, 247, 0.15)">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                  <DollarSign className="size-3.5 text-white" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Billable Hours</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                <CountUp to={parseFloat(billableHours.toFixed(1))} from={0} duration={1.5} />
                <span className="text-base font-medium text-muted-foreground ml-0.5">h</span>
              </p>
            </SpotlightCard>
          </div>

          {/* Live Timer — Hero Section */}
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-5">
              {/* Timer display */}
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`text-6xl sm:text-7xl font-bold tabular-nums tracking-tight transition-colors ${
                      activeTimer
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-300 dark:text-neutral-600'
                    }`}
                  >
                    {formatDuration(elapsed)}
                  </span>
                  {activeTimer && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Recording — {activeTimer.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Description */}
                <input
                  type="text"
                  placeholder="What are you working on?"
                  value={activeTimer ? activeTimer.description : timerDescription}
                  onChange={e => setTimerDescription(e.target.value)}
                  disabled={!!activeTimer}
                  className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
                />

                {/* Category selector */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => !activeTimer && setCategoryDropdownOpen(!categoryDropdownOpen)}
                    disabled={!!activeTimer}
                    className="h-10 px-3 rounded-lg border bg-background text-sm flex items-center gap-2 min-w-[160px] hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(activeTimer ? (activeTimer.category?.tag ?? 'Other') : timerCategory) }}
                    />
                    <span className="truncate flex-1 text-left">
                      {activeTimer ? (activeTimer.category?.tag ?? 'Other') : timerCategory}
                    </span>
                    <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                  {categoryDropdownOpen && !activeTimer && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-lg shadow-lg z-50 py-1">
                      {CATEGORY_OPTIONS.map(c => (
                        <button
                          key={c.tag}
                          onClick={() => {
                            setTimerCategory(c.tag)
                            setCategoryDropdownOpen(false)
                          }}
                          className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors"
                        >
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="truncate">{c.label}</span>
                          {c.tag === timerCategory && (
                            <Check className="size-3.5 text-emerald-500 ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Billable toggle */}
                <button
                  onClick={() => !activeTimer && setTimerBillable(!timerBillable)}
                  disabled={!!activeTimer}
                  className={`h-10 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    (activeTimer ? activeTimer.billable : timerBillable)
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border bg-background text-muted-foreground'
                  } disabled:opacity-50`}
                >
                  <DollarSign className="size-3.5" />
                  {(activeTimer ? activeTimer.billable : timerBillable) ? 'Billable' : 'Non-billable'}
                </button>

                {/* Start/Stop button */}
                <button
                  onClick={activeTimer ? handleStop : handleStart}
                  className={`h-10 px-6 rounded-lg font-medium text-sm text-white flex items-center gap-2 transition-all shadow-lg ${
                    activeTimer
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                  }`}
                >
                  {activeTimer ? (
                    <>
                      <Square className="size-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      Start
                    </>
                  )}
                </button>
              </div>

              {/* Manual log toggle */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowManualLog(!showManualLog)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showManualLog ? 'Hide manual entry' : '+ Log time manually'}
                </button>
              </div>

              {/* Manual log form */}
              {showManualLog && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t">
                  <input
                    type="text"
                    placeholder="Description"
                    value={manualDesc}
                    onChange={e => setManualDesc(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <input
                    type="number"
                    placeholder="Minutes"
                    value={manualDuration}
                    onChange={e => setManualDuration(e.target.value)}
                    min="1"
                    className="w-24 h-9 px-3 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 tabular-nums"
                  />
                  <select
                    value={manualCategory}
                    onChange={e => setManualCategory(e.target.value)}
                    className="h-9 px-3 rounded-lg border bg-background text-sm"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.tag} value={c.tag}>{c.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setManualBillable(!manualBillable)}
                    className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                      manualBillable
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    <DollarSign className="size-3" />
                    {manualBillable ? '$' : '-'}
                  </button>
                  <button
                    onClick={handleManualLog}
                    className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                  >
                    Log
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
            {(['today', 'week', 'month'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Time entries list */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                <CalendarDays className="size-4 inline-block mr-1.5 -mt-0.5 text-muted-foreground" />
                Time Entries
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-muted mb-4">
                  <Clock className="size-6 opacity-40" />
                </div>
                <p className="font-medium">No entries for this period</p>
                <p className="text-sm mt-1">Start the timer to track your work.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEntries.map(entry => {
                  const duration = getDurationMs(entry)
                  const catTag = entry.category?.tag ?? 'Other'
                  const color = getCategoryColor(catTag)
                  const isEditing = editingId === entry.id

                  return (
                    <div
                      key={entry.id.toString()}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      {/* Time range */}
                      <div className="w-[120px] shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatTimeRange(timestampToDate(entry.startedAt), entry.endedAt ? timestampToDate(entry.endedAt) : null)}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="w-[70px] shrink-0">
                        <span className="text-sm font-medium tabular-nums">
                          {formatHours(duration)}h
                        </span>
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              className="flex-1 h-7 px-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') setEditingId(null)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                            />
                            <button
                              onClick={() => setEditingId(null)}
                              className="size-6 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <Check className="size-3" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="size-6 flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm truncate block">{entry.description}</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-muted-foreground">{catTag}</span>
                      </div>

                      {/* Billable */}
                      {entry.billable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                          <DollarSign className="size-2.5" />
                          Billable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-muted text-muted-foreground border-border shrink-0">
                          Non-billable
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(entry.id)
                            setEditDescription(entry.description)
                          }}
                          className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom row: Weekly summary + Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Summary */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Weekly Summary</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {weeklyTotal.toFixed(1)}h total
                </span>
              </div>
              <div className="flex items-end gap-2 h-[140px]">
                {weeklyData.map(day => (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col items-center justify-end h-[100px]">
                      <div
                        className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-emerald-500 to-green-400 transition-all duration-500"
                        style={{ height: `${Math.max(day.pct, day.hours > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {day.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Category Breakdown</h2>
                <span className="text-xs text-muted-foreground">This week</span>
              </div>
              {categoryBreakdown.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data this week</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {categoryBreakdown.items.map(item => {
                    const pct = (item.totalHours / categoryBreakdown.total) * 100
                    return (
                      <div key={item.tag} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.tag}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.totalHours.toFixed(1)}h
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-[36px] text-right">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
