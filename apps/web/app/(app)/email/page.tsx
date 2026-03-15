'use client'

import { useMemo, useState, useCallback } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel as CtxMenuLabel,
} from '@/components/ui/context-menu'
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
  X,
  Check,
  Clock,
  Tag,
  MailOpen,
  ArrowLeft,
  MoreHorizontal,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Users,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { CountUp } from '@/components/reactbits/CountUp'

// ---- Types ------------------------------------------------------------------

type EmailFolder = 'inbox' | 'sent' | 'starred' | 'archived' | 'trash' | 'all'

interface EmailThread {
  id: bigint
  subject: string
  preview: string
  messages: typeof allMessages extends (infer T)[] ? T[] : any[]
  lastMessage: any
  senderName: string
  senderInitials: string
  senderId: any
  timestamp: Date
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  isTrashed: boolean
  label: string | null
  hasAttachments: boolean
  replyCount: number
  aiGenerated: boolean
}

// Declare module-level type for messages
let allMessages: any[]

// ---- Helpers ----------------------------------------------------------------

function parseEmailContent(content: string): { subject: string; to: string; body: string } {
  const subjectMatch = content.match(/^Subject:\s*(.+?)$/m)
  const toMatch = content.match(/^To:\s*(.+?)$/m)
  let body = content
  // Strip Subject/To headers from body
  if (subjectMatch || toMatch) {
    body = content
      .replace(/^Subject:\s*.+?$/m, '')
      .replace(/^To:\s*.+?$/m, '')
      .replace(/^\n+/, '')
      .trim()
  }
  return {
    subject: subjectMatch?.[1]?.trim() || '(No Subject)',
    to: toMatch?.[1]?.trim() || '',
    body,
  }
}

