'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Mail,
  Search,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  Send,
  Inbox,
  SendHorizontal,
  FileText,
  Bot,
  Plus,
  Paperclip,
  Clock,
  ChevronLeft,
  MailOpen,
  RefreshCw,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

// ── helpers ──────────────────────────────────────────────

function avatarColor(name: string) {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatEmailDate(ts: any): string {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(Number(ts.seconds) * 1000)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60_000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24 && d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    if (diffMs < 7 * 86_400_000) {
      return d.toLocaleDateString([], { weekday: 'short' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatFullDate(ts: any): string {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(Number(ts.seconds) * 1000)
    return d.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// Parse "Subject: ..." from content
function parseSubject(content: string): { subject: string; body: string } {
  if (content.startsWith('Subject: ')) {
    const lines = content.split('\n')
    const subjectLine = lines[0].replace('Subject: ', '').trim()
    // Skip "To: ..." line and blank line
    let bodyStart = 1
    if (lines[1]?.startsWith('To: ')) bodyStart = 2
    if (lines[bodyStart]?.trim() === '') bodyStart++
    return { subject: subjectLine, body: lines.slice(bodyStart).join('\n') }
  }
  return { subject: '', body: content }
}

// Read state via localStorage
const READ_KEY = 'omni-email-read'

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch { return new Set() }
}

function markAsRead(id: string) {
  const set = getReadSet()
  set.add(id)
  // Cap at 500
  const arr = [...set]
  if (arr.length > 500) arr.splice(0, arr.length - 500)
  localStorage.setItem(READ_KEY, JSON.stringify(arr))
}

type EmailView = 'inbox' | 'sent' | 'starred'

// ── main component ───────────────────────────────────────

export default function EmailPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrg } = useOrg()
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)

  const [selectedMessageId, setSelectedMessageId] = useState<bigint | null>(null)
  const [view, setView] = useState<EmailView>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())

  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

  // Load read/starred/archived state on mount
  useEffect(() => {
    setReadIds(getReadSet())
    try {
      const starred = localStorage.getItem('omni-email-starred')
      if (starred) setStarredIds(new Set(JSON.parse(starred)))
      const archived = localStorage.getItem('omni-email-archived')
      if (archived) setArchivedIds(new Set(JSON.parse(archived)))
    } catch {}
  }, [])

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  const myIdentityHex = identity?.toHexString()

  // All emails sorted by time
  const allEmails = useMemo(
    () => [...allMessages]
      .filter((m) => m.messageType.tag === 'Email')
      .sort((a, b) => Number(b.sentAt.toMillis()) - Number(a.sentAt.toMillis())),
    [allMessages]
  )

  // Filter by view
  const viewEmails = useMemo(() => {
    let emails = allEmails

    if (view === 'sent') {
      emails = emails.filter(e => e.sender.toHexString() === myIdentityHex)
    } else if (view === 'starred') {
      emails = emails.filter(e => starredIds.has(String(e.id)))
    } else {
      // Inbox: exclude archived
      emails = emails.filter(e => !archivedIds.has(String(e.id)))
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      emails = emails.filter(e =>
        e.content.toLowerCase().includes(q) ||
        (employeeMap.get(e.sender.toHexString())?.name ?? '').toLowerCase().includes(q)
      )
    }

    return emails
  }, [allEmails, view, searchQuery, employeeMap, myIdentityHex, starredIds, archivedIds])

  const selectedEmail = allEmails.find((m) => m.id === selectedMessageId) ?? null

  // Counts
  const unreadCount = useMemo(() => {
    return allEmails.filter(e =>
      !archivedIds.has(String(e.id)) && !readIds.has(String(e.id))
    ).length
  }, [allEmails, readIds, archivedIds])

  const sentCount = useMemo(() =>
    allEmails.filter(e => e.sender.toHexString() === myIdentityHex).length,
    [allEmails, myIdentityHex]
  )

  const starredCount = useMemo(() =>
    allEmails.filter(e => starredIds.has(String(e.id))).length,
    [allEmails, starredIds]
  )

  const getSenderName = (senderId: { toHexString: () => string }) =>
    employeeMap.get(senderId.toHexString())?.name ?? 'Unknown'

  const getSenderRole = (senderId: { toHexString: () => string }) =>
    employeeMap.get(senderId.toHexString())?.role ?? ''

  // Actions
  const handleSelect = useCallback((id: bigint) => {
    setSelectedMessageId(id)
    const key = String(id)
    markAsRead(key)
    setReadIds(prev => new Set([...prev, key]))
  }, [])

  const toggleStar = useCallback((id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('omni-email-starred', JSON.stringify([...next]))
      return next
    })
  }, [])

  const handleArchive = useCallback((id: string) => {
    setArchivedIds(prev => {
      const next = new Set([...prev, id])
      localStorage.setItem('omni-email-archived', JSON.stringify([...next]))
      return next
    })
    if (String(selectedMessageId) === id) setSelectedMessageId(null)
  }, [selectedMessageId])

  const handleReply = useCallback(() => {
    if (!selectedEmail) return
    const sender = getSenderName(selectedEmail.sender)
    const parsed = parseSubject(selectedEmail.content)
    setComposeTo(sender)
    setComposeSubject(parsed.subject ? `Re: ${parsed.subject}` : '')
    setComposeBody(`\n\n---\nOn ${formatFullDate(selectedEmail.sentAt)}, ${sender} wrote:\n> ${parsed.body.split('\n').join('\n> ')}`)
    setReplying(true)
    setComposing(true)
  }, [selectedEmail, employeeMap])

  const handleForward = useCallback(() => {
    if (!selectedEmail) return
    const sender = getSenderName(selectedEmail.sender)
    const parsed = parseSubject(selectedEmail.content)
    setComposeTo('')
    setComposeSubject(parsed.subject ? `Fwd: ${parsed.subject}` : 'Fwd:')
    setComposeBody(`\n\n---\nForwarded message from ${sender}:\n\n${parsed.body}`)
    setReplying(false)
    setComposing(true)
  }, [selectedEmail, employeeMap])

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
      setReplying(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
    } catch (err) {
      console.error('Failed to send email:', err)
    } finally {
      setSending(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (composing) return

      if (e.key === 'c') { setComposing(true); e.preventDefault() }
      if (e.key === 'r' && selectedEmail) { handleReply(); e.preventDefault() }
      if (e.key === 'Escape') { setSelectedMessageId(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [composing, selectedEmail, handleReply])

  const navItems = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: unreadCount, color: 'text-blue-400' },
    { id: 'sent' as const, label: 'Sent', icon: SendHorizontal, count: sentCount, color: 'text-emerald-400' },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: starredCount, color: 'text-amber-400' },
  ]

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left sidebar - folders */}
      <div className="w-56 border-r flex-col hidden md:flex bg-muted/20">
        <div className="p-3">
          <Button className="w-full gap-2" size="sm" onClick={() => { setComposing(true); setReplying(false) }}>
            <Plus className="size-4" />
            Compose
          </Button>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedMessageId(null) }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                view === item.id
                  ? 'bg-accent text-accent-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <item.icon className={`size-4 ${view === item.id ? item.color : ''}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <Badge
                  variant={view === item.id ? 'default' : 'secondary'}
                  className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
                >
                  {item.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* Keyboard shortcuts hint */}
        <div className="p-3 border-t">
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
            <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[9px]">C</kbd> Compose</span>
            <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[9px]">R</kbd> Reply</span>
            <span><kbd className="px-1 py-0.5 rounded border bg-muted text-[9px]">Esc</kbd> Close</span>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center gap-1 border-b px-2 py-1 w-full absolute top-0 left-0 bg-background z-10">
        {selectedEmail ? (
          <Button variant="ghost" size="sm" onClick={() => setSelectedMessageId(null)} className="gap-1">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        ) : (
          <>
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={view === item.id ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setView(item.id)}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Button>
            ))}
            <Button className="ml-auto gap-1 text-xs" size="sm" onClick={() => setComposing(true)}>
              <Plus className="size-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Email list */}
      <div className={`w-full md:w-96 border-r flex flex-col ${selectedEmail ? 'hidden md:flex' : ''}`}>
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {viewEmails.length} {view === 'inbox' ? 'in inbox' : view === 'sent' ? 'sent' : 'starred'}
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <AnimatePresence>
            {viewEmails.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center p-12 text-muted-foreground"
              >
                {view === 'inbox' ? (
                  <MailOpen className="size-10 mb-3 opacity-30" />
                ) : view === 'starred' ? (
                  <Star className="size-10 mb-3 opacity-30" />
                ) : (
                  <SendHorizontal className="size-10 mb-3 opacity-30" />
                )}
                <p className="text-sm font-medium">
                  {view === 'inbox' ? 'Inbox zero' : view === 'starred' ? 'No starred emails' : 'No sent emails'}
                </p>
                <p className="text-xs mt-1">
                  {view === 'inbox' ? 'All caught up!' : view === 'starred' ? 'Star emails to find them here' : 'Sent emails appear here'}
                </p>
              </motion.div>
            ) : (
              viewEmails.map((email, idx) => {
                const isRead = readIds.has(String(email.id))
                const isStarred = starredIds.has(String(email.id))
                const isSelected = selectedMessageId === email.id
                const parsed = parseSubject(email.content)
                const senderName = getSenderName(email.sender)

                return (
                  <motion.button
                    key={String(email.id)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    onClick={() => handleSelect(email.id)}
                    className={`w-full text-left px-4 py-3 border-b transition-all group relative ${
                      isSelected
                        ? 'bg-accent shadow-sm'
                        : isRead
                          ? 'hover:bg-accent/40'
                          : 'bg-blue-500/[0.03] hover:bg-accent/40'
                    }`}
                  >
                    {/* Unread indicator */}
                    {!isRead && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-blue-400" />
                    )}

                    <div className="flex items-start gap-3">
                      <Avatar className="size-9 shrink-0 mt-0.5">
                        <AvatarFallback className={`text-[10px] text-white ${avatarColor(senderName)}`}>
                          {getInitials(senderName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!isRead ? 'font-semibold' : 'font-medium'}`}>
                            {senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                            {formatEmailDate(email.sentAt)}
                          </span>
                        </div>
                        {parsed.subject && (
                          <p className={`text-xs truncate mt-0.5 ${!isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {parsed.subject}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-relaxed">
                          {parsed.body.slice(0, 100)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {email.aiGenerated && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
                              <Bot className="size-2.5" />
                              AI
                            </Badge>
                          )}
                          {isStarred && (
                            <Star className="size-3 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )
              })
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* Email detail */}
      <div className={`flex-1 flex flex-col ${!selectedEmail ? 'hidden md:flex' : ''}`}>
        {selectedEmail ? (
          <motion.div
            key={String(selectedEmail.id)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            {/* Action bar */}
            <div className="p-2 border-b flex items-center gap-1 bg-muted/20">
              <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={() => setSelectedMessageId(null)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Separator orientation="vertical" className="h-5 md:hidden mx-1" />
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleReply}>
                <Reply className="size-3.5" />
                Reply
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleForward}>
                <Forward className="size-3.5" />
                Forward
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => toggleStar(String(selectedEmail.id))}
              >
                <Star className={`size-4 ${starredIds.has(String(selectedEmail.id)) ? 'text-amber-400 fill-amber-400' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => handleArchive(String(selectedEmail.id))}
              >
                <Archive className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Email content */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-6">
                {/* Subject */}
                {(() => {
                  const parsed = parseSubject(selectedEmail.content)
                  return (
                    <>
                      {parsed.subject && (
                        <h1 className="text-xl font-semibold mb-4">{parsed.subject}</h1>
                      )}

                      {/* Sender info */}
                      <div className="flex items-start gap-3 mb-6">
                        <Avatar className="size-10">
                          <AvatarFallback className={`text-xs text-white ${avatarColor(getSenderName(selectedEmail.sender))}`}>
                            {getInitials(getSenderName(selectedEmail.sender))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{getSenderName(selectedEmail.sender)}</span>
                            {getSenderRole(selectedEmail.sender) && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {getSenderRole(selectedEmail.sender)}
                              </Badge>
                            )}
                            {selectedEmail.aiGenerated && (
                              <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                                <Bot className="size-2.5" />
                                AI Generated
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {formatFullDate(selectedEmail.sentAt)}
                          </p>
                        </div>
                      </div>

                      <Separator className="mb-6" />

                      {/* Body */}
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-sm">
                        {parsed.body}
                      </div>
                    </>
                  )
                })()}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <Mail className="size-16 opacity-[0.08]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mail className="size-8 opacity-30" />
                </div>
              </div>
              <p className="text-sm font-medium">Select an email to read</p>
              <p className="text-xs mt-1">
                Or press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono mx-0.5">C</kbd> to compose
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Compose dialog */}
      <Dialog open={composing} onOpenChange={(open) => { if (!open) { setComposing(false); setReplying(false) } }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {replying ? <Reply className="size-4" /> : <Mail className="size-4" />}
              {replying ? 'Reply' : 'New Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                placeholder="Recipient name..."
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
              <Input
                placeholder="Subject..."
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Message</label>
              <Textarea
                placeholder="Write your email..."
                className="min-h-[200px] resize-none"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-8 mr-auto">
              <Paperclip className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => { setComposing(false); setReplying(false) }}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sending || (!composeSubject.trim() && !composeBody.trim())}
              className="gap-2"
            >
              <Send className="size-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
