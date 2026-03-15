'use client'

import { useState, useMemo } from 'react'
import {
  Plane,
  Utensils,
  Monitor,
  Building2,
  Wrench,
  GraduationCap,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Plus,
  X,
  Receipt,
  ArrowUpDown,
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

// ─── Types ──────────────────────────────────────────────────────────────────

type ExpenseCategory = 'travel' | 'meals' | 'software' | 'office' | 'equipment' | 'training' | 'other'
type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed'
type Expense = {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  status: ExpenseStatus
  date: Date
  receipt: boolean
  submittedBy: string
  approvedBy?: string
  notes: string
}

type SortField = 'date' | 'amount' | 'status'
type SortDir = 'asc' | 'desc'

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function fmtCurrency(v: number) {
  return currencyFmt.format(v)
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: typeof Plane; color: string }> = {
  travel:    { label: 'Travel',     icon: Plane,          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  meals:     { label: 'Meals',      icon: Utensils,       color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  software:  { label: 'Software',   icon: Monitor,        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  office:    { label: 'Office',     icon: Building2,      color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20' },
  equipment: { label: 'Equipment',  icon: Wrench,         color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  training:  { label: 'Training',   icon: GraduationCap,  color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  other:     { label: 'Other',      icon: MoreHorizontal, color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20' },
}

function statusBadgeClass(status: ExpenseStatus): string {
  switch (status) {
    case 'pending':    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'approved':   return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'rejected':   return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'reimbursed': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  }
}

function statusDot(status: ExpenseStatus): string {
  switch (status) {
    case 'pending':    return 'bg-amber-500'
    case 'approved':   return 'bg-green-500'
    case 'rejected':   return 'bg-red-500'
    case 'reimbursed': return 'bg-blue-500'
  }
}

const STATUS_ORDER: Record<ExpenseStatus, number> = { pending: 0, approved: 1, rejected: 2, reimbursed: 3 }

// ─── Sample data ────────────────────────────────────────────────────────────

const now = new Date()
const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
const monthAgo = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, now.getDate())

const SAMPLE_EXPENSES: Expense[] = [
  { id: generateId(), description: 'Flight to NYC for client meeting', amount: 487, category: 'travel', status: 'reimbursed', date: day(-25), receipt: true, submittedBy: 'Alice Chen', approvedBy: 'David Kim', notes: 'Round-trip economy class' },
  { id: generateId(), description: 'Team lunch at Olive Garden', amount: 156, category: 'meals', status: 'approved', date: day(-3), receipt: true, submittedBy: 'Bob Martinez', approvedBy: 'David Kim', notes: 'Q1 kickoff celebration' },
  { id: generateId(), description: 'Figma annual subscription', amount: 144, category: 'software', status: 'reimbursed', date: day(-40), receipt: true, submittedBy: 'Carol Wang', approvedBy: 'David Kim', notes: 'Design tool license renewal' },
  { id: generateId(), description: 'Standing desk converter', amount: 329, category: 'equipment', status: 'pending', date: day(-1), receipt: true, submittedBy: 'Dave Thompson', notes: 'Ergonomic upgrade request' },
  { id: generateId(), description: 'Office supplies restock', amount: 89, category: 'office', status: 'approved', date: day(-7), receipt: false, submittedBy: 'Eva Nguyen', approvedBy: 'David Kim', notes: 'Paper, pens, sticky notes' },
  { id: generateId(), description: 'AWS monthly infrastructure', amount: 1240, category: 'software', status: 'reimbursed', date: day(-15), receipt: true, submittedBy: 'Frank Johnson', approvedBy: 'David Kim', notes: 'March cloud hosting costs' },
  { id: generateId(), description: 'React conference ticket', amount: 599, category: 'training', status: 'pending', date: day(-2), receipt: true, submittedBy: 'Grace Lee', notes: 'React Summit 2026, Amsterdam' },
  { id: generateId(), description: 'Client dinner at Nobu', amount: 312, category: 'meals', status: 'rejected', date: day(-10), receipt: true, submittedBy: 'Henry Park', notes: 'Exceeds per-person limit' },
  { id: generateId(), description: 'Uber rides (March)', amount: 178, category: 'travel', status: 'pending', date: day(-5), receipt: true, submittedBy: 'Iris Zhang', notes: 'Weekly commute to satellite office' },
  { id: generateId(), description: 'MacBook Pro charger replacement', amount: 79, category: 'equipment', status: 'approved', date: day(-12), receipt: true, submittedBy: 'Jack Wilson', approvedBy: 'David Kim', notes: 'Original charger damaged' },
  { id: generateId(), description: 'Co-working space day pass', amount: 45, category: 'office', status: 'reimbursed', date: day(-20), receipt: true, submittedBy: 'Karen Singh', approvedBy: 'David Kim', notes: 'WeWork day pass for offsite work' },
  { id: generateId(), description: 'Leadership workshop enrollment', amount: 750, category: 'training', status: 'pending', date: day(0), receipt: false, submittedBy: 'Leo Ramirez', notes: '2-day management training program' },
]

// ─── Filter / Category tabs ────────────────────────────────────────────────

type FilterTab = 'all' | ExpenseStatus

const FILTER_TABS: { label: string; value: FilterTab; dot: string }[] = [
  { label: 'All',        value: 'all',        dot: '' },
  { label: 'Pending',    value: 'pending',    dot: 'bg-amber-500' },
  { label: 'Approved',   value: 'approved',   dot: 'bg-green-500' },
  { label: 'Rejected',   value: 'rejected',   dot: 'bg-red-500' },
  { label: 'Reimbursed', value: 'reimbursed', dot: 'bg-blue-500' },
]

const ALL_CATEGORIES: ExpenseCategory[] = ['travel', 'meals', 'software', 'office', 'equipment', 'training', 'other']

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(SAMPLE_EXPENSES)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [createOpen, setCreateOpen] = useState(false)

  // ── Create form state
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('other')
  const [newDate, setNewDate] = useState('')
  const [newReceipt, setNewReceipt] = useState(false)
  const [newNotes, setNewNotes] = useState('')

  // ── Filtered + sorted expenses
  const filtered = useMemo(() => {
    let list = expenses.filter((e) => {
      if (filterTab !== 'all' && e.status !== filterTab) return false
      if (categoryFilter && e.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!e.description.toLowerCase().includes(q) && !e.submittedBy.toLowerCase().includes(q)) return false
      }
      return true
    })
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.getTime() - b.date.getTime()
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [expenses, filterTab, categoryFilter, search, sortField, sortDir])

  // ── Stats
  const stats = useMemo(() => {
    const thisMonth = expenses.filter(
      (e) => e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear()
    )
    const totalSpent = thisMonth.reduce((s, e) => s + e.amount, 0)
    const pendingCount = expenses.filter((e) => e.status === 'pending').length
    const reimbursedTotal = expenses.filter((e) => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0)
    const avg = expenses.length > 0 ? Math.round(expenses.reduce((s, e) => s + e.amount, 0) / expenses.length) : 0
    return { totalSpent, pendingCount, reimbursedTotal, avg }
  }, [expenses])

  // ── Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + e.amount
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    const max = entries.length > 0 ? entries[0][1] : 1
    return entries.map(([cat, amount]) => ({ category: cat as ExpenseCategory, amount, pct: (amount / max) * 100 }))
  }, [expenses])

  // ── Monthly spending (last 6 months)
  const monthlySpending = useMemo(() => {
    const months: { label: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = monthAgo(i)
      const m = d.getMonth()
      const y = d.getFullYear()
      const total = expenses
        .filter((e) => e.date.getMonth() === m && e.date.getFullYear() === y)
        .reduce((s, e) => s + e.amount, 0)
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), amount: total })
    }
    return months
  }, [expenses])

  const maxMonthly = Math.max(...monthlySpending.map((m) => m.amount), 1)

  // ── Sort toggle
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // ── Create expense
  function handleCreate() {
    if (!newDesc.trim() || !newAmount.trim()) return
    const expense: Expense = {
      id: generateId(),
      description: newDesc.trim(),
      amount: parseFloat(newAmount) || 0,
      category: newCategory,
      status: 'pending',
      date: newDate ? new Date(newDate) : new Date(),
      receipt: newReceipt,
      submittedBy: 'You',
      notes: newNotes.trim(),
    }
    setExpenses((prev) => [expense, ...prev])
    setCreateOpen(false)
    resetForm()
  }

  function resetForm() {
    setNewDesc('')
    setNewAmount('')
    setNewCategory('other')
    setNewDate('')
    setNewReceipt(false)
    setNewNotes('')
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 shadow-lg shadow-red-500/20">
            <Receipt className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#ef4444', '#f97316', '#f59e0b']} animationSpeed={6}>
                Expenses
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track spending and manage reimbursements
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-500/25 border-0"
            >
              <Plus className="size-4 mr-1.5" />
              New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Expense</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="exp-desc">Description *</Label>
                <Input
                  id="exp-desc"
                  placeholder="Flight to NYC for client meeting"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="exp-amount">Amount ($) *</Label>
                  <Input
                    id="exp-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-category">Category</Label>
                  <select
                    id="exp-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="exp-date">Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="mb-1">Receipt</Label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReceipt}
                      onChange={(e) => setNewReceipt(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    <span className="text-sm text-muted-foreground">I have a receipt</span>
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exp-notes">Notes</Label>
                <Textarea
                  id="exp-notes"
                  placeholder="Additional details..."
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
                disabled={!newDesc.trim() || !newAmount.trim()}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border-0"
              >
                Submit Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(239, 68, 68, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <DollarSign className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            $<CountUp to={stats.totalSpent} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500">
              <Clock className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <CountUp to={stats.pendingCount} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
              <CheckCircle2 className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reimbursed</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            $<CountUp to={stats.reimbursedTotal} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(249, 115, 22, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <TrendingUp className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg / Expense</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            $<CountUp to={stats.avg} duration={1.5} separator="," />
          </p>
        </SpotlightCard>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {categoryBreakdown.map(({ category, amount, pct }) => {
              const meta = CATEGORY_META[category]
              const Icon = meta.icon
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center size-7 rounded-lg border ${meta.color}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{meta.label}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly spending trend */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Spending</h3>
          <div className="flex items-end gap-3 h-40">
            {monthlySpending.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
                  {m.amount > 0 ? fmtCurrency(m.amount) : '--'}
                </span>
                <div className="w-full flex items-end justify-center" style={{ height: '110px' }}>
                  <div
                    className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-red-500 to-amber-400 transition-all duration-700"
                    style={{ height: m.amount > 0 ? `${Math.max((m.amount / maxMonthly) * 100, 8)}%` : '4px', opacity: m.amount > 0 ? 1 : 0.2 }}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all'
            ? expenses.length
            : expenses.filter((e) => e.status === tab.value).length
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

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Category:</span>
        <button
          onClick={() => setCategoryFilter(null)}
          className={[
            'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
            categoryFilter === null
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-neutral-200 dark:border-neutral-700 hover:text-foreground hover:border-neutral-400 dark:hover:border-neutral-500',
          ].join(' ')}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat]
          const Icon = meta.icon
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={[
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                categoryFilter === cat
                  ? meta.color
                  : 'bg-transparent text-muted-foreground border-neutral-200 dark:border-neutral-700 hover:text-foreground hover:border-neutral-400 dark:hover:border-neutral-500',
              ].join(' ')}
            >
              <Icon className="size-3" />
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search expenses..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['date', 'amount', 'status'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={[
                'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                sortField === field
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              <ArrowUpDown className="size-3" />
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {sortField === field && <span className="opacity-60">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
            </button>
          ))}
        </div>
        {(filterTab !== 'all' || categoryFilter || search) && (
          <button
            onClick={() => { setFilterTab('all'); setCategoryFilter(null); setSearch('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} of {expenses.length} expenses
        </span>
      </div>

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
            <Receipt className="size-6 opacity-40" />
          </div>
          <p className="font-medium">No expenses found</p>
          <p className="text-sm mt-1">
            {expenses.length === 0 ? 'Submit your first expense to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((expense) => {
            const catMeta = CATEGORY_META[expense.category]
            const CatIcon = catMeta.icon
            return (
              <div
                key={expense.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                {/* Category icon */}
                <div className={`flex items-center justify-center size-10 rounded-xl border shrink-0 ${catMeta.color}`}>
                  <CatIcon className="size-4.5" />
                </div>

                {/* Description + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    {expense.receipt && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 shrink-0">
                        <Receipt className="size-2.5" />
                        Receipt
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{expense.submittedBy}</span>
                    <span className="opacity-40">|</span>
                    <span>{fmtDate(expense.date)}</span>
                    {expense.notes && (
                      <>
                        <span className="opacity-40">|</span>
                        <span className="truncate max-w-48">{expense.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Category badge */}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${catMeta.color}`}>
                  <CatIcon className="size-3" />
                  {catMeta.label}
                </span>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusBadgeClass(expense.status)}`}>
                  <span className={`size-1.5 rounded-full ${statusDot(expense.status)}`} />
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                </span>

                {/* Amount */}
                <span className="font-semibold tabular-nums text-sm shrink-0 min-w-20 text-right">
                  {fmtCurrency(expense.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
