'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useOrg } from '@/components/org-context'
import dynamic from 'next/dynamic'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import type { Document as SpacetimeDocument } from '@/generated/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Label } from '@/components/ui/label'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/components/ui/context-menu'
import { PresenceAvatars } from '@/components/presence-avatars'
import { useResourcePresence } from '@/hooks/use-resource-presence'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import { useTheme } from 'next-themes'
import {
  Search,
  Plus,
  PenTool,
  FileText,
  Pencil,
  Trash2,
  ArrowLeft,
  Clock,
  Sparkles,
  Grid3X3,
  LayoutList,
  FolderPlus,
  Folder,
  FolderOpen,
  MoveRight,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Share2,
  Lock,
  Globe,
  Copy,
  Users,
  Star,
  StarOff,
  BookOpen,
  Target,
  ListChecks,
  Lightbulb,
  Shield,
  Zap,
  MessageSquare,
  FlaskConical,
  BarChart3,
  Clipboard,
  SortAsc,
  SortDesc,
  Filter,
  Hash,
  type LucideIcon,
} from 'lucide-react'

// Dynamic imports for heavy editors
const BlockEditor = dynamic(() => import('@/components/block-editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

const ExcalidrawEditor = dynamic(() => import('@/components/excalidraw-editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

function EditorSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse mx-auto mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading editor...</p>
      </div>
    </div>
  )
}

// ---- Types ------------------------------------------------------------------

type ViewMode = 'grid' | 'list'
type SaveStatus = 'idle' | 'saving' | 'saved'
type SortMode = 'updated' | 'created' | 'name'
type DocFilter = 'all' | 'Canvas' | 'Whiteboard' | 'Folder'

// ---- Templates --------------------------------------------------------------

const TEMPLATES: { name: string; description: string; icon: LucideIcon; color: string; content: any }[] = [
  {
    name: 'Blank',
    description: 'Start from scratch',
    icon: FileText,
    color: 'text-muted-foreground',
    content: null,
  },
  {
    name: 'Meeting Notes',
    description: 'Structured meeting template',
    icon: MessageSquare,
    color: 'text-blue-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Meeting Notes' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Date' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Attendees' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Agenda' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Discussion' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
    ],
  },
  {
    name: 'Technical Spec',
    description: 'System design document',
    icon: Sparkles,
    color: 'text-violet-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Technical Specification' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Overview' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Describe the feature or system at a high level.' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Goals' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Non-Goals' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Architecture' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'API Design' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Data Model' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Open Questions' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Project Brief',
    description: 'Project overview and plan',
    icon: Target,
    color: 'text-emerald-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Project Brief' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Summary' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Brief description of the project.' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Problem Statement' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Proposed Solution' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Success Metrics' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Timeline' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'Phase 1: ' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'Phase 2: ' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Team' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Sprint Retro',
    description: 'What went well, what didn\'t',
    icon: ListChecks,
    color: 'text-amber-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Sprint Retrospective' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Sprint' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Sprint N — [dates]' }] },
      { type: 'heading', content: [{ type: 'text', text: 'What Went Well' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'What Could Be Improved' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Shoutouts' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Decision Record',
    description: 'Document key decisions (ADR)',
    icon: Lightbulb,
    color: 'text-yellow-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Decision Record' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Status' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Proposed | Accepted | Deprecated | Superseded' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Context' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'What is the issue that we\'re seeing that is motivating this decision?' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Decision' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'What is the change we\'re proposing and/or doing?' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Alternatives Considered' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Consequences' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Incident Report',
    description: 'Post-mortem template',
    icon: Shield,
    color: 'text-red-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Incident Report' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Summary' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Impact' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Duration: | Severity: | Users affected:' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Timeline' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'HH:MM — Event' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Root Cause' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Resolution' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Lessons Learned' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Product PRD',
    description: 'Product requirements doc',
    icon: BarChart3,
    color: 'text-indigo-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Product Requirements Document' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Problem' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'What problem are we solving? Who has it?' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Goals' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'User Stories' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'As a [user], I want to [action] so that [outcome]' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Requirements' }], props: { level: 2 } },
      { type: 'heading', content: [{ type: 'text', text: 'Must Have' }], props: { level: 3 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Nice to Have' }], props: { level: 3 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Success Metrics' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Launch Plan' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: '1:1 Notes',
    description: 'Regular check-in template',
    icon: Users,
    color: 'text-pink-400',
    content: [
      { type: 'heading', content: [{ type: 'text', text: '1:1 Meeting' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Updates' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Discussion Topics' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Blockers' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Notes' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
    ],
  },
]

// ---- Helpers ----------------------------------------------------------------

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function timestampToDate(ts: any): Date {
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts / 1000)
  return new Date()
}

function parseContent(content: string): any {
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function parentIdMatches(docParentId: bigint | null | undefined, folderId: bigint | null): boolean {
  if (folderId === null) {
    return docParentId === null || docParentId === undefined
  }
  return docParentId === folderId
}

function getContentPreview(content: string): string {
  if (!content) return ''
  try {
    const blocks = JSON.parse(content)
    if (!Array.isArray(blocks)) return ''
    const texts: string[] = []
    for (const block of blocks) {
      if (block.content && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.text) texts.push(item.text)
        }
      }
      if (texts.join(' ').length > 120) break
    }
    return texts.join(' ').slice(0, 120)
  } catch {
    return content.slice(0, 120)
  }
}

function getWordCount(content: string): number {
  if (!content) return 0
  try {
    const blocks = JSON.parse(content)
    if (!Array.isArray(blocks)) return 0
    let words = 0
    for (const block of blocks) {
      if (block.content && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.text) words += item.text.split(/\s+/).filter(Boolean).length
        }
      }
    }
    return words
  } catch {
    return content.split(/\s+/).filter(Boolean).length
  }
}

function getReadingTime(wordCount: number): string {
  const mins = Math.max(1, Math.ceil(wordCount / 200))
  return `${mins} min read`
}

const docTypeGradient = {
  Canvas: 'from-blue-500 to-indigo-600',
  Whiteboard: 'from-emerald-500 to-teal-600',
  Folder: 'from-amber-500 to-orange-600',
}

const docTypeColors = {
  Canvas: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', accent: 'bg-blue-500' },
  Whiteboard: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', accent: 'bg-emerald-500' },
  Folder: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', accent: 'bg-amber-500' },
}

// ---- Main Page --------------------------------------------------------------

export default function CanvasPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const { resolvedTheme } = useTheme()
  const [allDocuments] = useTable(tables.document)
  const [employees] = useTable(tables.employee)

  const createDocument = useReducer(reducers.createDocument)
  const updateDocument = useReducer(reducers.updateDocument)
  const deleteDocument = useReducer(reducers.deleteDocument)
  const shareDocument = useReducer(reducers.shareDocument)
  const unshareDocument = useReducer(reducers.unshareDocument)
  const setDocVisibility = useReducer(reducers.setDocumentVisibility)

  const [activeDocId, setActiveDocId] = useState<bigint | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<bigint | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'Canvas' | 'Whiteboard'>('Canvas')
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [folderTitle, setFolderTitle] = useState('')
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveDocId, setMoveDocId] = useState<bigint | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareDocId, setShareDocId] = useState<bigint | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [docFilter, setDocFilter] = useState<DocFilter>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const savedStatusTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track presence when editing a canvas
  const { presentUsers: canvasPresence } = useResourcePresence('Canvas', activeDocId ? Number(activeDocId) : null)

  const canvasDocumentsRef = useRef<SpacetimeDocument[]>([])

  // Employee lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // Filter to Canvas/Whiteboard/Folder types only
  const canvasDocuments = useMemo(() => {
    return allDocuments.filter(
      (d) => d.docType.tag === 'Canvas' || d.docType.tag === 'Whiteboard' || d.docType.tag === 'Folder'
    )
  }, [allDocuments])

  useEffect(() => {
    canvasDocumentsRef.current = canvasDocuments
  }, [canvasDocuments])

  // Stats
  const stats = useMemo(() => {
    const docs = canvasDocuments.filter((d) => d.docType.tag === 'Canvas')
    const whiteboards = canvasDocuments.filter((d) => d.docType.tag === 'Whiteboard')
    const folders = canvasDocuments.filter((d) => d.docType.tag === 'Folder')
    const shared = canvasDocuments.filter((d) => (d.sharedWith?.length ?? 0) > 0)
    const uniqueEditors = new Set<string>()
    canvasDocuments.forEach((d) => d.editors?.forEach((e) => uniqueEditors.add(e)))
    return { docs: docs.length, whiteboards: whiteboards.length, folders: folders.length, shared: shared.length, editors: uniqueEditors.size }
  }, [canvasDocuments])

  // All folders
  const folders = useMemo(() => {
    return canvasDocuments.filter((d) => d.docType.tag === 'Folder')
  }, [canvasDocuments])

  // Recently edited (top 5, non-folder)
  const recentDocs = useMemo(() => {
    return canvasDocuments
      .filter((d) => d.docType.tag !== 'Folder')
      .sort((a, b) => timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime())
      .slice(0, 6)
  }, [canvasDocuments])

  // Build folder path for breadcrumbs
  const folderPath = useMemo(() => {
    const path: SpacetimeDocument[] = []
    let folderId = currentFolderId
    while (folderId !== null) {
      const folder = canvasDocuments.find((d) => d.id === folderId)
      if (folder) {
        path.unshift(folder)
        folderId = folder.parentId ?? null
      } else {
        break
      }
    }
    return path
  }, [currentFolderId, canvasDocuments])

  // Items in current folder, filtered and sorted
  const filteredDocuments = useMemo(() => {
    let items = canvasDocuments.filter((d) => parentIdMatches(d.parentId, currentFolderId))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = canvasDocuments.filter((d) => {
        if (d.title.toLowerCase().includes(q)) return true
        const preview = getContentPreview(d.content)
        return preview.toLowerCase().includes(q)
      })
    }
    if (docFilter !== 'all') {
      items = items.filter((d) => d.docType.tag === docFilter)
    }
    return items.sort((a, b) => {
      const aFolder = a.docType.tag === 'Folder' ? 0 : 1
      const bFolder = b.docType.tag === 'Folder' ? 0 : 1
      if (aFolder !== bFolder) return aFolder - bFolder
      switch (sortMode) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'created':
          return timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime()
        default:
          return timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime()
      }
    })
  }, [canvasDocuments, currentFolderId, searchQuery, sortMode, docFilter])

  // Active document
  const activeDoc = useMemo(() => {
    if (activeDocId === null) return null
    return canvasDocuments.find((d) => d.id === activeDocId) ?? null
  }, [activeDocId, canvasDocuments])

  const lastEditedByName = useMemo(() => {
    if (!activeDoc?.lastEditedBy) return null
    const emp = employeeMap.get(activeDoc.lastEditedBy.toHexString())
    return emp?.name ?? null
  }, [activeDoc, employeeMap])

  // ---- Actions ----

  const handleCreate = async () => {
    if (currentOrgId === null) return
    const title = newTitle.trim() || 'Untitled'
    const template = newType === 'Canvas' ? TEMPLATES[selectedTemplate] : null
    const content = template?.content ? JSON.stringify(template.content) : ''
    try {
      await createDocument({
        title,
        content,
        docType: { tag: newType } as any,
        parentId: currentFolderId,
        orgId: BigInt(currentOrgId),
      })
      setShowCreate(false)
      setNewTitle('')
      setSelectedTemplate(0)
    } catch (e) {
      console.error('Failed to create document:', e)
    }
  }

  const handleCreateFolder = async () => {
    if (currentOrgId === null) return
    const title = folderTitle.trim() || 'New Folder'
    try {
      await createDocument({
        title,
        content: '',
        docType: { tag: 'Folder' } as any,
        parentId: currentFolderId,
        orgId: BigInt(currentOrgId),
      })
      setShowCreateFolder(false)
      setFolderTitle('')
    } catch (e) {
      console.error('Failed to create folder:', e)
    }
  }

  const handleDelete = async (id: bigint) => {
    try {
      await deleteDocument({ documentId: id })
      if (activeDocId === id) setActiveDocId(null)
    } catch (e) {
      console.error('Failed to delete document:', e)
    }
  }

  const handleMoveToFolder = async (targetFolderId: bigint | null) => {
    if (moveDocId === null) return
    const doc = canvasDocuments.find((d) => d.id === moveDocId)
    if (!doc) return
    try {
      await updateDocument({
        documentId: moveDocId,
        title: doc.title,
        content: doc.content,
      })
      setShowMoveDialog(false)
      setMoveDocId(null)
    } catch (e) {
      console.error('Failed to move document:', e)
    }
  }

  const handleTitleSave = useCallback(
    async (docId: bigint, newTitleValue: string) => {
      const doc = canvasDocumentsRef.current.find((d) => d.id === docId)
      if (!doc) return
      const trimmed = newTitleValue.trim()
      if (!trimmed || trimmed === doc.title) {
        setEditingTitle(false)
        return
      }
      try {
        await updateDocument({
          documentId: docId,
          title: trimmed,
          content: doc.content,
        })
      } catch (e) {
        console.error('Failed to rename document:', e)
      }
      setEditingTitle(false)
    },
    [updateDocument]
  )

  const handleContentChange = useCallback(
    (content: any) => {
      if (activeDocId === null) return
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          const doc = canvasDocumentsRef.current.find((d) => d.id === activeDocId)
          if (!doc) return
          const serialized = typeof content === 'string' ? content : JSON.stringify(content)
          await updateDocument({
            documentId: activeDocId,
            title: doc.title,
            content: serialized,
          })
          setSaveStatus('saved')
          savedStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (e) {
          console.error('Failed to save:', e)
          setSaveStatus('idle')
        }
      }, 2000)
    },
    [activeDocId, updateDocument]
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)
    }
  }, [])

  const handleDuplicate = async (docId: bigint) => {
    if (currentOrgId === null) return
    const doc = canvasDocuments.find((d) => d.id === docId)
    if (!doc) return
    try {
      await createDocument({
        title: `${doc.title} (copy)`,
        content: doc.content,
        docType: doc.docType as any,
        parentId: doc.parentId,
        orgId: BigInt(currentOrgId),
      })
    } catch (e) {
      console.error('Failed to duplicate:', e)
    }
  }

  const handleCopyAsMarkdown = (doc: SpacetimeDocument) => {
    const preview = getContentPreview(doc.content)
    navigator.clipboard.writeText(`# ${doc.title}\n\n${preview}`)
  }

  // ---- Editor View ----
  if (activeDoc) {
    const isWhiteboard = activeDoc.docType.tag === 'Whiteboard'
    const parsedContent = parseContent(activeDoc.content)
    const wordCount = getWordCount(activeDoc.content)
    const colors = docTypeColors[activeDoc.docType.tag as keyof typeof docTypeColors] ?? docTypeColors.Canvas

    return (
      <div className="flex h-full flex-col">
        {/* Editor header */}
        <div className="flex items-center gap-3 border-b px-4 py-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setActiveDocId(null)} className="gap-1.5 -ml-1">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />

          {/* Doc type indicator */}
          <div className={`flex items-center justify-center size-7 rounded-lg ${colors.bg}`}>
            {isWhiteboard ? (
              <PenTool className={`size-3.5 ${colors.text}`} />
            ) : (
              <FileText className={`size-3.5 ${colors.text}`} />
            )}
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editingTitle ? (
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => handleTitleSave(activeDoc.id, titleDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave(activeDoc.id, titleDraft)
                  if (e.key === 'Escape') setEditingTitle(false)
                }}
                className="h-7 text-sm font-semibold max-w-xs"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setTitleDraft(activeDoc.title)
                  setEditingTitle(true)
                }}
                className="text-sm font-semibold truncate hover:text-primary transition-colors cursor-text"
                title="Click to rename"
              >
                {activeDoc.title}
              </button>
            )}
            <Badge variant="outline" className={`text-[10px] shrink-0 ${colors.border} ${colors.text}`}>
              {isWhiteboard ? 'Whiteboard' : 'Document'}
            </Badge>
            {activeDoc.visibility?.tag === 'Private' && (
              <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                <Lock className="size-2.5" /> Private
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Word count & reading time */}
            {!isWhiteboard && wordCount > 0 && (
              <span className="text-[10px] text-muted-foreground hidden lg:flex items-center gap-1.5 tabular-nums">
                <Hash className="size-3" />
                {wordCount.toLocaleString()} words
                <span className="text-muted-foreground/50">·</span>
                {getReadingTime(wordCount)}
              </span>
            )}

            <Separator orientation="vertical" className="h-4 hidden lg:block" />

            {/* Presence */}
            <PresenceAvatars users={canvasPresence} size="sm" label="Also here:" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicate(activeDoc.id)}
              className="h-7 gap-1 text-xs hidden md:flex"
            >
              <Copy className="size-3" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShareDocId(activeDoc.id); setShowShareDialog(true) }}
              className="h-7 gap-1.5 text-xs"
            >
              <Share2 className="size-3.5" />
              Share
            </Button>
            <PresenceBar />

            {/* Save status */}
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="size-3 animate-spin text-blue-400" />
                    <span className="text-blue-400">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                )}
                {saveStatus === 'idle' && (
                  <>
                    <Check className="size-3 text-muted-foreground/50" />
                    {formatTimeAgo(timestampToDate(activeDoc.updatedAt))}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-hidden">
          {isWhiteboard ? (
            <ExcalidrawEditor
              initialData={parsedContent ? { elements: parsedContent } : undefined}
              onChange={(elements) => handleContentChange(elements)}
            />
          ) : (
            <BlockEditor
              initialContent={parsedContent}
              onChange={handleContentChange}
            />
          )}
        </div>
      </div>
    )
  }

  // ---- List/Browse View ----
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <PenTool className="size-4 text-white" />
          </div>
          <GradientText
            className="text-lg font-bold"
            colors={['#8B5CF6', '#6366F1', '#A78BFA', '#818CF8']}
            animationSpeed={6}
          >
            Canvas
          </GradientText>
          <Badge className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
            {canvasDocuments.filter((d) => d.docType.tag !== 'Folder').length} docs
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search docs and content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-56 text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-0.5 rounded-lg border px-1 py-0.5">
            {(['all', 'Canvas', 'Whiteboard', 'Folder'] as DocFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDocFilter(f)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  docFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f === 'Canvas' ? 'Docs' : f === 'Whiteboard' ? 'Boards' : 'Folders'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortMode(sortMode === 'updated' ? 'name' : sortMode === 'name' ? 'created' : 'updated')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            title={`Sort by ${sortMode}`}
          >
            <SortAsc className="size-3" />
            {sortMode === 'updated' ? 'Recent' : sortMode === 'name' ? 'Name' : 'Created'}
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutList className="size-4" />
            </button>
          </div>

          <PresenceBar />

          <Button variant="outline" size="sm" onClick={() => setShowCreateFolder(true)} className="h-8 gap-1.5">
            <FolderPlus className="size-3.5" />
            <span className="hidden lg:inline">Folder</span>
          </Button>

          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0">
            <Plus className="size-3.5" />
            New Canvas
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — page tree */}
        <div className={`border-r transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'} shrink-0 hidden md:block`}>
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-blue-500/5 border-blue-500/10 p-2 text-center">
                  <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    <CountUp to={stats.docs} duration={1} />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Documents</div>
                </div>
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/10 p-2 text-center">
                  <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    <CountUp to={stats.whiteboards} duration={1} />
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Boards</div>
                </div>
              </div>

              {/* Recent */}
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Recent</span>
                </div>
                <div className="space-y-0.5">
                  {recentDocs.map((doc) => {
                    const isActive = activeDocId === doc.id
                    const isWb = doc.docType.tag === 'Whiteboard'
                    return (
                      <button
                        key={doc.id.toString()}
                        onClick={() => setActiveDocId(doc.id)}
                        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all text-sm ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className={`flex items-center justify-center size-5 rounded ${isWb ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                          {isWb ? (
                            <PenTool className="size-2.5 text-emerald-500" />
                          ) : (
                            <FileText className="size-2.5 text-blue-500" />
                          )}
                        </div>
                        <span className="truncate text-xs">{doc.title}</span>
                      </button>
                    )
                  })}
                  {recentDocs.length === 0 && (
                    <p className="text-[10px] text-muted-foreground px-2">No documents yet</p>
                  )}
                </div>
              </div>

              {/* Folders */}
              {folders.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-1 mb-2">
                    <Folder className="size-3 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Folders</span>
                  </div>
                  <div className="space-y-0.5">
                    {folders.map((folder) => {
                      const isActive = currentFolderId === folder.id
                      const childCount = canvasDocuments.filter((d) => d.parentId === folder.id).length
                      return (
                        <button
                          key={folder.id.toString()}
                          onClick={() => {
                            setCurrentFolderId(isActive ? null : folder.id)
                            setActiveDocId(null)
                          }}
                          className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all text-sm ${
                            isActive
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          {isActive ? (
                            <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Folder className="size-3.5 text-amber-500/60 shrink-0" />
                          )}
                          <span className="truncate text-xs">{folder.title}</span>
                          {childCount > 0 && (
                            <span className="ml-auto text-[9px] tabular-nums text-muted-foreground">{childCount}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Collaborators */}
              {stats.editors > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-1 mb-2">
                    <Users className="size-3 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Collaborators</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-2">
                    {stats.editors} people have edited documents
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main content area */}
        <ScrollArea className="flex-1">
          {/* Breadcrumb */}
          {folderPath.length > 0 && (
            <div className="border-b px-6 py-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      render={
                        <button onClick={() => setCurrentFolderId(null)} className="cursor-pointer transition-colors hover:text-foreground text-muted-foreground text-sm">
                          Canvas
                        </button>
                      }
                    />
                  </BreadcrumbItem>
                  {folderPath.map((folder, idx) => (
                    <span key={folder.id.toString()} className="contents">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {idx === folderPath.length - 1 ? (
                          <BreadcrumbPage className="flex items-center gap-1.5 text-sm">
                            <FolderOpen className="size-3.5" />
                            {folder.title}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            render={
                              <button onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer transition-colors hover:text-foreground text-muted-foreground text-sm flex items-center gap-1.5">
                                <Folder className="size-3.5" />
                                {folder.title}
                              </button>
                            }
                          />
                        )}
                      </BreadcrumbItem>
                    </span>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          )}

          <div className="p-6">
            {filteredDocuments.length === 0 ? (
              <EmptyState
                inFolder={currentFolderId !== null}
                hasSearch={!!searchQuery}
                onCreateClick={() => setShowCreate(true)}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.map((doc) => (
                  <CanvasCard
                    key={doc.id.toString()}
                    doc={doc}
                    employeeMap={employeeMap}
                    onOpen={() => {
                      if (doc.docType.tag === 'Folder') {
                        setCurrentFolderId(doc.id)
                      } else {
                        setActiveDocId(doc.id)
                      }
                    }}
                    onDelete={() => handleDelete(doc.id)}
                    onMove={() => {
                      setMoveDocId(doc.id)
                      setShowMoveDialog(true)
                    }}
                    onShare={() => {
                      setShareDocId(doc.id)
                      setShowShareDialog(true)
                    }}
                    onDuplicate={() => handleDuplicate(doc.id)}
                    onCopyMarkdown={() => handleCopyAsMarkdown(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="max-w-4xl space-y-1.5">
                {filteredDocuments.map((doc) => (
                  <CanvasListItem
                    key={doc.id.toString()}
                    doc={doc}
                    employeeMap={employeeMap}
                    onOpen={() => {
                      if (doc.docType.tag === 'Folder') {
                        setCurrentFolderId(doc.id)
                      } else {
                        setActiveDocId(doc.id)
                      }
                    }}
                    onDelete={() => handleDelete(doc.id)}
                    onMove={() => {
                      setMoveDocId(doc.id)
                      setShowMoveDialog(true)
                    }}
                    onShare={() => {
                      setShareDocId(doc.id)
                      setShowShareDialog(true)
                    }}
                    onDuplicate={() => handleDuplicate(doc.id)}
                    onCopyMarkdown={() => handleCopyAsMarkdown(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Canvas Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Plus className="size-3.5 text-white" />
              </div>
              New Canvas
            </DialogTitle>
            <DialogDescription>Create a new document or whiteboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Untitled canvas"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <Label className="text-sm mb-2.5 block">Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNewType('Canvas')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'Canvas'
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm shadow-blue-500/10'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`flex items-center justify-center size-10 rounded-lg mb-2.5 ${newType === 'Canvas' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-muted'}`}>
                    <FileText className={`size-5 ${newType === 'Canvas' ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-sm font-semibold">Document</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rich text with blocks, tables, and more</p>
                </button>
                <button
                  onClick={() => setNewType('Whiteboard')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'Whiteboard'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`flex items-center justify-center size-10 rounded-lg mb-2.5 ${newType === 'Whiteboard' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-muted'}`}>
                    <Pencil className={`size-5 ${newType === 'Whiteboard' ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-sm font-semibold">Whiteboard</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Freeform drawing with Excalidraw</p>
                </button>
              </div>
            </div>
            {/* Templates */}
            {newType === 'Canvas' && (
              <div>
                <Label className="text-sm mb-2.5 block">Template</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEMPLATES.map((tmpl, idx) => {
                    const Icon = tmpl.icon
                    return (
                      <button
                        key={tmpl.name}
                        onClick={() => setSelectedTemplate(idx)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          selectedTemplate === idx
                            ? 'border-violet-500 bg-violet-500/5 shadow-sm shadow-violet-500/10'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Icon className={`size-4 mb-1.5 ${selectedTemplate === idx ? 'text-violet-500' : tmpl.color}`} />
                        <p className="text-[11px] font-semibold leading-tight">{tmpl.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{tmpl.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0">
              Create Canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <FolderPlus className="size-3.5 text-white" />
              </div>
              New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Folder Name</Label>
              <Input
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                placeholder="New Folder"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder}>
              <FolderPlus className="size-4 mr-1.5" />
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="size-4" />
              Move to Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
            <button
              onClick={() => handleMoveToFolder(null)}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              <Folder className="size-4 text-muted-foreground" />
              Root (no folder)
            </button>
            {folders
              .filter((f) => f.id !== moveDocId)
              .map((folder) => (
                <button
                  key={folder.id.toString()}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <Folder className="size-4 text-amber-400" />
                  {folder.title}
                </button>
              ))}
            {folders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No folders yet. Create one first.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-4" />
              Share Canvas
            </DialogTitle>
          </DialogHeader>
          {shareDocId && (() => {
            const shareDoc = canvasDocuments.find((d) => d.id === shareDocId)
            if (!shareDoc) return null
            const isPrivate = shareDoc.visibility?.tag === 'Private'
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Visibility</p>
                    <p className="text-xs text-muted-foreground">
                      {isPrivate ? 'Only you and shared people' : 'Everyone in the org'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await setDocVisibility({
                          documentId: shareDocId,
                          visibility: { tag: isPrivate ? 'Public' : 'Private' } as any,
                        })
                      } catch (e) { console.error(e) }
                    }}
                    className="gap-1.5"
                  >
                    {isPrivate ? <><Lock className="size-3.5" /> Private</> : <><Globe className="size-3.5" /> Public</>}
                  </Button>
                </div>

                {isPrivate && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">Shared with</p>
                      {shareDoc.sharedWith.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {shareDoc.sharedWith.map((hex) => {
                            const emp = employeeMap.get(hex)
                            return (
                              <div key={hex} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-muted">
                                <div className="flex items-center gap-2">
                                  <div className="size-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] text-white font-medium">
                                    {(emp?.name ?? 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </div>
                                  <span className="text-sm">{emp?.name ?? `user-${hex.slice(0, 8)}`}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await unshareDocument({ documentId: shareDocId, targetIdentityHex: hex })
                                    } catch (e) { console.error(e) }
                                  }}
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                >
                                  Remove
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Add people</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {employees
                          .filter((e) => {
                            const hex = e.id.toHexString()
                            return hex !== identity?.toHexString() && !shareDoc.sharedWith.includes(hex)
                          })
                          .map((emp) => (
                            <button
                              key={emp.id.toHexString()}
                              onClick={async () => {
                                try {
                                  await shareDocument({ documentId: shareDocId, targetIdentityHex: emp.id.toHexString() })
                                } catch (e) { console.error(e) }
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                              <div className="size-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] text-white font-medium">
                                {emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span>{emp.name}</span>
                              <Plus className="size-3.5 ml-auto text-muted-foreground" />
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Sub-components ---------------------------------------------------------

function CanvasCard({
  doc,
  employeeMap,
  onOpen,
  onDelete,
  onMove,
  onShare,
  onDuplicate,
  onCopyMarkdown,
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
  onDuplicate: () => void
  onCopyMarkdown: () => void
}) {
  const isFolder = doc.docType.tag === 'Folder'
  const isWhiteboard = doc.docType.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null
  const isPrivate = doc.visibility?.tag === 'Private'
  const preview = !isFolder ? getContentPreview(doc.content) : ''
  const wordCount = !isFolder && !isWhiteboard ? getWordCount(doc.content) : 0
  const colors = docTypeColors[(doc.docType.tag as keyof typeof docTypeColors)] ?? docTypeColors.Canvas
  const gradient = docTypeGradient[(doc.docType.tag as keyof typeof docTypeGradient)] ?? docTypeGradient.Canvas

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onOpen}
          className="group relative rounded-xl border bg-card cursor-pointer transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-primary/20 hover:-translate-y-0.5 overflow-hidden"
        >
          {/* Top accent line */}
          <div className={`h-0.5 bg-gradient-to-r ${gradient}`} />

          {/* Preview area */}
          <div className={`h-28 flex items-center justify-center relative ${
            isFolder
              ? 'bg-gradient-to-br from-amber-500/5 to-amber-500/10'
              : isWhiteboard
                ? 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10'
                : 'bg-gradient-to-br from-blue-500/3 to-indigo-500/5'
          }`}>
            {isFolder ? (
              <FolderOpen className="size-10 text-amber-400/30" />
            ) : isWhiteboard ? (
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-2 border-foreground/8 rounded-lg rotate-12" />
                <div className="absolute inset-2 border-2 border-foreground/8 rounded-full" />
                <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-foreground/8 rotate-45" />
              </div>
            ) : preview ? (
              <div className="px-5 py-3 w-full">
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed line-clamp-4">
                  {preview}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 px-5 w-full">
                <div className="h-1.5 bg-foreground/6 rounded-full w-3/4" />
                <div className="h-1.5 bg-foreground/6 rounded-full w-full" />
                <div className="h-1.5 bg-foreground/6 rounded-full w-2/3" />
                <div className="h-1.5 bg-foreground/6 rounded-full w-5/6" />
              </div>
            )}

            {/* Privacy badge */}
            {isPrivate && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 rounded-md bg-background/90 border px-1.5 py-0.5">
                  <Lock className="size-2.5 text-muted-foreground" />
                  <span className="text-[8px] font-medium text-muted-foreground">Private</span>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex items-center justify-center size-5 rounded ${colors.bg}`}>
                {isFolder ? (
                  <Folder className="size-3 text-amber-500" />
                ) : isWhiteboard ? (
                  <PenTool className="size-3 text-emerald-500" />
                ) : (
                  <FileText className="size-3 text-blue-500" />
                )}
              </div>
              <h3 className="text-sm font-semibold truncate flex-1">{doc.title}</h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-2.5" />
                {formatTimeAgo(timestampToDate(doc.updatedAt))}
              </span>
              {lastEditor && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="truncate">{lastEditor.name}</span>
                </>
              )}
              {wordCount > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="tabular-nums">{wordCount}w</span>
                </>
              )}
              {(doc.sharedWith?.length ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 ml-auto">
                  <Users className="size-2.5" />
                  {doc.sharedWith.length}
                </span>
              )}
            </div>
          </div>

          {/* Hover actions */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare() }}
                className="p-1.5 rounded-md bg-background/90 border hover:bg-muted transition-colors"
                title="Share"
              >
                <Share2 className="size-3" />
              </button>
            )}
            {!isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                className="p-1.5 rounded-md bg-background/90 border hover:bg-muted transition-colors"
                title="Duplicate"
              >
                <Copy className="size-3" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-md bg-background/90 border hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel className="flex items-center gap-2">
          <div className={`size-4 rounded ${colors.bg} flex items-center justify-center`}>
            {isFolder ? <Folder className="size-2.5 text-amber-500" /> :
             isWhiteboard ? <PenTool className="size-2.5 text-emerald-500" /> :
             <FileText className="size-2.5 text-blue-500" />}
          </div>
          {doc.title}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onOpen}>
          {isFolder ? <FolderOpen className="size-3.5" /> : <BookOpen className="size-3.5" />}
          Open
        </ContextMenuItem>
        {!isFolder && (
          <ContextMenuItem onClick={onShare}>
            <Share2 className="size-3.5" /> Share
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="size-3.5" /> Duplicate
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onMove}>
            <MoveRight className="size-3.5" /> Move to folder
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onCopyMarkdown}>
            <Clipboard className="size-3.5" /> Copy as markdown
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => navigator.clipboard.writeText(doc.title)}>
          <Copy className="size-3.5" /> Copy title
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function CanvasListItem({
  doc,
  employeeMap,
  onOpen,
  onDelete,
  onMove,
  onShare,
  onDuplicate,
  onCopyMarkdown,
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
  onDuplicate: () => void
  onCopyMarkdown: () => void
}) {
  const isFolder = doc.docType.tag === 'Folder'
  const isWhiteboard = doc.docType.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null
  const isPrivate = doc.visibility?.tag === 'Private'
  const preview = !isFolder ? getContentPreview(doc.content) : ''
  const wordCount = !isFolder && !isWhiteboard ? getWordCount(doc.content) : 0
  const colors = docTypeColors[(doc.docType.tag as keyof typeof docTypeColors)] ?? docTypeColors.Canvas

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onOpen}
          className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-primary/20"
        >
          <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${colors.bg}`}>
            {isFolder ? (
              <Folder className="size-5 text-amber-500" />
            ) : isWhiteboard ? (
              <PenTool className="size-5 text-emerald-500" />
            ) : (
              <FileText className="size-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
              {isFolder && <ChevronRight className="size-3.5 text-muted-foreground" />}
              {isPrivate && <Lock className="size-3 text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {preview && (
                <p className="text-[10px] text-muted-foreground truncate max-w-sm">{preview}</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
              <span>{isFolder ? 'Folder' : isWhiteboard ? 'Whiteboard' : 'Document'}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{formatTimeAgo(timestampToDate(doc.updatedAt))}</span>
              {lastEditor && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{lastEditor.name}</span>
                </>
              )}
              {wordCount > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="tabular-nums">{wordCount} words</span>
                </>
              )}
              {(doc.sharedWith?.length ?? 0) > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="flex items-center gap-0.5">
                    <Users className="size-2.5" />
                    {doc.sharedWith.length} shared
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {!isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare() }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Share"
              >
                <Share2 className="size-3.5" />
              </button>
            )}
            {!isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Duplicate"
              >
                <Copy className="size-3.5" />
              </button>
            )}
            {!isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); onMove() }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Move to folder"
              >
                <MoveRight className="size-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{doc.title}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onOpen}>
          {isFolder ? <FolderOpen className="size-3.5" /> : <BookOpen className="size-3.5" />}
          Open
        </ContextMenuItem>
        {!isFolder && (
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="size-3.5" /> Duplicate
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onCopyMarkdown}>
            <Clipboard className="size-3.5" /> Copy as markdown
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function EmptyState({ inFolder, hasSearch, onCreateClick }: { inFolder: boolean; hasSearch: boolean; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center">
          {hasSearch ? (
            <Search className="size-8 text-violet-400/50" />
          ) : inFolder ? (
            <FolderOpen className="size-8 text-amber-400/50" />
          ) : (
            <PenTool className="size-8 text-violet-400/50" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Plus className="size-3 text-white" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {hasSearch ? 'No matching documents' : inFolder ? 'This folder is empty' : 'Create your workspace'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {hasSearch
          ? 'Try adjusting your search query or filters.'
          : inFolder
            ? 'Create a document or whiteboard to start building knowledge in this folder.'
            : 'Build a knowledge base for your team. Create documents, whiteboards, and organize them into folders.'}
      </p>
      {!hasSearch && (
        <Button onClick={onCreateClick} className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0">
          <Plus className="size-4" />
          {inFolder ? 'Create canvas' : 'Create your first canvas'}
        </Button>
      )}
    </div>
  )
}
