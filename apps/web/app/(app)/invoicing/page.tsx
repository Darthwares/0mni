'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  X,
  Trash2,
  Send,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Pencil,
  Download,
  Copy,
  MoreHorizontal,
  TrendingUp,
  Receipt,
  Ban,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTooltipProps, chartAxisProps, chartGridProps } from '@/lib/chart-theme'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { exportCSV } from '@/lib/csv-export'
import { Separator } from '@/components/ui/separator'
import ShinyText from '@/components/reactbits/ShinyText'
import { PresenceBar, PagePresenceStrip } from '@/components/presence-bar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'

// ─── Helpers ────────────────────────────────────────────────────────────────

type StatusTag = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled'

function getTag(enumVal: unknown): string {
  if (!enumVal || typeof enumVal !== 'object') return ''
  return (enumVal as { tag?: string }).tag ?? ''
}

function tsToDate(ts: unknown): Date {
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
    return new Date(0)
  }
  return new Date(ms)
}

function dateToTimestamp(d: Date): bigint {
  return BigInt(d.getTime()) * BigInt(1000)
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function fmtCents(cents: number | bigint): string {
  return currencyFmt.format(Number(cents) / 100)
}

function fmtDate(d: Date): string {
  if (d.getTime() === 0) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClass(status: StatusTag): string {
  switch (status) {
    case 'Draft':     return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    case 'Sent':      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Paid':      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Overdue':   return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'Cancelled': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
    default:          return ''
  }
}

function statusDot(status: StatusTag): string {
  switch (status) {
    case 'Draft':     return 'bg-neutral-400'
    case 'Sent':      return 'bg-blue-500'
    case 'Paid':      return 'bg-green-500'
    case 'Overdue':   return 'bg-red-500'
    case 'Cancelled': return 'bg-neutral-400'
    default:          return ''
  }
}

// ─── Line item helper type for create form ──────────────────────────────────

type NewLineItem = {
  key: number
  description: string
  quantity: number
  unitPrice: number
}

let lineItemCounter = 0

// ─── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = 'all' | StatusTag

const FILTER_TABS: { label: string; value: FilterTab; dot: string }[] = [
  { label: 'All',      value: 'all',       dot: '' },
  { label: 'Draft',    value: 'Draft',     dot: 'bg-neutral-400' },
  { label: 'Sent',     value: 'Sent',      dot: 'bg-blue-500' },
  { label: 'Paid',     value: 'Paid',      dot: 'bg-green-500' },
  { label: 'Overdue',  value: 'Overdue',   dot: 'bg-red-500' },
  { label: 'Cancelled', value: 'Cancelled', dot: 'bg-neutral-400' },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const { currentOrgId } = useOrg()

  // SpacetimeDB
  const allInvoices = useTable(tables.invoice)
  const allLineItems = useTable(tables.invoice_line_item)
  const createInvoice = useReducer(reducers.createInvoice)
  const updateInvoiceStatus = useReducer(reducers.updateInvoiceStatus)
  const deleteInvoice = useReducer(reducers.deleteInvoice)
  const updateInvoice = useReducer(reducers.updateInvoice)
  const updateInvoiceLineItem = useReducer(reducers.updateInvoiceLineItem)
  const addInvoiceLineItem = useReducer(reducers.addInvoiceLineItem)
  const removeInvoiceLineItem = useReducer(reducers.removeInvoiceLineItem)

  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [sortField, setSortField] = useState<'date' | 'amount' | 'client' | 'due' | 'status'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Edit invoice dialog state
  const [editInvOpen, setEditInvOpen] = useState(false)
  const [editInvClient, setEditInvClient] = useState('')
  const [editInvEmail, setEditInvEmail] = useState('')
  const [editInvTax, setEditInvTax] = useState('')
  const [editInvNotes, setEditInvNotes] = useState('')
  const [editInvDueDate, setEditInvDueDate] = useState('')

  // Create form state
  const [newClient, setNewClient] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTax, setNewTax] = useState('8')
  const [newNotes, setNewNotes] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newLineItems, setNewLineItems] = useState<NewLineItem[]>([
    { key: ++lineItemCounter, description: '', quantity: 1, unitPrice: 0 },
  ])

  // Org-scoped invoices
  const invoices = useMemo(() => {
    if (currentOrgId === null) return []
    return allInvoices
      .filter(inv => inv.orgId === BigInt(currentOrgId))
      .sort((a, b) => Number(b.issuedAt) - Number(a.issuedAt))
  }, [allInvoices, currentOrgId])

  // Get line items for an invoice
  function getLineItems(invoiceId: bigint | number) {
    return allLineItems
      .filter(li => Number(li.invoiceId) === Number(invoiceId))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Calculate totals
  function invoiceSubtotal(invoiceId: bigint | number): number {
    return getLineItems(invoiceId).reduce(
      (sum, li) => sum + li.quantity * Number(li.unitPriceCents),
      0
    )
  }

  function invoiceTotal(inv: typeof invoices[number]): number {
    const sub = invoiceSubtotal(inv.id)
    const taxRate = parseFloat(inv.taxRate) || 0
    return sub + sub * (taxRate / 100)
  }

  // Filtered
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const statusTag = getTag(inv.status) as StatusTag
      if (filterTab !== 'all' && statusTag !== filterTab) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !inv.clientName.toLowerCase().includes(q) &&
          !inv.invoiceNumber.toLowerCase().includes(q) &&
          !inv.clientEmail.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [invoices, filterTab, search])

  // Stats
  const stats = useMemo(() => {
    const paidTotal = invoices
      .filter(i => getTag(i.status) === 'Paid')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const outstanding = invoices
      .filter(i => getTag(i.status) === 'Sent' || getTag(i.status) === 'Overdue')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const overdueAmt = invoices
      .filter(i => getTag(i.status) === 'Overdue')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const now = new Date()
    const thisMonth = invoices.filter(i => {
      const d = tsToDate(i.issuedAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { paidTotal: Math.round(paidTotal / 100), outstanding: Math.round(outstanding / 100), overdueAmt: Math.round(overdueAmt / 100), thisMonth }
  }, [invoices, allLineItems])

  // Chart: status distribution
  const STATUS_CHART_COLORS: Record<string, string> = { Draft: '#a3a3a3', Sent: '#3b82f6', Paid: '#22c55e', Overdue: '#ef4444', Cancelled: '#737373' }
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const inv of invoices) {
      const s = getTag(inv.status) || 'Draft'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_CHART_COLORS[name] ?? '#737373',
    }))
  }, [invoices])

  // Chart: revenue by status (dollars)
  const revenueByStatus = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const inv of invoices) {
      const s = getTag(inv.status) || 'Draft'
      const total = Math.round(invoiceTotal(inv) / 100)
      totals[s] = (totals[s] ?? 0) + total
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: STATUS_CHART_COLORS[name] ?? '#737373',
      }))
  }, [invoices, allLineItems])

  // Chart: top clients by revenue
  const topClients = useMemo(() => {
    const clientTotals: Record<string, number> = {}
    for (const inv of invoices) {
      const name = inv.clientName || 'Unknown'
      const total = Math.round(invoiceTotal(inv) / 100)
      clientTotals[name] = (clientTotals[name] ?? 0) + total
    }
    return Object.entries(clientTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        name: name.length > 16 ? name.slice(0, 14) + '…' : name,
        value,
      }))
  }, [invoices, allLineItems])

  // Selected invoice
  const selected = selectedId !== null ? invoices.find(i => Number(i.id) === selectedId) ?? null : null

  // Line item helpers for create form
  function addLineItem() {
    setNewLineItems(prev => [...prev, { key: ++lineItemCounter, description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeLineItem(key: number) {
    setNewLineItems(prev => prev.filter(li => li.key !== key))
  }

  function updateLineItem(key: number, field: 'description' | 'quantity' | 'unitPrice', value: string | number) {
    setNewLineItems(prev =>
      prev.map(li => (li.key === key ? { ...li, [field]: value } : li))
    )
  }

  const newSubtotal = newLineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const newTaxAmt = newSubtotal * (parseFloat(newTax) || 0) / 100
  const newTotal = newSubtotal + newTaxAmt

  function resetForm() {
    setNewClient('')
    setNewEmail('')
    setNewTax('8')
    setNewNotes('')
    setNewDueDate('')
    setNewLineItems([{ key: ++lineItemCounter, description: '', quantity: 1, unitPrice: 0 }])
  }

  const handleCreate = useCallback(() => {
    if (!newClient.trim() || !newEmail.trim() || currentOrgId === null) return
    const validItems = newLineItems.filter(li => li.description.trim())
    if (validItems.length === 0) return

    // Encode line items: "description|quantity|priceCents\n..."
    const lineItemsData = validItems
      .map(li => `${li.description}|${li.quantity}|${Math.round(li.unitPrice * 100)}`)
      .join('\n')

    const dueDate = newDueDate
      ? dateToTimestamp(new Date(newDueDate))
      : dateToTimestamp(new Date(Date.now() + 30 * 86400000))

    createInvoice({
      orgId: BigInt(currentOrgId),
      clientName: newClient.trim(),
      clientEmail: newEmail.trim(),
      taxRate: newTax,
      notes: newNotes.trim(),
      dueDate,
      lineItemsData,
    })
    setCreateOpen(false)
    resetForm()
  }, [newClient, newEmail, newTax, newNotes, newDueDate, newLineItems, currentOrgId, createInvoice])

  function handleStatusChange(id: number, status: StatusTag) {
    updateInvoiceStatus({ invoiceId: BigInt(id), statusTag: status })
  }

  function openEditInvoice() {
    if (!selected) return
    setEditInvClient(selected.clientName)
    setEditInvEmail(selected.clientEmail)
    setEditInvTax(selected.taxRate)
    setEditInvNotes(selected.notes)
    const due = tsToDate(selected.dueDate)
    setEditInvDueDate(due.getTime() > 0 ? due.toISOString().split('T')[0] : '')
    setEditInvOpen(true)
  }

  const handleEditInvoice = useCallback(() => {
    if (!selected || !editInvClient.trim()) return
    const dueDate = editInvDueDate
      ? dateToTimestamp(new Date(editInvDueDate))
      : dateToTimestamp(new Date(Date.now() + 30 * 86400000))
    updateInvoice({
      invoiceId: selected.id,
      clientName: editInvClient.trim(),
      clientEmail: editInvEmail.trim(),
      taxRate: editInvTax,
      notes: editInvNotes.trim(),
      dueDate,
    })
    setEditInvOpen(false)
  }, [selected, editInvClient, editInvEmail, editInvTax, editInvNotes, editInvDueDate, updateInvoice])

  // Sort toggle
  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'client' ? 'asc' : 'desc') }
  }

  // Sorted + filtered
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortField) {
        case 'date': return dir * (Number(a.issuedAt) - Number(b.issuedAt))
        case 'amount': return dir * (invoiceTotal(a) - invoiceTotal(b))
        case 'client': return dir * a.clientName.localeCompare(b.clientName)
        case 'due': return dir * (Number(a.dueDate) - Number(b.dueDate))
        case 'status': return dir * (getTag(a.status) as string).localeCompare(getTag(b.status) as string)
        default: return 0
      }
    })
    return arr
  }, [filtered, sortField, sortDir, allLineItems])

  // Due date urgency
  function dueUrgency(inv: typeof invoices[number]): { text: string; className: string } | null {
    const tag = getTag(inv.status)
    if (tag === 'Paid' || tag === 'Cancelled' || tag === 'Draft') return null
    const due = tsToDate(inv.dueDate)
    if (due.getTime() === 0) return null
    const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, className: 'text-red-500 font-medium' }
    if (days <= 3) return { text: `Due in ${days}d`, className: 'text-amber-500 font-medium' }
    if (days <= 7) return { text: `Due in ${days}d`, className: 'text-amber-400/80' }
    return null
  }

  // Duplicate invoice
  function handleDuplicate(inv: typeof invoices[number]) {
    if (currentOrgId === null) return
    const items = getLineItems(inv.id)
    const lineItemsData = items
      .map(li => `${li.description}|${li.quantity}|${Number(li.unitPriceCents)}`)
      .join('\n')
    const dueDate = dateToTimestamp(new Date(Date.now() + 30 * 86400000))
    createInvoice({
      orgId: BigInt(currentOrgId),
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      taxRate: inv.taxRate,
      notes: inv.notes,
      dueDate,
      lineItemsData,
    })
  }

  // Delete with confirmation
  function confirmDelete() {
    if (deleteConfirmId === null) return
    deleteInvoice({ invoiceId: BigInt(deleteConfirmId) })
    if (selectedId === deleteConfirmId) setSelectedId(null)
    setDeleteConfirmId(null)
  }

  // ── Invoice detail view ─────────────────────────────────────────────────
  if (selected) {
    const items = getLineItems(selected.id)
    const sub = items.reduce((s, li) => s + li.quantity * Number(li.unitPriceCents), 0)
    const taxRate = parseFloat(selected.taxRate) || 0
    const taxAmt = sub * (taxRate / 100)
    const total = sub + taxAmt
    const statusTag = getTag(selected.status) as StatusTag
    const paidDate = tsToDate(selected.paidAt)

    return (
      <div className="flex flex-col h-full">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <FileText className="size-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <GradientText colors={['#059669', '#10b981', '#34d399']} animationSpeed={6}>
                Invoicing
              </GradientText>
            </h1>
          </div>
          <PresenceBar />
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-4" />
            Back to invoices
          </button>

          <Card className="max-w-3xl mx-auto w-full">
            <CardContent className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Your Company</h2>
                  <p className="text-sm text-muted-foreground mt-1">123 Business Avenue</p>
                  <p className="text-sm text-muted-foreground">San Francisco, CA 94102</p>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    INVOICE
                  </h3>
                  <p className="text-sm font-medium mt-1">{selected.invoiceNumber}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(statusTag)}`}>
                      <span className={`size-1.5 rounded-full ${statusDot(statusTag)}`} />
                      {statusTag}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border mb-6" />

              {/* Client + dates */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Bill To</p>
                  <p className="font-medium">{selected.clientName}</p>
                  <p className="text-sm text-muted-foreground">{selected.clientEmail}</p>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Issue Date</p>
                    <p className="text-sm font-medium">{fmtDate(tsToDate(selected.issuedAt))}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Due Date</p>
                    <p className="text-sm font-medium">{fmtDate(tsToDate(selected.dueDate))}</p>
                  </div>
                  {paidDate.getTime() > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Paid On</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{fmtDate(paidDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="rounded-lg border overflow-hidden mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold pl-4">Description</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center w-20">Qty</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right w-28">Unit Price</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right pr-4 w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(li => (
                      <TableRow key={Number(li.id)}>
                        <TableCell className="pl-4 font-medium text-sm">{li.description}</TableCell>
                        <TableCell className="text-center tabular-nums">{li.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCents(li.unitPriceCents)}</TableCell>
                        <TableCell className="text-right pr-4 tabular-nums font-medium">
                          {fmtCents(BigInt(li.quantity) * li.unitPriceCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums font-medium">{fmtCents(sub)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span className="tabular-nums font-medium">{fmtCents(Math.round(taxAmt))}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCents(Math.round(total))}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-border/60 p-4">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selected.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
            <Button variant="outline" onClick={openEditInvoice}>
              <Pencil className="size-4 mr-1.5" />
              Edit Details
            </Button>
            {statusTag === 'Draft' && (
              <Button
                onClick={() => handleStatusChange(Number(selected.id), 'Sent')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
              >
                <Send className="size-4 mr-1.5" />
                Mark as Sent
              </Button>
            )}
            {(statusTag === 'Sent' || statusTag === 'Overdue') && (
              <Button
                onClick={() => handleStatusChange(Number(selected.id), 'Paid')}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0"
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                Mark as Paid
              </Button>
            )}
            {statusTag !== 'Cancelled' && statusTag !== 'Paid' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange(Number(selected.id), 'Cancelled')}
                className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <Ban className="size-4 mr-1.5" />
                Cancel Invoice
              </Button>
            )}
            <Button variant="outline" onClick={() => { handleDuplicate(selected); setSelectedId(null) }}>
              <Copy className="size-4 mr-1.5" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(Number(selected.id))}
              className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 ml-auto"
            >
              <Trash2 className="size-4 mr-1.5" />
              Delete
            </Button>
          </div>

          {/* Edit Invoice Dialog */}
          <Dialog open={editInvOpen} onOpenChange={setEditInvOpen}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Invoice Details</DialogTitle></DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Client Name *</Label>
                    <Input value={editInvClient} onChange={e => setEditInvClient(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Client Email</Label>
                    <Input type="email" value={editInvEmail} onChange={e => setEditInvEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tax Rate (%)</Label>
                    <Input type="number" min={0} step={0.5} value={editInvTax} onChange={e => setEditInvTax(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={editInvDueDate} onChange={e => setEditInvDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea value={editInvNotes} onChange={e => setEditInvNotes(e.target.value)} className="min-h-20" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditInvOpen(false)}>Cancel</Button>
                <Button onClick={handleEditInvoice} disabled={!editInvClient.trim()} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-full bg-red-500/10">
                    <Trash2 className="size-4 text-red-500" />
                  </div>
                  Delete Invoice
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-2">
                This action cannot be undone. The invoice and all its line items will be permanently deleted.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                  Delete Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
            <FileText className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <GradientText colors={['#059669', '#10b981', '#34d399']} animationSpeed={6}>
              Invoicing
            </GradientText>
          </h1>
        </div>
        <PresenceBar />
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BlurText text="Create, track, and manage invoices" delay={35} animateBy="words" className="text-sm text-muted-foreground" />
            <PagePresenceStrip className="hidden xl:flex" />
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV('invoices', [
                  { header: 'Invoice #', accessor: (i: typeof filtered[0]) => i.invoiceNumber },
                  { header: 'Client', accessor: (i: typeof filtered[0]) => i.clientName },
                  { header: 'Email', accessor: (i: typeof filtered[0]) => i.clientEmail },
                  { header: 'Status', accessor: (i: typeof filtered[0]) => getTag(i.status) },
                  { header: 'Total', accessor: (i: typeof filtered[0]) => (invoiceTotal(i) / 100).toFixed(2) },
                  { header: 'Issued', accessor: (i: typeof filtered[0]) => tsToDate(i.issuedAt).toLocaleDateString() },
                  { header: 'Due', accessor: (i: typeof filtered[0]) => tsToDate(i.dueAt).toLocaleDateString() },
                  { header: 'Tax Rate %', accessor: (i: typeof filtered[0]) => i.taxRate },
                  { header: 'Notes', accessor: (i: typeof filtered[0]) => i.notes },
                ], filtered)}
              >
                <Download className="size-4 mr-1.5" />
                Export
              </Button>
            )}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
            <DialogTrigger render={<Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25 border-0" />}>
              <Plus className="size-4 mr-1.5" />
              New Invoice
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-client">Client Name *</Label>
                    <Input id="inv-client" placeholder="Acme Corporation" value={newClient} onChange={(e) => setNewClient(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-email">Client Email *</Label>
                    <Input id="inv-email" type="email" placeholder="billing@acme.co" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                </div>

                {/* Line items */}
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addLineItem} className="h-7 text-xs">
                      <Plus className="size-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold pl-3">Description</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-20">Qty</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-28">Unit Price</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right w-24">Total</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newLineItems.map(li => (
                          <TableRow key={li.key}>
                            <TableCell className="pl-3 py-1.5">
                              <Input placeholder="Service description" value={li.description} onChange={(e) => updateLineItem(li.key, 'description', e.target.value)} className="h-8 text-sm" />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input type="number" min={1} value={li.quantity} onChange={(e) => updateLineItem(li.key, 'quantity', parseInt(e.target.value) || 0)} className="h-8 text-sm text-center" />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input type="number" min={0} step={0.01} value={li.unitPrice} onChange={(e) => updateLineItem(li.key, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                            </TableCell>
                            <TableCell className="py-1.5 text-right tabular-nums text-sm font-medium">
                              {currencyFmt.format(li.quantity * li.unitPrice)}
                            </TableCell>
                            <TableCell className="py-1.5 pr-2">
                              {newLineItems.length > 1 && (
                                <button type="button" onClick={() => removeLineItem(li.key)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums font-medium">{currencyFmt.format(newSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax ({parseFloat(newTax) || 0}%)</span>
                        <span className="tabular-nums font-medium">{currencyFmt.format(newTaxAmt)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{currencyFmt.format(newTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inv-tax">Tax (%)</Label>
                    <Input id="inv-tax" type="number" min={0} step={0.5} value={newTax} onChange={(e) => setNewTax(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inv-due">Due Date</Label>
                    <Input id="inv-due" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="inv-notes">Notes</Label>
                  <Textarea id="inv-notes" placeholder="Payment terms, additional info..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="min-h-20" />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newClient.trim() || !newEmail.trim() || !newLineItems.some(li => li.description.trim())}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0"
                >
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <DollarSign className="size-3.5 text-white" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              $<CountUp to={stats.paidTotal} duration={1.5} separator="," />
            </p>
          </SpotlightCard>

          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Clock className="size-3.5 text-white" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              $<CountUp to={stats.outstanding} duration={1.5} separator="," />
            </p>
          </SpotlightCard>

          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                <AlertTriangle className="size-3.5 text-white" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overdue</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              $<CountUp to={stats.overdueAmt} duration={1.5} separator="," />
            </p>
          </SpotlightCard>

          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Calendar className="size-3.5 text-white" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">This Month</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <CountUp to={stats.thisMonth} duration={1.5} />
            </p>
          </SpotlightCard>
        </div>

        {/* Insights charts */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status distribution donut */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice Status</h3>
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value: number, name: string) => [`${value} invoice${value !== 1 ? 's' : ''}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {statusPieData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>

            {/* Revenue by status bar */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue by Status</h3>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByStatus} barSize={28} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <XAxis dataKey="name" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}K` : v}`} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {revenueByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top clients */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Clients</h3>
              {topClients.length > 0 ? (
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClients} layout="vertical" barSize={14} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                      <XAxis type="number" {...chartAxisProps} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}K` : v}`} />
                      <YAxis type="category" dataKey="name" {...chartAxisProps} width={80} />
                      <RechartsTooltip
                        {...chartTooltipProps}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="url(#invoiceClientGrad)" />
                      <defs>
                        <linearGradient id="invoiceClientGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[150px]">
                  <p className="text-xs text-muted-foreground">No client data</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(tab => {
            const count = tab.value === 'all'
              ? invoices.length
              : invoices.filter(i => getTag(i.status) === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setFilterTab(tab.value)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  filterTab === tab.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700',
                ].join(' ')}
              >
                {tab.dot && <span className={`size-1.5 rounded-full ${tab.dot}`} />}
                {tab.label}
                <span className="ml-0.5 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by client or invoice number..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {(filterTab !== 'all' || search) && (
            <button onClick={() => { setFilterTab('all'); setSearch('') }} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors">
              Clear filters
            </button>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} of {invoices.length} invoices
          </span>
        </div>

        {/* Invoice table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                  <FileText className="size-6 opacity-40" />
                </div>
                <p className="font-medium">No invoices found</p>
                <p className="text-sm mt-1">
                  {invoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Invoice #</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                      <button onClick={() => toggleSort('client')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Client {sortField === 'client' && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">
                      <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                        Amount {sortField === 'amount' && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                      <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Status {sortField === 'status' && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                      <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Issued {sortField === 'date' && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                      <button onClick={() => toggleSort('due')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Due Date {sortField === 'due' && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiltered.map(inv => {
                    const total = invoiceTotal(inv)
                    const statusTag = getTag(inv.status) as StatusTag
                    const urgency = dueUrgency(inv)
                    const itemCount = getLineItems(inv.id).length
                    return (
                      <TableRow
                        key={Number(inv.id)}
                        className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedId(Number(inv.id))}
                      >
                        <TableCell className="pl-4">
                          <div>
                            <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                            <p className="text-[10px] text-muted-foreground/60">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white text-xs font-bold shrink-0">
                              {inv.clientName[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{inv.clientName}</p>
                              <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold tabular-nums text-sm">{fmtCents(Math.round(total))}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(statusTag)}`}>
                            <span className={`size-1.5 rounded-full ${statusDot(statusTag)}`} />
                            {statusTag}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(tsToDate(inv.issuedAt))}</TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm text-muted-foreground">{fmtDate(tsToDate(inv.dueDate))}</span>
                            {urgency && <p className={`text-[10px] ${urgency.className}`}>{urgency.text}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {statusTag === 'Draft' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10" onClick={() => handleStatusChange(Number(inv.id), 'Sent')}>
                                <Send className="size-3 mr-1" />
                                Send
                              </Button>
                            )}
                            {(statusTag === 'Sent' || statusTag === 'Overdue') && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-500/10" onClick={() => handleStatusChange(Number(inv.id), 'Paid')}>
                                <CheckCircle2 className="size-3 mr-1" />
                                Paid
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleDuplicate(inv)}>
                              <Copy className="size-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setDeleteConfirmId(Number(inv.id))}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Delete Confirmation Dialog (list view) */}
        <Dialog open={deleteConfirmId !== null && selectedId === null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-full bg-red-500/10">
                  <Trash2 className="size-4 text-red-500" />
                </div>
                Delete Invoice
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              This action cannot be undone. The invoice and all its line items will be permanently deleted.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                Delete Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
