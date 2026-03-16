'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  Coffee, ChevronLeft, ChevronRight, Send, AlertTriangle,
  CheckCircle2, XCircle, Users, Flame, BarChart3, Clock,
  Trash2, Undo2, Search, Download, CalendarDays, Calendar,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { exportCSV } from '@/lib/csv-export'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'

// ─── Types ───────────────────────────────────────────────────────────────────

type MoodKey = 'Great' | 'Good' | 'Okay' | 'Struggling'

const MOOD_CONFIG: Record<MoodKey, { emoji: string; color: string; bg: string; border: string; label: string }> = {
  Great:      { emoji: '\u{1F7E2}', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Great' },
  Good:       { emoji: '\u{1F535}', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Good' },
  Okay:       { emoji: '\u{1F7E1}', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Okay' },
  Struggling: { emoji: '\u{1F534}', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Struggling' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500', 'from-fuchsia-500 to-purple-500',
    'from-lime-500 to-green-500', 'from-sky-500 to-blue-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function tsToDate(ts: any): Date {
  if (!ts) return new Date()
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts)
  if (ts.__timestamp_micros_since_unix_epoch__ !== undefined) return new Date(Number(BigInt(ts.__timestamp_micros_since_unix_epoch__) / 1000n))
  if (ts.microsSinceUnixEpoch !== undefined) return new Date(Number(BigInt(ts.microsSinceUnixEpoch) / 1000n))
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StandupsPage() {
  const { currentOrgId } = useOrg()
  const { identity } = useSpacetimeDB()

  const allStandups = useTable(tables.standup_entry) ?? []
  const allEmployees = useTable(tables.employee) ?? []
  const allBlockerResolutions = useTable(tables.blocker_resolution) ?? []
  const submitStandup = useReducer(reducers.submitStandup)
  const deleteStandup = useReducer(reducers.deleteStandup)
  const resolveBlocker = useReducer(reducers.resolveBlocker)
  const unresolveBlocker = useReducer(reducers.unresolveBlocker)

  // Org-scoped entries with date conversion
  const entries = useMemo(() => {
    if (currentOrgId === null) return []
    return allStandups
      .filter(e => e.orgId === BigInt(currentOrgId))
      .map(e => ({
        ...e,
        date: tsToDate(e.createdAt),
        moodKey: (e.mood?.tag as MoodKey) || 'Good',
      }))
  }, [allStandups, currentOrgId])

  // Employee name lookup
  const employeeNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const emp of allEmployees) {
      if (!emp.identity) continue
      map.set(emp.identity.toHexString(), emp.name)
    }
    return map
  }, [allEmployees])

  function getAuthorName(authorIdentity: any): string {
    if (!authorIdentity) return 'Unknown'
    const hex = typeof authorIdentity.toHexString === 'function' ? authorIdentity.toHexString() : String(authorIdentity)
    const name = employeeNames.get(hex)
    if (name) return name
    if (identity && hex === (typeof identity.toHexString === 'function' ? identity.toHexString() : String(identity))) return 'You'
    return hex.slice(0, 8) + '...'
  }

  // Org employees for participation tracking
  const orgEmployees = useMemo(() => {
    if (currentOrgId === null) return []
    return allEmployees.filter(e => e.orgId === BigInt(currentOrgId))
  }, [allEmployees, currentOrgId])

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [formYesterday, setFormYesterday] = useState('')
  const [formToday, setFormToday] = useState('')
  const [formBlockers, setFormBlockers] = useState('')
  const [formMood, setFormMood] = useState<MoodKey>('Good')

  // DB-backed resolved blockers
  const resolvedBlockerIds = useMemo(() => {
    if (currentOrgId === null) return new Set<string>()
    return new Set(
      allBlockerResolutions
        .filter(r => r.orgId === BigInt(currentOrgId))
        .filter(r => r.standupId != null)
        .map(r => r.standupId.toString())
    )
  }, [allBlockerResolutions, currentOrgId])

  const today = useMemo(() => new Date(), [])
  const isToday = useMemo(() => isSameDay(selectedDate, today), [selectedDate, today])

  const hasSubmittedToday = useMemo(() => {
    if (!identity) return false
    const myHex = typeof identity.toHexString === 'function' ? identity.toHexString() : String(identity)
    return entries.some(e => {
      const eHex = typeof e.author.toHexString === 'function' ? e.author.toHexString() : String(e.author)
      return eHex === myHex && isSameDay(e.date, today)
    })
  }, [entries, today, identity])

  const dayEntries = useMemo(
    () => entries.filter(e => isSameDay(e.date, selectedDate)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [entries, selectedDate]
  )

  const activeBlockers = useMemo(() => {
    return entries.filter(e => e.blockers.trim() && !resolvedBlockerIds.has(e.id.toString())).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries, resolvedBlockerIds])

  const resolvedBlockerEntries = useMemo(() => {
    return entries.filter(e => e.blockers.trim() && resolvedBlockerIds.has(e.id.toString())).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries, resolvedBlockerIds])

  // Stats
  const entriesToday = useMemo(() => entries.filter(e => isSameDay(e.date, today)).length, [entries, today])
  const streakDays = useMemo(() => {
    let streak = 0
    const d = new Date(today)
    while (true) {
      const hasEntry = entries.some(e => isSameDay(e.date, d))
      if (!hasEntry) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }, [entries, today])

  const teamSize = Math.max(orgEmployees.length, 1)
  const todayAuthors = useMemo(() => {
    const set = new Set<string>()
    entries.filter(e => isSameDay(e.date, today)).forEach(e => {
      const hex = typeof e.author.toHexString === 'function' ? e.author.toHexString() : String(e.author)
      set.add(hex)
    })
    return set
  }, [entries, today])
  const participationPct = Math.round((todayAuthors.size / teamSize) * 100)

  // Participation list
  const participationList = useMemo(() => {
    return orgEmployees
      .filter(emp => emp.identity)
      .map(emp => {
        const hex = emp.identity.toHexString()
        return { name: emp.name, submitted: todayAuthors.has(hex) }
      })
  }, [orgEmployees, todayAuthors])

  // Weekly grouped entries (last 7 days from selected date)
  const weekEntries = useMemo(() => {
    const days: { date: Date; dateKey: string; label: string; entries: typeof entries }[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(selectedDate, -i)
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const dayItems = entries
        .filter(e => isSameDay(e.date, d))
        .filter(e => !searchQuery || getAuthorName(e.author).toLowerCase().includes(searchQuery.toLowerCase()) || e.yesterday.toLowerCase().includes(searchQuery.toLowerCase()) || e.today.toLowerCase().includes(searchQuery.toLowerCase()) || e.blockers.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      days.push({
        date: d,
        dateKey,
        label: isSameDay(d, today) ? 'Today' : isSameDay(d, addDays(today, -1)) ? 'Yesterday' : formatDate(d),
        entries: dayItems,
      })
    }
    return days
  }, [entries, selectedDate, today, searchQuery])

  // Mood distribution over the week
  const weekMoodDistribution = useMemo(() => {
    const counts: Record<MoodKey, number> = { Great: 0, Good: 0, Okay: 0, Struggling: 0 }
    const weekStart = addDays(selectedDate, -6)
    entries.forEach(e => {
      if (e.date >= weekStart && e.date <= selectedDate) {
        counts[e.moodKey]++
      }
    })
    return counts
  }, [entries, selectedDate])

  const totalWeekEntries = useMemo(() => {
    return Object.values(weekMoodDistribution).reduce((a, b) => a + b, 0)
  }, [weekMoodDistribution])

  // Filtered day entries (when in day mode with search)
  const filteredDayEntries = useMemo(() => {
    if (!searchQuery) return dayEntries
    const q = searchQuery.toLowerCase()
    return dayEntries.filter(e => getAuthorName(e.author).toLowerCase().includes(q) || e.yesterday.toLowerCase().includes(q) || e.today.toLowerCase().includes(q) || e.blockers.toLowerCase().includes(q))
  }, [dayEntries, searchQuery])

  const toggleDayCollapse = useCallback((dateKey: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }, [])

  // Handlers
  const handleSubmit = useCallback(() => {
    if ((!formYesterday.trim() && !formToday.trim()) || currentOrgId === null) return
    submitStandup({
      orgId: BigInt(currentOrgId),
      yesterday: formYesterday.trim(),
      today: formToday.trim(),
      blockers: formBlockers.trim(),
      moodTag: formMood,
    })
    setFormYesterday('')
    setFormToday('')
    setFormBlockers('')
    setFormMood('Good')
  }, [formYesterday, formToday, formBlockers, formMood, currentOrgId, submitStandup])

  const navigateDay = useCallback((offset: number) => {
    setSelectedDate(prev => addDays(prev, offset))
  }, [])

  const goToToday = useCallback(() => setSelectedDate(new Date()), [])

  const handleResolveBlocker = useCallback((standupId: bigint) => {
    resolveBlocker({ standupId })
  }, [resolveBlocker])

  const handleUnresolveBlocker = useCallback((standupId: bigint) => {
    unresolveBlocker({ standupId })
  }, [unresolveBlocker])

  const handleDeleteStandup = useCallback((standupId: bigint) => {
    if (confirm('Delete this standup entry?')) {
      deleteStandup({ standupId })
    }
  }, [deleteStandup])

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <div className="flex items-center gap-2 flex-1">
          <Coffee className="size-4 text-violet-500" />
          <span className="text-sm font-medium">Standups</span>
        </div>
        <PresenceBar />
      </header>

      <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20">
            <Coffee className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#8b5cf6', '#6366f1', '#4f46e5']} animationSpeed={6}>Standups</GradientText>
            </h1>
            <BlurText
              text="Async daily standups and check-ins for your team"
              delay={35}
              animateBy="words"
              className="text-sm text-muted-foreground mt-0.5"
            />
          </div>
          <PagePresenceStrip className="hidden xl:flex" />
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by person, topic, or blocker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === 'day' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Calendar className="size-3.5" />Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarDays className="size-3.5" />Week
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              const allEntries = viewMode === 'week'
                ? weekEntries.flatMap(d => d.entries)
                : filteredDayEntries
              exportCSV('standups.csv', [
                { header: 'Author', accessor: (e: any) => getAuthorName(e.author) },
                { header: 'Date', accessor: (e: any) => formatDate(e.date) },
                { header: 'Mood', accessor: (e: any) => e.moodKey },
                { header: 'Yesterday', accessor: (e: any) => e.yesterday },
                { header: 'Today', accessor: (e: any) => e.today },
                { header: 'Blockers', accessor: (e: any) => e.blockers },
              ], allEntries)
            }}
          >
            <Download className="size-3.5" />Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.12)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Coffee className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entries Today</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400"><CountUp to={entriesToday} from={0} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.12)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500"><Flame className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Streak Days</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400"><CountUp to={streakDays} from={0} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.12)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500"><Users className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Participation</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
              <CountUp to={participationPct} from={0} duration={1.5} /><span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
            </p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.12)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-500"><AlertTriangle className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Blockers Active</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400"><CountUp to={activeBlockers.length} from={0} duration={1.5} /></p>
          </SpotlightCard>
        </div>

        {/* Week Mood Trend (visible in week view) */}
        {viewMode === 'week' && totalWeekEntries > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Mood This Week</span>
              <span className="text-[10px] text-muted-foreground">{totalWeekEntries} entries over 7 days</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              {(['Great', 'Good', 'Okay', 'Struggling'] as MoodKey[]).map(mood => {
                const count = weekMoodDistribution[mood]
                if (count === 0) return null
                const colorMap: Record<MoodKey, string> = { Great: 'bg-green-500', Good: 'bg-blue-500', Okay: 'bg-amber-500', Struggling: 'bg-red-500' }
                return (
                  <div
                    key={mood}
                    className={`h-full ${colorMap[mood]} transition-all duration-700`}
                    style={{ width: `${(count / totalWeekEntries) * 100}%` }}
                    title={`${MOOD_CONFIG[mood].label}: ${count}`}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {(['Great', 'Good', 'Okay', 'Struggling'] as MoodKey[]).map(mood => (
                <div key={mood} className="flex items-center gap-1.5">
                  <span className="text-sm">{MOOD_CONFIG[mood].emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{MOOD_CONFIG[mood].label}</span>
                  <span className="text-[10px] font-bold tabular-nums">{weekMoodDistribution[mood]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Standup Form */}
            {isToday && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                  <Coffee className="size-4 text-violet-500" />
                  <h2 className="text-sm font-semibold">{hasSubmittedToday ? 'Already submitted today' : "Today's Standup"}</h2>
                  {hasSubmittedToday && (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      <CheckCircle2 className="size-3" />Done
                    </span>
                  )}
                </div>
                {!hasSubmittedToday && (
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What did you work on yesterday?</label>
                      <textarea value={formYesterday} onChange={e => setFormYesterday(e.target.value)} placeholder="Shipped the new dashboard, reviewed PRs..." rows={2} className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What will you work on today?</label>
                      <textarea value={formToday} onChange={e => setFormToday(e.target.value)} placeholder="Working on the API integration, fixing bugs..." rows={2} className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Any blockers?</label>
                      <textarea value={formBlockers} onChange={e => setFormBlockers(e.target.value)} placeholder="Nothing blocking me / Waiting on design approval..." rows={1} className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Mood</span>
                        {(Object.keys(MOOD_CONFIG) as MoodKey[]).map(mood => {
                          const cfg = MOOD_CONFIG[mood]
                          const isSelected = formMood === mood
                          return (
                            <button
                              key={mood}
                              onClick={() => setFormMood(mood)}
                              className={`size-8 rounded-lg flex items-center justify-center text-sm transition-all border ${
                                isSelected
                                  ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900 ${cfg.border.replace('border-', 'ring-')}`
                                  : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}
                              title={cfg.label}
                            >
                              {cfg.emoji}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={!formYesterday.trim() && !formToday.trim()}
                        className="h-9 px-5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="size-3.5" />Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateDay(viewMode === 'week' ? -7 : -1)} className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="text-sm font-semibold min-w-[160px] text-center">
                  {viewMode === 'week'
                    ? `${formatDate(addDays(selectedDate, -6))} – ${isToday ? 'Today' : formatDate(selectedDate)}`
                    : isToday ? 'Today' : formatDate(selectedDate)}
                </h2>
                <button onClick={() => navigateDay(viewMode === 'week' ? 7 : 1)} disabled={isToday} className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="size-4" />
                </button>
                {!isToday && (
                  <button onClick={goToToday} className="ml-2 px-3 py-1 rounded-full text-xs font-medium border bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 transition-colors">Today</button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {viewMode === 'week' ? `${weekEntries.reduce((s, d) => s + d.entries.length, 0)} entries this week` : `${filteredDayEntries.length} ${filteredDayEntries.length === 1 ? 'entry' : 'entries'}`}
              </span>
            </div>

            {/* Feed — Week View */}
            {viewMode === 'week' ? (
              <div className="flex flex-col gap-2">
                {weekEntries.map(day => {
                  const isCollapsed = collapsedDays.has(day.dateKey)
                  return (
                    <div key={day.dateKey}>
                      <button
                        onClick={() => toggleDayCollapse(day.dateKey)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5 text-muted-foreground" /> : <ChevronLeft className="size-3.5 text-muted-foreground rotate-[-90deg]" />}
                        <span className="text-xs font-semibold">{day.label}</span>
                        <span className="text-[10px] text-muted-foreground">{day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}</span>
                        {day.entries.length > 0 && (
                          <div className="ml-auto flex items-center gap-1">
                            {day.entries.map(e => (
                              <span key={e.id.toString()} className="text-xs" title={`${getAuthorName(e.author)}: ${MOOD_CONFIG[e.moodKey].label}`}>
                                {MOOD_CONFIG[e.moodKey].emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                      {!isCollapsed && day.entries.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2 ml-2 pl-4 border-l-2 border-violet-500/20">
                          {day.entries.map(entry => {
                            const authorName = getAuthorName(entry.author)
                            const moodCfg = MOOD_CONFIG[entry.moodKey]
                            return (
                              <div key={entry.id.toString()} className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-4 transition-shadow hover:shadow-sm">
                                <div className="flex items-center gap-2.5 mb-2.5">
                                  <div className={`size-7 rounded-full bg-gradient-to-br ${avatarColor(authorName)} flex items-center justify-center shrink-0`}>
                                    <span className="text-[10px] font-bold text-white">{getInitials(authorName)}</span>
                                  </div>
                                  <span className="text-xs font-semibold truncate">{authorName}</span>
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${moodCfg.bg} ${moodCfg.color} ${moodCfg.border}`}>
                                    {moodCfg.emoji} {moodCfg.label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5"><Clock className="size-2.5" />{formatTime(entry.date)}</span>
                                  <button
                                    onClick={() => handleDeleteStandup(entry.id)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-1.5 ml-9">
                                  {entry.yesterday && (
                                    <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/70">Yesterday:</span> {entry.yesterday}</p>
                                  )}
                                  {entry.today && (
                                    <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/70">Today:</span> {entry.today}</p>
                                  )}
                                  {entry.blockers && (
                                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle className="size-2.5 shrink-0" />{entry.blockers}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!isCollapsed && day.entries.length === 0 && (
                        <div className="ml-2 pl-4 border-l-2 border-muted py-3">
                          <p className="text-xs text-muted-foreground italic">No entries</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : filteredDayEntries.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4"><Coffee className="size-6 opacity-40" /></div>
                <p className="font-medium">{searchQuery ? 'No matching standups' : 'No standups for this day'}</p>
                <p className="text-sm mt-1">{searchQuery ? 'Try a different search term.' : 'Check back later or navigate to another date.'}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDayEntries.map(entry => {
                  const authorName = getAuthorName(entry.author)
                  const moodCfg = MOOD_CONFIG[entry.moodKey]
                  return (
                    <div key={entry.id.toString()} className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5 transition-shadow hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`size-9 rounded-full bg-gradient-to-br ${avatarColor(authorName)} flex items-center justify-center shrink-0`}>
                          <span className="text-xs font-bold text-white">{getInitials(authorName)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{authorName}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${moodCfg.bg} ${moodCfg.color} ${moodCfg.border}`}>
                              {moodCfg.emoji} {moodCfg.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{formatTime(entry.date)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteStandup(entry.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity size-7 flex items-center justify-center rounded-lg text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                          title="Delete standup"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-3 ml-12">
                        {entry.yesterday && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Yesterday</span>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed">{entry.yesterday}</p>
                          </div>
                        )}
                        {entry.today && (
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today</span>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed">{entry.today}</p>
                          </div>
                        )}
                        {entry.blockers && (
                          <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertTriangle className="size-3" />Blocker
                            </span>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">{entry.blockers}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <BarChart3 className="size-4 text-violet-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s Participation</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700" style={{ width: `${participationPct}%` }} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-violet-600 dark:text-violet-400">{participationPct}%</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {participationList.length > 0 ? participationList.map(p => (
                    <div key={p.name} className="flex items-center gap-2 py-1">
                      {p.submitted ? <CheckCircle2 className="size-4 text-green-500 shrink-0" /> : <XCircle className="size-4 text-neutral-300 dark:text-neutral-600 shrink-0" />}
                      <span className={`text-sm ${p.submitted ? 'text-neutral-800 dark:text-neutral-200 font-medium' : 'text-muted-foreground'}`}>{p.name}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No team members yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Blockers</h3>
                {activeBlockers.length > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">{activeBlockers.length}</span>
                )}
              </div>
              <div className="p-4">
                {activeBlockers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active blockers</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeBlockers.map(entry => (
                      <div key={entry.id.toString()} className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{getAuthorName(entry.author)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</span>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-2">{entry.blockers}</p>
                        <button onClick={() => handleResolveBlocker(entry.id)} className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                          <CheckCircle2 className="size-3" />Mark Resolved
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {resolvedBlockerEntries.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolved</h3>
                  <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">{resolvedBlockerEntries.length}</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3">
                    {resolvedBlockerEntries.map(entry => (
                      <div key={entry.id.toString()} className="rounded-lg bg-green-500/5 border border-green-500/10 p-3 opacity-70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{getAuthorName(entry.author)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</span>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed mb-2 line-through">{entry.blockers}</p>
                        <button onClick={() => handleUnresolveBlocker(entry.id)} className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
                          <Undo2 className="size-3" />Unresolve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
