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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'

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
  switch (tag) {
    case 'Scheduled':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
          <Calendar className="size-3" />
          Scheduled
        </Badge>
      )
    case 'InProgress':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1" variant="outline">
          <Play className="size-3" />
          In Progress
        </Badge>
      )
    case 'Completed':
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1" variant="outline">
          <CheckCircle2 className="size-3" />
          Completed
        </Badge>
      )
    case 'Cancelled':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1" variant="outline">
          <XCircle className="size-3" />
          Cancelled
        </Badge>
      )
    default:
      return <Badge variant="outline">{tag}</Badge>
  }
}

// ---- Channels Tab ----

function ChannelsTab() {
  const [allChannels] = useTable(tables.channel)
  const [allMessages] = useTable(tables.message)
  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(null)
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendMessage = useSpacetimeReducer(reducers.sendMessage)

  const channels = useMemo(
    () => [...allChannels].sort((a, b) => a.name.localeCompare(b.name)),
    [allChannels]
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
                m.contextType.tag === 'Channel' &&
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
  const [allDocuments] = useTable(tables.document)

  const documents = useMemo(
    () => [...allDocuments].sort((a, b) => Number(b.updatedAt.toMillis()) - Number(a.updatedAt.toMillis())),
    [allDocuments]
  )

  return (
    <div className="p-6">
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <FileText className="size-12 mb-4 opacity-20" />
          <p className="text-base font-medium">No documents yet</p>
          <p className="text-sm mt-1">Documents will appear here when they are created</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map(doc => {
            const typeKey = doc.docType.tag
            const typeConfig = DOC_TYPE_CONFIG[typeKey] ?? {
              label: typeKey,
              icon: <FileText className="size-3" />,
              variant: 'outline' as const,
            }
            const preview = doc.content.slice(0, 100) + (doc.content.length > 100 ? '…' : '')

            return (
              <div
                key={doc.id.toString()}
                className="rounded-xl border bg-card p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer"
              >
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

  const meetings = useMemo(
    () => [...allMeetings].sort((a, b) => Number(a.scheduledAt.toMillis()) - Number(b.scheduledAt.toMillis())),
    [allMeetings]
  )

  return (
    <div className="p-6">
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Calendar className="size-12 mb-4 opacity-20" />
          <p className="text-base font-medium">No meetings scheduled</p>
          <p className="text-sm mt-1">Meetings will appear here when they are created</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Summary</TableHead>
                <TableHead>Action Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map(meeting => {
                const typeLabel = MEETING_TYPE_LABELS[meeting.meetingType.tag] ?? meeting.meetingType.tag
                const summaryPreview = meeting.aiSummary
                  ? meeting.aiSummary.slice(0, 80) + (meeting.aiSummary.length > 80 ? '…' : '')
                  : null

                return (
                  <TableRow key={meeting.id.toString()}>
                    {/* Title */}
                    <TableCell className="font-medium max-w-[200px]">
                      <span className="truncate block">{meeting.title}</span>
                      {meeting.aiNotetaker && (
                        <span className="flex items-center gap-1 text-xs text-violet-600 mt-0.5">
                          <Bot className="size-3" />
                          AI Notetaker
                        </span>
                      )}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {typeLabel}
                      </Badge>
                    </TableCell>

                    {/* Scheduled */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(meeting.scheduledAt)}
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {meeting.durationMinutes}m
                      </span>
                    </TableCell>

                    {/* Participants */}
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        {meeting.participants.length}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <MeetingStatusBadge tag={meeting.status.tag} />
                    </TableCell>

                    {/* AI Summary */}
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

                    {/* Action Items */}
                    <TableCell>
                      {meeting.actionItems.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ListChecks className="size-3" />
                          {meeting.actionItems.length}
                          <span className="text-muted-foreground/60">
                            ({meeting.actionItems.filter(i => i.completed).length} done)
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
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
    () => [...allMeetings].filter(m => m.status.tag === 'Scheduled').length,
    [allMeetings]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              <GradientText colors={['#3B82F6', '#06B6D4', '#10B981']} animationSpeed={5} className="text-xl font-semibold">
                Collaboration
              </GradientText>
            </h1>
            <p className="text-sm text-muted-foreground">
              Unified workspace for teams and AI agents
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hash className="size-4" />
              <span className="font-medium text-foreground">{channelCount}</span> channels
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="size-4" />
              <span className="font-medium text-foreground">{documentCount}</span> docs
            </span>
            <span className="flex items-center gap-1.5">
              <CircleDot className="size-4 text-green-500" />
              <span className="font-medium text-foreground">{upcomingCount}</span> upcoming
            </span>
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
                <span className="ml-1 text-xs text-muted-foreground">({channelCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="size-3.5" />
              Documents
              {documentCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({documentCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5">
              <Calendar className="size-3.5" />
              Meetings
              {allMeetings.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({allMeetings.length})</span>
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
