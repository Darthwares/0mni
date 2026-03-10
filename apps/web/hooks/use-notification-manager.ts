'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useNotifications } from './use-notifications'

/**
 * Fire-and-forget hook that watches SpacetimeDB tables and sends
 * desktop notifications for new messages, task assignments, and
 * task-status changes on watched tasks.
 *
 * Call once in the app layout — no UI output.
 */
export function useNotificationManager() {
  const { sendNotification, permission } = useNotifications()
  const { identity } = useSpacetimeDB()

  const [messages] = useTable(tables.message)
  const [channels] = useTable(tables.channel)
  const [tasks] = useTable(tables.task)
  const [taskWatchers] = useTable(tables.task_watcher)
  const [employees] = useTable(tables.employee)

  // ---------- Refs for tracking "already seen" IDs ----------
  const seenMessageIds = useRef(new Set<string>())
  const messageInitialLoadDone = useRef(false)

  const seenTaskIds = useRef(new Set<string>())
  const taskInitialLoadDone = useRef(false)

  // For task-status change detection we store the last-known status per task id
  const taskStatusMap = useRef(new Map<string, string>())
  const taskStatusInitialLoadDone = useRef(false)

  // ---------- Lookup maps (memoised) ----------
  const channelMap = useMemo(
    () => new Map(channels.map((c) => [c.id.toString(), c])),
    [channels],
  )

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id.toHexString(), e])),
    [employees],
  )

  const myHex = identity?.toHexString() ?? ''

  // IDs of tasks the current user is watching
  const watchedTaskIds = useMemo(() => {
    if (!myHex) return new Set<string>()
    return new Set(
      taskWatchers
        .filter((tw) => tw.userId.toHexString() === myHex)
        .map((tw) => tw.taskId.toString()),
    )
  }, [taskWatchers, myHex])

  // ===================== Message notifications =====================
  useEffect(() => {
    if (permission !== 'granted') return
    if (!identity) return

    // First render — seed all existing IDs so we don't flood
    if (!messageInitialLoadDone.current && messages.length > 0) {
      messages.forEach((m) => seenMessageIds.current.add(m.id.toString()))
      messageInitialLoadDone.current = true
      return
    }

    for (const msg of messages) {
      const idStr = msg.id.toString()
      if (seenMessageIds.current.has(idStr)) continue
      seenMessageIds.current.add(idStr)

      // Skip own messages, deleted messages, and if tab is focused
      if (msg.sender.toHexString() === myHex) continue
      if (msg.deleted) continue
      if (!document.hidden) continue

      // Only notify for channel-context messages
      if (msg.contextType?.tag !== 'Channel') continue

      const channel = channelMap.get(msg.contextId.toString())
      if (!channel) continue

      // Check membership: channel.members includes hex identity strings
      if (!channel.members.includes(myHex)) continue

      // Build title depending on DM vs regular channel
      let title: string
      if (channel.name.startsWith('dm-')) {
        const senderEmp = employeeMap.get(msg.sender.toHexString())
        title = senderEmp ? `DM from ${senderEmp.name}` : 'New direct message'
      } else {
        title = `#${channel.name}`
      }

      const body = msg.content.length > 100
        ? msg.content.slice(0, 100) + '\u2026'
        : msg.content

      sendNotification(title, {
        body,
        tag: `msg-${idStr}`,
        url: '/messages',
      })
    }
  }, [messages, permission, identity, myHex, channelMap, employeeMap, sendNotification])

  // ===================== Task-assigned notifications =====================
  useEffect(() => {
    if (permission !== 'granted') return
    if (!identity) return

    // Seed existing task IDs on first load
    if (!taskInitialLoadDone.current && tasks.length > 0) {
      tasks.forEach((t) => seenTaskIds.current.add(t.id.toString()))
      taskInitialLoadDone.current = true
      return
    }

    for (const task of tasks) {
      const idStr = task.id.toString()
      if (seenTaskIds.current.has(idStr)) continue
      seenTaskIds.current.add(idStr)

      // Only notify if assigned to me
      if (!task.assignee) continue
      if (task.assignee.toHexString() !== myHex) continue
      if (!document.hidden) continue

      const body = task.title.length > 100
        ? task.title.slice(0, 100) + '\u2026'
        : task.title

      sendNotification('New task assigned', {
        body,
        tag: `task-assign-${idStr}`,
        url: '/tickets',
      })
    }
  }, [tasks, permission, identity, myHex, sendNotification])

  // ===================== Task-status change notifications (watched) =====================
  useEffect(() => {
    if (permission !== 'granted') return
    if (!identity) return

    // Seed the status map on first load
    if (!taskStatusInitialLoadDone.current && tasks.length > 0) {
      tasks.forEach((t) => taskStatusMap.current.set(t.id.toString(), t.status?.tag ?? ''))
      taskStatusInitialLoadDone.current = true
      return
    }

    for (const task of tasks) {
      const idStr = task.id.toString()
      const currentStatus = task.status?.tag ?? ''
      const previousStatus = taskStatusMap.current.get(idStr)

      // Always update the map
      taskStatusMap.current.set(idStr, currentStatus)

      // If brand new (never seen) or status hasn't changed, skip
      if (previousStatus === undefined) continue
      if (previousStatus === currentStatus) continue

      // Only notify for tasks the user is watching
      if (!watchedTaskIds.has(idStr)) continue
      if (!document.hidden) continue

      sendNotification('Task status updated', {
        body: `"${task.title.slice(0, 80)}" changed to ${currentStatus}`,
        tag: `task-status-${idStr}`,
        url: '/tickets',
      })
    }
  }, [tasks, permission, identity, watchedTaskIds, sendNotification])
}
