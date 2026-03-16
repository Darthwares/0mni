'use client'

import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useMemo, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import ShinyText from '@/components/reactbits/ShinyText'
import { PagePresenceStrip } from '@/components/presence-bar'
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
  Target,
  Layers,
  TrendingDown,
  Play,
  Square,
  Flame,
  CalendarDays,
  Hash,
  Tag,
  Link2,
  GitBranch,
  Check,
  GanttChart,
  ArrowLeft,
  Download,
  UserCircle,
  Sparkles,
} from 'lucide-react'
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox'
import { exportCSV } from '@/lib/csv-export'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts'

// ---- Types ------------------------------------------------------------------

type FilterPreset = 'none' | 'my-tasks' | 'overdue' | 'high-priority' | 'this-sprint' | 'unassigned'
type ViewMode = 'board' | 'list' | 'sprints' | 'timeline'

const EPIC_COLORS = [
  { value: '#8B5CF6', label: 'Violet', class: 'bg-violet-500' },
  { value: '#3B82F6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#10B981', label: 'Emerald', class: 'bg-emerald-500' },
  { value: '#F59E0B', label: 'Amber', class: 'bg-amber-500' },
  { value: '#EC4899', label: 'Pink', class: 'bg-pink-500' },
  { value: '#06B6D4', label: 'Cyan', class: 'bg-cyan-500' },
  { value: '#F43F5E', label: 'Rose', class: 'bg-rose-500' },
  { value: '#6366F1', label: 'Indigo', class: 'bg-indigo-500' },
]

const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21]

interface TicketTemplate {
  id: string
  name: string
  icon: string
  color: string
  title: string
  description: string
  priority: string
  type: string
  storyPoints: string
}

