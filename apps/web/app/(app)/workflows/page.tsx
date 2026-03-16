'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { useTable, useReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar, PagePresenceStrip } from '@/components/presence-bar'
import ShinyText from '@/components/reactbits/ShinyText'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
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
import { exportCSV } from '@/lib/csv-export'
import {
  Zap, Play, Pause, GitBranch, Clock, Sparkles, Plus, ArrowLeft,
  Trash2, Activity, CheckCircle2, LayoutGrid, ChevronDown, Copy, ArrowRight,
  Search, Download, Filter, GripVertical, ZoomIn, ZoomOut, Maximize2,
  History, X, MousePointer2, Undo2,
} from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'aiAgent'
type WorkflowNode = { id: string; type: NodeType; label: string; description: string; config: Record<string, any>; position: { x: number; y: number } }
type WorkflowConnection = { from: string; to: string }
type StatusTag = 'Active' | 'Paused' | 'Draft' | 'Error'

type LocalWorkflow = {
  dbId: number
  name: string
  description: string
  status: StatusTag
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  runsTotal: number
  runsSuccess: number
  lastRun: number
  createdAt: number
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getTag(enumVal: unknown): string {
  if (!enumVal || typeof enumVal !== 'object') return ''
  return (enumVal as { tag?: string }).tag ?? ''
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback } catch { return fallback }
}

