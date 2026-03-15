'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  Phone,
  Briefcase,
  UserCheck,
  Bot,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- types ------------------------------------------------------------------

type MeetingTypeTag = 'OneOnOne' | 'TeamSync' | 'CustomerCall' | 'InterviewCall' | 'SalesDemo'
type MeetingStatusTag = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled'

const meetingTypeConfig: Record<MeetingTypeTag, { icon: typeof Video; label: string; cls: string; dot: string }> = {
  OneOnOne: {
    icon: Phone,
    label: '1:1',
    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  TeamSync: {
    icon: Users,
    label: 'Team Sync',
    cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    dot: 'bg-violet-500',
  },
  CustomerCall: {
    icon: Briefcase,
    label: 'Customer',
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  InterviewCall: {
    icon: UserCheck,
    label: 'Interview',
    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  SalesDemo: {
    icon: Video,
    label: 'Demo',
    cls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    dot: 'bg-pink-500',
  },
}

const statusConfig: Record<MeetingStatusTag, { cls: string; dot: string }> = {
  Scheduled: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  InProgress: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 animate-pulse' },
  Completed: { cls: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400', dot: 'bg-neutral-400' },
  Cancelled: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400', dot: 'bg-red-400' },
}

// ---- helpers ----------------------------------------------------------------

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatTimeRange(start: Date, durationMinutes: number) {
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return `${formatTime(start)} – ${formatTime(end)}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// =============================================================================

export default function CalendarPage() {
  const [allMeetings] = useTable(tables.meeting)
  const [allEmployees] = useTable(tables.employee)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Parse meeting dates
  const meetings = useMemo(
    () =>
      [...allMeetings].map((m) => ({
        ...m,
        _date: (() => { try { return m.scheduledAt.toDate() } catch { return new Date() } })(),
      })),
    [allMeetings]
  )

  // Meetings by date key
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, typeof meetings>()
    for (const m of meetings) {
      const key = `${m._date.getFullYear()}-${m._date.getMonth()}-${m._date.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [meetings])

  // Selected date meetings
  const selectedMeetings = useMemo(() => {
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    return (meetingsByDate.get(key) ?? []).sort((a, b) => a._date.getTime() - b._date.getTime())
  }, [meetingsByDate, selectedDate])

  // Calendar grid
  const calendarDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth])

  // Stats
  const thisMonthMeetings = meetings.filter(
    (m) => m._date.getMonth() === viewMonth && m._date.getFullYear() === viewYear
  )
  const scheduledCount = thisMonthMeetings.filter((m) => m.status.tag === 'Scheduled').length
  const completedCount = thisMonthMeetings.filter((m) => m.status.tag === 'Completed').length
  const totalHours = Math.round(thisMonthMeetings.reduce((sum, m) => sum + m.durationMinutes, 0) / 60)

  // Nav
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }
  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelectedDate(today)
  }

  const getParticipantName = (hex: string) => {
    const emp = employeeMap.get(hex)
    return emp?.name ?? 'Unknown'
  }

  const getParticipantInitials = (hex: string) => {
    const name = getParticipantName(hex)
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <CalendarIcon className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#3b82f6', '#6366f1', '#4f46e5', '#3b82f6']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                Calendar
              </GradientText>
              <p className="text-xs text-muted-foreground">Meetings & schedule overview</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={scheduledCount} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CalendarIcon className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={completedCount} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Video className="size-4 text-emerald-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours This Month</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  <CountUp to={totalHours} />
                </p>
              </div>
              <div className="size-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Clock className="size-4 text-violet-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Calendar + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 flex-1 border-t border-l rounded-lg overflow-hidden">
            {calendarDays.map((day, i) => {
              const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
              const dayMeetings = meetingsByDate.get(key) ?? []
              const isToday = isSameDay(day.date, today)
              const isSelected = isSameDay(day.date, selectedDate)

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative border-r border-b p-1.5 min-h-[80px] text-left transition-colors hover:bg-muted/50 ${
                    !day.isCurrentMonth ? 'text-muted-foreground/40 bg-muted/20' : ''
                  } ${isSelected ? 'bg-blue-500/5 ring-1 ring-blue-500/30 ring-inset' : ''}`}
                >
                  <span
                    className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-medium ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : ''
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* Meeting dots */}
                  {dayMeetings.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayMeetings.slice(0, 3).map((m) => {
                        const cfg = meetingTypeConfig[m.meetingType.tag as MeetingTypeTag]
                        return (
                          <span
                            key={String(m.id)}
                            className={`block size-1.5 rounded-full ${cfg?.dot ?? 'bg-blue-500'}`}
                            title={m.title}
                          />
                        )
                      })}
                      {dayMeetings.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayMeetings.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* First meeting preview */}
                  {dayMeetings.length > 0 && day.isCurrentMonth && (
                    <div className="mt-0.5">
                      {dayMeetings.slice(0, 2).map((m) => {
                        const cfg = meetingTypeConfig[m.meetingType.tag as MeetingTypeTag]
                        return (
                          <div
                            key={String(m.id)}
                            className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate mb-0.5 ${cfg?.cls ?? 'bg-blue-500/10 text-blue-600'}`}
                          >
                            {formatTime(m._date)} {m.title}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="w-80 border-l flex flex-col bg-background">
          <div className="flex-shrink-0 px-4 py-3 border-b">
            <h3 className="font-semibold">
              {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''}
            </p>
          </div>

          <ScrollArea className="flex-1">
            {selectedMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center mb-2">
                  <CalendarIcon className="size-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">No meetings</p>
                <p className="text-xs mt-0.5">Nothing scheduled for this day</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {selectedMeetings.map((meeting) => {
                  const typeCfg = meetingTypeConfig[meeting.meetingType.tag as MeetingTypeTag]
                  const statusCfg = statusConfig[meeting.status.tag as MeetingStatusTag]
                  const TypeIcon = typeCfg?.icon ?? Video

                  return (
                    <div
                      key={String(meeting.id)}
                      className="rounded-lg border p-3 space-y-2 hover:bg-muted/30 transition-colors"
                    >
                      {/* Title + type */}
                      <div className="flex items-start gap-2">
                        <div className={`rounded-md p-1.5 shrink-0 ${typeCfg?.cls ?? 'bg-blue-500/10'}`}>
                          <TypeIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeRange(meeting._date, meeting.durationMinutes)}
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeCfg?.cls ?? ''}`}>
                          {typeCfg?.label ?? meeting.meetingType.tag}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusCfg?.cls ?? ''}`}>
                          <span className={`size-1 rounded-full ${statusCfg?.dot ?? ''}`} />
                          {meeting.status.tag}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {meeting.durationMinutes}min
                        </span>
                      </div>

                      {/* Participants */}
                      {meeting.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="size-3 text-muted-foreground shrink-0" />
                          <div className="flex -space-x-1">
                            {meeting.participants.slice(0, 5).map((hex) => (
                              <div
                                key={hex}
                                className="size-5 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-background flex items-center justify-center"
                                title={getParticipantName(hex)}
                              >
                                <span className="text-[7px] font-medium">{getParticipantInitials(hex)}</span>
                              </div>
                            ))}
                            {meeting.participants.length > 5 && (
                              <div className="size-5 rounded-full bg-muted border border-background flex items-center justify-center">
                                <span className="text-[7px] font-medium">+{meeting.participants.length - 5}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI notetaker */}
                      {meeting.aiNotetaker && (
                        <div className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400">
                          <Bot className="size-3" />
                          AI Notetaker
                        </div>
                      )}

                      {/* Summary preview */}
                      {meeting.aiSummary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-1.5">
                          {meeting.aiSummary}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
