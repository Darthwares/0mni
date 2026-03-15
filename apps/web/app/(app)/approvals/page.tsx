'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  User,
  DollarSign,
  Briefcase,
  FileText,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { CountUp } from '@/components/reactbits/CountUp'

// ── Types ──────────────────────────────────────
interface ApprovalRequest {
  id: string
  title: string
  description: string
  type: ApprovalType
  status: ApprovalStatus
  requester: string
  approver: string
  amount?: number
  createdAt: Date
  updatedAt: Date
  comments: ApprovalComment[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface ApprovalComment {
  author: string
  text: string
  timestamp: Date
}

type ApprovalType = 'expense' | 'timeoff' | 'document' | 'purchase' | 'access' | 'other'
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

const TYPE_CONFIG: Record<ApprovalType, { label: string; icon: LucideIcon; color: string; bgClass: string; textClass: string }> = {
  expense: { label: 'Expense', icon: DollarSign, color: '#22c55e', bgClass: 'bg-green-500/10 border-green-500/20', textClass: 'text-green-600 dark:text-green-400' },
  timeoff: { label: 'Time Off', icon: Calendar, color: '#3b82f6', bgClass: 'bg-blue-500/10 border-blue-500/20', textClass: 'text-blue-600 dark:text-blue-400' },
  document: { label: 'Document', icon: FileText, color: '#a855f7', bgClass: 'bg-purple-500/10 border-purple-500/20', textClass: 'text-purple-600 dark:text-purple-400' },
  purchase: { label: 'Purchase', icon: Briefcase, color: '#f59e0b', bgClass: 'bg-amber-500/10 border-amber-500/20', textClass: 'text-amber-600 dark:text-amber-400' },
  access: { label: 'Access', icon: User, color: '#06b6d4', bgClass: 'bg-cyan-500/10 border-cyan-500/20', textClass: 'text-cyan-600 dark:text-cyan-400' },
  other: { label: 'Other', icon: ClipboardCheck, color: '#6b7280', bgClass: 'bg-neutral-500/10 border-neutral-500/20', textClass: 'text-neutral-600 dark:text-neutral-400' },
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; icon: LucideIcon; color: string; bgClass: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-500/10 border-green-500/20' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-500/10 border-red-500/20' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'text-neutral-500', bgClass: 'bg-neutral-500/10 border-neutral-500/20' },
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

// ── Sample Data ────────────────────────────────
function createSampleRequests(): ApprovalRequest[] {
  const h = (hours: number) => new Date(Date.now() - hours * 3600000)
  const d = (days: number) => new Date(Date.now() - days * 86400000)

  return [
    {
      id: '1', title: 'AWS Infrastructure Upgrade', description: 'Upgrade production cluster to larger instance types for Q2 traffic projections.',
      type: 'purchase', status: 'pending', requester: 'Alice Chen', approver: 'You', amount: 12500,
      createdAt: h(3), updatedAt: h(3), priority: 'high',
      comments: [{ author: 'Alice Chen', text: 'This is blocking the scaling initiative.', timestamp: h(2) }],
    },
    {
      id: '2', title: 'Conference Travel — React Summit', description: '3-day conference in Amsterdam. Flight + hotel + registration.',
      type: 'expense', status: 'pending', requester: 'Bob Kim', approver: 'You', amount: 3200,
      createdAt: h(8), updatedAt: h(8), priority: 'medium',
      comments: [],
    },
    {
      id: '3', title: 'PTO Request — March 24-28', description: 'Taking a week off for family vacation.',
      type: 'timeoff', status: 'pending', requester: 'Diana Patel', approver: 'You',
      createdAt: d(1), updatedAt: d(1), priority: 'low',
      comments: [{ author: 'Diana Patel', text: 'Sprint work is covered by Charlie.', timestamp: h(20) }],
    },
    {
      id: '4', title: 'SOC 2 Compliance Document', description: 'Annual security compliance report ready for sign-off.',
      type: 'document', status: 'pending', requester: 'Eve Legal', approver: 'You',
      createdAt: d(2), updatedAt: d(1), priority: 'urgent',
      comments: [{ author: 'Eve Legal', text: 'Audit deadline is April 1st.', timestamp: d(1) }],
    },
    {
      id: '5', title: 'Production Database Access', description: 'Read-only access to prod analytics database for the data team.',
      type: 'access', status: 'approved', requester: 'Frank Data', approver: 'You',
      createdAt: d(5), updatedAt: d(3), priority: 'medium',
      comments: [{ author: 'You', text: 'Approved with read-only constraint.', timestamp: d(3) }],
    },
    {
      id: '6', title: 'Marketing Budget — Social Ads', description: 'Q1 social media advertising budget for product launch.',
      type: 'expense', status: 'approved', requester: 'Grace Marketing', approver: 'You', amount: 8000,
      createdAt: d(10), updatedAt: d(7), priority: 'high',
      comments: [],
    },
    {
      id: '7', title: 'Vendor Contract Renewal', description: 'Renewing annual contract with DataDog for observability platform.',
      type: 'purchase', status: 'rejected', requester: 'Henry Ops', approver: 'You', amount: 45000,
      createdAt: d(14), updatedAt: d(12), priority: 'high',
      comments: [{ author: 'You', text: 'We are switching to Grafana Cloud. Please submit a new request for that.', timestamp: d(12) }],
    },
    {
      id: '8', title: 'Sick Day — March 10', description: 'Not feeling well, taking a sick day.',
      type: 'timeoff', status: 'approved', requester: 'Irene Dev', approver: 'You',
      createdAt: d(5), updatedAt: d(5), priority: 'low',
      comments: [],
    },
  ]
}

function formatDate(d: Date): string {
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Component ──────────────────────────────────
export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(createSampleRequests)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<ApprovalType>('expense')
  const [newPriority, setNewPriority] = useState<string>('medium')
  const [newAmount, setNewAmount] = useState('')
  const [newApprover, setNewApprover] = useState('')

  // Stats
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    const total = requests.length
    return { pending, approved, rejected, total }
  }, [requests])

