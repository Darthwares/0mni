'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  Users,
  Building2,
  Star,
  Clock,
  Search,
  Plus,
  Phone,
  Mail,
  Tag,
  ArrowLeft,
  LayoutGrid,
  List,
  ArrowUpDown,
  Trash2,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'

// ─── Types & Config ─────────────────────────────────────────────────────────

type ContactTypeTag = 'Customer' | 'Vendor' | 'Partner' | 'Lead' | 'Personal'

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

function fmtDate(d: Date): string {
  if (d.getTime() <= 0) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relativeDate(d: Date): string {
  if (d.getTime() <= 0) return '—'
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return fmtDate(d)
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function typeBadgeClass(type: ContactTypeTag): string {
  switch (type) {
    case 'Customer': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Vendor':   return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Partner':  return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'Lead':     return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    case 'Personal': return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
    default:         return ''
  }
}

function avatarGradient(type: ContactTypeTag): string {
  switch (type) {
    case 'Customer': return 'from-blue-400 to-blue-600'
    case 'Vendor':   return 'from-amber-400 to-amber-600'
    case 'Partner':  return 'from-purple-400 to-purple-600'
    case 'Lead':     return 'from-green-400 to-green-600'
    case 'Personal': return 'from-neutral-400 to-neutral-600'
    default:         return 'from-neutral-400 to-neutral-600'
  }
}

// ─── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = 'all' | ContactTypeTag

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Customers', value: 'Customer' },
  { label: 'Vendors',   value: 'Vendor' },
  { label: 'Partners',  value: 'Partner' },
  { label: 'Leads',     value: 'Lead' },
  { label: 'Personal',  value: 'Personal' },
]

type SortKey = 'name' | 'company' | 'lastContacted'
type ViewMode = 'grid' | 'list'

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const { currentOrgId } = useOrg()

  // SpacetimeDB
  const allContacts = useTable(tables.contact)
  const createContact = useReducer(reducers.createContact)
  const toggleContactStar = useReducer(reducers.toggleContactStar)
  const deleteContact = useReducer(reducers.deleteContact)
  const logContactInteraction = useReducer(reducers.logContactInteraction)

  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  // Create form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ContactTypeTag>('Customer')
  const [newTags, setNewTags] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Org-scoped contacts
  const contacts = useMemo(() => {
    if (currentOrgId === null) return []
    return allContacts.filter(c => c.orgId === BigInt(currentOrgId))
  }, [allContacts, currentOrgId])

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = contacts.filter(c => {
      const typeTag = getTag(c.contactType) as ContactTypeTag
      if (filterTab !== 'all' && typeTag !== filterTab) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.email.toLowerCase().includes(q) &&
          !c.company.toLowerCase().includes(q) &&
          !c.tags.toLowerCase().includes(q)
        ) return false
      }
      return true
    })

    result.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'company':
          return a.company.localeCompare(b.company)
        case 'lastContacted':
          return Number(b.lastContacted) - Number(a.lastContacted)
      }
    })

    return result
  }, [contacts, filterTab, search, sortKey])

  // Stats
  const stats = useMemo(() => {
    const total = contacts.length
    const companies = new Set(contacts.map(c => c.company).filter(Boolean)).size
    const starred = contacts.filter(c => c.starred).length
    const now = Date.now()
    const recentlyAdded = contacts.filter(c => {
      const created = tsToDate(c.createdAt)
      return (now - created.getTime()) < 30 * 86400000
    }).length
    return { total, companies, starred, recentlyAdded }
  }, [contacts])

  const selected = selectedId !== null ? contacts.find(c => Number(c.id) === selectedId) ?? null : null

  function toggleStar(id: number, e?: React.MouseEvent) {
    e?.stopPropagation()
    toggleContactStar({ contactId: BigInt(id) })
  }

  function resetForm() {
    setNewName(''); setNewEmail(''); setNewPhone(''); setNewCompany('')
    setNewTitle(''); setNewType('Customer'); setNewTags(''); setNewNotes('')
  }

  const handleCreate = useCallback(() => {
    if (!newName.trim() || !newEmail.trim() || currentOrgId === null) return
    createContact({
      orgId: BigInt(currentOrgId),
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      company: newCompany.trim(),
      typeTag: newType,
      title: newTitle.trim(),
      tags: newTags.trim(),
      notes: newNotes.trim(),
    })
    setCreateOpen(false)
    resetForm()
  }, [newName, newEmail, newPhone, newCompany, newType, newTitle, newTags, newNotes, currentOrgId, createContact])

  function cycleSort() {
    const keys: SortKey[] = ['name', 'company', 'lastContacted']
    const idx = keys.indexOf(sortKey)
    setSortKey(keys[(idx + 1) % keys.length])
  }

  const sortLabels: Record<SortKey, string> = {
    name: 'Name',
    company: 'Company',
    lastContacted: 'Last Contacted',
  }

  // ── Contact detail view ─────────────────────────────────────────────────
  if (selected) {
    const typeTag = getTag(selected.contactType) as ContactTypeTag
    const tags = selected.tags.split(',').map(t => t.trim()).filter(Boolean)
    const lastContacted = tsToDate(selected.lastContacted)

    return (
      <div className="flex flex-col h-full">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <Users className="size-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <GradientText colors={['#3b82f6', '#2563eb', '#1d4ed8']} animationSpeed={6}>Contacts</GradientText>
            </h1>
          </div>
          <PresenceBar />
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
            <ArrowLeft className="size-4" />
            Back to contacts
          </button>

          <Card className="max-w-3xl mx-auto w-full">
            <CardContent className="p-8">
              <div className="flex items-start gap-5 mb-8">
                <div className={`flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br ${avatarGradient(typeTag)} text-white text-xl font-bold shrink-0`}>
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight">{selected.name}</h2>
                    <button onClick={() => toggleStar(Number(selected.id))} className="transition-colors">
                      <Star className={`size-5 ${selected.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.title} at {selected.company}</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium mt-2 ${typeBadgeClass(typeTag)}`}>
                    {typeTag}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border mb-6" />

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Contact Information</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5"><Mail className="size-4 text-muted-foreground" /><span className="text-sm">{selected.email}</span></div>
                    {selected.phone && <div className="flex items-center gap-2.5"><Phone className="size-4 text-muted-foreground" /><span className="text-sm">{selected.phone}</span></div>}
                    {selected.company && <div className="flex items-center gap-2.5"><Building2 className="size-4 text-muted-foreground" /><span className="text-sm">{selected.company}</span></div>}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{fmtDate(tsToDate(selected.createdAt))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Contacted</span>
                      <span>{relativeDate(lastContacted)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {tags.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <Tag className="size-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-border/60 p-4 mb-6">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => logContactInteraction({ contactId: BigInt(Number(selected.id)) })}>
                  <Mail className="size-4 mr-1.5" />
                  Log Interaction
                </Button>
                <Button variant="outline" className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => { deleteContact({ contactId: BigInt(Number(selected.id)) }); setSelectedId(null) }}>
                  <Trash2 className="size-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Main view ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
            <Users className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <GradientText colors={['#3b82f6', '#2563eb', '#1d4ed8']} animationSpeed={6}>Contacts</GradientText>
          </h1>
        </div>
        <PresenceBar />
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Manage your contacts, leads, and relationships</p>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
            <DialogTrigger render={<Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25 border-0" />}>
              <Plus className="size-4 mr-1.5" />
              New Contact
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Contact</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="c-name">Name *</Label>
                    <Input id="c-name" placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="c-email">Email *</Label>
                    <Input id="c-email" type="email" placeholder="john@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input id="c-phone" placeholder="+1 (555) 000-0000" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="c-company">Company</Label>
                    <Input id="c-company" placeholder="Acme Corp" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="c-title">Title</Label>
                    <Input id="c-title" placeholder="VP of Engineering" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={v => setNewType(v as ContactTypeTag)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-tags">Tags (comma-separated)</Label>
                  <Input id="c-tags" placeholder="enterprise, priority" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-notes">Notes</Label>
                  <Textarea id="c-notes" placeholder="Additional notes about this contact..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="min-h-20" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || !newEmail.trim()} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0">
                  Create Contact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700"><Users className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Contacts</span>
            </div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={stats.total} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600"><Building2 className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Companies</span>
            </div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={stats.companies} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(245, 158, 11, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600"><Star className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Starred</span>
            </div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={stats.starred} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600"><Clock className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recently Added</span>
            </div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={stats.recentlyAdded} duration={1.5} /></p>
          </SpotlightCard>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map(tab => {
            const count = tab.value === 'all'
              ? contacts.length
              : contacts.filter(c => getTag(c.contactType) === tab.value).length
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
                {tab.label}
                <span className="ml-0.5 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Search + controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by name, email, company, or tag..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={cycleSort} className="h-9 text-xs gap-1.5">
            <ArrowUpDown className="size-3" />{sortLabels[sortKey]}
          </Button>
          <div className="flex items-center rounded-lg border bg-neutral-100 dark:bg-neutral-800 p-0.5">
            <button onClick={() => setViewMode('grid')} className={`flex items-center justify-center size-7 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="size-3.5" />
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center justify-center size-7 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="size-3.5" />
            </button>
          </div>
          {(filterTab !== 'all' || search) && (
            <button onClick={() => { setFilterTab('all'); setSearch('') }} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors">
              Clear filters
            </button>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} of {contacts.length}</span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Users className="size-6 opacity-40" />
              </div>
              <p className="font-medium">No contacts found</p>
              <p className="text-sm mt-1">{contacts.length === 0 ? 'Create your first contact to get started.' : 'Try adjusting your filters.'}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(contact => {
              const typeTag = getTag(contact.contactType) as ContactTypeTag
              const tags = contact.tags.split(',').map(t => t.trim()).filter(Boolean)
              const lastContacted = tsToDate(contact.lastContacted)
              return (
                <Card key={Number(contact.id)} className="group hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => setSelectedId(Number(contact.id))}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center size-10 rounded-xl bg-gradient-to-br ${avatarGradient(typeTag)} text-white text-sm font-bold shrink-0`}>
                        {initials(contact.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{contact.name}</p>
                          <button onClick={(e) => toggleStar(Number(contact.id), e)} className="shrink-0 transition-colors">
                            <Star className={`size-3.5 ${contact.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'}`} />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeBadgeClass(typeTag)}`}>
                        {typeTag}
                      </span>
                      {tags.slice(0, 2).map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                      {tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>}
                    </div>

                    {lastContacted.getTime() > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-2.5">
                        Last contacted {relativeDate(lastContacted)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold w-8" />
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Company</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Email</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Phone</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Type</TableHead>
                    <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold">Last Contacted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(contact => {
                    const typeTag = getTag(contact.contactType) as ContactTypeTag
                    const lastContacted = tsToDate(contact.lastContacted)
                    return (
                      <TableRow key={Number(contact.id)} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer" onClick={() => setSelectedId(Number(contact.id))}>
                        <TableCell className="pl-4 w-8" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => toggleStar(Number(contact.id), e)} className="transition-colors">
                            <Star className={`size-3.5 ${contact.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400'}`} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center size-8 rounded-full bg-gradient-to-br ${avatarGradient(typeTag)} text-white text-xs font-bold shrink-0`}>
                              {initials(contact.name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{contact.name}</p>
                              <p className="text-xs text-muted-foreground">{contact.title}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{contact.company}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.phone}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeBadgeClass(typeTag)}`}>
                            {typeTag}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 text-sm text-muted-foreground">
                          {lastContacted.getTime() > 0 ? relativeDate(lastContacted) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
