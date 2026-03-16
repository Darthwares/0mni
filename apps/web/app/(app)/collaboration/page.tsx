'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { exportCSV } from '@/lib/csv-export'
import {
  Hash,
  Lock,
  Users,
  Bot,
  Send,
  FileText,
  BookOpen,
  BookMarked,
  FileCheck,
  ClipboardList,
  Code2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDot,
  Play,
  Sparkles,
  Wrench,
  ListChecks,
  Plus,
  Trash2,
  Search,
  Download,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import BlurText from '@/components/reactbits/BlurText'

// ---- Helpers ----

function formatTimestamp(ts: { toDate(): Date }): string {
  const d = ts.toDate()
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString()
}

function formatDateTime(ts: { toDate(): Date }): string {
  return ts.toDate().toLocaleString()
}

function formatShortId(identity: { toHexString(): string }): string {
  const hex = identity.toHexString()
  return hex.slice(0, 6).toUpperCase()
}

// ---- Doc Type ----

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  Wiki: { label: 'Wiki', icon: <BookOpen className="size-3" />, variant: 'secondary' },
  Runbook: { label: 'Runbook', icon: <Wrench className="size-3" />, variant: 'outline' },
  OnboardingGuide: { label: 'Onboarding', icon: <BookMarked className="size-3" />, variant: 'secondary' },
  PolicyDocument: { label: 'Policy', icon: <FileCheck className="size-3" />, variant: 'outline' },
  MeetingNotes: { label: 'Meeting Notes', icon: <ClipboardList className="size-3" />, variant: 'secondary' },
  TechnicalSpec: { label: 'Tech Spec', icon: <Code2 className="size-3" />, variant: 'outline' },
}

// ---- Meeting Type ----

const MEETING_TYPE_LABELS: Record<string, string> = {
  OneOnOne: '1:1',
  TeamSync: 'Team Sync',
  CustomerCall: 'Customer Call',
  InterviewCall: 'Interview',
  SalesDemo: 'Sales Demo',
  AllHands: 'All Hands',
}

// ---- Meeting Status ----

