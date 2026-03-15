'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- Types ------------------------------------------------------------------

type ApprovalType = 'expense' | 'timeoff' | 'document' | 'purchase' | 'access' | 'other'
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

type ApprovalRequest = {
  id: string
  title: string
  description: string
  type: ApprovalType
  status: ApprovalStatus
  requester: string
  approver: string
  amount?: number
  priority: Priority
  createdAt: Date
  updatedAt: Date
  comments: { author: string; text: string; at: Date }[]
}

// ---- Config maps ------------------------------------------------------------

const TYPE_CONFIG: Record<ApprovalType, { icon: typeof DollarSign; color: string; label: string }> = {
  expense:  { icon: DollarSign,     color: 'text-emerald-500', label: 'Expense' },
  timeoff:  { icon: Calendar,       color: 'text-blue-500',    label: 'Time Off' },
  document: { icon: FileText,       color: 'text-violet-500',  label: 'Document' },
  purchase: { icon: ShoppingCart,    color: 'text-amber-500',   label: 'Purchase' },
  access:   { icon: Shield,         color: 'text-rose-500',    label: 'Access' },
  other:    { icon: MoreHorizontal, color: 'text-neutral-500', label: 'Other' },
}

const STATUS_CONFIG: Record<ApprovalStatus, string> = {
  pending:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  approved:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  cancelled: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low:    'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  high:   'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

// ---- Helpers ----------------------------------------------------------------

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

// ---- Sample data ------------------------------------------------------------

const now = Date.now()
const h = (hours: number) => new Date(now - hours * 3_600_000)

const SAMPLE_REQUESTS: ApprovalRequest[] = [
  {
    id: 'APR-001', title: 'Q1 Marketing Campaign Budget', description: 'Budget approval for the upcoming Q1 digital marketing campaign including social media ads, influencer partnerships, and content creation.', type: 'expense', status: 'pending', requester: 'Sarah Chen', approver: 'James Wilson', amount: 12500, priority: 'high', createdAt: h(2), updatedAt: h(1),
    comments: [{ author: 'James Wilson', text: 'Can you break down the influencer budget?', at: h(1) }],
  },
  {
    id: 'APR-002', title: 'Annual Leave - Dec 20 to Jan 3', description: 'Requesting time off for the holiday season. All pending tasks will be handed over to Mike before departure.', type: 'timeoff', status: 'approved', requester: 'David Park', approver: 'Lisa Morgan', priority: 'medium', createdAt: h(48), updatedAt: h(24),
    comments: [{ author: 'Lisa Morgan', text: 'Approved. Enjoy your vacation!', at: h(24) }],
  },
  {
    id: 'APR-003', title: 'New Laptop for Engineering Team', description: 'Purchase request for 5 MacBook Pro M3 laptops for the new engineering hires starting next month.', type: 'purchase', status: 'pending', requester: 'Mike Torres', approver: 'James Wilson', amount: 14995, priority: 'medium', createdAt: h(6), updatedAt: h(6),
    comments: [],
  },
  {
    id: 'APR-004', title: 'AWS Production Access', description: 'Requesting production AWS console access for deployment and monitoring of the new microservices architecture.', type: 'access', status: 'pending', requester: 'Emily Zhang', approver: 'Robert Kim', priority: 'urgent', createdAt: h(1), updatedAt: h(1),
    comments: [{ author: 'Robert Kim', text: 'Which specific services do you need access to?', at: h(0.5) }],
  },
  {
    id: 'APR-005', title: 'Client Contract Amendment', description: 'Amendment to the Acme Corp service agreement extending the contract by 12 months with revised SLA terms.', type: 'document', status: 'approved', requester: 'Anna Roberts', approver: 'Lisa Morgan', priority: 'high', createdAt: h(72), updatedAt: h(48),
    comments: [{ author: 'Lisa Morgan', text: 'Legal has reviewed. Looks good.', at: h(50) }, { author: 'Anna Roberts', text: 'Thank you! Sending to client now.', at: h(48) }],
  },
  {
    id: 'APR-006', title: 'Conference Travel Reimbursement', description: 'Reimbursement for travel expenses to React Summit 2024 including flights, hotel, and meals.', type: 'expense', status: 'rejected', requester: 'Kevin Liu', approver: 'James Wilson', amount: 3200, priority: 'low', createdAt: h(120), updatedAt: h(96),
    comments: [{ author: 'James Wilson', text: 'Please resubmit with itemized receipts.', at: h(96) }],
  },
  {
    id: 'APR-007', title: 'Sick Leave - 2 Days', description: 'Requesting sick leave for medical appointment and recovery.', type: 'timeoff', status: 'approved', requester: 'Rachel Green', approver: 'Robert Kim', priority: 'medium', createdAt: h(168), updatedAt: h(160),
    comments: [],
  },
  {
    id: 'APR-008', title: 'Office Furniture Upgrade', description: 'Standing desks and ergonomic chairs for the design team workspace renovation.', type: 'purchase', status: 'pending', requester: 'Tom Bradley', approver: 'Lisa Morgan', amount: 8750, priority: 'low', createdAt: h(12), updatedAt: h(12),
    comments: [{ author: 'Lisa Morgan', text: 'Let me check the facilities budget first.', at: h(10) }],
  },
]

// ---- Filter tabs ------------------------------------------------------------

const FILTER_TABS = ['all', 'pending', 'approved', 'rejected'] as const
type FilterTab = (typeof FILTER_TABS)[number]

// =============================================================================
// Page component
// =============================================================================

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(SAMPLE_REQUESTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ApprovalType>('expense')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState('')

  // Counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedThisMonth = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length
  const totalValue = requests.filter((r) => r.status === 'pending' && r.amount).reduce((sum, r) => sum + (r.amount ?? 0), 0)

  // Filtered list
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesTab = activeTab === 'all' || r.status === activeTab
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [requests, activeTab, searchQuery])

  // Tab counts
  const tabCounts: Record<FilterTab, number> = useMemo(() => ({
    all: requests.filter((r) => { const q = searchQuery.toLowerCase(); return !q || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q) }).length,
    pending: requests.filter((r) => { const q = searchQuery.toLowerCase(); return r.status === 'pending' && (!q || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q)) }).length,
    approved: requests.filter((r) => { const q = searchQuery.toLowerCase(); return r.status === 'approved' && (!q || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q)) }).length,
    rejected: requests.filter((r) => { const q = searchQuery.toLowerCase(); return r.status === 'rejected' && (!q || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.approver.toLowerCase().includes(q)) }).length,
  }), [requests, searchQuery])

  const selectedRequest = requests.find((r) => r.id === selectedId) ?? null

  // Actions
  function handleApprove(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' as ApprovalStatus, updatedAt: new Date() } : r))
  }

  function handleReject(id: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'rejected' as ApprovalStatus, updatedAt: new Date() } : r))
  }

  function handleCreate() {
    if (!newTitle.trim()) return
    const id = `APR-${String(requests.length + 1).padStart(3, '0')}`
    const req: ApprovalRequest = {
      id, title: newTitle.trim(), description: newDescription.trim(), type: newType, status: 'pending', requester: 'You', approver: 'James Wilson',
      amount: (newType === 'expense' || newType === 'purchase') && newAmount ? parseFloat(newAmount) : undefined,
      priority: newPriority, createdAt: new Date(), updatedAt: new Date(), comments: [],
    }
    setRequests((prev) => [req, ...prev])
    setCreateOpen(false)
    setNewTitle('')
    setNewType('expense')
    setNewPriority('medium')
    setNewDescription('')
    setNewAmount('')
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 shadow-lg shadow-amber-500/20">
            <ClipboardCheck className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#f59e0b', '#f97316', '#ef4444']} animationSpeed={6}>
                Approvals
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and manage approval requests across your organization
            </p>
          </div>
        </div>

        {/* Create Request Dialog */}
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
                  <Select value={newType} onValueChange={(v) => setNewType(v as ApprovalType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_CONFIG) as ApprovalType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(newType === 'expense' || newType === 'purchase') && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-amount">Amount ($)</Label>
                  <Input id="req-amount" type="number" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                </div>
              )}
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
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Approved This Month</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-emerald-500"><CountUp to={approvedThisMonth} /></span>
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
            <span className="text-3xl font-bold text-indigo-400">$<CountUp to={totalValue} separator="," /></span>
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            const TypeIcon = TYPE_CONFIG[req.type].icon
            return (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5"
              >
                {/* Top row: type icon + title + priority */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex items-center justify-center size-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 ${TYPE_CONFIG[req.type].color}`}>
                    <TypeIcon className="size-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{req.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[req.status]}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[req.priority]}`}>
                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Requester -> Approver flow */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{req.requester}</span>
                  <ArrowRight className="size-3 shrink-0" />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{req.approver}</span>
                </div>

                {/* Bottom row: amount, comments, time */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {req.amount != null && (
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">{formatCurrency(req.amount)}</span>
                    )}
                    {req.comments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        {req.comments.length}
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

      {/* Detail Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
        <DialogContent className="sm:max-w-lg">
          {selectedRequest && (() => {
            const TypeIcon = TYPE_CONFIG[selectedRequest.type].icon
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${TYPE_CONFIG[selectedRequest.type].color}`}>
                      <TypeIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate">{selectedRequest.title}</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedRequest.id}</p>
                    </div>
                  </div>
                </DialogHeader>

                {/* Status + Priority badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedRequest.status]}`}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[selectedRequest.priority]}`}>
                    {selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1)} Priority
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {TYPE_CONFIG[selectedRequest.type].label}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {selectedRequest.description}
                </p>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Requester</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{selectedRequest.requester}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Approver</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{selectedRequest.approver}</p>
                  </div>
                  {selectedRequest.amount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(selectedRequest.amount)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{timeAgo(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                {/* Comments */}
                {selectedRequest.comments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Comments ({selectedRequest.comments.length})
                    </p>
                    <div className="space-y-2">
                      {selectedRequest.comments.map((c, i) => (
                        <div key={i} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{c.author}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.at)}</span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <DialogFooter>
                  {selectedRequest.status === 'pending' ? (
                    <>
                      <Button variant="outline" onClick={() => { handleReject(selectedRequest.id); setSelectedId(null) }} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800">
                        <XCircle className="size-4" />
                        Reject
                      </Button>
                      <Button onClick={() => { handleApprove(selectedRequest.id); setSelectedId(null) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
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
