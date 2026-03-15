'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeEntry = {
  id: string
  description: string
  project: string
  startTime: Date
  endTime: Date | null
  tags: string[]
  billable: boolean
}

type Project = {
  name: string
  color: string
  totalHours: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ef4444', // red
]

const SAMPLE_PROJECTS = [
  'Omni Platform',
  'Marketing Site',
  'Mobile App',
  'API Refactor',
  'Design System',
  'Internal Tools',
]

type DateFilter = 'today' | 'week' | 'month'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

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

function getProjectColor(name: string): string {
  const idx = SAMPLE_PROJECTS.indexOf(name)
  return PROJECT_COLORS[idx >= 0 ? idx : Math.abs(hashCode(name)) % PROJECT_COLORS.length]
}

function hashCode(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return hash
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

function getDurationMs(entry: TimeEntry): number {
  const end = entry.endTime ?? new Date()
  return end.getTime() - entry.startTime.getTime()
}

function getDayOfWeek(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1 // Mon=0 ... Sun=6
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

function createSampleEntries(): TimeEntry[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const entries: TimeEntry[] = []

  // Today's entries
  entries.push({
    id: generateId(),
    description: 'Sprint planning meeting',
    project: 'Omni Platform',
    startTime: new Date(today.getTime() + 9 * 3600000),
    endTime: new Date(today.getTime() + 10 * 3600000),
    tags: ['meeting'],
    billable: true,
  })
  entries.push({
    id: generateId(),
    description: 'Fix authentication bug',
    project: 'API Refactor',
    startTime: new Date(today.getTime() + 10.25 * 3600000),
    endTime: new Date(today.getTime() + 12.5 * 3600000),
    tags: ['bugfix', 'backend'],
    billable: true,
  })
  entries.push({
    id: generateId(),
    description: 'Design review for new dashboard',
    project: 'Design System',
    startTime: new Date(today.getTime() + 13 * 3600000),
    endTime: new Date(today.getTime() + 14 * 3600000),
    tags: ['design', 'review'],
    billable: false,
  })
  entries.push({
    id: generateId(),
    description: 'Implement time tracking page',
    project: 'Omni Platform',
    startTime: new Date(today.getTime() + 14.25 * 3600000),
    endTime: new Date(today.getTime() + 16.75 * 3600000),
    tags: ['frontend', 'feature'],
    billable: true,
  })

  // Earlier this week
  for (let daysAgo = 1; daysAgo <= 4; daysAgo++) {
    const day = new Date(today.getTime() - daysAgo * 86400000)
    if (day.getDay() === 0 || day.getDay() === 6) continue
    entries.push({
      id: generateId(),
      description: 'Code review and PR feedback',
      project: 'API Refactor',
      startTime: new Date(day.getTime() + 9 * 3600000),
      endTime: new Date(day.getTime() + 11 * 3600000),
      tags: ['review'],
      billable: true,
    })
    entries.push({
      id: generateId(),
      description: 'Feature development',
      project: 'Mobile App',
      startTime: new Date(day.getTime() + 11.5 * 3600000),
      endTime: new Date(day.getTime() + 15.5 * 3600000),
      tags: ['development'],
      billable: true,
    })
    entries.push({
      id: generateId(),
      description: 'Team standup',
      project: 'Omni Platform',
      startTime: new Date(day.getTime() + 15.75 * 3600000),
      endTime: new Date(day.getTime() + 16 * 3600000),
      tags: ['meeting'],
      billable: false,
    })
  }

  return entries
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>(() => createSampleEntries())
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [timerDescription, setTimerDescription] = useState('')
  const [timerProject, setTimerProject] = useState(SAMPLE_PROJECTS[0])
  const [timerBillable, setTimerBillable] = useState(true)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')

  // Live timer tick
  useEffect(() => {
    if (!isRunning || !timerStart) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - timerStart.getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, timerStart])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleStart = useCallback(() => {
    const now = new Date()
    setTimerStart(now)
    setElapsed(0)
    setIsRunning(true)
  }, [])

  const handleStop = useCallback(() => {
    if (!timerStart) return
    const newEntry: TimeEntry = {
      id: generateId(),
      description: timerDescription || 'Untitled entry',
      project: timerProject,
      startTime: timerStart,
      endTime: new Date(),
      tags: [],
      billable: timerBillable,
    }
    setEntries(prev => [newEntry, ...prev])
    setIsRunning(false)
    setTimerStart(null)
    setElapsed(0)
    setTimerDescription('')
  }, [timerStart, timerDescription, timerProject, timerBillable])

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleEditSave = useCallback((id: string) => {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, description: editDescription } : e))
    )
    setEditingId(null)
  }, [editDescription])

  // ─── Computed values ─────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    const filterFn =
      dateFilter === 'today' ? isToday
        : dateFilter === 'week' ? isThisWeek
        : isThisMonth
    return entries
      .filter(e => filterFn(e.startTime))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }, [entries, dateFilter])

  const todayEntries = useMemo(
    () => entries.filter(e => isToday(e.startTime)),
    [entries]
  )

  const weekEntries = useMemo(
    () => entries.filter(e => isThisWeek(e.startTime)),
    [entries]
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
      hours[getDayOfWeek(e.startTime)] += getDurationMs(e) / 3600000
    })
    const max = Math.max(...hours, 1)
    return days.map((label, i) => ({ label, hours: hours[i], pct: (hours[i] / max) * 100 }))
  }, [weekEntries])

  const weeklyTotal = useMemo(
    () => weeklyData.reduce((s, d) => s + d.hours, 0),
    [weeklyData]
  )

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    weekEntries.forEach(e => {
      map.set(e.project, (map.get(e.project) ?? 0) + getDurationMs(e) / 3600000)
    })
    const total = [...map.values()].reduce((s, h) => s + h, 0) || 1
    const projects: Project[] = [...map.entries()]
      .map(([name, totalHours]) => ({ name, color: getProjectColor(name), totalHours }))
      .sort((a, b) => b.totalHours - a.totalHours)
    return { projects, total }
  }, [weekEntries])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
          <Clock className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#10b981', '#059669', '#047857']}
              animationSpeed={6}
            >
              Time Tracking
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your work hours, manage projects, and review weekly summaries
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
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

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
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

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Timer className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active Timer</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {isRunning ? formatDuration(elapsed) : (
              <span className="text-muted-foreground">--:--:--</span>
            )}
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
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
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5">
          {/* Timer display */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span
                className={`text-6xl sm:text-7xl font-bold tabular-nums tracking-tight transition-colors ${
                  isRunning
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-300 dark:text-neutral-600'
                }`}
              >
                {formatDuration(elapsed)}
              </span>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Recording time
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
              value={timerDescription}
              onChange={e => setTimerDescription(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />

            {/* Project selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm flex items-center gap-2 min-w-[160px] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getProjectColor(timerProject) }}
                />
                <span className="truncate flex-1 text-left">{timerProject}</span>
                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>
              {projectDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 py-1">
                  {SAMPLE_PROJECTS.map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        setTimerProject(p)
                        setProjectDropdownOpen(false)
                      }}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getProjectColor(p) }}
                      />
                      <span className="truncate">{p}</span>
                      {p === timerProject && (
                        <Check className="size-3.5 text-emerald-500 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Billable toggle */}
            <button
              onClick={() => setTimerBillable(!timerBillable)}
              className={`h-10 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                timerBillable
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-muted-foreground'
              }`}
            >
              <DollarSign className="size-3.5" />
              {timerBillable ? 'Billable' : 'Non-billable'}
            </button>

            {/* Start/Stop button */}
            <button
              onClick={isRunning ? handleStop : handleStart}
              className={`h-10 px-6 rounded-lg font-medium text-sm text-white flex items-center gap-2 transition-all shadow-lg ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
              }`}
            >
              {isRunning ? (
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
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 w-fit">
        {(['today', 'week', 'month'] as DateFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              dateFilter === f
                ? 'bg-white dark:bg-neutral-700 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* Time entries list */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
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
            <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Clock className="size-6 opacity-40" />
            </div>
            <p className="font-medium">No entries for this period</p>
            <p className="text-sm mt-1">Start the timer to track your work.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredEntries.map(entry => {
              const duration = getDurationMs(entry)
              const color = getProjectColor(entry.project)
              const isEditing = editingId === entry.id

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                >
                  {/* Time range */}
                  <div className="w-[120px] shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTimeRange(entry.startTime, entry.endTime)}
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
                          className="flex-1 h-7 px-2 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(entry.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button
                          onClick={() => handleEditSave(entry.id)}
                          className="size-6 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Check className="size-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="size-6 flex items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm truncate block">{entry.description}</span>
                    )}
                  </div>

                  {/* Project */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.project}</span>
                  </div>

                  {/* Billable */}
                  {entry.billable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                      <DollarSign className="size-2.5" />
                      Billable
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20 shrink-0">
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
                      className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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

      {/* Bottom row: Weekly summary + Project breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Summary */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
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

        {/* Project Breakdown */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Project Breakdown</h2>
            <span className="text-xs text-muted-foreground">This week</span>
          </div>
          {projectBreakdown.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data this week</p>
          ) : (
            <div className="flex flex-col gap-3">
              {projectBreakdown.projects.map(project => {
                const pct = (project.totalHours / projectBreakdown.total) * 100
                return (
                  <div key={project.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {project.totalHours.toFixed(1)}h
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-[36px] text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: project.color,
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
  )
}
