'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import {
  Zap, Play, Pause, GitBranch, Clock, Sparkles, Plus, ArrowLeft,
  Trash2, Activity, CheckCircle2, LayoutGrid, ChevronDown, Copy, ArrowRight,
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

  const selectedNode = currentNodes.find(n => n.id === selectedNodeId) ?? null

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
          <div className="flex-1 overflow-auto relative bg-[radial-gradient(circle_at_1px_1px,_rgb(0_0_0_/_0.06)_1px,_transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,_rgb(255_255_255_/_0.04)_1px,_transparent_0)] bg-[length:24px_24px]">
            <div className="relative" style={{ minWidth: currentNodes.length * 300 + 200, minHeight: 400 }}>
              <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" className="fill-neutral-400 dark:fill-neutral-500" /></marker></defs>
                {currentConnections.map((conn, i) => {
                  const fromNode = currentNodes.find(n => n.id === conn.from)
                  const toNode = currentNodes.find(n => n.id === conn.to)
                  if (!fromNode || !toNode) return null
                  const x1 = fromNode.position.x + 230, y1 = fromNode.position.y + 40
                  const x2 = toNode.position.x, y2 = toNode.position.y + 40
                  return (
                    <path key={`conn-${i}`} d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                      fill="none" className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth={2}
                      strokeDasharray={fromNode.type === 'condition' ? '6 3' : 'none'} markerEnd="url(#arrowhead)" />
                  )
                })}
              </svg>

              {currentNodes.map(node => {
                const cfg = nodeTypeConfig[node.type]
                const Icon = cfg.icon
                const isSelected = node.id === selectedNodeId
                return (
                  <div key={node.id} className={`absolute cursor-pointer transition-all duration-150 ${isSelected ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}`}
                    style={{ left: node.position.x, top: node.position.y, width: 230 }} onClick={() => setSelectedNodeId(node.id)}>
                    <div className={`rounded-xl border-l-4 ${cfg.border} border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500/50 shadow-lg' : ''} transition-shadow duration-150`}>
                      <div className="p-3.5">
                        <div className="flex items-center gap-2.5 mb-1.5">
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
                      <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
                        <div className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                        <ArrowRight className="size-3 text-neutral-400" />
                        <div className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      </div>
                    </div>
                  </div>
                )
              })}

              {currentNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto mb-3"><Plus className="size-6 text-neutral-400" /></div>
                    <p className="text-sm font-medium text-muted-foreground">Add a trigger to get started</p>
                    <p className="text-xs text-muted-foreground mt-1">Use the toolbar above to add nodes</p>
                  </div>
                </div>
              )}
            </div>
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
          <p className="text-sm text-muted-foreground">AI-powered automation engine — build triggers, actions, and intelligent pipelines</p>
          <div className="flex items-center gap-2">
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

        {/* Workflow list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Workflows</h2>
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4"><Zap className="size-6 opacity-40" /></div>
              <p className="font-medium">No workflows yet</p>
              <p className="text-sm mt-1">Create one from scratch or use a template.</p>
            </div>
          ) : workflows.map(wf => (
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => deleteWorkflow({ workflowId: BigInt(wf.dbId) })}>
                      <Trash2 className="size-3" />
                    </Button>
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
    </div>
  )
}