function MeetingStatusBadge({ tag }: { tag: string }) {
  const configs: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    Scheduled:  { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: <Calendar className="size-3" />, label: 'Scheduled' },
    InProgress: { cls: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: <Play className="size-3" />, label: 'In Progress' },
    Completed:  { cls: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20', icon: <CheckCircle2 className="size-3" />, label: 'Completed' },
    Cancelled:  { cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <XCircle className="size-3" />, label: 'Cancelled' },
  }
  const config = configs[tag] ?? { cls: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20', icon: null, label: tag }
  return (
    <Badge className={`${config.cls} gap-1`} variant="outline">
      {config.icon}
      {config.label}
    </Badge>
  )
}

// ---- Channels Tab ----

function ChannelsTab() {
  const { currentOrgId } = useOrg()
  const [allChannels] = useTable(tables.channel)
  const [allMessages] = useTable(tables.message)
  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(null)
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

  const orgChannels = useMemo(
    () => allChannels.filter(c => Number(c.orgId) === currentOrgId),
    [allChannels, currentOrgId]
  )

  const channels = useMemo(
    () => [...orgChannels].sort((a, b) => a.name.localeCompare(b.name)),
    [orgChannels]
  )

  const selectedChannel = useMemo(
    () => channels.find(c => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const messages = useMemo(
    () =>
      selectedChannel
        ? [...allMessages]
            .filter(
              m =>
                m.contextType?.tag === 'Channel' &&
                m.contextId === selectedChannel.id
            )
            .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
        : [],
    [allMessages, selectedChannel]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend() {
    const content = draft.trim()
    if (!content || !selectedChannel) return
    sendMessage({
      contextType: { tag: 'Channel' } as any,
      contextId: selectedChannel.id,
      content,
      messageType: { tag: 'Chat' } as any,
    })
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {channels.map(channel => (
              <button
                key={channel.id.toString()}
                onClick={() => setSelectedChannelId(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors group ${
                  selectedChannelId === channel.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground/80 hover:text-foreground'
                }`}
              >
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground">
                  {channel.isPrivate ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Hash className="size-3.5" />
                  )}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {channel.name}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                  <Users className="size-3" />
                  {channel.members.length}
                </span>
              </button>
            ))}
            {channels.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                No channels yet
              </p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main area */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background flex-shrink-0">
            <span className="text-muted-foreground">
              {selectedChannel.isPrivate ? (
                <Lock className="size-4" />
              ) : (
                <Hash className="size-4" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">{selectedChannel.name}</h2>
              {selectedChannel.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedChannel.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-shrink-0">
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {selectedChannel.members.length}
              </span>
              {selectedChannel.aiParticipants.length > 0 && (
                <span className="flex items-center gap-1 text-violet-600">
                  <Bot className="size-3.5" />
                  {selectedChannel.aiParticipants.length} AI
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {messages.map(message => {
                const senderInitials = formatShortId(message.sender)
                return (
                  <div key={message.id.toString()} className="flex gap-3 group">
                    <Avatar className="flex-shrink-0 mt-0.5">
                      <AvatarFallback
                        className={
                          message.aiGenerated
                            ? 'bg-violet-100 text-violet-700 text-xs'
                            : 'bg-muted text-muted-foreground text-xs'
                        }
                      >
                        {message.aiGenerated ? (
                          <Bot className="size-4" />
                        ) : (
                          senderInitials.slice(0, 2)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {message.aiGenerated ? 'AI Agent' : `User ${senderInitials}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.sentAt)}
                        </span>
                        {message.aiGenerated && (
                          <Badge variant="secondary" className="text-xs gap-1 h-4 px-1.5">
                            <Sparkles className="size-2.5" />
                            AI
                          </Badge>
                        )}
                        {message.aiConfidence != null && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(message.aiConfidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">
                  <Hash className="size-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation in #{selectedChannel.name}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="px-4 py-3 border-t bg-background flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${selectedChannel.name}`}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!draft.trim()}
                size="sm"
                className="gap-1.5"
              >
                <Send className="size-3.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/10">
          <div className="text-center text-muted-foreground">
            <Hash className="size-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium">Select a channel</p>
            <p className="text-sm mt-1">Choose a channel from the sidebar to view messages</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Documents Tab ----

function DocumentsTab() {
  const { currentOrgId } = useOrg()
  const [allDocuments] = useTable(tables.document)
  const [docSearch, setDocSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')

  const orgDocuments = useMemo(
    () => allDocuments.filter(d => Number(d.orgId) === currentOrgId),
    [allDocuments, currentOrgId]
  )

  const documents = useMemo(
    () => [...orgDocuments].sort((a, b) => Number(b.updatedAt.toMillis()) - Number(a.updatedAt.toMillis())),
    [orgDocuments]
  )

  const filteredDocs = useMemo(() => {
    let list = documents
    if (docTypeFilter !== 'all') list = list.filter(d => d.docType?.tag === docTypeFilter)
    if (docSearch.trim()) {
      const q = docSearch.toLowerCase()
      list = list.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
    }
    return list
  }, [documents, docTypeFilter, docSearch])

  const docTypeCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const d of documents) c[d.docType?.tag] = (c[d.docType?.tag] ?? 0) + 1
    return c
  }, [documents])

  return (
    <div className="p-6 space-y-4">
      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={docSearch} onChange={e => setDocSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => setDocTypeFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${docTypeFilter === 'all' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'text-neutral-500 hover:text-neutral-700 border border-transparent'}`}>
            All
          </button>
          {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]) => {
            const count = docTypeCounts[key] ?? 0
            if (count === 0) return null
            return (
              <button key={key} onClick={() => setDocTypeFilter(docTypeFilter === key ? 'all' : key)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${docTypeFilter === key ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'text-neutral-500 hover:text-neutral-700 border border-transparent'}`}>
                {cfg.icon} {cfg.label} <span className="text-[10px] opacity-60">{count}</span>
              </button>
            )
          })}
          <span className="text-xs text-neutral-400 tabular-nums ml-auto">{filteredDocs.length} doc{filteredDocs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FileText className="size-12 mb-4 opacity-20" />
          <p className="text-base font-medium">{docSearch || docTypeFilter !== 'all' ? 'No matching documents' : 'No documents yet'}</p>
          <p className="text-sm mt-1">{docSearch || docTypeFilter !== 'all' ? 'Try adjusting your filters' : 'Documents will appear here when they are created'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const typeKey = doc.docType?.tag
            const typeConfig = DOC_TYPE_CONFIG[typeKey] ?? {
              label: typeKey,
              icon: <FileText className="size-3" />,
              variant: 'outline' as const,
            }
            const preview = doc.content.slice(0, 100) + (doc.content.length > 100 ? '…' : '')

            return (
              <div
                key={doc.id.toString()}
                className="rounded-xl border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
              <div className="p-4 flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug flex-1 min-w-0 truncate">
                    {doc.title}
                  </h3>
                  <Badge variant={typeConfig.variant} className="gap-1 flex-shrink-0">
                    {typeConfig.icon}
                    {typeConfig.label}
                  </Badge>
                </div>

                {/* AI badges */}
                {(doc.aiGenerated || doc.aiMaintained) && (
                  <div className="flex flex-wrap gap-1.5">
                    {doc.aiGenerated && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="size-2.5" />
                        AI Generated
                      </Badge>
                    )}
                    {doc.aiMaintained && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Bot className="size-2.5" />
                        AI Maintained
                      </Badge>
                    )}
                  </div>
                )}

                {/* Content preview */}
                {preview && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {preview}
                  </p>
                )}

                <Separator />

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {doc.editors.length} {doc.editors.length === 1 ? 'editor' : 'editors'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatTimestamp(doc.updatedAt)}
                  </span>
                </div>
              </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Meetings Tab ----

function MeetingsTab() {
  const { currentOrgId } = useOrg()
  const [allMeetings] = useTable(tables.meeting)
  const createMeeting = useSpacetimeReducer(reducers.createMeeting)
  const updateMeetingStatus = useSpacetimeReducer(reducers.updateMeetingStatus)
  const deleteMeeting = useSpacetimeReducer(reducers.deleteMeeting)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [mtgTitle, setMtgTitle] = useState('')
  const [mtgType, setMtgType] = useState('TeamSync')
  const [mtgDate, setMtgDate] = useState('')
  const [mtgDuration, setMtgDuration] = useState('30')
  const [mtgSearch, setMtgSearch] = useState('')

  const meetings = useMemo(
    () => [...allMeetings].sort((a, b) => Number(a.scheduledAt.toMillis()) - Number(b.scheduledAt.toMillis())),
    [allMeetings]
  )

  const filteredMeetings = useMemo(() => {
    if (!mtgSearch.trim()) return meetings
    const q = mtgSearch.toLowerCase()
    return meetings.filter(m => m.title.toLowerCase().includes(q) || (MEETING_TYPE_LABELS[m.meetingType?.tag] ?? '').toLowerCase().includes(q))
  }, [meetings, mtgSearch])

  const handleExportMeetings = useCallback(() => {
    exportCSV('meetings', [
      { header: 'Title', accessor: (m: any) => m.title },
      { header: 'Type', accessor: (m: any) => MEETING_TYPE_LABELS[m.meetingType?.tag] ?? m.meetingType?.tag },
      { header: 'Scheduled', accessor: (m: any) => formatDateTime(m.scheduledAt) },
      { header: 'Duration (min)', accessor: (m: any) => m.durationMinutes },
      { header: 'Participants', accessor: (m: any) => m.participants.length },
      { header: 'Status', accessor: (m: any) => m.status?.tag },
      { header: 'AI Notetaker', accessor: (m: any) => m.aiNotetaker ? 'Yes' : 'No' },
      { header: 'AI Summary', accessor: (m: any) => m.aiSummary ?? '' },
    ], filteredMeetings)
  }, [filteredMeetings])

  const handleCreate = useCallback(() => {
    if (!mtgTitle.trim() || !mtgDate || currentOrgId === null) return
    try {
      createMeeting({
        orgId: BigInt(currentOrgId),
        title: mtgTitle.trim(),
        meetingType: { tag: mtgType } as any,
        scheduledAt: BigInt(new Date(mtgDate).getTime() * 1000),
        durationMinutes: parseInt(mtgDuration) || 30,
        participants: [],
      })
    } catch (e) { console.error('Failed to create meeting:', e) }
    setDialogOpen(false)
    setMtgTitle(''); setMtgType('TeamSync'); setMtgDate(''); setMtgDuration('30')
  }, [mtgTitle, mtgType, mtgDate, mtgDuration, currentOrgId, createMeeting])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search meetings..." value={mtgSearch} onChange={e => setMtgSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <span className="text-xs text-neutral-400 tabular-nums">{filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMeetings} className="gap-1.5 h-8">
            <Download className="size-3.5" />Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="size-4" /> Schedule Meeting
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1.5">
                <Label>Title *</Label>
                <Input placeholder="Weekly standup" value={mtgTitle} onChange={(e) => setMtgTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Type</Label>
                  <Select value={mtgType} onValueChange={setMtgType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEETING_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={mtgDuration} onChange={(e) => setMtgDuration(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date & Time *</Label>
                <Input type="datetime-local" value={mtgDate} onChange={(e) => setMtgDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!mtgTitle.trim() || !mtgDate}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Calendar className="size-12 mb-4 opacity-20" />
          <p className="text-base font-medium">{mtgSearch ? 'No matching meetings' : 'No meetings scheduled'}</p>
          <p className="text-sm mt-1">{mtgSearch ? 'Try a different search term' : 'Click "Schedule Meeting" to get started'}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-[11px] uppercase tracking-wider font-semibold">Title</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Scheduled</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Duration</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Participants</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">AI Summary</TableHead>
                <TableHead className="pr-4 text-[11px] uppercase tracking-wider font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeetings.map(meeting => {
                const typeLabel = MEETING_TYPE_LABELS[meeting.meetingType?.tag] ?? meeting.meetingType?.tag
                const summaryPreview = meeting.aiSummary
                  ? meeting.aiSummary.slice(0, 80) + (meeting.aiSummary.length > 80 ? '…' : '')
                  : null

                return (
                  <TableRow key={meeting.id.toString()} className="group">
                    <TableCell className="font-medium max-w-[200px]">
                      <span className="truncate block">{meeting.title}</span>
                      {meeting.aiNotetaker && (
                        <span className="flex items-center gap-1 text-xs text-violet-600 mt-0.5">
                          <Bot className="size-3" /> AI Notetaker
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">{typeLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(meeting.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1"><Clock className="size-3" />{meeting.durationMinutes}m</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />{meeting.participants.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MeetingStatusBadge tag={meeting.status?.tag} />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {summaryPreview ? (
                        <span className="flex items-start gap-1 text-xs text-muted-foreground">
                          <Sparkles className="size-3 flex-shrink-0 mt-0.5 text-violet-500" />
                          <span className="truncate">{summaryPreview}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Select value={meeting.status?.tag} onValueChange={(v) => { try { updateMeetingStatus({ meetingId: meeting.id, newStatus: { tag: v } as any }) } catch (e) { console.error(e) } }}>
                          <SelectTrigger className="h-6 text-[11px] w-[90px] px-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Scheduled', 'InProgress', 'Completed', 'Cancelled'].map((s) => (
                              <SelectItem key={s} value={s}>{s === 'InProgress' ? 'In Progress' : s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { if (confirm('Delete this meeting?')) try { deleteMeeting({ meetingId: meeting.id }) } catch (e) { console.error(e) } }}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ---- Page ----

export default function CollaborationPage() {
  const [allChannels] = useTable(tables.channel)
  const [allDocuments] = useTable(tables.document)
  const [allMeetings] = useTable(tables.meeting)

  const channelCount = allChannels.length
  const documentCount = allDocuments.length
  const upcomingCount = useMemo(
    () => [...allMeetings].filter(m => m.status?.tag === 'Scheduled').length,
    [allMeetings]
  )

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Users className="size-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <GradientText
                  colors={['#6366f1', '#8b5cf6', '#a855f7', '#6366f1']}
                  animationSpeed={6}
                >
                  Collaboration
                </GradientText>
              </h1>
              <BlurText
                text="Unified workspace for teams and AI agents"
                delay={35}
                animateBy="words"
                className="text-sm text-muted-foreground mt-0.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">
              <Hash className="size-3.5 text-indigo-500" />
              <span className="font-bold tabular-nums"><CountUp to={channelCount} duration={1.2} /></span>
              <span className="text-muted-foreground text-xs">channels</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">
              <FileText className="size-3.5 text-violet-500" />
              <span className="font-bold tabular-nums"><CountUp to={documentCount} duration={1.2} /></span>
              <span className="text-muted-foreground text-xs">docs</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-sm">
              <CircleDot className="size-3.5 text-green-500" />
              <span className="font-bold tabular-nums text-green-600 dark:text-green-400"><CountUp to={upcomingCount} duration={1.2} /></span>
              <span className="text-muted-foreground text-xs">upcoming</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="channels" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-2 border-b flex-shrink-0">
          <TabsList variant="line">
            <TabsTrigger value="channels" className="gap-1.5">
              <Hash className="size-4" />
              Channels
              <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
                {channelCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="size-4" />
              Documents
              <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
                {documentCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5">
              <Calendar className="size-4" />
              Meetings
              <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono tabular-nums leading-none">
                {allMeetings.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="channels" className="flex-1 overflow-hidden m-0 p-0">
          <ChannelsTab />
        </TabsContent>

        <TabsContent value="documents" className="flex-1 overflow-auto m-0 p-0">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="meetings" className="flex-1 overflow-auto m-0 p-0">
          <MeetingsTab />
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </div>
  )
}
