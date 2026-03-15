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
  Check,
  Loader2,
  Share2,
  Lock,
  Globe,
  Copy,
  Eye,
  EyeOff,
  Users,
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

// ---- Templates --------------------------------------------------------------

const TEMPLATES: { name: string; description: string; content: any }[] = [
  {
    name: 'Blank',
    description: 'Start from scratch',
    content: null,
  },
  {
    name: 'Meeting Notes',
    description: 'Structured meeting template',
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
    description: 'Technical design document',
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
    name: 'Sprint Retrospective',
    description: 'What went well, what to improve',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Sprint Retrospective' }], props: { level: 1 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Sprint: ___ | Date: ___' }] },
      { type: 'heading', content: [{ type: 'text', text: 'What Went Well' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'What Could Be Improved' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Team Sentiment' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Overall: ___/5' }] },
    ],
  },
  {
    name: 'Product Requirements',
    description: 'PRD with user stories',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Product Requirements Document' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Overview' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'What are we building and why?' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Background & Context' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'User Stories' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'As a [user], I want [feature] so that [benefit]' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Functional Requirements' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Non-Functional Requirements' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Performance: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Security: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Scalability: ' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Out of Scope' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Success Criteria' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Open Questions' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Decision Log',
    description: 'Track key decisions and rationale',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Decision Log' }], props: { level: 1 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Track important decisions, their context, and outcomes.' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Decision #1' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Date: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Decision: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Context: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Alternatives Considered: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Decided By: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Status: Accepted / Revisit' }] },
    ],
  },
  {
    name: '1:1 Notes',
    description: 'Manager/report 1:1 template',
    content: [
      { type: 'heading', content: [{ type: 'text', text: '1:1 Notes' }], props: { level: 1 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Participants: ___ & ___ | Date: ___' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Wins & Progress' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Challenges & Blockers' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Goals for Next Period' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Career & Growth' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
    ],
  },
  {
    name: 'OKRs',
    description: 'Objectives and Key Results',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'OKRs — Q_ 20__' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Objective 1: ' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR1: ' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR2: ' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR3: ' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Objective 2: ' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR1: ' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR2: ' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'KR3: ' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Review Notes' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
    ],
  },
  {
    name: 'Runbook',
    description: 'Operational procedures',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Runbook: ___' }], props: { level: 1 } },
      { type: 'heading', content: [{ type: 'text', text: 'Overview' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'When to use this runbook and what it covers.' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Prerequisites' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: 'Access to ___' }], props: { checked: false } },
      { type: 'checkListItem', content: [{ type: 'text', text: 'Permissions for ___' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Steps' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Rollback Procedure' }], props: { level: 2 } },
      { type: 'numberedListItem', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Troubleshooting' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'If ___: Try ___' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Contacts' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Owner: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'On-call: ' }] },
    ],
  },
  {
    name: 'Incident Report',
    description: 'Post-mortem analysis',
    content: [
      { type: 'heading', content: [{ type: 'text', text: 'Incident Report' }], props: { level: 1 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Severity: ___ | Date: ___ | Duration: ___' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Summary' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: 'What happened in one paragraph.' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Impact' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Users affected: ' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Revenue impact: ' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Timeline' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'HH:MM — Event detected' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'HH:MM — Mitigation started' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'HH:MM — Resolved' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Root Cause' }], props: { level: 2 } },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'heading', content: [{ type: 'text', text: 'Action Items' }], props: { level: 2 } },
      { type: 'checkListItem', content: [{ type: 'text', text: '' }], props: { checked: false } },
      { type: 'heading', content: [{ type: 'text', text: 'Lessons Learned' }], props: { level: 2 } },
      { type: 'bulletListItem', content: [{ type: 'text', text: '' }] },
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
  // SpacetimeDB timestamps may be BigInt microseconds or Date
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

/** Check if a SpacetimeDB Option<u64> parentId matches a given folder id (null = root) */
function parentIdMatches(docParentId: bigint | null | undefined, folderId: bigint | null): boolean {
  if (folderId === null) {
    return docParentId === null || docParentId === undefined
  }
  return docParentId === folderId
}


// ---- Main Page --------------------------------------------------------------

export default function CanvasPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const savedStatusTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track presence when editing a canvas
  const { presentUsers: canvasPresence } = useResourcePresence('Canvas', activeDocId ? Number(activeDocId) : null)

  // Ref to hold latest documents for use inside debounced callbacks (avoids stale closures)
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

  // Keep the ref in sync
  useEffect(() => {
    canvasDocumentsRef.current = canvasDocuments
  }, [canvasDocuments])

  // All folders
  const folders = useMemo(() => {
    return canvasDocuments.filter((d) => d.docType.tag === 'Folder')
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

  // Items in current folder, filtered
  const filteredDocuments = useMemo(() => {
    let items = canvasDocuments.filter((d) => parentIdMatches(d.parentId, currentFolderId))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((d) => d.title.toLowerCase().includes(q))
    }
    // Sort: folders first, then by updatedAt descending
    return items.sort((a, b) => {
      const aFolder = a.docType.tag === 'Folder' ? 0 : 1
      const bFolder = b.docType.tag === 'Folder' ? 0 : 1
      if (aFolder !== bFolder) return aFolder - bFolder
      return timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime()
    })
  }, [canvasDocuments, currentFolderId, searchQuery])

  // Active document object
  const activeDoc = useMemo(() => {
    if (activeDocId === null) return null
    return canvasDocuments.find((d) => d.id === activeDocId) ?? null
  }, [activeDocId, canvasDocuments])

  // Last edited by name
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
      // NOTE: The updateDocument reducer only takes documentId, title, content.
      // Moving to a folder would require a separate reducer or extending updateDocument.
      // For now we close the dialog. If parentId update is needed, a backend change is required.
      setShowMoveDialog(false)
      setMoveDocId(null)
    } catch (e) {
      console.error('Failed to move document:', e)
    }
  }

  // Title rename (from editor header)
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

  // Debounced auto-save (2-second debounce)
  const handleContentChange = useCallback(
    (content: any) => {
      if (activeDocId === null) return

      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)

      saveTimerRef.current = setTimeout(async () => {
        try {
          // Read latest doc from ref to avoid stale closure
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)
    }
  }, [])

  // ---- Editor View ----
  if (activeDoc) {
    const isWhiteboard = activeDoc.docType.tag === 'Whiteboard'
    const parsedContent = parseContent(activeDoc.content)

    return (
      <div className="flex h-full flex-col">
        {/* Editor header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setActiveDocId(null)} className="gap-1.5 -ml-1">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isWhiteboard ? (
              <PenTool className="size-4 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="size-4 text-blue-400 shrink-0" />
            )}
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
            <Badge variant="outline" className="text-[10px] shrink-0">
              {isWhiteboard ? 'Whiteboard' : 'Document'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PresenceAvatars users={canvasPresence} size="sm" label="Also here:" />
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
            {/* Save status indicator */}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Saving...
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="size-3 text-green-400" />
                  Saved
                </>
              )}
              {saveStatus === 'idle' && (
                <>Saved {formatTimeAgo(timestampToDate(activeDoc.updatedAt))}</>
              )}
            </span>
            {/* Last edited by */}
            {lastEditedByName && (
              <span className="text-[10px] text-muted-foreground">
                Last edited by {lastEditedByName}
              </span>
            )}
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

  // ---- List View ----
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <PenTool className="size-5 text-violet-500" />
          <h1 className="text-lg font-bold">Canvas</h1>
          <Badge variant="secondary" className="text-xs">
            {canvasDocuments.filter((d) => d.docType.tag !== 'Folder').length}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search canvases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-52 text-sm"
            />
          </div>

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
            Folder
          </Button>

          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            New Canvas
          </Button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {folderPath.length > 0 && (
        <div className="border-b px-4 py-2">
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

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <EmptyState
              inFolder={currentFolderId !== null}
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
                />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-2">
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
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Canvas Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Canvas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label className="text-sm mb-2 block">Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNewType('Canvas')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'Canvas'
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <FileText className={`size-8 mb-2 ${newType === 'Canvas' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-semibold">Document</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rich text, like Notion</p>
                </button>
                <button
                  onClick={() => setNewType('Whiteboard')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'Whiteboard'
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Pencil className={`size-8 mb-2 ${newType === 'Whiteboard' ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-semibold">Whiteboard</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Draw with Excalidraw</p>
                </button>
              </div>
            </div>
            {/* Templates (only for documents) */}
            {newType === 'Canvas' && (
              <div>
                <Label className="text-sm mb-2 block">Template ({TEMPLATES.length} available)</Label>
                <ScrollArea className="max-h-[280px]">
                  <div className="grid grid-cols-2 gap-2 pr-3">
                    {TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={tmpl.name}
                        onClick={() => setSelectedTemplate(idx)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          selectedTemplate === idx
                            ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/30'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <FileText className="size-3.5 text-muted-foreground shrink-0" />
                          <p className="text-xs font-medium truncate">{tmpl.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{tmpl.description}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Canvas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
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
            <DialogTitle>Move to Folder</DialogTitle>
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Visibility</p>
                    <p className="text-xs text-muted-foreground">
                      {isPrivate ? 'Only you and shared people can see this' : 'Everyone in the org can see this'}
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
                                <span className="text-sm">{emp?.name ?? `user-${hex.slice(0, 8)}`}</span>
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
                              <div className="size-6 rounded-full bg-violet-600 flex items-center justify-center text-[9px] text-white font-medium">
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
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
}) {
  const isFolder = doc.docType.tag === 'Folder'
  const isWhiteboard = doc.docType.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null
  const isPrivate = doc.visibility?.tag === 'Private'

  return (
    <ContextMenu>
      <ContextMenuTrigger>
    <div
      onClick={onOpen}
      className="group relative rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Preview area */}
      <div className={`h-32 flex items-center justify-center ${
        isFolder
          ? 'bg-gradient-to-br from-amber-500/5 to-amber-500/10'
          : isWhiteboard
            ? 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10'
            : 'bg-gradient-to-br from-blue-500/5 to-blue-500/10'
      }`}>
        {isFolder ? (
          <FolderOpen className="size-12 text-amber-400/40" />
        ) : isWhiteboard ? (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-foreground/10 rounded-lg rotate-12" />
            <div className="absolute inset-2 border-2 border-foreground/10 rounded-full" />
            <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-foreground/10 rotate-45" />
          </div>
        ) : (
          <div className="space-y-1.5 px-6 w-full">
            <div className="h-2 bg-foreground/10 rounded-full w-3/4" />
            <div className="h-2 bg-foreground/10 rounded-full w-full" />
            <div className="h-2 bg-foreground/10 rounded-full w-2/3" />
            <div className="h-2 bg-foreground/10 rounded-full w-5/6" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1">
          {isFolder ? (
            <Folder className="size-3.5 text-amber-400 shrink-0" />
          ) : isWhiteboard ? (
            <PenTool className="size-3.5 text-emerald-400 shrink-0" />
          ) : (
            <FileText className="size-3.5 text-blue-400 shrink-0" />
          )}
          <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
          {isPrivate && <Lock className="size-3 text-muted-foreground shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          {formatTimeAgo(timestampToDate(doc.updatedAt))}
          {lastEditor && (
            <span className="ml-1">Last edited by {lastEditor.name}</span>
          )}
          {(doc.sharedWith?.length ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 ml-1">
              <Users className="size-2.5" />
              {doc.sharedWith.length} shared
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare() }}
            className="p-1.5 rounded-md bg-background/80 border hover:bg-muted transition-colors"
            title="Share"
          >
            <Share2 className="size-3.5" />
          </button>
        )}
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove() }}
            className="p-1.5 rounded-md bg-background/80 border hover:bg-muted transition-colors"
            title="Move to folder"
          >
            <MoveRight className="size-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-md bg-background/80 border hover:bg-destructive/10 hover:text-destructive transition-colors"
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
          {isFolder ? <FolderOpen className="size-3.5" /> : <FileText className="size-3.5" />}
          Open
        </ContextMenuItem>
        {!isFolder && (
          <ContextMenuItem onClick={onShare}>
            <Share2 className="size-3.5" /> Share
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onMove}>
            <MoveRight className="size-3.5" /> Move to folder
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
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
}) {
  const isFolder = doc.docType.tag === 'Folder'
  const isWhiteboard = doc.docType.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-sm hover:border-primary/20"
    >
      <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${
        isFolder
          ? 'bg-amber-500/10'
          : isWhiteboard
            ? 'bg-emerald-500/10'
            : 'bg-blue-500/10'
      }`}>
        {isFolder ? (
          <Folder className="size-5 text-amber-400" />
        ) : isWhiteboard ? (
          <PenTool className="size-5 text-emerald-400" />
        ) : (
          <FileText className="size-5 text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
          {isFolder && (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isFolder ? 'Folder' : isWhiteboard ? 'Whiteboard' : 'Document'} · Updated {formatTimeAgo(timestampToDate(doc.updatedAt))}
          {lastEditor && <span> · Last edited by {lastEditor.name}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmptyState({ inFolder, onCreateClick }: { inFolder: boolean; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        {inFolder ? (
          <FolderOpen className="size-7 text-muted-foreground" />
        ) : (
          <PenTool className="size-7 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {inFolder ? 'This folder is empty' : 'No canvases yet'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {inFolder
          ? 'Create a document or whiteboard in this folder.'
          : 'Create a document for rich text editing or a whiteboard for visual collaboration.'}
      </p>
      <Button onClick={onCreateClick} className="gap-1.5">
        <Plus className="size-4" />
        {inFolder ? 'Create canvas' : 'Create your first canvas'}
      </Button>
    </div>
  )
}
