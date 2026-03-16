'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  Trash2,
  Edit3,
  UserPlus,
  Check,
  X,
  HelpCircle,
  Search,
  Download,
  AlertTriangle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import { exportCSV } from '@/lib/csv-export'

// ── Types ──────────────────────────────────────
type EventCategoryKey = 'Meeting' | 'Deadline' | 'Interview' | 'Standup' | 'Review' | 'Personal' | 'Other'
type CalendarView = 'month' | 'week' | 'day'

const CATEGORY_CONFIG: Record<EventCategoryKey, { label: string; color: string; bgClass: string; textClass: string }> = {
  Meeting: { label: 'Meeting', color: '#3b82f6', bgClass: 'bg-blue-500/15 border-blue-500/30', textClass: 'text-blue-600 dark:text-blue-400' },
  Deadline: { label: 'Deadline', color: '#ef4444', bgClass: 'bg-red-500/15 border-red-500/30', textClass: 'text-red-600 dark:text-red-400' },
  Interview: { label: 'Interview', color: '#a855f7', bgClass: 'bg-purple-500/15 border-purple-500/30', textClass: 'text-purple-600 dark:text-purple-400' },
  Standup: { label: 'Standup', color: '#22c55e', bgClass: 'bg-green-500/15 border-green-500/30', textClass: 'text-green-600 dark:text-green-400' },
  Review: { label: 'Review', color: '#f59e0b', bgClass: 'bg-amber-500/15 border-amber-500/30', textClass: 'text-amber-600 dark:text-amber-400' },
  Personal: { label: 'Personal', color: '#ec4899', bgClass: 'bg-pink-500/15 border-pink-500/30', textClass: 'text-pink-600 dark:text-pink-400' },
  Other: { label: 'Other', color: '#6b7280', bgClass: 'bg-neutral-500/15 border-neutral-500/30', textClass: 'text-neutral-600 dark:text-neutral-400' },
}

// ── Helpers ─────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d: Date) {
  return isSameDay(d, new Date())
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const days: Date[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i))
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i))
  }
  return days
}

function getWeekDays(date: Date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getHours() {
  return Array.from({ length: 24 }, (_, i) => i)
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatTimeRange(start: Date, end: Date) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

function tsToDate(ts: { __timestamp_micros_since_unix_epoch__: bigint } | bigint | number | any): Date {
  if (!ts) return new Date()
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts)
  if (ts.__timestamp_micros_since_unix_epoch__ !== undefined) return new Date(Number(BigInt(ts.__timestamp_micros_since_unix_epoch__) / 1000n))
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000)
  if (ts.microsSinceUnixEpoch !== undefined) return new Date(Number(BigInt(ts.microsSinceUnixEpoch) / 1000n))
  return new Date(ts)
}

function dateToTimestamp(d: Date): bigint {
  return BigInt(d.getTime()) * 1000n
}

/** Check if two time ranges overlap */
function hasTimeConflict(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

/** Get event position in a time grid (top % and height %) */
function getEventGridPosition(event: { start: Date; end: Date }, dayStart: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  const startMs = Math.max(0, event.start.getTime() - dayStart.getTime())
  const endMs = Math.min(dayMs, event.end.getTime() - dayStart.getTime())
  const top = (startMs / dayMs) * 100
  const height = Math.max(((endMs - startMs) / dayMs) * 100, 2) // min 2% for visibility
  return { top, height }
}

/** Resolve overlapping events into columns */
function resolveOverlaps<T extends { start: Date; end: Date }>(events: T[]): (T & { column: number; totalColumns: number })[] {
  if (events.length === 0) return []
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  const groups: T[][] = []
  let currentGroup: T[] = [sorted[0]]
  let groupEnd = sorted[0].end.getTime()

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start.getTime() < groupEnd) {
      currentGroup.push(sorted[i])
      groupEnd = Math.max(groupEnd, sorted[i].end.getTime())
    } else {
      groups.push(currentGroup)
      currentGroup = [sorted[i]]
      groupEnd = sorted[i].end.getTime()
    }
  }
  groups.push(currentGroup)

  const result: (T & { column: number; totalColumns: number })[] = []
  for (const group of groups) {
    const columns: Date[][] = []
    for (const evt of group) {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        const lastEnd = columns[c][columns[c].length - 1]
        if (evt.start.getTime() >= lastEnd.getTime()) {
          columns[c].push(evt.end)
          result.push({ ...evt, column: c, totalColumns: 0 })
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([evt.end])
        result.push({ ...evt, column: columns.length - 1, totalColumns: 0 })
      }
    }
    const totalCols = columns.length
    for (const r of result) {
      if (group.includes(r as any)) {
        r.totalColumns = totalCols
      }
    }
  }
  return result
}

