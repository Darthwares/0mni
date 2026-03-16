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
  History,
  MessageSquarePlus,
  Clock,
  Search,
  Download,
  Filter,
  Flame,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Trophy,
  Zap,
  Eye,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { exportCSV } from '@/lib/csv-export'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import ShinyText from '@/components/reactbits/ShinyText'
import BlurText from '@/components/reactbits/BlurText'

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

type TabView = 'objectives' | 'analytics'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  OnTrack: { label: 'On Track', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20', dot: 'bg-green-500' },
  AtRisk: { label: 'At Risk', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  Behind: { label: 'Behind', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  Completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
}

const DEPT_COLORS: Record<string, { gradient: string; bg: string; text: string; ring: string }> = {
  Engineering: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', ring: 'text-blue-500' },
  Sales: { gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'text-emerald-500' },
  Marketing: { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', ring: 'text-purple-500' },
  Product: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'text-amber-500' },
  HR: { gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', ring: 'text-rose-500' },
  Operations: { gradient: 'from-slate-500 to-zinc-500', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', ring: 'text-slate-500' },
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
  const [allKeyResults] = useTable(tables.key_result)
  const [allCheckIns] = useTable(tables.kr_check_in)
  const [employees] = useTable(tables.employee)

  const createObjective = useReducer(reducers.createObjective)
  const updateObjectiveStatus = useReducer(reducers.updateObjectiveStatus)
  const updateObjective = useReducer(reducers.updateObjective)
  const deleteObjective = useReducer(reducers.deleteObjective)
  const createKeyResult = useReducer(reducers.createKeyResult)
  const updateKrProgress = useReducer(reducers.updateKrProgress)
  const deleteKeyResult = useReducer(reducers.deleteKeyResult)
  const addKrCheckIn = useReducer(reducers.addKrCheckIn)
  const deleteKrCheckIn = useReducer(reducers.deleteKrCheckIn)

  const [activeTab, setActiveTab] = useState<TabView>('objectives')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2026')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<ObjStatusFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<bigint>>(new Set())
  const [editingKR, setEditingKR] = useState<{ krId: bigint } | null>(null)
  const [editKRValue, setEditKRValue] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editObj, setEditObj] = useState<{ id: bigint; title: string; description: string; quarter: string; department: string } | null>(null)

  // Check-in dialog state
  const [checkInKR, setCheckInKR] = useState<{ krId: bigint; krTitle: string; currentValue: number; targetValue: number; unit: string } | null>(null)
  const [checkInValue, setCheckInValue] = useState('')
  const [checkInNote, setCheckInNote] = useState('')
  const [expandedKRHistory, setExpandedKRHistory] = useState<Set<string>>(new Set())

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

  // Check-ins grouped by KR, sorted newest first
  const checkInsByKR = useMemo(() => {
    const map = new Map<string, typeof allCheckIns>()
    allCheckIns.forEach(ci => {
      if (ci.krId == null) return
      const key = ci.krId.toString()
      const list = map.get(key) ?? []
      list.push(ci)
      map.set(key, list)
    })
    map.forEach((list) => {
      list.sort((a, b) => {
        const ta = typeof a.createdAt === 'bigint' ? a.createdAt : BigInt(0)
        const tb = typeof b.createdAt === 'bigint' ? b.createdAt : BigInt(0)
        return tb > ta ? 1 : tb < ta ? -1 : 0
      })
    })
    return map
  }, [allCheckIns])

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
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!obj.title.toLowerCase().includes(q) && !obj.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [orgObjectives, selectedQuarter, departmentFilter, statusFilter, searchQuery])

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

  // Status distribution for visual bar
  const statusDistribution = useMemo(() => {
    const counts = { OnTrack: 0, AtRisk: 0, Behind: 0, Completed: 0 }
    quarterObjectives.forEach(o => {
      const tag = o.status?.tag ?? 'OnTrack'
      if (tag in counts) counts[tag as keyof typeof counts]++
    })
    return counts
  }, [quarterObjectives])

  // ─── Analytics Data ───────────────────────────────────────────────────

  const deptAnalytics = useMemo(() => {
    const depts = DEPARTMENTS.filter(d => d !== 'All')
    return depts.map(dept => {
      const objs = quarterObjectives.filter(o => o.department === dept)
      const count = objs.length
      if (count === 0) return { dept, count: 0, avgProgress: 0, krs: 0, completedKRs: 0, statuses: { OnTrack: 0, AtRisk: 0, Behind: 0, Completed: 0 } }
      const avgProg = Math.round(objs.reduce((s, o) => s + getObjectiveProgress(o.id), 0) / count)
      const krs = objs.reduce((s, o) => s + (krsByObjective.get(o.id)?.length ?? 0), 0)
      const completedKRs = objs.reduce((s, o) => {
        const oKrs = krsByObjective.get(o.id) ?? []
        return s + oKrs.filter(kr => getKRProgress(kr.targetValue, kr.currentValue) >= 100).length
      }, 0)
      const statuses = { OnTrack: 0, AtRisk: 0, Behind: 0, Completed: 0 }
      objs.forEach(o => {
        const tag = o.status?.tag ?? 'OnTrack'
        if (tag in statuses) statuses[tag as keyof typeof statuses]++
      })
      return { dept, count, avgProgress: avgProg, krs, completedKRs, statuses }
    }).filter(d => d.count > 0)
  }, [quarterObjectives, krsByObjective, getObjectiveProgress])

  const topPerformers = useMemo(() => {
    return [...quarterObjectives]
      .map(o => ({ ...o, progress: getObjectiveProgress(o.id) }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
  }, [quarterObjectives, getObjectiveProgress])

  const atRiskObjectives = useMemo(() => {
    return quarterObjectives
      .filter(o => o.status?.tag === 'AtRisk' || o.status?.tag === 'Behind')
      .map(o => ({ ...o, progress: getObjectiveProgress(o.id) }))
  }, [quarterObjectives, getObjectiveProgress])

  // Cross-quarter comparison
  const quarterComparison = useMemo(() => {
    return QUARTERS.map(q => {
      const objs = orgObjectives.filter(o => o.quarter === q)
      const count = objs.length
      if (count === 0) return { quarter: q, count: 0, avgProgress: 0, completedPct: 0 }
      const avg = Math.round(objs.reduce((s, o) => s + getObjectiveProgress(o.id), 0) / count)
      const completed = objs.filter(o => o.status?.tag === 'Completed').length
      return { quarter: q, count, avgProgress: avg, completedPct: count > 0 ? Math.round((completed / count) * 100) : 0 }
    })
  }, [orgObjectives, getObjectiveProgress])

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
      setShowCreateDialog(false)
      setNewTitle('')
      setNewDescription('')
      setNewKRs([{ title: '', target: '', unit: '%' }])
    } catch (e) {
      console.error('Failed to create objective:', e)
    }
  }, [newTitle, newDescription, newQuarter, newDepartment, currentOrgId, createObjective])

  const handleEditSave = useCallback(async () => {
    if (!editObj) return
    try {
      await updateObjective({
        objectiveId: editObj.id,
        title: editObj.title.trim(),
        description: editObj.description.trim(),
        quarter: editObj.quarter,
        department: editObj.department,
      })
    } catch (e) {
      console.error('Failed to update objective:', e)
    }
    setEditObj(null)
  }, [editObj, updateObjective])

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

  const openCheckInDialog = useCallback((kr: any) => {
    setCheckInKR({ krId: kr.id, krTitle: kr.title, currentValue: kr.currentValue, targetValue: kr.targetValue, unit: kr.unit })
    setCheckInValue(String(kr.currentValue))
    setCheckInNote('')
  }, [])

  const handleCheckIn = useCallback(async () => {
    if (!checkInKR) return
    const val = parseInt(checkInValue, 10)
    if (isNaN(val) || val < 0) return
    try {
      await addKrCheckIn({ krId: checkInKR.krId, progressValue: val, note: checkInNote.trim() })
    } catch (e) {
      console.error('Failed to add check-in:', e)
    }
    setCheckInKR(null)
  }, [checkInKR, checkInValue, checkInNote, addKrCheckIn])

  const handleDeleteCheckIn = useCallback(async (checkInId: bigint) => {
    try {
      await deleteKrCheckIn({ checkInId })
    } catch (e) {
      console.error('Failed to delete check-in:', e)
    }
  }, [deleteKrCheckIn])

  const toggleKRHistory = useCallback((krId: string) => {
    setExpandedKRHistory(prev => {
      const next = new Set(prev)
      if (next.has(krId)) next.delete(krId)
      else next.add(krId)
      return next
    })
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

  const openEditDialog = useCallback((obj: any) => {
    setEditObj({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      quarter: obj.quarter,
      department: obj.department,
    })
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
          <BlurText text="Set objectives and track key results" delay={35} animateBy="words" className="text-xs text-muted-foreground" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportCSV('goals-okrs.csv', [
              { header: 'Title', accessor: (o: any) => o.title },
              { header: 'Department', accessor: (o: any) => o.department },
              { header: 'Quarter', accessor: (o: any) => o.quarter },
              { header: 'Status', accessor: (o: any) => o.status?.tag ?? 'OnTrack' },
              { header: 'Progress %', accessor: (o: any) => getObjectiveProgress(o.id) },
              { header: 'Key Results', accessor: (o: any) => (krsByObjective.get(o.id)?.length ?? 0) },
              { header: 'Description', accessor: (o: any) => o.description },
            ], filtered)}
          >
            <Download className="size-3.5" />
            Export
          </Button>
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
              <ShinyText
                text="Company Progress"
                speed={4}
                color="#92400e"
                shineColor="#f59e0b"
                className="text-xs font-medium mt-3"
              />
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

          {/* Status Distribution Bar */}
          {totalObjectives > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Distribution</span>
                <span className="text-[10px] text-muted-foreground">{totalObjectives} objectives this quarter</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                {statusDistribution.Completed > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${(statusDistribution.Completed / totalObjectives) * 100}%` }}
                    title={`Completed: ${statusDistribution.Completed}`}
                  />
                )}
                {statusDistribution.OnTrack > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-700"
                    style={{ width: `${(statusDistribution.OnTrack / totalObjectives) * 100}%` }}
                    title={`On Track: ${statusDistribution.OnTrack}`}
                  />
                )}
                {statusDistribution.AtRisk > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${(statusDistribution.AtRisk / totalObjectives) * 100}%` }}
                    title={`At Risk: ${statusDistribution.AtRisk}`}
                  />
                )}
                {statusDistribution.Behind > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-700"
                    style={{ width: `${(statusDistribution.Behind / totalObjectives) * 100}%` }}
                    title={`Behind: ${statusDistribution.Behind}`}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {([
                  { label: 'Completed', count: statusDistribution.Completed, color: 'bg-emerald-500' },
                  { label: 'On Track', count: statusDistribution.OnTrack, color: 'bg-green-500' },
                  { label: 'At Risk', count: statusDistribution.AtRisk, color: 'bg-amber-500' },
                  { label: 'Behind', count: statusDistribution.Behind, color: 'bg-red-500' },
                ] as const).map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className={`size-2 rounded-full ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    <span className="text-[10px] font-bold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
            <button
              onClick={() => setActiveTab('objectives')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'objectives'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target className="size-3.5" />
              Objectives
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PieChart className="size-3.5" />
              Analytics
            </button>
          </div>

          {activeTab === 'objectives' ? (
            <>
              {/* Quarter Tabs + Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
                            {/* Edit button */}
                            <button
                              onClick={() => openEditDialog(obj)}
                              className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Edit objective"
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Status change buttons */}
                            <div className="relative group/statusdd">
                              <button className="h-7 px-2.5 rounded-md border bg-background text-[10px] font-medium flex items-center gap-1.5 hover:border-primary/30 transition-colors">
                                <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                                {statusCfg.label}
                                <ChevronDown className="size-3 text-muted-foreground" />
                              </button>
                              <div className="absolute top-full right-0 mt-1 z-50 hidden group-hover/statusdd:block">
                                <div className="bg-popover border rounded-lg shadow-lg p-1 min-w-[120px]">
                                  {(['OnTrack', 'AtRisk', 'Behind', 'Completed'] as const).map(s => {
                                    const sc = STATUS_CONFIG[s]
                                    return (
                                      <button
                                        key={s}
                                        onClick={() => handleStatusChange(obj.id, s)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors ${statusTag === s ? 'bg-muted' : ''}`}
                                      >
                                        <span className={`size-2 rounded-full ${sc.dot}`} />
                                        <span>{sc.label}</span>
                                        {statusTag === s && <Check className="size-3 ml-auto text-primary" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteObjective(obj.id)}
                              className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar below header */}
                        <div className="px-5 pb-3 -mt-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${progressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            />
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
                                const krCheckIns = checkInsByKR.get(kr.id.toString()) ?? []
                                const historyOpen = expandedKRHistory.has(kr.id.toString())

                                return (
                                  <div key={kr.id.toString()}>
                                    <div className="flex items-center gap-4 px-5 py-3 group hover:bg-muted/30 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-medium truncate">{kr.title}</span>
                                          <span className={`text-[10px] font-bold tabular-nums ${progressTextColor(krProgress)}`}>
                                            {krProgress}%
                                          </span>
                                          {krCheckIns.length >= 2 && (
                                            <svg className="w-12 h-4 shrink-0" viewBox={`0 0 ${Math.max(krCheckIns.length - 1, 1) * 10} 16`}>
                                              <polyline
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-amber-500"
                                                points={[...krCheckIns].reverse().slice(-8).map((ci, i) => {
                                                  const pct = kr.targetValue > 0 ? ci.progressValue / kr.targetValue : 0
                                                  const y = 14 - Math.min(pct, 1) * 12
                                                  return `${i * 10},${y}`
                                                }).join(' ')}
                                              />
                                            </svg>
                                          )}
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${progressColor(krProgress)}`}
                                            style={{ width: `${krProgress}%` }}
                                          />
                                        </div>
                                      </div>

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
                                            title="Click to quick-edit progress"
                                          >
                                            <span className="font-medium">{kr.currentValue}</span>
                                            <span>/</span>
                                            <span>{kr.targetValue}</span>
                                            <span className="text-[10px]">{kr.unit}</span>
                                            <Pencil className="size-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                          </button>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => openCheckInDialog(kr)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors shrink-0"
                                        title="Log a check-in with notes"
                                      >
                                        <MessageSquarePlus className="size-3" />
                                        Check-in
                                      </button>

                                      {krCheckIns.length > 0 && (
                                        <button
                                          onClick={() => toggleKRHistory(kr.id.toString())}
                                          className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] tabular-nums transition-colors shrink-0 ${
                                            historyOpen
                                              ? 'text-foreground bg-muted'
                                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                          }`}
                                          title="View check-in history"
                                        >
                                          <History className="size-3" />
                                          {krCheckIns.length}
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleDeleteKR(kr.id)}
                                        className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>

                                    {historyOpen && krCheckIns.length > 0 && (
                                      <div className="px-5 pb-3 ml-4 border-l-2 border-amber-500/20">
                                        <div className="flex flex-col gap-2 pt-1">
                                          {krCheckIns.slice(0, 10).map(ci => {
                                            const ciDate = timestampToDate(ci.createdAt)
                                            const ciPct = kr.targetValue > 0 ? Math.round((ci.progressValue / kr.targetValue) * 100) : 0
                                            const authorEmp = employeeMap.get(ci.createdBy.toHexString())
                                            return (
                                              <div key={ci.id.toString()} className="flex items-start gap-3 group/ci">
                                                <div className="relative mt-1.5">
                                                  <div className={`size-2 rounded-full ${progressColor(ciPct)}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold tabular-nums ${progressTextColor(ciPct)}`}>
                                                      {ci.progressValue}/{kr.targetValue} {kr.unit} ({ciPct}%)
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                      <Clock className="size-2.5" />
                                                      {formatDate(ciDate)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                      {authorEmp?.name ?? 'You'}
                                                    </span>
                                                    <button
                                                      onClick={() => handleDeleteCheckIn(ci.id)}
                                                      className="size-4 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 opacity-0 group-hover/ci:opacity-100 transition-opacity"
                                                    >
                                                      <Trash2 className="size-2.5" />
                                                    </button>
                                                  </div>
                                                  {ci.note && (
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{ci.note}</p>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
                                          {krCheckIns.length > 10 && (
                                            <span className="text-[10px] text-muted-foreground ml-5">
                                              +{krCheckIns.length - 10} older check-ins
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            <AddKRInline objectiveId={obj.id} onAdd={handleAddKR} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            /* ─── Analytics Tab ─────────────────────────────────────────── */
            <div className="flex flex-col gap-6">
              {/* Quarter selector for analytics */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
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

              {/* Department Performance Grid */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Layers className="size-4 text-amber-500" />
                  Department Performance
                </h3>
                {deptAnalytics.length === 0 ? (
                  <div className="rounded-xl border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">No objectives this quarter. Create some to see analytics.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptAnalytics.map(da => {
                      const dc = DEPT_COLORS[da.dept] ?? DEPT_COLORS.Operations
                      return (
                        <SpotlightCard key={da.dept} className="!p-5 !rounded-xl" spotlightColor="rgba(245, 158, 11, 0.08)">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`size-9 rounded-lg bg-gradient-to-br ${dc.gradient} flex items-center justify-center`}>
                              <Building2 className="size-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">{da.dept}</h4>
                              <p className="text-[10px] text-muted-foreground">{da.count} objective{da.count !== 1 ? 's' : ''} · {da.krs} KRs</p>
                            </div>
                          </div>

                          {/* Progress ring */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="relative size-16 shrink-0">
                              <svg viewBox="0 0 64 64" className="size-full -rotate-90">
                                <circle cx="32" cy="32" r="26" fill="none" strokeWidth="5" stroke="currentColor" className="text-muted" />
                                <circle
                                  cx="32" cy="32" r="26" fill="none" strokeWidth="5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${(da.avgProgress / 100) * 163.4} 163.4`}
                                  stroke="currentColor"
                                  className={dc.ring}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold tabular-nums">{da.avgProgress}%</span>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">KR Completion</span>
                                <span className="font-bold tabular-nums">{da.completedKRs}/{da.krs}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${dc.gradient} transition-all duration-700`}
                                  style={{ width: `${da.krs > 0 ? (da.completedKRs / da.krs) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Status breakdown mini bar */}
                          <div className="flex items-center gap-2">
                            {Object.entries(da.statuses).filter(([, v]) => v > 0).map(([status, count]) => {
                              const sc = STATUS_CONFIG[status]
                              return (
                                <span key={status} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${sc?.bg ?? ''} ${sc?.text ?? ''}`}>
                                  <span className={`size-1 rounded-full ${sc?.dot ?? ''}`} />
                                  {count}
                                </span>
                              )
                            })}
                          </div>
                        </SpotlightCard>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quarter Comparison */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-500" />
                  Quarter Comparison
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {quarterComparison.map(qc => {
                    const isSelected = qc.quarter === selectedQuarter
                    return (
                      <button
                        key={qc.quarter}
                        onClick={() => setSelectedQuarter(qc.quarter)}
                        className={`rounded-xl p-4 border transition-all text-left ${
                          isSelected
                            ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-2">{qc.quarter}</div>
                        {qc.count === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No objectives</p>
                        ) : (
                          <>
                            <div className="flex items-end gap-2 mb-2">
                              <span className="text-2xl font-bold tabular-nums">{qc.avgProgress}</span>
                              <span className="text-[10px] text-muted-foreground mb-1">% avg</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${progressColor(qc.avgProgress)}`}
                                style={{ width: `${qc.avgProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{qc.count} obj{qc.count !== 1 ? 's' : ''}</span>
                              <span className={progressTextColor(qc.completedPct)}>{qc.completedPct}% done</span>
                            </div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Two-column: Top Performers + At Risk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Performers */}
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" />
                    Top Performing Objectives
                  </h3>
                  {topPerformers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No objectives this quarter</p>
                  ) : (
                    <div className="space-y-3">
                      {topPerformers.map((obj, i) => (
                        <div key={obj.id.toString()} className="flex items-center gap-3">
                          <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                            i === 1 ? 'bg-slate-300/20 text-slate-600 dark:text-slate-400' :
                            i === 2 ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{obj.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{obj.department}</span>
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${progressColor(obj.progress)}`}
                                  style={{ width: `${obj.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${progressTextColor(obj.progress)}`}>
                            {obj.progress}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* At Risk */}
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Flame className="size-4 text-red-500" />
                    Needs Attention
                    {atRiskObjectives.length > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                        {atRiskObjectives.length}
                      </Badge>
                    )}
                  </h3>
                  {atRiskObjectives.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                        <Check className="size-5 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">All objectives are on track!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atRiskObjectives.map(obj => {
                        const statusTag = obj.status?.tag ?? 'AtRisk'
                        const sc = STATUS_CONFIG[statusTag] ?? STATUS_CONFIG.AtRisk
                        return (
                          <div key={obj.id.toString()} className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${sc.bg} ${sc.text} ${sc.border} border shrink-0`}>
                              <span className={`size-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{obj.title}</p>
                              <span className="text-[10px] text-muted-foreground">{obj.department}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${progressColor(obj.progress)}`}
                                  style={{ width: `${obj.progress}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-bold tabular-nums ${progressTextColor(obj.progress)}`}>
                                {obj.progress}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* KR Health Summary */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" />
                  Key Results Health
                </h3>
                {(() => {
                  const allQKRs = quarterObjectives.flatMap(o => krsByObjective.get(o.id) ?? [])
                  if (allQKRs.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">No key results this quarter</p>
                  const completed = allQKRs.filter(kr => getKRProgress(kr.targetValue, kr.currentValue) >= 100).length
                  const onTrack = allQKRs.filter(kr => { const p = getKRProgress(kr.targetValue, kr.currentValue); return p >= 40 && p < 100 }).length
                  const behind = allQKRs.filter(kr => getKRProgress(kr.targetValue, kr.currentValue) < 40).length
                  const totalKRProgress = Math.round(allQKRs.reduce((s, kr) => s + getKRProgress(kr.targetValue, kr.currentValue), 0) / allQKRs.length)

                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums">{allQKRs.length}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Total KRs</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{completed}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mt-1">Completed</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{onTrack}</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider mt-1">In Progress</p>
                      </div>
                      <div className="rounded-lg bg-red-500/10 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{behind}</p>
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wider mt-1">Behind</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Check-in Dialog */}
      <Dialog open={!!checkInKR} onOpenChange={v => { if (!v) setCheckInKR(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="size-5 text-amber-500" />
              Log Check-in
            </DialogTitle>
          </DialogHeader>
          {checkInKR && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">{checkInKR.krTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current: {checkInKR.currentValue} / {checkInKR.targetValue} {checkInKR.unit}
                  {' '}({getKRProgress(checkInKR.targetValue, checkInKR.currentValue)}%)
                </p>
              </div>
              <div>
                <Label className="text-sm">New Progress Value</Label>
                <Input
                  type="number"
                  value={checkInValue}
                  onChange={e => setCheckInValue(e.target.value)}
                  placeholder={`0 – ${checkInKR.targetValue}`}
                  className="mt-1 tabular-nums"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && checkInNote.trim()) handleCheckIn() }}
                />
                {checkInValue && !isNaN(parseInt(checkInValue, 10)) && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressColor(getKRProgress(checkInKR.targetValue, parseInt(checkInValue, 10)))}`}
                      style={{ width: `${getKRProgress(checkInKR.targetValue, parseInt(checkInValue, 10))}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm">Note (optional)</Label>
                <Textarea
                  value={checkInNote}
                  onChange={e => setCheckInNote(e.target.value)}
                  placeholder="What changed? Any blockers?"
                  className="mt-1 min-h-[80px] text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInKR(null)}>Cancel</Button>
            <Button onClick={handleCheckIn} className="bg-gradient-to-r from-amber-500 to-lime-500 text-white gap-1.5">
              <Check className="size-3.5" />
              Log Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Objective Dialog */}
      <Dialog open={!!editObj} onOpenChange={v => { if (!v) setEditObj(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-amber-500" />
              Edit Objective
            </DialogTitle>
          </DialogHeader>
          {editObj && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm">Title</Label>
                <Input
                  value={editObj.title}
                  onChange={e => setEditObj({ ...editObj, title: e.target.value })}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={editObj.description}
                  onChange={e => setEditObj({ ...editObj, description: e.target.value })}
                  className="mt-1 min-h-[80px] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Quarter</Label>
                  <select
                    value={editObj.quarter}
                    onChange={e => setEditObj({ ...editObj, quarter: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Department</Label>
                  <select
                    value={editObj.department}
                    onChange={e => setEditObj({ ...editObj, department: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditObj(null)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-gradient-to-r from-amber-500 to-lime-500 text-white gap-1.5">
              <Check className="size-3.5" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <p className="text-[10px] text-muted-foreground mb-2">
                You can also add key results after creating the objective using the inline &quot;+ Add Key Result&quot; button.
              </p>
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