  const filteredRequests = useMemo(() => {
    let list = requests
    if (filterTab !== 'all') list = list.filter((r) => r.status === filterTab)
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [requests, filterTab])

  const handleApprove = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' as const, updatedAt: new Date() } : r))
    setSelectedRequest(null)
  }, [])

  const handleReject = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'rejected' as const, updatedAt: new Date() } : r))
    setSelectedRequest(null)
  }, [])

  const handleAddComment = useCallback(() => {
    if (!selectedRequest || !commentText.trim()) return
    const comment: ApprovalComment = { author: 'You', text: commentText.trim(), timestamp: new Date() }
    setRequests((prev) => prev.map((r) =>
      r.id === selectedRequest.id ? { ...r, comments: [...r.comments, comment], updatedAt: new Date() } : r
    ))
    setSelectedRequest((prev) => prev ? { ...prev, comments: [...prev.comments, comment] } : null)
    setCommentText('')
  }, [selectedRequest, commentText])

  const handleCreate = () => {
    if (!newTitle.trim()) return
    const request: ApprovalRequest = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      type: newType,
      status: 'pending',
      requester: 'You',
      approver: newApprover.trim() || 'Manager',
      amount: newAmount ? parseFloat(newAmount) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      priority: newPriority as ApprovalRequest['priority'],
    }
    setRequests((prev) => [request, ...prev])
    setShowCreate(false)
    setNewTitle(''); setNewDescription(''); setNewAmount(''); setNewApprover('')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-lg shadow-amber-500/25">
            <ClipboardCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#f59e0b', '#f97316', '#ef4444']} animationSpeed={6}>
                Approvals
              </GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              Review and manage approval requests across the organization
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 size-4" />
          New Request
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Approved', value: stats.approved, color: '#22c55e' },
          { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
          { label: 'Total', value: stats.total, color: '#6366f1' },
        ].map((stat) => (
          <SpotlightCard key={stat.label} spotlightColor={stat.color} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">
              <CountUp to={stat.value} />
            </p>
          </SpotlightCard>
        ))}
      </div>

      {/* Filters */}
      <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="size-3" />
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle2 className="size-3" />
            Approved ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="size-3" />
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Request List */}
      <div className="space-y-3">
        {filteredRequests.map((request) => {
          const typeCfg = TYPE_CONFIG[request.type]
          const statusCfg = STATUS_CONFIG[request.status]
          const TypeIcon = typeCfg.icon
          const StatusIcon = statusCfg.icon

          return (
            <Card
              key={request.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`rounded-lg p-2.5 border ${typeCfg.bgClass} shrink-0`}>
                    <TypeIcon className={`size-5 ${typeCfg.textClass}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{request.title}</h3>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORITY_COLORS[request.priority]}`}>
                        {request.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {request.requester}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="size-3" />
                        {request.approver}
                      </span>
                      {request.amount && (
                        <span className="flex items-center gap-1 font-medium">
                          <DollarSign className="size-3" />
                          {request.amount.toLocaleString()}
                        </span>
                      )}
                      {request.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {request.comments.length}
                        </span>
                      )}
                      <span>{formatDate(request.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <Badge variant="outline" className={`shrink-0 gap-1 ${statusCfg.bgClass} ${statusCfg.color}`}>
                    <StatusIcon className="size-3" />
                    {statusCfg.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty */}
      {filteredRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ClipboardCheck className="size-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No {filterTab === 'all' ? '' : filterTab} requests</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        {selectedRequest && (() => {
          const typeCfg = TYPE_CONFIG[selectedRequest.type]
          const statusCfg = STATUS_CONFIG[selectedRequest.status]
          const TypeIcon = typeCfg.icon
          return (
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 border ${typeCfg.bgClass}`}>
                    <TypeIcon className={`size-4 ${typeCfg.textClass}`} />
                  </div>
                  <DialogTitle className="text-base">{selectedRequest.title}</DialogTitle>
                </div>
                <DialogDescription className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className={`text-[10px] ${statusCfg.bgClass} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[selectedRequest.priority]}`}>
                    {selectedRequest.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{typeCfg.label}</Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Requester</p>
                    <p className="font-medium text-xs mt-0.5">{selectedRequest.requester}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Approver</p>
                    <p className="font-medium text-xs mt-0.5">{selectedRequest.approver}</p>
                  </div>
                  {selectedRequest.amount && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] text-muted-foreground">Amount</p>
                      <p className="font-medium text-xs mt-0.5">${selectedRequest.amount.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Submitted</p>
                    <p className="font-medium text-xs mt-0.5">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                {/* Comments */}
                {selectedRequest.comments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Comments</p>
                    <div className="space-y-2">
                      {selectedRequest.comments.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <Avatar className="size-6 shrink-0">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {c.author[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 rounded-lg bg-muted/50 p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{c.author}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(c.timestamp)}</span>
                            </div>
                            <p className="text-xs mt-0.5">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="text-sm h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddComment} disabled={!commentText.trim()} className="h-8">
                    Send
                  </Button>
                </div>
              </div>
              {selectedRequest.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" size="sm" onClick={() => handleReject(selectedRequest.id)}>
                    <XCircle className="mr-1.5 size-3.5" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(selectedRequest.id)}>
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          )
        })()}
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Approval Request</DialogTitle>
            <DialogDescription>Submit a request for review</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Request title" className="mt-1" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ApprovalType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" className="mt-1" />
              </div>
            )}
            <div>
              <Label>Approver</Label>
              <Input value={newApprover} onChange={(e) => setNewApprover(e.target.value)} placeholder="Manager name" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Describe your request..." className="mt-1 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
