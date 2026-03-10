'use client'

import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useCallback } from 'react'
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
  Flag,
  GripVertical,
  Pencil,
  MoreHorizontal,
} from 'lucide-react'

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

// ---- Main Page --------------------------------------------------------------

export default function TicketsPage() {
  const { identity } = useSpacetimeDB()
  const [allTasks] = useTable(tables.task)
  const [employees] = useTable(tables.employee)
  const createTask = useReducer(reducers.createTask)
  const claimTask = useReducer(reducers.claimTask)
  const updateTaskStatus = useReducer(reducers.updateTaskStatus)
  const updateTask = useReducer(reducers.updateTask)

  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)

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
  }, [allTasks, searchQuery, filterPriority, filterType])

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
    if (!newTitle.trim()) return
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

                            {/* Type badge */}
                            <Badge variant="outline" className="text-[10px] h-5 w-fit">
                              {taskTypeLabel(task.taskType.tag)}
                            </Badge>

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
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Priority</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Assignee</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => {
                      const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
                      return (
                        <tr
                          key={task.id.toString()}
                          onClick={() => setSelectedTask(task)}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
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
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(task.createdAt)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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

function TaskDetailPanel({
  task,
  employeeMap,
  onClose,
  onClaim,
  onUpdateTask,
  onUpdateStatus,
  myIdentity,
}: {
  task: any
  employeeMap: Map<string, any>
  onClose: () => void
  onClaim: () => void
  onUpdateTask: (taskId: bigint, title: string, description: string, priority: string) => Promise<void>
  onUpdateStatus: (taskId: bigint, status: string) => Promise<any>
  myIdentity: any
}) {
  const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description)
  const [editPriority, setEditPriority] = useState(task.priority.tag)
  const [isSaving, setIsSaving] = useState(false)

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
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
