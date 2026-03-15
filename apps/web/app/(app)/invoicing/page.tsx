'use client'

import { useState, useMemo } from 'react'
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
  Building2,
  Mail,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

// ─── Types ──────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

type LineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

type Invoice = {
  id: string
  number: string
  client: string
  clientEmail: string
  status: InvoiceStatus
  lineItems: LineItem[]
  tax: number
  notes: string
  issuedAt: Date
  dueDate: Date
  paidAt?: Date
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function fmtCurrency(v: number) {
  return currencyFmt.format(v)
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function invoiceSubtotal(items: LineItem[]): number {
  return items.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
}

function invoiceTotal(inv: Invoice): number {
  const sub = invoiceSubtotal(inv.lineItems)
  return sub + sub * (inv.tax / 100)
}

function statusBadgeClass(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':     return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    case 'sent':      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'paid':      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'overdue':   return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'cancelled': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function statusDot(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':     return 'bg-neutral-400'
    case 'sent':      return 'bg-blue-500'
    case 'paid':      return 'bg-green-500'
    case 'overdue':   return 'bg-red-500'
    case 'cancelled': return 'bg-neutral-400'
  }
}

function statusLabel(status: InvoiceStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// ─── Sample data ────────────────────────────────────────────────────────────

const now = new Date()
const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: generateId(), number: 'INV-001', client: 'Acme Corporation', clientEmail: 'billing@acme.co',
    status: 'paid', tax: 8,
    lineItems: [
      { id: generateId(), description: 'Web application development', quantity: 80, unitPrice: 150 },
      { id: generateId(), description: 'UI/UX design consultation', quantity: 20, unitPrice: 125 },
    ],
    notes: 'Thank you for your business!',
    issuedAt: day(-45), dueDate: day(-15), paidAt: day(-12),
  },
  {
    id: generateId(), number: 'INV-002', client: 'TechStart Inc.', clientEmail: 'ap@techstart.io',
    status: 'paid', tax: 10,
    lineItems: [
      { id: generateId(), description: 'API integration services', quantity: 40, unitPrice: 175 },
      { id: generateId(), description: 'Database optimization', quantity: 15, unitPrice: 200 },
    ],
    notes: 'Net 30 payment terms.',
    issuedAt: day(-60), dueDate: day(-30), paidAt: day(-28),
  },
  {
    id: generateId(), number: 'INV-003', client: 'Global Logistics Ltd.', clientEmail: 'finance@globallog.com',
    status: 'sent', tax: 7.5,
    lineItems: [
      { id: generateId(), description: 'Supply chain dashboard development', quantity: 120, unitPrice: 140 },
      { id: generateId(), description: 'Real-time tracking module', quantity: 60, unitPrice: 160 },
    ],
    notes: 'Phase 1 of 3. Remaining phases billed separately.',
    issuedAt: day(-10), dueDate: day(20),
  },
  {
    id: generateId(), number: 'INV-004', client: 'Meridian Health', clientEmail: 'accounts@meridianhealth.org',
    status: 'overdue', tax: 8,
    lineItems: [
      { id: generateId(), description: 'Patient portal development', quantity: 100, unitPrice: 165 },
      { id: generateId(), description: 'HIPAA compliance audit', quantity: 10, unitPrice: 300 },
    ],
    notes: 'Payment overdue. Please remit immediately.',
    issuedAt: day(-50), dueDate: day(-20),
  },
  {
    id: generateId(), number: 'INV-005', client: 'Bloom & Grow Studios', clientEmail: 'hello@bloomgrow.design',
    status: 'draft', tax: 5,
    lineItems: [
      { id: generateId(), description: 'E-commerce storefront design', quantity: 35, unitPrice: 130 },
      { id: generateId(), description: 'Product photography integration', quantity: 10, unitPrice: 90 },
    ],
    notes: 'Draft - awaiting client confirmation on scope.',
    issuedAt: day(-2), dueDate: day(28),
  },
  {
    id: generateId(), number: 'INV-006', client: 'Summit Financial Group', clientEmail: 'invoices@summitfg.com',
    status: 'sent', tax: 8.5,
    lineItems: [
      { id: generateId(), description: 'Portfolio analytics dashboard', quantity: 90, unitPrice: 185 },
      { id: generateId(), description: 'Data migration services', quantity: 25, unitPrice: 150 },
    ],
    notes: 'Includes 3 months of post-launch support.',
    issuedAt: day(-5), dueDate: day(25),
  },
  {
    id: generateId(), number: 'INV-007', client: 'Velocity Motors', clientEmail: 'procurement@velocitymotors.co',
    status: 'cancelled', tax: 9,
    lineItems: [
      { id: generateId(), description: 'Inventory management system', quantity: 50, unitPrice: 155 },
    ],
    notes: 'Project cancelled by client.',
    issuedAt: day(-30), dueDate: day(0),
  },
  {
    id: generateId(), number: 'INV-008', client: 'Oasis Wellness', clientEmail: 'admin@oasiswellness.com',
    status: 'overdue', tax: 6,
    lineItems: [
      { id: generateId(), description: 'Booking platform development', quantity: 70, unitPrice: 145 },
      { id: generateId(), description: 'Payment gateway integration', quantity: 20, unitPrice: 175 },
      { id: generateId(), description: 'Mobile responsive optimization', quantity: 15, unitPrice: 120 },
    ],
    notes: 'Second notice sent.',
    issuedAt: day(-40), dueDate: day(-10),
  },
]

