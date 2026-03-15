'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  Phone,
  Briefcase,
  GraduationCap,
  Megaphone,
  Bot,
  Flag,
  AlertCircle,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- constants ---------------------------------------------------------------

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ---- types -------------------------------------------------------------------

type CalendarEvent = {
  id: string
  title: string
  time: Date
  endTime?: Date
  type: 'meeting' | 'interview' | 'task-due' | 'ticket-sla'
  color: string
  dotColor: string
  icon: typeof CalendarIcon
  meta?: string
  status?: string
}

// ---- helpers ----------------------------------------------------------------

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function meetingIcon(type: string) {
  switch (type) {
    case 'OneOnOne': return Users
    case 'TeamSync': return Users
    case 'CustomerCall': return Phone
    case 'InterviewCall': return GraduationCap
    case 'SalesDemo': return Briefcase
    case 'AllHands': return Megaphone
    default: return Video
  }
}

function meetingColor(type: string): { color: string; dot: string } {
  switch (type) {
    case 'OneOnOne': return { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' }
    case 'TeamSync': return { color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' }
    case 'CustomerCall': return { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' }
    case 'InterviewCall': return { color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20', dot: 'bg-fuchsia-500' }
    case 'SalesDemo': return { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' }
    case 'AllHands': return { color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' }
    default: return { color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-500' }
  }
}

// =============================================================================

export default function CalendarPage() {
  const [allMeetings] = useTable(tables.meeting)
  const [allInterviews] = useTable(tables.interview)
  const [allTasks] = useTable(tables.task)
  const [allTickets] = useTable(tables.ticket)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Build calendar events from all sources
  const events = useMemo<CalendarEvent[]>(() => {
    const items: CalendarEvent[] = []

    // Meetings
    for (const m of allMeetings) {
      try {
        const time = m.scheduledAt.toDate()
        const endTime = new Date(time.getTime() + m.durationMinutes * 60_000)
        const mc = meetingColor(m.meetingType.tag)
        items.push({
          id: `meeting-${m.id}`,
          title: m.title,
          time,
          endTime,
          type: 'meeting',
          color: mc.color,
          dotColor: mc.dot,
          icon: meetingIcon(m.meetingType.tag),
          meta: `${m.durationMinutes}min · ${m.participants.length} participants`,
          status: m.status.tag,
        })
      } catch {}
    }

    // Interviews
    for (const iv of allInterviews) {
      try {
        const time = iv.scheduledAt.toDate()
        items.push({
          id: `interview-${iv.id}`,
          title: `Interview: ${iv.candidateName ?? 'Candidate'}`,
          time,
          type: 'interview',
          color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
          dotColor: 'bg-fuchsia-500',
          icon: GraduationCap,
          meta: iv.interviewType?.tag ?? 'Interview',
          status: iv.status?.tag,
        })
      } catch {}
    }

    // Task due dates
    for (const t of allTasks) {
      if (!t.dueDate) continue
      try {
        const time = t.dueDate.toDate()
        items.push({
          id: `task-${t.id}`,
          title: t.title,
          time,
          type: 'task-due',
          color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
          dotColor: 'bg-orange-500',
          icon: Flag,
          meta: `${t.priority.tag} priority`,
          status: t.status.tag,
        })
      } catch {}
    }

    // Ticket SLA deadlines
    for (const tk of allTickets) {
      if (!tk.slaDue) continue
      try {
        const time = tk.slaDue.toDate()
        items.push({
          id: `sla-${tk.id}`,
          title: `SLA: ${tk.subject}`,
          time,
          type: 'ticket-sla',
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          dotColor: 'bg-red-500',
          icon: AlertCircle,
          meta: `${tk.priority.tag} · ${tk.status.tag}`,
        })
      } catch {}
    }

    return items.sort((a, b) => a.time.getTime() - b.time.getTime())
  }, [allMeetings, allInterviews, allTasks, allTickets])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startOffset = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(currentYear, currentMonth, i), isCurrentMonth: true })
    }

    // Next month fill
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(currentYear, currentMonth + 1, i), isCurrentMonth: false })
    }

    return days
  }, [currentMonth, currentYear])

  // Events for a given day
  function getEventsForDay(date: Date) {
    return events.filter((e) => sameDay(e.time, date))
  }

  // Events for selected date
  const selectedEvents = useMemo(
    () => (selectedDate ? getEventsForDay(selectedDate) : []),
    [selectedDate, events]
  )

  // Stats
  const today = new Date()
  const todayEvents = getEventsForDay(today)
  const upcomingMeetings = events.filter((e) => e.type === 'meeting' && e.time > today).length
  const overdueTasksDue = events.filter((e) => e.type === 'task-due' && e.time < today && e.status !== 'Done' && e.status !== 'Closed').length
  const thisMonthEvents = events.filter(
    (e) => e.time.getMonth() === currentMonth && e.time.getFullYear() === currentYear
  ).length

  function prevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  function goToToday() {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  const isToday = (date: Date) => sameDay(date, today)

  return (
    <div className="p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#f59e0b', '#ef4444', '#ec4899']} animationSpeed={6}>
              Calendar
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Meetings, interviews, deadlines, and SLAs in one unified view
          </p>
        </div>
        <Button variant="outline" onClick={goToToday} className="text-xs h-8">
          Today
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "TODAY'S EVENTS",
            value: todayEvents.length,
            icon: CalendarIcon,
            gradient: 'from-violet-500 to-purple-500',
            spotlight: 'rgba(139,92,246,0.15)',
          },
          {
            label: 'UPCOMING MEETINGS',
            value: upcomingMeetings,
            icon: Video,
            gradient: 'from-blue-500 to-cyan-500',
            spotlight: 'rgba(59,130,246,0.15)',
          },
          {
            label: 'OVERDUE TASKS',
            value: overdueTasksDue,
            icon: AlertCircle,
            gradient: 'from-red-500 to-rose-500',
            spotlight: 'rgba(239,68,68,0.15)',
          },
          {
            label: 'THIS MONTH',
            value: thisMonthEvents,
            icon: CalendarIcon,
            gradient: 'from-amber-500 to-orange-500',
            spotlight: 'rgba(245,158,11,0.15)',
          },
        ].map((kpi) => (
          <SpotlightCard
            key={kpi.label}
            className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80"
            spotlightColor={kpi.spotlight}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center`}>
                <kpi.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              <CountUp to={kpi.value} duration={1} />
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Calendar + Day Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar Grid */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 min-w-[200px] text-center">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Meetings
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-fuchsia-500" />
                  Interviews
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Deadlines
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  SLAs
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const dayEvents = getEventsForDay(date)
                const isSelected = selectedDate && sameDay(date, selectedDate)
                const isTodayCell = isToday(date)

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[90px] p-1.5 border-b border-r border-neutral-100 dark:border-neutral-800 text-left transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'bg-violet-50/50 dark:bg-violet-950/20 ring-1 ring-inset ring-violet-500/30' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-medium tabular-nums ${
                          isTodayCell
                            ? 'h-6 w-6 rounded-full bg-violet-600 text-white'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event dots/chips */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate border ${event.color}`}
                        >
                          <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${event.dotColor}`} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-neutral-400 dark:text-neutral-500 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>
                {selectedDate
                  ? selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Select a day'}
              </span>
              {selectedDate && (
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-neutral-400 dark:text-neutral-500">
                  <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40 flex items-center justify-center mb-3">
                    <CalendarIcon className="h-7 w-7 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">No events</p>
                  <p className="text-xs mt-1 text-center">
                    {selectedDate && isToday(selectedDate) ? "You're free today" : 'Nothing scheduled'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {selectedEvents.map((event) => {
                    const Icon = event.icon
                    return (
                      <div key={event.id} className="px-4 py-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${event.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                                <Clock className="h-3 w-3" />
                                {formatTime(event.time)}
                                {event.endTime && ` – ${formatTime(event.endTime)}`}
                              </span>
                              {event.meta && (
                                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                  {event.meta}
                                </span>
                              )}
                            </div>
                            {event.status && (
                              <div className="mt-1.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  event.status === 'Completed' || event.status === 'Done'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : event.status === 'Cancelled'
                                    ? 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20 line-through'
                                    : event.status === 'InProgress'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                    : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
                                }`}>
                                  {event.status === 'Completed' || event.status === 'Done' ? (
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                  ) : event.status === 'Cancelled' ? (
                                    <X className="h-2.5 w-2.5" />
                                  ) : (
                                    <Circle className="h-2.5 w-2.5" />
                                  )}
                                  {event.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
