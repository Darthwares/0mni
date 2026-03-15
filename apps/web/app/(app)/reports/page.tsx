'use client'

import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { useState, useMemo } from 'react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  FileBarChart2,
  Star,
  Clock,
  Database,
  BarChart3,
  TicketCheck,
  TrendingDown,
  Users,
  Activity,
  UserSearch,
  Search,
  Plus,
  ArrowLeft,
  Download,
  Table2,
  X,
} from 'lucide-react'

// ── types ────────────────────────────────────────────────────────────────────

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'
type DataSource = 'Tasks' | 'Tickets' | 'Leads' | 'Candidates' | 'Team' | 'Activity'
type ChartType = 'bar' | 'table' | 'funnel' | 'metric'
type ViewFilter = 'all' | 'favorites' | DataSource

interface ReportTemplate {
  id: string
  name: string
  description: string
  source: DataSource
  chartType: ChartType
  icon: typeof BarChart3
  color: string
  spotlightColor: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function getDateThreshold(range: DateRange): number {
  const now = Date.now()
  const ms = { week: 7, month: 30, quarter: 90, year: 365, all: 99999 }
  return now - (ms[range] ?? 99999) * 86400000
}

const TEMPLATES: ReportTemplate[] = [
  { id: 'task-completion', name: 'Task Completion Rate', description: 'Completion percentage by department with status breakdown', source: 'Tasks', chartType: 'bar', icon: BarChart3, color: 'indigo', spotlightColor: 'rgba(99,102,241,0.15)' },
  { id: 'ticket-resolution', name: 'Ticket Resolution Time', description: 'Ticket stats by status with SLA and AI resolution tracking', source: 'Tickets', chartType: 'bar', icon: TicketCheck, color: 'amber', spotlightColor: 'rgba(245,158,11,0.15)' },
  { id: 'sales-funnel', name: 'Sales Pipeline Funnel', description: 'Lead progression through qualification stages', source: 'Leads', chartType: 'funnel', icon: TrendingDown, color: 'emerald', spotlightColor: 'rgba(16,185,129,0.15)' },
  { id: 'headcount', name: 'Headcount by Department', description: 'Team distribution with AI agent breakdown per department', source: 'Team', chartType: 'bar', icon: Users, color: 'violet', spotlightColor: 'rgba(139,92,246,0.15)' },
  { id: 'activity-summary', name: 'Weekly Activity Summary', description: 'Activity log entries grouped by action type', source: 'Activity', chartType: 'table', icon: Activity, color: 'cyan', spotlightColor: 'rgba(6,182,212,0.15)' },
  { id: 'recruitment-funnel', name: 'Recruitment Funnel', description: 'Candidate pipeline from sourcing through hiring', source: 'Candidates', chartType: 'funnel', icon: UserSearch, color: 'rose', spotlightColor: 'rgba(244,63,94,0.15)' },
]

// ── page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId, orgMembers } = useOrg()

  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allActivity] = useTable(tables.activity_log)

  // ── local state ──────────────────────────────────────────────────────────
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [customReports, setCustomReports] = useState<ReportTemplate[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSource, setNewSource] = useState<DataSource>('Tasks')
  const [newChart, setNewChart] = useState<ChartType>('bar')

  // ── org-scoped data ──────────────────────────────────────────────────────
  const orgMemberHexes = useMemo(() => {
    const set = new Set<string>()
    for (const m of orgMembers) if (m.identity) set.add(m.identity.toHexString())
    return set
  }, [orgMembers])

  const orgEmployees = useMemo(
    () => allEmployees.filter(e => orgMemberHexes.has(e.id.toHexString())),
    [allEmployees, orgMemberHexes],
  )
  const orgTasks = useMemo(
    () => allTasks.filter(t => Number(t.orgId) === currentOrgId),
    [allTasks, currentOrgId],
  )
  const orgTickets = useMemo(
    () => allTickets.filter(t => Number(t.orgId) === currentOrgId),
    [allTickets, currentOrgId],
  )
  const orgLeads = useMemo(
    () => allLeads.filter(l => Number(l.orgId) === currentOrgId),
    [allLeads, currentOrgId],
  )
  const orgCandidates = useMemo(
    () => allCandidates.filter(c => Number(c.orgId) === currentOrgId),
    [allCandidates, currentOrgId],
  )
  const orgActivity = useMemo(
    () => allActivity.filter(a => Number(a.orgId) === currentOrgId),
    [allActivity, currentOrgId],
  )

  // ── date-filtered data ───────────────────────────────────────────────────
  const threshold = getDateThreshold(dateRange)
  const tasks = useMemo(() => orgTasks.filter(t => Number(t.createdAt.toMillis()) >= threshold), [orgTasks, threshold])
  const tickets = useMemo(() => orgTickets.filter(t => Number(t.createdAt.toMillis()) >= threshold), [orgTickets, threshold])
  const leads = useMemo(() => orgLeads.filter(l => Number(l.createdAt.toMillis()) >= threshold), [orgLeads, threshold])
  const candidates = useMemo(() => orgCandidates.filter(c => Number(c.createdAt.toMillis()) >= threshold), [orgCandidates, threshold])
  const activity = useMemo(() => orgActivity.filter(a => Number(a.timestamp.toMillis()) >= threshold), [orgActivity, threshold])

  // ── all reports (templates + custom) ─────────────────────────────────────
  const allReports = useMemo(() => [...TEMPLATES, ...customReports], [customReports])
  const filteredReports = useMemo(() => {
    let list = allReports
    if (viewFilter === 'favorites') list = list.filter(r => favorites.has(r.id))
    else if (viewFilter !== 'all') list = list.filter(r => r.source === viewFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    }
    return list
  }, [allReports, viewFilter, favorites, searchQuery])

  const toggleFav = (id: string) => setFavorites(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const createReport = () => {
    if (!newName.trim()) return
    const id = `custom-${Date.now()}`
    const iconMap: Record<DataSource, typeof BarChart3> = { Tasks: BarChart3, Tickets: TicketCheck, Leads: TrendingDown, Candidates: UserSearch, Team: Users, Activity: Activity }
    const colorMap: Record<DataSource, string> = { Tasks: 'indigo', Tickets: 'amber', Leads: 'emerald', Candidates: 'rose', Team: 'violet', Activity: 'cyan' }
    setCustomReports(prev => [...prev, { id, name: newName, description: newDesc || 'Custom report', source: newSource, chartType: newChart, icon: iconMap[newSource], color: colorMap[newSource], spotlightColor: 'rgba(99,102,241,0.15)' }])
    setNewName(''); setNewDesc(''); setShowNewDialog(false)
  }

  // ── date range label ─────────────────────────────────────────────────────
  const rangeLabel: Record<DateRange, string> = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year', all: 'All Time' }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORT DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (activeReport) {
    const report = allReports.find(r => r.id === activeReport)
    if (!report) { setActiveReport(null); return null }
    return (
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveReport(null)} className="flex items-center justify-center size-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{report.name}</h1>
            <p className="text-sm text-muted-foreground">{report.description} &middot; {rangeLabel[dateRange]}</p>
          </div>
          <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5">
            {Object.entries(rangeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="flex items-center gap-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>

        {/* ── Chart area ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          {report.id === 'task-completion' && <TaskCompletionChart tasks={tasks} employees={orgEmployees} />}
          {report.id === 'ticket-resolution' && <TicketResolutionChart tickets={tickets} />}
          {report.id === 'sales-funnel' && <SalesFunnelChart leads={leads} />}
          {report.id === 'headcount' && <HeadcountChart employees={orgEmployees} />}
          {report.id === 'activity-summary' && <ActivitySummaryChart activity={activity} />}
          {report.id === 'recruitment-funnel' && <RecruitmentFunnelChart candidates={candidates} />}
          {report.id.startsWith('custom-') && <CustomReportChart report={report} tasks={tasks} tickets={tickets} leads={leads} candidates={candidates} employees={orgEmployees} activity={activity} />}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/20">
          <FileBarChart2 className="size-5.5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#0ea5e9', '#6366f1', '#a855f7']} animationSpeed={6}>Reports</GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build and view reports from your platform data</p>
        </div>
        <button onClick={() => setShowNewDialog(true)} className="flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-3.5 py-2 hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/20">
          <Plus className="size-3.5" /> New Report
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(14,165,233,0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
              <FileBarChart2 className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Reports</span>
          </div>
          <p className="text-2xl font-bold tabular-nums"><CountUp to={allReports.length} duration={1.5} /></p>
        </SpotlightCard>
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(234,179,8,0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600">
              <Star className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Favorites</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400"><CountUp to={favorites.size} duration={1.5} /></p>
        </SpotlightCard>
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139,92,246,0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Clock className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scheduled</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">0</p>
        </SpotlightCard>
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16,185,129,0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
              <Database className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data Sources</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"><CountUp to={6} duration={1.5} /></p>
        </SpotlightCard>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search reports..." className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'favorites', 'Tasks', 'Tickets', 'Leads', 'Candidates', 'Team', 'Activity'] as ViewFilter[]).map(f => (
            <button key={f} onClick={() => setViewFilter(f)} className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${viewFilter === f ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' : 'border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
              {f === 'all' ? 'All' : f === 'favorites' ? 'Favorites' : f}
            </button>
          ))}
        </div>
        <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5">
          {Object.entries(rangeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* ── Report Cards Grid ───────────────────────────────────────────── */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileBarChart2 className="size-10 opacity-30 mb-3" />
          <p className="text-sm font-medium">No reports match your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(report => {
            const Icon = report.icon
            const isFav = favorites.has(report.id)
            const chartIcons: Record<ChartType, typeof BarChart3> = { bar: BarChart3, table: Table2, funnel: TrendingDown, metric: Activity }
            const ChartIcon = chartIcons[report.chartType]
            return (
              <div key={report.id} onClick={() => setActiveReport(report.id)} className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-4 cursor-pointer hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 transition-all">
                <button onClick={e => { e.stopPropagation(); toggleFav(report.id) }} className="absolute top-3 right-3 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <Star className={`size-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`} />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center justify-center size-9 rounded-lg bg-${report.color}-500/10`}>
                    <Icon className={`size-4.5 text-${report.color}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate pr-6">{report.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] bg-${report.color}-500/10 text-${report.color}-600 dark:text-${report.color}-400 border-${report.color}-500/20 hover:bg-${report.color}-500/10`}>
                    {report.source}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                    <ChartIcon className="size-3" />
                    <span className="capitalize">{report.chartType}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── New Report Dialog ───────────────────────────────────────────── */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowNewDialog(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">New Report</h2>
              <button onClick={() => setShowNewDialog(false)} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="size-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Monthly Sales Summary" className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this report track?" className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Source</label>
                  <select value={newSource} onChange={e => setNewSource(e.target.value as DataSource)} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
                    {(['Tasks', 'Tickets', 'Leads', 'Candidates', 'Team', 'Activity'] as DataSource[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Chart Type</label>
                  <select value={newChart} onChange={e => setNewChart(e.target.value as ChartType)} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
                    {(['bar', 'table', 'funnel', 'metric'] as ChartType[]).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={createReport} disabled={!newName.trim()} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40">
                Create Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

function TaskCompletionChart({ tasks, employees }: { tasks: any[]; employees: any[] }) {
  const deptData = useMemo(() => {
    const depts = new Map<string, { total: number; completed: number; inProgress: number }>()
    const empDept = new Map<string, string>()
    for (const e of employees) empDept.set(e.id.toHexString(), e.department?.tag ?? 'Other')
    for (const t of tasks) {
      const dept = t.assignee ? (empDept.get(t.assignee.toHexString()) ?? 'Unassigned') : 'Unassigned'
      const d = depts.get(dept) ?? { total: 0, completed: 0, inProgress: 0 }
      d.total++
      if (t.status.tag === 'Completed') d.completed++
      if (t.status.tag === 'InProgress' || t.status.tag === 'Claimed') d.inProgress++
      depts.set(dept, d)
    }
    return [...depts.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [tasks, employees])

  const maxCount = Math.max(1, ...deptData.map(([, d]) => d.total))

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Task Completion by Department</h3>
      {deptData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No task data available</p>
      ) : (
        <div className="space-y-3">
          {deptData.map(([dept, d]) => (
            <div key={dept} className="flex items-center gap-3">
              <span className="text-xs font-medium w-24 shrink-0 truncate text-muted-foreground">{dept}</span>
              <div className="flex-1 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 rounded-md bg-emerald-500/80 transition-all duration-700" style={{ width: `${pct(d.completed, maxCount)}%` }} />
                <div className="absolute inset-y-0 rounded-md bg-blue-500/60 transition-all duration-700" style={{ left: `${pct(d.completed, maxCount)}%`, width: `${pct(d.inProgress, maxCount)}%` }} />
                <div className="absolute inset-y-0 rounded-md bg-neutral-300/40 dark:bg-neutral-600/40 transition-all duration-700" style={{ left: `${pct(d.completed + d.inProgress, maxCount)}%`, width: `${pct(d.total - d.completed - d.inProgress, maxCount)}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums w-10 text-right text-emerald-600 dark:text-emerald-400">{pct(d.completed, d.total)}%</span>
              <span className="text-[10px] text-muted-foreground tabular-nums w-14 text-right">{d.completed}/{d.total}</span>
            </div>
          ))}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-emerald-500" /> Completed</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-blue-500" /> In Progress</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-neutral-300 dark:bg-neutral-600" /> Other</span>
          </div>
        </div>
      )}
      <DataTable headers={['Department', 'Total', 'Completed', 'In Progress', 'Completion %']} rows={deptData.map(([dept, d]) => [dept, d.total.toString(), d.completed.toString(), d.inProgress.toString(), `${pct(d.completed, d.total)}%`])} />
    </div>
  )
}

function TicketResolutionChart({ tickets }: { tickets: any[] }) {
  const statusData = useMemo(() => {
    const statuses = ['New', 'Open', 'Pending', 'Resolved', 'Closed'] as const
    const colors = { New: 'bg-blue-500', Open: 'bg-amber-500', Pending: 'bg-orange-500', Resolved: 'bg-emerald-500', Closed: 'bg-neutral-400' }
    return statuses.map(s => ({
      status: s,
      count: tickets.filter(t => t.status.tag === s).length,
      color: colors[s],
    }))
  }, [tickets])

  const total = tickets.length
  const aiResolved = tickets.filter(t => t.aiAutoResolved).length
  const avgEscalation = total > 0 ? (tickets.reduce((sum, t) => sum + t.escalationCount, 0) / total).toFixed(1) : '0'

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Ticket Status Breakdown</h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total</p>
          <p className="text-xl font-bold tabular-nums">{total}</p>
        </div>
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Resolved</p>
          <p className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{aiResolved}</p>
        </div>
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Escalations</p>
          <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{avgEscalation}</p>
        </div>
      </div>
      <div className="space-y-3">
        {statusData.map(s => (
          <div key={s.status} className="flex items-center gap-3">
            <span className="text-xs font-medium w-20 shrink-0 text-muted-foreground">{s.status}</span>
            <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${pct(s.count, total)}%` }} />
            </div>
            <span className="text-xs font-bold tabular-nums w-8 text-right">{s.count}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{pct(s.count, total)}%</span>
          </div>
        ))}
      </div>
      <DataTable headers={['Status', 'Count', 'Percentage']} rows={statusData.map(s => [s.status, s.count.toString(), `${pct(s.count, total)}%`])} />
    </div>
  )
}

function SalesFunnelChart({ leads }: { leads: any[] }) {
  const stages = useMemo(() => {
    const order = ['New', 'Contacted', 'Qualified', 'Converted'] as const
    const colors = ['bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500']
    const total = leads.length
    return order.map((s, i) => ({
      stage: s,
      count: leads.filter(l => l.status.tag === s).length,
      color: colors[i],
      width: total > 0 ? Math.max(15, 100 - i * 20) : 15,
    }))
  }, [leads])

  const lost = leads.filter(l => l.status.tag === 'Lost').length
  const unqualified = leads.filter(l => l.status.tag === 'Unqualified').length
  const total = leads.length
  const convRate = total > 0 ? pct(stages[3].count, total) : 0

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Sales Pipeline Funnel</h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-sky-500/5 border border-sky-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Leads</p>
          <p className="text-xl font-bold tabular-nums">{total}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Conversion</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{convRate}%</p>
        </div>
        <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lost</p>
          <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{lost}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 py-2">
        {stages.map(s => (
          <div key={s.stage} className="flex items-center gap-3 w-full" style={{ maxWidth: `${s.width}%`, margin: '0 auto' }}>
            <div className={`h-9 w-full rounded-lg ${s.color} flex items-center justify-between px-3 transition-all duration-700`}>
              <span className="text-xs font-semibold text-white">{s.stage}</span>
              <span className="text-xs font-bold text-white/90 tabular-nums">{s.count}</span>
            </div>
          </div>
        ))}
      </div>
      <DataTable headers={['Stage', 'Count', '% of Total']} rows={[...stages.map(s => [s.stage, s.count.toString(), `${pct(s.count, total)}%`]), ['Unqualified', unqualified.toString(), `${pct(unqualified, total)}%`], ['Lost', lost.toString(), `${pct(lost, total)}%`]]} />
    </div>
  )
}

function HeadcountChart({ employees }: { employees: any[] }) {
  const depts = useMemo(() => {
    const map = new Map<string, { total: number; ai: number; human: number }>()
    for (const e of employees) {
      const dept = e.department?.tag ?? 'Other'
      const d = map.get(dept) ?? { total: 0, ai: 0, human: 0 }
      d.total++
      if (e.employeeType?.tag === 'AiAgent') d.ai++
      else d.human++
      map.set(dept, d)
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [employees])

  const maxCount = Math.max(1, ...depts.map(([, d]) => d.total))
  const totalAi = depts.reduce((s, [, d]) => s + d.ai, 0)
  const totalHuman = depts.reduce((s, [, d]) => s + d.human, 0)

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Headcount by Department</h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total</p>
          <p className="text-xl font-bold tabular-nums">{employees.length}</p>
        </div>
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Human</p>
          <p className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{totalHuman}</p>
        </div>
        <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Agents</p>
          <p className="text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{totalAi}</p>
        </div>
      </div>
      {depts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No employee data</p>
      ) : (
        <div className="space-y-3">
          {depts.map(([dept, d]) => (
            <div key={dept} className="flex items-center gap-3">
              <span className="text-xs font-medium w-24 shrink-0 truncate text-muted-foreground">{dept}</span>
              <div className="flex-1 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${pct(d.human, maxCount)}%` }} />
                <div className="h-full bg-purple-500 transition-all duration-700" style={{ width: `${pct(d.ai, maxCount)}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums w-8 text-right">{d.total}</span>
              {d.ai > 0 && <Badge className="text-[9px] py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/10">{d.ai} AI</Badge>}
            </div>
          ))}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-blue-500" /> Human</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-purple-500" /> AI Agent</span>
          </div>
        </div>
      )}
      <DataTable headers={['Department', 'Total', 'Human', 'AI Agents', 'AI %']} rows={depts.map(([dept, d]) => [dept, d.total.toString(), d.human.toString(), d.ai.toString(), `${pct(d.ai, d.total)}%`])} />
    </div>
  )
}

function ActivitySummaryChart({ activity }: { activity: any[] }) {
  const actionData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of activity) {
      const action = a.action?.tag ?? 'Unknown'
      map.set(action, (map.get(action) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [activity])

  const entityData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of activity) {
      const et = a.entityType ?? 'Unknown'
      map.set(et, (map.get(et) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [activity])

  const maxAction = Math.max(1, ...actionData.map(([, c]) => c))
  const actionColors = ['bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-blue-500', 'bg-orange-500']

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Activity Summary</h3>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Events</p>
          <p className="text-xl font-bold tabular-nums">{activity.length}</p>
        </div>
        <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Action Types</p>
          <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{actionData.length}</p>
        </div>
      </div>
      {actionData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No activity data</p>
      ) : (
        <div className="space-y-2.5">
          {actionData.map(([action, count], i) => (
            <div key={action} className="flex items-center gap-3">
              <span className="text-xs font-medium w-20 shrink-0 text-muted-foreground">{action}</span>
              <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className={`h-full rounded-full ${actionColors[i % actionColors.length]} transition-all duration-700`} style={{ width: `${pct(count, maxAction)}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
      <DataTable headers={['Action', 'Count', '% of Total']} rows={actionData.map(([action, count]) => [action, count.toString(), `${pct(count, activity.length)}%`])} />
      {entityData.length > 0 && (
        <>
          <h4 className="text-xs font-semibold mt-6 mb-3 text-muted-foreground">By Entity Type</h4>
          <DataTable headers={['Entity Type', 'Count']} rows={entityData.map(([et, c]) => [et, c.toString()])} />
        </>
      )}
    </div>
  )
}

function RecruitmentFunnelChart({ candidates }: { candidates: any[] }) {
  const stages = useMemo(() => {
    const order = ['Sourced', 'Contacted', 'Screening', 'Interview', 'Offer', 'Hired'] as const
    const colors = ['bg-rose-300', 'bg-rose-400', 'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-emerald-500']
    const total = candidates.length
    return order.map((s, i) => ({
      stage: s,
      count: candidates.filter(c => c.status.tag === s).length,
      color: colors[i],
      width: total > 0 ? Math.max(15, 100 - i * 14) : 15,
    }))
  }, [candidates])

  const rejected = candidates.filter(c => c.status.tag === 'Rejected').length
  const total = candidates.length
  const hireRate = total > 0 ? pct(stages[5].count, total) : 0

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Recruitment Funnel</h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Candidates</p>
          <p className="text-xl font-bold tabular-nums">{total}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hire Rate</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{hireRate}%</p>
        </div>
        <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rejected</p>
          <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{rejected}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 py-2">
        {stages.map(s => (
          <div key={s.stage} className="flex items-center gap-3 w-full" style={{ maxWidth: `${s.width}%`, margin: '0 auto' }}>
            <div className={`h-9 w-full rounded-lg ${s.color} flex items-center justify-between px-3 transition-all duration-700`}>
              <span className="text-xs font-semibold text-white">{s.stage}</span>
              <span className="text-xs font-bold text-white/90 tabular-nums">{s.count}</span>
            </div>
          </div>
        ))}
      </div>
      <DataTable headers={['Stage', 'Count', '% of Total']} rows={[...stages.map(s => [s.stage, s.count.toString(), `${pct(s.count, total)}%`]), ['Rejected', rejected.toString(), `${pct(rejected, total)}%`]]} />
    </div>
  )
}

function CustomReportChart({ report, tasks, tickets, leads, candidates, employees, activity }: { report: ReportTemplate; tasks: any[]; tickets: any[]; leads: any[]; candidates: any[]; employees: any[]; activity: any[] }) {
  const data = useMemo(() => {
    const sourceMap: Record<DataSource, any[]> = { Tasks: tasks, Tickets: tickets, Leads: leads, Candidates: candidates, Team: employees, Activity: activity }
    const items = sourceMap[report.source] ?? []
    return { total: items.length, source: report.source }
  }, [report.source, tasks, tickets, leads, candidates, employees, activity])

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">{report.name}</h3>
      <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-6 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total {data.source} Records</p>
        <p className="text-4xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{data.total}</p>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">Custom reports display summary metrics from the selected data source.</p>
    </div>
  )
}

// ── Shared data table component ──────────────────────────────────────────────

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3">Raw Data</h4>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              {headers.map(h => (
                <th key={h} className="text-left font-semibold text-muted-foreground px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 tabular-nums">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
