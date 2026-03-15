'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  Calendar,
  FileText,
  ShoppingCart,
  Shield,
  MoreHorizontal,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ArrowRight,
  ClipboardCheck,
  Send,
  Ban,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- Config maps ------------------------------------------------------------

type ApprovalTypeTag = 'Expense' | 'TimeOff' | 'Document' | 'Purchase' | 'Access' | 'Other'
type ApprovalStatusTag = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
type PriorityTag = 'Low' | 'Medium' | 'High' | 'Urgent'

const TYPE_CONFIG: Record<ApprovalTypeTag, { icon: typeof DollarSign; color: string; label: string }> = {
  Expense:  { icon: DollarSign,     color: 'text-emerald-500', label: 'Expense' },
  TimeOff:  { icon: Calendar,       color: 'text-blue-500',    label: 'Time Off' },
  Document: { icon: FileText,       color: 'text-violet-500',  label: 'Document' },
  Purchase: { icon: ShoppingCart,    color: 'text-amber-500',   label: 'Purchase' },
  Access:   { icon: Shield,         color: 'text-rose-500',    label: 'Access' },
  Other:    { icon: MoreHorizontal, color: 'text-neutral-500', label: 'Other' },
}

const STATUS_CONFIG: Record<ApprovalStatusTag, string> = {
  Pending:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Approved:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Rejected:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  Cancelled: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
}

