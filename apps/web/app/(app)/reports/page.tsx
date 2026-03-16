'use client'

import { useTable, useSpacetimeDB, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useState, useMemo, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { exportCSV } from '@/lib/csv-export'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Badge } from '@/components/ui/badge'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie,
} from 'recharts'
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

// Static Tailwind color maps — dynamic interpolation breaks JIT purging
const COLOR_CLASSES: Record<string, { bg10: string; text500: string; text600: string; dark400: string; border20: string }> = {
  indigo:  { bg10: 'bg-indigo-500/10',  text500: 'text-indigo-500',  text600: 'text-indigo-600',  dark400: 'dark:text-indigo-400',  border20: 'border-indigo-500/20' },
  amber:   { bg10: 'bg-amber-500/10',   text500: 'text-amber-500',   text600: 'text-amber-600',   dark400: 'dark:text-amber-400',   border20: 'border-amber-500/20' },
  emerald: { bg10: 'bg-emerald-500/10', text500: 'text-emerald-500', text600: 'text-emerald-600', dark400: 'dark:text-emerald-400', border20: 'border-emerald-500/20' },
  violet:  { bg10: 'bg-violet-500/10',  text500: 'text-violet-500',  text600: 'text-violet-600',  dark400: 'dark:text-violet-400',  border20: 'border-violet-500/20' },
  cyan:    { bg10: 'bg-cyan-500/10',    text500: 'text-cyan-500',    text600: 'text-cyan-600',    dark400: 'dark:text-cyan-400',    border20: 'border-cyan-500/20' },
  rose:    { bg10: 'bg-rose-500/10',    text500: 'text-rose-500',    text600: 'text-rose-600',    dark400: 'dark:text-rose-400',    border20: 'border-rose-500/20' },
}
const DEFAULT_COLOR = COLOR_CLASSES.indigo

const TEMPLATES: ReportTemplate[] = [
  { id: 'task-completion', name: 'Task Completion Rate', description: 'Completion percentage by department with status breakdown', source: 'Tasks', chartType: 'bar', icon: BarChart3, color: 'indigo', spotlightColor: 'rgba(99,102,241,0.15)' },
  { id: 'ticket-resolution', name: 'Ticket Resolution Time', description: 'Ticket stats by status with SLA and AI resolution tracking', source: 'Tickets', chartType: 'bar', icon: TicketCheck, color: 'amber', spotlightColor: 'rgba(245,158,11,0.15)' },
  { id: 'sales-funnel', name: 'Sales Pipeline Funnel', description: 'Lead progression through qualification stages', source: 'Leads', chartType: 'funnel', icon: TrendingDown, color: 'emerald', spotlightColor: 'rgba(16,185,129,0.15)' },
  { id: 'headcount', name: 'Headcount by Department', description: 'Team distribution with AI agent breakdown per department', source: 'Team', chartType: 'bar', icon: Users, color: 'violet', spotlightColor: 'rgba(139,92,246,0.15)' },
  { id: 'activity-summary', name: 'Weekly Activity Summary', description: 'Activity log entries grouped by action type', source: 'Activity', chartType: 'table', icon: Activity, color: 'cyan', spotlightColor: 'rgba(6,182,212,0.15)' },
  { id: 'recruitment-funnel', name: 'Recruitment Funnel', description: 'Candidate pipeline from sourcing through hiring', source: 'Candidates', chartType: 'funnel', icon: UserSearch, color: 'rose', spotlightColor: 'rgba(244,63,94,0.15)' },
]

// ── chart helpers ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold tabular-nums">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

