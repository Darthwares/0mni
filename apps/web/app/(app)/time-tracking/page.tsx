'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { useAuth } from 'react-oidc-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Timer,
  Play,
  Square,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Calendar,
  BarChart3,
  Briefcase,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- types & config ---------------------------------------------------------

type CategoryTag = 'Development' | 'Meeting' | 'Support' | 'Sales' | 'Recruitment' | 'Documentation' | 'Review' | 'Planning' | 'Break' | 'Other'

const CATEGORIES: CategoryTag[] = [
  'Development', 'Meeting', 'Support', 'Sales', 'Recruitment',
  'Documentation', 'Review', 'Planning', 'Break', 'Other',
]

const categoryConfig: Record<CategoryTag, { cls: string; dot: string }> = {
  Development: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  Meeting: { cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  Support: { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
  Sales: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  Recruitment: { cls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', dot: 'bg-pink-500' },
  Documentation: { cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', dot: 'bg-teal-500' },
  Review: { cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
  Planning: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  Break: { cls: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' },
  Other: { cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', dot: 'bg-sky-500' },
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatTime(ts: any): string {
  try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function formatDate(ts: any): string {
  try { return ts.toDate().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) }
  catch { return '' }
}

function getDateKey(ts: any): string {
  try {
    const d = ts.toDate()
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  } catch { return '' }
}

function getDateLabel(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86_400_000)
    if (d >= today) return 'Today'
    if (d >= yesterday) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  } catch { return 'Unknown' }
}

// =============================================================================

export default function TimeTrackingPage() {
  const { currentOrgId } = useOrg()
  const [allEntries] = useTable(tables.time_entry)
  const startEntry = useSpacetimeReducer(reducers.startTimeEntry)
  const stopEntry = useSpacetimeReducer(reducers.stopTimeEntry)
  const logEntry = useSpacetimeReducer(reducers.logTimeEntry)
  const deleteEntry = useSpacetimeReducer(reducers.deleteTimeEntry)

  // Timer form state
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CategoryTag>('Development')
  const [billable, setBillable] = useState(true)

  // Manual log form
  const [showManualLog, setShowManualLog] = useState(false)
  const [manualDescription, setManualDescription] = useState('')
  const [manualCategory, setManualCategory] = useState<CategoryTag>('Development')
  const [manualDuration, setManualDuration] = useState('')
  const [manualBillable, setManualBillable] = useState(true)

  // Live timer tick
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Sort entries newest first
  const entries = useMemo(
    () => [...allEntries].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allEntries]
  )

  // Running entry
  const runningEntry = entries.find((e) => e.endedAt === null || e.endedAt === undefined)
  const runningElapsed = runningEntry
    ? Math.floor((now - runningEntry.startedAt.toDate().getTime()) / 60_000)
    : 0

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; key: string; entries: typeof entries }[] = []
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      if (e.endedAt === null || e.endedAt === undefined) continue // skip running
      const key = getDateKey(e.startedAt)
      if (!map.has(key)) {
        const items: typeof entries = []
        map.set(key, items)
        groups.push({ label: getDateLabel(e.startedAt), key, entries: items })
      }
      map.get(key)!.push(e)
    }
    return groups
  }, [entries])

  // Stats
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` })()
  const todayEntries = entries.filter((e) => getDateKey(e.startedAt) === todayKey)
  const todayMinutes = todayEntries.reduce((sum, e) => {
    if (e.endedAt === null || e.endedAt === undefined) return sum + runningElapsed
    return sum + e.durationMinutes
  }, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const weekMinutes = entries
    .filter((e) => { try { return e.startedAt.toDate() >= weekStart } catch { return false } })
    .reduce((sum, e) => sum + (e.endedAt ? e.durationMinutes : runningElapsed), 0)
  const billableMinutes = entries
    .filter((e) => e.billable && getDateKey(e.startedAt) === todayKey)
    .reduce((sum, e) => sum + (e.endedAt ? e.durationMinutes : runningElapsed), 0)

  // Handlers
  const handleStart = () => {
    if (!description.trim() || currentOrgId === null) return
    try {
      startEntry({
        orgId: BigInt(currentOrgId),
        categoryTag: category,
        description: description.trim(),
        taskId: null,
        ticketId: null,
        billable,
      })
      setDescription('')
    } catch (err) {
      console.error('Failed to start timer:', err)
    }
  }

  const handleStop = (entryId: bigint) => {
    try { stopEntry({ entryId }) }
    catch (err) { console.error('Failed to stop timer:', err) }
  }

  const handleLogManual = () => {
    if (!manualDescription.trim() || !manualDuration || currentOrgId === null) return
    try {
      logEntry({
        orgId: BigInt(currentOrgId),
        categoryTag: manualCategory,
        description: manualDescription.trim(),
        taskId: null,
        ticketId: null,
        durationMinutes: parseInt(manualDuration, 10),
        billable: manualBillable,
      })
      setManualDescription('')
      setManualDuration('')
      setShowManualLog(false)
    } catch (err) {
      console.error('Failed to log time:', err)
    }
  }

  const handleDelete = (entryId: bigint) => {
    try { deleteEntry({ entryId }) }
    catch (err) { console.error('Failed to delete entry:', err) }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/20">
              <Timer className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#f43f5e', '#ef4444', '#dc2626', '#f43f5e']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                Time Tracking
              </GradientText>
              <p className="text-xs text-muted-foreground">Track, log, and review your work hours</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowManualLog(!showManualLog)}>
            <Plus className="size-3.5 mr-1.5" />
            Log Time
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{formatDuration(todayMinutes)}</p>
              </div>
              <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Clock className="size-4 text-rose-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">This Week</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{formatDuration(weekMinutes)}</p>
              </div>
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Billable Today</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{formatDuration(billableMinutes)}</p>
              </div>
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="size-4 text-emerald-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Timer bar */}
        <div className="rounded-xl border bg-card p-3">
          {runningEntry ? (
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{runningEntry.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${categoryConfig[runningEntry.category.tag as CategoryTag]?.cls ?? ''}`}>
                    <span className={`size-1 rounded-full ${categoryConfig[runningEntry.category.tag as CategoryTag]?.dot ?? ''}`} />
                    {runningEntry.category.tag}
                  </span>
                  {runningEntry.billable && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Billable</span>
                  )}
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {Math.floor(runningElapsed / 60).toString().padStart(2, '0')}:{(runningElapsed % 60).toString().padStart(2, '0')}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStop(runningEntry.id)}
              >
                <Square className="size-3.5 mr-1.5" />
                Stop
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                className="flex-1 h-9"
              />
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryTag)}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${categoryConfig[c].dot}`} />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setBillable(!billable)}
                className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  billable
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted/60 text-muted-foreground border-transparent'
                }`}
              >
                <DollarSign className="size-3.5" />
              </button>
              <Button onClick={handleStart} disabled={!description.trim()}>
                <Play className="size-3.5 mr-1.5" />
                Start
              </Button>
            </div>
          )}
        </div>

        {/* Manual log form */}
        {showManualLog && (
          <div className="rounded-xl border bg-card p-3 mt-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Log Past Time</p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="What did you work on?"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Select value={manualCategory} onValueChange={(v) => setManualCategory(v as CategoryTag)}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Minutes"
                type="number"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="w-20 h-8 text-sm tabular-nums"
              />
              <button
                onClick={() => setManualBillable(!manualBillable)}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  manualBillable
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted/60 text-muted-foreground border-transparent'
                }`}
              >
                $
              </button>
              <Button size="sm" onClick={handleLogManual} disabled={!manualDescription.trim() || !manualDuration}>
                Log
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Entry list */}
      <ScrollArea className="flex-1">
        {grouped.length === 0 && !runningEntry ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-rose-500/10 to-red-500/10 flex items-center justify-center mb-3">
              <Timer className="size-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">No time entries yet</p>
            <p className="text-xs mt-1">Start a timer or log time manually to get started</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-2">
            {grouped.map((group) => {
              const dayTotal = group.entries.reduce((sum, e) => sum + e.durationMinutes, 0)
              return (
                <div key={group.key}>
                  <div className="sticky top-0 z-10 px-6 py-2 backdrop-blur-md bg-background/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  <div className="space-y-px">
                    {group.entries.map((entry) => {
                      const cfg = categoryConfig[entry.category.tag as CategoryTag]
                      return (
                        <div
                          key={String(entry.id)}
                          className="group flex items-center gap-3 px-6 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`size-2 rounded-full shrink-0 ${cfg?.dot ?? 'bg-neutral-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entry.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg?.cls ?? ''}`}>
                                {entry.category.tag}
                              </span>
                              {entry.billable && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Billable</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatTime(entry.startedAt)} – {entry.endedAt ? formatTime(entry.endedAt) : 'now'}
                          </span>
                          <span className="text-sm font-semibold tabular-nums w-16 text-right">
                            {formatDuration(entry.durationMinutes)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
