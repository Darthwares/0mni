'use client'

import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/components/ui/context-menu'
import { PresenceBar } from '@/components/presence-bar'
import { PresenceAvatars } from '@/components/presence-avatars'
import { MentionInput, RenderMentions } from '@/components/mention-input'
import { useIsMobile } from '@/hooks/use-mobile'
import { useResourcePresence } from '@/hooks/use-resource-presence'
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
  Pencil,
  Trash2,
  ArrowLeft,
  Menu,
  Copy,
  ExternalLink,
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
    default: return 'text-muted-foreground'
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
  const { identity, isActive, connectionError } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const isMobile = useIsMobile()
  const sendMessage = useReducer(reducers.sendMessage)
  const sendThreadReply = useReducer(reducers.sendThreadReply)
  const createChannel = useReducer(reducers.createChannel)
  const joinChannel = useReducer(reducers.joinChannel)
  const createDmChannel = useReducer(reducers.createDmChannel)
  const addReaction = useReducer(reducers.addReaction)
  const removeReaction = useReducer(reducers.removeReaction)
  const editMessage = useReducer(reducers.editMessage)
  const deleteMessage = useReducer(reducers.deleteMessage)
  const pinMessage = useReducer(reducers.pinMessage)
  const unpinMessage = useReducer(reducers.unpinMessage)
  const setTypingStatus = useReducer(reducers.setTypingStatus)

  const [allChannels, channelsReady] = useTable(tables.channel)
  const [allMessages, messagesReady] = useTable(tables.message)
  const [allEmployees, employeesReady] = useTable(tables.employee)
  const [allReactions, reactionsReady] = useTable(tables.reaction)
  const [allPinnedMessages] = useTable(tables.pinned_message)
  const [allTypingIndicators] = useTable(tables.typing_indicator)

  const isReady = channelsReady && messagesReady && employeesReady && reactionsReady

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
  const [sendError, setSendError] = useState<string | null>(null)
  const [editingMsgId, setEditingMsgId] = useState<bigint | null>(null)
  const [editText, setEditText] = useState('')
  const [deletingMsgId, setDeletingMsgId] = useState<bigint | null>(null)
  // Mobile: show channel list vs chat. On desktop, both are visible.
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true)
  const [pendingDmTarget, setPendingDmTarget] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef<number>(0)

  const myHex = identity?.toHexString() ?? ''

  // Track presence in current channel
  const channelPresenceId = view ? Number(view.channelId) : null
  const { presentUsers: channelPresence } = useResourcePresence('Channel', channelPresenceId)

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
      .sort((a, b) => {
        // Self first, then online, then alphabetical
        const aIsSelf = a.id.toHexString() === myHex ? -1 : 0
        const bIsSelf = b.id.toHexString() === myHex ? -1 : 0
        if (aIsSelf !== bIsSelf) return aIsSelf - bIsSelf
        const aOnline = a.status.tag === 'Online' ? 0 : 1
        const bOnline = b.status.tag === 'Online' ? 0 : 1
        if (aOnline !== bOnline) return aOnline - bOnline
        return a.name.localeCompare(b.name)
      }),
    [allEmployees, myHex],
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

  // Pinned message IDs (set for fast lookup)
  const pinnedMessageIds = useMemo(() => {
    const set = new Set<string>()
    for (const p of allPinnedMessages) {
      set.add(p.messageId.toString())
    }
    return set
  }, [allPinnedMessages])

  // Typing indicators for current channel (exclude self)
  const typingUsers = useMemo(() => {
    if (!view) return []
    const channelId = view.channelId
    return allTypingIndicators
      .filter((t) => t.channelId === channelId && t.userId.toHexString() !== myHex)
      .map((t) => {
        const emp = employeeMap.get(t.userId.toHexString())
        return emp?.name ?? 'Someone'
      })
  }, [allTypingIndicators, view, myHex, employeeMap])

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
      // On mobile, show the sidebar (channel list) first
      if (isMobile) setMobileShowSidebar(true)
    }
  }, [channels, view, isMobile])

  // Auto-navigate to newly created DM channel
  useEffect(() => {
    if (!pendingDmTarget) return
    const newDm = dmChannels.find((c) => c.members.includes(pendingDmTarget))
    if (newDm) {
      setView({ kind: 'dm', channelId: newDm.id, employeeId: pendingDmTarget })
      setThread(null)
      if (isMobile) setMobileShowSidebar(false)
      setPendingDmTarget(null)
    }
  }, [dmChannels, pendingDmTarget, isMobile])

  // ---- Handlers -------------------------------------------------------------

  const currentChannel = useMemo(() => {
    if (!view) return null
    const id = view.kind === 'channel' ? view.channelId : view.channelId
    return allChannels.find((c) => c.id === id) ?? null
  }, [allChannels, view])

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !view) return
    const channelId = view.kind === 'channel' ? view.channelId : view.channelId
    setSendError(null)
    setIsSending(true)
    try {
      console.log('[Omni] Sending message to channel', channelId.toString(), ':', messageText.trim().slice(0, 50))
      await sendMessage({
        contextType: { tag: 'Channel' },
        contextId: channelId,
        content: messageText.trim(),
        messageType: { tag: 'Chat' },
      })
      console.log('[Omni] Message sent successfully')
      setMessageText('')
      // Stop typing indicator when message is sent
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      try { setTypingStatus({ channelId, isTyping: false }) } catch {}
      lastTypingSentRef.current = 0
    } catch (err: any) {
      const errorMsg = err?.message || String(err)
      console.error('[Omni] Failed to send message:', errorMsg, err)
      setSendError(errorMsg)
      setTimeout(() => setSendError(null), 5000)
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

  const handleOpenDm = async (emp: any) => {
    const targetHex = emp.id.toHexString()
    // Find existing DM channel
    const existing = dmChannels.find(
      (c) => c.members.includes(targetHex) && c.members.includes(myHex),
    )
    if (existing) {
      setView({ kind: 'dm', channelId: existing.id, employeeId: targetHex })
      setThread(null)
      if (isMobile) setMobileShowSidebar(false)
      return
    }
    // Create new DM channel and set pending target to auto-navigate when it appears
    try {
      setPendingDmTarget(targetHex)
      await createDmChannel({ targetIdentityHex: targetHex })
    } catch (err) {
      console.error('Failed to create DM:', err)
      setPendingDmTarget(null)
    }
  }

  const selectChannel = (channelId: bigint) => {
    setView({ kind: 'channel', channelId })
    setThread(null)
    if (isMobile) setMobileShowSidebar(false)
  }

  const selectDm = (channelId: bigint, employeeId: string) => {
    setView({ kind: 'dm', channelId, employeeId })
    setThread(null)
    if (isMobile) setMobileShowSidebar(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, handler: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handler()
    }
  }

  // ---- Typing indicator logic -----------------------------------------------

  const handleTyping = useCallback(() => {
    if (!view) return
    const now = Date.now()
    // Only send typing status every 3 seconds
    if (now - lastTypingSentRef.current < 3000) return
    lastTypingSentRef.current = now
    try {
      setTypingStatus({ channelId: view.channelId, isTyping: true })
    } catch (err) {
      // Ignore typing status errors
    }
    // Clear previous timeout and set new one to stop typing after 3 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      try {
        setTypingStatus({ channelId: view.channelId, isTyping: false })
      } catch (err) {
        // Ignore
      }
      lastTypingSentRef.current = 0
    }, 3000)
  }, [view, setTypingStatus])

  // Cleanup typing on unmount or channel change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [view])

  // ---- Edit / Delete / Pin handlers -----------------------------------------

  const handleStartEdit = useCallback((msg: any) => {
    setEditingMsgId(msg.id)
    setEditText(msg.content)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingMsgId || !editText.trim()) return
    try {
      await editMessage({ messageId: editingMsgId, newContent: editText.trim() })
    } catch (err) {
      console.error('Failed to edit message:', err)
    }
    setEditingMsgId(null)
    setEditText('')
  }, [editingMsgId, editText, editMessage])

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null)
    setEditText('')
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingMsgId) return
    try {
      await deleteMessage({ messageId: deletingMsgId })
    } catch (err) {
      console.error('Failed to delete message:', err)
    }
    setDeletingMsgId(null)
  }, [deletingMsgId, deleteMessage])

  const handleTogglePin = useCallback(async (msg: any) => {
    const isPinned = pinnedMessageIds.has(msg.id.toString())
    if (!view) return
    const channelId = view.channelId
    try {
      if (isPinned) {
        await unpinMessage({ channelId, messageId: msg.id })
      } else {
        await pinMessage({ channelId, messageId: msg.id })
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    }
  }, [pinnedMessageIds, view, pinMessage, unpinMessage])

  // ---- Render helpers -------------------------------------------------------

  function isSelfDm(channel: any): boolean {
    return channel.members.length === 1 && channel.members[0] === myHex
  }

  function getDmPartnerName(channel: any): string {
    if (isSelfDm(channel)) {
      return employeeMap.get(myHex)?.name ?? 'You'
    }
    const other = channel.members.find((m: string) => m !== myHex)
    if (!other) return 'Unknown'
    return employeeMap.get(other)?.name ?? 'Unknown'
  }

  function getDmPartner(channel: any) {
    if (isSelfDm(channel)) {
      return employeeMap.get(myHex) ?? null
    }
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

  // ---- Channel Sidebar Content (shared between mobile & desktop) ------------

  const channelSidebarContent = (
    <>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search channels & people"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 md:h-7 text-xs bg-background/60 dark:bg-accent border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-violet-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Channels */}
        <div className="px-2 pt-2">
          <button
            onClick={() => setChannelsCollapsed(!channelsCollapsed)}
            className="w-full flex items-center gap-1 px-1.5 py-1.5 md:py-1 text-xs font-semibold text-foreground/50 uppercase tracking-wider hover:text-foreground/70 transition-colors"
          >
            {channelsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>Channels</span>
            <span className="ml-auto text-foreground/30 font-normal normal-case tracking-normal">{filteredChannels.length}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true) }}
                  className="ml-1 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground/80"
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
              <ContextMenu key={channel.id.toString()}>
                <ContextMenuTrigger>
                  <button
                    onClick={() => selectChannel(channel.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-2 md:py-1.5 rounded-md text-sm transition-colors text-left ${
                      isActive
                        ? 'bg-violet-600/15 dark:bg-violet-600/20 text-violet-900 dark:text-violet-100 font-medium'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground transition-colors'
                    }`}
                  >
                    {channel.isPrivate ? <Lock className="h-3.5 md:h-3 w-3.5 md:w-3 shrink-0 opacity-60" /> : <Hash className="h-3.5 md:h-3 w-3.5 md:w-3 shrink-0 opacity-60" />}
                    <span className="truncate">{channel.name}</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>#{channel.name}</ContextMenuLabel>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => selectChannel(channel.id)}>
                    <MessageSquare className="size-3.5" /> Open channel
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => navigator.clipboard.writeText(channel.name)}>
                    <Copy className="size-3.5" /> Copy channel name
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>
                    <Users className="size-3.5" /> {channel.members.length} members
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>

        <Separator className="my-2 mx-3 bg-border/50" />

        {/* Direct Messages */}
        <div className="px-2 pb-4">
          <button
            onClick={() => setDmsCollapsed(!dmsCollapsed)}
            className="w-full flex items-center gap-1 px-1.5 py-1.5 md:py-1 text-xs font-semibold text-foreground/50 uppercase tracking-wider hover:text-foreground/70 transition-colors"
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
                const selfDm = isSelfDm(ch)
                const isActive = view?.kind === 'dm' && view.channelId === ch.id
                return (
                  <ContextMenu key={ch.id.toString()}>
                    <ContextMenuTrigger>
                      <button
                        onClick={() => selectDm(ch.id, partner.id.toHexString())}
                        className={`w-full flex items-center gap-2 px-2 py-2 md:py-1.5 rounded-md text-sm transition-colors text-left ${
                          isActive
                            ? 'bg-violet-600/15 dark:bg-violet-600/20 text-violet-900 dark:text-violet-100 font-medium'
                            : 'text-foreground/70 hover:bg-accent hover:text-foreground transition-colors'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-6 md:h-5 w-6 md:w-5">
                            <AvatarFallback className={`text-[8px] text-white ${avatarColor(partner.name)}`}>
                              {getInitials(partner.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${statusDot(partner.status.tag)}`} />
                        </div>
                        <span className="truncate">{partner.name}{selfDm ? ' (you)' : ''}</span>
                        {partner.employeeType.tag === 'AiAgent' && <Bot className="h-3 w-3 shrink-0 text-violet-400" />}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuLabel>{partner.name}</ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => selectDm(ch.id, partner.id.toHexString())}>
                        <MessageSquare className="size-3.5" /> Open conversation
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => navigator.clipboard.writeText(partner.name)}>
                        <Copy className="size-3.5" /> Copy name
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}

              {/* All employees for starting new DMs */}
              {filteredEmployees
                .filter((emp) => {
                  const empHex = emp.id.toHexString()
                  const isSelf = empHex === myHex
                  if (isSelf) {
                    // Show self if no self-DM channel exists yet
                    return !dmChannels.some((ch) => ch.members.length === 1 && ch.members[0] === myHex)
                  }
                  // For others, check if a DM already exists between us
                  return !dmChannels.some((ch) => ch.members.includes(empHex) && ch.members.length <= 2)
                })
                .map((emp) => {
                  const isAI = emp.employeeType.tag === 'AiAgent'
                  const isSelf = emp.id.toHexString() === myHex
                  return (
                    <button
                      key={emp.id.toHexString()}
                      onClick={() => handleOpenDm(emp)}
                      className="w-full flex items-center gap-2 px-2 py-2 md:py-1.5 rounded-md text-sm text-foreground/60 hover:bg-accent hover:text-foreground transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-6 md:h-5 w-6 md:w-5">
                          <AvatarFallback className={`text-[8px] text-white ${avatarColor(emp.name)}`}>
                            {getInitials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${statusDot(emp.status.tag)}`} />
                      </div>
                      <span className="truncate">{emp.name}{isSelf ? ' (you)' : ''}</span>
                      {isAI && <Bot className="h-3 w-3 shrink-0 text-violet-400" />}
                    </button>
                  )
                })}
            </>
          )}
        </div>
      </ScrollArea>
    </>
  )

  // ---- Thread Panel Content (shared between mobile & desktop) ---------------

  const threadPanelContent = thread && (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <span className="font-semibold text-sm text-foreground">Thread</span>
        <button onClick={() => setThread(null)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground/90">
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
              <div key={msg.id.toString()} className={`${isParent ? 'pb-3 mb-3 border-b border-border' : ''}`}>
                <div className="flex items-start gap-2.5 py-1">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className={`text-[10px] text-white ${avatarColor(senderName)}`}>
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-foreground">{senderName}</span>
                      <span className="text-[11px] text-muted-foreground/60">{formatTime(msg.sentAt)}</span>
                      {msg.editedAt != null && !msg.deleted && (
                        <span className="text-[10px] text-muted-foreground/60">(edited)</span>
                      )}
                    </div>
                    {msg.deleted ? (
                      <p className="text-sm text-muted-foreground italic">[Message deleted]</p>
                    ) : (
                      <RenderMentions
                        text={msg.content}
                        className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={threadEndRef} />
        </div>
      </ScrollArea>

      {/* Thread composer */}
      <div className="shrink-0 px-4 py-3 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
        <div className="bg-muted border border-border rounded-lg focus-within:border-violet-600 transition-colors">
          <MentionInput
            value={threadText}
            onChange={setThreadText}
            onSubmit={handleThreadReply}
            placeholder="Reply..."
            className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2"
          />
          <div className="flex justify-end px-3 pb-2">
            <Button
              size="icon"
              onClick={handleThreadReply}
              disabled={!threadText.trim() || isSending}
              className="h-7 w-7 md:h-6 md:w-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-30 rounded"
            >
              <Send className="h-3.5 md:h-3 w-3.5 md:w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  // ---- Render ---------------------------------------------------------------

  if (connectionError) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground/80">
        <div className="text-center max-w-md px-8">
          <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-sm font-medium mb-2">Connection Error</p>
          <p className="text-xs text-muted-foreground">{connectionError.message || 'Failed to connect to SpacetimeDB'}</p>
        </div>
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground/80">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">Ω</span>
          </div>
          <div className="animate-pulse">
            <p className="text-sm font-medium">Connecting to SpacetimeDB...</p>
          </div>
        </div>
      </div>
    )
  }

  // ---- MOBILE LAYOUT --------------------------------------------------------
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        {mobileShowSidebar ? (
          // Mobile: Channel list view
          <div className="flex flex-col h-full">
            {/* Mobile header */}
            <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center shrink-0">
                <span className="text-white font-mono font-black text-[10px]">0</span>
              </div>
              <span className="font-semibold text-sm text-foreground">Messages</span>
              <Circle className={`h-2 w-2 shrink-0 ${isReady ? 'fill-green-400 text-green-400' : 'fill-yellow-400 text-yellow-400 animate-pulse'}`} />
            </div>
            {channelSidebarContent}
          </div>
        ) : (
          // Mobile: Chat view
          <div className="flex flex-col h-full">
            {/* Mobile chat header */}
            <div className="shrink-0 flex items-center gap-2 px-3 h-12 border-b border-border bg-background">
              <button
                onClick={() => setMobileShowSidebar(true)}
                className="p-1.5 -ml-1 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {view?.kind === 'channel' && currentChannel ? (
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm min-w-0">
                  {currentChannel.isPrivate ? <Lock className="h-4 w-4 text-muted-foreground shrink-0" /> : <Hash className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="truncate">{currentChannel.name}</span>
                </div>
              ) : view?.kind === 'dm' ? (
                (() => {
                  const partner = employeeMap.get(view.employeeId)
                  if (!partner) return null
                  return (
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className={`text-[8px] text-white ${avatarColor(partner.name)}`}>
                          {getInitials(partner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-sm text-foreground truncate">{partner.name}</span>
                      {view.employeeId === myHex && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1.5 h-4 bg-accent text-muted-foreground border-0 shrink-0">
                          you
                        </Badge>
                      )}
                    </div>
                  )
                })()
              ) : null}
              {currentChannel && (
                <div className="ml-auto flex items-center gap-1">
                  {currentChannel.members.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {currentChannel.members.length}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="px-3 py-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
                        {view?.kind === 'channel' ? <Hash className="h-6 w-6 text-muted-foreground" /> : <AtSign className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <p className="font-semibold text-foreground/80">
                        {view?.kind === 'channel'
                          ? `#${currentChannel?.name}`
                          : `Start chatting`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentChannel?.description ?? 'Send a message to get started'}
                      </p>
                    </div>
                  )}

                  {groupByDate(messages).map((group) => (
                    <div key={group.date}>
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-accent" />
                        <span className="text-[11px] font-medium text-muted-foreground bg-background px-2">{group.date}</span>
                        <div className="flex-1 h-px bg-accent" />
                      </div>

                      {group.messages.map((msg: any, idx: number) => {
                        const sender = employeeMap.get(msg.sender.toHexString())
                        const senderName = sender?.name ?? 'Unknown'
                        const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                        const isSameAuthor = prevMsg &&
                          prevMsg.sender.toHexString() === msg.sender.toHexString() &&
                          Number(msg.sentAt.toMillis()) - Number(prevMsg.sentAt.toMillis()) < 5 * 60 * 1000
                        const msgReactions = reactionsByMessage.get(msg.id.toString())
                        const replyCount = threadCounts.get(msg.id.toString()) ?? 0

                        return (
                          <div
                            key={msg.id.toString()}
                            className={`relative px-1 -mx-1 rounded ${isSameAuthor ? '' : 'mt-3'}`}
                          >
                            <div className={`flex items-start gap-2.5 py-0.5 ${isSameAuthor ? '' : 'pt-1'}`}>
                              <div className="w-8 shrink-0 flex justify-center pt-0.5">
                                {isSameAuthor ? (
                                  <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {formatTime(msg.sentAt)}
                                  </span>
                                ) : (
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={`text-xs text-white ${avatarColor(senderName)}`}>
                                      {getInitials(senderName)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {!isSameAuthor && (
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="font-semibold text-sm text-foreground">{senderName}</span>
                                    {sender?.employeeType.tag === 'AiAgent' && (
                                      <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1 h-3.5 bg-violet-900/40 text-violet-300 border-0">
                                        <Bot className="h-2 w-2" /> AI
                                      </Badge>
                                    )}
                                    <span className="text-[11px] text-muted-foreground/60">{formatTime(msg.sentAt)}</span>
                                  </div>
                                )}

                                {msg.deleted ? (
                                  <p className="text-sm text-muted-foreground italic">[Message deleted]</p>
                                ) : editingMsgId === msg.id ? (
                                  <div className="space-y-1" onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit() }}>
                                    <MentionInput
                                      value={editText}
                                      onChange={setEditText}
                                      onSubmit={handleSaveEdit}
                                      className="text-sm bg-accent border-border text-foreground/90 rounded px-2 py-1"
                                    />
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <button onClick={handleCancelEdit} className="text-violet-400">Cancel</button>
                                      <button onClick={handleSaveEdit} className="text-violet-400">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <RenderMentions
                                    text={msg.content}
                                    className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed"
                                  />
                                )}

                                {/* Mobile action buttons (always visible, compact) */}
                                {!msg.deleted && editingMsgId !== msg.id && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <button
                                      onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                      className="p-1 rounded hover:bg-accent text-muted-foreground/60 active:text-foreground/80"
                                    >
                                      <SmilePlus className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setThread({ parentId: msg.id })}
                                      className="p-1 rounded hover:bg-accent text-muted-foreground/60 active:text-foreground/80"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    </button>
                                    {msg.sender.toHexString() === myHex && (
                                      <>
                                        <button
                                          onClick={() => handleStartEdit(msg)}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground/60 active:text-foreground/80"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeletingMsgId(msg.id)}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground/60 active:text-red-400"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Emoji picker */}
                                {showEmojiFor === msg.id && (
                                  <div className="flex items-center gap-0.5 bg-accent border border-border rounded-lg p-1 mt-1 shadow-xl">
                                    {EMOJI_LIST.map((e) => (
                                      <button
                                        key={e.name}
                                        onClick={() => handleReaction(msg.id, e.name)}
                                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-sm"
                                      >
                                        {e.emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

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
                                            : 'bg-accent border-border text-muted-foreground'
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
                                    className="flex items-center gap-1.5 mt-1 text-xs text-violet-400 active:text-violet-300"
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

              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="shrink-0 px-3 py-1 text-xs text-muted-foreground animate-pulse">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.join(', ')} are typing...`}
                </div>
              )}

              {/* Error */}
              {sendError && (
                <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/30">
                  <p className="text-xs text-red-400">Failed to send: {sendError}</p>
                </div>
              )}

              {/* Composer */}
              <div className="shrink-0 px-3 py-2 border-t border-border pb-[calc(0.5rem+3.5rem+env(safe-area-inset-bottom))]">
                <div className="bg-muted border border-border rounded-lg focus-within:border-violet-600 transition-colors">
                  <MentionInput
                    value={messageText}
                    onChange={(val) => { setMessageText(val); handleTyping() }}
                    onSubmit={handleSend}
                    placeholder={
                      view?.kind === 'channel' && currentChannel
                        ? `Message #${currentChannel.name}`
                        : view?.kind === 'dm'
                          ? `Message ${employeeMap.get(view.employeeId)?.name ?? ''}`
                          : 'Type a message...'
                    }
                    className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2.5"
                  />
                  <div className="flex items-center justify-end px-3 pb-2">
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!messageText.trim() || isSending}
                      className="h-8 w-8 bg-violet-600 hover:bg-violet-700 disabled:opacity-30 rounded-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thread Sheet (mobile) */}
        <Sheet open={thread !== null} onOpenChange={(open) => { if (!open) setThread(null) }}>
          <SheetContent side="bottom" className="h-[85dvh] p-0 bg-background border-border rounded-t-2xl">
            {threadPanelContent}
          </SheetContent>
        </Sheet>

        {/* Delete confirmation */}
        <Dialog open={deletingMsgId !== null} onOpenChange={(open) => { if (!open) setDeletingMsgId(null) }}>
          <DialogContent className="bg-muted border-border text-foreground sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete message</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to delete this message? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeletingMsgId(null)} className="text-muted-foreground">
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Channel Dialog */}
        <CreateChannelDialog
          open={showCreateChannel}
          onOpenChange={setShowCreateChannel}
          onCreate={async (name, desc, priv) => {
            try {
              if (currentOrgId === null) return
              await createChannel({ name, description: desc || null, isPrivate: priv, orgId: BigInt(currentOrgId) })
              setShowCreateChannel(false)
            } catch (err) {
              console.error('Failed to create channel:', err)
            }
          }}
        />
      </div>
    )
  }

  // ---- DESKTOP LAYOUT -------------------------------------------------------

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* ================================================================== */}
      {/* SLACK SIDEBAR                                                       */}
      {/* ================================================================== */}
      <aside className="w-64 shrink-0 flex flex-col bg-muted/50 dark:bg-muted border-r border-border">
        {/* Workspace header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center shrink-0">
              <span className="text-white font-mono font-black text-[10px]">0</span>
            </div>
            <span className="font-semibold text-sm text-foreground truncate">Messages</span>
            <Circle className={`h-2 w-2 shrink-0 ${isReady ? 'fill-green-400 text-green-400' : 'fill-yellow-400 text-yellow-400 animate-pulse'}`} />
          </div>
          <PresenceBar />
        </div>

        {channelSidebarContent}
      </aside>

      {/* ================================================================== */}
      {/* MAIN CHAT AREA                                                      */}
      {/* ================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {view === null ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground/80">Welcome to Omni Messages</p>
              <p className="text-sm text-muted-foreground">Select a channel or start a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="shrink-0 flex items-center gap-3 px-5 h-12 border-b border-border bg-background">
              {view.kind === 'channel' && currentChannel ? (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {currentChannel.isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Hash className="h-4 w-4 text-muted-foreground" />}
                    <span>{currentChannel.name}</span>
                  </div>
                  {currentChannel.description && (
                    <>
                      <Separator orientation="vertical" className="h-4 bg-muted-foreground/20 data-[orientation=vertical]:h-4" />
                      <span className="text-xs text-muted-foreground truncate">{currentChannel.description}</span>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <PresenceAvatars users={channelPresence} size="xs" />
                    {currentChannel.members.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground/90 gap-1">
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
                        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                          {partner.name}
                          {view.employeeId === myHex && (
                            <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1.5 h-4 bg-accent text-muted-foreground border-0">
                              you
                            </Badge>
                          )}
                          {partner.employeeType.tag === 'AiAgent' && (
                            <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1.5 h-4 bg-violet-900/50 text-violet-300 border-0">
                              <Bot className="h-2 w-2" /> AI
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <div className={`h-1.5 w-1.5 rounded-full ${statusDot(partner.status.tag)}`} />
                          {view.employeeId === myHex ? 'Jot down notes, links, and ideas' : partner.status.tag}
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
                        <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-3">
                          {view.kind === 'channel' ? <Hash className="h-7 w-7 text-muted-foreground" /> : <AtSign className="h-7 w-7 text-muted-foreground" />}
                        </div>
                        <p className="font-semibold text-foreground/80 text-lg">
                          {view.kind === 'channel'
                            ? `This is the beginning of #${currentChannel?.name}`
                            : `Start a conversation`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                          {currentChannel?.description ?? 'Send a message to get started'}
                        </p>
                      </div>
                    )}

                    {groupByDate(messages).map((group) => (
                      <div key={group.date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-accent" />
                          <span className="text-[11px] font-medium text-muted-foreground bg-background px-2">{group.date}</span>
                          <div className="flex-1 h-px bg-accent" />
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
                            <ContextMenu key={msg.id.toString()}>
                              <ContextMenuTrigger>
                            <div
                              className={`relative group px-2 -mx-2 rounded ${isHovered ? 'bg-muted/50' : 'hover:bg-muted/30'} ${isSameAuthor ? '' : 'mt-3'}`}
                              onMouseEnter={() => setHoveredMsgId(msg.id)}
                              onMouseLeave={() => { setHoveredMsgId(null); if (showEmojiFor === msg.id) setShowEmojiFor(null) }}
                            >
                              {/* Action toolbar */}
                              {isHovered && editingMsgId !== msg.id && (
                                <div className="absolute -top-3 right-2 flex items-center bg-accent border border-border rounded-md shadow-lg z-10">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                        className="p-1.5 hover:bg-accent rounded-l-md text-muted-foreground hover:text-foreground/90"
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
                                        className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground/90"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Reply in thread</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleTogglePin(msg)}
                                        className={`p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground/90 ${pinnedMessageIds.has(msg.id.toString()) ? 'text-amber-400' : ''}`}
                                      >
                                        <Pin className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {pinnedMessageIds.has(msg.id.toString()) ? 'Unpin' : 'Pin'}
                                    </TooltipContent>
                                  </Tooltip>
                                  {msg.sender.toHexString() === myHex && !msg.deleted && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleStartEdit(msg)}
                                            className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground/90"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => setDeletingMsgId(msg.id)}
                                            className="p-1.5 hover:bg-accent rounded-r-md text-muted-foreground hover:text-red-400"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Emoji picker */}
                              {showEmojiFor === msg.id && (
                                <div className="absolute -top-10 right-2 flex items-center gap-0.5 bg-accent border border-border rounded-lg p-1 shadow-xl z-20">
                                  {EMOJI_LIST.map((e) => (
                                    <button
                                      key={e.name}
                                      onClick={() => handleReaction(msg.id, e.name)}
                                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-sm"
                                    >
                                      {e.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className={`flex items-start gap-3 py-0.5 ${isSameAuthor ? '' : 'pt-1'}`}>
                                <div className="w-9 shrink-0 flex justify-center pt-0.5">
                                  {isSameAuthor ? (
                                    <span className="text-[10px] text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                      <span className="font-semibold text-sm text-foreground">{senderName}</span>
                                      {sender?.employeeType.tag === 'AiAgent' && (
                                        <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 px-1 h-3.5 bg-violet-900/40 text-violet-300 border-0">
                                          <Bot className="h-2 w-2" /> AI
                                        </Badge>
                                      )}
                                      <span className="text-[11px] text-muted-foreground/60">{formatTime(msg.sentAt)}</span>
                                      {msg.editedAt != null && !msg.deleted && (
                                        <span className="text-[10px] text-muted-foreground/60">(edited)</span>
                                      )}
                                      {pinnedMessageIds.has(msg.id.toString()) && (
                                        <span className="text-[10px] text-amber-500" title="Pinned">📌</span>
                                      )}
                                    </div>
                                  )}

                                  {msg.deleted ? (
                                    <p className="text-sm text-muted-foreground italic">[Message deleted]</p>
                                  ) : editingMsgId === msg.id ? (
                                    <div className="space-y-1" onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit() }}>
                                      <MentionInput
                                        value={editText}
                                        onChange={setEditText}
                                        onSubmit={handleSaveEdit}
                                        className="text-sm bg-accent border-border text-foreground/90 rounded px-2 py-1"
                                      />
                                      <div className="flex items-center gap-2 text-[11px]">
                                        <span className="text-muted-foreground">Escape to <button onClick={handleCancelEdit} className="text-violet-400 hover:underline">cancel</button> &middot; Enter to <button onClick={handleSaveEdit} className="text-violet-400 hover:underline">save</button></span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-baseline gap-2">
                                      <RenderMentions
                                        text={msg.content}
                                        className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed"
                                      />
                                      {isSameAuthor && msg.editedAt != null && (
                                        <span className="text-[10px] text-muted-foreground/60 shrink-0">(edited)</span>
                                      )}
                                      {isSameAuthor && pinnedMessageIds.has(msg.id.toString()) && (
                                        <span className="text-[10px] text-amber-500 shrink-0" title="Pinned">📌</span>
                                      )}
                                    </div>
                                  )}

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
                                              : 'bg-accent border-border text-muted-foreground hover:border-border'
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
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem onClick={() => setThread({ parentId: msg.id })}>
                                  <Reply className="size-3.5" /> Reply in thread
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => setShowEmojiFor(msg.id)}>
                                  <SmilePlus className="size-3.5" /> Add reaction
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleTogglePin(msg)}>
                                  <Pin className="size-3.5" /> {pinnedMessageIds.has(msg.id.toString()) ? 'Unpin' : 'Pin'} message
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => navigator.clipboard.writeText(msg.content)}>
                                  <Copy className="size-3.5" /> Copy text
                                </ContextMenuItem>
                                {msg.sender.toHexString() === myHex && !msg.deleted && (
                                  <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => handleStartEdit(msg)}>
                                      <Pencil className="size-3.5" /> Edit message
                                    </ContextMenuItem>
                                    <ContextMenuItem variant="destructive" onClick={() => setDeletingMsgId(msg.id)}>
                                      <Trash2 className="size-3.5" /> Delete message
                                    </ContextMenuItem>
                                  </>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                          )
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div className="shrink-0 px-5 py-1 text-xs text-muted-foreground animate-pulse">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.join(', ')} are typing...`}
                  </div>
                )}

                {/* Composer */}
                {sendError && (
                  <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/30">
                    <p className="text-xs text-red-400">Failed to send: {sendError}</p>
                  </div>
                )}
                <div className="shrink-0 px-5 py-3 border-t border-border">
                  <div className="bg-muted border border-border rounded-lg focus-within:border-violet-600 transition-colors">
                    <MentionInput
                      value={messageText}
                      onChange={(val) => { setMessageText(val); handleTyping() }}
                      onSubmit={handleSend}
                      placeholder={
                        view.kind === 'channel' && currentChannel
                          ? `Message #${currentChannel.name}`
                          : view.kind === 'dm'
                            ? `Message ${employeeMap.get(view.employeeId)?.name ?? ''}`
                            : 'Type a message...'
                      }
                      className="min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 py-2.5"
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
              {/* THREAD PANEL (Desktop)                                        */}
              {/* ============================================================ */}
              {thread && (
                <div className="w-96 shrink-0 border-l border-border bg-background">
                  {threadPanelContent}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ================================================================== */}
      {/* DELETE MESSAGE CONFIRMATION DIALOG                                  */}
      {/* ================================================================== */}
      <Dialog open={deletingMsgId !== null} onOpenChange={(open) => { if (!open) setDeletingMsgId(null) }}>
        <DialogContent className="bg-muted border-border text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete message</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this message? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingMsgId(null)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* CREATE CHANNEL DIALOG                                               */}
      {/* ================================================================== */}
      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onCreate={async (name, desc, priv) => {
          try {
            if (currentOrgId === null) return
            await createChannel({ name, description: desc || null, isPrivate: priv, orgId: BigInt(currentOrgId) })
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
      <DialogContent className="bg-muted border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-foreground/80">Channel name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                placeholder="e.g. marketing"
                className="pl-9 bg-accent border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground/80">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="bg-accent border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground/80">Make private</Label>
              <p className="text-xs text-muted-foreground">Only invited members can see this channel</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
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
