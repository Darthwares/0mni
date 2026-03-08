'use client'

import { useMemo, useState } from 'react'
import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  AlertCircle,
  Bot,
  Plus,
  Paperclip,
} from 'lucide-react'

type EmailView = 'inbox' | 'sent' | 'drafts' | 'starred'

export default function EmailPage() {
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
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

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
    if (!searchQuery) return emails
    const q = searchQuery.toLowerCase()
    return emails.filter(
      (e) =>
        e.content.toLowerCase().includes(q) ||
        (employeeMap.get(e.sender.toHexString())?.name ?? '').toLowerCase().includes(q)
    )
  }, [emails, searchQuery, employeeMap])

  const selectedEmail = emails.find((m) => m.id === selectedMessageId) ?? null

  const getSenderName = (senderId: { toHexString: () => string }) => {
    const emp = employeeMap.get(senderId.toHexString())
    return emp?.name ?? 'Unknown'
  }

  const getSenderInitials = (senderId: { toHexString: () => string }) => {
    const name = getSenderName(senderId)
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (ts: any) => {
    try {
      const d = ts.toDate()
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const navItems = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: emails.length },
    { id: 'sent' as const, label: 'Sent', icon: SendHorizontal, count: 0 },
    { id: 'drafts' as const, label: 'Drafts', icon: FileText, count: 0 },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: 0 },
  ]

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left sidebar - folders */}
      <div className="w-56 border-r flex flex-col">
        <div className="p-3">
          <Button className="w-full" size="sm" onClick={() => setComposing(true)}>
            <Plus className="mr-2 size-4" />
            Compose
          </Button>
        </div>
        <nav className="flex-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                view === item.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              <item.icon className="size-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span className="text-xs text-muted-foreground">{item.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Email list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Mail className="size-8 mb-2 opacity-50" />
              <p className="text-sm">No emails yet</p>
              <p className="text-xs">Email messages will appear here</p>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <button
                key={String(email.id)}
                onClick={() => setSelectedMessageId(email.id)}
                className={`w-full text-left p-3 border-b transition-colors ${
                  selectedMessageId === email.id
                    ? 'bg-accent'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {getSenderInitials(email.sender)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {getSenderName(email.sender)}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(email.sentAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email.content.slice(0, 80)}
                    </p>
                    {email.aiGenerated && (
                      <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1">
                        <Bot className="size-2.5 mr-0.5" />
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Email detail / compose */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Email</h2>
              <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                Cancel
              </Button>
            </div>
            <div className="space-y-3 flex-1 flex flex-col">
              <Input placeholder="To:" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
              <Input placeholder="Subject:" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
              <Textarea placeholder="Write your email..." className="flex-1 min-h-[300px] resize-none" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
              <div className="flex items-center gap-2">
                <Button onClick={handleSendEmail} disabled={sending || (!composeSubject.trim() && !composeBody.trim())}>
                  <Send className="mr-2 size-4" />
                  {sending ? 'Sending...' : 'Send'}
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : selectedEmail ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center gap-2">
              <Button variant="ghost" size="icon" className="size-8">
                <Reply className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Forward className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Archive className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Star className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="size-10">
                  <AvatarFallback>
                    {getSenderInitials(selectedEmail.sender)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{getSenderName(selectedEmail.sender)}</span>
                    {selectedEmail.aiGenerated && (
                      <Badge variant="secondary" className="text-[10px] h-4">
                        <Bot className="size-2.5 mr-0.5" />
                        AI Generated
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(selectedEmail.sentAt)}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {selectedEmail.content}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="size-12 mb-3 opacity-30" />
            <p className="text-sm">Select an email to read</p>
            <p className="text-xs">Or compose a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