// ─── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = 'all' | InvoiceStatus

const FILTER_TABS: { label: string; value: FilterTab; dot: string }[] = [
  { label: 'All',      value: 'all',       dot: '' },
  { label: 'Draft',    value: 'draft',     dot: 'bg-neutral-400' },
  { label: 'Sent',     value: 'sent',      dot: 'bg-blue-500' },
  { label: 'Paid',     value: 'paid',      dot: 'bg-green-500' },
  { label: 'Overdue',  value: 'overdue',   dot: 'bg-red-500' },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(SAMPLE_INVOICES)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // ── Create invoice form state
  const [newClient, setNewClient] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTax, setNewTax] = useState('8')
  const [newNotes, setNewNotes] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newLineItems, setNewLineItems] = useState<LineItem[]>([
    { id: generateId(), description: '', quantity: 1, unitPrice: 0 },
  ])

  // ── Filtered invoices
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterTab !== 'all' && inv.status !== filterTab) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !inv.client.toLowerCase().includes(q) &&
          !inv.number.toLowerCase().includes(q) &&
          !inv.clientEmail.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [invoices, filterTab, search])

  // ── Stats
  const stats = useMemo(() => {
    const paidTotal = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const outstanding = invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const overdueAmt = invoices
      .filter((i) => i.status === 'overdue')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const thisMonth = invoices.filter((i) => {
      return i.issuedAt.getMonth() === now.getMonth() && i.issuedAt.getFullYear() === now.getFullYear()
    }).length
    return { paidTotal, outstanding, overdueAmt, thisMonth }
  }, [invoices])

  // ── Selected invoice
  const selected = selectedId ? invoices.find((i) => i.id === selectedId) ?? null : null

  // ── Line item helpers for create form
  function addLineItem() {
    setNewLineItems((prev) => [...prev, { id: generateId(), description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeLineItem(id: string) {
    setNewLineItems((prev) => prev.filter((li) => li.id !== id))
  }

  function updateLineItem(id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) {
    setNewLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    )
  }

  const newSubtotal = invoiceSubtotal(newLineItems)
  const newTaxAmt = newSubtotal * (parseFloat(newTax) || 0) / 100
  const newTotal = newSubtotal + newTaxAmt

  // ── Create invoice
  function handleCreate() {
    if (!newClient.trim() || !newEmail.trim() || newLineItems.length === 0) return
    const nextNum = invoices.length + 1
    const inv: Invoice = {
      id: generateId(),
      number: `INV-${String(nextNum).padStart(3, '0')}`,
      client: newClient.trim(),
      clientEmail: newEmail.trim(),
      status: 'draft',
      lineItems: newLineItems.filter((li) => li.description.trim()),
      tax: parseFloat(newTax) || 0,
      notes: newNotes.trim(),
      issuedAt: new Date(),
      dueDate: newDueDate ? new Date(newDueDate) : day(30),
    }
    setInvoices((prev) => [inv, ...prev])
    setCreateOpen(false)
    resetForm()
  }

  function resetForm() {
    setNewClient('')
    setNewEmail('')
    setNewTax('8')
    setNewNotes('')
    setNewDueDate('')
    setNewLineItems([{ id: generateId(), description: '', quantity: 1, unitPrice: 0 }])
  }

  // ── Status transitions
  function updateStatus(id: string, status: InvoiceStatus) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv
        return {
          ...inv,
          status,
          paidAt: status === 'paid' ? new Date() : inv.paidAt,
        }
      })
    )
  }

  // ── Invoice detail view ─────────────────────────────────────────────────
  if (selected) {
    const sub = invoiceSubtotal(selected.lineItems)
    const taxAmt = sub * (selected.tax / 100)
    const total = sub + taxAmt

    return (
      <div className="flex flex-col gap-6 p-6">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to invoices
        </button>

        {/* Invoice preview card */}
        <Card className="max-w-3xl mx-auto w-full">
          <CardContent className="p-8">
            {/* Header: company + invoice meta */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Your Company</h2>
                <p className="text-sm text-muted-foreground mt-1">123 Business Avenue</p>
                <p className="text-sm text-muted-foreground">San Francisco, CA 94102</p>
                <p className="text-sm text-muted-foreground">hello@yourcompany.com</p>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  INVOICE
                </h3>
                <p className="text-sm font-medium mt-1">{selected.number}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(selected.status)}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusDot(selected.status)}`} />
                    {statusLabel(selected.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mb-6" />

            {/* Client + dates */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Bill To</p>
                <p className="font-medium">{selected.client}</p>
                <p className="text-sm text-muted-foreground">{selected.clientEmail}</p>
              </div>
              <div className="text-right">
                <div className="mb-2">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Issue Date</p>
                  <p className="text-sm font-medium">{fmtDate(selected.issuedAt)}</p>
                </div>
                <div className="mb-2">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Due Date</p>
                  <p className="text-sm font-medium">{fmtDate(selected.dueDate)}</p>
                </div>
                {selected.paidAt && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Paid On</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">{fmtDate(selected.paidAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line items table */}
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
                  {selected.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell className="pl-4 font-medium text-sm">{li.description}</TableCell>
                      <TableCell className="text-center tabular-nums">{li.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCurrency(li.unitPrice)}</TableCell>
                      <TableCell className="text-right pr-4 tabular-nums font-medium">
                        {fmtCurrency(li.quantity * li.unitPrice)}
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
                  <span className="tabular-nums font-medium">{fmtCurrency(sub)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({selected.tax}%)</span>
                  <span className="tabular-nums font-medium">{fmtCurrency(taxAmt)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(total)}</span>
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
          {selected.status === 'draft' && (
            <Button
              onClick={() => updateStatus(selected.id, 'sent')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
            >
              <Send className="size-4 mr-1.5" />
              Mark as Sent
            </Button>
          )}
          {(selected.status === 'sent' || selected.status === 'overdue') && (
            <Button
              onClick={() => updateStatus(selected.id, 'paid')}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0"
            >
              <CheckCircle2 className="size-4 mr-1.5" />
              Mark as Paid
            </Button>
          )}
          {selected.status !== 'cancelled' && selected.status !== 'paid' && (
            <Button
              variant="outline"
              onClick={() => updateStatus(selected.id, 'cancelled')}
              className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <X className="size-4 mr-1.5" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
            <FileText className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText
                colors={['#059669', '#10b981', '#34d399']}
                animationSpeed={6}
              >
                Invoicing
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, track, and manage invoices
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25 border-0"
            >
              <Plus className="size-4 mr-1.5" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              {/* Client info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="inv-client">Client Name *</Label>
                  <Input
                    id="inv-client"
                    placeholder="Acme Corporation"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-email">Client Email *</Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="billing@acme.co"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
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
                      {newLineItems.map((li) => (
                        <TableRow key={li.id}>
                          <TableCell className="pl-3 py-1.5">
                            <Input
                              placeholder="Service description"
                              value={li.description}
                              onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              type="number"
                              min={1}
                              value={li.quantity}
                              onChange={(e) => updateLineItem(li.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm text-center"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={li.unitPrice}
                              onChange={(e) => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell className="py-1.5 text-right tabular-nums text-sm font-medium">
                            {fmtCurrency(li.quantity * li.unitPrice)}
                          </TableCell>
                          <TableCell className="py-1.5 pr-2">
                            {newLineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLineItem(li.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Running total */}
                <div className="flex justify-end">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums font-medium">{fmtCurrency(newSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({parseFloat(newTax) || 0}%)</span>
                      <span className="tabular-nums font-medium">{fmtCurrency(newTaxAmt)}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(newTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax + due date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="inv-tax">Tax (%)</Label>
                  <Input
                    id="inv-tax"
                    type="number"
                    min={0}
                    step={0.5}
                    value={newTax}
                    onChange={(e) => setNewTax(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-due">Due Date</Label>
                  <Input
                    id="inv-due"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="inv-notes">Notes</Label>
                <Textarea
                  id="inv-notes"
                  placeholder="Payment terms, additional info..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="min-h-20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newClient.trim() || !newEmail.trim() || !newLineItems.some((li) => li.description.trim())}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0"
              >
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            $<CountUp to={Math.round(stats.paidTotal)} duration={1.5} separator="," />
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
            $<CountUp to={Math.round(stats.outstanding)} duration={1.5} separator="," />
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
            $<CountUp to={Math.round(stats.overdueAmt)} duration={1.5} separator="," />
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

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all'
            ? invoices.length
            : invoices.filter((i) => i.status === tab.value).length
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
          <Input
            placeholder="Search by client or invoice number..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(filterTab !== 'all' || search) && (
          <button
            onClick={() => { setFilterTab('all'); setSearch('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
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
                {invoices.length === 0
                  ? 'Create your first invoice to get started.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Invoice #</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Issued</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Due Date</TableHead>
                  <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const total = invoiceTotal(inv)
                  return (
                    <TableRow
                      key={inv.id}
                      className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedId(inv.id)}
                    >
                      <TableCell className="pl-4">
                        <span className="font-mono text-sm font-medium">{inv.number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white text-xs font-bold shrink-0">
                            {inv.client[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{inv.client}</p>
                            <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold tabular-nums text-sm">{fmtCurrency(total)}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(inv.status)}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusDot(inv.status)}`} />
                          {statusLabel(inv.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.issuedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {inv.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10"
                              onClick={() => updateStatus(inv.id, 'sent')}
                            >
                              <Send className="size-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-500/10"
                              onClick={() => updateStatus(inv.id, 'paid')}
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Paid
                            </Button>
                          )}
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
    </div>
  )
}
