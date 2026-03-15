'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  Plane, Utensils, Monitor, Building2, Wrench, GraduationCap, MoreHorizontal,
  DollarSign, Clock, CheckCircle2, TrendingUp, Search, Plus, Receipt, ArrowUpDown,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

// ─── Types ──────────────────────────────────────────────────────────────────

type ExpenseCategoryKey = 'Travel' | 'Meals' | 'Software' | 'Office' | 'Equipment' | 'Training' | 'Other'
type ExpenseStatusKey = 'Pending' | 'Approved' | 'Rejected' | 'Reimbursed'
type SortField = 'date' | 'amount' | 'status'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | ExpenseStatusKey

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
function fmtCurrency(cents: number) { return currencyFmt.format(Math.round(cents / 100)) }
function fmtCurrencyDollars(dollars: number) { return currencyFmt.format(dollars) }

function tsToDate(ts: any): Date {
  if (!ts) return new Date()
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts)
  if (ts.__timestamp_micros_since_unix_epoch__ !== undefined) return new Date(Number(BigInt(ts.__timestamp_micros_since_unix_epoch__) / 1000n))
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000)
  if (ts.microsSinceUnixEpoch !== undefined) return new Date(Number(BigInt(ts.microsSinceUnixEpoch) / 1000n))
  return new Date(ts)
}