const PRIORITY_COLORS: Record<PriorityTag, string> = {
  Low:    'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  Medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  High:   'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

// ---- Helpers ----------------------------------------------------------------

function timeAgo(ts: unknown): string {
  let ms: number
  if (typeof ts === 'bigint') {
    ms = Number(ts) / 1000
  } else if (typeof ts === 'number') {
    ms = ts > 1e15 ? ts / 1000 : ts
  } else if (ts && typeof ts === 'object') {
    const obj = ts as Record<string, unknown>
    const raw = obj.__timestamp_micros_since_unix_epoch__ ?? obj.microsSinceEpoch ?? obj.microseconds ?? 0
    ms = Number(raw) / 1000
  } else {
    return ''
  }
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatCurrency(cents: bigint | number): string {
  const dollars = Number(cents) / 100
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(dollars)
}

function getTag(enumVal: unknown): string {
  if (!enumVal || typeof enumVal !== 'object') return ''
  return (enumVal as { tag?: string }).tag ?? ''
}

function identityHex(id: unknown): string {
  if (!id) return ''
  if (typeof (id as { toHexString?: () => string }).toHexString === 'function') {
    return (id as { toHexString: () => string }).toHexString()
  }
  return String(id)
}

// ---- Filter tabs ------------------------------------------------------------

const FILTER_TABS = ['all', 'Pending', 'Approved', 'Rejected'] as const
type FilterTab = (typeof FILTER_TABS)[number]

// =============================================================================
// Page component
// =============================================================================

export default function ApprovalsPage() {
  const { currentOrgId } = useOrg()
  const { identity } = useSpacetimeDB()

  // SpacetimeDB data
  const allRequests = useTable(tables.approvalRequest)
  const allComments = useTable(tables.approvalComment)
  const allEmployees = useTable(tables.employee)

  // Reducers
  const createApprovalRequest = useReducer(reducers.createApprovalRequest)
  const approveRequest = useReducer(reducers.approveRequest)
  const rejectRequest = useReducer(reducers.rejectRequest)
  const cancelRequest = useReducer(reducers.cancelRequest)
  const deleteApprovalRequest = useReducer(reducers.deleteApprovalRequest)
  const addApprovalComment = useReducer(reducers.addApprovalComment)

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [decisionNote, setDecisionNote] = useState('')

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ApprovalTypeTag>('Expense')
  const [newPriority, setNewPriority] = useState<PriorityTag>('Medium')
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newApproverHex, setNewApproverHex] = useState('')

  // Employee name map
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const emp of allEmployees) {
      map.set(identityHex(emp.identity), emp.name)
    }
    return map
  }, [allEmployees])

  function resolveName(id: unknown): string {
    const hex = identityHex(id)
    if (identity && hex === identityHex(identity)) return 'You'
    return employeeMap.get(hex) || hex.slice(0, 8) + '...'
  }

  // Org-scoped requests
  const requests = useMemo(() => {
    if (currentOrgId === null) return []
    return allRequests
      .filter(r => r.orgId === BigInt(currentOrgId))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  }, [allRequests, currentOrgId])

  // Counts
  const pendingCount = requests.filter(r => getTag(r.status) === 'Pending').length
  const approvedCount = requests.filter(r => getTag(r.status) === 'Approved').length
  const rejectedCount = requests.filter(r => getTag(r.status) === 'Rejected').length
  const totalValue = requests
    .filter(r => getTag(r.status) === 'Pending' && Number(r.amountCents) > 0)
    .reduce((sum, r) => sum + Number(r.amountCents), 0)

  // Filtered list
  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchesTab = activeTab === 'all' || getTag(r.status) === activeTab
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        resolveName(r.requester).toLowerCase().includes(q) ||
        resolveName(r.approver).toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [requests, activeTab, searchQuery, employeeMap])

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: requests.length,
    Pending: pendingCount,
    Approved: approvedCount,
    Rejected: rejectedCount,
  }), [requests, pendingCount, approvedCount, rejectedCount])

  const selectedRequest = requests.find(r => Number(r.id) === selectedId) ?? null
  const selectedComments = useMemo(() => {
    if (!selectedRequest) return []
    return allComments
      .filter(c => Number(c.requestId) === Number(selectedRequest.id))
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
  }, [allComments, selectedRequest])

  // Check if current user is the approver of the selected request
  const isApprover = selectedRequest && identity
    ? identityHex(selectedRequest.approver) === identityHex(identity)
    : false
  const isRequester = selectedRequest && identity
    ? identityHex(selectedRequest.requester) === identityHex(identity)
    : false

  // Org employees for approver dropdown
  const orgEmployees = useMemo(() => {
    if (currentOrgId === null) return []
    return allEmployees.filter(e => e.orgId === BigInt(currentOrgId))
  }, [allEmployees, currentOrgId])

  // Actions
  const handleCreate = useCallback(() => {
    if (!newTitle.trim() || currentOrgId === null) return
    const amountCents = (newType === 'Expense' || newType === 'Purchase') && newAmount
      ? BigInt(Math.round(parseFloat(newAmount) * 100))
      : BigInt(0)
    createApprovalRequest({
      orgId: BigInt(currentOrgId),
      title: newTitle.trim(),
      description: newDescription.trim(),
      typeTag: newType,
      priorityTag: newPriority,
      approverHex: newApproverHex,
      amountCents,
    })
    setCreateOpen(false)
    setNewTitle('')
    setNewType('Expense')
    setNewPriority('Medium')
    setNewDescription('')
    setNewAmount('')
    setNewApproverHex('')
  }, [newTitle, newType, newPriority, newDescription, newAmount, newApproverHex, currentOrgId, createApprovalRequest])

  const handleApprove = useCallback((id: number) => {
    approveRequest({ requestId: BigInt(id), note: decisionNote })
    setDecisionNote('')
    setSelectedId(null)
  }, [approveRequest, decisionNote])

  const handleReject = useCallback((id: number) => {
    rejectRequest({ requestId: BigInt(id), note: decisionNote })
    setDecisionNote('')
    setSelectedId(null)
  }, [rejectRequest, decisionNote])

  const handleCancel = useCallback((id: number) => {
    cancelRequest({ requestId: BigInt(id) })
    setSelectedId(null)
  }, [cancelRequest])

  const handleAddComment = useCallback(() => {
    if (!commentText.trim() || !selectedRequest) return
    addApprovalComment({ requestId: BigInt(Number(selectedRequest.id)), text: commentText.trim() })
    setCommentText('')
  }, [commentText, selectedRequest, addApprovalComment])

  const tabLabels: Record<FilterTab, string> = { all: 'All', Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 shadow-lg shadow-amber-500/20">
            <ClipboardCheck className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <GradientText colors={['#f59e0b', '#f97316', '#ef4444']} animationSpeed={6}>
              Approvals
            </GradientText>
          </h1>
        </div>
        <PresenceBar />
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Top row: Create button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Review and manage approval requests across your organization
          </p>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="size-4" />
              New Request
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Approval Request</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-title">Title *</Label>
                  <Input id="req-title" placeholder="What needs approval?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as ApprovalTypeTag)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TYPE_CONFIG) as ApprovalTypeTag[]).map((t) => (
                          <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Priority</Label>
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v as PriorityTag)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(newType === 'Expense' || newType === 'Purchase') && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="req-amount">Amount ($)</Label>
                    <Input id="req-amount" type="number" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label>Approver</Label>
                  <Select value={newApproverHex} onValueChange={setNewApproverHex}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select approver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgEmployees.map((emp) => {
                        const hex = identityHex(emp.identity)
                        return (
                          <SelectItem key={hex} value={hex}>{emp.name || hex.slice(0, 12) + '...'}</SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-desc">Description</Label>
                  <Textarea id="req-desc" placeholder="Provide details about this request..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim()}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Pending</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-amber-500"><CountUp to={pendingCount} /></span>
              <Clock className="size-5 text-amber-400/60 mb-1" />
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Approved</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-500"><CountUp to={approvedCount} /></span>
              <CheckCircle2 className="size-5 text-emerald-400/60 mb-1" />
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.15)">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Rejected</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-red-500"><CountUp to={rejectedCount} /></span>
              <XCircle className="size-5 text-red-400/60 mb-1" />
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Pending Value</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-indigo-400">{totalValue > 0 ? formatCurrency(BigInt(totalValue)) : '$0'}</span>
              <DollarSign className="size-5 text-indigo-400/60 mb-1" />
            </div>
          </SpotlightCard>
        </div>

        {/* Search + Filter tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tabLabels[tab]}
                <span className="ml-1.5 text-xs opacity-60">{tabCounts[tab]}</span>
              </button>
            ))}
          </div>
          <div className="relative max-w-sm w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Request cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="size-10 mb-3 opacity-30" />
            <p className="text-sm">{searchQuery ? 'No requests match your search.' : 'No approval requests yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((req) => {
              const typeTag = getTag(req.approvalType) as ApprovalTypeTag
              const statusTag = getTag(req.status) as ApprovalStatusTag
              const priorityTag = getTag(req.priority) as PriorityTag
              const conf = TYPE_CONFIG[typeTag] || TYPE_CONFIG.Other
              const TypeIcon = conf.icon
              const commentCount = allComments.filter(c => Number(c.requestId) === Number(req.id)).length
              return (
                <button
                  key={Number(req.id)}
                  onClick={() => setSelectedId(Number(req.id))}
                  className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5"
                >
                  {/* Top row: type icon + title + priority */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex items-center justify-center size-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 ${conf.color}`}>
                      <TypeIcon className="size-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{req.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[statusTag] || ''}`}>
                          {statusTag}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[priorityTag] || ''}`}>
                          {priorityTag}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Requester -> Approver flow */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{resolveName(req.requester)}</span>
                    <ArrowRight className="size-3 shrink-0" />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{resolveName(req.approver)}</span>
                  </div>

                  {/* Bottom row: amount, comments, time */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {Number(req.amountCents) > 0 && (
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{formatCurrency(req.amountCents)}</span>
                      )}
                      {commentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {commentCount}
                        </span>
                      )}
                    </div>
                    <span>{timeAgo(req.createdAt)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) { setSelectedId(null); setDecisionNote(''); setCommentText('') } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRequest && (() => {
            const typeTag = getTag(selectedRequest.approvalType) as ApprovalTypeTag
            const statusTag = getTag(selectedRequest.status) as ApprovalStatusTag
            const priorityTag = getTag(selectedRequest.priority) as PriorityTag
            const conf = TYPE_CONFIG[typeTag] || TYPE_CONFIG.Other
            const TypeIcon = conf.icon
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${conf.color}`}>
                      <TypeIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate">{selectedRequest.title}</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">#{Number(selectedRequest.id)}</p>
                    </div>
                  </div>
                </DialogHeader>

                {/* Status + Priority badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[statusTag] || ''}`}>
                    {statusTag}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[priorityTag] || ''}`}>
                    {priorityTag} Priority
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {conf.label}
                  </Badge>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {selectedRequest.description}
                  </p>
                )}

                {/* Decision note */}
                {selectedRequest.decisionNote && (
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Decision Note</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedRequest.decisionNote}</p>
                  </div>
                )}

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Requester</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{resolveName(selectedRequest.requester)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Approver</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{resolveName(selectedRequest.approver)}</p>
                  </div>
                  {Number(selectedRequest.amountCents) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(selectedRequest.amountCents)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{timeAgo(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                {/* Comments */}
                {selectedComments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Comments ({selectedComments.length})
                    </p>
                    <div className="space-y-2">
                      {selectedComments.map((c) => (
                        <div key={Number(c.id)} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{resolveName(c.author)}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddComment} disabled={!commentText.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>

                {/* Actions */}
                <DialogFooter>
                  {statusTag === 'Pending' ? (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Decision note (optional)</Label>
                        <Input
                          placeholder="Add a note for your decision..."
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        {isRequester && (
                          <Button variant="outline" onClick={() => handleCancel(Number(selectedRequest.id))} className="text-neutral-600 border-neutral-300 dark:border-neutral-700">
                            <Ban className="size-4" />
                            Cancel Request
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => handleReject(Number(selectedRequest.id))} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800">
                          <XCircle className="size-4" />
                          Reject
                        </Button>
                        <Button onClick={() => handleApprove(Number(selectedRequest.id))} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="size-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {isRequester && statusTag !== 'Cancelled' && (
                        <Button variant="outline" size="sm" onClick={() => { deleteApprovalRequest({ requestId: BigInt(Number(selectedRequest.id)) }); setSelectedId(null) }} className="text-red-600">
                          Delete
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
                    </div>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
