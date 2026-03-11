'use client'

import { useEffect, useCallback, useRef } from 'react'

type NavigableItem =
  | { kind: 'channel'; id: bigint; name: string }
  | { kind: 'dm'; channelId: bigint; employeeId: string; name: string }

type ViewMode =
  | { kind: 'channel'; channelId: bigint }
  | { kind: 'dm'; channelId: bigint; employeeId: string }
  | null

interface UseMessagesKeyboardOptions {
  /** All navigable items in sidebar order */
  items: NavigableItem[]
  /** Current view */
  view: ViewMode
  /** Set the current view */
  onNavigate: (item: NavigableItem) => void
  /** Focus the message composer */
  onFocusComposer: () => void
  /** Focus the search input */
  onFocusSearch: () => void
  /** Open thread for the last message */
  onOpenThread: (() => void) | null
  /** Close thread panel */
  onCloseThread: () => void
  /** Whether thread is open */
  threadOpen: boolean
  /** Toggle emoji picker on focused message */
  onToggleEmoji: (() => void) | null
  /** Edit the last own message */
  onEditLastMessage: (() => void) | null
  /** Create new channel */
  onCreateChannel: () => void
  /** Whether the page is active/ready */
  enabled: boolean
}

export function useMessagesKeyboard(opts: UseMessagesKeyboardOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const o = optsRef.current
    if (!o.enabled) return

    const target = e.target as HTMLElement
    const inInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable

    // --- Shortcuts that work even in inputs ---

    // Escape: close thread, or blur input
    if (e.key === 'Escape') {
      if (o.threadOpen) {
        e.preventDefault()
        o.onCloseThread()
        return
      }
      if (inInput) {
        ;(target as HTMLElement).blur()
        return
      }
      return
    }

    // Mod+/ — Focus composer from anywhere
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      o.onFocusComposer()
      return
    }

    // --- Shortcuts that only work outside inputs ---
    if (inInput) return

    // / — Focus composer
    if (e.key === '/') {
      e.preventDefault()
      o.onFocusComposer()
      return
    }

    // Ctrl/Cmd+F or just F — Focus search
    if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      o.onFocusSearch()
      return
    }

    // Alt+Up / Alt+Down — Navigate channels
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
      e.preventDefault()
      const { items, view } = o
      if (items.length === 0) return

      // Find current index
      let currentIdx = -1
      if (view) {
        currentIdx = items.findIndex((item) => {
          if (view.kind === 'channel' && item.kind === 'channel') {
            return item.id === view.channelId
          }
          if (view.kind === 'dm' && item.kind === 'dm') {
            return item.channelId === view.channelId
          }
          return false
        })
      }

      const delta = e.key === 'ArrowUp' ? -1 : 1
      let nextIdx = currentIdx + delta
      if (nextIdx < 0) nextIdx = items.length - 1
      if (nextIdx >= items.length) nextIdx = 0

      o.onNavigate(items[nextIdx])
      return
    }

    // ArrowUp / ArrowDown without Alt — also navigate channels (Slack-like)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const { items, view } = o
      if (items.length === 0) return

      let currentIdx = -1
      if (view) {
        currentIdx = items.findIndex((item) => {
          if (view.kind === 'channel' && item.kind === 'channel') {
            return item.id === view.channelId
          }
          if (view.kind === 'dm' && item.kind === 'dm') {
            return item.channelId === view.channelId
          }
          return false
        })
      }

      const delta = e.key === 'ArrowUp' ? -1 : 1
      let nextIdx = currentIdx + delta
      if (nextIdx < 0) nextIdx = items.length - 1
      if (nextIdx >= items.length) nextIdx = 0

      o.onNavigate(items[nextIdx])
      return
    }

    // t — Open thread on last message
    if (e.key === 't' && o.onOpenThread) {
      e.preventDefault()
      o.onOpenThread()
      return
    }

    // + — Open emoji on last message
    if ((e.key === '+' || e.key === '=') && o.onToggleEmoji) {
      e.preventDefault()
      o.onToggleEmoji()
      return
    }

    // e — Edit last own message
    if (e.key === 'e' && o.onEditLastMessage) {
      e.preventDefault()
      o.onEditLastMessage()
      return
    }

    // n — New channel
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      o.onCreateChannel()
      return
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/** Shortcut definitions for the help bar / dialog */
export const MESSAGE_SHORTCUTS = [
  { keys: ['↑', '↓'], label: 'Navigate channels' },
  { keys: ['/'], label: 'Compose' },
  { keys: ['f'], label: 'Search' },
  { keys: ['t'], label: 'Thread' },
  { keys: ['e'], label: 'Edit last' },
  { keys: ['+'], label: 'React' },
  { keys: ['n'], label: 'New channel' },
  { keys: ['Esc'], label: 'Close / Blur' },
] as const