const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    id: 'bug',
    name: 'Bug Report',
    icon: '🐛',
    color: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10',
    title: '[Bug] ',
    description: '## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behavior\n\n\n## Actual Behavior\n\n\n## Environment\n- Browser: \n- OS: \n- Version: ',
    priority: 'High',
    type: 'BugReport',
    storyPoints: '3',
  },
  {
    id: 'feature',
    name: 'Feature Request',
    icon: '✨',
    color: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
    title: '[Feature] ',
    description: '## Problem Statement\nDescribe the problem this feature solves.\n\n## Proposed Solution\nDescribe your proposed approach.\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n- [ ] \n\n## Alternatives Considered\n',
    priority: 'Medium',
    type: 'FeatureRequest',
    storyPoints: '5',
  },
  {
    id: 'improvement',
    name: 'Improvement',
    icon: '🔧',
    color: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    title: '[Improvement] ',
    description: '## Current State\nDescribe how it works now.\n\n## Desired State\nDescribe the improvement.\n\n## Impact\n- Performance: \n- UX: \n- Maintenance: ',
    priority: 'Medium',
    type: 'FeatureRequest',
    storyPoints: '3',
  },
  {
    id: 'techdebt',
    name: 'Tech Debt',
    icon: '🏗️',
    color: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
    title: '[Tech Debt] ',
    description: '## What needs cleanup\n\n\n## Why now\n\n\n## Risk of not doing it\n\n\n## Approach\n',
    priority: 'Low',
    type: 'CodeReview',
    storyPoints: '2',
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: '📝',
    color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
    title: '[Docs] ',
    description: '## What to document\n\n\n## Target audience\n\n\n## Sections\n- [ ] \n- [ ] ',
    priority: 'Low',
    type: 'Documentation',
    storyPoints: '1',
  },
  {
    id: 'research',
    name: 'Research Spike',
    icon: '🔬',
    color: 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10',
    title: '[Spike] ',
    description: '## Question to answer\n\n\n## Timeboxed to\n_X hours_\n\n## Success criteria\nWe can make an informed decision about...\n\n## Notes\n',
    priority: 'Medium',
    type: 'FeatureRequest',
    storyPoints: '2',
  },
]

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
  const [allSprints] = useTable(tables.sprint)
  const [allEpics] = useTable(tables.epic)
  const [allTaskExtensions] = useTable(tables.task_extension)
  const [allTaskLabels] = useTable(tables.task_label)
  const [allLabelAssignments] = useTable(tables.task_label_assignment)
  const [allTaskParents] = useTable(tables.task_parent)
  const createTask = useReducer(reducers.createTask)
  const claimTask = useReducer(reducers.claimTask)
  const updateTaskStatus = useReducer(reducers.updateTaskStatus)
  const updateTask = useReducer(reducers.updateTask)
  const sendMessage = useReducer(reducers.sendMessage)
  const sendThreadReply = useReducer(reducers.sendThreadReply)
  const watchTask = useReducer(reducers.watchTask)
  const unwatchTask = useReducer(reducers.unwatchTask)
  const escalateTask = useReducer(reducers.escalateTask)
  const createSprint = useReducer(reducers.createSprint)
  const updateSprint = useReducer(reducers.updateSprint)
  const createEpic = useReducer(reducers.createEpic)
  const updateEpic = useReducer(reducers.updateEpic)
  const setTaskExtension = useReducer(reducers.setTaskExtension)
  const createTaskLabel = useReducer(reducers.createTaskLabel)
  const updateTaskLabel = useReducer(reducers.updateTaskLabel)
  const deleteTaskLabel = useReducer(reducers.deleteTaskLabel)
  const assignLabelToTask = useReducer(reducers.assignLabelToTask)
  const removeLabelFromTask = useReducer(reducers.removeLabelFromTask)
  const setTaskParent = useReducer(reducers.setTaskParent)
  const removeTaskParent = useReducer(reducers.removeTaskParent)
  const [allTaskLinks] = useTable(tables.task_link)
  const createTaskLink = useReducer(reducers.createTaskLink)
  const deleteTaskLink = useReducer(reducers.deleteTaskLink)

  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterEpic, setFilterEpic] = useState<string>('all')
  const [filterSprint, setFilterSprint] = useState<string>('all')
  const [filterLabel, setFilterLabel] = useState<string>('all')
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('none')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [showCreateEpic, setShowCreateEpic] = useState(false)
  const [showManageLabels, setShowManageLabels] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#8b5cf6')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<bigint>>(new Set())
  const [boardGroupBy, setBoardGroupBy] = useState<'none' | 'assignee' | 'epic'>('none')

  // List view sort
  const [listSortField, setListSortField] = useState<'title' | 'status' | 'priority' | 'created' | 'sp' | null>(null)
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleListSort = useCallback((field: typeof listSortField) => {
    if (listSortField === field) {
      setListSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setListSortField(field)
      setListSortDir('desc')
    }
  }, [listSortField])

  // Create form state
  const [createStep, setCreateStep] = useState<'template' | 'form'>('template')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('Medium')
  const [newType, setNewType] = useState('FeatureRequest')
  const [newStoryPoints, setNewStoryPoints] = useState<string>('')
  const [newEpicId, setNewEpicId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)

  // Sprint form state
  const [sprintName, setSprintName] = useState('')
  const [sprintGoal, setSprintGoal] = useState('')

  // Epic form state
  const [epicName, setEpicName] = useState('')
  const [epicDesc, setEpicDesc] = useState('')
  const [epicColor, setEpicColor] = useState('#8B5CF6')

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.filter(e => e.id).forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // Maps for quick lookup
  const extensionMap = useMemo(() => {
    const map = new Map<string, any>()
    allTaskExtensions.forEach((ext) => { if (ext.taskId != null) map.set(ext.taskId.toString(), ext) })
    return map
  }, [allTaskExtensions])

  const sprintMap = useMemo(() => {
    const map = new Map<string, any>()
    allSprints.forEach((s) => { if (s.id != null) map.set(s.id.toString(), s) })
    return map
  }, [allSprints])

  const epicMap = useMemo(() => {
    const map = new Map<string, any>()
    allEpics.forEach((e) => { if (e.id != null) map.set(e.id.toString(), e) })
    return map
  }, [allEpics])

  // Label lookup: taskId -> label objects
  const orgLabels = useMemo(() => {
    if (currentOrgId === null) return [...allTaskLabels]
    return allTaskLabels.filter((l) => Number(l.orgId) === currentOrgId)
  }, [allTaskLabels, currentOrgId])

  const labelMap = useMemo(() => {
    const map = new Map<string, any>()
    allTaskLabels.forEach((l) => { if (l.id != null) map.set(l.id.toString(), l) })
    return map
  }, [allTaskLabels])

  const taskLabelsMap = useMemo(() => {
    const map = new Map<string, any[]>()
    allLabelAssignments.forEach((a) => {
      if (a.labelId == null || a.taskId == null) return
      const label = labelMap.get(a.labelId.toString())
      if (!label) return
      const key = a.taskId.toString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(label)
    })
    return map
  }, [allLabelAssignments, labelMap])

  // Subtask lookup: parentTaskId -> child tasks
  const childTasksMap = useMemo(() => {
    const map = new Map<string, bigint[]>()
    allTaskParents.forEach((tp) => {
      if (tp.parentTaskId == null || tp.childTaskId == null) return
      const key = tp.parentTaskId.toString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tp.childTaskId)
    })
    return map
  }, [allTaskParents])

  const parentTaskMap = useMemo(() => {
    const map = new Map<string, bigint>()
    allTaskParents.forEach((tp) => {
      if (tp.childTaskId == null || tp.parentTaskId == null) return
      map.set(tp.childTaskId.toString(), tp.parentTaskId)
    })
    return map
  }, [allTaskParents])

  // Task links lookup: taskId -> array of links involving this task
  const taskLinksMap = useMemo(() => {
    const map = new Map<string, any[]>()
    allTaskLinks.forEach((link) => {
      if (link.sourceTaskId == null || link.targetTaskId == null) return
      const srcKey = link.sourceTaskId.toString()
      const tgtKey = link.targetTaskId.toString()
      if (!map.has(srcKey)) map.set(srcKey, [])
      if (!map.has(tgtKey)) map.set(tgtKey, [])
      map.get(srcKey)!.push(link)
      map.get(tgtKey)!.push(link)
    })
    return map
  }, [allTaskLinks])

  // Quick task lookup by ID for resolving linked task names
  const taskByIdMap = useMemo(() => {
    const map = new Map<string, any>()
    allTasks.forEach((t) => { if (t.id != null) map.set(t.id.toString(), t) })
    return map
  }, [allTasks])

  const orgSprints = useMemo(() => {
    if (currentOrgId === null) return [...allSprints]
    return allSprints.filter((s) => Number(s.orgId) === currentOrgId)
  }, [allSprints, currentOrgId])

  const orgEpics = useMemo(() => {
    if (currentOrgId === null) return [...allEpics]
    return allEpics.filter((e) => Number(e.orgId) === currentOrgId)
  }, [allEpics, currentOrgId])

  const activeSprint = useMemo(() => {
    return orgSprints.find((s) => s.status?.tag === 'Active') || null
  }, [orgSprints])

  const myHex = useMemo(() => identity?.toHexString() ?? '', [identity])

  const filteredTasks = useMemo(() => {
    let tasks = [...allTasks]
    // Scope tasks to current org
    if (currentOrgId !== null) {
      tasks = tasks.filter((t) => Number(t.orgId) === currentOrgId)
    }
    tasks = tasks.filter((t) => t.status?.tag !== 'Cancelled' && t.status?.tag !== 'Blocked')

    // Apply filter presets
    if (filterPreset === 'my-tasks') {
      tasks = tasks.filter((t) => t.assignee && t.assignee.toHexString() === myHex)
    } else if (filterPreset === 'overdue') {
      tasks = tasks.filter((t) => getDueDateStatus(t.dueAt) === 'overdue')
    } else if (filterPreset === 'high-priority') {
      tasks = tasks.filter((t) => t.priority?.tag === 'Urgent' || t.priority?.tag === 'High')
    } else if (filterPreset === 'this-sprint') {
      if (activeSprint) {
        const sprintId = activeSprint.id.toString()
        tasks = tasks.filter((t) => {
          const ext = extensionMap.get(t.id.toString())
          return ext?.sprintId?.toString() === sprintId
        })
      }
    } else if (filterPreset === 'unassigned') {
      tasks = tasks.filter((t) => !t.assignee)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
    }
    if (filterPriority !== 'all') {
      tasks = tasks.filter((t) => t.priority?.tag === filterPriority)
    }
    if (filterType !== 'all') {
      tasks = tasks.filter((t) => t.taskType?.tag === filterType)
    }
    if (filterEpic !== 'all') {
      tasks = tasks.filter((t) => {
        const ext = extensionMap.get(t.id.toString())
        return ext?.epicId?.toString() === filterEpic
      })
    }
    if (filterSprint !== 'all') {
      tasks = tasks.filter((t) => {
        const ext = extensionMap.get(t.id.toString())
        return ext?.sprintId?.toString() === filterSprint
      })
    }
    if (filterLabel !== 'all') {
      tasks = tasks.filter((t) => {
        const labels = taskLabelsMap.get(t.id.toString()) || []
        return labels.some((l: any) => l.id.toString() === filterLabel)
      })
    }
    return tasks
  }, [allTasks, searchQuery, filterPriority, filterType, filterEpic, filterSprint, filterLabel, filterPreset, currentOrgId, extensionMap, taskLabelsMap, myHex, activeSprint])

  const sortedFilteredTasks = useMemo(() => {
    if (!listSortField) return filteredTasks
    const priorityOrder = ['Urgent', 'High', 'Medium', 'Low']
    const statusOrder = ['Blocked', 'Escalated', 'InProgress', 'SelfChecking', 'NeedsReview', 'Claimed', 'Unclaimed', 'Completed', 'Cancelled']
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0
      switch (listSortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'priority': cmp = priorityOrder.indexOf(a.priority?.tag) - priorityOrder.indexOf(b.priority?.tag); break
        case 'status': cmp = statusOrder.indexOf(a.status?.tag) - statusOrder.indexOf(b.status?.tag); break
        case 'created': {
          try { cmp = a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime() } catch { cmp = 0 }
          break
        }
        case 'sp': {
          const spA = extensionMap.get(a.id.toString())?.storyPoints ?? 0
          const spB = extensionMap.get(b.id.toString())?.storyPoints ?? 0
          cmp = spA - spB
          break
        }
      }
      return listSortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredTasks, listSortField, listSortDir, extensionMap])

  // Sprint-scoped tasks for sprint view
  const sprintTasks = useMemo(() => {
    if (!activeSprint) return []
    const sprintId = activeSprint.id.toString()
    return allTasks.filter((t) => {
      if (currentOrgId !== null && Number(t.orgId) !== currentOrgId) return false
      const ext = extensionMap.get(t.id.toString())
      return ext?.sprintId?.toString() === sprintId
    })
  }, [allTasks, activeSprint, extensionMap, currentOrgId])

  // Sprint burndown data
  const sprintStats = useMemo(() => {
    const total = sprintTasks.length
    const completed = sprintTasks.filter((t) => t.status?.tag === 'Completed').length
    const inProgress = sprintTasks.filter((t) => t.status?.tag === 'InProgress' || t.status?.tag === 'SelfChecking').length
    const totalPoints = sprintTasks.reduce((sum, t) => {
      const ext = extensionMap.get(t.id.toString())
      return sum + (ext?.storyPoints ?? 0)
    }, 0)
    const completedPoints = sprintTasks.filter((t) => t.status?.tag === 'Completed').reduce((sum, t) => {
      const ext = extensionMap.get(t.id.toString())
      return sum + (ext?.storyPoints ?? 0)
    }, 0)
    return { total, completed, inProgress, totalPoints, completedPoints }
  }, [sprintTasks, extensionMap])

  // Velocity chart data — story points by status breakdown
  const velocityData = useMemo(() => {
    if (!activeSprint) return []
    const statusGroups: Record<string, { done: number; inProgress: number; todo: number; review: number }> = {}
    // Group by assignee for velocity breakdown
    const assigneeGroups = new Map<string, { name: string; done: number; inProgress: number; todo: number; review: number }>()
    assigneeGroups.set('Unassigned', { name: 'Unassigned', done: 0, inProgress: 0, todo: 0, review: 0 })
    sprintTasks.forEach((t) => {
      const ext = extensionMap.get(t.id.toString())
      const sp = Number(ext?.storyPoints ?? 1)
      const assignee = t.assignee ? employeeMap.get(t.assignee.toHexString()) : null
      const key = assignee?.name || 'Unassigned'
      if (!assigneeGroups.has(key)) assigneeGroups.set(key, { name: key, done: 0, inProgress: 0, todo: 0, review: 0 })
      const g = assigneeGroups.get(key)!
      if (t.status?.tag === 'Completed') g.done += sp
      else if (t.status?.tag === 'InProgress' || t.status?.tag === 'SelfChecking') g.inProgress += sp
      else if (t.status?.tag === 'NeedsReview' || t.status?.tag === 'Escalated') g.review += sp
      else g.todo += sp
    })
    return [...assigneeGroups.values()].filter((g) => g.done + g.inProgress + g.todo + g.review > 0)
  }, [sprintTasks, extensionMap, activeSprint, employeeMap])

  const columnTasks = useMemo(() => {
    const map = new Map<string, any[]>()
    COLUMNS.forEach((col) => {
      map.set(
        col.id,
        filteredTasks
          .filter((t) => col.statusTags.includes(t.status?.tag))
          .sort((a, b) => {
            const pOrder = ['Urgent', 'High', 'Medium', 'Low']
            return pOrder.indexOf(a.priority?.tag) - pOrder.indexOf(b.priority?.tag)
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
      // The task was just created — we'll set extension after it's picked up by the table
      // For now, we rely on the user to assign sprint/epic from the detail panel
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
      setNewStoryPoints('')
      setNewEpicId('')
    } catch (e: any) {
      console.error('Failed to create task:', e)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateSprint = async () => {
    if (!sprintName.trim() || currentOrgId === null) return
    try {
      await createSprint({
        orgId: BigInt(currentOrgId),
        name: sprintName.trim(),
        goal: sprintGoal.trim(),
        startDate: null,
        endDate: null,
      })
      setShowCreateSprint(false)
      setSprintName('')
      setSprintGoal('')
    } catch (e: any) {
      console.error('Failed to create sprint:', e)
    }
  }

  const handleStartSprint = async (sprintId: bigint) => {
    const sprint = allSprints.find((s) => s.id === sprintId)
    if (!sprint) return
    try {
      await updateSprint({
        sprintId,
        name: sprint.name,
        goal: sprint.goal,
        status: { tag: 'Active' } as any,
        startDate: null, // backend will use current time
        endDate: null,
      })
    } catch (e: any) {
      console.error('Failed to start sprint:', e)
    }
  }

  const handleCompleteSprint = async (sprintId: bigint) => {
    const sprint = allSprints.find((s) => s.id === sprintId)
    if (!sprint) return
    try {
      await updateSprint({
        sprintId,
        name: sprint.name,
        goal: sprint.goal,
        status: { tag: 'Completed' } as any,
        startDate: sprint.startDate,
        endDate: null,
      })
    } catch (e: any) {
      console.error('Failed to complete sprint:', e)
    }
  }

  const handleCreateEpic = async () => {
    if (!epicName.trim() || currentOrgId === null) return
    try {
      await createEpic({
        orgId: BigInt(currentOrgId),
        name: epicName.trim(),
        description: epicDesc.trim(),
        color: epicColor,
      })
      setShowCreateEpic(false)
      setEpicName('')
      setEpicDesc('')
      setEpicColor('#8B5CF6')
    } catch (e: any) {
      console.error('Failed to create epic:', e)
    }
  }

  const handleSetTaskExtension = async (taskId: bigint, updates: { sprintId?: bigint | null; epicId?: bigint | null; storyPoints?: number | null }) => {
    const ext = extensionMap.get(taskId.toString())
    try {
      await setTaskExtension({
        taskId,
        sprintId: updates.sprintId !== undefined ? updates.sprintId : (ext?.sprintId ?? null),
        epicId: updates.epicId !== undefined ? updates.epicId : (ext?.epicId ?? null),
        storyPoints: updates.storyPoints !== undefined ? updates.storyPoints : (ext?.storyPoints ?? null),
      })
    } catch (e: any) {
      console.error('Failed to set task extension:', e)
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
    if (!task || task.status?.tag === targetStatus) return

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

  const handleBulkAssign = async (assigneeHex: string) => {
    for (const taskId of selectedTaskIds) {
      try {
        if (assigneeHex === '__unassign') {
          await claimTask({ taskId })
        } else {
          await claimTask({ taskId })
        }
      } catch (e: any) {
        console.error('Failed to assign task:', e)
      }
    }
    setSelectedTaskIds(new Set())
  }

  const handleBulkSetSprint = async (sprintId: string) => {
    for (const taskId of selectedTaskIds) {
      try {
        const ext = extensionMap.get(taskId.toString())
        await setTaskExtension({
          taskId,
          storyPoints: ext?.storyPoints ?? BigInt(0),
          epicId: ext?.epicId ?? BigInt(0),
          sprintId: sprintId === '__none' ? BigInt(0) : BigInt(sprintId),
        })
      } catch (e: any) {
        console.error('Failed to set sprint:', e)
      }
    }
    setSelectedTaskIds(new Set())
  }

  const handleBulkSetEpic = async (epicId: string) => {
    for (const taskId of selectedTaskIds) {
      try {
        const ext = extensionMap.get(taskId.toString())
        await setTaskExtension({
          taskId,
          storyPoints: ext?.storyPoints ?? BigInt(0),
          epicId: epicId === '__none' ? BigInt(0) : BigInt(epicId),
          sprintId: ext?.sprintId ?? BigInt(0),
        })
      } catch (e: any) {
        console.error('Failed to set epic:', e)
      }
    }
    setSelectedTaskIds(new Set())
  }

  // Stats
  const ticketStats = useMemo(() => {
    const orgTasks = currentOrgId !== null
      ? allTasks.filter((t) => Number(t.orgId) === currentOrgId)
      : allTasks
    const active = orgTasks.filter((t) => t.status?.tag !== 'Cancelled' && t.status?.tag !== 'Blocked')
    const inProgress = active.filter((t) => t.status?.tag === 'InProgress' || t.status?.tag === 'SelfChecking')
    const overdue = active.filter((t) => getDueDateStatus(t.dueAt) === 'overdue')
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const completedThisWeek = orgTasks.filter((t) => {
      if (t.status?.tag !== 'Completed') return false
      try { return t.completedAt?.toDate()?.getTime() > weekAgo } catch { return false }
    })
    const urgent = active.filter((t) => t.priority?.tag === 'Urgent')
    return {
      total: active.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completedThisWeek: completedThisWeek.length,
      urgent: urgent.length,
    }
  }, [allTasks, currentOrgId])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <KanbanSquare className="size-4 text-white" />
          </div>
          <GradientText
            className="text-lg font-bold"
            colors={['#8B5CF6', '#A855F7', '#C084FC', '#7C3AED']}
            animationSpeed={6}
          >
            Tickets
          </GradientText>
          <Badge className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
            {filteredTasks.length}
          </Badge>
        </div>
        <BlurText text="Track and manage tasks across your team" delay={35} animateBy="words" className="text-xs text-muted-foreground hidden lg:block" />
        <PagePresenceStrip className="hidden xl:flex" />

        <div className="ml-auto flex items-center gap-2">
          {/* Status filter pills */}
          <div className="hidden lg:flex items-center gap-1 mr-1">
            {(['all', 'Unclaimed', 'InProgress', 'NeedsReview', 'Completed'] as const).map((status) => {
              const isActive = status === 'all'
                ? filterType === 'all' && filterPriority === 'all'
                : false
              const label = status === 'all' ? 'All' : status === 'Unclaimed' ? 'Backlog' : status === 'InProgress' ? 'Active' : status === 'NeedsReview' ? 'Review' : 'Done'
              const count = status === 'all'
                ? filteredTasks.length
                : filteredTasks.filter((t) => t.status?.tag === status).length
              return (
                <button
                  key={status}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                  {count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
                </button>
              )
            })}
          </div>

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

          {orgEpics.length > 0 && (
            <Select value={filterEpic} onValueChange={setFilterEpic}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <Layers className="size-3 mr-1" />
                <SelectValue placeholder="Epic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Epics</SelectItem>
                {orgEpics.map((e) => (
                  <SelectItem key={e.id.toString()} value={e.id.toString()}>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                      {e.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {orgLabels.length > 0 && (
            <Select value={filterLabel} onValueChange={setFilterLabel}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <Tag className="size-3 mr-1" />
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                {orgLabels.map((l) => (
                  <SelectItem key={l.id.toString()} value={l.id.toString()}>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-lg border overflow-hidden">
            <Tooltip>
              <TooltipTrigger
                render={<button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 transition-colors ${viewMode === 'board' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                />}
              >
                <KanbanSquare className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Board</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                />}
              >
                <List className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">List</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<button
                  onClick={() => setViewMode('sprints')}
                  className={`p-1.5 transition-colors ${viewMode === 'sprints' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                />}
              >
                <Target className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Sprints</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1.5 transition-colors ${viewMode === 'timeline' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                />}
              >
                <GanttChart className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Timeline</TooltipContent>
            </Tooltip>
          </div>

          {viewMode === 'board' && (
            <Select value={boardGroupBy} onValueChange={(v) => setBoardGroupBy(v as any)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <Layers className="size-3 mr-1" />
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="assignee">By Assignee</SelectItem>
                <SelectItem value="epic">By Epic</SelectItem>
              </SelectContent>
            </Select>
          )}

          <PresenceBar />

          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0">
              <Plus className="size-3.5" />
              Ticket
            </Button>
            <Tooltip>
              <TooltipTrigger render={<Button size="sm" variant="outline" onClick={() => setShowCreateSprint(true)} className="h-8 w-8 p-0" />}>
                <Target className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">New Sprint</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button size="sm" variant="outline" onClick={() => setShowCreateEpic(true)} className="h-8 w-8 p-0" />}>
                <Layers className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">New Epic</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button size="sm" variant="outline" onClick={() => setShowManageLabels(true)} className="h-8 w-8 p-0" />}>
                <Tag className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Manage Labels</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 rounded-lg border bg-blue-500/5 border-blue-500/10 px-3 py-1.5">
            <KanbanSquare className="size-3.5 text-blue-500" />
            <span className="text-xs font-medium tabular-nums"><CountUp to={ticketStats.total} duration={1} /></span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-amber-500/5 border-amber-500/10 px-3 py-1.5">
            <Loader2 className="size-3.5 text-amber-500" />
            <span className="text-xs font-medium tabular-nums"><CountUp to={ticketStats.inProgress} duration={1} /></span>
            <span className="text-[10px] text-muted-foreground">In Progress</span>
          </div>
          {ticketStats.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-red-500/5 border-red-500/10 px-3 py-1.5">
              <AlertCircle className="size-3.5 text-red-500" />
              <span className="text-xs font-medium tabular-nums text-red-600 dark:text-red-400"><CountUp to={ticketStats.overdue} duration={1} /></span>
              <span className="text-[10px] text-red-500/70">Overdue</span>
            </div>
          )}
          {ticketStats.urgent > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-orange-500/5 border-orange-500/10 px-3 py-1.5">
              <Flag className="size-3.5 text-orange-500" />
              <span className="text-xs font-medium tabular-nums"><CountUp to={ticketStats.urgent} duration={1} /></span>
              <span className="text-[10px] text-muted-foreground">Urgent</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border bg-emerald-500/5 border-emerald-500/10 px-3 py-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="text-xs font-medium tabular-nums"><CountUp to={ticketStats.completedThisWeek} duration={1} /></span>
            <span className="text-[10px] text-muted-foreground">Done this week</span>
          </div>
          {activeSprint && (
            <div className="flex items-center gap-2 rounded-lg border bg-violet-500/5 border-violet-500/10 px-3 py-1.5">
              <Target className="size-3.5 text-violet-500" />
              <span className="text-xs font-medium tabular-nums">{sprintStats.completedPoints}/{sprintStats.totalPoints}</span>
              <span className="text-[10px] text-muted-foreground">SP in sprint</span>
              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden ml-1">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: sprintStats.totalPoints > 0 ? `${(sprintStats.completedPoints / sprintStats.totalPoints) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}
          {orgEpics.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-indigo-500/5 border-indigo-500/10 px-3 py-1.5">
              <Layers className="size-3.5 text-indigo-500" />
              <span className="text-xs font-medium tabular-nums">{orgEpics.filter((e) => e.status?.tag === 'Active').length}</span>
              <span className="text-[10px] text-muted-foreground">Epics</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Filter Presets */}
      <div className="border-b px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium mr-1">
            <Sparkles className="size-3 inline mr-0.5 -mt-0.5" />
            Quick
          </span>
          {([
            { key: 'none' as FilterPreset, label: 'All', icon: KanbanSquare },
            { key: 'my-tasks' as FilterPreset, label: 'My Tasks', icon: User },
            { key: 'high-priority' as FilterPreset, label: 'High Priority', icon: Flame },
            { key: 'overdue' as FilterPreset, label: 'Overdue', icon: AlertCircle },
            { key: 'this-sprint' as FilterPreset, label: 'This Sprint', icon: Target },
            { key: 'unassigned' as FilterPreset, label: 'Unassigned', icon: UserCircle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterPreset(filterPreset === key ? 'none' : key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                filterPreset === key
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
          {filterPreset !== 'none' && (
            <button
              onClick={() => setFilterPreset('none')}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Board / List / Sprint View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' && (() => {
          // Compute swimlane groups
          const swimlaneGroups = (() => {
            if (boardGroupBy === 'none') return [{ key: '__all', label: '', tasks: filteredTasks }]
            if (boardGroupBy === 'assignee') {
              const groups = new Map<string, { label: string; tasks: any[] }>()
              groups.set('__unassigned', { label: 'Unassigned', tasks: [] })
              filteredTasks.forEach((t) => {
                if (!t.assignee) {
                  groups.get('__unassigned')!.tasks.push(t)
                } else {
                  const hex = t.assignee.toHexString()
                  const emp = employeeMap.get(hex)
                  const name = emp?.name || 'Unknown'
                  if (!groups.has(hex)) groups.set(hex, { label: name, tasks: [] })
                  groups.get(hex)!.tasks.push(t)
                }
              })
              return [...groups.entries()].map(([key, v]) => ({ key, label: v.label, tasks: v.tasks }))
                .filter((g) => g.tasks.length > 0)
                .sort((a, b) => a.key === '__unassigned' ? 1 : b.key === '__unassigned' ? -1 : a.label.localeCompare(b.label))
            }
            if (boardGroupBy === 'epic') {
              const groups = new Map<string, { label: string; color: string; tasks: any[] }>()
              groups.set('__none', { label: 'No Epic', color: '#71717a', tasks: [] })
              filteredTasks.forEach((t) => {
                const ext = extensionMap.get(t.id.toString())
                const eid = ext?.epicId?.toString()
                if (!eid) {
                  groups.get('__none')!.tasks.push(t)
                } else {
                  const epic = epicMap.get(eid)
                  if (!groups.has(eid)) groups.set(eid, { label: epic?.name || 'Unknown', color: epic?.color || '#71717a', tasks: [] })
                  groups.get(eid)!.tasks.push(t)
                }
              })
              return [...groups.entries()].map(([key, v]) => ({ key, label: v.label, color: (v as any).color, tasks: v.tasks }))
                .filter((g) => g.tasks.length > 0)
                .sort((a, b) => a.key === '__none' ? 1 : b.key === '__none' ? -1 : a.label.localeCompare(b.label))
            }
            return [{ key: '__all', label: '', tasks: filteredTasks }]
          })()

          const renderBoard = (boardTasks: any[], groupKey: string) => {
            const boardColumnTasks = new Map<string, any[]>()
            COLUMNS.forEach((col) => {
              boardColumnTasks.set(
                col.id,
                boardTasks
                  .filter((t) => col.statusTags.includes(t.status?.tag))
                  .sort((a, b) => {
                    const pOrder = ['Urgent', 'High', 'Medium', 'Low']
                    return pOrder.indexOf(a.priority?.tag) - pOrder.indexOf(b.priority?.tag)
                  })
              )
            })

            return (
            <KanbanBoardProvider key={groupKey}>
            <KanbanBoard className="p-4 h-full">
              {COLUMNS.map((col) => {
                const tasks = boardColumnTasks.get(col.id) || []
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
                        {(() => {
                          const colPoints = tasks.reduce((sum, t) => {
                            const ext = extensionMap.get(t.id.toString())
                            return sum + (ext?.storyPoints ?? 0)
                          }, 0)
                          return colPoints > 0 ? (
                            <span className="text-[10px] text-violet-500/70 font-medium ml-1 tabular-nums">{colPoints} SP</span>
                          ) : null
                        })()}
                      </KanbanBoardColumnTitle>
                    </KanbanBoardColumnHeader>

                    <KanbanBoardColumnList className="px-0">
                      {tasks.map((task) => {
                        const ext = extensionMap.get(task.id.toString())
                        const epic = ext?.epicId ? epicMap.get(ext.epicId.toString()) : null
                        return (
                        <KanbanBoardColumnListItem
                          key={task.id.toString()}
                          cardId={task.id.toString()}
                        >
                          <KanbanBoardCard
                            data={{ id: task.id.toString(), taskId: task.id.toString() }}
                            onClick={() => setSelectedTask(task)}
                            className={`w-full border-l-2 ${
                              task.priority?.tag === 'Urgent' ? 'border-l-red-500' :
                              task.priority?.tag === 'High' ? 'border-l-orange-500' :
                              task.priority?.tag === 'Medium' ? 'border-l-amber-400' :
                              'border-l-blue-400'
                            }`}
                          >
                            {/* Top: ID + Priority + Story Points */}
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">T-{task.id.toString()}</span>
                                {ext?.storyPoints != null && (
                                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-violet-500/10 text-[9px] font-bold text-violet-500 tabular-nums">
                                    {ext.storyPoints}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {task.aiConfidence != null && (
                                  <div className="flex items-center justify-center size-4 rounded bg-violet-500/10">
                                    <Bot className="size-2.5 text-violet-400" />
                                  </div>
                                )}
                                {priorityIcon(task.priority?.tag)}
                              </div>
                            </div>

                            {/* Epic tag */}
                            {epic && (
                              <div className="flex items-center gap-1 w-full">
                                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: epic.color }} />
                                <span className="text-[10px] font-medium truncate" style={{ color: epic.color }}>{epic.name}</span>
                              </div>
                            )}

                            {/* Title */}
                            <KanbanBoardCardTitle className="line-clamp-2 text-left">
                              {task.title}
                            </KanbanBoardCardTitle>

                            {/* Type badge + Due date */}
                            <div className="flex items-center gap-1.5 w-full">
                              <Badge variant="outline" className="text-[10px] h-5 w-fit">
                                {taskTypeLabel(task.taskType?.tag)}
                              </Badge>
                              {task.dueAt && (() => {
                                const status = getDueDateStatus(task.dueAt)
                                if (status === 'overdue' || status === 'soon') {
                                  return (
                                    <Badge className={`text-[9px] h-4 px-1 ${
                                      status === 'overdue'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10'
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10'
                                    }`}>
                                      <CalendarClock className="size-2.5 mr-0.5" />
                                      {status === 'overdue' ? 'Overdue' : 'Due soon'}
                                    </Badge>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            {/* Labels */}
                            {(() => {
                              const labels = taskLabelsMap.get(task.id.toString()) || []
                              return labels.length > 0 ? (
                                <div className="flex flex-wrap gap-1 w-full">
                                  {labels.slice(0, 3).map((label: any) => (
                                    <span
                                      key={label.id.toString()}
                                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                      style={{ backgroundColor: label.color + '20', color: label.color, border: `1px solid ${label.color}30` }}
                                    >
                                      {label.name}
                                    </span>
                                  ))}
                                  {labels.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{labels.length - 3}</span>
                                  )}
                                </div>
                              ) : null
                            })()}

                            {/* Subtask count + Dependency indicator */}
                            {(() => {
                              const children = childTasksMap.get(task.id.toString())
                              const links = taskLinksMap.get(task.id.toString())
                              const hasChildren = children && children.length > 0
                              const hasLinks = links && links.length > 0
                              return (hasChildren || hasLinks) ? (
                                <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground w-full">
                                  {hasChildren && (
                                    <span className="flex items-center gap-1">
                                      <GitBranch className="size-3" />
                                      {children!.length} subtask{children!.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {hasLinks && (
                                    <span className="flex items-center gap-1">
                                      <Link2 className="size-3" />
                                      {links!.length} link{links!.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              ) : null
                            })()}

                            {/* SLA due indicator */}
                            {task.slaDue && (() => {
                              try {
                                const due = task.slaDue.toDate()
                                const now = new Date()
                                const diffMs = due.getTime() - now.getTime()
                                const diffHrs = Math.round(diffMs / 3600000)
                                if (diffMs < 0) {
                                  return (
                                    <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium w-full">
                                      <Flame className="size-3" />
                                      SLA breached
                                    </div>
                                  )
                                }
                                if (diffHrs < 4) {
                                  return (
                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium w-full">
                                      <Clock className="size-3" />
                                      SLA in {diffHrs}h
                                    </div>
                                  )
                                }
                                return null
                              } catch { return null }
                            })()}

                            {/* Bottom: Assignee + Time */}
                            <div className="flex items-center justify-between w-full">
                              <TaskAssignee
                                task={task}
                                employeeMap={employeeMap}
                                onClaim={() => handleClaim(task.id)}
                              />
                              <span className="text-[10px] text-muted-foreground tabular-nums">{formatTimeAgo(task.createdAt)}</span>
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
                        )
                      })}
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
            )
          }

          return boardGroupBy === 'none' ? (
            renderBoard(filteredTasks, '__all')
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {swimlaneGroups.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-t sticky top-0 z-10">
                      {boardGroupBy === 'epic' && (group as any).color && (
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: (group as any).color }} />
                      )}
                      {boardGroupBy === 'assignee' && group.key !== '__unassigned' && (
                        <Avatar className="size-5">
                          <AvatarFallback className={`${nameToColor(group.label)} text-[8px] text-white`}>
                            {getInitials(group.label)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-xs font-semibold">{group.label}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{group.tasks.length}</Badge>
                    </div>
                    {renderBoard(group.tasks, group.key)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )
        })()}
        {viewMode === 'list' && (
          <ScrollArea className="h-full">
            <div className="p-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {sortedFilteredTasks.length} ticket{sortedFilteredTasks.length !== 1 ? 's' : ''}
                </span>
                {sortedFilteredTasks.length > 0 && (
                  <button
                    onClick={() => exportCSV('tickets', [
                      { header: 'ID', accessor: (t: typeof sortedFilteredTasks[0]) => `T-${t.id}` },
                      { header: 'Title', accessor: (t: typeof sortedFilteredTasks[0]) => t.title },
                      { header: 'Status', accessor: (t: typeof sortedFilteredTasks[0]) => t.status?.tag ?? '' },
                      { header: 'Priority', accessor: (t: typeof sortedFilteredTasks[0]) => t.priority?.tag ?? '' },
                      { header: 'Type', accessor: (t: typeof sortedFilteredTasks[0]) => t.taskType?.tag ?? '' },
                      { header: 'Assignee', accessor: (t: typeof sortedFilteredTasks[0]) => t.assignee ? (employeeMap.get(t.assignee.toHexString())?.name ?? 'Unknown') : 'Unassigned' },
                      { header: 'Story Points', accessor: (t: typeof sortedFilteredTasks[0]) => extensionMap.get(t.id.toString())?.storyPoints ?? '' },
                      { header: 'Created', accessor: (t: typeof sortedFilteredTasks[0]) => { try { return t.createdAt.toDate().toLocaleDateString() } catch { return '' } } },
                      { header: 'Due', accessor: (t: typeof sortedFilteredTasks[0]) => { try { return t.dueAt?.toDate()?.toLocaleDateString() ?? '' } catch { return '' } } },
                    ], sortedFilteredTasks)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="size-3.5" />
                    Export
                  </button>
                )}
              </div>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2.5 w-10">
                        <CheckboxUI
                          checked={selectedTaskIds.size === sortedFilteredTasks.length && sortedFilteredTasks.length > 0}
                          onCheckedChange={toggleAllSelection}
                          aria-label="Select all"
                        />
                      </th>
                      {[
                        { key: 'title' as const, label: 'Task', width: '' },
                        { key: 'sp' as const, label: 'SP', width: 'w-12' },
                        { key: null, label: 'Epic', width: 'w-24' },
                        { key: 'status' as const, label: 'Status', width: 'w-24' },
                        { key: 'priority' as const, label: 'Priority', width: 'w-24' },
                        { key: null, label: 'Assignee', width: 'w-28' },
                        { key: 'created' as const, label: 'Created', width: 'w-24' },
                      ].map(({ key, label, width }) => (
                        <th
                          key={label}
                          className={`text-left px-4 py-2.5 font-medium text-muted-foreground ${width} ${key ? 'cursor-pointer hover:text-foreground select-none transition-colors' : ''}`}
                          onClick={key ? () => toggleListSort(key) : undefined}
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            {key && listSortField === key && (
                              listSortDir === 'asc'
                                ? <ChevronUp className="size-3" />
                                : <ChevronDown className="size-3" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredTasks.map((task) => {
                      const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
                      const isSelected = selectedTaskIds.has(task.id)
                      const ext = extensionMap.get(task.id.toString())
                      const epic = ext?.epicId ? epicMap.get(ext.epicId.toString()) : null
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
                            {ext?.storyPoints != null ? (
                              <span className="inline-flex items-center justify-center size-6 rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-500 tabular-nums">
                                {ext.storyPoints}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {epic ? (
                              <div className="flex items-center gap-1">
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: epic.color }} />
                                <span className="text-xs truncate">{epic.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge tag={task.status?.tag} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {priorityIcon(task.priority?.tag)}
                              <span className="text-xs">{task.priority?.tag}</span>
                            </div>
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
                {orgSprints.length > 0 && (
                  <Select onValueChange={handleBulkSetSprint}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <Target className="size-3 mr-1" />
                      <SelectValue placeholder="Set Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No Sprint</SelectItem>
                      {orgSprints.map((s) => (
                        <SelectItem key={s.id.toString()} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {orgEpics.length > 0 && (
                  <Select onValueChange={handleBulkSetEpic}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <Layers className="size-3 mr-1" />
                      <SelectValue placeholder="Set Epic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No Epic</SelectItem>
                      {orgEpics.map((e) => (
                        <SelectItem key={e.id.toString()} value={e.id.toString()}>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                            {e.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())} className="h-8 text-xs">
                  <X className="size-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
        {viewMode === 'sprints' && (
        <ScrollArea className="h-full">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Active Sprint */}
            {activeSprint ? (
              <div className="space-y-6">
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 px-6 py-5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Target className="size-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold">{activeSprint.name}</h2>
                          {activeSprint.goal && (
                            <p className="text-sm text-muted-foreground mt-0.5">{activeSprint.goal}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
                          Active
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleCompleteSprint(activeSprint.id)} className="h-8 gap-1.5 text-xs">
                          <Square className="size-3" />
                          Complete Sprint
                        </Button>
                      </div>
                    </div>

                    {/* Sprint Progress */}
                    <div className="mt-5 grid grid-cols-4 gap-4">
                      <SpotlightCard className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</p>
                        <p className="text-2xl font-bold tabular-nums"><CountUp to={sprintStats.total} duration={1} /></p>
                      </SpotlightCard>
                      <SpotlightCard className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                        <p className="text-2xl font-bold tabular-nums text-emerald-500"><CountUp to={sprintStats.completed} duration={1} /></p>
                      </SpotlightCard>
                      <SpotlightCard className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
                        <p className="text-2xl font-bold tabular-nums text-amber-500"><CountUp to={sprintStats.inProgress} duration={1} /></p>
                      </SpotlightCard>
                      <SpotlightCard className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Story Points</p>
                        <p className="text-2xl font-bold tabular-nums text-violet-500">
                          <CountUp to={sprintStats.completedPoints} duration={1} />
                          <span className="text-sm text-muted-foreground font-normal">/{sprintStats.totalPoints}</span>
                        </p>
                      </SpotlightCard>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Sprint Progress</span>
                        <span className="tabular-nums">{sprintStats.total > 0 ? Math.round((sprintStats.completed / sprintStats.total) * 100) : 0}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700 ease-out"
                          style={{ width: sprintStats.total > 0 ? `${(sprintStats.completed / sprintStats.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>

                    {/* Sprint Velocity Chart */}
                    <div className="mt-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Team Velocity</p>
                      {velocityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={velocityData} barSize={20} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                background: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 8,
                                fontSize: 11,
                                color: 'hsl(var(--foreground))',
                              }}
                            />
                            <Bar dataKey="done" stackId="sp" fill="#10b981" name="Done" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="review" stackId="sp" fill="#8b5cf6" name="Review" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="inProgress" stackId="sp" fill="#f59e0b" name="In Progress" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="todo" stackId="sp" fill="#71717a" name="To Do" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                          No tasks in sprint yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sprint Tasks Table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">SP</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Epic</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Priority</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprintTasks.map((task) => {
                        const ext = extensionMap.get(task.id.toString())
                        const epic = ext?.epicId ? epicMap.get(ext.epicId.toString()) : null
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
                              {ext?.storyPoints != null ? (
                                <span className="inline-flex items-center justify-center size-6 rounded-full bg-violet-500/10 text-xs font-bold text-violet-500 tabular-nums">
                                  {ext.storyPoints}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge tag={task.status?.tag} />
                            </td>
                            <td className="px-4 py-3">
                              {epic ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: epic.color }} />
                                  <span className="text-xs truncate">{epic.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {priorityIcon(task.priority?.tag)}
                                <span className="text-xs">{task.priority?.tag}</span>
                              </div>
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Target className="size-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Active Sprint</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a sprint to start organizing your work into iterations.</p>
                <Button onClick={() => setShowCreateSprint(true)} className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0">
                  <Plus className="size-4" />
                  Create Sprint
                </Button>
              </div>
            )}

            {/* All Sprints History */}
            {orgSprints.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  All Sprints
                </h3>
                <div className="space-y-2">
                  {orgSprints.sort((a, b) => {
                    try { return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime() } catch { return 0 }
                  }).map((sprint) => {
                    const sId = sprint.id.toString()
                    const sTasks = allTasks.filter((t) => {
                      const ext = extensionMap.get(t.id.toString())
                      return ext?.sprintId?.toString() === sId
                    })
                    const sCompleted = sTasks.filter((t) => t.status?.tag === 'Completed').length
                    return (
                      <div key={sId} className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Target className={`size-4 ${sprint.status?.tag === 'Active' ? 'text-emerald-500' : sprint.status?.tag === 'Completed' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="text-sm font-medium">{sprint.name}</p>
                            {sprint.goal && <p className="text-xs text-muted-foreground truncate max-w-md">{sprint.goal}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular-nums">{sCompleted}/{sTasks.length} done</span>
                          <Badge className={`text-[10px] ${
                            sprint.status?.tag === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            sprint.status?.tag === 'Completed' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                            sprint.status?.tag === 'Planning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
                          } hover:bg-inherit`}>
                            {sprint.status?.tag}
                          </Badge>
                          {sprint.status?.tag === 'Planning' && (
                            <Button size="sm" variant="outline" onClick={() => handleStartSprint(sprint.id)} className="h-7 text-xs gap-1">
                              <Play className="size-3" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Epics Overview */}
            {orgEpics.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  Epics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {orgEpics.map((epic) => {
                    const eId = epic.id.toString()
                    const eTasks = allTasks.filter((t) => {
                      if (currentOrgId !== null && Number(t.orgId) !== currentOrgId) return false
                      const ext = extensionMap.get(t.id.toString())
                      return ext?.epicId?.toString() === eId
                    })
                    const eCompleted = eTasks.filter((t) => t.status?.tag === 'Completed').length
                    const ePoints = eTasks.reduce((sum, t) => {
                      const ext = extensionMap.get(t.id.toString())
                      return sum + (ext?.storyPoints ?? 0)
                    }, 0)
                    const eCompletedPoints = eTasks.filter((t) => t.status?.tag === 'Completed').reduce((sum, t) => {
                      const ext = extensionMap.get(t.id.toString())
                      return sum + (ext?.storyPoints ?? 0)
                    }, 0)
                    return (
                      <SpotlightCard key={eId} className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="size-3 rounded-full" style={{ backgroundColor: epic.color }} />
                          <span className="font-medium text-sm">{epic.name}</span>
                          <Badge className={`ml-auto text-[10px] ${
                            epic.status?.tag === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            epic.status?.tag === 'Completed' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                            'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
                          } hover:bg-inherit`}>
                            {epic.status?.tag}
                          </Badge>
                        </div>
                        {epic.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{epic.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground tabular-nums">{eCompleted}/{eTasks.length} tasks</span>
                          <span className="text-violet-500 tabular-nums">{eCompletedPoints}/{ePoints} SP</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: eTasks.length > 0 ? `${(eCompleted / eTasks.length) * 100}%` : '0%',
                              backgroundColor: epic.color,
                            }}
                          />
                        </div>
                      </SpotlightCard>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        )}

        {viewMode === 'timeline' && (() => {
          const DAY_MS = 86400000
          const COL_W = 40 // px per day

          // Determine date range — 4 weeks centered around today
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const rangeStart = new Date(today.getTime() - 7 * DAY_MS)
          const rangeEnd = new Date(today.getTime() + 21 * DAY_MS)
          const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS)

          // Build day columns
          const days: { date: Date; label: string; isToday: boolean; isWeekend: boolean; weekLabel: string | null }[] = []
          for (let i = 0; i < totalDays; i++) {
            const d = new Date(rangeStart.getTime() + i * DAY_MS)
            const isToday = d.toDateString() === today.toDateString()
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const weekLabel = d.getDay() === 1 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
            days.push({ date: d, label: d.getDate().toString(), isToday, isWeekend, weekLabel })
          }

          // Group tasks by assignee
          const grouped = new Map<string, { name: string; tasks: typeof filteredTasks }>()
          const unassigned: typeof filteredTasks = []
          for (const task of filteredTasks) {
            if (task.assignee) {
              const hex = task.assignee.toHexString()
              const emp = employeeMap.get(hex)
              const name = emp?.name ?? `user-${hex.slice(0, 8)}`
              if (!grouped.has(hex)) grouped.set(hex, { name, tasks: [] })
              grouped.get(hex)!.tasks.push(task)
            } else {
              unassigned.push(task)
            }
          }
          if (unassigned.length > 0) grouped.set('__unassigned', { name: 'Unassigned', tasks: unassigned })

          const getTaskStart = (t: any): number => {
            try { return t.createdAt.toDate().getTime() } catch { return today.getTime() }
          }
          const getTaskEnd = (t: any): number => {
            try {
              if (t.dueAt) return t.dueAt.toDate().getTime()
            } catch {}
            return getTaskStart(t) + 3 * DAY_MS // default 3-day bar
          }

          const statusColor = (tag: string) => {
            switch (tag) {
              case 'Completed': return 'bg-emerald-500'
              case 'InProgress': case 'SelfChecking': return 'bg-amber-500'
              case 'NeedsReview': case 'Escalated': return 'bg-violet-500'
              case 'Claimed': return 'bg-blue-500'
              case 'Blocked': return 'bg-red-500'
              default: return 'bg-neutral-400'
            }
          }

          const todayOffset = Math.round((today.getTime() - rangeStart.getTime()) / DAY_MS)

          return (
            <div className="h-full flex flex-col">
              {/* Fixed header */}
              <div className="flex border-b bg-background sticky top-0 z-10">
                <div className="w-44 shrink-0 border-r px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assignee
                </div>
                <div className="flex-1 overflow-x-auto">
                  <div style={{ width: totalDays * COL_W }} className="flex flex-col">
                    {/* Week labels */}
                    <div className="flex h-5">
                      {days.map((d, i) => (
                        d.weekLabel ? (
                          <div key={`wk-${i}`} className="text-[10px] font-semibold text-muted-foreground px-1 whitespace-nowrap" style={{ width: COL_W, position: 'absolute', left: 176 + i * COL_W }}>
                            {d.weekLabel}
                          </div>
                        ) : null
                      ))}
                    </div>
                    {/* Day labels */}
                    <div className="flex">
                      {days.map((d, i) => (
                        <div
                          key={i}
                          className={`text-center text-[10px] tabular-nums border-r py-1 ${
                            d.isToday ? 'bg-violet-500/10 font-bold text-violet-600 dark:text-violet-400' :
                            d.isWeekend ? 'bg-muted/30 text-muted-foreground/50' : 'text-muted-foreground'
                          }`}
                          style={{ width: COL_W }}
                        >
                          {d.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <ScrollArea className="flex-1">
                <div className="flex">
                  {/* Assignee column */}
                  <div className="w-44 shrink-0 border-r">
                    {[...grouped.entries()].map(([key, { name }]) => (
                      <div key={key} className="h-12 flex items-center gap-2 px-3 border-b">
                        <Avatar className="size-6">
                          <AvatarFallback className={`text-[9px] text-white ${nameToColor(name)}`}>
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">{name}</span>
                      </div>
                    ))}
                    {grouped.size === 0 && (
                      <div className="py-16 text-center text-muted-foreground text-xs">No tasks</div>
                    )}
                  </div>

                  {/* Timeline grid */}
                  <div className="flex-1 overflow-x-auto">
                    <div style={{ width: totalDays * COL_W }} className="relative">
                      {/* Today indicator line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-violet-500/60 z-10"
                        style={{ left: todayOffset * COL_W + COL_W / 2 }}
                      />

                      {[...grouped.entries()].map(([key, { tasks: rowTasks }]) => (
                        <div key={key} className="h-12 border-b relative flex items-center">
                          {/* Background stripes */}
                          {days.map((d, i) => (
                            <div
                              key={i}
                              className={`absolute top-0 bottom-0 border-r ${
                                d.isToday ? 'bg-violet-500/5' :
                                d.isWeekend ? 'bg-muted/20' : ''
                              }`}
                              style={{ left: i * COL_W, width: COL_W }}
                            />
                          ))}

                          {/* Task bars */}
                          {rowTasks.map((task) => {
                            const start = getTaskStart(task)
                            const end = getTaskEnd(task)
                            const startDay = (start - rangeStart.getTime()) / DAY_MS
                            const endDay = (end - rangeStart.getTime()) / DAY_MS
                            const left = Math.max(0, startDay) * COL_W
                            const right = Math.min(totalDays, endDay) * COL_W
                            const width = Math.max(COL_W * 0.5, right - left)

                            if (endDay < 0 || startDay > totalDays) return null

                            return (
                              <Tooltip key={task.id.toString()}>
                                <TooltipTrigger>
                                  <div
                                    onClick={() => setSelectedTask(task)}
                                    className={`absolute h-7 rounded-md ${statusColor(task.status?.tag)} cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2 shadow-sm z-[5]`}
                                    style={{ left, width, top: '50%', transform: 'translateY(-50%)' }}
                                  >
                                    <span className="text-[10px] font-medium text-white truncate">
                                      {task.title}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[240px]">
                                  <p className="font-medium truncate">{task.title}</p>
                                  <p className="text-muted-foreground">{task.status?.tag} &middot; {task.priority?.tag}</p>
                                  {task.dueAt && <p className="text-muted-foreground">Due: {formatDate(task.dueAt)}</p>}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )
        })()}
      </div>

      {/* Task Detail Slide-over */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          employeeMap={employeeMap}
          onClose={() => setSelectedTask(null)}
          onClaim={() => handleClaim(selectedTask.id)}
          onUpdateTask={handleUpdateTask}
          extensionMap={extensionMap}
          sprintMap={sprintMap}
          epicMap={epicMap}
          orgSprints={orgSprints}
          orgEpics={orgEpics}
          onSetTaskExtension={handleSetTaskExtension}
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
          taskLabelsForDetail={taskLabelsMap.get(selectedTask.id.toString()) || []}
          availableLabelsForDetail={orgLabels.filter((l) => {
            const assigned = taskLabelsMap.get(selectedTask.id.toString()) || []
            return !assigned.some((a: any) => a.id.toString() === l.id.toString())
          })}
          subtasksForDetail={(() => {
            const childIds = childTasksMap.get(selectedTask.id.toString()) || []
            return childIds.map((cid) => allTasks.find((t) => t.id === cid)).filter(Boolean)
          })()}
          onAssignLabelToTask={async (taskId, labelId) => {
            await assignLabelToTask({ taskId, labelId })
          }}
          onRemoveLabelFromTask={async (taskId, labelId) => {
            await removeLabelFromTask({ taskId, labelId })
          }}
          taskLinksForDetail={taskLinksMap.get(selectedTask.id.toString()) || []}
          taskByIdMap={taskByIdMap}
          onCreateTaskLink={async (sourceTaskId, targetTaskId, linkTypeTag) => {
            await createTaskLink({ sourceTaskId, targetTaskId, linkTypeTag })
          }}
          onDeleteTaskLink={async (linkId) => {
            await deleteTaskLink({ linkId })
          }}
          filteredTasks={filteredTasks}
          onCreateSubtask={async (parentTaskId, title) => {
            if (currentOrgId === null) return
            await createTask({
              title,
              description: '',
              taskType: { tag: 'Bug' } as any,
              priority: { tag: 'Medium' } as any,
              contextType: { tag: 'Internal' } as any,
              contextId: 0n,
              orgId: BigInt(currentOrgId),
            })
            // Find the newly created task (most recent one with that title)
            const newTask = [...allTasks]
              .filter((t) => t.title === title)
              .sort((a, b) => Number(b.id) - Number(a.id))[0]
            if (newTask) {
              await setTaskParent({ childTaskId: newTask.id, parentTaskId })
            }
          }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setCreateStep('template') }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{createStep === 'template' ? 'Choose a Template' : 'Create Ticket'}</DialogTitle>
          </DialogHeader>

          {createStep === 'template' ? (
            <div className="py-2 space-y-3">
              <p className="text-xs text-muted-foreground">Start from a template or create from scratch.</p>
              <div className="grid grid-cols-2 gap-2">
                {TICKET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setNewTitle(tpl.title)
                      setNewDesc(tpl.description)
                      setNewPriority(tpl.priority)
                      setNewType(tpl.type)
                      setNewStoryPoints(tpl.storyPoints)
                      setCreateStep('form')
                    }}
                    className={`text-left rounded-lg border p-3 transition-all hover:shadow-md ${tpl.color}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tpl.icon}</span>
                      <span className="text-sm font-semibold">{tpl.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {tpl.description.split('\n')[0].replace(/^#+\s*/, '')}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCreateStep('form')}
                className="w-full rounded-lg border border-dashed border-muted-foreground/20 p-3 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
              >
                Blank ticket — start from scratch
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-sm">Title *</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Brief description of the task"
                    className="mt-1"
                    autoFocus
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
                <Button variant="ghost" size="sm" onClick={() => { setCreateStep('template'); setNewTitle(''); setNewDesc(''); setNewPriority('Medium'); setNewType('FeatureRequest'); setNewStoryPoints('') }}>
                  <ArrowLeft className="size-3.5 mr-1" />
                  Templates
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
                  {isCreating ? <><Loader2 className="size-4 mr-1 animate-spin" /> Creating...</> : 'Create Ticket'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Sprint Dialog */}
      <Dialog open={showCreateSprint} onOpenChange={setShowCreateSprint}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-violet-500" />
              Create Sprint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Sprint Name *</Label>
              <Input
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="e.g. Sprint 1 — Foundation"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Sprint Goal</Label>
              <Textarea
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="What does success look like for this sprint?"
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSprint(false)}>Cancel</Button>
            <Button onClick={handleCreateSprint} disabled={!sprintName.trim()} className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0">
              <Target className="size-3.5" />
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Epic Dialog */}
      <Dialog open={showCreateEpic} onOpenChange={setShowCreateEpic}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-indigo-500" />
              Create Epic
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Epic Name *</Label>
              <Input
                value={epicName}
                onChange={(e) => setEpicName(e.target.value)}
                placeholder="e.g. User Authentication, Payment Flow"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                value={epicDesc}
                onChange={(e) => setEpicDesc(e.target.value)}
                placeholder="High-level description of this body of work"
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Color</Label>
              <div className="flex items-center gap-2">
                {EPIC_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setEpicColor(c.value)}
                    className={`size-7 rounded-full transition-all ${c.class} ${
                      epicColor === c.value ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ ringColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateEpic(false)}>Cancel</Button>
            <Button onClick={handleCreateEpic} disabled={!epicName.trim()} className="gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0">
              <Layers className="size-3.5" />
              Create Epic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Labels Dialog */}
      <Dialog open={showManageLabels} onOpenChange={setShowManageLabels}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-amber-500" />
              Manage Labels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Create new label */}
            <div className="flex gap-2">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="flex-1 h-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLabelName.trim() && currentOrgId !== null) {
                    createTaskLabel({ orgId: BigInt(currentOrgId), name: newLabelName.trim(), color: newLabelColor })
                    setNewLabelName('')
                  }
                }}
              />
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="h-9 w-9 rounded-md border cursor-pointer"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={!newLabelName.trim()}
                onClick={() => {
                  if (currentOrgId === null) return
                  createTaskLabel({ orgId: BigInt(currentOrgId), name: newLabelName.trim(), color: newLabelColor })
                  setNewLabelName('')
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {/* Existing labels */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {orgLabels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No labels yet. Create one above.</p>
              ) : (
                orgLabels.map((label) => (
                  <div key={label.id.toString()} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-sm font-medium truncate">{label.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTaskLabel({ labelId: label.id })}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageLabels(false)}>Done</Button>
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
  extensionMap,
  sprintMap,
  epicMap,
  orgSprints,
  orgEpics,
  onSetTaskExtension,
  myIdentity,
  allMessages,
  allWatchers,
  allActivityLogs,
  sendMessage,
  sendThreadReply,
  watchTask,
  unwatchTask,
  taskLabelsForDetail,
  availableLabelsForDetail,
  subtasksForDetail,
  onAssignLabelToTask,
  onRemoveLabelFromTask,
  onCreateSubtask,
  taskLinksForDetail,
  taskByIdMap,
  onCreateTaskLink,
  onDeleteTaskLink,
  filteredTasks,
}: {
  task: any
  employeeMap: Map<string, any>
  onClose: () => void
  onClaim: () => void
  onUpdateTask: (taskId: bigint, title: string, description: string, priority: string) => Promise<void>
  onUpdateStatus: (taskId: bigint, status: string) => Promise<any>
  extensionMap: Map<string, any>
  sprintMap: Map<string, any>
  epicMap: Map<string, any>
  orgSprints: any[]
  orgEpics: any[]
  onSetTaskExtension: (taskId: bigint, updates: { sprintId?: bigint | null; epicId?: bigint | null; storyPoints?: number | null }) => Promise<void>
  myIdentity: any
  allMessages: readonly any[]
  allWatchers: readonly any[]
  allActivityLogs: readonly any[]
  sendMessage: (args: any) => Promise<any>
  sendThreadReply: (args: any) => Promise<any>
  watchTask: (args: any) => Promise<any>
  unwatchTask: (args: any) => Promise<any>
  taskLabelsForDetail: any[]
  availableLabelsForDetail: any[]
  subtasksForDetail: any[]
  onAssignLabelToTask: (taskId: bigint, labelId: bigint) => Promise<any>
  onRemoveLabelFromTask: (taskId: bigint, labelId: bigint) => Promise<any>
  onCreateSubtask: (parentTaskId: bigint, title: string) => Promise<any>
  taskLinksForDetail: any[]
  taskByIdMap: Map<string, any>
  onCreateTaskLink: (sourceTaskId: bigint, targetTaskId: bigint, linkTypeTag: string) => Promise<any>
  onDeleteTaskLink: (linkId: bigint) => Promise<any>
  filteredTasks: any[]
}) {
  const assignee = task.assignee ? employeeMap.get(task.assignee.toHexString()) : null
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description)
  const [editPriority, setEditPriority] = useState(task.priority?.tag)
  const [isSaving, setIsSaving] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<bigint>>(new Set())
  const [replyingTo, setReplyingTo] = useState<bigint | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments')
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkSearchQuery, setLinkSearchQuery] = useState('')
  const [newLinkType, setNewLinkType] = useState('Blocks')

  // Grouped task links for this task
  const groupedLinks = useMemo(() => {
    const groups: Record<string, { link: any; linkedTask: any; label: string }[]> = {
      blocks: [],
      blockedBy: [],
      relatesTo: [],
      duplicates: [],
      duplicatedBy: [],
    }
    const taskIdStr = task.id.toString()
    ;(taskLinksForDetail || []).forEach((link: any) => {
      const isSource = link.sourceTaskId?.toString() === taskIdStr
      const linkedTaskId = isSource ? link.targetTaskId : link.sourceTaskId
      const linkedTask = taskByIdMap.get(linkedTaskId?.toString())
      const typeTag = link.linkType?.tag
      if (typeTag === 'Blocks' && isSource) groups.blocks.push({ link, linkedTask, label: 'blocks' })
      else if (typeTag === 'Blocks' && !isSource) groups.blockedBy.push({ link, linkedTask, label: 'blocked by' })
      else if (typeTag === 'BlockedBy' && isSource) groups.blockedBy.push({ link, linkedTask, label: 'blocked by' })
      else if (typeTag === 'BlockedBy' && !isSource) groups.blocks.push({ link, linkedTask, label: 'blocks' })
      else if (typeTag === 'Duplicates' && isSource) groups.duplicates.push({ link, linkedTask, label: 'duplicates' })
      else if (typeTag === 'DuplicatedBy' && isSource) groups.duplicatedBy.push({ link, linkedTask, label: 'duplicated by' })
      else if (typeTag === 'Duplicates' && !isSource) groups.duplicatedBy.push({ link, linkedTask, label: 'duplicated by' })
      else if (typeTag === 'DuplicatedBy' && !isSource) groups.duplicates.push({ link, linkedTask, label: 'duplicates' })
      else if (typeTag === 'RelatesTo') groups.relatesTo.push({ link, linkedTask, label: 'relates to' })
    })
    return groups
  }, [taskLinksForDetail, task.id, taskByIdMap])

  const totalLinks = Object.values(groupedLinks).reduce((sum, arr) => sum + arr.length, 0)

  // Tasks available for linking (exclude self and already-linked)
  const linkableSearchResults = useMemo(() => {
    if (!linkSearchQuery.trim()) return []
    const q = linkSearchQuery.toLowerCase()
    const linkedIds = new Set((taskLinksForDetail || []).flatMap((l: any) => [l.sourceTaskId?.toString(), l.targetTaskId?.toString()]))
    return filteredTasks
      .filter((t) => t.id.toString() !== task.id.toString() && !linkedIds.has(t.id.toString()))
      .filter((t) => t.title.toLowerCase().includes(q) || `T-${t.id}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [filteredTasks, linkSearchQuery, task.id, taskLinksForDetail])

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
    setEditPriority(task.priority?.tag)
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
              <StatusBadge tag={task.status?.tag} />
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
                value={task.status?.tag}
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
                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${priorityBadgeClass(task.priority?.tag)}`}>
                    {priorityIcon(task.priority?.tag)}
                    {task.priority?.tag}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <Badge variant="outline" className="text-xs">{taskTypeLabel(task.taskType?.tag)}</Badge>
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

            {/* Sprint / Epic / Story Points */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-violet-400" />
                Project Management
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Sprint */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sprint</p>
                  <Select
                    value={(() => {
                      const ext = extensionMap.get(task.id.toString())
                      return ext?.sprintId?.toString() || 'none'
                    })()}
                    onValueChange={(val) => {
                      onSetTaskExtension(task.id, {
                        sprintId: val === 'none' ? null : BigInt(val),
                      })
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="No sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sprint</SelectItem>
                      {orgSprints.filter((s) => s.status?.tag !== 'Cancelled' && s.status?.tag !== 'Completed').map((s) => (
                        <SelectItem key={s.id.toString()} value={s.id.toString()}>
                          <span className="flex items-center gap-1.5">
                            <Target className="size-3" />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Epic */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Epic</p>
                  <Select
                    value={(() => {
                      const ext = extensionMap.get(task.id.toString())
                      return ext?.epicId?.toString() || 'none'
                    })()}
                    onValueChange={(val) => {
                      onSetTaskExtension(task.id, {
                        epicId: val === 'none' ? null : BigInt(val),
                      })
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="No epic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Epic</SelectItem>
                      {orgEpics.filter((e) => e.status?.tag === 'Active' || e.status?.tag === 'Draft').map((e) => (
                        <SelectItem key={e.id.toString()} value={e.id.toString()}>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                            {e.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Story Points */}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Story Points</p>
                  <div className="flex items-center gap-1.5">
                    {STORY_POINT_OPTIONS.map((sp) => {
                      const ext = extensionMap.get(task.id.toString())
                      const isActive = ext?.storyPoints === sp
                      return (
                        <button
                          key={sp}
                          onClick={() => {
                            onSetTaskExtension(task.id, {
                              storyPoints: isActive ? null : sp,
                            })
                          }}
                          className={`size-8 rounded-lg text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-violet-500 text-white ring-2 ring-violet-500/30 scale-110'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {sp}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Labels */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="size-3.5 text-amber-400" />
                Labels
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(taskLabelsForDetail || []).map((label: any) => (
                  <span
                    key={label.id.toString()}
                    className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
                    style={{ backgroundColor: label.color + '20', color: label.color, border: `1px solid ${label.color}30` }}
                  >
                    {label.name}
                    <button
                      onClick={() => onRemoveLabelFromTask(task.id, label.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 -mr-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {/* Add label dropdown */}
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val) onAssignLabelToTask(task.id, BigInt(val))
                  }}
                >
                  <SelectTrigger className="h-7 w-auto min-w-[100px] text-[11px] border-dashed">
                    <Plus className="size-3 mr-1" />
                    <SelectValue placeholder="Add label" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableLabelsForDetail || []).map((label: any) => (
                      <SelectItem key={label.id.toString()} value={label.id.toString()}>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </span>
                      </SelectItem>
                    ))}
                    {(availableLabelsForDetail || []).length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No labels available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subtasks */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <GitBranch className="size-3.5 text-blue-400" />
                Subtasks
                {(subtasksForDetail || []).length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {(subtasksForDetail || []).filter((s: any) => s.status?.tag === 'Completed').length}/{(subtasksForDetail || []).length}
                  </Badge>
                )}
              </h3>
              {(subtasksForDetail || []).length > 0 && (
                <div className="space-y-1.5">
                  {(subtasksForDetail || []).map((subtask: any) => {
                    const isDone = subtask.status?.tag === 'Completed'
                    return (
                      <div
                        key={subtask.id.toString()}
                        className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 group"
                      >
                        <button
                          onClick={() => {
                            if (isDone) {
                              onUpdateStatus(subtask.id, 'Claimed')
                            } else {
                              onUpdateStatus(subtask.id, 'Completed')
                            }
                          }}
                          className={`size-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                            isDone
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-muted-foreground/30 hover:border-green-500'
                          }`}
                        >
                          {isDone && <Check className="size-3" />}
                        </button>
                        <span className={`text-xs flex-1 truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase">
                          {subtask.status?.tag}
                        </span>
                      </div>
                    )
                  })}
                  {/* Subtask progress bar */}
                  {(subtasksForDetail || []).length > 0 && (() => {
                    const total = (subtasksForDetail || []).length
                    const done = (subtasksForDetail || []).filter((s: any) => s.status?.tag === 'Completed').length
                    const pct = total > 0 ? (done / total) * 100 : 0
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
                      </div>
                    )
                  })()}
                </div>
              )}
              {/* Add subtask input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a subtask..."
                  className="flex-1 h-8 rounded-md border bg-transparent px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      const title = (e.target as HTMLInputElement).value.trim()
                      ;(e.target as HTMLInputElement).value = ''
                      await onCreateSubtask(task.id, title)
                    }
                  }}
                />
              </div>
            </div>

            {/* Dependencies / Links */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="size-3.5 text-cyan-400" />
                  Dependencies
                  {totalLinks > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{totalLinks}</Badge>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAddLink(!showAddLink)}
                >
                  {showAddLink ? <X className="size-3" /> : <Plus className="size-3" />}
                  {showAddLink ? 'Cancel' : 'Add link'}
                </Button>
              </div>

              {/* Add link form */}
              {showAddLink && (
                <div className="rounded-lg border border-dashed p-3 space-y-2.5 bg-muted/30">
                  <div className="flex gap-2">
                    <Select value={newLinkType} onValueChange={setNewLinkType}>
                      <SelectTrigger className="h-7 w-[130px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blocks">Blocks</SelectItem>
                        <SelectItem value="BlockedBy">Blocked by</SelectItem>
                        <SelectItem value="RelatesTo">Relates to</SelectItem>
                        <SelectItem value="Duplicates">Duplicates</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={linkSearchQuery}
                      onChange={(e) => setLinkSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                  {linkableSearchResults.length > 0 && (
                    <div className="max-h-[160px] overflow-y-auto space-y-1 rounded-md border bg-background p-1">
                      {linkableSearchResults.map((t: any) => (
                        <button
                          key={t.id.toString()}
                          onClick={async () => {
                            await onCreateTaskLink(task.id, t.id, newLinkType)
                            setLinkSearchQuery('')
                            setShowAddLink(false)
                          }}
                          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                        >
                          <span className="text-muted-foreground font-mono shrink-0">T-{t.id.toString()}</span>
                          <span className="truncate">{t.title}</span>
                          <StatusBadge tag={t.status?.tag} />
                        </button>
                      ))}
                    </div>
                  )}
                  {linkSearchQuery.trim() && linkableSearchResults.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-1">No matching tasks found</p>
                  )}
                </div>
              )}

              {/* Existing links grouped by type */}
              {totalLinks > 0 ? (
                <div className="space-y-2">
                  {groupedLinks.blocks.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Blocks</p>
                      {groupedLinks.blocks.map(({ link, linkedTask }) => (
                        <div key={link.id.toString()} className="group flex items-center gap-2 rounded-md bg-red-500/5 border border-red-500/10 px-2.5 py-1.5">
                          <AlertCircle className="size-3 text-red-400 shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">T-{linkedTask?.id?.toString() ?? '?'}</span>
                          <span className="text-xs truncate flex-1">{linkedTask?.title ?? 'Unknown task'}</span>
                          <button onClick={() => onDeleteTaskLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {groupedLinks.blockedBy.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Blocked by</p>
                      {groupedLinks.blockedBy.map(({ link, linkedTask }) => (
                        <div key={link.id.toString()} className="group flex items-center gap-2 rounded-md bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5">
                          <Flag className="size-3 text-amber-400 shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">T-{linkedTask?.id?.toString() ?? '?'}</span>
                          <span className="text-xs truncate flex-1">{linkedTask?.title ?? 'Unknown task'}</span>
                          <button onClick={() => onDeleteTaskLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {groupedLinks.relatesTo.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Related</p>
                      {groupedLinks.relatesTo.map(({ link, linkedTask }) => (
                        <div key={link.id.toString()} className="group flex items-center gap-2 rounded-md bg-blue-500/5 border border-blue-500/10 px-2.5 py-1.5">
                          <Link2 className="size-3 text-blue-400 shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">T-{linkedTask?.id?.toString() ?? '?'}</span>
                          <span className="text-xs truncate flex-1">{linkedTask?.title ?? 'Unknown task'}</span>
                          <button onClick={() => onDeleteTaskLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {groupedLinks.duplicates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Duplicates</p>
                      {groupedLinks.duplicates.map(({ link, linkedTask }) => (
                        <div key={link.id.toString()} className="group flex items-center gap-2 rounded-md bg-violet-500/5 border border-violet-500/10 px-2.5 py-1.5">
                          <Hash className="size-3 text-violet-400 shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">T-{linkedTask?.id?.toString() ?? '?'}</span>
                          <span className="text-xs truncate flex-1">{linkedTask?.title ?? 'Unknown task'}</span>
                          <button onClick={() => onDeleteTaskLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {groupedLinks.duplicatedBy.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Duplicated by</p>
                      {groupedLinks.duplicatedBy.map(({ link, linkedTask }) => (
                        <div key={link.id.toString()} className="group flex items-center gap-2 rounded-md bg-violet-500/5 border border-violet-500/10 px-2.5 py-1.5">
                          <Hash className="size-3 text-violet-400 shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">T-{linkedTask?.id?.toString() ?? '?'}</span>
                          <span className="text-xs truncate flex-1">{linkedTask?.title ?? 'Unknown task'}</span>
                          <button onClick={() => onDeleteTaskLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : !showAddLink && (
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <Link2 className="size-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">No dependencies yet</p>
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
                            <span className="font-medium">{task.status?.tag.replace(/([A-Z])/g, ' $1').trim()}</span>
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