// ── Component ──────────────────────────────────
export default function CalendarPage() {
  const { currentOrgId } = useOrg()
  const { identity } = useSpacetimeDB()

  // SpacetimeDB data
  const allCalEvents = useTable(tables.cal_event) ?? []
  const allAttendees = useTable(tables.cal_event_attendee) ?? []
  const allEmployees = useTable(tables.employee) ?? []
  const createCalEvent = useReducer(reducers.createCalEvent)
  const updateCalEvent = useReducer(reducers.updateCalEvent)
  const deleteCalEvent = useReducer(reducers.deleteCalEvent)
  const addEventAttendee = useReducer(reducers.addEventAttendee)
  const respondToEvent = useReducer(reducers.respondToEvent)
  const removeEventAttendee = useReducer(reducers.removeEventAttendee)

  // Org-scoped events with Date conversions
  const events = useMemo(() => {
    if (currentOrgId === null) return []
    return allCalEvents
      .filter(e => e.orgId === BigInt(currentOrgId))
      .map(e => ({
        ...e,
        start: tsToDate(e.startTime),
        end: tsToDate(e.endTime),
        cat: (e.category.tag as EventCategoryKey) || 'Other',
      }))
  }, [allCalEvents, currentOrgId])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [selectedEventId, setSelectedEventId] = useState<bigint | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategories, setActiveCategories] = useState<Set<EventCategoryKey>>(
    new Set(Object.keys(CATEGORY_CONFIG) as EventCategoryKey[])
  )

  // Create event form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState<EventCategoryKey>('Meeting')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:00')
  const [newAllDay, setNewAllDay] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newIsVirtual, setNewIsVirtual] = useState(false)

  // Edit event dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editId, setEditId] = useState<bigint | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<EventCategoryKey>('Meeting')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('09:00')
  const [editEndTime, setEditEndTime] = useState('10:00')
  const [editAllDay, setEditAllDay] = useState(false)
  const [editLocation, setEditLocation] = useState('')
  const [editIsVirtual, setEditIsVirtual] = useState(false)

  // Attendee invite state
  const [attendeeSearch, setAttendeeSearch] = useState('')

  // Refs
  const weekScrollRef = useRef<HTMLDivElement>(null)
  const dayScrollRef = useRef<HTMLDivElement>(null)

  // Scroll to 8am on view change
  useEffect(() => {
    const HOUR_HEIGHT = 56
    const scrollTo = 8 * HOUR_HEIGHT
    weekScrollRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' })
    dayScrollRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' })
  }, [view])

  // Helper: get attendees for an event
  const getEventAttendees = useCallback((eventId: bigint) => {
    return allAttendees.filter(a => a.eventId === eventId)
  }, [allAttendees])

  // Helper: get employee name by identity hex
  const getEmployeeName = useCallback((identityHex: string) => {
    const emp = allEmployees.find(e => e.id.toHexString() === identityHex)
    return emp?.name ?? identityHex.slice(0, 8) + '...'
  }, [allEmployees])

  // Helper: get employee initials
  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [])

  const myHex = identity?.toHexString() ?? ''

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month])
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const hours = useMemo(() => getHours(), [])

  // Filtered by category + search
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => activeCategories.has(e.cat))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false) ||
          (e.location?.toLowerCase().includes(q) ?? false)
      )
    }
    return filtered
  }, [events, activeCategories, searchQuery])

  const eventsForDay = useCallback(
    (date: Date) => filteredEvents.filter(e => isSameDay(e.start, date)),
    [filteredEvents]
  )

  const todaysEvents = useMemo(() => eventsForDay(new Date()), [eventsForDay])
  const selectedDayEvents = useMemo(() => eventsForDay(selectedDate), [eventsForDay, selectedDate])
  const thisWeekEvents = useMemo(() => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return filteredEvents.filter(e => e.start >= weekStart && e.start < weekEnd)
  }, [filteredEvents])

  // Upcoming events (next 7 days, excluding today)
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const weekOut = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
    return filteredEvents
      .filter(e => e.start >= tomorrow && e.start < weekOut)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 8)
  }, [filteredEvents])

  // Conflict detection for create/edit forms
  const createConflicts = useMemo(() => {
    if (!newDate || newAllDay) return []
    const [y, m, d] = newDate.split('-').map(Number)
    const [sh, sm] = newStartTime.split(':').map(Number)
    const [eh, em] = newEndTime.split(':').map(Number)
    const start = new Date(y, m - 1, d, sh, sm)
    const end = new Date(y, m - 1, d, eh, em)
    return events.filter(e => !e.allDay && hasTimeConflict(start, end, e.start, e.end))
  }, [newDate, newStartTime, newEndTime, newAllDay, events])

  const editConflicts = useMemo(() => {
    if (!editDate || editAllDay || editId === null) return []
    const [y, m, d] = editDate.split('-').map(Number)
    const [sh, sm] = editStartTime.split(':').map(Number)
    const [eh, em] = editEndTime.split(':').map(Number)
    const start = new Date(y, m - 1, d, sh, sm)
    const end = new Date(y, m - 1, d, eh, em)
    return events.filter(e => e.id !== editId && !e.allDay && hasTimeConflict(start, end, e.start, e.end))
  }, [editDate, editStartTime, editEndTime, editAllDay, editId, events])

  const selectedEvent = selectedEventId !== null ? events.find(e => e.id === selectedEventId) ?? null : null

  // Stats
  const stats = useMemo(() => {
    const meetings = todaysEvents.filter(e => e.cat === 'Meeting').length
    const deadlines = filteredEvents.filter(e => {
      const now = new Date()
      const weekOut = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      return e.cat === 'Deadline' && e.start >= now && e.start < weekOut
    }).length
    const virtualCount = thisWeekEvents.filter(e => e.isVirtual).length
    return [
      { label: "Today's Events", value: todaysEvents.length, color: '#3b82f6' },
      { label: 'Meetings Today', value: meetings, color: '#8b5cf6' },
      { label: 'Upcoming Deadlines', value: deadlines, color: '#ef4444' },
      { label: 'Virtual This Week', value: virtualCount, color: '#22c55e' },
    ]
  }, [todaysEvents, filteredEvents, thisWeekEvents])

  const navigate = (direction: -1 | 1) => {
    const next = new Date(currentDate)
    if (view === 'month') next.setMonth(next.getMonth() + direction)
    else if (view === 'week') next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction)
    setCurrentDate(next)
    setSelectedDate(next)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const toggleCategory = (cat: EventCategoryKey) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleCreateEvent = useCallback(() => {
    if (!newTitle.trim() || !newDate || currentOrgId === null) return
    const [y, m, d] = newDate.split('-').map(Number)
    const [sh, sm] = newStartTime.split(':').map(Number)
    const [eh, em] = newEndTime.split(':').map(Number)

    const startDate = new Date(y, m - 1, d, sh, sm)
    const endDate = new Date(y, m - 1, d, eh, em)

    createCalEvent({
      orgId: BigInt(currentOrgId),
      title: newTitle.trim(),
      description: newDescription.trim(),
      startTime: dateToTimestamp(startDate),
      endTime: dateToTimestamp(endDate),
      allDay: newAllDay,
      categoryTag: newCategory,
      location: newLocation.trim(),
      isVirtual: newIsVirtual,
    })
    setShowCreateDialog(false)
    resetForm()
  }, [newTitle, newDate, newStartTime, newEndTime, newDescription, newAllDay, newCategory, newLocation, newIsVirtual, currentOrgId, createCalEvent])

  const handleDeleteEvent = useCallback(
    (id: bigint) => {
      deleteCalEvent({ eventId: id })
      setSelectedEventId(null)
    },
    [deleteCalEvent]
  )

  const resetForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewCategory('Meeting')
    setNewDate('')
    setNewStartTime('09:00')
    setNewEndTime('10:00')
    setNewAllDay(false)
    setNewLocation('')
    setNewIsVirtual(false)
  }

  const openEditDialog = useCallback((event: typeof events[number]) => {
    setEditId(event.id)
    setEditTitle(event.title)
    setEditDescription(event.description ?? '')
    setEditCategory(event.cat)
    const d = event.start
    setEditDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    setEditStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    const ed = event.end
    setEditEndTime(`${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`)
    setEditAllDay(event.allDay)
    setEditLocation(event.location ?? '')
    setEditIsVirtual(event.isVirtual)
    setSelectedEventId(null)
    setEditDialogOpen(true)
  }, [])

  const handleUpdateEvent = useCallback(() => {
    if (!editTitle.trim() || !editDate || editId === null) return
    const [y, m, d] = editDate.split('-').map(Number)
    const [sh, sm] = editStartTime.split(':').map(Number)
    const [eh, em] = editEndTime.split(':').map(Number)
    const startDate = new Date(y, m - 1, d, sh, sm)
    const endDate = new Date(y, m - 1, d, eh, em)
    updateCalEvent({
      eventId: editId,
      title: editTitle.trim(),
      description: editDescription.trim(),
      startTime: dateToTimestamp(startDate),
      endTime: dateToTimestamp(endDate),
      allDay: editAllDay,
      categoryTag: editCategory,
      location: editLocation.trim(),
      isVirtual: editIsVirtual,
    })
    setEditDialogOpen(false)
  }, [editId, editTitle, editDate, editStartTime, editEndTime, editDescription, editAllDay, editCategory, editLocation, editIsVirtual, updateCalEvent])

  const openCreateForDate = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setNewDate(iso)
    setShowCreateDialog(true)
  }

  const handleExportCSV = useCallback(() => {
    exportCSV('calendar-events', [
      { header: 'Title', accessor: (e: typeof filteredEvents[number]) => e.title },
      { header: 'Category', accessor: (e: typeof filteredEvents[number]) => e.cat },
      { header: 'Date', accessor: (e: typeof filteredEvents[number]) => e.start.toLocaleDateString() },
      { header: 'Start', accessor: (e: typeof filteredEvents[number]) => e.allDay ? 'All Day' : formatTime(e.start) },
      { header: 'End', accessor: (e: typeof filteredEvents[number]) => e.allDay ? 'All Day' : formatTime(e.end) },
      { header: 'Location', accessor: (e: typeof filteredEvents[number]) => e.location ?? '' },
      { header: 'Virtual', accessor: (e: typeof filteredEvents[number]) => e.isVirtual ? 'Yes' : 'No' },
      { header: 'Description', accessor: (e: typeof filteredEvents[number]) => e.description ?? '' },
    ], filteredEvents)
  }, [filteredEvents])

  // ── Render ───────────────────────────────────
  const HOUR_HEIGHT = 56 // px per hour for time-grid views

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <div className="flex items-center gap-2 flex-1">
          <CalendarDays className="size-4 text-blue-500" />
          <span className="text-sm font-medium">Calendar</span>
        </div>
        <PresenceBar />
      </header>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-blue-500/25">
              <CalendarDays className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <GradientText colors={['#3b82f6', '#6366f1', '#8b5cf6']} animationSpeed={6}>
                  Calendar
                </GradientText>
              </h1>
              <BlurText
                text="Schedule meetings, track deadlines, and manage your time"
                delay={35}
                animateBy="words"
                className="text-muted-foreground text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-1.5 size-3.5" />
              Export
            </Button>
            <Button
              onClick={() => {
                const today = new Date()
                const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                setNewDate(iso)
                setShowCreateDialog(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              New Event
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(stat => (
            <SpotlightCard key={stat.label} spotlightColor={stat.color} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">
                  <CountUp to={stat.value} />
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Calendar */}
          <div className="space-y-4">
            {/* Navigation Bar */}
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                      <ChevronRight className="size-4" />
                    </Button>
                    <h2 className="text-lg font-semibold ml-2">
                      {view === 'day'
                        ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                        : `${MONTHS[month]} ${year}`}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 w-48 text-sm"
                      />
                    </div>
                    <Tabs value={view} onValueChange={v => setView(v as CalendarView)}>
                      <TabsList>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="day">Day</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Month View */}
            {view === 'month' && (
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 border-b">
                    {DAYS.map(day => (
                      <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((day, i) => {
                      const dayEvents = eventsForDay(day)
                      const isCurrentMonth = day.getMonth() === month
                      const isSelected = isSameDay(day, selectedDate)
                      const isTodayDate = isToday(day)

                      return (
                        <div
                          key={i}
                          className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-accent/50 ${
                            !isCurrentMonth ? 'bg-muted/30' : ''
                          } ${isSelected ? 'bg-accent' : ''}`}
                          onClick={() => setSelectedDate(day)}
                          onDoubleClick={() => openCreateForDate(day)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-medium ${
                                isTodayDate
                                  ? 'bg-primary text-primary-foreground'
                                  : !isCurrentMonth
                                  ? 'text-muted-foreground/50'
                                  : ''
                              }`}
                            >
                              {day.getDate()}
                            </span>
                            {dayEvents.length > 0 && !isTodayDate && (
                              <span className="size-1.5 rounded-full bg-primary/60" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(event => {
                              const cfg = CATEGORY_CONFIG[event.cat]
                              return (
                                <button
                                  key={event.id.toString()}
                                  className={`w-full text-left text-[10px] leading-tight truncate rounded px-1 py-0.5 border ${cfg.bgClass} ${cfg.textClass} hover:opacity-80 transition-opacity`}
                                  onClick={e => {
                                    e.stopPropagation()
                                    setSelectedEventId(event.id)
                                  }}
                                >
                                  {event.allDay ? event.title : `${formatTime(event.start)} ${event.title}`}
                                </button>
                              )
                            })}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] text-muted-foreground pl-1">
                                +{dayEvents.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Week View — Time Grid with proper event spans */}
            {view === 'week' && (
              <Card>
                <CardContent className="p-0">
                  {/* All-day events row */}
                  {(() => {
                    const allDayByDay = weekDays.map(day => eventsForDay(day).filter(e => e.allDay))
                    const hasAnyAllDay = allDayByDay.some(d => d.length > 0)
                    if (!hasAnyAllDay) return null
                    return (
                      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/20">
                        <div className="border-r px-2 py-1.5 text-[10px] text-muted-foreground text-right">all day</div>
                        {weekDays.map((day, di) => (
                          <div key={di} className="border-r p-1 min-h-[28px]">
                            {allDayByDay[di].map(event => {
                              const cfg = CATEGORY_CONFIG[event.cat]
                              return (
                                <button
                                  key={event.id.toString()}
                                  className={`w-full text-left text-[10px] leading-tight truncate rounded px-1.5 py-0.5 border mb-0.5 ${cfg.bgClass} ${cfg.textClass}`}
                                  onClick={() => setSelectedEventId(event.id)}
                                >
                                  {event.title}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div ref={weekScrollRef} className="overflow-auto max-h-[calc(100vh-380px)]">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
                      {/* Column headers */}
                      <div className="border-b border-r p-2 sticky top-0 bg-background z-10" />
                      {weekDays.map((day, i) => (
                        <div
                          key={i}
                          className={`border-b border-r p-2 text-center cursor-pointer hover:bg-accent/50 sticky top-0 bg-background z-10 ${
                            isSameDay(day, selectedDate) ? 'bg-accent' : ''
                          }`}
                          onClick={() => {
                            setSelectedDate(day)
                            setView('day')
                          }}
                        >
                          <p className="text-xs text-muted-foreground">{DAYS[day.getDay()]}</p>
                          <p
                            className={`text-sm font-medium mt-0.5 ${
                              isToday(day) ? 'bg-primary text-primary-foreground rounded-full size-7 inline-flex items-center justify-center' : ''
                            }`}
                          >
                            {day.getDate()}
                          </p>
                        </div>
                      ))}

                      {/* Time grid rows */}
                      {hours.map(hour => (
                        <div key={`row-${hour}`} className="contents">
                          <div className="border-b border-r px-2 text-[10px] text-muted-foreground text-right" style={{ height: HOUR_HEIGHT }}>
                            <span className="relative -top-2">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                          </div>
                          {weekDays.map((day, di) => {
                            // Only render events in the first hour cell; actual positioning is absolute
                            return (
                              <div
                                key={`cell-${hour}-${di}`}
                                className="border-b border-r relative hover:bg-accent/20 cursor-pointer"
                                style={{ height: HOUR_HEIGHT }}
                                onDoubleClick={() => {
                                  const d = new Date(day)
                                  d.setHours(hour, 0, 0, 0)
                                  setNewStartTime(`${String(hour).padStart(2, '0')}:00`)
                                  setNewEndTime(`${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`)
                                  openCreateForDate(d)
                                }}
                              >
                                {hour === 0 && (() => {
                                  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                                  const dayNonAllDay = eventsForDay(day).filter(e => !e.allDay)
                                  const positioned = resolveOverlaps(dayNonAllDay)
                                  return positioned.map(event => {
                                    const { top, height } = getEventGridPosition(event, dayStart)
                                    const cfg = CATEGORY_CONFIG[event.cat]
                                    const colWidth = event.totalColumns > 1 ? `${100 / event.totalColumns}%` : '100%'
                                    const colLeft = event.totalColumns > 1 ? `${(event.column / event.totalColumns) * 100}%` : '0'
                                    return (
                                      <button
                                        key={event.id.toString()}
                                        className={`absolute rounded px-1.5 py-0.5 border text-left overflow-hidden transition-opacity hover:opacity-80 z-[5] ${cfg.bgClass} ${cfg.textClass}`}
                                        style={{
                                          top: `${top}%`,
                                          height: `${height}%`,
                                          left: colLeft,
                                          width: `calc(${colWidth} - 2px)`,
                                          minHeight: 20,
                                        }}
                                        onClick={e => {
                                          e.stopPropagation()
                                          setSelectedEventId(event.id)
                                        }}
                                      >
                                        <span className="text-[10px] font-medium leading-tight block truncate">{event.title}</span>
                                        <span className="text-[9px] opacity-70 block truncate">{formatTimeRange(event.start, event.end)}</span>
                                      </button>
                                    )
                                  })
                                })()}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Day View — Time Grid with proper event spans */}
            {view === 'day' && (
              <Card>
                <CardContent className="p-0">
                  {/* All-day section */}
                  {selectedDayEvents.filter(e => e.allDay).length > 0 && (
                    <div className="p-3 border-b bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2">All Day</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDayEvents
                          .filter(e => e.allDay)
                          .map(event => {
                            const cfg = CATEGORY_CONFIG[event.cat]
                            return (
                              <button
                                key={event.id.toString()}
                                className={`text-xs px-2.5 py-1.5 rounded border ${cfg.bgClass} ${cfg.textClass} hover:opacity-80 transition-opacity`}
                                onClick={() => setSelectedEventId(event.id)}
                              >
                                {event.title}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  <div ref={dayScrollRef} className="overflow-auto max-h-[calc(100vh-380px)]">
                    <div className="grid grid-cols-[60px_1fr] relative">
                      {/* Current time indicator */}
                      {isToday(selectedDate) && (() => {
                        const now = new Date()
                        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
                        const topPx = (minutesSinceMidnight / 60) * HOUR_HEIGHT
                        return (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: topPx }}>
                            <div className="flex items-center">
                              <div className="size-2 rounded-full bg-red-500 -ml-1" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          </div>
                        )
                      })()}

                      {hours.map(hour => (
                        <div key={hour} className="contents">
                          <div className="border-b border-r px-2 text-[10px] text-muted-foreground text-right" style={{ height: HOUR_HEIGHT }}>
                            <span className="relative -top-2">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                          </div>
                          <div
                            className="border-b relative hover:bg-accent/20 cursor-pointer"
                            style={{ height: HOUR_HEIGHT }}
                            onDoubleClick={() => {
                              setNewStartTime(`${String(hour).padStart(2, '0')}:00`)
                              setNewEndTime(`${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`)
                              openCreateForDate(selectedDate)
                            }}
                          >
                            {hour === 0 && (() => {
                              const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                              const dayNonAllDay = selectedDayEvents.filter(e => !e.allDay)
                              const positioned = resolveOverlaps(dayNonAllDay)
                              return positioned.map(event => {
                                const { top, height } = getEventGridPosition(event, dayStart)
                                const cfg = CATEGORY_CONFIG[event.cat]
                                const colWidth = event.totalColumns > 1 ? `${100 / event.totalColumns}%` : '100%'
                                const colLeft = event.totalColumns > 1 ? `${(event.column / event.totalColumns) * 100}%` : '0'
                                return (
                                  <button
                                    key={event.id.toString()}
                                    className={`absolute rounded-lg px-3 py-2 border text-left overflow-hidden transition-opacity hover:opacity-80 z-[5] ${cfg.bgClass} ${cfg.textClass}`}
                                    style={{
                                      top: `${top}%`,
                                      height: `${height}%`,
                                      left: colLeft,
                                      width: `calc(${colWidth} - 4px)`,
                                      minHeight: 28,
                                    }}
                                    onClick={e => {
                                      e.stopPropagation()
                                      setSelectedEventId(event.id)
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium truncate">{event.title}</span>
                                      <span className="text-xs opacity-70 shrink-0 ml-2">{formatTimeRange(event.start, event.end)}</span>
                                    </div>
                                    {event.description && (
                                      <p className="text-xs opacity-60 mt-0.5 truncate">{event.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-[10px] opacity-60">
                                      {event.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="size-3" />
                                          {event.location}
                                        </span>
                                      )}
                                      {event.isVirtual && (
                                        <span className="flex items-center gap-1">
                                          <Video className="size-3" />
                                          Virtual
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Mini Calendar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    {MONTHS[month]} {year}
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => navigate(-1)}>
                      <ChevronLeft className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => navigate(1)}>
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {DAYS.map(d => (
                    <div key={d} className="text-[10px] text-center text-muted-foreground py-1">
                      {d[0]}
                    </div>
                  ))}
                  {monthDays.map((day, i) => {
                    const hasEvents = eventsForDay(day).length > 0
                    const isCurrentMonth = day.getMonth() === month
                    return (
                      <button
                        key={i}
                        className={`size-7 text-[11px] rounded-full flex items-center justify-center transition-colors relative ${
                          isSameDay(day, selectedDate)
                            ? 'bg-primary text-primary-foreground'
                            : isToday(day)
                            ? 'bg-primary/20 text-primary font-semibold'
                            : !isCurrentMonth
                            ? 'text-muted-foreground/40'
                            : 'hover:bg-accent'
                        } ${hasEvents && !isSameDay(day, selectedDate) && isCurrentMonth ? 'font-semibold' : ''}`}
                        onClick={() => {
                          setSelectedDate(day)
                          if (day.getMonth() !== month) {
                            setCurrentDate(day)
                          }
                        }}
                      >
                        {day.getDate()}
                        {hasEvents && !isSameDay(day, selectedDate) && isCurrentMonth && (
                          <span className="absolute mt-5 size-1 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Categories Filter */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {(Object.entries(CATEGORY_CONFIG) as [EventCategoryKey, (typeof CATEGORY_CONFIG)[EventCategoryKey]][]).map(
                    ([key, config]) => (
                      <button
                        key={key}
                        className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent ${
                          activeCategories.has(key) ? '' : 'opacity-40'
                        }`}
                        onClick={() => toggleCategory(key)}
                      >
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                        <span className="flex-1 text-left">{config.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {events.filter(e => e.cat === key).length}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Events */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isToday(selectedDate)
                    ? "Today's Schedule"
                    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground">
                    <CalendarDays className="size-8 mb-2 opacity-30" />
                    <p className="text-xs">No events</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => openCreateForDate(selectedDate)}>
                      <Plus className="mr-1 size-3" />
                      Add event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents
                      .sort((a, b) => {
                        if (a.allDay && !b.allDay) return -1
                        if (!a.allDay && b.allDay) return 1
                        return a.start.getTime() - b.start.getTime()
                      })
                      .map(event => {
                        const cfg = CATEGORY_CONFIG[event.cat]
                        return (
                          <button
                            key={event.id.toString()}
                            className={`w-full text-left rounded-lg p-2.5 border transition-colors hover:opacity-80 ${cfg.bgClass}`}
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            <p className={`text-xs font-medium ${cfg.textClass}`}>{event.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <Clock className="size-3" />
                              {event.allDay ? 'All day' : formatTimeRange(event.start, event.end)}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                <MapPin className="size-3" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight className="size-3" />
                    Upcoming (7 days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-1.5">
                    {upcomingEvents.map(event => {
                      const cfg = CATEGORY_CONFIG[event.cat]
                      const dayLabel = event.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      return (
                        <button
                          key={event.id.toString()}
                          className="w-full text-left rounded-md px-2 py-1.5 hover:bg-accent transition-colors group"
                          onClick={() => {
                            setSelectedDate(event.start)
                            setCurrentDate(event.start)
                            setSelectedEventId(event.id)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            <span className="text-xs font-medium truncate flex-1">{event.title}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground ml-4">
                            {dayLabel} {!event.allDay && `· ${formatTime(event.start)}`}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEventId(null)}>
        {selectedEvent && (() => {
          const cfg = CATEGORY_CONFIG[selectedEvent.cat]
          return (
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <DialogTitle>{selectedEvent.title}</DialogTitle>
                </div>
                <DialogDescription>
                  <Badge variant="outline" className={`${cfg.bgClass} ${cfg.textClass} border`}>
                    {cfg.label}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  {selectedEvent.allDay ? (
                    <span>
                      All day —{' '}
                      {selectedEvent.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                  ) : (
                    <span>
                      {selectedEvent.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {formatTimeRange(selectedEvent.start, selectedEvent.end)}
                    </span>
                  )}
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground" />
                    {selectedEvent.location}
                  </div>
                )}
                {selectedEvent.isVirtual && (
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="size-4 text-muted-foreground" />
                    Virtual Meeting
                  </div>
                )}
                {selectedEvent.description && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </>
                )}

                {/* Attendees Section */}
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="size-4 text-muted-foreground" />
                      Attendees
                      {(() => {
                        const eventAtts = getEventAttendees(selectedEvent.id)
                        return eventAtts.length > 0 ? (
                          <span className="text-xs text-muted-foreground ml-1">({eventAtts.length})</span>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {/* Attendee list */}
                  {(() => {
                    const eventAtts = getEventAttendees(selectedEvent.id)
                    const myRsvp = eventAtts.find(a => a.identity?.toHexString() === myHex)
                    return (
                      <>
                        {eventAtts.length > 0 ? (
                          <div className="space-y-1.5 mb-3">
                            {eventAtts.map(att => {
                              const name = att.identity ? getEmployeeName(att.identity.toHexString()) : 'Unknown'
                              const rsvpTag = att.rsvpStatus?.tag ?? 'Pending'
                              const rsvpConfig: Record<string, { icon: typeof Check; color: string }> = {
                                Accepted: { icon: Check, color: 'text-green-600 dark:text-green-400' },
                                Declined: { icon: X, color: 'text-red-600 dark:text-red-400' },
                                Maybe: { icon: HelpCircle, color: 'text-amber-600 dark:text-amber-400' },
                                Pending: { icon: Clock, color: 'text-muted-foreground' },
                              }
                              const rCfg = rsvpConfig[rsvpTag] ?? rsvpConfig.Pending
                              const RsvpIcon = rCfg.icon
                              return (
                                <div key={att.id.toString()} className="flex items-center gap-2 group">
                                  <div className="flex items-center justify-center size-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold shrink-0">
                                    {getInitials(name)}
                                  </div>
                                  <span className="text-sm flex-1 truncate">{name}</span>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className={`flex items-center gap-1 text-xs ${rCfg.color}`}>
                                        <RsvpIcon className="size-3" />
                                        {rsvpTag}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>RSVP: {rsvpTag}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={<button
                                        onClick={() => removeEventAttendee({ attendeeId: att.id })}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-500 transition-all"
                                      />}
                                    >
                                      <X className="size-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>Remove attendee</TooltipContent>
                                  </Tooltip>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-3">No attendees yet</p>
                        )}

                        {/* RSVP buttons (if I'm an attendee) */}
                        {myRsvp && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground mr-1">Your RSVP:</span>
                            {(['Accepted', 'Maybe', 'Declined'] as const).map(status => {
                              const isActive = (myRsvp.rsvpStatus?.tag ?? 'Pending') === status
                              const colors: Record<string, string> = {
                                Accepted: isActive ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30' : 'hover:bg-green-500/10',
                                Maybe: isActive ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'hover:bg-amber-500/10',
                                Declined: isActive ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' : 'hover:bg-red-500/10',
                              }
                              return (
                                <button
                                  key={status}
                                  onClick={() => respondToEvent({ eventId: selectedEvent.id, rsvpTag: status })}
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${colors[status]}`}
                                >
                                  {status}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Invite attendee */}
                        <div className="relative">
                          <Input
                            placeholder="Search to invite..."
                            value={attendeeSearch}
                            onChange={e => setAttendeeSearch(e.target.value)}
                            className="h-8 text-sm pr-8"
                          />
                          <UserPlus className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        {attendeeSearch.trim() && (() => {
                          const q = attendeeSearch.toLowerCase()
                          const existingHexes = new Set(eventAtts.filter(a => a.identity).map(a => a.identity.toHexString()))
                          const matches = allEmployees
                            .filter(e => (e.name.toLowerCase().includes(q) || (e.email?.toLowerCase().includes(q) ?? false)) && !existingHexes.has(e.id.toHexString()))
                            .slice(0, 5)
                          return matches.length > 0 ? (
                            <div className="border rounded-md mt-1 divide-y max-h-40 overflow-y-auto">
                              {matches.map(emp => (
                                <button
                                  key={emp.id.toHexString()}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
                                  onClick={() => {
                                    addEventAttendee({ eventId: selectedEvent.id, attendeeIdentity: emp.id.toHexString() })
                                    setAttendeeSearch('')
                                  }}
                                >
                                  <div className="flex items-center justify-center size-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[9px] font-bold shrink-0">
                                    {getInitials(emp.name)}
                                  </div>
                                  <span className="truncate">{emp.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">{emp.role}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">No matching team members</p>
                          )
                        })()}
                      </>
                    )
                  })()}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedEvent)}>
                  <Edit3 className="mr-1.5 size-3.5" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          )
        })()}
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Add a new event to your calendar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={v => setNewCategory(v as EventCategoryKey)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_CONFIG) as [EventCategoryKey, (typeof CATEGORY_CONFIG)[EventCategoryKey]][]).map(
                      ([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full" style={{ backgroundColor: config.color }} />
                            {config.label}
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newAllDay}
                  onChange={e => setNewAllDay(e.target.checked)}
                  className="rounded border-input"
                />
                All day
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newIsVirtual}
                  onChange={e => setNewIsVirtual(e.target.checked)}
                  className="rounded border-input"
                />
                <Video className="size-3.5" />
                Virtual
              </label>
            </div>
            {!newAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}

            {/* Time conflict warning */}
            {createConflicts.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Time Conflict</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Overlaps with: {createConflicts.map(c => c.title).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label>Location</Label>
              <Input
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Room, address, or link"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Add details about this event..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!newTitle.trim() || !newDate}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Event title" className="mt-1" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={v => setEditCategory(v as EventCategoryKey)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_CONFIG) as [EventCategoryKey, (typeof CATEGORY_CONFIG)[EventCategoryKey]][]).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full" style={{ backgroundColor: config.color }} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editAllDay} onChange={e => setEditAllDay(e.target.checked)} className="rounded border-input" />
                All day
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editIsVirtual} onChange={e => setEditIsVirtual(e.target.checked)} className="rounded border-input" />
                <Video className="size-3.5" /> Virtual
              </label>
            </div>
            {!editAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}

            {/* Time conflict warning */}
            {editConflicts.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Time Conflict</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Overlaps with: {editConflicts.map(c => c.title).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label>Location</Label>
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Room, address, or link" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Add details about this event..." className="mt-1 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateEvent} disabled={!editTitle.trim() || !editDate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