function dateToTimestamp(d: Date): bigint { return BigInt(d.getTime()) * 1000n }

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CATEGORY_META: Record<ExpenseCategoryKey, { label: string; icon: typeof Plane; color: string }> = {
  Travel:    { label: 'Travel',     icon: Plane,          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  Meals:     { label: 'Meals',      icon: Utensils,       color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  Software:  { label: 'Software',   icon: Monitor,        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  Office:    { label: 'Office',     icon: Building2,      color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20' },
  Equipment: { label: 'Equipment',  icon: Wrench,         color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  Training:  { label: 'Training',   icon: GraduationCap,  color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  Other:     { label: 'Other',      icon: MoreHorizontal, color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20' },
}

function statusBadgeClass(status: ExpenseStatusKey): string {
  switch (status) {
    case 'Pending':    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Approved':   return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Rejected':   return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'Reimbursed': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  }
}

function statusDot(status: ExpenseStatusKey): string {
  switch (status) {
    case 'Pending':    return 'bg-amber-500'
    case 'Approved':   return 'bg-green-500'
    case 'Rejected':   return 'bg-red-500'
    case 'Reimbursed': return 'bg-blue-500'
  }
}

const STATUS_ORDER: Record<ExpenseStatusKey, number> = { Pending: 0, Approved: 1, Rejected: 2, Reimbursed: 3 }

const FILTER_TABS: { label: string; value: FilterTab; dot: string }[] = [
  { label: 'All',        value: 'all',        dot: '' },
  { label: 'Pending',    value: 'Pending',    dot: 'bg-amber-500' },
  { label: 'Approved',   value: 'Approved',   dot: 'bg-green-500' },
  { label: 'Rejected',   value: 'Rejected',   dot: 'bg-red-500' },
  { label: 'Reimbursed', value: 'Reimbursed', dot: 'bg-blue-500' },
]

const ALL_CATEGORIES: ExpenseCategoryKey[] = ['Travel', 'Meals', 'Software', 'Office', 'Equipment', 'Training', 'Other']

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { currentOrgId } = useOrg()
  const { identity } = useSpacetimeDB()

  const allExpenses = useTable(tables.expense) ?? []
  const createExpense = useReducer(reducers.createExpense)
  const updateExpenseStatus = useReducer(reducers.updateExpenseStatus)
  const deleteExpense = useReducer(reducers.deleteExpense)

  // Org-scoped with date conversion
  const expenses = useMemo(() => {
    if (currentOrgId === null) return []
    return allExpenses
      .filter(e => e.orgId === BigInt(currentOrgId))
      .map(e => ({
        ...e,
        date: tsToDate(e.expenseDate),
        cat: (e.category.tag as ExpenseCategoryKey) || 'Other',
        statusKey: (e.status.tag as ExpenseStatusKey) || 'Pending',
        dollars: Number(e.amountCents) / 100,
      }))
  }, [allExpenses, currentOrgId])

  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategoryKey | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [createOpen, setCreateOpen] = useState(false)

  // Create form state
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<ExpenseCategoryKey>('Other')
  const [newDate, setNewDate] = useState('')
  const [newReceipt, setNewReceipt] = useState(false)
  const [newNotes, setNewNotes] = useState('')

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = expenses.filter(e => {
      if (filterTab !== 'all' && e.statusKey !== filterTab) return false
      if (categoryFilter && e.cat !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!e.description.toLowerCase().includes(q) && !e.notes.toLowerCase().includes(q)) return false
      }
      return true
    })
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.getTime() - b.date.getTime()
      else if (sortField === 'amount') cmp = a.dollars - b.dollars
      else cmp = STATUS_ORDER[a.statusKey] - STATUS_ORDER[b.statusKey]
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [expenses, filterTab, categoryFilter, search, sortField, sortDir])

  // Stats
  const now = new Date()
  const stats = useMemo(() => {
    const thisMonth = expenses.filter(e => e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear())
    const totalSpent = thisMonth.reduce((s, e) => s + e.dollars, 0)
    const pendingCount = expenses.filter(e => e.statusKey === 'Pending').length
    const reimbursedTotal = expenses.filter(e => e.statusKey === 'Reimbursed').reduce((s, e) => s + e.dollars, 0)
    const avg = expenses.length > 0 ? Math.round(expenses.reduce((s, e) => s + e.dollars, 0) / expenses.length) : 0
    return { totalSpent, pendingCount, reimbursedTotal, avg }
  }, [expenses])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) { map[e.cat] = (map[e.cat] || 0) + e.dollars }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    const max = entries.length > 0 ? entries[0][1] : 1
    return entries.map(([cat, amount]) => ({ category: cat as ExpenseCategoryKey, amount, pct: (amount / max) * 100 }))
  }, [expenses])

  // Monthly spending (last 6 months)
  const monthlySpending = useMemo(() => {
    const months: { label: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const total = expenses.filter(e => e.date.getMonth() === m && e.date.getFullYear() === y).reduce((s, e) => s + e.dollars, 0)
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), amount: total })
    }
    return months
  }, [expenses])

  const maxMonthly = Math.max(...monthlySpending.map(m => m.amount), 1)

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const handleCreate = useCallback(() => {
    if (!newDesc.trim() || !newAmount.trim() || currentOrgId === null) return
    const cents = Math.round(parseFloat(newAmount) * 100)
    if (cents <= 0) return
    const expDate = newDate ? new Date(newDate + 'T00:00:00') : new Date()
    createExpense({
      orgId: BigInt(currentOrgId),
      description: newDesc.trim(),
      amountCents: BigInt(cents),
      categoryTag: newCategory,
      expenseDate: dateToTimestamp(expDate),
      hasReceipt: newReceipt,
      notes: newNotes.trim(),
    })
    setCreateOpen(false)
    resetForm()
  }, [newDesc, newAmount, newCategory, newDate, newReceipt, newNotes, currentOrgId, createExpense])

  function resetForm() {
    setNewDesc(''); setNewAmount(''); setNewCategory('Other'); setNewDate(''); setNewReceipt(false); setNewNotes('')
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <div className="flex items-center gap-2 flex-1">
          <Receipt className="size-4 text-red-500" />
          <span className="text-sm font-medium">Expenses</span>
        </div>
        <PresenceBar />
      </header>

      <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 shadow-lg shadow-red-500/20">
              <Receipt className="size-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <GradientText colors={['#ef4444', '#f97316', '#f59e0b']} animationSpeed={6}>Expenses</GradientText>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track spending and manage reimbursements</p>
            </div>
          </div>

          <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-500/25 border-0">
                <Plus className="size-4 mr-1.5" />
                New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <Label>Description *</Label>
                  <Input placeholder="Flight to NYC for client meeting" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Amount ($) *</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as ExpenseCategoryKey)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="mb-1">Receipt</Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newReceipt} onChange={e => setNewReceipt(e.target.checked)} className="size-4 rounded border-input" />
                      <span className="text-sm text-muted-foreground">I have a receipt</span>
                    </label>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional details..." value={newNotes} onChange={e => setNewNotes(e.target.value)} className="min-h-20" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newDesc.trim() || !newAmount.trim()} className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border-0">
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
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500"><DollarSign className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">This Month</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">$<CountUp to={Math.round(stats.totalSpent)} duration={1.5} separator="," /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500"><Clock className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400"><CountUp to={stats.pendingCount} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500"><CheckCircle2 className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reimbursed</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">$<CountUp to={Math.round(stats.reimbursedTotal)} duration={1.5} separator="," /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(249, 115, 22, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500"><TrendingUp className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg / Expense</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">$<CountUp to={stats.avg} duration={1.5} separator="," /></p>
          </SpotlightCard>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
            <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {categoryBreakdown.map(({ category, amount, pct }) => {
                const meta = CATEGORY_META[category]
                const Icon = meta.icon
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-7 rounded-lg border ${meta.color}`}><Icon className="size-3.5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{meta.label}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtCurrencyDollars(amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {categoryBreakdown.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expenses yet</p>}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5">
            <h3 className="text-sm font-semibold mb-4">Monthly Spending</h3>
            <div className="flex items-end gap-3 h-40">
              {monthlySpending.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-muted-foreground font-medium">{m.amount > 0 ? fmtCurrencyDollars(m.amount) : '--'}</span>
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
          {FILTER_TABS.map(tab => {
            const count = tab.value === 'all' ? expenses.length : expenses.filter(e => e.statusKey === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setFilterTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterTab === tab.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
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
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
              categoryFilter === null
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-neutral-200 dark:border-neutral-700 hover:text-foreground hover:border-neutral-400 dark:hover:border-neutral-500'
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            const Icon = meta.icon
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  categoryFilter === cat ? meta.color : 'bg-transparent text-muted-foreground border-neutral-200 dark:border-neutral-700 hover:text-foreground hover:border-neutral-400 dark:hover:border-neutral-500'
                }`}
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
            <Input placeholder="Search expenses..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            {(['date', 'amount', 'status'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sortField === field
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
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
          <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} of {expenses.length} expenses</span>
        </div>

        {/* Expense list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Receipt className="size-6 opacity-40" />
            </div>
            <p className="font-medium">No expenses found</p>
            <p className="text-sm mt-1">{expenses.length === 0 ? 'Submit your first expense to get started.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(expense => {
              const catMeta = CATEGORY_META[expense.cat]
              const CatIcon = catMeta.icon
              return (
                <div
                  key={expense.id.toString()}
                  className="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className={`flex items-center justify-center size-10 rounded-xl border shrink-0 ${catMeta.color}`}>
                    <CatIcon className="size-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{expense.description}</p>
                      {expense.hasReceipt && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 shrink-0">
                          <Receipt className="size-2.5" />Receipt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtDate(expense.date)}</span>
                      {expense.notes && (
                        <><span className="opacity-40">|</span><span className="truncate max-w-48">{expense.notes}</span></>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${catMeta.color}`}>
                    <CatIcon className="size-3" />{catMeta.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusBadgeClass(expense.statusKey)}`}>
                    <span className={`size-1.5 rounded-full ${statusDot(expense.statusKey)}`} />{expense.statusKey}
                  </span>
                  <span className="font-semibold tabular-nums text-sm shrink-0 min-w-20 text-right">
                    {fmtCurrencyDollars(expense.dollars)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
