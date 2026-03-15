'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Target,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Pencil,
  Building2,
  User,
  Trash2,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Types ───────────────────────────────────────────────────────────────────

type KeyResult = {
  id: string
  title: string
  target: number
  current: number
  unit: string
  owner: string
}

type ObjectiveStatus = 'onTrack' | 'atRisk' | 'behind' | 'completed'

type Objective = {
  id: string
  title: string
  description: string
  quarter: string
  status: ObjectiveStatus
  owner: string
  department: string
  keyResults: KeyResult[]
  createdAt: Date
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEPARTMENTS = ['All', 'Engineering', 'Sales', 'Marketing', 'Product', 'HR', 'Operations']
const STATUSES: { label: string; value: ObjectiveStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'On Track', value: 'onTrack' },
  { label: 'At Risk', value: 'atRisk' },
  { label: 'Behind', value: 'behind' },
  { label: 'Completed', value: 'completed' },
]
const QUARTERS = ['Q1 2026', 'Q2 2026']
const UNITS = ['%', 'count', '$', 'hours', 'score', 'NPS']

const STATUS_CONFIG: Record<ObjectiveStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  onTrack: { label: 'On Track', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20', dot: 'bg-green-500' },
  atRisk: { label: 'At Risk', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  behind: { label: 'Behind', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function getKRProgress(kr: KeyResult): number {
  if (kr.target === 0) return 0
  return Math.min(100, Math.round((kr.current / kr.target) * 100))
}

function getObjectiveProgress(obj: Objective): number {
  if (obj.keyResults.length === 0) return 0
  const total = obj.keyResults.reduce((sum, kr) => sum + getKRProgress(kr), 0)
  return Math.round(total / obj.keyResults.length)
}

function progressColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function progressTextColor(pct: number): string {
  if (pct >= 70) return 'text-green-600 dark:text-green-400'
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

function createSampleObjectives(): Objective[] {
  return [
    {
      id: generateId(),
      title: 'Ship v2.0 Platform Release',
      description: 'Deliver the next major platform version with real-time collaboration, new API, and performance improvements.',
      quarter: 'Q1 2026',
      status: 'onTrack',
      owner: 'Sarah Chen',
      department: 'Engineering',
      keyResults: [
        { id: generateId(), title: 'Complete all v2.0 feature milestones', target: 12, current: 9, unit: 'count', owner: 'Sarah Chen' },
        { id: generateId(), title: 'Reduce API latency p95', target: 200, current: 165, unit: 'ms', owner: 'James Park' },
        { id: generateId(), title: 'Achieve test coverage', target: 90, current: 78, unit: '%', owner: 'Maria Gonzalez' },
      ],
      createdAt: new Date(2026, 0, 6),
    },
    {
      id: generateId(),
      title: 'Grow ARR to $5M',
      description: 'Accelerate revenue growth through enterprise deals, expansion revenue, and reduced churn.',
      quarter: 'Q1 2026',
      status: 'atRisk',
      owner: 'Michael Torres',
      department: 'Sales',
      keyResults: [
        { id: generateId(), title: 'Close enterprise deals', target: 15, current: 8, unit: 'count', owner: 'Michael Torres' },
        { id: generateId(), title: 'Achieve net revenue retention', target: 120, current: 108, unit: '%', owner: 'Lisa Wang' },
        { id: generateId(), title: 'Reduce monthly churn rate to', target: 2, current: 3.1, unit: '%', owner: 'David Kim' },
      ],
      createdAt: new Date(2026, 0, 6),
    },
    {
      id: generateId(),
      title: 'Launch Brand Awareness Campaign',
      description: 'Establish market presence through content marketing, events, and strategic partnerships.',
      quarter: 'Q1 2026',
      status: 'onTrack',
      owner: 'Emily Rodriguez',
      department: 'Marketing',
      keyResults: [
        { id: generateId(), title: 'Increase organic traffic', target: 50000, current: 41000, unit: 'count', owner: 'Emily Rodriguez' },
        { id: generateId(), title: 'Generate marketing qualified leads', target: 500, current: 385, unit: 'count', owner: 'Alex Johnson' },
        { id: generateId(), title: 'Achieve social media engagement rate', target: 5, current: 4.2, unit: '%', owner: 'Sam Patel' },
      ],
      createdAt: new Date(2026, 0, 8),
    },
    {
      id: generateId(),
      title: 'Improve Product-Market Fit Score',
      description: 'Deepen user research, iterate on core workflows, and raise the PMF survey score above 40%.',
      quarter: 'Q1 2026',
      status: 'behind',
      owner: 'Rachel Lee',
      department: 'Product',
      keyResults: [
        { id: generateId(), title: 'Conduct user research interviews', target: 40, current: 12, unit: 'count', owner: 'Rachel Lee' },
        { id: generateId(), title: 'Reach PMF survey "very disappointed" score', target: 45, current: 31, unit: '%', owner: 'Nathan Brooks' },
        { id: generateId(), title: 'Ship workflow improvements', target: 8, current: 3, unit: 'count', owner: 'Rachel Lee' },
      ],
      createdAt: new Date(2026, 0, 10),
    },
    {
      id: generateId(),
      title: 'Build World-Class Employee Experience',
      description: 'Improve retention, engagement scores, and career development frameworks across the company.',
      quarter: 'Q1 2026',
      status: 'completed',
      owner: 'Patricia Nguyen',
      department: 'HR',
      keyResults: [
        { id: generateId(), title: 'Achieve employee engagement score', target: 85, current: 87, unit: 'score', owner: 'Patricia Nguyen' },
        { id: generateId(), title: 'Complete career ladder framework rollout', target: 100, current: 100, unit: '%', owner: 'Tom Harris' },
        { id: generateId(), title: 'Reduce voluntary attrition to', target: 10, current: 9.2, unit: '%', owner: 'Patricia Nguyen' },
      ],
      createdAt: new Date(2026, 0, 6),
    },
    {
      id: generateId(),
      title: 'Streamline Operations & Cut Costs',
      description: 'Automate manual processes, renegotiate vendor contracts, and improve operational efficiency metrics.',
      quarter: 'Q2 2026',
      status: 'onTrack',
      owner: 'Chris Anderson',
      department: 'Operations',
      keyResults: [
        { id: generateId(), title: 'Automate manual workflows', target: 20, current: 7, unit: 'count', owner: 'Chris Anderson' },
        { id: generateId(), title: 'Reduce operational cost per unit', target: 15, current: 6, unit: '%', owner: 'Karen White' },
      ],
      createdAt: new Date(2026, 3, 1),
    },
  ]
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [objectives, setObjectives] = useState<Objective[]>(() => createSampleObjectives())
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2026')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<ObjectiveStatus | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingKR, setEditingKR] = useState<{ objId: string; krId: string } | null>(null)
  const [editKRValue, setEditKRValue] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newDepartment, setNewDepartment] = useState('Engineering')
  const [newQuarter, setNewQuarter] = useState('Q1 2026')
  const [newKRs, setNewKRs] = useState<{ title: string; target: string; unit: string }[]>([
    { title: '', target: '', unit: '%' },
  ])

  // ─── Filtering ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return objectives.filter(obj => {
      if (obj.quarter !== selectedQuarter) return false
      if (departmentFilter !== 'All' && obj.department !== departmentFilter) return false
      if (statusFilter !== 'all' && obj.status !== statusFilter) return false
      return true
    })
  }, [objectives, selectedQuarter, departmentFilter, statusFilter])

  // ─── Stats ─────────────────────────────────────────────────────────────

  const quarterObjectives = useMemo(
    () => objectives.filter(o => o.quarter === selectedQuarter),
    [objectives, selectedQuarter]
  )

  const totalObjectives = quarterObjectives.length

  const onTrackPct = useMemo(() => {
    if (totalObjectives === 0) return 0
    const onTrack = quarterObjectives.filter(o => o.status === 'onTrack' || o.status === 'completed').length
    return Math.round((onTrack / totalObjectives) * 100)
  }, [quarterObjectives, totalObjectives])

  const totalKRs = useMemo(
    () => quarterObjectives.reduce((sum, o) => sum + o.keyResults.length, 0),
    [quarterObjectives]
  )

  const avgProgress = useMemo(() => {
    if (quarterObjectives.length === 0) return 0
    const total = quarterObjectives.reduce((sum, o) => sum + getObjectiveProgress(o), 0)
    return Math.round(total / quarterObjectives.length)
  }, [quarterObjectives])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleKREdit = useCallback((objId: string, krId: string, currentValue: number) => {
    setEditingKR({ objId, krId })
    setEditKRValue(String(currentValue))
  }, [])

  const handleKRSave = useCallback(() => {
    if (!editingKR) return
    const val = parseFloat(editKRValue)
    if (isNaN(val) || val < 0) { setEditingKR(null); return }
    setObjectives(prev =>
      prev.map(obj => {
        if (obj.id !== editingKR.objId) return obj
        return {
          ...obj,
          keyResults: obj.keyResults.map(kr =>
            kr.id === editingKR.krId ? { ...kr, current: val } : kr
          ),
        }
      })
    )
    setEditingKR(null)
  }, [editingKR, editKRValue])

  const handleCreate = useCallback(() => {
    if (!newTitle.trim() || !newOwner.trim()) return
    const krs: KeyResult[] = newKRs
      .filter(kr => kr.title.trim() && kr.target.trim())
      .map(kr => ({
        id: generateId(),
        title: kr.title,
        target: parseFloat(kr.target) || 0,
        current: 0,
        unit: kr.unit,
        owner: newOwner,
      }))
    const obj: Objective = {
      id: generateId(),
      title: newTitle,
      description: newDescription,
      quarter: newQuarter,
      status: 'onTrack',
      owner: newOwner,
      department: newDepartment,
      keyResults: krs,
      createdAt: new Date(),
    }
    setObjectives(prev => [obj, ...prev])
    setShowCreateDialog(false)
    setNewTitle('')
    setNewDescription('')
    setNewOwner('')
    setNewKRs([{ title: '', target: '', unit: '%' }])
  }, [newTitle, newDescription, newOwner, newDepartment, newQuarter, newKRs])

  const handleDeleteObjective = useCallback((id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id))
  }, [])

  const addKRField = useCallback(() => {
    setNewKRs(prev => [...prev, { title: '', target: '', unit: '%' }])
  }, [])

  const updateKRField = useCallback((index: number, field: string, value: string) => {
    setNewKRs(prev => prev.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr)))
  }, [])

  const removeKRField = useCallback((index: number) => {
    setNewKRs(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-amber-500 to-lime-500 shadow-lg shadow-amber-500/20">
            <Target className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText
                colors={['#f59e0b', '#eab308', '#84cc16']}
                animationSpeed={6}
              >
                Goals &amp; OKRs
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set objectives, track key results, and align your team
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-lime-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:brightness-110"
        >
          <Plus className="size-4" />
          New Objective
        </button>
      </div>

      {/* Company Progress Ring + KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Company Progress — large ring */}
        <SpotlightCard
          className="!p-6 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80 lg:col-span-1 flex flex-col items-center justify-center"
          spotlightColor="rgba(245, 158, 11, 0.12)"
        >
          <div className="relative size-28">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-100 dark:text-neutral-800" />
              <circle
                cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(avgProgress / 100) * 326.7} 326.7`}
                className={avgProgress >= 70 ? 'text-green-500' : avgProgress >= 40 ? 'text-amber-500' : 'text-red-500'}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">
                <CountUp to={avgProgress} from={0} duration={1.5} />
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">% avg</span>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground mt-3">Company Progress</span>
        </SpotlightCard>

        {/* Stat cards */}
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.12)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500">
              <Target className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Objectives</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp to={totalObjectives} from={0} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(34, 197, 94, 0.12)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <TrendingUp className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">On Track</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            <CountUp to={onTrackPct} from={0} duration={1.5} />
            <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.12)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <BarChart3 className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Key Results</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <CountUp to={totalKRs} from={0} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.12)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
              <Award className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Progress</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            <CountUp to={avgProgress} from={0} duration={1.5} />
            <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </SpotlightCard>
      </div>

      {/* Quarter Tabs + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Quarter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {QUARTERS.map(q => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedQuarter === q
                  ? 'bg-white dark:bg-neutral-700 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Department filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {DEPARTMENTS.map(d => (
            <button
              key={d}
              onClick={() => setDepartmentFilter(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                departmentFilter === d
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-transparent text-muted-foreground border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 ml-auto">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-white dark:bg-neutral-700 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Objectives List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
            <Target className="size-6 opacity-40" />
          </div>
          <p className="font-medium">No objectives found</p>
          <p className="text-sm mt-1">Try changing your filters or create a new objective.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(obj => {
            const progress = getObjectiveProgress(obj)
            const isExpanded = expandedIds.has(obj.id)
            const statusCfg = STATUS_CONFIG[obj.status]

            return (
              <div
                key={obj.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 overflow-hidden transition-shadow hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50"
              >
                {/* Objective header */}
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer select-none"
                  onClick={() => toggleExpand(obj.id)}
                >
                  <button className="mt-0.5 shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold">{obj.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        <Building2 className="size-3" />
                        {obj.department}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{obj.description}</p>

                    {/* Owner + Progress bar */}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <User className="size-3" />
                        {obj.owner}
                      </span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${progressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold tabular-nums min-w-[40px] text-right ${progressTextColor(progress)}`}>
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteObjective(obj.id) }}
                    className="shrink-0 size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    style={{ opacity: undefined }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Key Results (expanded) */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800">
                    <div className="px-5 py-3 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="size-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Key Results ({obj.keyResults.length})
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {obj.keyResults.map(kr => {
                          const krPct = getKRProgress(kr)
                          const isEditingThis = editingKR?.objId === obj.id && editingKR?.krId === kr.id

                          return (
                            <div
                              key={kr.id}
                              className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-sm font-medium truncate">{kr.title}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                      <User className="size-3 inline -mt-0.5 mr-0.5" />
                                      {kr.owner}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${progressColor(krPct)}`}
                                      style={{ width: `${krPct}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isEditingThis ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={editKRValue}
                                          onChange={e => setEditKRValue(e.target.value)}
                                          className="w-16 h-6 px-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleKRSave()
                                            if (e.key === 'Escape') setEditingKR(null)
                                          }}
                                        />
                                        <button
                                          onClick={handleKRSave}
                                          className="size-5 flex items-center justify-center rounded bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                                        >
                                          <Check className="size-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingKR(null)}
                                          className="size-5 flex items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleKREdit(obj.id, kr.id, kr.current) }}
                                        className="flex items-center gap-1 text-xs tabular-nums hover:bg-neutral-100 dark:hover:bg-neutral-800 px-1.5 py-0.5 rounded transition-colors group/kr"
                                        title="Click to update progress"
                                      >
                                        <span className={`font-semibold ${progressTextColor(krPct)}`}>{kr.current}</span>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-muted-foreground">{kr.target}</span>
                                        <span className="text-muted-foreground">{kr.unit}</span>
                                        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover/kr:opacity-100 transition-opacity ml-0.5" />
                                      </button>
                                    )}
                                    <span className={`text-xs font-semibold tabular-nums min-w-[32px] text-right ${progressTextColor(krPct)}`}>
                                      {krPct}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Objective Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-semibold">Create Objective</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Increase customer retention"
                  className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="What does success look like?"
                  rows={2}
                  className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                />
              </div>

              {/* Row: Quarter + Department */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Quarter</label>
                  <select
                    value={newQuarter}
                    onChange={e => setNewQuarter(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Department</label>
                  <select
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Owner */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Owner</label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={e => setNewOwner(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Key Results */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Key Results</label>
                  <button
                    onClick={addKRField}
                    className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  >
                    <Plus className="size-3" />
                    Add KR
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {newKRs.map((kr, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={kr.title}
                        onChange={e => updateKRField(i, 'title', e.target.value)}
                        placeholder="Key result title"
                        className="flex-1 h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                      <input
                        type="number"
                        value={kr.target}
                        onChange={e => updateKRField(i, 'target', e.target.value)}
                        placeholder="Target"
                        className="w-20 h-8 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-right tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                      <select
                        value={kr.unit}
                        onChange={e => updateKRField(i, 'unit', e.target.value)}
                        className="w-20 h-8 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {newKRs.length > 1 && (
                        <button
                          onClick={() => removeKRField(i)}
                          className="size-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newOwner.trim()}
                className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-lime-500 text-white text-sm font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Objective
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