function timeAgo(ms: number): string {
  if (ms <= 0) return ''
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function tsToMs(ts: unknown): number {
  if (typeof ts === 'bigint') return Number(ts) / 1000
  if (typeof ts === 'number') return ts > 1e15 ? ts / 1000 : ts
  if (ts && typeof ts === 'object') {
    const obj = ts as Record<string, unknown>
    const raw = obj.__timestamp_micros_since_unix_epoch__ ?? obj.microsSinceEpoch ?? 0
    return Number(raw) / 1000
  }
  return 0
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

// ── node styling ─────────────────────────────────────────────────────────────

const nodeTypeConfig: Record<NodeType, { icon: typeof Zap; color: string; border: string; bg: string; gradient: string; label: string }> = {
  trigger:   { icon: Zap,      color: 'text-blue-600 dark:text-blue-400',    border: 'border-l-blue-500',    bg: 'bg-blue-500/10',    gradient: 'from-blue-500 to-sky-500',       label: 'Trigger' },
  action:    { icon: Play,     color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500 to-green-500', label: 'Action' },
  condition: { icon: GitBranch, color: 'text-amber-600 dark:text-amber-400',   border: 'border-l-amber-500',   bg: 'bg-amber-500/10',   gradient: 'from-amber-500 to-yellow-500',  label: 'Condition' },
  delay:     { icon: Clock,    color: 'text-purple-600 dark:text-purple-400',  border: 'border-l-purple-500',  bg: 'bg-purple-500/10',  gradient: 'from-purple-500 to-fuchsia-500', label: 'Delay' },
  aiAgent:   { icon: Sparkles, color: 'text-violet-600 dark:text-violet-400',  border: 'border-l-violet-500',  bg: 'bg-violet-500/10',  gradient: 'from-violet-500 to-indigo-500',  label: 'AI Agent' },
}

const statusStyles: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Draft:  'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  Error:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

// ── templates ────────────────────────────────────────────────────────────────

const templateWorkflows = [
  {
    name: 'New Ticket → AI Triage → Assign',
    description: 'Automatically triage incoming support tickets with AI and assign to the right team member',
    nodes: [
      { id: 't1', type: 'trigger' as NodeType, label: 'New Ticket Created', description: 'Fires when a ticket is submitted', config: { event: 'ticket.created' }, position: { x: 60, y: 120 } },
      { id: 't2', type: 'aiAgent' as NodeType, label: 'AI Triage', description: 'Classify priority & category', config: { model: 'claude-sonnet-4.6', prompt: 'Analyze and classify the ticket.' }, position: { x: 340, y: 120 } },
      { id: 't3', type: 'condition' as NodeType, label: 'Is Critical?', description: 'Check if priority is critical', config: { field: 'priority', operator: 'equals', value: 'critical' }, position: { x: 620, y: 120 } },
      { id: 't4', type: 'action' as NodeType, label: 'Assign to Senior', description: 'Route to senior team', config: { action: 'assign', team: 'senior-support' }, position: { x: 900, y: 60 } },
      { id: 't5', type: 'action' as NodeType, label: 'Assign to Queue', description: 'Standard queue', config: { action: 'assign', team: 'support-queue' }, position: { x: 900, y: 200 } },
    ],
    connections: [{ from: 't1', to: 't2' }, { from: 't2', to: 't3' }, { from: 't3', to: 't4' }, { from: 't3', to: 't5' }],
  },
  {
    name: 'New Lead → AI Qualify → Notify Sales',
    description: 'Score and qualify inbound leads with AI, then notify the appropriate sales rep',
    nodes: [
      { id: 'l1', type: 'trigger' as NodeType, label: 'New Lead Captured', description: 'Form submission', config: { event: 'lead.created' }, position: { x: 60, y: 140 } },
      { id: 'l2', type: 'aiAgent' as NodeType, label: 'AI Lead Scoring', description: 'Score lead 0-100', config: { model: 'claude-sonnet-4.6', prompt: 'Score this lead.' }, position: { x: 340, y: 140 } },
      { id: 'l3', type: 'condition' as NodeType, label: 'Score > 70?', description: 'High-quality check', config: { field: 'score', operator: 'greater_than', value: 70 }, position: { x: 620, y: 140 } },
      { id: 'l4', type: 'action' as NodeType, label: 'Notify Sales Rep', description: 'Slack notification', config: { action: 'notify', channel: '#sales-hot-leads' }, position: { x: 900, y: 80 } },
      { id: 'l5', type: 'delay' as NodeType, label: 'Wait 2 Days', description: 'Nurture delay', config: { duration: 172800000 }, position: { x: 900, y: 220 } },
    ],
    connections: [{ from: 'l1', to: 'l2' }, { from: 'l2', to: 'l3' }, { from: 'l3', to: 'l4' }, { from: 'l3', to: 'l5' }],
  },
  {
    name: 'Daily Standup → AI Summary → Post',
    description: 'Collect standup updates, generate an AI summary, and post to the team channel',
    nodes: [
      { id: 's1', type: 'trigger' as NodeType, label: 'Daily at 9:30 AM', description: 'Scheduled', config: { schedule: '30 9 * * 1-5' }, position: { x: 60, y: 140 } },
      { id: 's2', type: 'action' as NodeType, label: 'Collect Standups', description: 'Gather entries', config: { action: 'collect', source: 'standup-entries' }, position: { x: 340, y: 140 } },
      { id: 's3', type: 'aiAgent' as NodeType, label: 'AI Summarizer', description: 'Generate summary', config: { model: 'claude-haiku-4.5', prompt: 'Summarize team standup updates.' }, position: { x: 620, y: 140 } },
      { id: 's4', type: 'action' as NodeType, label: 'Post to #team', description: 'Post summary', config: { action: 'post', channel: '#team-updates' }, position: { x: 900, y: 140 } },
    ],
    connections: [{ from: 's1', to: 's2' }, { from: 's2', to: 's3' }, { from: 's3', to: 's4' }],
  },
]

let nodeIdCounter = 100

// ── main page ─────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { currentOrgId } = useOrg()

  const allWorkflows = useTable(tables.workflow)
  const createWorkflow = useReducer(reducers.createWorkflow)
  const updateWorkflow = useReducer(reducers.updateWorkflow)
  const updateWorkflowStatus = useReducer(reducers.updateWorkflowStatus)
  const deleteWorkflow = useReducer(reducers.deleteWorkflow)
  const duplicateWorkflow = useReducer(reducers.duplicateWorkflow)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<{ name: string; description: string; nodes: WorkflowNode[]; connections: WorkflowConnection[] } | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilterWf, setStatusFilterWf] = useState<'all' | StatusTag>('all')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 40, y: 20 })
  const [drawingConn, setDrawingConn] = useState<{ fromId: string; toPos: { x: number; y: number } } | null>(null)
  const [selectedConnIdx, setSelectedConnIdx] = useState<number | null>(null)
  const [showMinimap, setShowMinimap] = useState(true)

  // Drag state for node repositioning
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

  // Parse DB workflows into local format
  const workflows: LocalWorkflow[] = useMemo(() => {
    if (currentOrgId === null) return []
    return allWorkflows
      .filter(w => w.orgId === BigInt(currentOrgId))
      .map(w => ({
        dbId: Number(w.id),
        name: w.name,
        description: w.description,
        status: getTag(w.status) as StatusTag || 'Draft',
        nodes: parseJson<WorkflowNode[]>(w.nodesJson, []),
        connections: parseJson<WorkflowConnection[]>(w.connectionsJson, []),
        runsTotal: Number(w.runsTotal),
        runsSuccess: Number(w.runsSuccess),
        lastRun: tsToMs(w.lastRun),
        createdAt: tsToMs(w.createdAt),
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [allWorkflows, currentOrgId])

  const stats = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter(w => w.status === 'Active').length,
    totalRuns: workflows.reduce((s, w) => s + w.runsTotal, 0),
    successRate: pct(
      workflows.reduce((s, w) => s + w.runsSuccess, 0),
      workflows.reduce((s, w) => s + w.runsTotal, 0)
    ),
  }), [workflows])

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    let list = workflows
    if (statusFilterWf !== 'all') list = list.filter(w => w.status === statusFilterWf)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.nodes.some(n => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
      )
    }
    return list
  }, [workflows, statusFilterWf, searchQuery])

  // Status counts for filter
  const statusCountsWf = useMemo(() => {
    const c: Record<string, number> = { Active: 0, Paused: 0, Draft: 0, Error: 0 }
    for (const w of workflows) c[w.status] = (c[w.status] ?? 0) + 1
    return c
  }, [workflows])

  // ── Chart Data ──
  const WF_STATUS_COLORS: Record<string, string> = { Active: '#10b981', Paused: '#f59e0b', Draft: '#737373', Error: '#ef4444' }

  const statusPieData = useMemo(() => {
    return Object.entries(statusCountsWf).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v, fill: WF_STATUS_COLORS[k] ?? '#737373' }))
  }, [statusCountsWf])

  const topWorkflowsByRuns = useMemo(() => {
    return [...workflows]
      .filter(w => w.runsTotal > 0)
      .sort((a, b) => b.runsTotal - a.runsTotal)
      .slice(0, 5)
      .map(w => ({ name: w.name.length > 14 ? w.name.slice(0, 14) + '…' : w.name, runs: w.runsTotal, successRate: pct(w.runsSuccess, w.runsTotal) }))
  }, [workflows])

  const nodeTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    workflows.forEach(w => w.nodes.forEach(n => { counts[n.type] = (counts[n.type] ?? 0) + 1 }))
    const COLORS: Record<string, string> = { trigger: '#06b6d4', action: '#3b82f6', condition: '#f59e0b', delay: '#a855f7', aiAgent: '#ec4899' }
    return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v, fill: COLORS[k] ?? '#737373' }))
  }, [workflows])

  const handleExportWorkflows = useCallback(() => {
    exportCSV('workflows', [
      { header: 'Name', accessor: (w: LocalWorkflow) => w.name },
      { header: 'Description', accessor: (w: LocalWorkflow) => w.description },
      { header: 'Status', accessor: (w: LocalWorkflow) => w.status },
      { header: 'Nodes', accessor: (w: LocalWorkflow) => w.nodes.length },
      { header: 'Connections', accessor: (w: LocalWorkflow) => w.connections.length },
      { header: 'Total Runs', accessor: (w: LocalWorkflow) => w.runsTotal },
      { header: 'Success Rate', accessor: (w: LocalWorkflow) => `${pct(w.runsSuccess, w.runsTotal)}%` },
      { header: 'Last Run', accessor: (w: LocalWorkflow) => w.lastRun > 0 ? new Date(w.lastRun).toISOString() : '' },
    ], filteredWorkflows)
  }, [filteredWorkflows])

  const editingWorkflow = editingId !== null ? workflows.find(w => w.dbId === editingId) : null

  // Merge edit state with DB workflow for display
  const currentNodes = editState?.nodes ?? editingWorkflow?.nodes ?? []
  const currentConnections = editState?.connections ?? editingWorkflow?.connections ?? []
  const currentName = editState?.name ?? editingWorkflow?.name ?? ''
  const currentDescription = editState?.description ?? editingWorkflow?.description ?? ''

  // ── actions ─────────────────────────────────────────────────────────────

  const openEditor = useCallback((wf: LocalWorkflow) => {
    setEditingId(wf.dbId)
    setEditState({ name: wf.name, description: wf.description, nodes: [...wf.nodes], connections: [...wf.connections] })
    setSelectedNodeId(null)
  }, [])

  const saveAndClose = useCallback(() => {
    if (editingId !== null && editState) {
      updateWorkflow({
        workflowId: BigInt(editingId),
        name: editState.name,
        description: editState.description,
        nodesJson: JSON.stringify(editState.nodes),
        connectionsJson: JSON.stringify(editState.connections),
      })
    }
    setEditingId(null)
    setEditState(null)
    setSelectedNodeId(null)
  }, [editingId, editState, updateWorkflow])

  const toggleStatus = useCallback((dbId: number, currentStatus: StatusTag) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active'
    updateWorkflowStatus({ workflowId: BigInt(dbId), statusTag: newStatus })
  }, [updateWorkflowStatus])

  const createBlankWorkflow = useCallback(() => {
    if (currentOrgId === null) return
    createWorkflow({
      orgId: BigInt(currentOrgId),
      name: 'Untitled Workflow',
      description: '',
      nodesJson: '[]',
      connectionsJson: '[]',
    })
  }, [currentOrgId, createWorkflow])

  const createFromTemplate = useCallback((tpl: typeof templateWorkflows[0]) => {
    if (currentOrgId === null) return
    const idMap = new Map<string, string>()
    const now = Date.now()
    const nodes = tpl.nodes.map((n, i) => {
      const newId = `n-${now}-${i}`
      idMap.set(n.id, newId)
      return { ...n, id: newId }
    })
    const connections = tpl.connections.map(c => ({
      from: idMap.get(c.from) || c.from,
      to: idMap.get(c.to) || c.to,
    }))
    createWorkflow({
      orgId: BigInt(currentOrgId),
      name: tpl.name,
      description: tpl.description,
      nodesJson: JSON.stringify(nodes),
      connectionsJson: JSON.stringify(connections),
    })
    setShowTemplates(false)
  }, [currentOrgId, createWorkflow])

  // ── editor node actions ────────────────────────────────────────────────

  const addNode = useCallback((type: NodeType) => {
    if (!editState) return
    nodeIdCounter++
    const id = `node-${nodeIdCounter}`
    const maxX = editState.nodes.reduce((mx, n) => Math.max(mx, n.position.x), -200)
    const newNode: WorkflowNode = {
      id, type, label: nodeTypeConfig[type].label, description: '',
      config: type === 'aiAgent' ? { model: 'claude-sonnet-4.6', prompt: '', outputVar: 'result' } : {},
      position: { x: maxX + 280, y: 140 },
    }
    const lastNode = editState.nodes[editState.nodes.length - 1]
    const newConn = lastNode ? [{ from: lastNode.id, to: id }] : []
    setEditState({ ...editState, nodes: [...editState.nodes, newNode], connections: [...editState.connections, ...newConn] })
    setSelectedNodeId(id)
  }, [editState])

  const updateNode = useCallback((nodeId: string, patch: Partial<WorkflowNode>) => {
    if (!editState) return
    setEditState({ ...editState, nodes: editState.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n) })
  }, [editState])

  const deleteNode = useCallback((nodeId: string) => {
    if (!editState) return
    setEditState({
      ...editState,
      nodes: editState.nodes.filter(n => n.id !== nodeId),
      connections: editState.connections.filter(c => c.from !== nodeId && c.to !== nodeId),
    })
    setSelectedNodeId(null)
  }, [editState])

  const handleDuplicateWorkflow = useCallback((dbId: number) => {
    duplicateWorkflow({ workflowId: BigInt(dbId) })
  }, [duplicateWorkflow])

  const handleDeleteWorkflow = useCallback((dbId: number) => {
    deleteWorkflow({ workflowId: BigInt(dbId) })
    setDeleteConfirmId(null)
  }, [deleteWorkflow])

  // Drag handlers for node repositioning in the editor
  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (!editState) return
    const node = editState.nodes.find(n => n.id === nodeId)
    if (!node) return
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY, origX: node.position.x, origY: node.position.y }

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = (ev.clientX - dragRef.current.startX) / zoom
      const dy = (ev.clientY - dragRef.current.startY) / zoom
      const newX = Math.max(0, dragRef.current.origX + dx)
      const newY = Math.max(0, dragRef.current.origY + dy)
      setEditState(prev => {
        if (!prev) return prev
        return { ...prev, nodes: prev.nodes.map(n => n.id === dragRef.current!.nodeId ? { ...n, position: { x: newX, y: newY } } : n) }
      })
    }

    const onMouseUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [editState])

  const selectedNode = currentNodes.find(n => n.id === selectedNodeId) ?? null

  // ── zoom / pan / connection drawing ────────────────────────────────────

  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom(prev => {
      const next = Math.min(2.5, Math.max(0.2, prev + delta))
      const scale = next / prev
      setPanOffset(p => ({
        x: mouseX - (mouseX - p.x) * scale,
        y: mouseY - (mouseY - p.y) * scale,
      }))
      return next
    })
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el || editingId === null) return
    el.addEventListener('wheel', handleCanvasWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleCanvasWheel)
  }, [handleCanvasWheel, editingId])

  const handleCanvasPanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-node]') || target.closest('[data-port]') || target.closest('button')) return
    e.preventDefault()
    panStartRef.current = { x: e.clientX, y: e.clientY, offsetX: panOffset.x, offsetY: panOffset.y }
    const onMove = (ev: MouseEvent) => {
      setPanOffset({
        x: panStartRef.current.offsetX + (ev.clientX - panStartRef.current.x),
        y: panStartRef.current.offsetY + (ev.clientY - panStartRef.current.y),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [panOffset])

  const fitToView = useCallback(() => {
    if (!editState || editState.nodes.length === 0 || !canvasRef.current) return
    const ns = editState.nodes
    const minX = Math.min(...ns.map(n => n.position.x))
    const minY = Math.min(...ns.map(n => n.position.y))
    const maxX = Math.max(...ns.map(n => n.position.x)) + 240
    const maxY = Math.max(...ns.map(n => n.position.y)) + 120
    const { width, height } = canvasRef.current.getBoundingClientRect()
    const padded = 80
    const scaleX = (width - padded) / (maxX - minX || 1)
    const scaleY = (height - padded) / (maxY - minY || 1)
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5)
    setZoom(newZoom)
    setPanOffset({
      x: (width / 2) - ((minX + maxX) / 2) * newZoom,
      y: (height / 2) - ((minY + maxY) / 2) * newZoom,
    })
  }, [editState])

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnIdx === null || !editState) return
    setEditState({
      ...editState,
      connections: editState.connections.filter((_, i) => i !== selectedConnIdx),
    })
    setSelectedConnIdx(null)
  }, [selectedConnIdx, editState])

  const onOutputPortDrag = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const toCanvas = (cx: number, cy: number) => ({
      x: (cx - rect.left - panOffset.x) / zoom,
      y: (cy - rect.top - panOffset.y) / zoom,
    })
    setDrawingConn({ fromId: nodeId, toPos: toCanvas(e.clientX, e.clientY) })

    const onMove = (ev: MouseEvent) => {
      setDrawingConn(prev => prev ? { ...prev, toPos: toCanvas(ev.clientX, ev.clientY) } : null)
    }
    const onUp = (ev: MouseEvent) => {
      setDrawingConn(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement
      const inputPort = target?.closest('[data-input-port]')
      if (inputPort) {
        const targetId = inputPort.getAttribute('data-input-port')
        if (targetId && targetId !== nodeId) {
          setEditState(prev => {
            if (!prev) return prev
            if (prev.connections.some(c => c.from === nodeId && c.to === targetId)) return prev
            return { ...prev, connections: [...prev.connections, { from: nodeId, to: targetId }] }
          })
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [zoom, panOffset])

  // Keyboard shortcuts for editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId === null) return
      const active = document.activeElement?.tagName
      if (active === 'INPUT' || active === 'TEXTAREA' || active === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnIdx !== null) deleteSelectedConnection()
        else if (selectedNodeId) deleteNode(selectedNodeId)
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        setSelectedConnIdx(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, selectedNodeId, selectedConnIdx, deleteNode, deleteSelectedConnection])

  // ── editor view ─────────────────────────────────────────────────────────

  if (editingId !== null && editState) {
    const wfStatus = editingWorkflow?.status ?? 'Draft'
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={saveAndClose} className="gap-1.5"><ArrowLeft className="size-4" />Back</Button>
            <Separator orientation="vertical" className="h-6" />
            <Input
              className="text-base font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              value={editState.name}
              onChange={e => setEditState({ ...editState, name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-[9px]">Del</kbd> delete
              <kbd className="px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-[9px]">Esc</kbd> deselect
              <kbd className="px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-[9px]">Scroll</kbd> zoom
            </span>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Badge className={`${statusStyles[wfStatus] || statusStyles.Draft} border text-xs`}>{wfStatus}</Badge>
            <Button size="sm" variant="outline" onClick={() => toggleStatus(editingId, wfStatus)} disabled={wfStatus === 'Draft' || wfStatus === 'Error'}>
              {wfStatus === 'Active' ? <Pause className="size-3.5 mr-1.5" /> : <Play className="size-3.5 mr-1.5" />}
              {wfStatus === 'Active' ? 'Pause' : 'Activate'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <span className="text-xs font-medium text-muted-foreground mr-1">Add:</span>
          {(Object.keys(nodeTypeConfig) as NodeType[]).map(type => {
            const cfg = nodeTypeConfig[type]
            const Icon = cfg.icon
            return (
              <Button key={type} variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => addNode(type)}>
                <div className={`flex items-center justify-center size-4 rounded bg-gradient-to-br ${cfg.gradient}`}><Icon className="size-2.5 text-white" /></div>
                {cfg.label}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_1px_1px,_rgb(0_0_0_/_0.06)_1px,_transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,_rgb(255_255_255_/_0.04)_1px,_transparent_0)] bg-[length:24px_24px]"
            onMouseDown={handleCanvasPanStart}
            onClick={() => { setSelectedNodeId(null); setSelectedConnIdx(null) }}
          >
            <style>{`
              @keyframes flowDash { to { stroke-dashoffset: -20; } }
              .conn-flow { animation: flowDash 0.8s linear infinite; }
              @keyframes flowPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
              .conn-pulse { animation: flowPulse 2s ease-in-out infinite; }
            `}</style>
            <div
              className="absolute origin-top-left will-change-transform"
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }}
            >
              <svg className="absolute pointer-events-none" style={{ width: 8000, height: 4000, left: -500, top: -500 }}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" className="fill-neutral-400 dark:fill-neutral-500" /></marker>
                  <marker id="arrowhead-sel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" className="fill-blue-500" /></marker>
                  <linearGradient id="conn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(163 163 163)" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="rgb(163 163 163)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="rgb(163 163 163)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {currentConnections.map((conn, i) => {
                  const fromNode = currentNodes.find(n => n.id === conn.from)
                  const toNode = currentNodes.find(n => n.id === conn.to)
                  if (!fromNode || !toNode) return null
                  const x1 = fromNode.position.x + 236, y1 = fromNode.position.y + 44
                  const x2 = toNode.position.x - 6, y2 = toNode.position.y + 44
                  const cx1 = x1 + Math.abs(x2 - x1) * 0.4, cx2 = x2 - Math.abs(x2 - x1) * 0.4
                  const d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
                  const isSel = selectedConnIdx === i
                  return (
                    <g key={`conn-${i}`}>
                      <path d={d} fill="none" stroke="transparent" strokeWidth={16} className="pointer-events-auto cursor-pointer"
                        onClick={e => { e.stopPropagation(); setSelectedConnIdx(isSel ? null : i); setSelectedNodeId(null) }} />
                      <path d={d} fill="none"
                        className={isSel ? 'stroke-blue-500' : 'stroke-neutral-300 dark:stroke-neutral-600'}
                        strokeWidth={isSel ? 2.5 : 1.5}
                        strokeDasharray={fromNode.type === 'condition' ? '6 3' : 'none'}
                        markerEnd={isSel ? 'url(#arrowhead-sel)' : 'url(#arrowhead)'} />
                      {!isSel && (
                        <path d={d} fill="none" className="stroke-neutral-400/40 dark:stroke-neutral-500/40 conn-flow"
                          strokeWidth={1.5} strokeDasharray="4 16" strokeLinecap="round" />
                      )}
                    </g>
                  )
                })}
                {drawingConn && (() => {
                  const fromNode = currentNodes.find(n => n.id === drawingConn.fromId)
                  if (!fromNode) return null
                  const x1 = fromNode.position.x + 236, y1 = fromNode.position.y + 44
                  const x2 = drawingConn.toPos.x, y2 = drawingConn.toPos.y
                  const cx1 = x1 + Math.abs(x2 - x1) * 0.4, cx2 = x2 - Math.abs(x2 - x1) * 0.4
                  return <path d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                    fill="none" className="stroke-blue-400 conn-pulse" strokeWidth={2} strokeDasharray="6 4" />
                })()}
              </svg>

              {currentNodes.map(node => {
                const cfg = nodeTypeConfig[node.type]
                const Icon = cfg.icon
                const isSelected = node.id === selectedNodeId
                return (
                  <div key={node.id} data-node className={`absolute group/node transition-all duration-150 ${isSelected ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}`}
                    style={{ left: node.position.x, top: node.position.y, width: 230 }}
                    onClick={e => { e.stopPropagation(); setSelectedNodeId(node.id); setSelectedConnIdx(null) }}>
                    <div data-input-port={node.id}
                      className="absolute -left-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 opacity-0 group-hover/node:opacity-100 transition-opacity cursor-crosshair z-20 flex items-center justify-center hover:border-blue-500 hover:scale-125">
                      <div className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                    </div>
                    <div data-port
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 opacity-0 group-hover/node:opacity-100 transition-opacity cursor-crosshair z-20 flex items-center justify-center hover:border-emerald-500 hover:scale-125"
                      onMouseDown={e => onOutputPortDrag(e, node.id)}>
                      <div className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                    </div>
                    <div className={`rounded-xl border-l-4 ${cfg.border} border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500/50 shadow-lg' : ''} transition-shadow duration-150`}>
                      <div className="p-3.5">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div
                            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            onMouseDown={e => onNodeMouseDown(e, node.id)}
                            title="Drag to reposition"
                          >
                            <GripVertical className="size-4" />
                          </div>
                          <div className={`flex items-center justify-center size-7 rounded-lg bg-gradient-to-br ${cfg.gradient} shadow-sm`}><Icon className="size-3.5 text-white" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{node.label}</p>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
                          </div>
                        </div>
                        {node.description && <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">{node.description}</p>}
                        {node.type === 'aiAgent' && node.config.model && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                              <Sparkles className="size-2.5 mr-0.5" />{node.config.model}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {currentNodes.length === 0 && (
                <div style={{ position: 'absolute', left: 200, top: 100, width: 300 }}>
                  <div className="text-center">
                    <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3"><Plus className="size-6 text-neutral-400" /></div>
                    <p className="text-sm font-medium text-muted-foreground">Add a trigger to get started</p>
                    <p className="text-xs text-muted-foreground mt-1">Use the toolbar above to add nodes</p>
                  </div>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 flex items-center gap-0.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 rounded-lg p-1 shadow-sm z-20">
              <button className="flex items-center justify-center size-7 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}><ZoomOut className="size-3.5" /></button>
              <span className="text-[11px] font-medium text-muted-foreground w-10 text-center tabular-nums select-none">{Math.round(zoom * 100)}%</span>
              <button className="flex items-center justify-center size-7 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}><ZoomIn className="size-3.5" /></button>
              <Separator orientation="vertical" className="h-4 mx-0.5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center size-7 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    onClick={fitToView}><Maximize2 className="size-3.5" /></button>
                </TooltipTrigger>
                <TooltipContent side="top">Fit to view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={`flex items-center justify-center size-7 rounded-md transition-colors ${showMinimap ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    onClick={() => setShowMinimap(m => !m)}><MousePointer2 className="size-3.5" /></button>
                </TooltipTrigger>
                <TooltipContent side="top">Toggle minimap</TooltipContent>
              </Tooltip>
            </div>

            {/* Selected connection hint */}
            {selectedConnIdx !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full z-20 backdrop-blur-sm">
                <span>Connection selected</span>
                <Separator orientation="vertical" className="h-3" />
                <button className="hover:text-red-500 transition-colors" onClick={deleteSelectedConnection}>Press Delete to remove</button>
              </div>
            )}

            {/* Minimap */}
            {showMinimap && currentNodes.length > 0 && (() => {
              const mmW = 160, mmH = 100
              const ns = currentNodes
              const minX = Math.min(...ns.map(n => n.position.x)) - 20
              const minY = Math.min(...ns.map(n => n.position.y)) - 20
              const maxX = Math.max(...ns.map(n => n.position.x)) + 260
              const maxY = Math.max(...ns.map(n => n.position.y)) + 140
              const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
              const scale = Math.min(mmW / rangeX, mmH / rangeY)
              return (
                <div className="absolute bottom-4 right-4 z-20 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-sm overflow-hidden" style={{ width: mmW, height: mmH }}>
                  <svg width={mmW} height={mmH}>
                    {currentConnections.map((conn, i) => {
                      const from = ns.find(n => n.id === conn.from)
                      const to = ns.find(n => n.id === conn.to)
                      if (!from || !to) return null
                      return <line key={`mm-${i}`}
                        x1={(from.position.x + 115 - minX) * scale} y1={(from.position.y + 44 - minY) * scale}
                        x2={(to.position.x + 115 - minX) * scale} y2={(to.position.y + 44 - minY) * scale}
                        className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth={1} />
                    })}
                    {ns.map(node => {
                      const cfg = nodeTypeConfig[node.type]
                      return <rect key={`mm-${node.id}`}
                        x={(node.position.x - minX) * scale} y={(node.position.y - minY) * scale}
                        width={230 * scale} height={80 * scale} rx={3}
                        className={`${node.id === selectedNodeId ? 'fill-blue-400/60' : 'fill-neutral-400/40 dark:fill-neutral-500/40'} stroke-neutral-400/60`}
                        strokeWidth={0.5} />
                    })}
                  </svg>
                </div>
              )
            })()}
          </div>

          {selectedNode && (
            <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center size-7 rounded-lg bg-gradient-to-br ${nodeTypeConfig[selectedNode.type].gradient}`}>
                      {(() => { const I = nodeTypeConfig[selectedNode.type].icon; return <I className="size-3.5 text-white" /> })()}
                    </div>
                    <span className="text-sm font-semibold">{nodeTypeConfig[selectedNode.type].label} Config</span>
                  </div>
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => deleteNode(selectedNode.id)}><Trash2 className="size-3.5" /></Button>
                </div>
                <div className="space-y-4">
                  <div><Label className="text-xs font-medium mb-1.5 block">Label</Label><Input value={selectedNode.label} onChange={e => updateNode(selectedNode.id, { label: e.target.value })} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs font-medium mb-1.5 block">Description</Label><Textarea value={selectedNode.description} onChange={e => updateNode(selectedNode.id, { description: e.target.value })} className="text-sm min-h-[60px] resize-none" rows={2} /></div>
                  <Separator />
                  {selectedNode.type === 'trigger' && (<div><Label className="text-xs font-medium mb-1.5 block">Event Type</Label><Input value={selectedNode.config.event || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, event: e.target.value } })} placeholder="e.g. ticket.created" className="h-8 text-sm" /><p className="text-[11px] text-muted-foreground mt-1">The event that triggers this workflow</p></div>)}
                  {selectedNode.type === 'action' && (<><div><Label className="text-xs font-medium mb-1.5 block">Action Type</Label><Input value={selectedNode.config.action || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, action: e.target.value } })} placeholder="e.g. send_email, assign" className="h-8 text-sm" /></div><div><Label className="text-xs font-medium mb-1.5 block">Target</Label><Input value={selectedNode.config.team || selectedNode.config.channel || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, target: e.target.value } })} placeholder="e.g. #channel, team-name" className="h-8 text-sm" /></div></>)}
                  {selectedNode.type === 'condition' && (<><div><Label className="text-xs font-medium mb-1.5 block">Field</Label><Input value={selectedNode.config.field || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, field: e.target.value } })} placeholder="e.g. priority" className="h-8 text-sm" /></div><div><Label className="text-xs font-medium mb-1.5 block">Operator</Label><Input value={selectedNode.config.operator || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, operator: e.target.value } })} placeholder="e.g. equals" className="h-8 text-sm" /></div><div><Label className="text-xs font-medium mb-1.5 block">Value</Label><Input value={selectedNode.config.value ?? ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, value: e.target.value } })} placeholder="Comparison value" className="h-8 text-sm" /></div></>)}
                  {selectedNode.type === 'delay' && (<div><Label className="text-xs font-medium mb-1.5 block">Duration (ms)</Label><Input type="number" value={selectedNode.config.duration || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, duration: parseInt(e.target.value) || 0 } })} className="h-8 text-sm" /><p className="text-[11px] text-muted-foreground mt-1">{selectedNode.config.duration ? `${Math.round(selectedNode.config.duration / 3600000)}h ${Math.round((selectedNode.config.duration % 3600000) / 60000)}m` : 'Set delay duration'}</p></div>)}
                  {selectedNode.type === 'aiAgent' && (<><div><Label className="text-xs font-medium mb-1.5 block">AI Model</Label><select className="w-full h-8 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2" value={selectedNode.config.model || 'claude-sonnet-4.6'} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, model: e.target.value } })}><option value="claude-opus-4.6">Claude Opus 4.6</option><option value="claude-sonnet-4.6">Claude Sonnet 4.6</option><option value="claude-haiku-4.5">Claude Haiku 4.5</option></select></div><div><Label className="text-xs font-medium mb-1.5 block">Prompt</Label><Textarea value={selectedNode.config.prompt || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, prompt: e.target.value } })} placeholder="Describe what the AI agent should do..." className="text-sm min-h-[100px] resize-none" rows={4} /></div><div><Label className="text-xs font-medium mb-1.5 block">Output Variable</Label><Input value={selectedNode.config.outputVar || ''} onChange={e => updateNode(selectedNode.id, { config: { ...selectedNode.config, outputVar: e.target.value } })} placeholder="e.g. result" className="h-8 text-sm" /></div></>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── list view ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Zap className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <GradientText colors={['#06b6d4', '#0ea5e9', '#3b82f6']} animationSpeed={6}>Workflows</GradientText>
          </h1>
        </div>
        <PresenceBar />
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <BlurText
            text="AI-powered automation engine — build triggers, actions, and intelligent pipelines"
            delay={30}
            animateBy="words"
            className="text-sm text-muted-foreground"
          />
          <PagePresenceStrip className="hidden xl:flex" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleExportWorkflows}>
              <Download className="size-3.5" />Export
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTemplates(!showTemplates)}>
                <Copy className="size-3.5" />Use Template<ChevronDown className="size-3" />
              </Button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl">
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Templates</p>
                    {templateWorkflows.map((tpl, i) => (
                      <button key={i} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" onClick={() => createFromTemplate(tpl)}>
                        <p className="text-sm font-medium">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700" onClick={createBlankWorkflow}>
              <Plus className="size-3.5" />New Workflow
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(6, 182, 212, 0.15)">
            <div className="flex items-center gap-2 mb-2"><div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600"><LayoutGrid className="size-3.5 text-white" /></div><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Workflows</span></div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={stats.total} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="flex items-center gap-2 mb-2"><div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600"><Play className="size-3.5 text-white" /></div><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active</span></div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"><CountUp to={stats.active} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(14, 165, 233, 0.15)">
            <div className="flex items-center gap-2 mb-2"><div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600"><Activity className="size-3.5 text-white" /></div><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Runs</span></div>
            <p className="text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400"><CountUp to={stats.totalRuns} duration={1.5} separator="," /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2"><div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"><CheckCircle2 className="size-3.5 text-white" /></div><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Success Rate</span></div>
            <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400"><CountUp to={stats.successRate} duration={1.5} /><span className="text-base font-medium text-muted-foreground ml-0.5">%</span></p>
          </SpotlightCard>
        </div>

        {/* ── Recharts Insight Grid ── */}
        {workflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Donut */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Workflow Status</h3>
              <ResponsiveContainer width="100%" height={160}>
                <RechartsPie>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                    {statusPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {statusPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ background: d.fill }} />
                    <span className="text-[10px] text-muted-foreground">{d.name}</span>
                    <span className="text-[10px] font-bold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Workflows by Runs */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Most Executed</h3>
              {topWorkflowsByRuns.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={topWorkflowsByRuns} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={62} />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="runs" radius={[0, 6, 6, 0]} barSize={14} fill="url(#wfRunsGrad)" />
                    <defs>
                      <linearGradient id="wfRunsGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">No runs recorded yet</div>
              )}
            </div>

            {/* Node Type Donut */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Node Types</h3>
              {nodeTypeDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <RechartsPie>
                      <Pie data={nodeTypeDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                        {nodeTypeDistribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {nodeTypeDistribution.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full" style={{ background: d.fill }} />
                        <span className="text-[10px] text-muted-foreground">{d.name}</span>
                        <span className="text-[10px] font-bold tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">No nodes yet</div>
              )}
            </div>
          </div>
        )}

        {/* Search + Status filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              placeholder="Search workflows, nodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            {([['all', 'All'] as const, ['Active', 'Active'] as const, ['Paused', 'Paused'] as const, ['Draft', 'Draft'] as const, ['Error', 'Error'] as const]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilterWf(key)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilterWf === key
                    ? key === 'all' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                    : `${statusStyles[key as StatusTag]} border`
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border border-transparent'
                }`}
              >
                {label}
                {key !== 'all' && <span className="text-[10px] opacity-60">{statusCountsWf[key] ?? 0}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {statusFilterWf === 'all' ? 'All Workflows' : `${statusFilterWf} Workflows`}
            </h2>
            <span className="text-xs text-neutral-400 tabular-nums">{filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4"><Zap className="size-6 opacity-40" /></div>
              <p className="font-medium">{searchQuery || statusFilterWf !== 'all' ? 'No matching workflows' : 'No workflows yet'}</p>
              <p className="text-sm mt-1">{searchQuery || statusFilterWf !== 'all' ? 'Try adjusting your filters.' : 'Create one from scratch or use a template.'}</p>
            </div>
          ) : filteredWorkflows.map(wf => (
            <div key={wf.dbId} className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all hover:shadow-md cursor-pointer"
              onClick={() => openEditor(wf)}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-sm font-semibold truncate">{wf.name}</h3>
                      <Badge className={`${statusStyles[wf.status] || statusStyles.Draft} border text-[10px] px-1.5 py-0`}>{wf.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{wf.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => toggleStatus(wf.dbId, wf.status)} disabled={wf.status === 'Draft' || wf.status === 'Error'}>
                      {wf.status === 'Active' ? <Pause className="size-3" /> : <Play className="size-3" />}
                      {wf.status === 'Active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center justify-center size-7 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors" onClick={() => handleDuplicateWorkflow(wf.dbId)}>
                          <Copy className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate workflow</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center justify-center size-7 rounded-md text-red-500 hover:bg-red-500/10 transition-colors" onClick={() => setDeleteConfirmId(wf.dbId)}>
                          <Trash2 className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete workflow</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5"><Activity className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{wf.runsTotal.toLocaleString()}</span> runs</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-500" /><span className="text-xs text-muted-foreground"><span className="font-medium text-emerald-600 dark:text-emerald-400">{pct(wf.runsSuccess, wf.runsTotal)}%</span> success</span></div>
                  <div className="flex items-center gap-1.5"><LayoutGrid className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{wf.nodes.length}</span> nodes</span></div>
                  <div className="flex items-center gap-1.5"><GitBranch className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{wf.connections.length}</span> connections</span></div>
                  {wf.lastRun > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto"><Clock className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Last run {timeAgo(wf.lastRun)}</span></div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {Array.from(new Set(wf.nodes.map(n => n.type))).map(type => {
                      const cfg = nodeTypeConfig[type]
                      const Icon = cfg.icon
                      return <div key={type} className={`flex items-center justify-center size-5 rounded ${cfg.bg}`} title={cfg.label}><Icon className={`size-3 ${cfg.color}`} /></div>
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{workflows.find(w => w.dbId === deleteConfirmId)?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId !== null && handleDeleteWorkflow(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
