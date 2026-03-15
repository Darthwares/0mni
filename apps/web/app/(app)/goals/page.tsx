'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
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
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEPARTMENTS = ['All', 'Engineering', 'Sales', 'Marketing', 'Product', 'HR', 'Operations']

type ObjStatusFilter = 'all' | 'OnTrack' | 'AtRisk' | 'Behind' | 'Completed'
const STATUSES: { label: string; value: ObjStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'On Track', value: 'OnTrack' },
  { label: 'At Risk', value: 'AtRisk' },
  { label: 'Behind', value: 'Behind' },
  { label: 'Completed', value: 'Completed' },
]
const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']
const UNITS = ['%', 'count', '$', 'hours', 'score', 'NPS']

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  OnTrack: { label: 'On Track', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20', dot: 'bg-green-500' },
  AtRisk: { label: 'At Risk', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  Behind: { label: 'Behind', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  Completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getKRProgress(target: number, current: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
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

function timestampToDate(ts: any): Date {
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts / 1000)
  return new Date()
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()

  const [allObjectives] = useTable(tables.objective)
  const [allKeyResults] = useTable(tables.keyResult)
  const [employees] = useTable(tables.employee)

  const createObjective = useReducer(reducers.createObjective)
  const updateObjectiveStatus = useReducer(reducers.updateObjectiveStatus)
  const deleteObjective = useReducer(reducers.deleteObjective)
  const createKeyResult = useReducer(reducers.createKeyResult)
  const updateKrProgress = useReducer(reducers.updateKrProgress)
  const deleteKeyResult = useReducer(reducers.deleteKeyResult)

  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2026')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<ObjStatusFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<bigint>>(new Set())
  const [editingKR, setEditingKR] = useState<{ krId: bigint } | null>(null)
  const [editKRValue, setEditKRValue] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDepartment, setNewDepartment] = useState('Engineering')
  const [newQuarter, setNewQuarter] = useState('Q1 2026')
  const [newKRs, setNewKRs] = useState<{ title: string; target: string; unit: string }[]>([
    { title: '', target: '', unit: '%' },
  ])

  // Employee map
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // Org-scoped objectives
  const orgObjectives = useMemo(() => {
    if (currentOrgId === null) return []
    return allObjectives.filter(o => o.orgId === BigInt(currentOrgId))
  }, [allObjectives, currentOrgId])

  // KR map by objective
  const krsByObjective = useMemo(() => {
    const map = new Map<bigint, typeof allKeyResults>()
    allKeyResults.forEach(kr => {
      const list = map.get(kr.objectiveId) ?? []
      list.push(kr)
      map.set(kr.objectiveId, list)
    })
    return map
  }, [allKeyResults])

  // Get objective progress
  const getObjectiveProgress = useCallback((objId: bigint): number => {
    const krs = krsByObjective.get(objId) ?? []
    if (krs.length === 0) return 0
    const total = krs.reduce((sum, kr) => sum + getKRProgress(kr.targetValue, kr.currentValue), 0)
    return Math.round(total / krs.length)
  }, [krsByObjective])

  // ─── Filtering ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return orgObjectives.filter(obj => {
      if (obj.quarter !== selectedQuarter) return false
      if (departmentFilter !== 'All' && obj.department !== departmentFilter) return false
      if (statusFilter !== 'all' && obj.status?.tag !== statusFilter) return false
      return true
    })
  }, [orgObjectives, selectedQuarter, departmentFilter, statusFilter])

  // ─── Stats ─────────────────────────────────────────────────────────────

  const quarterObjectives = useMemo(
    () => orgObjectives.filter(o => o.quarter === selectedQuarter),
    [orgObjectives, selectedQuarter]
  )

  const totalObjectives = quarterObjectives.length

  const onTrackPct = useMemo(() => {
    if (totalObjectives === 0) return 0
    const onTrack = quarterObjectives.filter(o => o.status?.tag === 'OnTrack' || o.status?.tag === 'Completed').length
    return Math.round((onTrack / totalObjectives) * 100)
  }, [quarterObjectives, totalObjectives])

  const totalKRs = useMemo(
    () => quarterObjectives.reduce((sum, o) => sum + (krsByObjective.get(o.id)?.length ?? 0), 0),
    [quarterObjectives, krsByObjective]
  )

  const avgProgress = useMemo(() => {
    if (quarterObjectives.length === 0) return 0
    const total = quarterObjectives.reduce((sum, o) => sum + getObjectiveProgress(o.id), 0)
    return Math.round(total / quarterObjectives.length)
  }, [quarterObjectives, getObjectiveProgress])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: bigint) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleKREdit = useCallback((krId: bigint, currentValue: number) => {
    setEditingKR({ krId })
    setEditKRValue(String(currentValue))
  }, [])

  const handleKRSave = useCallback(async () => {
    if (!editingKR) return
    const val = parseInt(editKRValue, 10)
    if (isNaN(val) || val < 0) { setEditingKR(null); return }
    try {
      await updateKrProgress({ krId: editingKR.krId, currentValue: val })
    } catch (e) {
      console.error('Failed to update KR:', e)
    }
    setEditingKR(null)
  }, [editingKR, editKRValue, updateKrProgress])

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim() || currentOrgId === null) return
    try {
      await createObjective({
        orgId: BigInt(currentOrgId),
        title: newTitle.trim(),
        description: newDescription.trim(),
        quarter: newQuarter,
        department: newDepartment,
      })
      // Create KRs — we need the objective ID. Since SpacetimeDB is async,
      // the objective will appear in the next subscription update.
      // For now, we'll create KRs in a follow-up step from the UI.
      setShowCreateDialog(false)
      setNewTitle('')
      setNewDescription('')
      setNewKRs([{ title: '', target: '', unit: '%' }])
    } catch (e) {
      console.error('Failed to create objective:', e)
    }
  }, [newTitle, newDescription, newQuarter, newDepartment, currentOrgId, createObjective])

  const handleDeleteObjective = useCallback(async (id: bigint) => {
    try {
      await deleteObjective({ objectiveId: id })
    } catch (e) {
      console.error('Failed to delete objective:', e)
    }
  }, [deleteObjective])

  const handleStatusChange = useCallback(async (objectiveId: bigint, statusTag: string) => {
    try {
      await updateObjectiveStatus({ objectiveId, statusTag })
    } catch (e) {
      console.error('Failed to update status:', e)
    }
  }, [updateObjectiveStatus])

  const handleAddKR = useCallback(async (objectiveId: bigint, title: string, targetValue: number, unit: string) => {
    try {
      await createKeyResult({ objectiveId, title, targetValue, unit })
    } catch (e) {
      console.error('Failed to create KR:', e)
    }
  }, [createKeyResult])

  const handleDeleteKR = useCallback(async (krId: bigint) => {
    try {
      await deleteKeyResult({ krId })
    } catch (e) {
      console.error('Failed to delete KR:', e)
    }
  }, [deleteKeyResult])

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
    <div className="flex flex-col h-full">
      {/* Top header bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-amber-500 to-lime-500 flex items-center justify-center">
            <Target className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">
            <GradientText colors={['#f59e0b', '#eab308', '#84cc16']} animationSpeed={6}>
              Goals &amp; OKRs
            </GradientText>
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PresenceBar />
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-lime-500 hover:brightness-110 text-white"
          >
            <Plus className="size-3.5" />
            New Objective
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* Company Progress Ring + KPI Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Company Progress — large ring */}
            <SpotlightCard
              className="!p-6 !rounded-xl lg:col-span-1 flex flex-col items-center justify-center"
              spotlightColor="rgba(245, 158, 11, 0.12)"
            >
              <div className="relative size-28">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
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
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(245, 158, 11, 0.12)">
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

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(34, 197, 94, 0.12)">
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

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(59, 130, 246, 0.12)">
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

            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(168, 85, 247, 0.12)">
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
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              {QUARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedQuarter === q
                      ? 'bg-background text-foreground shadow-sm'
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
                      : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted ml-auto">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === s.value
                      ? 'bg-background text-foreground shadow-sm'
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Target className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No objectives found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Create your first objective to start tracking team goals and key results.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-lime-500 text-white">
                <Plus className="size-4" />
                New Objective
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map(obj => {
                const krs = krsByObjective.get(obj.id) ?? []
                const progress = getObjectiveProgress(obj.id)
                const expanded = expandedIds.has(obj.id)
                const statusTag = obj.status?.tag ?? 'OnTrack'
                const statusCfg = STATUS_CONFIG[statusTag] ?? STATUS_CONFIG.OnTrack
                const ownerEmp = employeeMap.get(obj.owner.toHexString())

                return (
                  <div key={obj.id.toString()} className="rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-sm">
                    {/* Objective header */}
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                      onClick={() => toggleExpand(obj.id)}
                    >
                      {/* Expand arrow */}
                      {expanded ? (
                        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      )}

                      {/* Progress ring */}
                      <div className="relative size-10 shrink-0">
                        <svg viewBox="0 0 40 40" className="size-full -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" stroke="currentColor" className="text-muted" />
                          <circle
                            cx="20" cy="20" r="16" fill="none" strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${(progress / 100) * 100.5} 100.5`}
                            stroke="currentColor"
                            className={progress >= 70 ? 'text-green-500' : progress >= 40 ? 'text-amber-500' : 'text-red-500'}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-bold tabular-nums">{progress}%</span>
                        </div>
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{obj.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3" />
                            {obj.department}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="size-3" />
                            {ownerEmp?.name ?? 'You'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {krs.length} KR{krs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Status change dropdown */}
                        <select
                          value={statusTag}
                          onChange={e => handleStatusChange(obj.id, e.target.value)}
                          className="h-7 px-2 rounded border bg-background text-[10px] cursor-pointer"
                        >
                          <option value="OnTrack">On Track</option>
                          <option value="AtRisk">At Risk</option>
                          <option value="Behind">Behind</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button
                          onClick={() => handleDeleteObjective(obj.id)}
                          className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Key Results */}
                    {expanded && (
                      <div className="border-t">
                        {obj.description && (
                          <div className="px-5 py-3 bg-muted/30">
                            <p className="text-xs text-muted-foreground">{obj.description}</p>
                          </div>
                        )}
                        <div className="divide-y">
                          {krs.map(kr => {
                            const krProgress = getKRProgress(kr.targetValue, kr.currentValue)
                            const isEditing = editingKR?.krId === kr.id

                            return (
                              <div key={kr.id.toString()} className="flex items-center gap-4 px-5 py-3 group hover:bg-muted/30 transition-colors">
                                {/* KR title + progress bar */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium truncate">{kr.title}</span>
                                    <span className={`text-[10px] font-bold tabular-nums ${progressTextColor(krProgress)}`}>
                                      {krProgress}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${progressColor(krProgress)}`}
                                      style={{ width: `${krProgress}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Current / Target */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={editKRValue}
                                        onChange={e => setEditKRValue(e.target.value)}
                                        className="w-16 h-6 px-1.5 rounded border bg-background text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleKRSave()
                                          if (e.key === 'Escape') setEditingKR(null)
                                        }}
                                      />
                                      <button onClick={handleKRSave} className="size-5 flex items-center justify-center rounded bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                        <Check className="size-3" />
                                      </button>
                                      <button onClick={() => setEditingKR(null)} className="size-5 flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80">
                                        <X className="size-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleKREdit(kr.id, kr.currentValue)}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground tabular-nums transition-colors"
                                      title="Click to update progress"
                                    >
                                      <span className="font-medium">{kr.currentValue}</span>
                                      <span>/</span>
                                      <span>{kr.targetValue}</span>
                                      <span className="text-[10px]">{kr.unit}</span>
                                      <Pencil className="size-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                    </button>
                                  )}
                                </div>

                                {/* Delete KR */}
                                <button
                                  onClick={() => handleDeleteKR(kr.id)}
                                  className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        {/* Add Key Result inline */}
                        <AddKRInline objectiveId={obj.id} onAdd={handleAddKR} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Objective Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-amber-500" />
              New Objective
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g., Ship v2.0 Platform Release"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="What does success look like?"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Quarter</Label>
                <select
                  value={newQuarter}
                  onChange={e => setNewQuarter(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm"
                >
                  {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Department</Label>
                <select
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm"
                >
                  {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Key Results</Label>
                <button onClick={addKRField} className="text-xs text-amber-500 hover:text-amber-400 font-medium">
                  + Add Key Result
                </button>
              </div>
              <div className="space-y-2">
                {newKRs.map((kr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={kr.title}
                      onChange={e => updateKRField(i, 'title', e.target.value)}
                      placeholder="Key result title"
                      className="flex-1 h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={kr.target}
                      onChange={e => updateKRField(i, 'target', e.target.value)}
                      placeholder="Target"
                      className="w-20 h-8 text-xs tabular-nums"
                    />
                    <select
                      value={kr.unit}
                      onChange={e => updateKRField(i, 'unit', e.target.value)}
                      className="h-8 px-2 rounded border bg-background text-xs"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {newKRs.length > 1 && (
                      <button
                        onClick={() => removeKRField(i)}
                        className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 shrink-0"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-amber-500 to-lime-500 text-white">
              Create Objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Inline Add KR Component ─────────────────────────────────────────────────

function AddKRInline({ objectiveId, onAdd }: {
  objectiveId: bigint
  onAdd: (objectiveId: bigint, title: string, targetValue: number, unit: string) => Promise<void>
}) {
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('%')

  const handleSubmit = async () => {
    if (!title.trim() || !target.trim()) return
    await onAdd(objectiveId, title.trim(), parseInt(target, 10) || 0, unit)
    setTitle('')
    setTarget('')
    setShow(false)
  }

  if (!show) {
    return (
      <div className="px-5 py-2.5 border-t">
        <button
          onClick={() => setShow(true)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Plus className="size-3" />
          Add Key Result
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-3 border-t bg-muted/20 flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Key result title"
        className="flex-1 h-7 px-2 rounded border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') setShow(false)
        }}
      />
      <input
        type="number"
        value={target}
        onChange={e => setTarget(e.target.value)}
        placeholder="Target"
        className="w-20 h-7 px-2 rounded border bg-background text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      />
      <select
        value={unit}
        onChange={e => setUnit(e.target.value)}
        className="h-7 px-2 rounded border bg-background text-xs"
      >
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <button onClick={handleSubmit} className="size-7 flex items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20">
        <Check className="size-3.5" />
      </button>
      <button onClick={() => setShow(false)} className="size-7 flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
