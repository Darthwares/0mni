'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Search,
  Star,
  Archive,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  Send,
  Inbox,
  SendHorizontal,
  FileText,
  Bot,
  Plus,
  Paperclip,
  MoreHorizontal,
  X,
  Tag,
  AlertCircle,
  Sparkles,
  ArchiveRestore,
  Undo2,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { exportCSV } from '@/lib/csv-export'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'

// ─── Types ──────────────────────────────────────────────────────────────────

type EmailView = 'inbox' | 'sent' | 'starred' | 'archived' | 'trash' | 'labels'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function avatarGradient(name: string): string {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-purple-600',
    'from-indigo-500 to-violet-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function formatTime(ts: any): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const diff = now.getTime() - d.getTime()

    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }

    if (diff < 7 * 86_400_000) {
      return d.toLocaleDateString([], { weekday: 'short' })
    }

    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatFullDate(ts: any): string {
  try {
    const d = ts.toDate()
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function parseEmailContent(content: string): { subject: string; to: string; cc: string; body: string } {
  const lines = content.split('\n')
  let subject = ''
  let to = ''
  let cc = ''
  let bodyStart = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Subject: ')) {
      subject = lines[i].slice(9)
    } else if (lines[i].startsWith('To: ')) {
      to = lines[i].slice(4)
    } else if (lines[i].startsWith('CC: ') || lines[i].startsWith('Cc: ')) {
      cc = lines[i].slice(4)
    } else if (lines[i].trim() === '' && (subject || to)) {
      bodyStart = i + 1
      break
    } else {
      bodyStart = 0
      break
    }
  }

  if (subject || to) {
    return { subject, to, cc, body: lines.slice(bodyStart).join('\n') }
  }
  return { subject: '', to: '', cc: '', body: content }
}

