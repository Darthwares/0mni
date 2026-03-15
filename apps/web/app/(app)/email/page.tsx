'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
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
  Clock,
  CheckCheck,
  Circle,
  X,
  ChevronDown,
  Tag,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ─── Types ──────────────────────────────────────────────────────────────────

type EmailView = 'inbox' | 'sent' | 'drafts' | 'starred' | 'important'
type EmailCategory = 'primary' | 'social' | 'updates' | 'promotions'

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

function parseEmailContent(content: string): { subject: string; to: string; body: string } {
  const lines = content.split('\n')
  let subject = ''
  let to = ''
  let bodyStart = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Subject: ')) {
      subject = lines[i].slice(9)
    } else if (lines[i].startsWith('To: ')) {
      to = lines[i].slice(4)
    } else if (lines[i].trim() === '' && (subject || to)) {
      bodyStart = i + 1
      break
    } else {
      bodyStart = 0
      break
    }
  }

  if (subject || to) {
    return { subject, to, body: lines.slice(bodyStart).join('\n') }
  }
  return { subject: '', to: '', body: content }
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
  const [selectedMessageId, setSelectedMessageId] = useState<bigint | null>(null)
  const [view, setView] = useState<EmailView>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [searchFocused, setSearchFocused] = useState(false)
  const composeBodyRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

  const myHex = identity?.toHexString() ?? ''

  // Auto-focus compose body when opening
  useEffect(() => {
    if (composing && composeBodyRef.current) {
      setTimeout(() => composeBodyRef.current?.focus(), 100)
    }
  }, [composing])

  const handleSendEmail = async () => {
    if (!composeSubject.trim() && !composeBody.trim()) return
    setSending(true)
    try {
      const content = composeSubject.trim()
        ? `Subject: ${composeSubject.trim()}\nTo: ${composeTo.trim()}\n\n${composeBody.trim()}`
        : composeBody.trim()
      await sendMessage({
        contextType: { tag: 'Channel' } as any,
        contextId: BigInt(0),
        content,
        messageType: { tag: 'Email' } as any,
      })
      setComposing(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
    } catch (err) {
      console.error('Failed to send email:', err)
    } finally {
      setSending(false)
    }
  }

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
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

    if (view === 'starred') {
      list = list.filter((e) => starredIds.has(String(e.id)))
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          (employeeMap.get(e.sender.toHexString())?.name ?? '').toLowerCase().includes(q)
      )
    }

    return list
  }, [emails, searchQuery, employeeMap, view, starredIds])

  const stats = useMemo(() => ({
    total: emails.length,
    unread: emails.length, // In a real app, track read state
    starred: starredIds.size,
    ai: emails.filter((e) => e.aiGenerated).length,
  }), [emails, starredIds])

  const selectedEmail = emails.find((m) => m.id === selectedMessageId) ?? null

  const getSenderName = (senderId: { toHexString: () => string }) => {
    const emp = employeeMap.get(senderId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const navItems = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: stats.total, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: stats.starred, gradient: 'from-amber-500 to-orange-600' },
    { id: 'sent' as const, label: 'Sent', icon: SendHorizontal, count: 0, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'drafts' as const, label: 'Drafts', icon: FileText, count: 0, gradient: 'from-violet-500 to-purple-600' },
    { id: 'important' as const, label: 'Important', icon: AlertCircle, count: 0, gradient: 'from-red-500 to-rose-600' },
  ]

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex flex-1">
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
                ].join(' ')}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Stats footer */}
        <div className="p-3 border-t border-border/40">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800/60">
              <p className="text-lg font-bold tabular-nums">
                <CountUp to={stats.total} duration={1.2} />
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Emails</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white dark:bg-neutral-800/60">
              <p className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">
                <CountUp to={stats.ai} duration={1.2} />
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">AI Sent</p>
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
                {view === 'inbox' ? 'Inbox' : view === 'starred' ? 'Starred' : view === 'sent' ? 'Sent' : view === 'drafts' ? 'Drafts' : 'Important'}
              </GradientText>
              {filteredEmails.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums bg-neutral-100 dark:bg-neutral-800 rounded-full px-2 py-0.5">
                  {filteredEmails.length}
                </span>
              )}
            </div>
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
        </div>

        {/* Email list */}
        <ScrollArea className="flex-1">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-muted-foreground">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Mail className="size-7 opacity-40" />
              </div>
              <p className="font-medium text-sm">
                {view === 'starred' ? 'No starred emails' : 'No emails yet'}
              </p>
              <p className="text-xs text-center mt-1">
                {view === 'starred'
                  ? 'Star emails to find them here'
                  : 'Email messages will appear here when sent'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredEmails.map((email) => {
                const senderName = getSenderName(email.sender)
                const isSelected = selectedMessageId === email.id
                const isStarred = starredIds.has(String(email.id))
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
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
                    ].join(' ')}
                  >
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
                          <span className="text-sm font-semibold truncate">
                            {isMine ? 'You' : senderName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {formatTime(email.sentAt)}
                            </span>
                          </div>
                        </div>

                        {subject && (
                          <p className="text-sm font-medium text-foreground/80 truncate mt-0.5">
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
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(String(email.id)) }}
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
              </div>
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
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
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
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <Reply className="size-3.5" />
                Reply
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <ReplyAll className="size-3.5" />
                Reply All
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <Forward className="size-3.5" />
                Forward
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <Archive className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={() => toggleStar(String(selectedEmail.id))}
              >
                <Star className={[
                  'size-3.5',
                  starredIds.has(String(selectedEmail.id))
                    ? 'fill-amber-400 text-amber-400'
                    : '',
                ].join(' ')} />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <Trash2 className="size-3.5" />
              </Button>
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
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFullDate(selectedEmail.sentAt)}
                    </p>
                    {(() => {
                      const { to } = parseEmailContent(selectedEmail.content)
                      return to ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          To: <span className="text-foreground/70">{to}</span>
                        </p>
                      ) : null
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
                  onFocus={() => {
                    setComposing(true)
                    setComposeSubject(`Re: ${parseEmailContent(selectedEmail.content).subject}`)
                  }}
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
