'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Coffee,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Flame,
  BarChart3,
  Clock,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Types ───────────────────────────────────────────────────────────────────

type StandupEntry = {
  id: string
  author: string
  date: Date
  yesterday: string
  today: string
  blockers: string
  mood: 'great' | 'good' | 'okay' | 'struggling'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<
  StandupEntry['mood'],
  { emoji: string; color: string; bg: string; border: string; label: string }
> = {
  great: {
    emoji: '\u{1F7E2}',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Great',
  },
  good: {
    emoji: '\u{1F535}',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Good',
  },
  okay: {
    emoji: '\u{1F7E1}',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Okay',
  },
  struggling: {
    emoji: '\u{1F534}',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Struggling',
  },
}

const TEAM_MEMBERS = [
  'You',
  'Sarah Chen',
  'James Park',
  'Maria Gonzalez',
  'David Kim',
  'Emily Zhang',
  'Tom Bradley',
  'Rachel Lee',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function avatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-fuchsia-500 to-purple-500',
    'from-lime-500 to-green-500',
    'from-sky-500 to-blue-500',
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

// ─── Sample Data ─────────────────────────────────────────────────────────────

function createSampleEntries(): StandupEntry[] {
  const today = new Date()
  const yesterday = addDays(today, -1)
  const twoDaysAgo = addDays(today, -2)

  const setTime = (base: Date, h: number, m: number): Date => {
    const d = new Date(base)
    d.setHours(h, m, 0, 0)
    return d
  }

  return [
    // Today
    {
      id: generateId(),
      author: 'Sarah Chen',
      date: setTime(today, 9, 12),
      yesterday: 'Finished the real-time collaboration feature and pushed to staging.',
      today: 'Writing integration tests for the collab module. Code review for James.',
      blockers: '',
      mood: 'great',
    },
    {
      id: generateId(),
      author: 'James Park',
      date: setTime(today, 9, 25),
      yesterday: 'Investigated API latency spikes in production. Found a slow query in the search endpoint.',
      today: 'Optimizing the search query and adding proper indexing. Will also update the monitoring dashboard.',
      blockers: 'Need DBA access to run EXPLAIN on production — waiting on ops approval.',
      mood: 'good',
    },
    {
      id: generateId(),
      author: 'Emily Zhang',
      date: setTime(today, 9, 41),
      yesterday: 'Designed the new onboarding flow mockups and presented to stakeholders.',
      today: 'Iterating on onboarding based on feedback. Starting the component library audit.',
      blockers: '',
      mood: 'good',
    },
    // Yesterday
    {
      id: generateId(),
      author: 'Sarah Chen',
      date: setTime(yesterday, 9, 5),
      yesterday: 'Set up WebSocket infrastructure for real-time features.',
      today: 'Building the collaboration UI and conflict resolution logic.',
      blockers: '',
      mood: 'good',
    },
    {
      id: generateId(),
      author: 'James Park',
      date: setTime(yesterday, 9, 18),
      yesterday: 'Deployed the new caching layer. Ran load tests.',
      today: 'Investigating latency spikes that appeared after the deploy.',
      blockers: 'Load testing environment is flaky — intermittent network timeouts.',
      mood: 'okay',
    },
    {
      id: generateId(),
      author: 'Maria Gonzalez',
      date: setTime(yesterday, 9, 30),
      yesterday: 'Increased test coverage on the auth module from 72% to 85%.',
      today: 'Tackling the remaining edge cases in OAuth flow. Pair programming with David on SSO.',
      blockers: 'Staging OAuth provider is returning 503s intermittently.',
      mood: 'okay',
    },
    {
      id: generateId(),
      author: 'David Kim',
      date: setTime(yesterday, 10, 2),
      yesterday: 'Completed the SSO integration prototype with Okta.',
      today: 'Adding SAML support and writing migration scripts for existing accounts.',
      blockers: '',
      mood: 'great',
    },
    // Two days ago
    {
      id: generateId(),
      author: 'Tom Bradley',
      date: setTime(twoDaysAgo, 9, 8),
      yesterday: 'Refactored the notification service to use event-driven architecture.',
      today: 'Setting up dead letter queues and retry logic for failed notifications.',
      blockers: 'AWS SQS permissions issue — need IAM policy update.',
      mood: 'struggling',
    },
  ]
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StandupsPage() {
  const [entries, setEntries] = useState<StandupEntry[]>(() => createSampleEntries())
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  // Form state
  const [formYesterday, setFormYesterday] = useState('')
  const [formToday, setFormToday] = useState('')
  const [formBlockers, setFormBlockers] = useState('')
  const [formMood, setFormMood] = useState<StandupEntry['mood']>('good')

  // Blocker resolved state
  const [resolvedBlockers, setResolvedBlockers] = useState<Set<string>>(new Set())

  const today = useMemo(() => new Date(), [])

  const isToday = useMemo(() => isSameDay(selectedDate, today), [selectedDate, today])

  const hasSubmittedToday = useMemo(
    () => entries.some((e) => e.author === 'You' && isSameDay(e.date, today)),
    [entries, today]
  )

  // Entries for the selected date
  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => isSameDay(e.date, selectedDate))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [entries, selectedDate]
  )

  // Active blockers (across all entries, unresolved)
  const activeBlockers = useMemo(() => {
    return entries
      .filter((e) => e.blockers.trim() && !resolvedBlockers.has(e.id))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries, resolvedBlockers])

  // Stats
  const entriesToday = useMemo(
    () => entries.filter((e) => isSameDay(e.date, today)).length,
    [entries, today]
  )

  const streakDays = useMemo(() => {
    let streak = 0
    const d = new Date(today)
    while (true) {
      const hasEntry = entries.some((e) => isSameDay(e.date, d))
      if (!hasEntry) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }, [entries, today])

  const participationPct = useMemo(() => {
    const submittedToday = new Set(
      entries.filter((e) => isSameDay(e.date, today)).map((e) => e.author)
    )
    return Math.round((submittedToday.size / TEAM_MEMBERS.length) * 100)
  }, [entries, today])

  const blockersActive = activeBlockers.length

  // Participation breakdown
  const participationList = useMemo(() => {
    const submittedToday = new Set(
      entries.filter((e) => isSameDay(e.date, today)).map((e) => e.author)
    )
    return TEAM_MEMBERS.map((name) => ({
      name,
      submitted: submittedToday.has(name),
    }))
  }, [entries, today])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!formYesterday.trim() && !formToday.trim()) return
    const entry: StandupEntry = {
      id: generateId(),
      author: 'You',
      date: new Date(),
      yesterday: formYesterday.trim(),
      today: formToday.trim(),
      blockers: formBlockers.trim(),
      mood: formMood,
    }
    setEntries((prev) => [entry, ...prev])
    setFormYesterday('')
    setFormToday('')
    setFormBlockers('')
    setFormMood('good')
  }, [formYesterday, formToday, formBlockers, formMood])

  const navigateDay = useCallback((offset: number) => {
    setSelectedDate((prev) => addDays(prev, offset))
  }, [])

  const goToToday = useCallback(() => {
    setSelectedDate(new Date())
  }, [])

  const toggleBlockerResolved = useCallback((id: string) => {
    setResolvedBlockers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/20">
          <Coffee className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#8b5cf6', '#6366f1', '#4f46e5']}
              animationSpeed={6}
            >
              Standups
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Async daily standups and check-ins for your team
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SpotlightCard
          className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
          spotlightColor="rgba(139, 92, 246, 0.12)"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
              <Coffee className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Entries Today
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
            <CountUp to={entriesToday} from={0} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard
          className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
          spotlightColor="rgba(245, 158, 11, 0.12)"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Flame className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Streak Days
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp to={streakDays} from={0} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard
          className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
          spotlightColor="rgba(34, 197, 94, 0.12)"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Users className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Participation
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            <CountUp to={participationPct} from={0} duration={1.5} />
            <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </SpotlightCard>

        <SpotlightCard
          className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
          spotlightColor="rgba(239, 68, 68, 0.12)"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-500">
              <AlertTriangle className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Blockers Active
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            <CountUp to={blockersActive} from={0} duration={1.5} />
          </p>
        </SpotlightCard>
      </div>

      {/* Main content: Feed + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form + Feed */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Standup Form */}
          {isToday && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <Coffee className="size-4 text-violet-500" />
                <h2 className="text-sm font-semibold">
                  {hasSubmittedToday ? 'Already submitted today' : "Today's Standup"}
                </h2>
                {hasSubmittedToday && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                    <CheckCircle2 className="size-3" />
                    Done
                  </span>
                )}
              </div>

              {!hasSubmittedToday && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What did you work on yesterday?
                    </label>
                    <textarea
                      value={formYesterday}
                      onChange={(e) => setFormYesterday(e.target.value)}
                      placeholder="Shipped the new dashboard, reviewed PRs..."
                      rows={2}
                      className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What will you work on today?
                    </label>
                    <textarea
                      value={formToday}
                      onChange={(e) => setFormToday(e.target.value)}
                      placeholder="Working on the API integration, fixing bugs..."
                      rows={2}
                      className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Any blockers?
                    </label>
                    <textarea
                      value={formBlockers}
                      onChange={(e) => setFormBlockers(e.target.value)}
                      placeholder="Nothing blocking me / Waiting on design approval..."
                      rows={1}
                      className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                    />
                  </div>

                  {/* Mood selector + Submit */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                        Mood
                      </span>
                      {(Object.keys(MOOD_CONFIG) as StandupEntry['mood'][]).map((mood) => {
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
                      <Send className="size-3.5" />
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDay(-1)}
                className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="text-sm font-semibold min-w-[160px] text-center">
                {isToday ? 'Today' : formatDate(selectedDate)}
              </h2>
              <button
                onClick={() => navigateDay(1)}
                disabled={isToday}
                className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-2 px-3 py-1 rounded-full text-xs font-medium border bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                >
                  Today
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Team Standup Feed */}
          {dayEntries.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Coffee className="size-6 opacity-40" />
              </div>
              <p className="font-medium">No standups for this day</p>
              <p className="text-sm mt-1">Check back later or navigate to another date.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dayEntries.map((entry) => {
                const moodCfg = MOOD_CONFIG[entry.mood]
                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5 transition-shadow hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50"
                  >
                    {/* Author row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`size-9 rounded-full bg-gradient-to-br ${avatarColor(entry.author)} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-xs font-bold text-white">
                          {getInitials(entry.author)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">
                            {entry.author}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${moodCfg.bg} ${moodCfg.color} ${moodCfg.border}`}
                          >
                            {moodCfg.emoji} {moodCfg.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTime(entry.date)}
                        </span>
                      </div>
                    </div>

                    {/* Standup sections */}
                    <div className="flex flex-col gap-3 ml-12">
                      {entry.yesterday && (
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Yesterday
                          </span>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed">
                            {entry.yesterday}
                          </p>
                        </div>
                      )}
                      {entry.today && (
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Today
                          </span>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed">
                            {entry.today}
                          </p>
                        </div>
                      )}
                      {entry.blockers && (
                        <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            Blocker
                          </span>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                            {entry.blockers}
                          </p>
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
          {/* Participation Stats */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <BarChart3 className="size-4 text-violet-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Today&apos;s Participation
              </h3>
            </div>
            <div className="p-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                    style={{ width: `${participationPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  {participationPct}%
                </span>
              </div>
              {/* Names list */}
              <div className="flex flex-col gap-1.5">
                {participationList.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-2 py-1"
                  >
                    {p.submitted ? (
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="size-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        p.submitted
                          ? 'text-neutral-800 dark:text-neutral-200 font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Blockers */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Blockers
              </h3>
              {activeBlockers.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {activeBlockers.length}
                </span>
              )}
            </div>
            <div className="p-4">
              {activeBlockers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active blockers
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeBlockers.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg bg-red-500/5 border border-red-500/10 p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {entry.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-2">
                        {entry.blockers}
                      </p>
                      <button
                        onClick={() => toggleBlockerResolved(entry.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                      >
                        <CheckCircle2 className="size-3" />
                        Mark Resolved
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