function formatEmailTime(ts: any): string {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(Number(ts))
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (hrs < 48) return 'Yesterday'
    if (hrs < 168) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatFullDate(ts: any): string {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(Number(ts))
    return d.toLocaleDateString(undefined, {
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

const LABEL_COLORS: Record<string, string> = {
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

// ---- Main Page --------------------------------------------------------------

export default function EmailPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [messages] = useTable(tables.message)
  const [employees] = useTable(tables.employee)
  const [emailMetas] = useTable(tables.emailMeta)
  const [emailLabels] = useTable(tables.emailLabel)

  const sendMessage = useSpacetimeReducer(reducers.sendMessage)
  const toggleStarred = useSpacetimeReducer(reducers.toggleEmailStarred)
  const markRead = useSpacetimeReducer(reducers.markEmailRead)
  const archiveEmail = useSpacetimeReducer(reducers.archiveEmail)
  const trashEmail = useSpacetimeReducer(reducers.trashEmail)
  const setEmailLabel = useSpacetimeReducer(reducers.setEmailLabel)
  const createEmailLabel = useSpacetimeReducer(reducers.createEmailLabel)
  const deleteEmailLabel = useSpacetimeReducer(reducers.deleteEmailLabel)

  const [folder, setFolder] = useState<EmailFolder>('inbox')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'forward'>('new')
  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showLabelDialog, setShowLabelDialog] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')

  // Employee lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // My email metadata lookup
  const myMetaMap = useMemo(() => {
    if (!identity) return new Map<bigint, any>()
    const map = new Map<bigint, any>()
    emailMetas
      .filter((m) => m.userId.toHexString() === identity.toHexString())
      .forEach((m) => map.set(m.messageId, m))
    return map
  }, [emailMetas, identity])

  // My labels
  const myLabels = useMemo(() => {
    if (!identity) return []
    return emailLabels.filter(
      (l) => l.userId.toHexString() === identity.toHexString()
    )
  }, [emailLabels, identity])

  // Email messages sorted by date
  const emails = useMemo(() => {
    return [...messages]
      .filter((m) => m.messageType.tag === 'Email')
      .sort((a, b) => {
        try {
          return Number(b.sentAt.toMillis()) - Number(a.sentAt.toMillis())
        } catch {
          return 0
        }
      })
  }, [messages])

  // Get sender display info
  const getSenderName = useCallback((senderId: any) => {
    const emp = employeeMap.get(senderId.toHexString())
    return emp?.name ?? 'Unknown'
  }, [employeeMap])

  const getSenderInitials = useCallback((senderId: any) => {
    const name = getSenderName(senderId)
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [getSenderName])

  // Build email items with metadata
  const emailItems = useMemo(() => {
    return emails.map((email) => {
      const meta = myMetaMap.get(email.id)
      const parsed = parseEmailContent(email.content)
      return {
        id: email.id,
        raw: email,
        subject: parsed.subject,
        to: parsed.to,
        body: parsed.body,
        senderName: getSenderName(email.sender),
        senderInitials: getSenderInitials(email.sender),
        senderId: email.sender,
        timestamp: email.sentAt,
        isRead: meta?.read ?? false,
        isStarred: meta?.starred ?? false,
        isArchived: meta?.archived ?? false,
        isTrashed: meta?.trashed ?? false,
        label: meta?.label ?? null,
        hasAttachments: email.attachments?.length > 0,
        aiGenerated: email.aiGenerated,
        threadId: email.threadId,
        inReplyTo: email.inReplyTo,
      }
    })
  }, [emails, myMetaMap, getSenderName, getSenderInitials])

  // Filter by folder
  const filteredEmails = useMemo(() => {
    let items = emailItems
    switch (folder) {
      case 'inbox':
        items = items.filter((e) => !e.isArchived && !e.isTrashed)
        break
      case 'sent':
        items = items.filter((e) => identity && e.senderId.toHexString() === identity.toHexString())
        break
      case 'starred':
        items = items.filter((e) => e.isStarred && !e.isTrashed)
        break
      case 'archived':
        items = items.filter((e) => e.isArchived && !e.isTrashed)
        break
      case 'trash':
        items = items.filter((e) => e.isTrashed)
        break
      case 'all':
        items = items.filter((e) => !e.isTrashed)
        break
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.senderName.toLowerCase().includes(q) ||
          e.to.toLowerCase().includes(q)
      )
    }
    return items
  }, [emailItems, folder, searchQuery, identity])

  // Selected email
  const selectedEmail = useMemo(() => {
    if (selectedId === null) return null
    return emailItems.find((e) => e.id === selectedId) ?? null
  }, [selectedId, emailItems])

  // Thread messages for selected email
  const threadMessages = useMemo(() => {
    if (!selectedEmail) return []
    const threadId = selectedEmail.threadId ?? selectedEmail.id
    return emailItems
      .filter((e) => e.id === threadId || e.threadId === threadId)
      .sort((a, b) => {
        try {
          return Number(a.raw.sentAt.toMillis()) - Number(b.raw.sentAt.toMillis())
        } catch { return 0 }
      })
  }, [selectedEmail, emailItems])

  // Folder counts
  const folderCounts = useMemo(() => ({
    inbox: emailItems.filter((e) => !e.isArchived && !e.isTrashed).length,
    unread: emailItems.filter((e) => !e.isRead && !e.isArchived && !e.isTrashed).length,
    sent: emailItems.filter((e) => identity && e.senderId.toHexString() === identity.toHexString()).length,
    starred: emailItems.filter((e) => e.isStarred && !e.isTrashed).length,
    archived: emailItems.filter((e) => e.isArchived && !e.isTrashed).length,
    trash: emailItems.filter((e) => e.isTrashed).length,
  }), [emailItems, identity])

  // ---- Actions ----

  const handleSendEmail = async () => {
    if (!composeSubject.trim() && !composeBody.trim()) return
    setSending(true)
    try {
      const headers = [`Subject: ${composeSubject.trim()}`]
      if (composeTo.trim()) headers.push(`To: ${composeTo.trim()}`)
      if (composeCc.trim()) headers.push(`Cc: ${composeCc.trim()}`)
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

  const handleReply = (email: typeof selectedEmail) => {
    if (!email) return
    setComposeMode('reply')
    setComposeTo(email.senderName)
    setComposeSubject(`Re: ${email.subject.replace(/^Re:\s*/i, '')}`)
    setComposeBody(`\n\n---\nOn ${formatFullDate(email.timestamp)}, ${email.senderName} wrote:\n> ${email.body.split('\n').join('\n> ')}`)
    setComposing(true)
  }

  const handleForward = (email: typeof selectedEmail) => {
    if (!email) return
    setComposeMode('forward')
    setComposeTo('')
    setComposeSubject(`Fwd: ${email.subject.replace(/^Fwd:\s*/i, '')}`)
    setComposeBody(`\n\n---------- Forwarded message ----------\nFrom: ${email.senderName}\nDate: ${formatFullDate(email.timestamp)}\nSubject: ${email.subject}\n\n${email.body}`)
    setComposing(true)
  }

  const handleSelectEmail = async (email: typeof emailItems[0]) => {
    setSelectedId(email.id)
    if (!email.isRead) {
      try { await markRead({ messageId: email.id }) } catch {}
    }
  }

  // ---- Render ----

  const navItems: { id: EmailFolder; label: string; icon: typeof Inbox; count: number; unread?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: folderCounts.inbox, unread: folderCounts.unread },
    { id: 'sent', label: 'Sent', icon: SendHorizontal, count: folderCounts.sent },
    { id: 'starred', label: 'Starred', icon: Star, count: folderCounts.starred },
    { id: 'archived', label: 'Archive', icon: Archive, count: folderCounts.archived },
    { id: 'trash', label: 'Trash', icon: Trash2, count: folderCounts.trash },
    { id: 'all', label: 'All Mail', icon: Mail, count: emailItems.filter(e => !e.isTrashed).length },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-rose-500" />
          <h1 className="text-lg font-bold">
            <GradientText colors={['#f43f5e', '#ec4899', '#f97316']} animationSpeed={4}>
              Email
            </GradientText>
          </h1>
          {folderCounts.unread > 0 && (
            <Badge variant="destructive" className="text-xs font-mono h-5 px-1.5">
              <CountUp to={folderCounts.unread} duration={0.6} />
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PresenceBar />
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - folders */}
        <div className="w-56 border-r flex flex-col shrink-0">
          <div className="p-3">
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={() => {
                setComposeMode('new')
                setComposeTo('')
                setComposeCc('')
                setComposeSubject('')
                setComposeBody('')
                setShowCc(false)
                setComposing(true)
              }}
            >
              <Plus className="size-4" />
              Compose
            </Button>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setFolder(item.id); setSelectedId(null) }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  folder === item.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.unread && item.unread > 0 ? (
                  <span className="text-xs font-semibold text-primary">{item.unread}</span>
                ) : item.count > 0 ? (
                  <span className="text-[10px] text-muted-foreground">{item.count}</span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Labels */}
          <div className="border-t px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
              <button
                onClick={() => setShowLabelDialog(true)}
                className="p-0.5 rounded hover:bg-muted transition-colors"
              >
                <Plus className="size-3 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-0.5">
              {myLabels.map((label) => (
                <button
                  key={label.id.toString()}
                  className="flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                  <div className={`size-2 rounded-full ${
                    label.color === 'red' ? 'bg-red-400' :
                    label.color === 'blue' ? 'bg-blue-400' :
                    label.color === 'green' ? 'bg-green-400' :
                    label.color === 'yellow' ? 'bg-yellow-400' :
                    label.color === 'purple' ? 'bg-purple-400' :
                    label.color === 'orange' ? 'bg-orange-400' :
                    label.color === 'pink' ? 'bg-pink-400' :
                    'bg-cyan-400'
                  }`} />
                  <span className="truncate">{label.name}</span>
                </button>
              ))}
              {myLabels.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 py-1">No labels yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Email list */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="p-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                className="pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Mail className="size-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {searchQuery ? 'No results' : folder === 'trash' ? 'Trash is empty' : 'No emails'}
                </p>
                <p className="text-[11px] mt-0.5">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Email messages will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => (
                  <ContextMenu key={email.id.toString()}>
                    <ContextMenuTrigger>
                      <button
                        onClick={() => handleSelectEmail(email)}
                        className={`w-full text-left px-3 py-2.5 transition-colors relative ${
                          selectedId === email.id
                            ? 'bg-accent'
                            : email.isRead
                              ? 'hover:bg-accent/50'
                              : 'bg-primary/[0.02] hover:bg-accent/50'
                        }`}
                      >
                        {/* Unread indicator */}
                        {!email.isRead && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-blue-500" />
                        )}
                        <div className="flex items-start gap-2.5 ml-1.5">
                          <Avatar className="size-8 shrink-0 mt-0.5">
                            <AvatarFallback className={`text-[10px] ${
                              email.aiGenerated ? 'bg-violet-600 text-white' : ''
                            }`}>
                              {email.aiGenerated ? <Bot className="size-3.5" /> : email.senderInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm truncate ${!email.isRead ? 'font-semibold' : 'font-medium'}`}>
                                {email.senderName}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatEmailTime(email.timestamp)}
                              </span>
                            </div>
                            <p className={`text-xs truncate ${!email.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {email.subject}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {email.body.slice(0, 100)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {email.isStarred && (
                                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                              )}
                              {email.label && (
                                <Badge variant="outline" className={`text-[9px] h-4 px-1 ${LABEL_COLORS[email.label] || ''}`}>
                                  {email.label}
                                </Badge>
                              )}
                              {email.hasAttachments && (
                                <Paperclip className="size-3 text-muted-foreground" />
                              )}
                              {email.aiGenerated && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                  AI
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <CtxMenuLabel>{email.subject}</CtxMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => handleReply(email)}>
                        <Reply className="size-3.5" /> Reply
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleForward(email)}>
                        <Forward className="size-3.5" /> Forward
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={async () => { try { await toggleStarred({ messageId: email.id }) } catch {} }}>
                        <Star className={`size-3.5 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        {email.isStarred ? 'Unstar' : 'Star'}
                      </ContextMenuItem>
                      <ContextMenuItem onClick={async () => { try { await archiveEmail({ messageId: email.id }) } catch {} }}>
                        <Archive className="size-3.5" />
                        {email.isArchived ? 'Unarchive' : 'Archive'}
                      </ContextMenuItem>
                      {!email.isRead && (
                        <ContextMenuItem onClick={async () => { try { await markRead({ messageId: email.id }) } catch {} }}>
                          <MailOpen className="size-3.5" /> Mark as read
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant="destructive"
                        onClick={async () => { try { await trashEmail({ messageId: email.id }) } catch {} }}
                      >
                        <Trash2 className="size-3.5" />
                        {email.isTrashed ? 'Restore' : 'Delete'}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Email detail / compose */}
        <div className="flex-1 flex flex-col min-w-0">
          {composing ? (
            /* Compose view */
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <h2 className="text-sm font-semibold">
                  {composeMode === 'reply' ? 'Reply' : composeMode === 'forward' ? 'Forward' : 'New Email'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-10">To:</span>
                  <Input
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="Recipient name or email"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {!showCc && (
                    <Button variant="ghost" size="sm" onClick={() => setShowCc(true)} className="text-xs text-muted-foreground h-7">
                      Cc
                    </Button>
                  )}
                </div>
                {showCc && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-10">Cc:</span>
                    <Input
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                      placeholder="CC recipients"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-10">Sub:</span>
                  <Input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Subject"
                    className="h-8 text-sm"
                  />
                </div>
                <Separator />
                <Textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  className="flex-1 min-h-[200px] resize-none text-sm"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleSendEmail} disabled={sending || (!composeSubject.trim() && !composeBody.trim())} className="gap-1.5">
                    <Send className="size-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Paperclip className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedEmail ? (
            /* Email detail view */
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b px-3 py-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5 -ml-1 mr-2">
                  <ArrowLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleReply(selectedEmail)} title="Reply">
                  <Reply className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleForward(selectedEmail)} title="Forward">
                  <Forward className="size-4" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={async () => { try { await toggleStarred({ messageId: selectedEmail.id }) } catch {} }}
                  title={selectedEmail.isStarred ? 'Unstar' : 'Star'}
                >
                  <Star className={`size-4 ${selectedEmail.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={async () => { try { await archiveEmail({ messageId: selectedEmail.id }) } catch {} }}
                  title={selectedEmail.isArchived ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={async () => { try { await trashEmail({ messageId: selectedEmail.id }) } catch {} }}
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                {/* Label picker */}
                <Select
                  value={selectedEmail.label || ''}
                  onValueChange={async (val) => {
                    try { await setEmailLabel({ messageId: selectedEmail.id, label: val }) } catch {}
                  }}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 text-xs border-dashed">
                    <Tag className="size-3" />
                    <SelectValue placeholder="Label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {myLabels.map((l) => (
                      <SelectItem key={l.id.toString()} value={l.name}>
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${
                            l.color === 'red' ? 'bg-red-400' :
                            l.color === 'blue' ? 'bg-blue-400' :
                            l.color === 'green' ? 'bg-green-400' :
                            l.color === 'purple' ? 'bg-purple-400' :
                            'bg-gray-400'
                          }`} />
                          {l.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email content */}
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto p-6">
                  {/* Subject */}
                  <h2 className="text-xl font-semibold mb-4">{selectedEmail.subject}</h2>

                  {/* Thread messages */}
                  {threadMessages.map((msg, idx) => (
                    <div key={msg.id.toString()} className={`${idx > 0 ? 'mt-6 pt-6 border-t' : ''}`}>
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="size-10 shrink-0">
                          <AvatarFallback className={msg.aiGenerated ? 'bg-violet-600 text-white' : ''}>
                            {msg.aiGenerated ? <Bot className="size-4" /> : msg.senderInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{msg.senderName}</span>
                            {msg.aiGenerated && (
                              <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                                <Bot className="size-2.5" />
                                AI
                              </Badge>
                            )}
                            {msg.to && (
                              <span className="text-xs text-muted-foreground">to {msg.to}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatFullDate(msg.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => handleReply(msg)}>
                            <Reply className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => handleForward(msg)}>
                            <Forward className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap pl-[52px]">
                        {msg.body}
                      </div>
                    </div>
                  ))}

                  {/* Quick reply box */}
                  <div className="mt-8 border rounded-xl p-4">
                    <button
                      onClick={() => handleReply(selectedEmail)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    >
                      <Reply className="size-4" />
                      Click to reply...
                    </button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Mail className="size-10 opacity-20" />
              </div>
              <p className="text-sm font-medium">Select an email to read</p>
              <p className="text-[11px] mt-1 text-muted-foreground/60">
                Or press Compose to write a new one
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Label Dialog */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-4" />
              Create Label
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Name</Label>
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(LABEL_COLORS).map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`size-8 rounded-full border-2 transition-all ${
                      color === 'red' ? 'bg-red-400' :
                      color === 'blue' ? 'bg-blue-400' :
                      color === 'green' ? 'bg-green-400' :
                      color === 'yellow' ? 'bg-yellow-400' :
                      color === 'purple' ? 'bg-purple-400' :
                      color === 'orange' ? 'bg-orange-400' :
                      color === 'pink' ? 'bg-pink-400' :
                      'bg-cyan-400'
                    } ${newLabelColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
            </div>
            {/* Existing labels */}
            {myLabels.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">Existing Labels</Label>
                <div className="space-y-1">
                  {myLabels.map((label) => (
                    <div key={label.id.toString()} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className={`size-2.5 rounded-full ${
                          label.color === 'red' ? 'bg-red-400' :
                          label.color === 'blue' ? 'bg-blue-400' :
                          label.color === 'green' ? 'bg-green-400' :
                          label.color === 'purple' ? 'bg-purple-400' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-sm">{label.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try { await deleteEmailLabel({ labelId: label.id }) } catch {}
                        }}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabelDialog(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!newLabelName.trim() || currentOrgId === null) return
                try {
                  await createEmailLabel({
                    orgId: BigInt(currentOrgId),
                    name: newLabelName.trim(),
                    color: newLabelColor,
                  })
                  setNewLabelName('')
                } catch (e) { console.error(e) }
              }}
              disabled={!newLabelName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
