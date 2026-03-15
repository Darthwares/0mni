'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useRef, useEffect } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'

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
  const { currentOrgId } = useOrg()
  const [allTickets] = useTable(tables.ticket)
  const [allCustomers] = useTable(tables.customer)
  const [allMessages] = useTable(tables.message)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)
  const createTicket = useSpacetimeReducer(reducers.createTicket)
  const createCustomer = useSpacetimeReducer(reducers.createCustomer)

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
      const matchesStatus = statusFilter === 'All' || t.status.tag === statusFilter
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
      .filter((m) => m.contextType.tag === 'Customer' && m.contextId === selectedTicket.id)
      .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
  }, [allMessages, selectedTicket])

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
  const openCount = sortedTickets.filter((t) => t.status.tag === 'Open' || t.status.tag === 'New').length
  const pendingCount = sortedTickets.filter((t) => t.status.tag === 'Pending').length
  const resolvedCount = sortedTickets.filter((t) => t.status.tag === 'Resolved').length
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
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
            <CountUp to={aiResolvedCount} /> AI Auto-Resolved
          </span>
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
          <div className="flex-shrink-0 px-3 py-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-medium border-b border-neutral-100 dark:border-neutral-800">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
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
                            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${statusDot(ticket.status.tag)}`}
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
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(ticket.status.tag)}`}
                        >
                          {ticket.status.tag}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityBg(ticket.priority.tag)}`}
                        >
                          {ticket.priority.tag}
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
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        #{selectedTicket.id.toString()}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusColor(selectedTicket.status.tag)}`}
                      >
                        {selectedTicket.status.tag}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBg(selectedTicket.priority.tag)}`}
                      >
                        {selectedTicket.priority.tag} priority
                      </span>
                      {selectedTicket.category && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {selectedTicket.category}
                        </span>
                      )}
                      {selectedTicket.slaDue && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" />
                          SLA: {formatDate(selectedTicket.slaDue)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedTicket.aiAutoResolved && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
                        <Bot className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                          AI Auto-Resolved
                        </span>
                      </div>
                    )}
                    {selectedTicket.assignedTo && !selectedTicket.aiAutoResolved && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Assigned</span>
                      </div>
                    )}
                    {!selectedTicket.assignedTo && !selectedTicket.aiAutoResolved && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        <CircleDot className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Unassigned</span>
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

              {/* Message composer */}
              <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
                <div className="flex items-center gap-2">
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
                  Press Enter to send
                </p>
              </div>
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
                  <div className="min-w-0">
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
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${sentimentColor(selectedCustomer.sentiment.tag)}`}>
                        {sentimentIcon(selectedCustomer.sentiment.tag)}
                        {selectedCustomer.sentiment.tag}
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
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusColor(t.status.tag)}`}
                            >
                              {t.status.tag}
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
      </div>
    </div>
  )
}
