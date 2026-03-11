'use client'

import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useCallback } from 'react'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import {
  KanbanBoardProvider,
  KanbanBoard,
  KanbanBoardColumn,
  KanbanBoardColumnHeader,
  KanbanBoardColumnTitle,
  KanbanBoardColumnList,
  KanbanBoardColumnListItem,
  KanbanBoardCard,
  KanbanBoardCardTitle,
  KanbanBoardCardDescription,
  KanbanBoardCardButtonGroup,
  KanbanBoardCardButton,
  KanbanBoardColumnFooter,
  KanbanBoardColumnButton,
  KanbanColorCircle,
  KanbanBoardExtraMargin,
  type KanbanBoardCircleColor,
} from '@/components/kanban'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Plus,
  KanbanSquare,
  List,
  Filter,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Clock,
  User,
  Bot,
  X,
  Zap,
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  EyeOff,
  Flag,
  GripVertical,
  Pencil,
  MoreHorizontal,
  Send,
  MessageSquare,
  Activity,
  CalendarClock,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox'

// ---- Types ------------------------------------------------------------------

type ViewMode = 'board' | 'list'

interface ColumnDef {
  id: string
  label: string
  statusTags: string[]
  circleColor: KanbanBoardCircleColor
}

const COLUMNS: ColumnDef[] = [
  { id: 'backlog', label: 'Backlog', statusTags: ['Unclaimed'], circleColor: 'gray' },
  { id: 'todo', label: 'To Do', statusTags: ['Claimed'], circleColor: 'blue' },
  { id: 'in-progress', label: 'In Progress', statusTags: ['InProgress', 'SelfChecking'], circleColor: 'yellow' },
  { id: 'review', label: 'Review', statusTags: ['NeedsReview', 'Escalated'], circleColor: 'violet' },
  { id: 'done', label: 'Done', statusTags: ['Completed'], circleColor: 'green' },
]

// Maps column ID → the primary TaskStatus tag for that column (used on drop)
const COLUMN_TARGET_STATUS: Record<string, string> = {
  'backlog': 'Unclaimed',
  'todo': 'Claimed',
  'in-progress': 'InProgress',
  'review': 'NeedsReview',
  'done': 'Completed',
}

