'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  type LucideIcon,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ── Types ──────────────────────────────────────
interface CalendarEvent {
  id: string
  title: string
  description: string
  start: Date
  end: Date
  allDay: boolean
  color: string
  category: EventCategory
  location: string
  attendees: string[]
  isVirtual: boolean
}

type EventCategory = 'meeting' | 'deadline' | 'interview' | 'standup' | 'review' | 'personal' | 'other'
type CalendarView = 'month' | 'week' | 'day'

const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; bgClass: string; textClass: string }> = {
  meeting: { label: 'Meeting', color: '#3b82f6', bgClass: 'bg-blue-500/15 border-blue-500/30', textClass: 'text-blue-600 dark:text-blue-400' },
  deadline: { label: 'Deadline', color: '#ef4444', bgClass: 'bg-red-500/15 border-red-500/30', textClass: 'text-red-600 dark:text-red-400' },
  interview: { label: 'Interview', color: '#a855f7', bgClass: 'bg-purple-500/15 border-purple-500/30', textClass: 'text-purple-600 dark:text-purple-400' },
  standup: { label: 'Standup', color: '#22c55e', bgClass: 'bg-green-500/15 border-green-500/30', textClass: 'text-green-600 dark:text-green-400' },
  review: { label: 'Review', color: '#f59e0b', bgClass: 'bg-amber-500/15 border-amber-500/30', textClass: 'text-amber-600 dark:text-amber-400' },
  personal: { label: 'Personal', color: '#ec4899', bgClass: 'bg-pink-500/15 border-pink-500/30', textClass: 'text-pink-600 dark:text-pink-400' },
  other: { label: 'Other', color: '#6b7280', bgClass: 'bg-neutral-500/15 border-neutral-500/30', textClass: 'text-neutral-600 dark:text-neutral-400' },
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

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  // Current month
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i))
  }
  // Next month padding to fill 6 rows
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

// ── Sample events ──────────────────────────────
function createSampleEvents(): CalendarEvent[] {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  return [
    {
      id: '1',
      title: 'Team Standup',
      description: 'Daily sync with the engineering team',
      start: new Date(y, m, d, 9, 0),
      end: new Date(y, m, d, 9, 30),
      allDay: false,
      color: '#22c55e',
      category: 'standup',
      location: '',
      attendees: ['alice', 'bob', 'charlie'],
      isVirtual: true,
    },
    {
      id: '2',
      title: 'Product Review',
      description: 'Review Q1 roadmap progress and adjust priorities',
      start: new Date(y, m, d, 14, 0),
      end: new Date(y, m, d, 15, 0),
      allDay: false,
      color: '#f59e0b',
      category: 'review',
      location: 'Room 4B',
      attendees: ['alice', 'diana', 'eve'],
      isVirtual: false,
    },
    {
      id: '3',
      title: 'Sprint Deadline',
      description: 'All sprint items must be completed',
      start: new Date(y, m, d + 2, 17, 0),
      end: new Date(y, m, d + 2, 17, 0),
      allDay: true,
      color: '#ef4444',
      category: 'deadline',
      location: '',
      attendees: [],
      isVirtual: false,
    },
    {
      id: '4',
      title: 'Candidate Interview – Jane',
      description: 'Senior Frontend Engineer candidate, 2nd round',
      start: new Date(y, m, d + 1, 10, 0),
      end: new Date(y, m, d + 1, 11, 0),
      allDay: false,
      color: '#a855f7',
      category: 'interview',
      location: '',
      attendees: ['alice', 'frank'],
      isVirtual: true,
    },
    {
      id: '5',
      title: 'Client Strategy Meeting',
      description: 'Quarterly business review with Acme Corp',
      start: new Date(y, m, d + 1, 14, 0),
      end: new Date(y, m, d + 1, 15, 30),
      allDay: false,
      color: '#3b82f6',
      category: 'meeting',
      location: 'Conference Room A',
      attendees: ['alice', 'george', 'helen'],
      isVirtual: false,
    },
    {
      id: '6',
      title: 'Team Lunch',
      description: 'Monthly team bonding lunch',
      start: new Date(y, m, d + 3, 12, 0),
      end: new Date(y, m, d + 3, 13, 0),
      allDay: false,
      color: '#ec4899',
      category: 'personal',
      location: 'Downtown Bistro',
      attendees: ['alice', 'bob', 'charlie', 'diana'],
      isVirtual: false,
    },
    {
      id: '7',
      title: 'Code Review Session',
      description: 'Review PRs for the calendar module',
      start: new Date(y, m, d, 16, 0),
      end: new Date(y, m, d, 16, 45),
      allDay: false,
      color: '#f59e0b',
      category: 'review',
      location: '',
      attendees: ['bob', 'charlie'],
      isVirtual: true,
    },
    {
      id: '8',
      title: 'All-Hands Meeting',
      description: 'Company-wide monthly update',
      start: new Date(y, m, d + 5, 10, 0),
      end: new Date(y, m, d + 5, 11, 0),
      allDay: false,
      color: '#3b82f6',
      category: 'meeting',
      location: 'Main Auditorium',
      attendees: [],
      isVirtual: true,
    },
  ]
}

