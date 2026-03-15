'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useRef, useEffect } from 'react'
import { tables, reducers } from '@/generated'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
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
  Search,
  MessageSquare,
} from 'lucide-react'

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
  return identity.toHexString().slice(0, 6).toUpperCase()
}

// ---- Doc Type ----

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Wiki: { label: 'Wiki', icon: <BookOpen className="size-3" />, color: 'text-blue-500 bg-blue-500/10' },
  Runbook: { label: 'Runbook', icon: <Wrench className="size-3" />, color: 'text-orange-500 bg-orange-500/10' },
  OnboardingGuide: { label: 'Onboarding', icon: <BookMarked className="size-3" />, color: 'text-emerald-500 bg-emerald-500/10' },
  PolicyDocument: { label: 'Policy', icon: <FileCheck className="size-3" />, color: 'text-red-500 bg-red-500/10' },
  MeetingNotes: { label: 'Meeting Notes', icon: <ClipboardList className="size-3" />, color: 'text-violet-500 bg-violet-500/10' },
  TechnicalSpec: { label: 'Tech Spec', icon: <Code2 className="size-3" />, color: 'text-cyan-500 bg-cyan-500/10' },
}

// ---- Meeting helpers ----

const MEETING_TYPE_LABELS: Record<string, string> = {
  OneOnOne: '1:1',
  TeamSync: 'Team Sync',
  CustomerCall: 'Customer Call',
  InterviewCall: 'Interview',
  SalesDemo: 'Sales Demo',
  AllHands: 'All Hands',
}

const meetingStatusStyles: Record<string, string> = {
  Scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  InProgress: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Completed: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
  Cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const meetingStatusIcons: Record<string, React.ReactNode> = {
  Scheduled: <Calendar className="size-3" />,
  InProgress: <Play className="size-3" />,
  Completed: <CheckCircle2 className="size-3" />,
  Cancelled: <XCircle className="size-3" />,
}

function MeetingStatusBadge({ tag }: { tag: string }) {
  const cls = meetingStatusStyles[tag] ?? meetingStatusStyles.Completed
  const label = tag === 'InProgress' ? 'In Progress' : tag
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {meetingStatusIcons[tag]}
      {label}
    </span>
  )
}

// ---- Channels Tab ----

