'use client'

import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Hash,
  Lock,
  Send,
  Search,
  Bot,
  Circle,
  Plus,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  X,
  SmilePlus,
  Pin,
  Reply,
  Users,
  Settings,
  AtSign,
} from 'lucide-react'

// ---- Types ------------------------------------------------------------------

type ViewMode =
  | { kind: 'channel'; channelId: bigint }
  | { kind: 'dm'; channelId: bigint; employeeId: string }
  | null

type ThreadView = { parentId: bigint } | null

// ---- Helpers ----------------------------------------------------------------

function formatTime(ts: any): string {
  try {
    const date = ts.toDate()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function formatDate(ts: any): string {
  try {
    const date = ts.toDate()
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  } catch { return '' }
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function statusColor(tag: string): string {
  switch (tag) {
    case 'Online': return 'text-emerald-500'
    case 'Busy': return 'text-amber-500'
    case 'InCall': return 'text-blue-500'
    default: return 'text-neutral-500'
  }
}

function statusDot(tag: string): string {
  switch (tag) {
    case 'Online': return 'bg-emerald-500'
    case 'Busy': return 'bg-amber-500'
    case 'InCall': return 'bg-blue-500'
    default: return 'bg-neutral-500'
  }
}

function avatarColor(name: string): string {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
    'bg-cyan-600', 'bg-orange-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return colors[Math.abs(hash) % colors.length]
}

const EMOJI_LIST = [
  { emoji: '👍', name: 'thumbsup' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'joy' },
  { emoji: '🎉', name: 'tada' },
  { emoji: '👀', name: 'eyes' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '✅', name: 'white_check_mark' },
  { emoji: '💯', name: 'hundred' },
]

function emojiForName(name: string): string {
  return EMOJI_LIST.find((e) => e.name === name)?.emoji ?? name
}

// ---- Main Component ---------------------------------------------------------

export default function MessagesPage() {
  const { identity } = useSpacetimeDB()
  const sendMessage = useReducer(reducers.sendMessage)
  const sendThreadReply = useReducer(reducers.sendThreadReply)
  const createChannel = useReducer(reducers.createChannel)
  const joinChannel = useReducer(reducers.joinChannel)
  const createDmChannel = useReducer(reducers.createDmChannel)
  const addReaction = useReducer(reducers.addReaction)
  const removeReaction = useReducer(reducers.removeReaction)

  const [allChannels] = useTable(tables.channel)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)
  const [allReactions] = useTable(tables.reaction)

  const [view, setView] = useState<ViewMode>(null)
  const [thread, setThread] = useState<ThreadView>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [threadText, setThreadText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [channelsCollapsed, setChannelsCollapsed] = useState(false)
  const [dmsCollapsed, setDmsCollapsed] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<bigint | null>(null)
  const [showEmojiFor, setShowEmojiFor] = useState<bigint | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const myHex = identity?.toHexString() ?? ''

  // ---- Derived data ---------------------------------------------------------

  // Regular channels (not DM channels)
  const channels = useMemo(
    () => [...allChannels]
      .filter((c) => !c.name.startsWith('dm-'))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allChannels],
  )

  // DM channels (private channels with exactly 2 members, name starts with dm-)
  const dmChannels = useMemo(
    () => [...allChannels]
      .filter((c) => c.name.startsWith('dm-') && c.isPrivate && c.members.includes(myHex)),
    [allChannels, myHex],
  )

  const employees = useMemo(
    () => [...allEmployees]
      .filter((e) => identity ? e.id.toHexString() !== myHex : true)
      .sort((a, b) => {
        // Online first
        const aOnline = a.status.tag === 'Online' ? 0 : 1
        const bOnline = b.status.tag === 'Online' ? 0 : 1
        if (aOnline !== bOnline) return aOnline - bOnline
        return a.name.localeCompare(b.name)
      }),
    [allEmployees, identity, myHex],
  )

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees],
  )

  // Reactions grouped by message
  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; users: string[]; myReaction: boolean }>>()
    for (const r of allReactions) {
      const msgKey = r.messageId.toString()
      if (!map.has(msgKey)) map.set(msgKey, new Map())
      const emojiMap = map.get(msgKey)!
      if (!emojiMap.has(r.emoji)) {
        emojiMap.set(r.emoji, { count: 0, users: [], myReaction: false })
      }
      const entry = emojiMap.get(r.emoji)!
      entry.count++
      entry.users.push(r.userId.toHexString())
      if (r.userId.toHexString() === myHex) entry.myReaction = true
    }
    return map
  }, [allReactions, myHex])

  // Thread reply counts
  const threadCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of allMessages) {
      if (m.threadId !== null && m.threadId !== undefined) {
        const key = m.threadId.toString()
        map.set(key, (map.get(key) ?? 0) + 1)
      }
    }
    return map
  }, [allMessages])

  // Messages for current channel (excluding thread replies)
  const messages = useMemo(() => {
    if (!view) return []
    const channelId = view.kind === 'channel' ? view.channelId : view.channelId
    return [...allMessages]
      .filter(
        (m) =>
          m.contextType.tag === 'Channel' &&
          m.contextId === channelId &&
          (m.threadId === null || m.threadId === undefined),
      )
      .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
  }, [allMessages, view])

  // Thread messages
  const threadMessages = useMemo(() => {
    if (!thread) return []
    return [...allMessages]
      .filter((m) => m.threadId === thread.parentId || m.id === thread.parentId)
      .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
  }, [allMessages, thread])

  // Search filter
  const filteredChannels = useMemo(
    () => channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [channels, searchQuery],
  )

  const filteredEmployees = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [employees, searchQuery],
  )

  // ---- Effects --------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length])

  // Auto-select #general
  useEffect(() => {
    if (!view && channels.length > 0) {
      const general = channels.find((c) => c.name === 'general')
      setView({ kind: 'channel', channelId: general?.id ?? channels[0].id })
    }
  }, [channels, view])

  // ---- Handlers -------------------------------------------------------------

  const currentChannel = useMemo(() => {
    if (!view) return null
    const id = view.kind === 'channel' ? view.channelId : view.channelId
    return allChannels.find((c) => c.id === id) ?? null
  }, [allChannels, view])

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !view) return
    const channelId = view.kind === 'channel' ? view.channelId : view.channelId
    setIsSending(true)
    try {
      await sendMessage({
        contextType: { tag: 'Channel' },
        contextId: channelId,
        content: messageText.trim(),
        messageType: { tag: 'Chat' },
      })
      setMessageText('')
      composerRef.current?.focus()
    } catch (err) {
      console.error('Failed to send:', err)
    } finally {
      setIsSending(false)
    }
  }, [messageText, view, sendMessage])

  const handleThreadReply = useCallback(async () => {
    if (!threadText.trim() || !thread || !view) return
    const channelId = view.kind === 'channel' ? view.channelId : view.channelId
    setIsSending(true)
    try {
      await sendThreadReply({
        contextType: { tag: 'Channel' },
        contextId: channelId,
        content: threadText.trim(),
        threadId: thread.parentId,
      })
      setThreadText('')
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setIsSending(false)
    }
  }, [threadText, thread, view, sendThreadReply])

  const handleReaction = useCallback(async (messageId: bigint, emoji: string) => {
    const msgKey = messageId.toString()
    const emojiMap = reactionsByMessage.get(msgKey)
    const existing = emojiMap?.get(emoji)
    try {
      if (existing?.myReaction) {
        await removeReaction({ messageId, emoji })
      } else {
        await addReaction({ messageId, emoji })
      }
    } catch (err) {
      console.error('Reaction failed:', err)
    }
    setShowEmojiFor(null)
  }, [addReaction, removeReaction, reactionsByMessage])

  const handleOpenDm = useCallback(async (emp: any) => {
    const targetHex = emp.id.toHexString()
    // Find existing DM channel
    const existing = dmChannels.find(
      (c) => c.members.includes(targetHex) && c.members.includes(myHex),
    )
    if (existing) {
      setView({ kind: 'dm', channelId: existing.id, employeeId: targetHex })
      return
    }
    // Create new DM channel
    try {
      await createDmChannel({ targetIdentityHex: targetHex })
      // The channel will appear via subscription; we'll select it in the next render
    } catch (err) {
      console.error('Failed to create DM:', err)
    }
  }, [dmChannels, myHex, createDmChannel])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, handler: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handler()
    }
  }

  // ---- Render helpers -------------------------------------------------------

  function getDmPartnerName(channel: any): string {
    const other = channel.members.find((m: string) => m !== myHex)
    if (!other) return 'Unknown'
    return employeeMap.get(other)?.name ?? 'Unknown'
  }

  function getDmPartner(channel: any) {
    const other = channel.members.find((m: string) => m !== myHex)
    return other ? employeeMap.get(other) : null
  }

  // Group messages by date
  function groupByDate(msgs: any[]) {
    const groups: { date: string; messages: any[] }[] = []
    let currentDate = ''
    for (const msg of msgs) {
      const date = formatDate(msg.sentAt)
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [] })
      }
      groups[groups.length - 1].messages.push(msg)
    }
    return groups
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="flex h-full overflow-hidden bg-neutral-950">
      {/* ================================================================== */}
      {/* SLACK SIDEBAR                                                       */}
      {/* ================================================================== */}
      <aside className="w-64 shrink-0 flex flex-col bg-neutral-900 border-r border-neutral-800">
        {/* Workspace header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[10px]">Ω</span>
            </div>
            <span className="font-semibold text-sm text-neutral-100 truncate">Omni</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <Input
              placeholder="Search channels & people"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 focus-visible:ring-violet-500"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Channels */}
          <div className="px-2 pt-2">
            <button
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="w-full flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              {channelsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>Channels</span>
              <span className="ml-auto text-neutral-600">{filteredChannels.length}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true) }}
                    className="ml-1 p-0.5 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Create channel</TooltipContent>
              </Tooltip>
            </button>

            {!channelsCollapsed && filteredChannels.map((channel) => {
              const isActive = view?.kind === 'channel' && view.channelId === channel.id
              return (
                <button
                  key={channel.id.toString()}
                  onClick={() => { setView({ kind: 'channel', channelId: channel.id }); setThread(null) }}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-violet-600/20 text-white font-medium'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {channel.isPrivate ? <Lock className="h-3 w-3 shrink-0 opacity-50" /> : <Hash className="h-3 w-3 shrink-0 opacity-50" />}
                  <span className="truncate">{channel.name}</span>
                </button>
              )
            })}
          </div>

          <Separator className="my-2 mx-3 bg-neutral-800" />

          {/* Direct Messages */}
          <div className="px-2 pb-4">
            <button
              onClick={() => setDmsCollapsed(!dmsCollapsed)}
              className="w-full flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              {dmsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>Direct Messages</span>
            </button>

            {!dmsCollapsed && (
              <>
                {/* Existing DM channels */}
                {dmChannels.map((ch) => {
                  const partner = getDmPartner(ch)
                  if (!partner) return null
                  const isActive = view?.kind === 'dm' && view.channelId === ch.id
                  return (
                    <button
                      key={ch.id.toString()}
                      onClick={() => { setView({ kind: 'dm', channelId: ch.id, employeeId: partner.id.toHexString() }); setThread(null) }}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors text-left ${
                        isActive
                          ? 'bg-violet-600/20 text-white font-medium'
                          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className={`text-[8px] text-white ${avatarColor(partner.name)}`}>
                            {getInitials(partner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-neutral-900 ${statusDot(partner.status.tag)}`} />
                      </div>
                      <span className="truncate">{partner.name}</span>
                      {partner.employeeType.tag === 'AiAgent' && <Bot className="h-3 w-3 shrink-0 text-violet-400" />}
                    </button>
                  )
                })}

                {/* All employees for starting new DMs */}
                {filteredEmployees
                  .filter((emp) => !dmChannels.some((ch) => ch.members.includes(emp.id.toHexString())))
                  .map((emp) => {
                    const isAI = emp.employeeType.tag === 'AiAgent'
                    return (
                      <button
                        key={emp.id.toHexString()}
                        onClick={() => handleOpenDm(emp)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors text-left"
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={`text-[8px] text-white ${avatarColor(emp.name)}`}>
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-neutral-900 ${statusDot(emp.status.tag)}`} />
                        </div>
                        <span className="truncate">{emp.name}</span>
                        {isAI && <Bot className="h-3 w-3 shrink-0 text-violet-400" />}
                      </button>
                    )
                  })}
              </>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ================================================================== */}
      {/* MAIN CHAT AREA                                                      */}
      {/* ================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        {view === null ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-neutral-500" />
              </div>
              <p className="text-lg font-semibold text-neutral-300">Welcome to Omni Messages</p>
              <p className="text-sm text-neutral-500">Select a channel or start a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="shrink-0 flex items-center gap-3 px-5 h-12 border-b border-neutral-800 bg-neutral-950">
              {view.kind === 'channel' && currentChannel ? (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-100">
                    {currentChannel.isPrivate ? <Lock className="h-4 w-4 text-neutral-500" /> : <Hash className="h-4 w-4 text-neutral-500" />}
                    <span>{currentChannel.name}</span>
                  </div>
                  {currentChannel.description && (
                    <>
                      <Separator orientation="vertical" className="h-4 bg-neutral-700 data-[orientation=vertical]:h-4" />
                      <span className="text-xs text-neutral-500 truncate">{currentChannel.description}</span>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {currentChannel.members.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-neutral-200 gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {currentChannel.members.length}
                      </Button>
                    )}
                  </div>
                </>
              ) : view.kind === 'dm' ? (
                (() => {
                  const partner = employeeMap.get(view.employeeId)
                  if (!partner) return null
                  return (
                    <>
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={`text-xs text-white ${avatarColor(partner.name)}`}>
                          {getInitials(partner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-neutral-100 text-sm">
                          {partner.name}
                          {partner.employeeType.tag === 'AiAgent' && (
                            <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1.5 h-4 bg-violet-900/50 text-violet-300 border-0">
                              <Bot className="h-2 w-2" /> AI
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <div className={`h-1.5 w-1.5 rounded-full ${statusDot(partner.status.tag)}`} />
                          {partner.status.tag}
                        </div>
                      </div>
                    </>
                  )
                })()
              ) : null}
            </div>

            {/* Messages + Thread panel */}
            <div className="flex-1 flex overflow-hidden">
              {/* Message list */}
              <div className="flex-1 flex flex-col min-w-0">
                <ScrollArea className="flex-1">
                  <div className="px-5 py-4">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-14 h-14 rounded-xl bg-neutral-800 flex items-center justify-center mb-3">
                          {view.kind === 'channel' ? <Hash className="h-7 w-7 text-neutral-500" /> : <AtSign className="h-7 w-7 text-neutral-500" />}
                        </div>
                        <p className="font-semibold text-neutral-300 text-lg">
                          {view.kind === 'channel'
                            ? `This is the beginning of #${currentChannel?.name}`
                            : `Start a conversation`}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                          {currentChannel?.description ?? 'Send a message to get started'}
                        </p>
                      </div>
                    )}

                    {groupByDate(messages).map((group) => (
                      <div key={group.date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-neutral-800" />
                          <span className="text-[11px] font-medium text-neutral-500 bg-neutral-950 px-2">{group.date}</span>
                          <div className="flex-1 h-px bg-neutral-800" />
                        </div>

                        {group.messages.map((msg: any, idx: number) => {
                          const sender = employeeMap.get(msg.sender.toHexString())
                          const senderName = sender?.name ?? 'Unknown'
                          const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                          const isSameAuthor = prevMsg &&
                            prevMsg.sender.toHexString() === msg.sender.toHexString() &&
                            Number(msg.sentAt.toMillis()) - Number(prevMsg.sentAt.toMillis()) < 5 * 60 * 1000
                          const isHovered = hoveredMsgId === msg.id
                          const msgReactions = reactionsByMessage.get(msg.id.toString())
                          const replyCount = threadCounts.get(msg.id.toString()) ?? 0

                          return (
                            <div
                              key={msg.id.toString()}
                              className={`relative group px-2 -mx-2 rounded ${isHovered ? 'bg-neutral-900/50' : 'hover:bg-neutral-900/30'} ${isSameAuthor ? '' : 'mt-3'}`}
                              onMouseEnter={() => setHoveredMsgId(msg.id)}
                              onMouseLeave={() => { setHoveredMsgId(null); if (showEmojiFor === msg.id) setShowEmojiFor(null) }}
                            >
                              {/* Action toolbar */}
                              {isHovered && (
                                <div className="absolute -top-3 right-2 flex items-center bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-10">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                        className="p-1.5 hover:bg-neutral-700 rounded-l-md text-neutral-400 hover:text-neutral-200"
                                      >
                                        <SmilePlus className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">React</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setThread({ parentId: msg.id })}
                                        className="p-1.5 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Reply in thread</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}

                              {/* Emoji picker */}
                              {showEmojiFor === msg.id && (
                                <div className="absolute -top-10 right-2 flex items-center gap-0.5 bg-neutral-800 border border-neutral-700 rounded-lg p-1 shadow-xl z-20">
                                  {EMOJI_LIST.map((e) => (
                                    <button
                                      key={e.name}
                                      onClick={() => handleReaction(msg.id, e.name)}
                                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-sm"
                                    >
                                      {e.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-start gap-3 py-0.5 ${isSameAuthor ? '' : 'pt-1'}`}>
                                <div className="w-9 shrink-0 flex justify-center pt-0.5">
                                  {isSameAuthor ? (
                                    <span className="text-[10px] text-neutral-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {formatTime(msg.sentAt)}
                                    </span>
                                  ) : (
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback className={`text-xs text-white ${avatarColor(senderName)}`}>
                                        {getInitials(senderName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {!isSameAuthor && (
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                      <span className="font-semibold text-sm text-neutral-100">{senderName}</span>
                                      {sender?.employeeType.tag === 'AiAgent' && (
                                        <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1 h-3.5 bg-violet-900/40 text-violet-300 border-0">
                                          <Bot className="h-2 w-2" /> AI
                                        </Badge>
                                      )}
                                      <span className="text-[11px] text-neutral-600">{formatTime(msg.sentAt)}</span>
                                    </div>
                                  )}

                                  <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.content}
                                  </p>

                                  {/* Reactions */}
                                  {msgReactions && msgReactions.size > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Array.from(msgReactions.entries()).map(([emoji, data]) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(msg.id, emoji)}
                                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                            data.myReaction
                                              ? 'bg-violet-900/30 border-violet-600/50 text-violet-300'
                                              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                                          }`}
                                        >
                                          <span>{emojiForName(emoji)}</span>
                                          <span>{data.count}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Thread indicator */}
                                  {replyCount > 0 && (
                                    <button
                                      onClick={() => setThread({ parentId: msg.id })}
                                      className="flex items-center gap-1.5 mt-1 text-xs text-violet-400 hover:text-violet-300 hover:underline"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Composer */}
                <div className="shrink-0 px-5 py-3 border-t border-neutral-800">
                  <div className="bg-neutral-900 border border-neutral-700 rounded-lg focus-within:border-violet-600 transition-colors">
                    <Textarea
                      ref={composerRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleSend)}
                      placeholder={
                        view.kind === 'channel' && currentChannel
                          ? `Message #${currentChannel.name}`
                          : view.kind === 'dm'
                            ? `Message ${employeeMap.get(view.employeeId)?.name ?? ''}`
                            : 'Type a message...'
                      }
                      disabled={isSending}
                      className="min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2.5"
                      rows={1}
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                      <div className="flex items-center gap-1">
                        {/* Future: formatting buttons */}
                      </div>
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!messageText.trim() || isSending}
                        className="h-7 w-7 bg-violet-600 hover:bg-violet-700 disabled:opacity-30 rounded-md"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* THREAD PANEL                                                  */}
              {/* ============================================================ */}
              {thread && (
                <div className="w-96 shrink-0 flex flex-col border-l border-neutral-800 bg-neutral-950">
                  {/* Thread header */}
                  <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-800">
                    <span className="font-semibold text-sm text-neutral-100">Thread</span>
                    <button onClick={() => setThread(null)} className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Thread messages */}
                  <ScrollArea className="flex-1">
                    <div className="px-4 py-3 space-y-0.5">
                      {threadMessages.map((msg, idx) => {
                        const sender = employeeMap.get(msg.sender.toHexString())
                        const senderName = sender?.name ?? 'Unknown'
                        const isParent = msg.id === thread.parentId

                        return (
                          <div key={msg.id.toString()} className={`${isParent ? 'pb-3 mb-3 border-b border-neutral-800' : ''}`}>
                            <div className="flex items-start gap-2.5 py-1">
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                <AvatarFallback className={`text-[10px] text-white ${avatarColor(senderName)}`}>
                                  {getInitials(senderName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="font-semibold text-sm text-neutral-100">{senderName}</span>
                                  <span className="text-[11px] text-neutral-600">{formatTime(msg.sentAt)}</span>
                                </div>
                                <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={threadEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Thread composer */}
                  <div className="shrink-0 px-4 py-3 border-t border-neutral-800">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-lg focus-within:border-violet-600 transition-colors">
                      <Textarea
                        value={threadText}
                        onChange={(e) => setThreadText(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleThreadReply)}
                        placeholder="Reply..."
                        disabled={isSending}
                        className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2"
                        rows={1}
                      />
                      <div className="flex justify-end px-3 pb-2">
                        <Button
                          size="icon"
                          onClick={handleThreadReply}
                          disabled={!threadText.trim() || isSending}
                          className="h-6 w-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-30 rounded"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ================================================================== */}
      {/* CREATE CHANNEL DIALOG                                               */}
      {/* ================================================================== */}
      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onCreate={async (name, desc, priv) => {
          try {
            await createChannel({ name, description: desc || null, isPrivate: priv })
            setShowCreateChannel(false)
          } catch (err) {
            console.error('Failed to create channel:', err)
          }
        }}
      />
    </div>
  )
}

// ---- Create Channel Dialog --------------------------------------------------

function CreateChannelDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, description: string, isPrivate: boolean) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-neutral-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-neutral-300">Channel name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                placeholder="e.g. marketing"
                className="pl-9 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-300">Description <span className="text-neutral-500">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-neutral-300">Make private</Label>
              <p className="text-xs text-neutral-500">Only invited members can see this channel</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-neutral-400">
            Cancel
          </Button>
          <Button
            onClick={() => onCreate(name, description, isPrivate)}
            disabled={!name.trim()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Create Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