function getPreview(content: string): string {
  const { body, subject } = parseEmailContent(content)
  const text = body || subject || content
  return text.slice(0, 120).replace(/\n/g, ' ').trim()
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function EmailPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allEmailMeta] = useTable(tables.email_meta)
  const [allEmailLabels] = useTable(tables.email_label)
  const [selectedMessageId, setSelectedMessageId] = useState<bigint | null>(null)
  const [view, setView] = useState<EmailView>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [newLabelName, setNewLabelName] = useState('')
  const [showNewLabel, setShowNewLabel] = useState(false)
  const composeBodyRef = useRef<HTMLTextAreaElement>(null)

  // Reducers
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)
  const toggleEmailStarred = useSpacetimeReducer(reducers.toggleEmailStarred)
  const markEmailRead = useSpacetimeReducer(reducers.markEmailRead)
  const archiveEmail = useSpacetimeReducer(reducers.archiveEmail)
  const trashEmail = useSpacetimeReducer(reducers.trashEmail)
  const setEmailLabel = useSpacetimeReducer(reducers.setEmailLabel)
  const createEmailLabel = useSpacetimeReducer(reducers.createEmailLabel)
  const deleteEmailLabel = useSpacetimeReducer(reducers.deleteEmailLabel)

  const myHex = identity?.toHexString() ?? ''

  // Build a map of EmailMeta by messageId for current user
  const metaMap = useMemo(() => {
    const map = new Map<string, typeof allEmailMeta[number]>()
    for (const meta of allEmailMeta) {
      if (meta.userId.toHexString() === myHex) {
        map.set(String(meta.messageId), meta)
      }
    }
    return map
  }, [allEmailMeta, myHex])

  // Labels for current org
  const labels = useMemo(
    () => allEmailLabels.filter((l) => l.orgId === BigInt(currentOrgId)),
    [allEmailLabels, currentOrgId]
  )

  // Helper to get meta for an email
  const getMeta = useCallback(
    (messageId: bigint) => metaMap.get(String(messageId)),
    [metaMap]
  )

  // Auto-focus compose body when opening
  useEffect(() => {
    if (composing && composeBodyRef.current) {
      setTimeout(() => composeBodyRef.current?.focus(), 100)
    }
  }, [composing])

  // Auto-mark email as read when selected
  useEffect(() => {
    if (selectedMessageId !== null) {
      const meta = getMeta(selectedMessageId)
      if (!meta || !meta.read) {
        markEmailRead({ messageId: selectedMessageId })
      }
    }
  }, [selectedMessageId, getMeta, markEmailRead])

  const handleSendEmail = async () => {
    if (!composeSubject.trim() && !composeBody.trim()) return
    setSending(true)
    try {
      const headers = [`Subject: ${composeSubject.trim()}`, `To: ${composeTo.trim()}`]
      if (composeCc.trim()) headers.push(`CC: ${composeCc.trim()}`)
      const content = `${headers.join('\n')}\n\n${composeBody.trim()}`
      await sendMessage({
        contextType: { tag: 'Channel' } as any,
        contextId: BigInt(0),
        content,
        messageType: { tag: 'Email' } as any,
      })
      setComposing(false)
      setComposeTo('')
      setComposeCc('')
      setComposeSubject('')
      setComposeBody('')
      setShowCc(false)
    } catch (err) {
      console.error('Failed to send email:', err)
    } finally {
      setSending(false)
    }
  }

  const handleToggleStar = (messageId: bigint, e?: React.MouseEvent) => {
    e?.stopPropagation()
    toggleEmailStarred({ messageId })
  }

  const handleArchive = (messageId: bigint) => {
    archiveEmail({ messageId })
    if (selectedMessageId === messageId) setSelectedMessageId(null)
  }

  const handleTrash = (messageId: bigint) => {
    trashEmail({ messageId })
    if (selectedMessageId === messageId) setSelectedMessageId(null)
  }

  const handleReply = (email: typeof emails[number]) => {
    const { subject, body } = parseEmailContent(email.content)
    const senderName = getSenderName(email.sender)
    setComposing(true)
    setComposeSubject(subject.startsWith('Re: ') ? subject : `Re: ${subject}`)
    setComposeTo(senderName)
    setComposeBody(`\n\n---\nOn ${formatFullDate(email.sentAt)}, ${senderName} wrote:\n> ${body.split('\n').join('\n> ')}`)
  }

  const handleForward = (email: typeof emails[number]) => {
    const { subject, body } = parseEmailContent(email.content)
    const senderName = getSenderName(email.sender)
    setComposing(true)
    setComposeSubject(subject.startsWith('Fwd: ') ? subject : `Fwd: ${subject}`)
    setComposeTo('')
    setComposeBody(`\n\n---\nForwarded message from ${senderName}:\n\n${body}`)
  }

  const LABEL_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  const handleCreateLabel = useCallback(() => {
    if (!newLabelName.trim() || currentOrgId === null) return
    const color = LABEL_COLORS[labels.length % LABEL_COLORS.length]
    createEmailLabel({ orgId: BigInt(currentOrgId), name: newLabelName.trim(), color })
    setNewLabelName('')
    setShowNewLabel(false)
  }, [newLabelName, currentOrgId, labels.length, createEmailLabel])

  const handleDeleteLabel = useCallback((labelId: bigint) => {
    deleteEmailLabel({ labelId })
    if (view === 'labels') {
      setView('inbox')
      setActiveLabel(null)
    }
  }, [deleteEmailLabel, view])

  const employeeMap = useMemo(
    () => new Map(allEmployees.filter(e => e.id).map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const emails = useMemo(
    () =>
      [...allMessages]
        .filter((m) => m.messageType.tag === 'Email')
        .sort((a, b) => Number(b.sentAt.toMillis()) - Number(a.sentAt.toMillis())),
    [allMessages]
  )

  const filteredEmails = useMemo(() => {
    let list = emails

    // Filter by view
    switch (view) {
      case 'inbox':
        // Show emails that aren't archived or trashed
        list = list.filter((e) => {
          const meta = getMeta(e.id)
          return !meta?.archived && !meta?.trashed
        })
        break
      case 'starred':
        list = list.filter((e) => getMeta(e.id)?.starred)
        break
      case 'sent':
        list = list.filter((e) => e.sender.toHexString() === myHex)
        break
      case 'archived':
        list = list.filter((e) => getMeta(e.id)?.archived && !getMeta(e.id)?.trashed)
        break
      case 'trash':
        list = list.filter((e) => getMeta(e.id)?.trashed)
        break
      case 'labels':
        if (activeLabel) {
          list = list.filter((e) => getMeta(e.id)?.label?.value === activeLabel)
        }
        break
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          (employeeMap.get(e.sender.toHexString())?.name ?? '').toLowerCase().includes(q)
      )
    }

    return list
  }, [emails, searchQuery, employeeMap, view, getMeta, myHex, activeLabel])

  const stats = useMemo(() => {
    const inboxEmails = emails.filter((e) => {
      const meta = getMeta(e.id)
      return !meta?.archived && !meta?.trashed
    })
    return {
      total: inboxEmails.length,
      unread: inboxEmails.filter((e) => !getMeta(e.id)?.read).length,
      starred: emails.filter((e) => getMeta(e.id)?.starred).length,
      archived: emails.filter((e) => getMeta(e.id)?.archived && !getMeta(e.id)?.trashed).length,
      trashed: emails.filter((e) => getMeta(e.id)?.trashed).length,
      ai: emails.filter((e) => e.aiGenerated).length,
    }
  }, [emails, getMeta])

  const selectedEmail = emails.find((m) => m.id === selectedMessageId) ?? null
  const selectedMeta = selectedMessageId ? getMeta(selectedMessageId) : undefined

  const getSenderName = (senderId: { toHexString: () => string }) => {
    const emp = employeeMap.get(senderId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const handleExportEmails = useCallback(() => {
    exportCSV('emails', [
      { header: 'From', accessor: (e: any) => getSenderName(e.sender) },
      { header: 'Subject', accessor: (e: any) => parseEmailContent(e.content).subject || '(no subject)' },
      { header: 'To', accessor: (e: any) => parseEmailContent(e.content).to },
      { header: 'Date', accessor: (e: any) => formatFullDate(e.sentAt) },
      { header: 'Starred', accessor: (e: any) => getMeta(e.id)?.starred ? 'Yes' : 'No' },
      { header: 'Read', accessor: (e: any) => getMeta(e.id)?.read ? 'Yes' : 'No' },
      { header: 'Label', accessor: (e: any) => getMeta(e.id)?.label?.value ?? '' },
    ], filteredEmails)
  }, [filteredEmails, getMeta, getSenderName])

  const navItems = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: stats.unread, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: stats.starred, gradient: 'from-amber-500 to-orange-600' },
    { id: 'sent' as const, label: 'Sent', icon: SendHorizontal, count: 0, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'archived' as const, label: 'Archive', icon: Archive, count: stats.archived, gradient: 'from-slate-500 to-gray-600' },
    { id: 'trash' as const, label: 'Trash', icon: Trash2, count: stats.trashed, gradient: 'from-red-500 to-rose-600' },
  ]

  const viewLabel = navItems.find((n) => n.id === view)?.label ?? (view === 'labels' ? (activeLabel || 'Labels') : 'Email')

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex flex-1 overflow-hidden">
      {/* ── Left sidebar - folders ─────────────────────────────────── */}
      <div className="w-60 border-r border-border/60 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/50">
        <div className="p-3">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0"
            size="sm"
            onClick={() => { setComposing(true); setSelectedMessageId(null) }}
          >
            <Plus className="mr-2 size-4" />
            Compose
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedMessageId(null) }}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                view === item.id
                  ? 'bg-white dark:bg-neutral-800 text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-foreground',
              ].join(' ')}
            >
              <div className={[
                'flex items-center justify-center size-6 rounded-md',
                view === item.id
                  ? `bg-gradient-to-br ${item.gradient}`
                  : 'bg-neutral-200 dark:bg-neutral-700',
              ].join(' ')}>
                <item.icon className={[
                  'size-3.5',
                  view === item.id ? 'text-white' : 'text-muted-foreground',
                ].join(' ')} />
              </div>
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span className={[
                  'text-xs font-medium tabular-nums rounded-full px-1.5 py-0.5',
                  view === item.id
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground',
                  item.id === 'inbox' && item.count > 0 ? '!bg-blue-500 !text-white' : '',
                ].join(' ')}>
                  {item.count}
                </span>
              )}
            </button>
          ))}

          {/* Labels section */}
          <div className="px-3 pt-4 pb-1 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Labels</p>
            <button
              onClick={() => setShowNewLabel(!showNewLabel)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Create label"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          {showNewLabel && (
            <div className="px-3 pb-2 flex items-center gap-1.5">
              <Input
                placeholder="Label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                className="h-7 text-xs"
                autoFocus
              />
              <button
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim()}
                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <CheckCircle2 className="size-3.5" />
              </button>
              <button
                onClick={() => { setShowNewLabel(false); setNewLabelName('') }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          {labels.map((label) => (
            <div
              key={String(label.id)}
              className={[
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all group/lbl',
                view === 'labels' && activeLabel === label.name
                  ? 'bg-white dark:bg-neutral-800 text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-foreground',
              ].join(' ')}
            >
              <button
                onClick={() => { setView('labels'); setActiveLabel(label.name); setSelectedMessageId(null) }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 truncate">{label.name}</span>
              </button>
              <button
                onClick={() => handleDeleteLabel(label.id)}
                className="opacity-0 group-hover/lbl:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-500 transition-all"
                title="Delete label"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </nav>

        {/* Stats footer */}
        <div className="p-3 border-t border-border/40">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800/60">
              <p className="text-lg font-bold tabular-nums">
                <CountUp to={stats.total} duration={1.2} />
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inbox</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800/60">
              {stats.unread > 0 ? (
                <p className="text-lg font-bold tabular-nums">
                  <ShinyText text={`${stats.unread}`} speed={3} color="#2563eb" shineColor="#60a5fa" className="text-lg font-bold tabular-nums" />
                </p>
              ) : (
                <p className="text-lg font-bold tabular-nums text-muted-foreground">0</p>
              )}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Unread</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Email list ────────────────────────────────────────────── */}
      <div className="w-[380px] border-r border-border/60 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GradientText
                colors={['#3b82f6', '#6366f1', '#8b5cf6', '#3b82f6']}
                animationSpeed={6}
                className="text-lg font-bold"
              >
                {viewLabel}
              </GradientText>
              {filteredEmails.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums bg-neutral-100 dark:bg-neutral-800 rounded-full px-2 py-0.5">
                  {filteredEmails.length}
                </span>
              )}
            </div>
          </div>
          <div className="mb-2">
            <BlurText
              text={view === 'inbox' ? 'Your primary inbox' : view === 'starred' ? 'Emails you starred' : view === 'sent' ? 'Emails you sent' : view === 'archived' ? 'Archived emails' : view === 'trash' ? 'Deleted emails' : `Labeled: ${activeLabel}`}
              delay={30}
              animateBy="words"
              className="text-xs text-muted-foreground"
            />
          </div>
          <div className={[
            'relative transition-all',
            searchFocused ? 'ring-2 ring-blue-500/20 rounded-lg' : '',
          ].join(' ')}>
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              className="pl-9 h-9 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {/* Export + count */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}</span>
            <button onClick={handleExportEmails} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <Download className="size-3" />Export
            </button>
          </div>
        </div>

        {/* Email list */}
        <ScrollArea className="flex-1">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-muted-foreground">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                {view === 'trash' ? (
                  <Trash2 className="size-7 opacity-40" />
                ) : view === 'archived' ? (
                  <Archive className="size-7 opacity-40" />
                ) : (
                  <Mail className="size-7 opacity-40" />
                )}
              </div>
              <p className="font-medium text-sm">
                {view === 'starred' ? 'No starred emails' : view === 'archived' ? 'No archived emails' : view === 'trash' ? 'Trash is empty' : 'No emails yet'}
              </p>
              <p className="text-xs text-center mt-1">
                {view === 'starred'
                  ? 'Star emails to find them here'
                  : view === 'archived'
                  ? 'Archived emails will appear here'
                  : view === 'trash'
                  ? 'Deleted emails will appear here'
                  : 'Email messages will appear here when sent'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredEmails.map((email) => {
                const senderName = getSenderName(email.sender)
                const isSelected = selectedMessageId === email.id
                const meta = getMeta(email.id)
                const isStarred = meta?.starred ?? false
                const isRead = meta?.read ?? false
                const emailLabel = meta?.label?.value
                const { subject } = parseEmailContent(email.content)
                const preview = getPreview(email.content)
                const isMine = email.sender.toHexString() === myHex

                return (
                  <button
                    key={String(email.id)}
                    onClick={() => { setSelectedMessageId(email.id); setComposing(false) }}
                    className={[
                      'w-full text-left px-4 py-3 transition-all group relative',
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-500/10'
                        : isRead
                        ? 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                        : 'bg-white dark:bg-neutral-900/80 hover:bg-blue-50/40 dark:hover:bg-blue-500/5',
                    ].join(' ')}
                  >
                    {/* Unread indicator */}
                    {!isRead && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-2 rounded-full bg-blue-500" />
                    )}
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-blue-500" />
                    )}

                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar className="size-9">
                          <AvatarFallback className={`text-[11px] font-bold text-white bg-gradient-to-br ${avatarGradient(senderName)}`}>
                            {getInitials(senderName)}
                          </AvatarFallback>
                        </Avatar>
                        {email.aiGenerated && (
                          <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-violet-500 border-2 border-white dark:border-neutral-900 flex items-center justify-center">
                            <Sparkles className="size-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={[
                            'text-sm truncate',
                            isRead ? 'font-medium text-foreground/70' : 'font-bold text-foreground',
                          ].join(' ')}>
                            {isMine ? 'You' : senderName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {formatTime(email.sentAt)}
                            </span>
                          </div>
                        </div>

                        {subject && (
                          <p className={[
                            'text-sm truncate mt-0.5',
                            isRead ? 'font-medium text-foreground/60' : 'font-semibold text-foreground/80',
                          ].join(' ')}>
                            {subject}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
                          {preview}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          {email.aiGenerated && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400">
                              <Bot className="size-2.5 mr-0.5" />
                              AI
                            </Badge>
                          )}
                          {emailLabel && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              <Tag className="size-2.5 mr-0.5" />
                              {emailLabel}
                            </Badge>
                          )}
                          <button
                            onClick={(e) => handleToggleStar(email.id, e)}
                            className={[
                              'opacity-0 group-hover:opacity-100 transition-opacity',
                              isStarred ? '!opacity-100' : '',
                            ].join(' ')}
                          >
                            <Star className={[
                              'size-3.5 transition-colors',
                              isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-400',
                            ].join(' ')} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Email detail / compose ────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950">
        {composing ? (
          /* ── Compose view */
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Mail className="size-4 text-white" />
                </div>
                <h2 className="text-base font-semibold">New Email</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col p-6 gap-3">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <span className="text-sm font-medium text-muted-foreground w-12">To</span>
                <Input
                  placeholder="recipient@company.com"
                  className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    CC
                  </button>
                )}
              </div>
              {showCc && (
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <span className="text-sm font-medium text-muted-foreground w-12">CC</span>
                  <Input
                    placeholder="cc@company.com"
                    className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <span className="text-sm font-medium text-muted-foreground w-12">Subject</span>
                <Input
                  placeholder="Email subject..."
                  className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm font-medium"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>
              <Textarea
                ref={composeBodyRef}
                placeholder="Write your email..."
                className="flex-1 min-h-[300px] resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm leading-relaxed"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-t border-border/40 bg-neutral-50/50 dark:bg-neutral-900/50">
              <Button
                onClick={handleSendEmail}
                disabled={sending || (!composeSubject.trim() && !composeBody.trim())}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0"
              >
                <Send className="mr-2 size-4" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Paperclip className="size-4" />
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => {
                  setComposing(false)
                  setComposeTo('')
                  setComposeCc('')
                  setComposeSubject('')
                  setComposeBody('')
                  setShowCc(false)
                }}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Discard
              </Button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* ── Email detail view */
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-border/40 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 text-xs"
                onClick={() => handleReply(selectedEmail)}
              >
                <Reply className="size-3.5" />
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 text-xs"
                onClick={() => {
                  const { subject, body, to, cc } = parseEmailContent(selectedEmail.content)
                  const senderName = getSenderName(selectedEmail.sender)
                  setComposing(true)
                  setComposeSubject(subject.startsWith('Re: ') ? subject : `Re: ${subject}`)
                  setComposeTo(senderName)
                  const allCc = [to, cc].filter(Boolean).join(', ')
                  if (allCc) { setComposeCc(allCc); setShowCc(true) }
                  setComposeBody(`\n\n---\nOn ${formatFullDate(selectedEmail.sentAt)}, ${senderName} wrote:\n> ${body.split('\n').join('\n> ')}`)
                }}
              >
                <ReplyAll className="size-3.5" />
                Reply All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 text-xs"
                onClick={() => handleForward(selectedEmail)}
              >
                <Forward className="size-3.5" />
                Forward
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              {selectedMeta?.archived ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleArchive(selectedEmail.id)}
                  title="Unarchive"
                >
                  <ArchiveRestore className="size-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleArchive(selectedEmail.id)}
                  title="Archive"
                >
                  <Archive className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={() => handleToggleStar(selectedEmail.id)}
              >
                <Star className={[
                  'size-3.5',
                  selectedMeta?.starred
                    ? 'fill-amber-400 text-amber-400'
                    : '',
                ].join(' ')} />
              </Button>
              {selectedMeta?.trashed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleTrash(selectedEmail.id)}
                  title="Restore from trash"
                >
                  <Undo2 className="size-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-red-500"
                  onClick={() => handleTrash(selectedEmail.id)}
                  title="Move to trash"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}

              {/* Label dropdown */}
              {labels.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <div className="relative group/label">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      title="Label"
                    >
                      <Tag className="size-3.5" />
                    </Button>
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-900 border border-border rounded-lg shadow-lg py-1 min-w-[140px] hidden group-hover/label:block z-50">
                      {selectedMeta?.label?.value && (
                        <button
                          onClick={() => setEmailLabel({ messageId: selectedEmail.id, label: '' })}
                          className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                        >
                          <X className="size-3" />
                          Remove label
                        </button>
                      )}
                      {labels.map((label) => (
                        <button
                          key={String(label.id)}
                          onClick={() => setEmailLabel({ messageId: selectedEmail.id, label: label.name })}
                          className={[
                            'w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2',
                            selectedMeta?.label?.value === label.name ? 'font-medium text-foreground' : 'text-muted-foreground',
                          ].join(' ')}
                        >
                          <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex-1" />
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>

            {/* Email content */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto px-8 py-6">
                {/* Subject */}
                {(() => {
                  const { subject } = parseEmailContent(selectedEmail.content)
                  return subject ? (
                    <h1 className="text-xl font-bold mb-6">{subject}</h1>
                  ) : null
                })()}

                {/* Sender info */}
                <div className="flex items-start gap-4 mb-6">
                  <Avatar className="size-11">
                    <AvatarFallback className={`text-sm font-bold text-white bg-gradient-to-br ${avatarGradient(getSenderName(selectedEmail.sender))}`}>
                      {getInitials(getSenderName(selectedEmail.sender))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{getSenderName(selectedEmail.sender)}</span>
                      {selectedEmail.aiGenerated && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400">
                          <Sparkles className="size-2.5 mr-0.5" />
                          AI Generated
                        </Badge>
                      )}
                      {selectedMeta?.label?.value && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          <Tag className="size-2.5 mr-0.5" />
                          {selectedMeta.label.value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFullDate(selectedEmail.sentAt)}
                    </p>
                    {(() => {
                      const { to, cc } = parseEmailContent(selectedEmail.content)
                      return (
                        <>
                          {to && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              To: <span className="text-foreground/70">{to}</span>
                            </p>
                          )}
                          {cc && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              CC: <span className="text-foreground/70">{cc}</span>
                            </p>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Body */}
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                  <div className="whitespace-pre-wrap text-sm text-foreground/85">
                    {parseEmailContent(selectedEmail.content).body || selectedEmail.content}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Quick reply */}
            <div className="px-8 py-4 border-t border-border/40 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="max-w-3xl mx-auto flex items-center gap-3">
                <Input
                  placeholder="Reply..."
                  className="flex-1 bg-white dark:bg-neutral-900"
                  onFocus={() => handleReply(selectedEmail)}
                />
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty state */
          <div className="flex-1 flex flex-col items-center justify-center">
            <SpotlightCard className="!p-8 !rounded-2xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80 max-w-sm" spotlightColor="rgba(99, 102, 241, 0.1)">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-4">
                  <Mail className="size-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  <GradientText
                    colors={['#3b82f6', '#6366f1', '#8b5cf6', '#3b82f6']}
                    animationSpeed={6}
                  >
                    Your Email
                  </GradientText>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an email to read or compose a new one
                </p>
                <Button
                  size="sm"
                  onClick={() => setComposing(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0"
                >
                  <Plus className="size-4 mr-1.5" />
                  Compose Email
                </Button>
              </div>
            </SpotlightCard>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