const CHART_GRID = { stroke: 'rgba(120,120,120,0.1)', strokeDasharray: '3 3' }

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
  const [allSavedReports] = useTable(tables.saved_report)

  const createSavedReport = useSpacetimeReducer(reducers.createSavedReport)
  const deleteSavedReport = useSpacetimeReducer(reducers.deleteSavedReport)
  const toggleReportFavorite = useSpacetimeReducer(reducers.toggleReportFavorite)

  // DB-backed custom reports mapped to ReportTemplate shape
  const customReports = useMemo(() => {
    if (currentOrgId === null) return []
    const iconMap: Record<string, typeof BarChart3> = { Tasks: BarChart3, Tickets: TicketCheck, Leads: TrendingDown, Candidates: UserSearch, Team: Users, Activity: Activity }
    const colorMap: Record<string, string> = { Tasks: 'indigo', Tickets: 'amber', Leads: 'emerald', Candidates: 'rose', Team: 'violet', Activity: 'cyan' }
    return allSavedReports
      .filter(r => Number(r.orgId) === currentOrgId)
      .map(r => ({
        id: `saved-${r.id}`,
        dbId: r.id,
        name: r.name,
        description: r.description,
        source: r.source as DataSource,
        chartType: r.chartType as ChartType,
        icon: iconMap[r.source] ?? BarChart3,
        color: colorMap[r.source] ?? 'indigo',
        spotlightColor: 'rgba(99,102,241,0.15)',
        isFavorite: r.isFavorite,
      }))
  }, [allSavedReports, currentOrgId])

  // DB-backed favorites set (combines built-in template faves + saved report faves)
  const favorites = useMemo(() => {
    const set = new Set<string>()
    customReports.filter(r => r.isFavorite).forEach(r => set.add(r.id))
    return set
  }, [customReports])

  // ── local state ──────────────────────────────────────────────────────────
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
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

  const toggleFav = useCallback((id: string) => {
    // Only DB-saved reports support favorite toggle
    const saved = customReports.find(r => r.id === id)
    if (saved) {
      try { toggleReportFavorite({ reportId: saved.dbId }) } catch (e) { console.error(e) }
    }
  }, [customReports, toggleReportFavorite])

  const createReport = useCallback(() => {
    if (!newName.trim() || currentOrgId === null) return
    try {
      createSavedReport({
        orgId: BigInt(currentOrgId),
        name: newName.trim(),
        description: newDesc.trim() || 'Custom report',
        source: newSource,
        chartType: newChart,
      })
    } catch (e) { console.error('Failed to create report:', e) }
    setNewName(''); setNewDesc(''); setShowNewDialog(false)
  }, [newName, newDesc, newSource, newChart, currentOrgId, createSavedReport])

  const handleDeleteReport = useCallback((id: string) => {
    const saved = customReports.find(r => r.id === id)
    if (saved && confirm('Delete this report?')) {
      try { deleteSavedReport({ reportId: saved.dbId }) } catch (e) { console.error(e) }
      if (activeReport === id) setActiveReport(null)
    }
  }, [customReports, deleteSavedReport, activeReport])

  // ── date range label ─────────────────────────────────────────────────────
  const rangeLabel: Record<DateRange, string> = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year', all: 'All Time' }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORT DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (activeReport) {
    const report = allReports.find(r => r.id === activeReport)
    if (!report) { setActiveReport(null); return null }
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <PresenceBar />
        </header>
        <div className="flex-1 overflow-y-auto">
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
          <button
            onClick={() => {
              const src = report.source
              if (src === 'Tasks') {
                exportCSV('report-tasks', [
                  { header: 'Title', accessor: (t: any) => t.title },
                  { header: 'Status', accessor: (t: any) => t.status?.tag ?? '' },
                  { header: 'Priority', accessor: (t: any) => t.priority?.tag ?? '' },
                  { header: 'Assignee', accessor: (t: any) => t.assignee?.toHexString?.()?.slice(0, 8) ?? 'Unassigned' },
                  { header: 'Created', accessor: (t: any) => { try { return t.createdAt.toDate().toLocaleDateString() } catch { return '' } } },
                ], tasks)
              } else if (src === 'Tickets') {
                exportCSV('report-tickets', [
                  { header: 'Subject', accessor: (t: any) => t.subject },
                  { header: 'Status', accessor: (t: any) => t.status?.tag ?? '' },
                  { header: 'Priority', accessor: (t: any) => t.priority?.tag ?? '' },
                  { header: 'AI Resolved', accessor: (t: any) => t.aiAutoResolved ? 'Yes' : 'No' },
                  { header: 'Escalations', accessor: (t: any) => t.escalationCount ?? 0 },
                ], tickets)
              } else if (src === 'Leads') {
                exportCSV('report-leads', [
                  { header: 'Name', accessor: (l: any) => l.name },
                  { header: 'Email', accessor: (l: any) => l.email },
                  { header: 'Company', accessor: (l: any) => l.company },
                  { header: 'Status', accessor: (l: any) => l.status?.tag ?? '' },
                  { header: 'Source', accessor: (l: any) => l.source?.tag ?? '' },
                  { header: 'Score', accessor: (l: any) => l.score ?? '' },
                ], leads)
              } else if (src === 'Candidates') {
                exportCSV('report-candidates', [
                  { header: 'Name', accessor: (c: any) => c.name },
                  { header: 'Email', accessor: (c: any) => c.email },
                  { header: 'Status', accessor: (c: any) => c.status?.tag ?? '' },
                  { header: 'Position', accessor: (c: any) => c.position ?? '' },
                ], candidates)
              } else if (src === 'Team') {
                exportCSV('report-team', [
                  { header: 'Name', accessor: (e: any) => e.name },
                  { header: 'Role', accessor: (e: any) => e.role },
                  { header: 'Department', accessor: (e: any) => e.department?.tag ?? '' },
                  { header: 'Type', accessor: (e: any) => e.employeeType?.tag ?? 'Human' },
                  { header: 'Status', accessor: (e: any) => e.status?.tag ?? '' },
                ], orgEmployees)
              } else if (src === 'Activity') {
                exportCSV('report-activity', [
                  { header: 'Action', accessor: (a: any) => a.action?.tag ?? '' },
                  { header: 'Entity Type', accessor: (a: any) => a.entityType ?? '' },
                  { header: 'Entity ID', accessor: (a: any) => a.entityId ?? '' },
                  { header: 'Metadata', accessor: (a: any) => a.metadata ?? '' },
                  { header: 'Timestamp', accessor: (a: any) => { try { return a.timestamp.toDate().toLocaleString() } catch { return '' } } },
                ], activity)
              }
            }}
            className="flex items-center gap-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
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
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
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
          <BlurText text="Build and view reports from your platform data" delay={35} animateBy="words" className="text-sm text-muted-foreground mt-0.5" />
        </div>
        <PagePresenceStrip className="hidden xl:flex" />
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
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Custom</span>
          </div>
          <p className="text-2xl font-bold tabular-nums"><CountUp to={customReports.length} duration={1.5} /></p>
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
                  <div className={`flex items-center justify-center size-9 rounded-lg ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).bg10}`}>
                    <Icon className={`size-4.5 ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).text500}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate pr-6">{report.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).bg10} ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).text600} ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).dark400} ${(COLOR_CLASSES[report.color] ?? DEFAULT_COLOR).border20}`}>
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
    </div>
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
      if (t.status?.tag === 'Completed') d.completed++
      if (t.status?.tag === 'InProgress' || t.status?.tag === 'Claimed') d.inProgress++
      depts.set(dept, d)
    }
    return [...depts.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [tasks, employees])

  const chartData = deptData.map(([dept, d]) => ({
    name: dept.length > 12 ? dept.slice(0, 12) + '…' : dept,
    Completed: d.completed,
    'In Progress': d.inProgress,
    Other: d.total - d.completed - d.inProgress,
  }))

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Task Completion by Department</h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No task data available</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Other" stackId="a" fill="#d4d4d4" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-emerald-500" /> Completed</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-blue-500" /> In Progress</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-neutral-300 dark:bg-neutral-600" /> Other</span>
      </div>
      <DataTable headers={['Department', 'Total', 'Completed', 'In Progress', 'Completion %']} rows={deptData.map(([dept, d]) => [dept, d.total.toString(), d.completed.toString(), d.inProgress.toString(), `${pct(d.completed, d.total)}%`])} />
    </div>
  )
}