function ChannelsTab() {
  const [allChannels] = useTable(tables.channel)
  const [allMessages] = useTable(tables.message)
  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(null)
  const [draft, setDraft] = useState('')
  const [channelSearch, setChannelSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

  const channels = useMemo(
    () => [...allChannels].sort((a, b) => a.name.localeCompare(b.name)),
    [allChannels]
  )

  const filteredChannels = useMemo(() => {
    if (!channelSearch) return channels
    const q = channelSearch.toLowerCase()
    return channels.filter(c => c.name.toLowerCase().includes(q))
  }, [channels, channelSearch])

  const selectedChannel = useMemo(
    () => channels.find(c => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const messages = useMemo(
    () =>
      selectedChannel
        ? [...allMessages]
            .filter(m => m.contextType.tag === 'Channel' && m.contextId === selectedChannel.id)
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
      <aside className="w-64 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              className="pl-7 h-8 text-xs"
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredChannels.map(channel => (
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
                  {channel.isPrivate ? <Lock className="size-3.5" /> : <Hash className="size-3.5" />}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{channel.name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                  <Users className="size-3" />
                  {channel.members.length}
                </span>
              </button>
            ))}
            {filteredChannels.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">No channels found</p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {selectedChannel ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background flex-shrink-0">
            <span className="text-muted-foreground">
              {selectedChannel.isPrivate ? <Lock className="size-4" /> : <Hash className="size-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">{selectedChannel.name}</h2>
              {selectedChannel.description && (
                <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>
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
                  {selectedChannel.aiParticipants.length}
                </span>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {messages.map(message => {
                const senderInitials = formatShortId(message.sender)
                return (
                  <div key={message.id.toString()} className="flex gap-3 group">
                    <Avatar className="flex-shrink-0 mt-0.5 size-8">
                      <AvatarFallback className={
                        message.aiGenerated
                          ? 'bg-violet-500/10 text-violet-600 text-[10px]'
                          : 'bg-muted text-muted-foreground text-[10px]'
                      }>
                        {message.aiGenerated ? <Bot className="size-3.5" /> : senderInitials.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-medium text-sm">
                          {message.aiGenerated ? 'AI Agent' : `User ${senderInitials}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTimestamp(message.sentAt)}</span>
                        {message.aiGenerated && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 h-4 px-1">
                            <Sparkles className="size-2.5" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">
                  <Hash className="size-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation in #{selectedChannel.name}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="px-4 py-3 border-t bg-background flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${selectedChannel.name}`}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!draft.trim()} size="sm" className="gap-1.5">
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
  const [allDocuments] = useTable(tables.document)
  const [docSearch, setDocSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')

  const documents = useMemo(
    () => [...allDocuments].sort((a, b) => Number(b.updatedAt.toMillis()) - Number(a.updatedAt.toMillis())),
    [allDocuments]
  )

  const filteredDocs = useMemo(() => {
    let docs = documents
    if (docTypeFilter !== 'all') docs = docs.filter(d => d.docType.tag === docTypeFilter)
    if (docSearch) {
      const q = docSearch.toLowerCase()
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
    }
    return docs
  }, [documents, docTypeFilter, docSearch])

  const docTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.docType.tag))
    return Array.from(types)
  }, [documents])

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9 h-8 text-xs"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDocTypeFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              docTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            All
          </button>
          {docTypes.map((t) => {
            const cfg = DOC_TYPE_CONFIG[t]
            return (
              <button
                key={t}
                onClick={() => setDocTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  docTypeFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {cfg?.label ?? t}
              </button>
            )
          })}
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="size-10 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No documents found</p>
            <p className="text-xs text-muted-foreground mt-1">Documents will appear here when created</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const typeKey = doc.docType.tag
            const typeConfig = DOC_TYPE_CONFIG[typeKey] ?? {
              label: typeKey,
              icon: <FileText className="size-3" />,
              color: 'text-neutral-500 bg-neutral-500/10',
            }
            const preview = doc.content.slice(0, 120) + (doc.content.length > 120 ? '...' : '')
            const wordCount = doc.content.split(/\s+/).filter(Boolean).length

            return (
              <SpotlightCard
                key={doc.id.toString()}
                className="rounded-xl border bg-card text-card-foreground shadow-sm cursor-pointer"
                spotlightColor="rgba(139, 92, 246, 0.08)"
              >
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug flex-1 min-w-0 line-clamp-2">{doc.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${typeConfig.color}`}>
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>
                  </div>

                  {(doc.aiGenerated || doc.aiMaintained) && (
                    <div className="flex flex-wrap gap-1">
                      {doc.aiGenerated && (
                        <Badge variant="secondary" className="gap-0.5 text-[10px] h-4 px-1.5">
                          <Sparkles className="size-2.5" />
                          AI Generated
                        </Badge>
                      )}
                      {doc.aiMaintained && (
                        <Badge variant="secondary" className="gap-0.5 text-[10px] h-4 px-1.5">
                          <Bot className="size-2.5" />
                          AI Maintained
                        </Badge>
                      )}
                    </div>
                  )}

                  {preview && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{preview}</p>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {doc.editors.length}
                      </span>
                      <span>{wordCount.toLocaleString()} words</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTimestamp(doc.updatedAt)}
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Meetings Tab ----

function MeetingsTab() {
  const [allMeetings] = useTable(tables.meeting)
  const [meetingFilter, setMeetingFilter] = useState<string>('all')

  const meetings = useMemo(
    () => [...allMeetings].sort((a, b) => Number(a.scheduledAt.toMillis()) - Number(b.scheduledAt.toMillis())),
    [allMeetings]
  )

  const filteredMeetings = useMemo(() => {
    if (meetingFilter === 'all') return meetings
    return meetings.filter(m => m.status.tag === meetingFilter)
  }, [meetings, meetingFilter])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-1">
        {['all', 'Scheduled', 'InProgress', 'Completed'].map((s) => (
          <button
            key={s}
            onClick={() => setMeetingFilter(s)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              meetingFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'all' ? 'All' : s === 'InProgress' ? 'Live' : s}
          </button>
        ))}
      </div>

      {filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="size-10 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No meetings found</p>
            <p className="text-xs text-muted-foreground mt-1">Meetings will appear here when scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Summary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map(meeting => {
                  const typeLabel = MEETING_TYPE_LABELS[meeting.meetingType.tag] ?? meeting.meetingType.tag
                  const summaryPreview = meeting.aiSummary
                    ? meeting.aiSummary.slice(0, 60) + (meeting.aiSummary.length > 60 ? '...' : '')
                    : null

                  return (
                    <TableRow key={meeting.id.toString()}>
                      <TableCell>
                        <span className="text-sm font-medium line-clamp-1">{meeting.title}</span>
                        {meeting.aiNotetaker && (
                          <span className="flex items-center gap-1 text-[10px] text-violet-600 mt-0.5">
                            <Bot className="size-2.5" />
                            AI Notetaker
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(meeting.scheduledAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {meeting.durationMinutes}m
                        </span>
                      </TableCell>
                      <TableCell>
                        <MeetingStatusBadge tag={meeting.status.tag} />
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {summaryPreview ? (
                          <span className="flex items-start gap-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3 flex-shrink-0 mt-0.5 text-violet-500" />
                            <span className="truncate">{summaryPreview}</span>
                          </span>
                        ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {meeting.actionItems.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ListChecks className="size-3" />
                            {meeting.actionItems.filter(i => i.completed).length}/{meeting.actionItems.length}
                          </span>
                        ) : <span className="text-muted-foreground/30 text-xs">—</span>}
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
  )
}

// ---- Page ----

export default function CollaborationPage() {
  const [allChannels] = useTable(tables.channel)
  const [allDocuments] = useTable(tables.document)
  const [allMeetings] = useTable(tables.meeting)
  const [allMessages] = useTable(tables.message)

  const channelCount = allChannels.length
  const documentCount = allDocuments.length
  const messageCount = allMessages.length
  const upcomingCount = useMemo(
    () => [...allMeetings].filter(m => m.status.tag === 'Scheduled').length,
    [allMeetings]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <GradientText colors={['#3B82F6', '#8B5CF6', '#EC4899']} animationSpeed={4} className="text-xl font-bold">
                Collaboration
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Unified workspace for teams and AI agents
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            {[
              { icon: Hash, value: channelCount, label: 'channels', color: 'text-blue-500' },
              { icon: FileText, value: documentCount, label: 'docs', color: 'text-violet-500' },
              { icon: MessageSquare, value: messageCount, label: 'messages', color: 'text-emerald-500' },
              { icon: CircleDot, value: upcomingCount, label: 'upcoming', color: 'text-amber-500' },
            ].map((stat) => (
              <span key={stat.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className={`size-3.5 ${stat.color}`} />
                <span className="font-semibold text-foreground tabular-nums">
                  <CountUp to={stat.value} duration={1} />
                </span>
                {stat.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="channels" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-2 border-b flex-shrink-0">
          <TabsList variant="line">
            <TabsTrigger value="channels" className="gap-1.5">
              <Hash className="size-3.5" />
              Channels
              {channelCount > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({channelCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="size-3.5" />
              Documents
              {documentCount > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({documentCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5">
              <Calendar className="size-3.5" />
              Meetings
              {allMeetings.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({allMeetings.length})</span>
              )}
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
  )
}
