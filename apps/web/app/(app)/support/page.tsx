'use client'

import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { exportCSV } from '@/lib/csv-export'
import { PresenceBar } from '@/components/presence-bar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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
import { Label } from '@/components/ui/label'
import {
  Search,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Ticket,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronDown,
  Inbox,
  MailOpen,
  CircleDot,
  Plus,
  Headphones,
  StickyNote,
  MessageSquarePlus,
  Trash2,
  BookTemplate,
  ChevronUp,
  ArrowUpCircle,
  Edit3,
  Tag,
  Download,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import ShinyText from '@/components/reactbits/ShinyText'
import BlurText from '@/components/reactbits/BlurText'

// ---- helpers ----------------------------------------------------------------

function timeAgo(ts: any): string {
  const diff = Date.now() - ts.toMillis()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatTime(ts: any): string {
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: any): string {
  return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---- color maps -------------------------------------------------------------

function statusVariant(tag: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tag) {
    case 'New': return 'default'
    case 'Open': return 'default'
    case 'Pending': return 'secondary'
    case 'Resolved': return 'outline'
    case 'Closed': return 'outline'
    default: return 'secondary'
  }
}

function statusColor(tag: string): string {
  switch (tag) {
    case 'New': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Open': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Resolved': return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    case 'Closed': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
    default: return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  }
}

function statusDot(tag: string): string {
  switch (tag) {
    case 'New': return 'bg-blue-500'
    case 'Open': return 'bg-emerald-500'
    case 'Pending': return 'bg-amber-500'
    case 'Resolved': return 'bg-neutral-400'
    case 'Closed': return 'bg-neutral-300'
    default: return 'bg-neutral-400'
  }
}

function priorityColor(tag: string): string {
  switch (tag) {
    case 'Urgent': return 'text-red-600'
    case 'High': return 'text-orange-500'
    case 'Medium': return 'text-amber-500'
    case 'Low': return 'text-neutral-400'
    default: return 'text-neutral-400'
  }
}

function priorityBg(tag: string): string {
  switch (tag) {
    case 'Urgent': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'High': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Low': return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    default: return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
  }
}

function sentimentIcon(tag: string) {
  switch (tag) {
    case 'Happy': return <TrendingUp className="h-4 w-4 text-emerald-500" />
    case 'Neutral': return <Minus className="h-4 w-4 text-neutral-400" />
    case 'Frustrated': return <TrendingDown className="h-4 w-4 text-amber-500" />
    case 'Angry': return <AlertCircle className="h-4 w-4 text-red-500" />
    default: return <Minus className="h-4 w-4 text-neutral-400" />
  }
}

function sentimentColor(tag: string): string {
  switch (tag) {
    case 'Happy': return 'text-emerald-600'
    case 'Neutral': return 'text-neutral-500'
    case 'Frustrated': return 'text-amber-600'
    case 'Angry': return 'text-red-600'
    default: return 'text-neutral-500'
  }
}

function healthColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-600'
  if (score >= 0.4) return 'text-amber-600'
  return 'text-red-600'
}

function healthBarColor(score: number): string {
  if (score >= 0.7) return '[&>div]:bg-emerald-500'
  if (score >= 0.4) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

// ---- status filter options ---------------------------------------------------

const STATUS_FILTERS = ['All', 'New', 'Open', 'Pending', 'Resolved', 'Closed'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

// =============================================================================

export default function SupportPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allTickets] = useTable(tables.ticket)
  const [allCustomers] = useTable(tables.customer)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allTicketNotes] = useTable(tables.ticket_note)
  const [allCannedResponses] = useTable(tables.canned_response)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)
  const createTicket = useSpacetimeReducer(reducers.createTicket)
  const createCustomer = useSpacetimeReducer(reducers.createCustomer)
  const updateTicketStatus = useSpacetimeReducer(reducers.updateTicketStatus)
  const updateTicketPriority = useSpacetimeReducer(reducers.updateTicketPriority)
  const assignTicket = useSpacetimeReducer(reducers.assignTicket)
  const addTicketNote = useSpacetimeReducer(reducers.addTicketNote)
  const deleteTicketNote = useSpacetimeReducer(reducers.deleteTicketNote)
  const createCannedResponse = useSpacetimeReducer(reducers.createCannedResponse)
  const deleteCannedResponse = useSpacetimeReducer(reducers.deleteCannedResponse)
  const escalateTicket = useSpacetimeReducer(reducers.escalateTicket)
  const updateCustomer = useSpacetimeReducer(reducers.updateCustomer)
  const updateTicketCategory = useSpacetimeReducer(reducers.updateTicketCategory)

  const myHex = identity?.toHexString() ?? ''

  // Agents available for assignment (employees in current org)
  const orgAgents = useMemo(
    () => allEmployees.filter((e) => e.orgId === BigInt(currentOrgId)),
    [allEmployees, currentOrgId]
  )

  const [selectedTicketId, setSelectedTicketId] = useState<bigint | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // New Ticket dialog state
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [newTicketCustomerId, setNewTicketCustomerId] = useState('')
  const [newTicketSubject, setNewTicketSubject] = useState('')
  const [newTicketPriority, setNewTicketPriority] = useState('Medium')

  // New Customer dialog state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerCompany, setNewCustomerCompany] = useState('')

  // Internal notes state
  const [noteInput, setNoteInput] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  // Canned response state
  const [showCannedPicker, setShowCannedPicker] = useState(false)
  const [newCannedTitle, setNewCannedTitle] = useState('')
  const [newCannedContent, setNewCannedContent] = useState('')
  const [showCannedDialog, setShowCannedDialog] = useState(false)

  // Edit Customer dialog state
  const [editCustomerOpen, setEditCustomerOpen] = useState(false)
  const [editCustName, setEditCustName] = useState('')
  const [editCustEmail, setEditCustEmail] = useState('')
  const [editCustPhone, setEditCustPhone] = useState('')
  const [editCustCompany, setEditCustCompany] = useState('')
  const [editCustPlan, setEditCustPlan] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sorted tickets newest-first
  const sortedTickets = useMemo(
    () => [...allTickets].sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allTickets],
  )

  // Filtered ticket list
  const filteredTickets = useMemo(() => {
    return sortedTickets.filter((t) => {
      const customer = allCustomers.find((c) => c.id === t.customerId)
      const matchesSearch =
        !searchQuery ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer?.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || t.status?.tag === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sortedTickets, allCustomers, searchQuery, statusFilter])

  const selectedTicket = sortedTickets.find((t) => t.id === selectedTicketId) ?? null

  // Customer for the selected ticket
  const selectedCustomer = useMemo(
    () => (selectedTicket ? allCustomers.find((c) => c.id === selectedTicket.customerId) ?? null : null),
    [selectedTicket, allCustomers],
  )

  // Messages for the selected ticket (contextType=Customer, contextId=ticket.id)
  const ticketMessages = useMemo(() => {
    if (!selectedTicket) return []
    return [...allMessages]
      .filter((m) => m.contextType?.tag === 'Customer' && m.contextId === selectedTicket.id)
      .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
  }, [allMessages, selectedTicket])

  // Internal notes for selected ticket
  const ticketNotes = useMemo(() => {
    if (!selectedTicket) return []
    return [...allTicketNotes]
      .filter((n) => n.ticketId === selectedTicket.id)
      .sort((a, b) => Number(a.createdAt.toMillis()) - Number(b.createdAt.toMillis()))
  }, [allTicketNotes, selectedTicket])

  // Org-scoped canned responses
  const cannedResponses = useMemo(() => {
    if (currentOrgId === null) return []
    return allCannedResponses.filter((r) => Number(r.orgId) === currentOrgId)
  }, [allCannedResponses, currentOrgId])

  // Ticket history for the selected customer
  const customerTickets = useMemo(() => {
    if (!selectedCustomer) return []
    return sortedTickets.filter((t) => t.customerId === selectedCustomer.id)
  }, [sortedTickets, selectedCustomer])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticketMessages.length])

  // Stats
  const openCount = sortedTickets.filter((t) => t.status?.tag === 'Open' || t.status?.tag === 'New').length
  const pendingCount = sortedTickets.filter((t) => t.status?.tag === 'Pending').length
  const resolvedCount = sortedTickets.filter((t) => t.status?.tag === 'Resolved').length
  const aiResolvedCount = sortedTickets.filter((t) => t.aiAutoResolved).length

  async function handleSendMessage() {
    if (!messageInput.trim() || !selectedTicket) return
    const content = messageInput.trim()
    setMessageInput('')
    setIsSending(true)
    try {
      sendMessage({
        contextType: { tag: 'Customer' } as any,
        contextId: selectedTicket.id,
        content,
        messageType: { tag: 'Chat' } as any,
      })
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  async function handleAddNote() {
    if (!noteInput.trim() || !selectedTicket) return
    try {
      await addTicketNote({ ticketId: selectedTicket.id, content: noteInput.trim(), isInternal: true })
      setNoteInput('')
    } catch (e) {
      console.error('Failed to add note:', e)
    }
  }

  async function handleCreateCannedResponse() {
    if (!newCannedTitle.trim() || !newCannedContent.trim() || currentOrgId === null) return
    try {
      await createCannedResponse({
        orgId: BigInt(currentOrgId),
        title: newCannedTitle.trim(),
        content: newCannedContent.trim(),
        category: undefined,
      })
      setNewCannedTitle('')
      setNewCannedContent('')
      setShowCannedDialog(false)
    } catch (e) {
      console.error('Failed to create canned response:', e)
    }
  }

  function openEditCustomer() {
    if (!selectedCustomer) return
    setEditCustName(selectedCustomer.name ?? '')
    setEditCustEmail(selectedCustomer.email)
    setEditCustPhone(selectedCustomer.phone ?? '')
    setEditCustCompany(selectedCustomer.company ?? '')
    setEditCustPlan(selectedCustomer.plan ?? '')
    setEditCustomerOpen(true)
  }

  function handleUpdateCustomer() {
    if (!selectedCustomer || !editCustEmail.trim()) return
    updateCustomer({
      customerId: selectedCustomer.id,
      name: editCustName.trim() || undefined,
      email: editCustEmail.trim(),
      phone: editCustPhone.trim() || undefined,
      company: editCustCompany.trim() || undefined,
      plan: editCustPlan.trim() || undefined,
    })
    setEditCustomerOpen(false)
  }

  function slaStatus(slaDue: any): { label: string; className: string; overdue: boolean } {
    if (!slaDue) return { label: '', className: '', overdue: false }
    const due = slaDue.toMillis()
    const now = Date.now()
    const diff = due - now
    if (diff < 0) return { label: `Overdue by ${Math.ceil(Math.abs(diff) / 3_600_000)}h`, className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20', overdue: true }
    if (diff < 3_600_000) return { label: `Due in ${Math.ceil(diff / 60_000)}m`, className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', overdue: false }
    if (diff < 86_400_000) return { label: `Due in ${Math.ceil(diff / 3_600_000)}h`, className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', overdue: false }
    return { label: `SLA: ${formatDate(slaDue)}`, className: 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700', overdue: false }
  }

  function handleCreateTicket() {
    if (!newTicketCustomerId || !newTicketSubject.trim()) return
    try {
      createTicket({
        customerId: BigInt(newTicketCustomerId),
        subject: newTicketSubject.trim(),
        priority: { tag: newTicketPriority } as any,
      })
    } catch (err) {
      console.error('Failed to create ticket:', err)
    }
    setTicketDialogOpen(false)
    setNewTicketCustomerId('')
    setNewTicketSubject('')
    setNewTicketPriority('Medium')
  }

  function handleCreateCustomer() {
    if (!newCustomerEmail.trim() || currentOrgId === null) return
    try {
      createCustomer({
        name: newCustomerName.trim() || undefined,
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim() || undefined,
        company: newCustomerCompany.trim() || undefined,
        orgId: BigInt(currentOrgId),
      })
    } catch (err) {
      console.error('Failed to create customer:', err)
    }
    setCustomerDialogOpen(false)
    setNewCustomerName('')
    setNewCustomerEmail('')
    setNewCustomerPhone('')
    setNewCustomerCompany('')
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* ---- Top stats bar ---- */}
      <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Headphones className="size-4 text-white" />
          </div>
          <GradientText colors={['#8b5cf6', '#a855f7', '#7c3aed', '#8b5cf6']} animationSpeed={6} className="text-lg font-bold">
            Support
          </GradientText>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
            <CountUp to={openCount} /> Open
          </span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
            <CountUp to={pendingCount} /> Pending
          </span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
            <CountUp to={resolvedCount} /> Resolved
          </span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium tabular-nums">
            <CountUp to={aiResolvedCount} />
          </span>
          <ShinyText
            text="AI Auto-Resolved"
            speed={3}
            color="#7c3aed"
            shineColor="#a78bfa"
            className="text-sm font-medium"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* New Customer Dialog */}
          <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Name</Label>
                  <Input
                    id="customer-name"
                    placeholder="John Doe"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email *</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="john@company.com"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input
                    id="customer-phone"
                    placeholder="+1 234 567 8900"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-company">Company</Label>
                  <Input
                    id="customer-company"
                    placeholder="Acme Inc."
                    value={newCustomerCompany}
                    onChange={(e) => setNewCustomerCompany(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerEmail.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Create Customer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Ticket Dialog */}
          <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="h-3.5 w-3.5" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={newTicketCustomerId} onValueChange={setNewTicketCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCustomers.map((c) => (
                        <SelectItem key={c.id.toString()} value={c.id.toString()}>
                          {c.name ?? c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket-subject">Subject *</Label>
                  <Input
                    id="ticket-subject"
                    placeholder="Describe the issue..."
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTicketPriority} onValueChange={setNewTicketPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={!newTicketCustomerId || !newTicketSubject.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Create Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ---- 3-panel body ---- */}
      <div className="flex-1 flex min-h-0">

        {/* === LEFT PANEL: Ticket List === */}
        <div className="w-80 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
          {/* Search & filter */}
          <div className="flex-shrink-0 p-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
              />
            </div>
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket count */}
          <div className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </span>
            {filteredTickets.length > 0 && (
              <button
                onClick={() => exportCSV('support-tickets', [
                  { header: 'Subject', accessor: (t: typeof filteredTickets[0]) => t.subject },
                  { header: 'Status', accessor: (t: typeof filteredTickets[0]) => t.status?.tag ?? '' },
                  { header: 'Priority', accessor: (t: typeof filteredTickets[0]) => t.priority?.tag ?? '' },
                  { header: 'Category', accessor: (t: typeof filteredTickets[0]) => t.category?.tag ?? '' },
                  { header: 'Escalations', accessor: (t: typeof filteredTickets[0]) => t.escalationCount ?? 0 },
                  { header: 'AI Resolved', accessor: (t: typeof filteredTickets[0]) => t.aiAutoResolved ? 'Yes' : 'No' },
                  { header: 'Created', accessor: (t: typeof filteredTickets[0]) => { try { return t.createdAt.toDate().toLocaleDateString() } catch { return '' } } },
                ], filteredTickets)}
                className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500 hover:text-foreground transition-colors"
              >
                <Download className="size-3" />
                Export
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <ScrollArea className="flex-1">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 dark:text-neutral-500">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTickets.map((ticket) => {
                  const customer = allCustomers.find((c) => c.id === ticket.customerId)
                  const isSelected = ticket.id === selectedTicketId
                  return (
                    <button
                      key={ticket.id.toString()}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left px-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-950/30 border-l-2 border-violet-500'
                          : 'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Row 1: customer name + time */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${statusDot(ticket.status?.tag)}`}
                          />
                          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                            {customer?.name ?? 'Unknown Customer'}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex-shrink-0 ml-1">
                          {timeAgo(ticket.createdAt)}
                        </span>
                      </div>

                      {/* Row 2: subject */}
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mb-1.5 pl-3.5">
                        {ticket.subject}
                      </p>

                      {/* Row 3: badges */}
                      <div className="flex items-center gap-1.5 pl-3.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(ticket.status?.tag)}`}
                        >
                          {ticket.status?.tag}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityBg(ticket.priority?.tag)}`}
                        >
                          {ticket.priority?.tag}
                        </span>
                        {ticket.aiAutoResolved && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                            <Bot className="h-2.5 w-2.5" />
                            AI
                          </span>
                        )}
                        {ticket.escalationCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Escalated {ticket.escalationCount}x
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* === CENTER PANEL: Conversation === */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedTicket ? (
            <>
              {/* Ticket header */}
              <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {selectedTicket.subject}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        #{selectedTicket.id.toString()}
                      </span>

                      {/* Interactive Status Select */}
                      <Select
                        value={selectedTicket.status?.tag}
                        onValueChange={(val) => updateTicketStatus({ ticketId: selectedTicket.id, statusTag: val })}
                      >
                        <SelectTrigger className={`h-6 w-auto px-2 py-0 text-[11px] font-medium border gap-1 ${statusColor(selectedTicket.status?.tag)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['New', 'Open', 'Pending', 'Resolved', 'Closed'].map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Interactive Priority Select */}
                      <Select
                        value={selectedTicket.priority?.tag}
                        onValueChange={(val) => updateTicketPriority({ ticketId: selectedTicket.id, priorityTag: val })}
                      >
                        <SelectTrigger className={`h-6 w-auto px-2 py-0 text-[11px] font-medium border gap-1 ${priorityBg(selectedTicket.priority?.tag)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Urgent', 'High', 'Medium', 'Low'].map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Category selector */}
                      <Select
                        value={selectedTicket.category ?? '__none'}
                        onValueChange={(val) => updateTicketCategory({ ticketId: selectedTicket.id, category: val === '__none' ? '' : val })}
                      >
                        <SelectTrigger className="h-6 w-auto px-2 py-0 text-[11px] font-medium border gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700">
                          <Tag className="h-3 w-3 mr-0.5" />
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none" className="text-xs">No Category</SelectItem>
                          <SelectItem value="Billing" className="text-xs">Billing</SelectItem>
                          <SelectItem value="Technical" className="text-xs">Technical</SelectItem>
                          <SelectItem value="Account" className="text-xs">Account</SelectItem>
                          <SelectItem value="Feature Request" className="text-xs">Feature Request</SelectItem>
                          <SelectItem value="Bug Report" className="text-xs">Bug Report</SelectItem>
                          <SelectItem value="General" className="text-xs">General</SelectItem>
                        </SelectContent>
                      </Select>

                      {selectedTicket.escalationCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <ArrowUpCircle className="h-3 w-3" />
                          Escalated {selectedTicket.escalationCount}x
                        </span>
                      )}

                      {(() => {
                        const sla = slaStatus(selectedTicket.slaDue)
                        if (!sla.label) return null
                        return (
                          <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${sla.className}`}>
                            <Clock className={`h-3 w-3 ${sla.overdue ? 'animate-pulse' : ''}`} />
                            {sla.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Quick action buttons */}
                    {selectedTicket.status?.tag !== 'Resolved' && selectedTicket.status?.tag !== 'Closed' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateTicketStatus({ ticketId: selectedTicket.id, statusTag: 'Resolved' })}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Resolve
                      </Button>
                    )}
                    {(selectedTicket.status?.tag === 'Resolved' || selectedTicket.status?.tag === 'Closed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateTicketStatus({ ticketId: selectedTicket.id, statusTag: 'Open' })}
                      >
                        <AlertCircle className="h-3 w-3" />
                        Reopen
                      </Button>
                    )}

                    {selectedTicket.status?.tag !== 'Resolved' && selectedTicket.status?.tag !== 'Closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => escalateTicket({ ticketId: selectedTicket.id })}
                        title="Escalate — bumps priority up one level"
                      >
                        <ArrowUpCircle className="h-3 w-3" />
                        Escalate
                      </Button>
                    )}

                    {/* Agent Assignment */}
                    <Select
                      value={selectedTicket.assignedTo?.toHexString() ?? '__unassigned'}
                      onValueChange={(val) => {
                        if (val === '__me') {
                          assignTicket({ ticketId: selectedTicket.id, agentHex: myHex })
                        } else if (val === '__unassigned') {
                          assignTicket({ ticketId: selectedTicket.id, agentHex: '' })
                        } else {
                          assignTicket({ ticketId: selectedTicket.id, agentHex: val })
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-auto px-2 text-xs gap-1 min-w-[120px]">
                        {selectedTicket.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-blue-500" />
                            <span className="truncate max-w-[80px]">
                              {(() => {
                                const agent = orgAgents.find((e) => e.id.toHexString() === selectedTicket.assignedTo?.toHexString())
                                return agent?.name ?? 'Assigned'
                              })()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CircleDot className="h-3 w-3" />
                            Unassigned
                          </div>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__me" className="text-xs">
                          <span className="font-medium">Assign to me</span>
                        </SelectItem>
                        <SelectItem value="__unassigned" className="text-xs text-muted-foreground">
                          Unassign
                        </SelectItem>
                        {orgAgents.map((agent) => (
                          <SelectItem key={agent.id.toHexString()} value={agent.id.toHexString()} className="text-xs">
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedTicket.aiAutoResolved && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
                        <Bot className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                          AI Auto-Resolved
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message thread */}
              <ScrollArea className="flex-1 bg-neutral-50 dark:bg-neutral-950">
                <div className="px-5 py-4 space-y-4">
                  {ticketMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
                      <MailOpen className="h-10 w-10 mb-3 opacity-40" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation below</p>
                    </div>
                  ) : (
                    ticketMessages.map((msg) => {
                      const isAgent = msg.aiGenerated || !!(selectedTicket.assignedTo &&
                        msg.sender.toHexString() === selectedTicket.assignedTo.toHexString())
                      const isAI = msg.aiGenerated

                      return (
                        <div
                          key={msg.id.toString()}
                          className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback
                              className={`text-xs ${
                                isAI
                                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                  : isAgent
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              {isAI ? <Bot className="h-4 w-4" /> : isAgent ? 'AG' : 'CX'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[65%] ${isAgent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                {isAI
                                  ? 'AI Agent'
                                  : isAgent
                                  ? 'Support Agent'
                                  : selectedCustomer?.name ?? 'Customer'}
                              </span>
                              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                {formatTime(msg.sentAt)}
                              </span>
                              {isAI && msg.aiConfidence != null && (
                                <span className="text-[10px] text-violet-500">
                                  {Math.round(msg.aiConfidence * 100)}% confident
                                </span>
                              )}
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                isAgent
                                  ? isAI
                                    ? 'bg-violet-600 text-white rounded-tr-sm'
                                    : 'bg-blue-600 text-white rounded-tr-sm'
                                  : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-tl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Internal notes panel (collapsible) */}
              {showNotes && (
                <div className="flex-shrink-0 border-t border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Internal Notes</span>
                    <span className="text-[10px] text-amber-500">({ticketNotes.length})</span>
                  </div>
                  {ticketNotes.length > 0 && (
                    <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                      {ticketNotes.map((note) => {
                        const author = allEmployees.find((e) => e.id.toHexString() === note.author.toHexString())
                        return (
                          <div key={note.id.toString()} className="bg-amber-100/60 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs group relative">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-medium text-amber-800 dark:text-amber-300">{author?.name ?? 'Agent'}</span>
                              <span className="text-amber-500 dark:text-amber-600">{timeAgo(note.createdAt)}</span>
                            </div>
                            <p className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{note.content}</p>
                            {identity && note.author.toHexString() === identity.toHexString() && (
                              <button
                                onClick={() => deleteTicketNote({ noteId: note.id })}
                                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-amber-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add internal note..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                      className="flex-1 h-8 text-xs bg-white dark:bg-neutral-900 border-amber-200 dark:border-amber-800"
                    />
                    <Button size="sm" onClick={handleAddNote} disabled={!noteInput.trim()} className="h-8 px-2 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Canned response picker */}
              {showCannedPicker && cannedResponses.length > 0 && (
                <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-neutral-400 mb-1.5">Quick Replies</p>
                  <div className="space-y-1">
                    {cannedResponses.map((resp) => (
                      <button
                        key={resp.id.toString()}
                        onClick={() => {
                          setMessageInput(resp.content)
                          setShowCannedPicker(false)
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors group"
                      >
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{resp.title}</span>
                        <p className="text-[10px] text-neutral-400 truncate">{resp.content}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message composer */}
              <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setShowNotes(!showNotes); setShowCannedPicker(false) }}
                      className={`p-1.5 rounded-md transition-colors ${showNotes ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                      title="Internal notes"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setShowCannedPicker(!showCannedPicker); setShowNotes(false) }}
                      className={`p-1.5 rounded-md transition-colors ${showCannedPicker ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                      title="Canned responses"
                    >
                      <BookTemplate className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="Type a reply..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    className="flex-1 h-9 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="h-9 px-3 bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1.5 px-0.5">
                  Press Enter to send · <button onClick={() => setShowCannedDialog(true)} className="text-violet-500 hover:text-violet-600">Manage canned responses</button>
                </p>
              </div>

              {/* Create canned response dialog */}
              <Dialog open={showCannedDialog} onOpenChange={setShowCannedDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Canned Responses</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {cannedResponses.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cannedResponses.map((resp) => (
                          <div key={resp.id.toString()} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-neutral-50 dark:bg-neutral-900">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{resp.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{resp.content}</p>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => deleteCannedResponse({ responseId: resp.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input value={newCannedTitle} onChange={(e) => setNewCannedTitle(e.target.value)} placeholder="e.g. Greeting" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Response content</Label>
                        <Textarea value={newCannedContent} onChange={(e) => setNewCannedContent(e.target.value)} placeholder="Type the canned response text..." className="mt-1" rows={3} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCannedDialog(false)}>Close</Button>
                    <Button onClick={handleCreateCannedResponse} disabled={!newCannedTitle.trim() || !newCannedContent.trim()}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Response
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-950">
              <Ticket className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-base font-medium">Select a ticket</p>
              <p className="text-sm mt-1">Choose a ticket from the list to view the conversation</p>
            </div>
          )}
        </div>

        {/* === RIGHT PANEL: Customer Details === */}
        <div className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
          {selectedCustomer ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Customer identity */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
                      {(selectedCustomer.name ?? selectedCustomer.email)[0]?.toUpperCase() ?? 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {selectedCustomer.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {selectedCustomer.email}
                    </p>
                    {selectedCustomer.company && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                        {selectedCustomer.company}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={openEditCustomer}
                    className="shrink-0 size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Edit customer"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                </div>

                <Separator />

                {/* Sentiment & Health */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Customer Health
                  </p>

                  {selectedCustomer.sentiment && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Sentiment</span>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${sentimentColor(selectedCustomer.sentiment?.tag)}`}>
                        {sentimentIcon(selectedCustomer.sentiment?.tag)}
                        {selectedCustomer.sentiment?.tag}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.healthScore != null && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Health Score</span>
                        <span className={`text-xs font-semibold ${healthColor(selectedCustomer.healthScore)}`}>
                          {Math.round(selectedCustomer.healthScore * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={selectedCustomer.healthScore * 100}
                        className={`h-1.5 bg-neutral-100 dark:bg-neutral-800 ${healthBarColor(selectedCustomer.healthScore)}`}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Plan & Value */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Account
                  </p>

                  {selectedCustomer.plan && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Plan</span>
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                        {selectedCustomer.plan}
                      </span>
                    </div>
                  )}

                  {selectedCustomer.lifetimeValue != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Lifetime Value</span>
                      <span className="text-xs font-semibold text-emerald-600">
                        ${selectedCustomer.lifetimeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}

                  {selectedCustomer.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Phone</span>
                      <span className="text-xs text-neutral-700 dark:text-neutral-300">{selectedCustomer.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Member Since</span>
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                      {formatDate(selectedCustomer.createdAt)}
                    </span>
                  </div>

                  {selectedCustomer.lastContact && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Last Contact</span>
                      <span className="text-xs text-neutral-700 dark:text-neutral-300">
                        {timeAgo(selectedCustomer.lastContact)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Customer summary / AI notes */}
                {selectedCustomer.summary && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        AI Summary
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {selectedCustomer.summary}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Ticket history */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Ticket History ({customerTickets.length})
                  </p>

                  {customerTickets.length === 0 ? (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">No previous tickets</p>
                  ) : (
                    <div className="space-y-1.5">
                      {customerTickets.map((t) => (
                        <button
                          key={t.id.toString()}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                            t.id === selectedTicketId
                              ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30'
                              : 'border-neutral-100 dark:border-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusColor(t.status?.tag)}`}
                            >
                              {t.status?.tag}
                            </span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              {timeAgo(t.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{t.subject}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 p-6">
              <User className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm text-center">Select a ticket to view customer details</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ec-name">Name</Label>
              <Input id="ec-name" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ec-email">Email *</Label>
              <Input id="ec-email" type="email" value={editCustEmail} onChange={(e) => setEditCustEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ec-phone">Phone</Label>
                <Input id="ec-phone" value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ec-company">Company</Label>
                <Input id="ec-company" value={editCustCompany} onChange={(e) => setEditCustCompany(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select value={editCustPlan || '__none'} onValueChange={(v) => setEditCustPlan(v === '__none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No Plan</SelectItem>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomerOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateCustomer} disabled={!editCustEmail.trim()} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