function TicketResolutionChart({ tickets }: { tickets: any[] }) {
  const statusData = useMemo(() => {
    const statuses = ['New', 'Open', 'Pending', 'Resolved', 'Closed'] as const
    const colors = { New: '#3b82f6', Open: '#f59e0b', Pending: '#f97316', Resolved: '#10b981', Closed: '#a3a3a3' }
    return statuses.map(s => ({
      status: s,
      count: tickets.filter(t => t.status?.tag === s).length,
      hex: colors[s],
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={statusData.map(s => ({ name: s.status, count: s.count, fill: s.hex }))} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {statusData.map((s, i) => <Cell key={i} fill={s.hex} fillOpacity={0.85} />)}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie data={statusData.filter(s => s.count > 0).map(s => ({ name: s.status, value: s.count }))}
                cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                {statusData.filter(s => s.count > 0).map((s, i) => <Cell key={i} fill={s.hex} />)}
              </Pie>
              <RechartsTooltip content={<ChartTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
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
      count: leads.filter(l => l.status?.tag === s).length,
      color: colors[i],
      width: total > 0 ? Math.max(15, 100 - i * 20) : 15,
    }))
  }, [leads])

  const lost = leads.filter(l => l.status?.tag === 'Lost').length
  const unqualified = leads.filter(l => l.status?.tag === 'Unqualified').length
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
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={depts.map(([dept, d]) => ({ name: dept.length > 10 ? dept.slice(0, 10) + '…' : dept, Human: d.human, AI: d.ai }))} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar dataKey="Human" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} fillOpacity={0.85} />
                <Bar dataKey="AI" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={24} fillOpacity={0.75} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-blue-500" /> Human</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="size-2.5 rounded-sm bg-purple-500" /> AI Agent</span>
          </div>
        </>
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
  const actionHexColors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#3b82f6', '#f97316']

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
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={actionData.map(([action, count]) => ({ name: action, count }))} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
              <CartesianGrid {...CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} width={80} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {actionData.map((_, i) => <Cell key={i} fill={actionHexColors[i % actionHexColors.length]} fillOpacity={0.8} />)}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
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
      count: candidates.filter(c => c.status?.tag === s).length,
      color: colors[i],
      width: total > 0 ? Math.max(15, 100 - i * 14) : 15,
    }))
  }, [candidates])

  const rejected = candidates.filter(c => c.status?.tag === 'Rejected').length
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
  const { bars, total, groupLabel, tableHeaders, tableRows } = useMemo(() => {
    const sourceMap: Record<DataSource, any[]> = { Tasks: tasks, Tickets: tickets, Leads: leads, Candidates: candidates, Team: employees, Activity: activity }
    const items = sourceMap[report.source] ?? []

    // Group data by a relevant dimension per source
    const counts = new Map<string, number>()
    let label = 'Category'
    switch (report.source) {
      case 'Tasks':
        label = 'Status'
        items.forEach(t => { const s = t.status?.tag ?? 'Unknown'; counts.set(s, (counts.get(s) ?? 0) + 1) })
        break
      case 'Tickets':
        label = 'Status'
        items.forEach(t => { const s = t.status?.tag ?? 'Unknown'; counts.set(s, (counts.get(s) ?? 0) + 1) })
        break
      case 'Leads':
        label = 'Stage'
        items.forEach(l => { const s = l.stage?.tag ?? l.status?.tag ?? 'Unknown'; counts.set(s, (counts.get(s) ?? 0) + 1) })
        break
      case 'Candidates':
        label = 'Stage'
        items.forEach(c => { const s = c.stage?.tag ?? 'Unknown'; counts.set(s, (counts.get(s) ?? 0) + 1) })
        break
      case 'Team':
        label = 'Department'
        items.forEach(e => { const d = e.department ?? 'Unknown'; counts.set(d, (counts.get(d) ?? 0) + 1) })
        break
      case 'Activity':
        label = 'Action'
        items.forEach(a => { const s = a.action?.tag ?? 'Unknown'; counts.set(s, (counts.get(s) ?? 0) + 1) })
        break
    }

    const barHexColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#f97316']
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const max = Math.max(...sorted.map(s => s[1]), 1)
    const totalCount = items.length

    return {
      bars: sorted.map(([name, count], i) => ({
        name,
        count,
        pct: Math.round((count / max) * 100),
        hex: barHexColors[i % barHexColors.length],
      })),
      total: totalCount,
      groupLabel: label,
      tableHeaders: [label, 'Count', '% of Total'],
      tableRows: sorted.map(([name, count]) => [name, count.toString(), `${pct(count, totalCount)}%`]),
    }
  }, [report.source, tasks, tickets, leads, candidates, employees, activity])

  const cc = COLOR_CLASSES[report.color] ?? DEFAULT_COLOR

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">{report.name}</h3>
      {/* Summary metric */}
      <div className={`rounded-lg ${cc.bg10} border p-4 mb-5 flex items-center justify-between`}>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total {report.source}</p>
          <p className={`text-3xl font-bold tabular-nums ${cc.text600} ${cc.dark400}`}>{total}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{groupLabel}s</p>
          <p className="text-lg font-semibold tabular-nums">{bars.length}</p>
        </div>
      </div>
      {/* Bar chart */}
      {bars.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={bars.map(b => ({ name: b.name.length > 14 ? b.name.slice(0, 14) + '…' : b.name, count: b.count }))} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
              <CartesianGrid {...CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} tickLine={false} axisLine={false} width={90} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name={groupLabel} radius={[0, 4, 4, 0]} maxBarSize={20}>
                {bars.map((b, i) => <Cell key={i} fill={b.hex} fillOpacity={0.85} />)}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}
      <DataTable headers={tableHeaders} rows={tableRows} />
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