// ── Component ──────────────────────────────────
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [events, setEvents] = useState<CalendarEvent[]>(createSampleEvents)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    new Set(Object.keys(CATEGORY_CONFIG) as EventCategory[])
  )

  // Create event form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState<EventCategory>('meeting')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:00')
  const [newAllDay, setNewAllDay] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newIsVirtual, setNewIsVirtual] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month])
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const hours = useMemo(() => getHours(), [])

  const filteredEvents = useMemo(
    () => events.filter((e) => activeCategories.has(e.category)),
    [events, activeCategories]
  )

  const eventsForDay = useCallback(
    (date: Date) => filteredEvents.filter((e) => isSameDay(e.start, date)),
    [filteredEvents]
  )

  const todaysEvents = useMemo(() => eventsForDay(new Date()), [eventsForDay])
  const selectedDayEvents = useMemo(() => eventsForDay(selectedDate), [eventsForDay, selectedDate])
  const thisWeekEvents = useMemo(() => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return filteredEvents.filter((e) => e.start >= weekStart && e.start < weekEnd)
  }, [filteredEvents])

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

  const toggleCategory = (cat: EventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleCreateEvent = () => {
    if (!newTitle.trim() || !newDate) return
    const [y, m, d] = newDate.split('-').map(Number)
    const [sh, sm] = newStartTime.split(':').map(Number)
    const [eh, em] = newEndTime.split(':').map(Number)
    const cat = CATEGORY_CONFIG[newCategory]

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      start: new Date(y, m - 1, d, sh, sm),
      end: new Date(y, m - 1, d, eh, em),
      allDay: newAllDay,
      color: cat.color,
      category: newCategory,
      location: newLocation.trim(),
      attendees: [],
      isVirtual: newIsVirtual,
    }
    setEvents((prev) => [...prev, event])
    setShowCreateDialog(false)
    resetForm()
  }

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setSelectedEvent(null)
  }

  const resetForm = () => {
    setNewTitle('')
    setNewDescription('')
    setNewCategory('meeting')
    setNewDate('')
    setNewStartTime('09:00')
    setNewEndTime('10:00')
    setNewAllDay(false)
    setNewLocation('')
    setNewIsVirtual(false)
  }

  const openCreateForDate = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setNewDate(iso)
    setShowCreateDialog(true)
  }

  // ── Stats ────────────────────────────────────
  const stats = [
    { label: "Today's Events", value: todaysEvents.length, color: '#3b82f6' },
    { label: 'This Week', value: thisWeekEvents.length, color: '#8b5cf6' },
    { label: 'Total Events', value: events.length, color: '#22c55e' },
  ]

  return (
    <div className="p-6 space-y-6">
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
            <p className="text-muted-foreground text-sm">
              Schedule meetings, track deadlines, and manage your time
            </p>
          </div>
        </div>
        <Button onClick={() => {
          const today = new Date()
          const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          setNewDate(iso)
          setShowCreateDialog(true)
        }}>
          <Plus className="mr-2 size-4" />
          New Event
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
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
              <div className="flex items-center justify-between">
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
                <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
                  <TabsList>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Month View */}
          {view === 'month' && (
            <Card>
              <CardContent className="p-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b">
                  {DAYS.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Day grid */}
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
                          {dayEvents.slice(0, 3).map((event) => (
                            <button
                              key={event.id}
                              className={`w-full text-left text-[10px] leading-tight truncate rounded px-1 py-0.5 border ${CATEGORY_CONFIG[event.category].bgClass} ${CATEGORY_CONFIG[event.category].textClass} hover:opacity-80 transition-opacity`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                              }}
                            >
                              {event.allDay ? event.title : `${formatTime(event.start)} ${event.title}`}
                            </button>
                          ))}
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

          {/* Week View */}
          {view === 'week' && (
            <Card>
              <CardContent className="p-0 overflow-auto max-h-[calc(100vh-320px)]">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
                  {/* Header row */}
                  <div className="border-b border-r p-2" />
                  {weekDays.map((day, i) => (
                    <div
                      key={i}
                      className={`border-b border-r p-2 text-center cursor-pointer hover:bg-accent/50 ${
                        isSameDay(day, selectedDate) ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedDate(day)}
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

                  {/* Hour rows */}
                  {hours.map((hour) => (
                    <>
                      <div key={`label-${hour}`} className="border-b border-r px-2 py-3 text-[10px] text-muted-foreground text-right">
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </div>
                      {weekDays.map((day, di) => {
                        const cellEvents = eventsForDay(day).filter(
                          (e) => !e.allDay && e.start.getHours() === hour
                        )
                        return (
                          <div
                            key={`cell-${hour}-${di}`}
                            className="border-b border-r min-h-[48px] p-0.5 relative hover:bg-accent/30 cursor-pointer"
                            onDoubleClick={() => openCreateForDate(day)}
                          >
                            {cellEvents.map((event) => (
                              <button
                                key={event.id}
                                className={`w-full text-left text-[10px] leading-tight truncate rounded px-1.5 py-1 border mb-0.5 ${CATEGORY_CONFIG[event.category].bgClass} ${CATEGORY_CONFIG[event.category].textClass}`}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <span className="font-medium">{event.title}</span>
                                <br />
                                {formatTimeRange(event.start, event.end)}
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day View */}
          {view === 'day' && (
            <Card>
              <CardContent className="p-0 overflow-auto max-h-[calc(100vh-320px)]">
                {/* All-day events */}
                {selectedDayEvents.filter((e) => e.allDay).length > 0 && (
                  <div className="p-3 border-b bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-2">All Day</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDayEvents
                        .filter((e) => e.allDay)
                        .map((event) => (
                          <button
                            key={event.id}
                            className={`text-xs px-2.5 py-1.5 rounded border ${CATEGORY_CONFIG[event.category].bgClass} ${CATEGORY_CONFIG[event.category].textClass}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.title}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Hourly grid */}
                <div className="grid grid-cols-[60px_1fr]">
                  {hours.map((hour) => {
                    const hourEvents = selectedDayEvents.filter(
                      (e) => !e.allDay && e.start.getHours() === hour
                    )
                    return (
                      <div key={hour} className="contents">
                        <div className="border-b border-r px-2 py-3 text-[10px] text-muted-foreground text-right">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div
                          className="border-b min-h-[56px] p-1 hover:bg-accent/30 cursor-pointer"
                          onDoubleClick={() => openCreateForDate(selectedDate)}
                        >
                          {hourEvents.map((event) => (
                            <button
                              key={event.id}
                              className={`w-full text-left rounded px-3 py-2 border mb-1 ${CATEGORY_CONFIG[event.category].bgClass} ${CATEGORY_CONFIG[event.category].textClass}`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{event.title}</span>
                                <span className="text-xs opacity-70">
                                  {formatTimeRange(event.start, event.end)}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-xs opacity-60 mt-0.5 truncate">{event.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] opacity-60">
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
                                {event.attendees.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="size-3" />
                                    {event.attendees.length}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
                <h3 className="text-sm font-semibold">{MONTHS[month]} {year}</h3>
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
                {DAYS.map((d) => (
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
                      className={`size-7 text-[11px] rounded-full flex items-center justify-center transition-colors ${
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
                {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
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
                        {events.filter((e) => e.category === key).length}
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
                {isToday(selectedDate) ? "Today's Schedule" : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <CalendarDays className="size-8 mb-2 opacity-30" />
                  <p className="text-xs">No events</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => openCreateForDate(selectedDate)}
                  >
                    <Plus className="mr-1 size-3" />
                    Add event
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents
                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                    .map((event) => (
                      <button
                        key={event.id}
                        className={`w-full text-left rounded-lg p-2.5 border transition-colors hover:opacity-80 ${CATEGORY_CONFIG[event.category].bgClass}`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <p className={`text-xs font-medium ${CATEGORY_CONFIG[event.category].textClass}`}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <Clock className="size-3" />
                          {event.allDay ? 'All day' : formatTimeRange(event.start, event.end)}
                          {event.attendees.length > 0 && (
                            <>
                              <Users className="size-3 ml-1" />
                              {event.attendees.length}
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                <DialogTitle>{selectedEvent.title}</DialogTitle>
              </div>
              <DialogDescription>
                <Badge variant="outline" className={`${CATEGORY_CONFIG[selectedEvent.category].bgClass} ${CATEGORY_CONFIG[selectedEvent.category].textClass} border`}>
                  {CATEGORY_CONFIG[selectedEvent.category].label}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                {selectedEvent.allDay ? (
                  <span>All day — {selectedEvent.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
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
              {selectedEvent.attendees.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-foreground" />
                  {selectedEvent.attendees.length} attendee{selectedEvent.attendees.length !== 1 ? 's' : ''}
                </div>
              )}
              {selectedEvent.description && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
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
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as EventCategory)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
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
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newAllDay}
                  onChange={(e) => setNewAllDay(e.target.checked)}
                  className="rounded border-input"
                />
                All day
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newIsVirtual}
                  onChange={(e) => setNewIsVirtual(e.target.checked)}
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
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Location</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Room, address, or link"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Add details about this event..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!newTitle.trim() || !newDate}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
