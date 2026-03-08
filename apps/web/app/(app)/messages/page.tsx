'use client'

import { useTable } from 'spacetimedb/react'
import { useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Hash, Lock, Send, Search, Bot, Circle } from 'lucide-react'

// ---- Types from SpacetimeDB ------------------------------------------------

type ViewMode =
  | { kind: 'channel'; channelId: bigint }
  | { kind: 'dm'; employeeId: string }
  | null

// ---- Helpers ----------------------------------------------------------------

function formatTimestamp(ts: any): string {
  const date = ts.toDate()
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function statusColor(tag: string): string {
  switch (tag) {
    case 'Online': return 'text-emerald-500'
    case 'Busy': return 'text-amber-500'
    case 'InCall': return 'text-blue-500'
    default: return 'text-neutral-400'
  }
}

function avatarColor(name: string): string {
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return colors[Math.abs(hash) % colors.length]
}

// ---- Main Component ---------------------------------------------------------

export default function MessagesPage() {
  const { identity } = useSpacetimeDB()
  const sendMessage = useReducer(reducers.sendMessage)

  const [allChannels] = useTable(tables.channel)
  const [allMessages] = useTable(tables.message)
  const [allEmployees] = useTable(tables.employee)

  const [view, setView] = useState<ViewMode>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sorted channels
  const channels = useMemo(
    () => [...allChannels].sort((a, b) => a.name.localeCompare(b.name)),
    [allChannels],
  )

  // Sorted employees (excluding current user, showing as DM targets)
  const employees = useMemo(
    () =>
      [...allEmployees]
        .filter((e) =>
          identity ? e.id.toHexString() !== identity.toHexString() : true,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allEmployees, identity],
  )

  // Employee lookup map by hex string
  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees],
  )

  // Search filter
  const filteredChannels = useMemo(
    () =>
      channels.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [channels, searchQuery],
  )

  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [employees, searchQuery],
  )

  // Messages for current view
  const messages = useMemo(() => {
    if (!view) return []
    if (view.kind === 'channel') {
      return [...allMessages]
        .filter(
          (m) =>
            m.contextType.tag === 'Channel' && m.contextId === view.channelId,
        )
        .sort((a, b) => Number(a.sentAt.toMillis()) - Number(b.sentAt.toMillis()))
    }
    // DM: show messages where contextType is not Channel and sender is either party
    // For now just show all non-channel messages as a placeholder
    return []
  }, [allMessages, view])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Auto-select first channel if none selected
  useEffect(() => {
    if (!view && channels.length > 0) {
      setView({ kind: 'channel', channelId: channels[0].id })
    }
  }, [channels, view])

  // Current channel / employee info for header
  const currentChannel = useMemo(
    () =>
      view?.kind === 'channel'
        ? channels.find((c) => c.id === view.channelId) ?? null
        : null,
    [channels, view],
  )

  const currentEmployee = useMemo(
    () =>
      view?.kind === 'dm' ? employeeMap.get(view.employeeId) ?? null : null,
    [employeeMap, view],
  )

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !view) return
    if (view.kind !== 'channel') return

    setIsSending(true)
    try {
      await sendMessage({
        contextType: { tag: 'Channel' },
        contextId: view.channelId,
        content: messageText.trim(),
        messageType: { tag: 'Chat' },
      })
      setMessageText('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }, [messageText, view, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT SIDEBAR                                                         */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-64 shrink-0 flex flex-col border-r bg-neutral-50 dark:bg-neutral-900">
        {/* Search */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Channels section */}
          <div className="px-2 pt-4 pb-1">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Channels
              </span>
              <span className="text-xs text-neutral-400">
                {filteredChannels.length}
              </span>
            </div>

            {filteredChannels.length === 0 && (
              <p className="text-xs text-neutral-400 px-2 py-2">
                No channels found
              </p>
            )}

            {filteredChannels.map((channel) => {
              const isSelected =
                view?.kind === 'channel' && view.channelId === channel.id
              return (
                <button
                  key={channel.id.toString()}
                  onClick={() =>
                    setView({ kind: 'channel', channelId: channel.id })
                  }
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
                    isSelected
                      ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  {channel.isPrivate ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </button>
              )
            })}
          </div>

          <Separator className="my-3 mx-2" />

          {/* Direct Messages section */}
          <div className="px-2 pb-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Direct Messages
              </span>
            </div>

            {filteredEmployees.length === 0 && (
              <p className="text-xs text-neutral-400 px-2 py-2">
                No employees found
              </p>
            )}

            {filteredEmployees.map((emp) => {
              const isSelected =
                view?.kind === 'dm' &&
                view.employeeId === emp.id.toHexString()
              const isAI = emp.employeeType.tag === 'AiAgent'
              return (
                <button
                  key={emp.id.toHexString()}
                  onClick={() =>
                    setView({ kind: 'dm', employeeId: emp.id.toHexString() })
                  }
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
                    isSelected
                      ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800',
                  ].join(' ')}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback
                        className={`text-[9px] text-white ${avatarColor(emp.name)}`}
                      >
                        {getInitials(emp.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 fill-current ${statusColor(emp.status.tag)}`}
                    />
                  </div>
                  <span className="truncate flex-1">{emp.name}</span>
                  {isAI && (
                    <Bot className="h-3 w-3 shrink-0 text-violet-400" />
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CHAT AREA                                                       */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-950">
        {view === null ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto">
                <Hash className="h-8 w-8 text-violet-500" />
              </div>
              <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
                Select a channel or person
              </p>
              <p className="text-sm text-neutral-400">
                Choose from the sidebar to start messaging
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* CHANNEL / DM HEADER                                             */}
            {/* -------------------------------------------------------------- */}
            <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
              {view.kind === 'channel' && currentChannel ? (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                    {currentChannel.isPrivate ? (
                      <Lock className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <Hash className="h-4 w-4 text-neutral-500" />
                    )}
                    {currentChannel.name}
                  </div>
                  {currentChannel.members.length > 0 && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="h-4 data-[orientation=vertical]:h-4"
                      />
                      <span className="text-xs text-neutral-500">
                        {currentChannel.members.length} member
                        {currentChannel.members.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {currentChannel.description && (
                    <>
                      <Separator
                        orientation="vertical"
                        className="h-4 data-[orientation=vertical]:h-4"
                      />
                      <span className="text-xs text-neutral-400 truncate max-w-xs">
                        {currentChannel.description}
                      </span>
                    </>
                  )}
                  {currentChannel.aiParticipants.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] gap-1 py-0"
                    >
                      <Bot className="h-2.5 w-2.5" />
                      {currentChannel.aiParticipants.length} AI
                    </Badge>
                  )}
                </>
              ) : view.kind === 'dm' && currentEmployee ? (
                <>
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback
                        className={`text-xs text-white ${avatarColor(currentEmployee.name)}`}
                      >
                        {getInitials(currentEmployee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-current ${statusColor(currentEmployee.status.tag)}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                      {currentEmployee.name}
                      {currentEmployee.employeeType.tag === 'AiAgent' && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1 py-0"
                        >
                          <Bot className="h-2.5 w-2.5" />
                          AI Agent
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {currentEmployee.role} &middot;{' '}
                      {currentEmployee.status.tag}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* MESSAGE LIST                                                     */}
            {/* -------------------------------------------------------------- */}
            <ScrollArea className="flex-1">
              <div className="px-4 py-4 space-y-1">
                {view.kind === 'dm' && (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm text-neutral-400 italic">
                      Direct messaging coming soon — channel messages are live
                      now.
                    </p>
                  </div>
                )}

                {view.kind === 'channel' && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                      <Hash className="h-6 w-6 text-neutral-400" />
                    </div>
                    <p className="font-medium text-neutral-600 dark:text-neutral-300">
                      No messages yet
                    </p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Be the first to send a message in{' '}
                      <span className="font-semibold">
                        #{currentChannel?.name}
                      </span>
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const sender = employeeMap.get(msg.sender.toHexString())
                  const senderName = sender?.name ?? 'Unknown'
                  const prevMsg = idx > 0 ? messages[idx - 1] : null
                  const isSameAuthor =
                    prevMsg &&
                    prevMsg.sender.toHexString() ===
                      msg.sender.toHexString() &&
                    Number(msg.sentAt.toMillis()) - Number(prevMsg.sentAt.toMillis()) < 5 * 60 * 1000 // 5 min gap

                  return (
                    <div
                      key={msg.id.toString()}
                      className={`flex items-start gap-3 group ${isSameAuthor ? 'mt-0.5' : 'mt-4'}`}
                    >
                      {/* Avatar column */}
                      <div className="w-9 shrink-0 flex justify-center">
                        {isSameAuthor ? (
                          /* Timestamp hover ghost */
                          <span className="text-[10px] text-neutral-300 dark:text-neutral-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity leading-tight">
                            {formatTimestamp(msg.sentAt).split(' ').pop()}
                          </span>
                        ) : (
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              className={`text-xs text-white ${avatarColor(senderName)}`}
                            >
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {!isSameAuthor && (
                          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                              {senderName}
                            </span>
                            {sender?.employeeType.tag === 'AiAgent' && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] gap-0.5 py-0 px-1.5 h-4"
                              >
                                <Bot className="h-2 w-2" />
                                AI
                              </Badge>
                            )}
                            <span className="text-xs text-neutral-400">
                              {formatTimestamp(msg.sentAt)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-end gap-2 flex-wrap">
                          <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          {msg.aiGenerated && (
                            <Badge
                              variant="outline"
                              className="text-[9px] gap-0.5 py-0 px-1.5 h-4 shrink-0 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400"
                            >
                              <Bot className="h-2 w-2" />
                              AI generated
                            </Badge>
                          )}
                        </div>

                        {msg.aiConfidence !== undefined &&
                          msg.aiConfidence !== null && (
                            <span className="text-[10px] text-neutral-400 mt-0.5 inline-block">
                              Confidence:{' '}
                              {Math.round(msg.aiConfidence * 100)}%
                            </span>
                          )}
                      </div>
                    </div>
                  )
                })}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* -------------------------------------------------------------- */}
            {/* MESSAGE COMPOSER                                                 */}
            {/* -------------------------------------------------------------- */}
            <div className="shrink-0 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus-within:border-violet-400 dark:focus-within:border-violet-600 transition-colors">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    view.kind === 'channel' && currentChannel
                      ? `Message #${currentChannel.name}`
                      : view.kind === 'dm' && currentEmployee
                        ? `Message ${currentEmployee.name}`
                        : 'Type a message...'
                  }
                  disabled={isSending || view.kind === 'dm'}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm placeholder:text-neutral-400"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSend}
                  disabled={
                    !messageText.trim() ||
                    isSending ||
                    view.kind === 'dm'
                  }
                  className="h-7 w-7 shrink-0 text-neutral-400 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
              {view.kind === 'channel' && (
                <p className="text-[10px] text-neutral-400 mt-1 px-1">
                  Press Enter to send &middot; Shift+Enter for new line
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