// ---- Helpers ----------------------------------------------------------------

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function nameToColor(name: string) {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function priorityIcon(tag: string) {
  switch (tag) {
    case 'Urgent': return <AlertCircle className="size-3.5 text-red-500" />
    case 'High': return <ArrowUp className="size-3.5 text-orange-400" />
    case 'Medium': return <Minus className="size-3.5 text-amber-400" />
    case 'Low': return <ArrowDown className="size-3.5 text-blue-400" />
    default: return <Minus className="size-3.5 text-neutral-400" />
  }
}

function priorityBadgeClass(tag: string) {
  switch (tag) {
    case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Low': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  }
}

function taskTypeLabel(tag: string) {
  return tag.replace(/([A-Z])/g, ' $1').trim()
}

function formatTimeAgo(ts: any): string {
  try {
    const date = ts.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch { return '' }
}

function formatDate(ts: any): string {
  try {
    const date = ts.toDate()
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

function getDueDateStatus(dueAt: any): 'overdue' | 'soon' | 'ok' | null {
  if (!dueAt) return null
  try {
    const due = dueAt.toDate()
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    if (diffMs < 0) return 'overdue'
    if (diffMs < 24 * 60 * 60 * 1000) return 'soon'
    return 'ok'
  } catch { return null }
}

// ---- Main Page --------------------------------------------------------------

export default function TicketsPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allTasks] = useTable(tables.task)
  const [employees] = useTable(tables.employee)
  const [allMessages] = useTable(tables.message)
  const [allWatchers] = useTable(tables.task_watcher)
  const [allActivityLogs] = useTable(tables.activity_log)
  const createTask = useReducer(reducers.createTask)
  const claimTask = useReducer(reducers.claimTask)
  const updateTaskStatus = useReducer(reducers.updateTaskStatus)
  const updateTask = useReducer(reducers.updateTask)
  const sendMessage = useReducer(reducers.sendMessage)
  const sendThreadReply = useReducer(reducers.sendThreadReply)
  const watchTask = useReducer(reducers.watchTask)
  const unwatchTask = useReducer(reducers.unwatchTask)
  const escalateTask = useReducer(reducers.escalateTask)

  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<bigint>>(new Set())

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('Medium')
  const [newType, setNewType] = useState('FeatureRequest')
  const [isCreating, setIsCreating] = useState(false)

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  const filteredTasks = useMemo(() => {
    let tasks = [...allTasks]
    // Scope tasks to current org
    if (currentOrgId !== null) {
      tasks = tasks.filter((t) => Number(t.orgId) === currentOrgId)
    }
    tasks = tasks.filter((t) => t.status.tag !== 'Cancelled' && t.status.tag !== 'Blocked')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
    }
    if (filterPriority !== 'all') {
      tasks = tasks.filter((t) => t.priority.tag === filterPriority)
    }
    if (filterType !== 'all') {
      tasks = tasks.filter((t) => t.taskType.tag === filterType)
    }
    return tasks
  }, [allTasks, searchQuery, filterPriority, filterType, currentOrgId])

  const columnTasks = useMemo(() => {
    const map = new Map<string, any[]>()
    COLUMNS.forEach((col) => {
      map.set(
        col.id,
        filteredTasks
          .filter((t) => col.statusTags.includes(t.status.tag))
          .sort((a, b) => {
            const pOrder = ['Urgent', 'High', 'Medium', 'Low']
            return pOrder.indexOf(a.priority.tag) - pOrder.indexOf(b.priority.tag)
          })
      )
    })
    return map
  }, [filteredTasks])

  const handleCreate = async () => {
    if (!newTitle.trim() || currentOrgId === null) return
    setIsCreating(true)
    try {
      await createTask({
        taskType: { tag: newType } as any,
        title: newTitle.trim(),
        description: newDesc.trim(),
        contextType: { tag: 'Task' } as any,
        contextId: BigInt(0),
        assignee: null,
        priority: { tag: newPriority } as any,
        orgId: BigInt(currentOrgId),
      })
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
    } catch (e: any) {
      console.error('Failed to create task:', e)
    } finally {
      setIsCreating(false)
    }
  }

  const handleClaim = async (taskId: bigint) => {
    try {
      await claimTask({ taskId })
    } catch (e: any) {
      console.error('Failed to claim task:', e)
    }
  }

  const handleMoveTask = async (taskId: bigint, targetColumnId: string) => {
    const targetStatus = COLUMN_TARGET_STATUS[targetColumnId]
    if (!targetStatus) return

    // Don't move if already in target status
    const task = allTasks.find((t) => t.id === taskId)
    if (!task || task.status.tag === targetStatus) return

    try {
      await updateTaskStatus({
        taskId,
        newStatus: { tag: targetStatus } as any,
      })
    } catch (e: any) {
      console.error('Failed to move task:', e)
    }
  }

  const handleUpdateTask = async (taskId: bigint, title: string, description: string, priority: string) => {
    try {
      await updateTask({
        taskId,
        title,
        description,
        priority: { tag: priority } as any,
      })
    } catch (e: any) {
      console.error('Failed to update task:', e)
    }
  }

  const toggleTaskSelection = (taskId: bigint) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const toggleAllSelection = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set())
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)))
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    for (const taskId of selectedTaskIds) {
      try {
        await updateTaskStatus({ taskId, newStatus: { tag: status } as any })
      } catch (e: any) {
        console.error('Failed to update task status:', e)
      }
    }
    setSelectedTaskIds(new Set())
  }

  const handleBulkPriorityChange = async (priority: string) => {
    for (const taskId of selectedTaskIds) {
      const task = allTasks.find((t) => t.id === taskId)
      if (task) {
        try {
          await updateTask({
            taskId,
            title: task.title,
            description: task.description,
            priority: { tag: priority } as any,
          })
        } catch (e: any) {
          console.error('Failed to update task priority:', e)
        }
      }
    }
    setSelectedTaskIds(new Set())
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <KanbanSquare className="size-5 text-violet-500" />
          <h1 className="text-lg font-bold">Tickets</h1>
          <Badge variant="secondary" className="text-xs">
            {filteredTasks.length}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-52 text-sm"
            />
          </div>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <Filter className="size-3 mr-1" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 transition-colors ${viewMode === 'board' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <KanbanSquare className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="size-4" />
            </button>
          </div>

          <PresenceBar />

          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            Create
          </Button>
        </div>
      </div>

      {/* Board / List View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <KanbanBoardProvider>
            <KanbanBoard className="p-4 h-full">
              {COLUMNS.map((col) => {
                const tasks = columnTasks.get(col.id) || []
                return (
                  <KanbanBoardColumn
                    key={col.id}
                    columnId={col.id}
                    className="w-72 min-w-[288px]"
                    onDropOverColumn={(data) => {
                      try {
                        const parsed = JSON.parse(data)
                        handleMoveTask(BigInt(parsed.taskId), col.id)
                      } catch {}
                    }}
                  >
                    <KanbanBoardColumnHeader>
                      <KanbanBoardColumnTitle columnId={col.id}>
                        <KanbanColorCircle color={col.circleColor} />
                        {col.label}
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-2">
                          {tasks.length}
                        </Badge>
                      </KanbanBoardColumnTitle>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="px-0">
                      {tasks.map((task) => (
                        <KanbanBoardColumnListItem
                          key={task.id.toString()}
                          cardId={task.id.toString()}
                        >
                          <KanbanBoardCard
                            data={{ id: task.id.toString(), taskId: task.id.toString() }}
                            onClick={() => setSelectedTask(task)}
                            className="w-full"
                          >
                            {/* Top: ID + Priority */}
                            <div className="flex items-center justify-between w-full">
                              <span className="font-mono text-[10px] text-muted-foreground">T-{task.id.toString()}</span>
                              <div className="flex items-center gap-1.5">
                                {task.aiConfidence != null && (
                                  <Bot className="size-3 text-violet-400" />
                                )}
                                {priorityIcon(task.priority.tag)}
                              </div>
                            </div>

                            {/* Title */}
                            <KanbanBoardCardTitle className="line-clamp-2 text-left">
                              {task.title}
                            </KanbanBoardCardTitle>

                            {/* Type badge + Due date */}
                            <div className="flex items-center gap-1.5 w-full">
                              <Badge variant="outline" className="text-[10px] h-5 w-fit">
                                {taskTypeLabel(task.taskType.tag)}
                              </Badge>
                              {task.dueAt && (() => {
                                const status = getDueDateStatus(task.dueAt)
                                if (status === 'overdue' || status === 'soon') {
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                      status === 'overdue' ? 'text-red-500' : 'text-amber-500'
                                    }`}>
                                      <CalendarClock className="size-3" />
                                      {status === 'overdue' ? 'Overdue' : 'Due soon'}
                                    </span>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            {/* Bottom: Assignee + Time */}
                            <div className="flex items-center justify-between w-full">
                              <TaskAssignee
                                task={task}
                                employeeMap={employeeMap}
                                onClaim={() => handleClaim(task.id)}
                              />
                              <span className="text-[10px] text-muted-foreground">{formatTimeAgo(task.createdAt)}</span>
                            </div>

                            {/* Hover action buttons */}
                            <KanbanBoardCardButtonGroup>
                              <KanbanBoardCardButton
                                tooltip="View details"
                                onClick={(e) => { e.stopPropagation(); setSelectedTask(task) }}
                              >
                                <Eye className="size-3.5" />
                              </KanbanBoardCardButton>
                              {!task.assignee && (
                                <KanbanBoardCardButton
                                  tooltip="Claim task"
                                  onClick={(e) => { e.stopPropagation(); handleClaim(task.id) }}
                                >
                                  <User className="size-3.5" />
                                </KanbanBoardCardButton>
                              )}
                            </KanbanBoardCardButtonGroup>
                          </KanbanBoardCard>
                        </KanbanBoardColumnListItem>
                      ))}
                      {tasks.length === 0 && (
                        <li className="px-2 py-4">
                          <div className="rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
                            <p className="text-xs text-muted-foreground">No tickets</p>
                          </div>
                        </li>
                      )}
                    </KanbanBoardColumnList>

                    {col.id === 'backlog' && (
                      <KanbanBoardColumnFooter>
                        <KanbanBoardColumnButton onClick={() => setShowCreate(true)}>
                          <Plus className="mr-1 size-3.5" />
                          Add ticket
                        </KanbanBoardColumnButton>
                      </KanbanBoardColumnFooter>
                    )}
                  </KanbanBoardColumn>
                )
              })}
              <KanbanBoardExtraMargin />
            </KanbanBoard>
          </KanbanBoardProvider>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 max-w-5xl mx-auto">
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2.5 w-10">
                        <CheckboxUI
                          checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                          onCheckedChange={toggleAllSelection}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Priority</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Assignee</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Due Date</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => {
                      const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
                      const isSelected = selectedTaskIds.has(task.id)
                      return (
                        <tr
                          key={task.id.toString()}
                          onClick={() => setSelectedTask(task)}
                          className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${isSelected ? 'bg-muted/40' : ''}`}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <CheckboxUI
                              checked={isSelected}
                              onCheckedChange={() => toggleTaskSelection(task.id)}
                              aria-label={`Select ${task.title}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground">T-{task.id.toString()}</span>
                              <span className="font-medium truncate">{task.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge tag={task.status.tag} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {priorityIcon(task.priority.tag)}
                              <span className="text-xs">{task.priority.tag}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{taskTypeLabel(task.taskType.tag)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {assignee ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="size-5">
                                  <AvatarFallback className={`${nameToColor(assignee.name)} text-[8px] text-white`}>
                                    {getInitials(assignee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate">{assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {task.dueAt ? (
                              <DueDateBadge dueAt={task.dueAt} />
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(task.createdAt)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedTaskIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background/95 backdrop-blur px-5 py-3 shadow-lg">
                <span className="text-sm font-medium">{selectedTaskIds.size} selected</span>
                <Separator orientation="vertical" className="h-5" />
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unclaimed">Unclaimed</SelectItem>
                    <SelectItem value="Claimed">Claimed</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="NeedsReview">Needs Review</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select onValueChange={handleBulkPriorityChange}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Change Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())} className="h-8 text-xs">
                  <X className="size-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Task Detail Slide-over */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          employeeMap={employeeMap}
          onClose={() => setSelectedTask(null)}
          onClaim={() => handleClaim(selectedTask.id)}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={(taskId: bigint, status: string) =>
            updateTaskStatus({ taskId, newStatus: { tag: status } as any })
          }
          myIdentity={identity}
          allMessages={allMessages}
          allWatchers={allWatchers}
          allActivityLogs={allActivityLogs}
          sendMessage={sendMessage}
          sendThreadReply={sendThreadReply}
          watchTask={watchTask}
          unwatchTask={unwatchTask}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Brief description of the task"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detailed description, steps to reproduce, etc."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FeatureRequest">Feature Request</SelectItem>
                    <SelectItem value="BugReport">Bug Report</SelectItem>
                    <SelectItem value="BugTriage">Bug Triage</SelectItem>
                    <SelectItem value="CodeReview">Code Review</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="CustomerSupport">Customer Support</SelectItem>
                    <SelectItem value="TechnicalSupport">Technical Support</SelectItem>
                    <SelectItem value="DataEntry">Data Entry</SelectItem>
                    <SelectItem value="Approval">Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
              {isCreating ? <><Loader2 className="size-4 mr-1 animate-spin" /> Creating...</> : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Sub-components ---------------------------------------------------------

function TaskAssignee({
  task,
  employeeMap,
  onClaim,
}: {
  task: any
  employeeMap: Map<string, any>
  onClaim: () => void
}) {
  const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
  const isAI = assignee?.employeeType?.tag === 'Ai'

  if (assignee) {
    return (
      <div className="flex items-center gap-1.5">
        <Avatar className="size-5">
          <AvatarFallback className={`${nameToColor(assignee.name)} text-[8px] text-white`}>
            {getInitials(assignee.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{assignee.name}</span>
        {isAI && <Bot className="size-3 text-violet-400 shrink-0" />}
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClaim() }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClaim() } }}
      className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
    >
      <User className="size-3" />
      Claim
    </div>
  )
}

function StatusBadge({ tag }: { tag: string }) {
  const config: Record<string, { icon: any; className: string }> = {
    Unclaimed: { icon: Circle, className: 'text-neutral-500' },
    Claimed: { icon: User, className: 'text-blue-500' },
    InProgress: { icon: Loader2, className: 'text-amber-500' },
    SelfChecking: { icon: Eye, className: 'text-purple-500' },
    NeedsReview: { icon: Flag, className: 'text-violet-500' },
    Completed: { icon: CheckCircle2, className: 'text-emerald-500' },
    Escalated: { icon: AlertCircle, className: 'text-red-500' },
    Blocked: { icon: X, className: 'text-red-500' },
    Cancelled: { icon: X, className: 'text-neutral-500' },
  }
  const c = config[tag] || config.Unclaimed
  const Icon = c.icon

  return (
    <div className={`flex items-center gap-1.5 ${c.className}`}>
      <Icon className="size-3.5" />
      <span className="text-xs font-medium">{tag.replace(/([A-Z])/g, ' $1').trim()}</span>
    </div>
  )
}

function DueDateBadge({ dueAt }: { dueAt: any }) {
  const status = getDueDateStatus(dueAt)
  const dateStr = formatDate(dueAt)
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
      status === 'overdue'
        ? 'text-red-500'
        : status === 'soon'
          ? 'text-amber-500'
          : 'text-muted-foreground'
    }`}>
      <CalendarClock className="size-3" />
      {dateStr}
      {status === 'overdue' && <span className="text-[10px]">(Overdue)</span>}
      {status === 'soon' && <span className="text-[10px]">(Soon)</span>}
    </span>
  )
}

function TaskDetailPanel({
  task,
  employeeMap,
  onClose,
  onClaim,
  onUpdateTask,
  onUpdateStatus,
  myIdentity,
  allMessages,
  allWatchers,
  allActivityLogs,
  sendMessage,
  sendThreadReply,
  watchTask,
  unwatchTask,
}: {
  task: any
  employeeMap: Map<string, any>
  onClose: () => void
  onClaim: () => void
  onUpdateTask: (taskId: bigint, title: string, description: string, priority: string) => Promise<void>
  onUpdateStatus: (taskId: bigint, status: string) => Promise<any>
  myIdentity: any
  allMessages: readonly any[]
  allWatchers: readonly any[]
  allActivityLogs: readonly any[]
  sendMessage: (args: any) => Promise<any>
  sendThreadReply: (args: any) => Promise<any>
  watchTask: (args: any) => Promise<any>
  unwatchTask: (args: any) => Promise<any>
}) {
  const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description)
  const [editPriority, setEditPriority] = useState(task.priority.tag)
  const [isSaving, setIsSaving] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<bigint>>(new Set())
  const [replyingTo, setReplyingTo] = useState<bigint | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments')

  // Filter messages for this task
  const taskMessages = useMemo(() => {
    return allMessages
      .filter((m) => m.contextType?.tag === 'Task' && m.contextId === task.id && !m.deleted)
      .sort((a, b) => {
        try {
          return a.sentAt.toDate().getTime() - b.sentAt.toDate().getTime()
        } catch { return 0 }
      })
  }, [allMessages, task.id])

  // Separate comments (top-level) and thread replies
  const topLevelComments = useMemo(() => {
    return taskMessages.filter((m) => m.messageType?.tag === 'Comment' && !m.threadId)
  }, [taskMessages])

  const systemMessages = useMemo(() => {
    return taskMessages.filter((m) => m.messageType?.tag === 'SystemNotification')
  }, [taskMessages])

  const getReplies = useCallback((parentId: bigint) => {
    return taskMessages.filter((m) => m.threadId === parentId)
  }, [taskMessages])

  // Watchers for this task
  const taskWatchers = useMemo(() => {
    return allWatchers.filter((w) => w.taskId === task.id)
  }, [allWatchers, task.id])

  const isWatching = useMemo(() => {
    if (!myIdentity) return false
    return taskWatchers.some((w) => w.userId.toHexString() === myIdentity.toHexString())
  }, [taskWatchers, myIdentity])

  // Activity logs for this task
  const taskActivityLogs = useMemo(() => {
    return allActivityLogs
      .filter((l) => l.entityType === 'task' && l.entityId === task.id)
      .sort((a, b) => {
        try {
          return b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
        } catch { return 0 }
      })
  }, [allActivityLogs, task.id])

  // Due date status
  const dueDateStatus = getDueDateStatus(task.dueAt)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdateTask(task.id, editTitle, editDesc, editPriority)
      setIsEditing(false)
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(task.title)
    setEditDesc(task.description)
    setEditPriority(task.priority.tag)
    setIsEditing(false)
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    setIsSendingComment(true)
    try {
      await sendMessage({
        contextType: { tag: 'Task' } as any,
        contextId: task.id,
        content: commentText.trim(),
        messageType: { tag: 'Comment' } as any,
      })
      setCommentText('')
    } catch (e) {
      console.error('Failed to send comment:', e)
    } finally {
      setIsSendingComment(false)
    }
  }

  const handleSendReply = async (threadId: bigint) => {
    if (!replyText.trim()) return
    setIsSendingReply(true)
    try {
      await sendThreadReply({
        contextType: { tag: 'Task' } as any,
        contextId: task.id,
        content: replyText.trim(),
        threadId,
      })
      setReplyText('')
      setReplyingTo(null)
    } catch (e) {
      console.error('Failed to send reply:', e)
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleToggleWatch = async () => {
    try {
      if (isWatching) {
        await unwatchTask({ taskId: task.id })
      } else {
        await watchTask({ taskId: task.id })
      }
    } catch (e) {
      console.error('Failed to toggle watch:', e)
    }
  }

  const toggleThread = (msgId: bigint) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(msgId)) {
        next.delete(msgId)
      } else {
        next.add(msgId)
      }
      return next
    })
  }

  const getEmployeeName = (senderId: any): string => {
    if (!senderId) return 'Unknown'
    const emp = employeeMap.get(senderId.toHexString())
    return emp?.name || 'Unknown User'
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-background shadow-2xl animate-in slide-in-from-right-full duration-200">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground">T-{task.id.toString()}</span>
              <StatusBadge tag={task.status.tag} />
            </div>
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold h-auto py-0.5 px-1 -ml-1"
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-semibold">{task.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Watch/Unwatch */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleWatch}
              className={isWatching ? 'text-blue-500' : ''}
              title={isWatching ? 'Unwatch this task' : 'Watch this task'}
            >
              {isWatching ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            {taskWatchers.length > 0 && (
              <span className="text-[10px] text-muted-foreground -ml-1 mr-1">{taskWatchers.length}</span>
            )}
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} title="Edit">
                <Pencil className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs gap-1">
                  {isSaving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                  Save
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              {isEditing ? (
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </p>
              )}
            </div>

            <Separator />

            {/* Status selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Status</p>
              <Select
                value={task.status.tag}
                onValueChange={(val) => onUpdateStatus(task.id, val)}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unclaimed">Unclaimed</SelectItem>
                  <SelectItem value="Claimed">Claimed</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="NeedsReview">Needs Review</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                {isEditing ? (
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${priorityBadgeClass(task.priority.tag)}`}>
                    {priorityIcon(task.priority.tag)}
                    {task.priority.tag}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <Badge variant="outline" className="text-xs">{taskTypeLabel(task.taskType.tag)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className={`${nameToColor(assignee.name)} text-[9px] text-white`}>
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee.name}</span>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={onClaim} className="h-7 text-xs gap-1">
                    <User className="size-3" />
                    Claim task
                  </Button>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatTimeAgo(task.createdAt)}
                </div>
              </div>
              {/* Due Date */}
              {task.dueAt && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                    dueDateStatus === 'overdue'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : dueDateStatus === 'soon'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-muted/50 text-muted-foreground border-muted'
                  }`}>
                    <CalendarClock className="size-3.5" />
                    {formatDate(task.dueAt)}
                    {dueDateStatus === 'overdue' && <span className="ml-1">(Overdue)</span>}
                    {dueDateStatus === 'soon' && <span className="ml-1">(Due soon)</span>}
                  </div>
                </div>
              )}
            </div>

            {/* AI Section */}
            {task.aiConfidence != null && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Zap className="size-3.5 text-violet-400" />
                    AI Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-xs">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: `${(task.aiConfidence ?? 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{Math.round((task.aiConfidence ?? 0) * 100)}%</span>
                      </div>
                    </div>
                    {task.selfVerificationPassed != null && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-xs">Self-verification</span>
                        <span className={`text-xs font-medium ${task.selfVerificationPassed ? 'text-emerald-500' : 'text-red-500'}`}>
                          {task.selfVerificationPassed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    )}
                    {task.result && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">Result</p>
                        <p className="text-sm whitespace-pre-wrap">{task.result}</p>
                      </div>
                    )}
                    {task.thoughtTrace?.length > 0 && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-2">Thought Trace</p>
                        <div className="space-y-1">
                          {task.thoughtTrace.map((t: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <ChevronRight className="size-3 mt-0.5 shrink-0 text-violet-400" />
                              {t}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {task.escalationReason && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="size-3.5" />
                    Escalation Reason
                  </h3>
                  <p className="text-sm text-muted-foreground">{task.escalationReason}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Comments / Activity Tabs */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-1.5 text-sm font-medium pb-1 border-b-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="size-3.5" />
                  Comments
                  {topLevelComments.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{topLevelComments.length}</Badge>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-1.5 text-sm font-medium pb-1 border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity className="size-3.5" />
                  Activity
                </button>
              </div>

              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  {/* Comments list */}
                  {topLevelComments.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <MessageSquare className="size-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
                    </div>
                  )}
                  {topLevelComments.map((comment) => {
                    const replies = getReplies(comment.id)
                    const isExpanded = expandedThreads.has(comment.id)
                    const senderName = getEmployeeName(comment.sender)
                    return (
                      <div key={comment.id.toString()} className="space-y-2">
                        <div className="flex gap-2.5">
                          <Avatar className="size-7 mt-0.5 shrink-0">
                            <AvatarFallback className={`${nameToColor(senderName)} text-[8px] text-white`}>
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{senderName}</span>
                              <span className="text-[10px] text-muted-foreground">{formatTimeAgo(comment.sentAt)}</span>
                              {comment.aiGenerated && <Bot className="size-3 text-violet-400" />}
                            </div>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => {
                                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                                  setReplyText('')
                                }}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Reply className="size-3" />
                                Reply
                              </button>
                              {replies.length > 0 && (
                                <button
                                  onClick={() => toggleThread(comment.id)}
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Thread replies */}
                        {isExpanded && replies.length > 0 && (
                          <div className="ml-9 space-y-2 border-l-2 border-muted pl-3">
                            {replies.map((reply) => {
                              const replySenderName = getEmployeeName(reply.sender)
                              return (
                                <div key={reply.id.toString()} className="flex gap-2">
                                  <Avatar className="size-5 mt-0.5 shrink-0">
                                    <AvatarFallback className={`${nameToColor(replySenderName)} text-[7px] text-white`}>
                                      {getInitials(replySenderName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-medium">{replySenderName}</span>
                                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(reply.sentAt)}</span>
                                    </div>
                                    <p className="text-xs mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyingTo === comment.id && (
                          <div className="ml-9 flex gap-2">
                            <Input
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="h-8 text-xs flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendReply(comment.id)
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleSendReply(comment.id)}
                              disabled={!replyText.trim() || isSendingReply}
                            >
                              {isSendingReply ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* New comment input */}
                  <div className="flex gap-2 pt-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="min-h-[60px] text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          handleSendComment()
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Ctrl+Enter to send</span>
                    <Button
                      size="sm"
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || isSendingComment}
                      className="h-7 text-xs gap-1"
                    >
                      {isSendingComment ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                      Send
                    </Button>
                  </div>
                </div>
              ) : (
                /* Activity Log */
                <div className="space-y-3">
                  {/* System notification messages */}
                  {systemMessages.map((msg) => {
                    const actorName = getEmployeeName(msg.sender)
                    return (
                      <div key={msg.id.toString()} className="flex items-start gap-2.5">
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="size-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-medium">{actorName}</span>{' '}
                            <span className="text-muted-foreground">{msg.content}</span>
                          </p>
                          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(msg.sentAt)}</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Activity log entries */}
                  {taskActivityLogs.map((log) => {
                    const actorName = getEmployeeName(log.actor)
                    const actionLabel = log.action?.tag?.replace(/([A-Z])/g, ' $1').trim() || 'Unknown'
                    return (
                      <div key={log.id.toString()} className="flex items-start gap-2.5">
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="size-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="font-medium">{actorName}</span>{' '}
                            <span className="text-muted-foreground">{actionLabel}</span>
                            {log.metadata && (
                              <span className="text-muted-foreground"> - {log.metadata}</span>
                            )}
                          </p>
                          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Fallback: show creation info if no activity */}
                  {systemMessages.length === 0 && taskActivityLogs.length === 0 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Plus className="size-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="text-muted-foreground">Task created</span>
                          </p>
                          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(task.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Circle className="size-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="text-muted-foreground">Current status: </span>
                            <span className="font-medium">{task.status.tag.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </p>
                        </div>
                      </div>
                      {task.claimedAt && (
                        <div className="flex items-start gap-2.5">
                          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <User className="size-3 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">
                              <span className="text-muted-foreground">Task claimed</span>
                            </p>
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(task.claimedAt)}</span>
                          </div>
                        </div>
                      )}
                      {task.completedAt && (
                        <div className="flex items-start gap-2.5">
                          <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">
                              <span className="text-muted-foreground">Task completed</span>
                            </p>
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(task.completedAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
