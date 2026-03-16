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
  Star,
  BarChart3,
  MessageSquare,
  History,
  RotateCcw,
  Send,
  CheckCircle2,
  CornerDownRight,
  MoreHorizontal,
  Save,
  List,
  Download,
  Maximize2,
  Minimize2,
  AlignLeft,
  Pin,
  PinOff,
  CopyPlus,
  Tag,
  X,
  Archive,
  CircleDot,
  type LucideIcon,
  FileCode,
  FileJson,
  Focus,
  Keyboard,
  Hash,
  Type,
  AlignJustify,
  BookOpen,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import { extractPreviewText, scrollToBlock, type HeadingItem, type DocumentStats } from '@/components/block-editor'

// Cover image gradient presets
const COVER_GRADIENTS = [
  { name: 'Violet Dream', value: 'from-violet-500 to-indigo-600' },
  { name: 'Ocean', value: 'from-cyan-500 to-blue-600' },
  { name: 'Sunset', value: 'from-orange-400 to-rose-500' },
  { name: 'Forest', value: 'from-emerald-500 to-teal-600' },
  { name: 'Midnight', value: 'from-slate-700 to-zinc-900' },
  { name: 'Aurora', value: 'from-green-400 via-cyan-500 to-blue-500' },
  { name: 'Nebula', value: 'from-purple-500 via-pink-500 to-red-500' },
  { name: 'Dawn', value: 'from-amber-200 via-orange-300 to-rose-400' },
]

const DOC_EMOJIS = ['📝', '📄', '📋', '📊', '🎯', '💡', '🚀', '🔧', '📐', '🎨', '🧪', '📦', '🗂️', '📖', '🏗️', '✨', '🔬', '🎪', '🌟', '⚡']

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
  const [allMessages] = useTable(tables.message)
  const [allDocVersions] = useTable(tables.document_version)
  const [allFavorites] = useTable(tables.document_favorite)
  const allDocTags = useTable(tables.document_tag) ?? []
  const allDocPins = useTable(tables.document_pin) ?? []
  const allDocComments = useTable(tables.document_comment) ?? []
  const [allDocLifecycles] = useTable(tables.document_lifecycle)
  const [allDocMetas] = useTable(tables.document_meta)
  const [allDocViews] = useTable(tables.document_view)

  const createDocument = useReducer(reducers.createDocument)
  const updateDocument = useReducer(reducers.updateDocument)
  const deleteDocument = useReducer(reducers.deleteDocument)
  const shareDocument = useReducer(reducers.shareDocument)
  const unshareDocument = useReducer(reducers.unshareDocument)
  const setDocVisibility = useReducer(reducers.setDocumentVisibility)
  const sendMessage = useReducer(reducers.sendMessage)
  const saveDocumentVersion = useReducer(reducers.saveDocumentVersion)
  const restoreDocumentVersion = useReducer(reducers.restoreDocumentVersion)
  const favoriteDocument = useReducer(reducers.favoriteDocument)
  const unfavoriteDocument = useReducer(reducers.unfavoriteDocument)
  const moveDocumentReducer = useReducer(reducers.moveDocument)
  const duplicateDocument = useReducer(reducers.duplicateDocument)
  const addDocumentTag = useReducer(reducers.addDocumentTag)
  const removeDocumentTag = useReducer(reducers.removeDocumentTag)
  const pinDocument = useReducer(reducers.pinDocument)
  const unpinDocument = useReducer(reducers.unpinDocument)
  const addDocumentComment = useReducer(reducers.addDocumentComment)
  const editDocumentComment = useReducer(reducers.editDocumentComment)
  const deleteDocumentComment = useReducer(reducers.deleteDocumentComment)
  const resolveDocumentComment = useReducer(reducers.resolveDocumentComment)
  const setDocumentLifecycle = useReducer(reducers.setDocumentLifecycle)
  const setDocumentMeta = useReducer(reducers.setDocumentMeta)
  const recordDocumentView = useReducer(reducers.recordDocumentView)

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
  const [showComments, setShowComments] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<bigint | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<bigint | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareDocId, setShareDocId] = useState<bigint | null>(null)
  const [listFilter, setListFilter] = useState<'all' | 'documents' | 'whiteboards' | 'starred'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'inReview' | 'published' | 'archived'>('all')
  const [showToc, setShowToc] = useState(false)
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [fullWidth, setFullWidth] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [editorStats, setEditorStats] = useState<DocumentStats | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showStatsPanel, setShowStatsPanel] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importText, setImportText] = useState('')
  const editorInstanceRef = useRef<any>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const savedStatusTimerRef = useRef<NodeJS.Timeout | null>(null)

  const myHex = identity?.toHexString() ?? ''

  // Persistent favorites from DB
  const starredIds = useMemo(() => {
    const set = new Set<bigint>()
    for (const fav of allFavorites) {
      if (fav.userId.toHexString() === myHex) {
        set.add(fav.documentId)
      }
    }
    return set
  }, [allFavorites, myHex])

  const toggleStar = useCallback((id: bigint) => {
    if (starredIds.has(id)) {
      unfavoriteDocument({ documentId: id })
    } else {
      favoriteDocument({ documentId: id })
    }
  }, [starredIds, favoriteDocument, unfavoriteDocument])

  // Pinned document IDs
  const pinnedIds = useMemo(() => {
    if (currentOrgId === null) return new Set<bigint>()
    const set = new Set<bigint>()
    for (const pin of allDocPins) {
      if (Number(pin.orgId) === currentOrgId) set.add(pin.documentId)
    }
    return set
  }, [allDocPins, currentOrgId])

  const togglePin = useCallback((id: bigint) => {
    if (pinnedIds.has(id)) {
      unpinDocument({ documentId: id })
    } else {
      pinDocument({ documentId: id })
    }
  }, [pinnedIds, pinDocument, unpinDocument])

  // Tags per document
  const docTagsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of allDocTags) {
      if (!t.documentId) continue
      const key = t.documentId.toString()
      const existing = map.get(key) ?? []
      existing.push(t.tag)
      map.set(key, existing)
    }
    return map
  }, [allDocTags])

  // Document meta map (cover images, emoji icons)
  const docMetaMap = useMemo(() => {
    const map = new Map<string, { icon: string; coverGradient: string; coverUrl: string; description: string }>()
    for (const meta of allDocMetas) {
      map.set(meta.documentId.toString(), {
        icon: meta.icon,
        coverGradient: meta.coverGradient,
        coverUrl: meta.coverUrl,
        description: meta.description,
      })
    }
    return map
  }, [allDocMetas])

  // View count per document
  const docViewCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of allDocViews) {
      const key = v.documentId.toString()
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [allDocViews])

  // Document lifecycle status map
  const docLifecycleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const lc of allDocLifecycles) {
      map.set(lc.documentId.toString(), lc.status?.tag)
    }
    return map
  }, [allDocLifecycles])

  const getDocStatus = useCallback((docId: bigint) => {
    return docLifecycleMap.get(docId.toString()) ?? 'Draft'
  }, [docLifecycleMap])

  // Track presence when editing a canvas
  const { presentUsers: canvasPresence } = useResourcePresence('Canvas', activeDocId ? Number(activeDocId) : null)

  // Record document view when opening
  useEffect(() => {
    if (activeDocId) {
      try { recordDocumentView({ documentId: activeDocId }) } catch {}
    }
  }, [activeDocId])

  // Active doc meta
  const activeDocMeta = useMemo(() => {
    if (!activeDocId) return null
    return docMetaMap.get(activeDocId.toString()) ?? null
  }, [activeDocId, docMetaMap])

  // Set cover gradient on active doc
  const handleSetCover = useCallback((gradient: string) => {
    if (!activeDocId) return
    const existing = docMetaMap.get(activeDocId.toString())
    setDocumentMeta({
      documentId: activeDocId,
      icon: existing?.icon ?? '',
      coverUrl: existing?.coverUrl ?? '',
      coverGradient: gradient,
      description: existing?.description ?? '',
    })
    setShowCoverPicker(false)
  }, [activeDocId, docMetaMap, setDocumentMeta])

  // Remove cover
  const handleRemoveCover = useCallback(() => {
    if (!activeDocId) return
    const existing = docMetaMap.get(activeDocId.toString())
    setDocumentMeta({
      documentId: activeDocId,
      icon: existing?.icon ?? '',
      coverUrl: '',
      coverGradient: '',
      description: existing?.description ?? '',
    })
    setShowCoverPicker(false)
  }, [activeDocId, docMetaMap, setDocumentMeta])

  // Set emoji icon on active doc
  const handleSetEmoji = useCallback((emoji: string) => {
    if (!activeDocId) return
    const existing = docMetaMap.get(activeDocId.toString())
    setDocumentMeta({
      documentId: activeDocId,
      icon: emoji,
      coverUrl: existing?.coverUrl ?? '',
      coverGradient: existing?.coverGradient ?? '',
      description: existing?.description ?? '',
    })
    setShowEmojiPicker(false)
  }, [activeDocId, docMetaMap, setDocumentMeta])

  // Import from markdown
  const handleImportMarkdown = useCallback(() => {
    if (!importText.trim() || !editorInstanceRef.current) return
    try {
      const blocks = editorInstanceRef.current.tryParseMarkdownToBlocks(importText)
      editorInstanceRef.current.replaceBlocks(editorInstanceRef.current.document, blocks)
      setShowImportDialog(false)
      setImportText('')
    } catch (e) {
      console.error('Markdown import failed:', e)
    }
  }, [importText])

  // Ref to hold latest documents for use inside debounced callbacks (avoids stale closures)
  const canvasDocumentsRef = useRef<SpacetimeDocument[]>([])

  // Employee lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.filter(e => e.id).forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // Filter to Canvas/Whiteboard/Folder types only
  const canvasDocuments = useMemo(() => {
    return allDocuments.filter(
      (d) => d.docType?.tag === 'Canvas' || d.docType?.tag === 'Whiteboard' || d.docType?.tag === 'Folder'
    )
  }, [allDocuments])

  // Keep the ref in sync
  useEffect(() => {
    canvasDocumentsRef.current = canvasDocuments
  }, [canvasDocuments])

  // All folders
  const folders = useMemo(() => {
    return canvasDocuments.filter((d) => d.docType?.tag === 'Folder')
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
      items = items.filter((d) => d.title.toLowerCase().includes(q) || extractPreviewText(d.content, 500).toLowerCase().includes(q))
    }
    // Sort: folders first, then by updatedAt descending
    return items.sort((a, b) => {
      const aFolder = a.docType?.tag === 'Folder' ? 0 : 1
      const bFolder = b.docType?.tag === 'Folder' ? 0 : 1
      if (aFolder !== bFolder) return aFolder - bFolder
      return timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime()
    })
  }, [canvasDocuments, currentFolderId, searchQuery])

  // Active document object
  const activeDoc = useMemo(() => {
    if (activeDocId === null) return null
    return canvasDocuments.find((d) => d.id === activeDocId) ?? null
  }, [activeDocId, canvasDocuments])

  // Document stats
  const docStats = useMemo(() => {
    const docs = canvasDocuments.filter((d) => d.docType?.tag === 'Canvas')
    const whiteboards = canvasDocuments.filter((d) => d.docType?.tag === 'Whiteboard')
    const shared = canvasDocuments.filter((d) => (d.sharedWith?.length ?? 0) > 0)
    return { documents: docs.length, whiteboards: whiteboards.length, folders: folders.length, shared: shared.length }
  }, [canvasDocuments, folders])

  // Recent documents (last 5, non-folder)
  const recentDocs = useMemo(() => {
    return [...canvasDocuments]
      .filter((d) => d.docType?.tag !== 'Folder')
      .sort((a, b) => timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime())
      .slice(0, 5)
  }, [canvasDocuments])

  // Word count for active document
  const activeDocWordCount = useMemo(() => {
    if (!activeDoc || activeDoc.docType?.tag !== 'Canvas') return null
    const parsed = parseContent(activeDoc.content)
    if (!parsed || !Array.isArray(parsed)) return null
    let words = 0
    const countInBlocks = (blocks: any[]) => {
      for (const block of blocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const inline of block.content) {
            if (inline.text) words += inline.text.trim().split(/\s+/).filter(Boolean).length
          }
        }
        if (block.children && Array.isArray(block.children)) countInBlocks(block.children)
      }
    }
    countInBlocks(parsed)
    return words
  }, [activeDoc])

  // Filtered list for type/starred filtering
  const typeFilteredDocuments = useMemo(() => {
    let items = filteredDocuments
    if (listFilter === 'documents') items = items.filter((d) => d.docType?.tag === 'Canvas' || d.docType?.tag === 'Folder')
    else if (listFilter === 'whiteboards') items = items.filter((d) => d.docType?.tag === 'Whiteboard' || d.docType?.tag === 'Folder')
    else if (listFilter === 'starred') items = items.filter((d) => starredIds.has(d.id))
    // Status filter
    if (statusFilter !== 'all') {
      const statusMap: Record<string, string> = { draft: 'Draft', inReview: 'InReview', published: 'Published', archived: 'Archived' }
      const target = statusMap[statusFilter]
      items = items.filter((d) => d.docType?.tag === 'Folder' || getDocStatus(d.id) === target)
    }
    // Sort: pinned first, then by updated_at desc
    return [...items].sort((a, b) => {
      const aPin = pinnedIds.has(a.id) ? 0 : 1
      const bPin = pinnedIds.has(b.id) ? 0 : 1
      if (aPin !== bPin) return aPin - bPin
      return 0 // preserve existing sort
    })
  }, [filteredDocuments, listFilter, statusFilter, starredIds, pinnedIds, getDocStatus])

  // Last edited by name
  const lastEditedByName = useMemo(() => {
    if (!activeDoc?.lastEditedBy) return null
    const emp = employeeMap.get(activeDoc.lastEditedBy.toHexString())
    return emp?.name ?? null
  }, [activeDoc, employeeMap])

  // Comments for active document from DocumentComment table
  const docComments = useMemo(() => {
    if (!activeDocId || currentOrgId === null) return { threads: [] as any[], count: 0 }
    const forDoc = allDocComments.filter(
      (c: any) => c.documentId === activeDocId && Number(c.orgId) === currentOrgId
    )
    // Separate top-level and replies
    const topLevel = forDoc
      .filter((c: any) => !c.parentId || c.parentId === 0n)
      .sort((a: any, b: any) => timestampToDate(b.createdAt).getTime() - timestampToDate(a.createdAt).getTime())
    const replyMap = new Map<string, any[]>()
    for (const c of forDoc) {
      if (c.parentId && c.parentId !== 0n) {
        const key = c.parentId.toString()
        if (!replyMap.has(key)) replyMap.set(key, [])
        replyMap.get(key)!.push(c)
      }
    }
    // Sort replies oldest first within each thread
    for (const replies of replyMap.values()) {
      replies.sort((a: any, b: any) => timestampToDate(a.createdAt).getTime() - timestampToDate(b.createdAt).getTime())
    }
    const threads = topLevel.map((c: any) => ({
      comment: c,
      replies: replyMap.get(c.id.toString()) ?? [],
    }))
    return { threads, count: forDoc.length }
  }, [allDocComments, activeDocId, currentOrgId])

  // Version history for active document
  const docVersions = useMemo(() => {
    if (!activeDocId) return []
    return allDocVersions
      .filter((v) => v.documentId === activeDocId)
      .sort((a, b) => Number(b.versionNumber) - Number(a.versionNumber))
  }, [allDocVersions, activeDocId])

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
    try {
      await moveDocumentReducer({
        documentId: moveDocId,
        parentId: targetFolderId,
      })
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

  // Add a comment to the active document
  const handleAddComment = useCallback(async (parentId?: bigint) => {
    if (!activeDocId || currentOrgId === null) return
    const text = parentId ? replyText.trim() : commentText.trim()
    if (!text) return
    try {
      await addDocumentComment({
        orgId: BigInt(currentOrgId),
        documentId: activeDocId,
        parentId: parentId ?? 0n,
        content: text,
      })
      if (parentId) {
        setReplyText('')
        setReplyingTo(null)
      } else {
        setCommentText('')
      }
    } catch (e) {
      console.error('Failed to add comment:', e)
    }
  }, [activeDocId, currentOrgId, commentText, replyText, addDocumentComment])

  const handleEditComment = useCallback(async () => {
    if (!editingCommentId || !editCommentText.trim()) return
    try {
      await editDocumentComment({ commentId: editingCommentId, content: editCommentText.trim() })
      setEditingCommentId(null)
      setEditCommentText('')
    } catch (e) {
      console.error('Failed to edit comment:', e)
    }
  }, [editingCommentId, editCommentText, editDocumentComment])

  const handleDeleteComment = useCallback(async (commentId: bigint) => {
    try {
      await deleteDocumentComment({ commentId })
    } catch (e) {
      console.error('Failed to delete comment:', e)
    }
  }, [deleteDocumentComment])

  const handleResolveComment = useCallback(async (commentId: bigint) => {
    try {
      await resolveDocumentComment({ commentId })
    } catch (e) {
      console.error('Failed to resolve comment:', e)
    }
  }, [resolveDocumentComment])

  // Save a version snapshot of the active document
  const handleSaveVersion = useCallback(async () => {
    if (!activeDocId) return
    try {
      await saveDocumentVersion({ documentId: activeDocId })
    } catch (e) {
      console.error('Failed to save version:', e)
    }
  }, [activeDocId, saveDocumentVersion])

  // Restore a previous version
  const handleRestoreVersion = useCallback(async (versionId: bigint) => {
    if (!activeDocId) return
    try {
      await restoreDocumentVersion({ documentId: activeDocId, versionId })
    } catch (e) {
      console.error('Failed to restore version:', e)
    }
  }, [activeDocId, restoreDocumentVersion])

  // Export helpers
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const sanitizeFilename = useCallback((title: string) => {
    return title.replace(/[^a-zA-Z0-9_-]/g, '_')
  }, [])

  // Export to Markdown
  const handleExportMarkdown = useCallback(async () => {
    if (!editorInstanceRef.current || !activeDoc) return
    try {
      const markdown = await editorInstanceRef.current.blocksToMarkdownLossy(editorInstanceRef.current.document)
      downloadFile(markdown, `${sanitizeFilename(activeDoc.title)}.md`, 'text/markdown')
    } catch (e) {
      console.error('Markdown export failed:', e)
    }
    setShowExportMenu(false)
  }, [activeDoc, downloadFile, sanitizeFilename])

  // Export to HTML
  const handleExportHTML = useCallback(async () => {
    if (!editorInstanceRef.current || !activeDoc) return
    try {
      const html = await editorInstanceRef.current.blocksToHTMLLossy(editorInstanceRef.current.document)
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeDoc.title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.25rem; margin-top: 1.5rem; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; }
    th { background: #f9fafb; font-weight: 600; }
    blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin-left: 0; color: #4b5563; }
    ul[data-type="taskList"] li { list-style: none; }
  </style>
</head>
<body>
<h1>${activeDoc.title}</h1>
${html}
</body>
</html>`
      downloadFile(fullHtml, `${sanitizeFilename(activeDoc.title)}.html`, 'text/html')
    } catch (e) {
      console.error('HTML export failed:', e)
    }
    setShowExportMenu(false)
  }, [activeDoc, downloadFile, sanitizeFilename])

  // Export to JSON (raw BlockNote)
  const handleExportJSON = useCallback(() => {
    if (!editorInstanceRef.current || !activeDoc) return
    try {
      const json = JSON.stringify(editorInstanceRef.current.document, null, 2)
      downloadFile(json, `${sanitizeFilename(activeDoc.title)}.json`, 'application/json')
    } catch (e) {
      console.error('JSON export failed:', e)
    }
    setShowExportMenu(false)
  }, [activeDoc, downloadFile, sanitizeFilename])

  // Legacy export handler (backward compat — defaults to markdown)
  const handleExport = handleExportMarkdown

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!activeDoc) return
      const mod = e.metaKey || e.ctrlKey
      // Ctrl+S — save version
      if (mod && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        handleSaveVersion()
      }
      // Ctrl+Shift+E — export markdown
      if (mod && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        handleExportMarkdown()
      }
      // Ctrl+Shift+F — toggle focus mode
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setFocusMode(f => !f)
      }
      // Escape — exit focus mode
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeDoc, focusMode, handleSaveVersion, handleExportMarkdown])

  // ---- Editor View ----
  if (activeDoc) {
    const isWhiteboard = activeDoc.docType?.tag === 'Whiteboard'
    const parsedContent = parseContent(activeDoc.content)

    return (
      <div className="flex h-full flex-col">
        {/* Editor header */}
        <div className={`flex items-center gap-3 border-b px-4 py-2.5 shrink-0 transition-all ${focusMode ? 'h-0 overflow-hidden border-b-0 py-0' : ''}`}>
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
            {!isWhiteboard && (() => {
              const status = getDocStatus(activeDoc.id)
              const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
                Draft: { label: 'Draft', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
                InReview: { label: 'In Review', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                Published: { label: 'Published', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                Archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
              }
              const cfg = statusConfig[status] ?? statusConfig.Draft
              return (
                <div className="relative group/status">
                  <button className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all hover:ring-1 hover:ring-primary/20 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <CircleDot className="size-2.5" />
                    {cfg.label}
                  </button>
                  <div className="absolute top-full left-0 mt-1 z-50 hidden group-hover/status:block">
                    <div className="bg-popover border rounded-lg shadow-lg p-1 min-w-[120px]">
                      {(['Draft', 'InReview', 'Published', 'Archived'] as const).map((s) => {
                        const sc = statusConfig[s]
                        return (
                          <button
                            key={s}
                            onClick={() => setDocumentLifecycle({ documentId: activeDoc.id, status: { tag: s } as any })}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors ${status === s ? 'bg-muted' : ''}`}
                          >
                            <CircleDot className={`size-3 ${sc.color}`} />
                            <span>{sc.label}</span>
                            {status === s && <Check className="size-3 ml-auto text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}
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
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant={showComments ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { setShowComments(!showComments); if (!showComments) setShowVersions(false) }}
              className="h-7 gap-1.5 text-xs relative"
              title="Comments"
            >
              <MessageSquare className="size-3.5" />
              {docComments.count > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-violet-500 text-[9px] text-white flex items-center justify-center font-medium">
                  {docComments.count}
                </span>
              )}
            </Button>
            <Button
              variant={showVersions ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { setShowVersions(!showVersions); if (!showVersions) setShowComments(false) }}
              className="h-7 gap-1.5 text-xs"
              title="Version history"
            >
              <History className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveVersion}
              className="h-7 gap-1.5 text-xs"
              title="Save version snapshot"
            >
              <Save className="size-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5" />
            {!isWhiteboard && (
              <Button
                variant={showToc ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => { setShowToc(!showToc); if (!showToc) { setShowComments(false); setShowVersions(false) } }}
                className="h-7 gap-1.5 text-xs"
                title="Table of Contents"
              >
                <List className="size-3.5" />
              </Button>
            )}
            {!isWhiteboard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullWidth(!fullWidth)}
                className="h-7 gap-1.5 text-xs"
                title={fullWidth ? 'Compact width' : 'Full width'}
              >
                {fullWidth ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </Button>
            )}
            {!isWhiteboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  className="h-7 gap-1.5 text-xs"
                  title="Import from Markdown"
                >
                  <CopyPlus className="size-3.5" />
                </Button>
            )}
            {!isWhiteboard && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="h-7 gap-1.5 text-xs"
                  title="Export document"
                >
                  <Download className="size-3.5" />
                </Button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-1 min-w-[180px]">
                      <button
                        onClick={handleExportMarkdown}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left"
                      >
                        <FileText className="size-3.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Markdown</span>
                          <span className="text-muted-foreground ml-1">.md</span>
                        </div>
                        <kbd className="ml-auto text-[9px] text-muted-foreground bg-muted px-1 rounded">^+E</kbd>
                      </button>
                      <button
                        onClick={handleExportHTML}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left"
                      >
                        <FileCode className="size-3.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">HTML</span>
                          <span className="text-muted-foreground ml-1">.html</span>
                        </div>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left"
                      >
                        <FileJson className="size-3.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">JSON</span>
                          <span className="text-muted-foreground ml-1">.json</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {!isWhiteboard && (
              <Button
                variant={focusMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className="h-7 gap-1.5 text-xs"
                title={focusMode ? 'Exit focus mode (Esc)' : 'Focus mode (Ctrl+Shift+F)'}
              >
                <Focus className="size-3.5" />
              </Button>
            )}
            {!isWhiteboard && (
              <Button
                variant={showStatsPanel ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => { setShowStatsPanel(!showStatsPanel); if (!showStatsPanel) { setShowComments(false); setShowVersions(false); setShowToc(false) } }}
                className="h-7 gap-1.5 text-xs"
                title="Document stats"
              >
                <Hash className="size-3.5" />
              </Button>
            )}
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
            {/* Word count */}
            {activeDocWordCount !== null && !focusMode && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BarChart3 className="size-3" />
                {activeDocWordCount.toLocaleString()} words
                <span className="mx-0.5">·</span>
                {Math.max(1, Math.ceil(activeDocWordCount / 200))} min read
              </span>
            )}
            {/* Last edited by */}
            {lastEditedByName && (
              <span className="text-[10px] text-muted-foreground">
                Last edited by {lastEditedByName}
              </span>
            )}
          </div>
        </div>

        {/* Tags bar */}
        <div className={`flex items-center gap-2 px-4 py-1.5 border-b bg-muted/30 transition-all ${focusMode ? 'h-0 overflow-hidden border-b-0 py-0' : ''}`}>
          <Tag className="size-3 text-muted-foreground shrink-0" />
          {(docTagsMap.get(activeDoc.id.toString()) ?? []).map(tag => {
            const tagObj = allDocTags.find(t => t.documentId === activeDoc.id && t.tag === tag)
            return (
              <span key={tag} className="group inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 text-[10px] font-medium">
                {tag}
                {tagObj && (
                  <button
                    onClick={() => removeDocumentTag({ tagId: tagObj.id })}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all"
                  >
                    <X className="size-2.5" />
                  </button>
                )}
              </span>
            )
          })}
          <input
            type="text"
            placeholder="Add tag..."
            className="bg-transparent text-[10px] text-muted-foreground outline-none w-20 placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                addDocumentTag({ documentId: activeDoc.id, tag: (e.target as HTMLInputElement).value.trim() })
                ;(e.target as HTMLInputElement).value = ''
              }
            }}
          />
        </div>

        {/* Cover image banner */}
        {!isWhiteboard && (activeDocMeta?.coverGradient || activeDocMeta?.coverUrl) && !focusMode && (
          <div className="relative group/cover shrink-0">
            <div className={`h-40 w-full bg-gradient-to-r ${activeDocMeta?.coverGradient || 'from-violet-500 to-indigo-600'}`}>
              {activeDocMeta?.coverUrl && (
                <img src={activeDocMeta.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => setShowCoverPicker(true)}
                className="px-2 py-1 rounded-md bg-black/40 hover:bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm transition-colors"
              >
                Change cover
              </button>
              <button
                onClick={handleRemoveCover}
                className="px-2 py-1 rounded-md bg-black/40 hover:bg-red-500/80 text-white text-[10px] font-medium backdrop-blur-sm transition-colors"
              >
                Remove
              </button>
            </div>
            {/* Emoji icon overlay on cover */}
            {activeDocMeta?.icon && (
              <div className="absolute -bottom-6 left-8">
                <button
                  onClick={() => setShowEmojiPicker(true)}
                  className="text-5xl hover:scale-110 transition-transform cursor-pointer drop-shadow-lg"
                  title="Change icon"
                >
                  {activeDocMeta.icon}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add cover/icon buttons (when no cover) */}
        {!isWhiteboard && !activeDocMeta?.coverGradient && !activeDocMeta?.coverUrl && !focusMode && (
          <div className="flex items-center gap-2 px-8 pt-3 shrink-0">
            {!activeDocMeta?.icon && (
              <button
                onClick={() => setShowEmojiPicker(true)}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                😀 Add icon
              </button>
            )}
            {activeDocMeta?.icon && !activeDocMeta?.coverGradient && (
              <button
                onClick={() => setShowEmojiPicker(true)}
                className="text-4xl hover:scale-110 transition-transform cursor-pointer mb-1"
                title="Change icon"
              >
                {activeDocMeta.icon}
              </button>
            )}
            <button
              onClick={() => setShowCoverPicker(true)}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              🖼️ Add cover
            </button>
          </div>
        )}

        {/* Cover gradient picker popover */}
        {showCoverPicker && (
          <div className="absolute z-50 top-20 right-4 bg-popover border rounded-xl shadow-xl p-4 w-72">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Cover Image</h4>
              <button onClick={() => setShowCoverPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => handleSetCover(g.value)}
                  className={`h-12 rounded-lg bg-gradient-to-r ${g.value} hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all ${activeDocMeta?.coverGradient === g.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  title={g.name}
                />
              ))}
            </div>
            {activeDocMeta?.coverGradient && (
              <button
                onClick={handleRemoveCover}
                className="w-full mt-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 py-1.5 rounded transition-colors"
              >
                Remove cover
              </button>
            )}
          </div>
        )}

        {/* Emoji picker popover */}
        {showEmojiPicker && (
          <div className="absolute z-50 top-20 left-8 bg-popover border rounded-xl shadow-xl p-4 w-72">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Page Icon</h4>
              <button onClick={() => setShowEmojiPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DOC_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSetEmoji(emoji)}
                  className={`text-xl p-1.5 rounded-lg hover:bg-muted transition-colors ${activeDocMeta?.icon === emoji ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {activeDocMeta?.icon && (
              <button
                onClick={() => handleSetEmoji('')}
                className="w-full mt-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 py-1.5 rounded transition-colors"
              >
                Remove icon
              </button>
            )}
          </div>
        )}

        {/* Import from Markdown dialog */}
        {showImportDialog && (
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import from Markdown</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Paste Markdown content below. This will replace the current document content.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="# Paste your markdown here..."
                  className="w-full h-64 rounded-lg border bg-muted/30 p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".md,.markdown,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = () => setImportText(reader.result as string)
                          reader.readAsText(file)
                        }
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors cursor-pointer">
                      <Download className="size-3.5" />
                      Upload .md file
                    </span>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={handleImportMarkdown} disabled={!importText.trim()}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Editor body + sidebar */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main editor area */}
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
                onHeadingsChange={setHeadings}
                onStatsChange={setEditorStats}
                onEditorReady={(editor: any) => { editorInstanceRef.current = editor }}
                fullWidth={fullWidth}
                focusMode={focusMode}
              />
            )}
          </div>

          {/* Comments sidebar */}
          {showComments && (
            <div className="w-80 border-l flex flex-col bg-background shrink-0">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-violet-400" />
                  <h3 className="text-sm font-semibold">Comments</h3>
                  {docComments.count > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{docComments.count}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowComments(false)} className="h-6 w-6 p-0">
                  <span className="sr-only">Close</span>
                  <span className="text-xs text-muted-foreground">&times;</span>
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {docComments.threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <MessageSquare className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No comments yet</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Start the conversation below</p>
                    </div>
                  ) : (
                    docComments.threads.map(({ comment, replies }) => {
                      const author = employeeMap.get(comment.author.toHexString())
                      const initials = author?.name
                        ? author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        : '??'
                      const isOwn = comment.author.toHexString() === myHex
                      const isEditing = editingCommentId === comment.id
                      return (
                        <div key={comment.id.toString()} className={`rounded-lg border transition-colors ${comment.resolved ? 'bg-muted/30 border-muted opacity-70' : 'bg-card/50 hover:bg-card'}`}>
                          {/* Top-level comment */}
                          <div className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] text-white font-medium shrink-0 mt-0.5">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium truncate">{author?.name ?? 'Unknown'}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatTimeAgo(timestampToDate(comment.createdAt))}
                                  </span>
                                  {comment.resolved && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-emerald-500 border-emerald-500/30">
                                      <CheckCircle2 className="size-2.5 mr-0.5" /> Resolved
                                    </Badge>
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="mt-1 space-y-1.5">
                                    <Input
                                      value={editCommentText}
                                      onChange={(e) => setEditCommentText(e.target.value)}
                                      className="h-7 text-xs"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleEditComment() }
                                        if (e.key === 'Escape') { setEditingCommentId(null); setEditCommentText('') }
                                      }}
                                      autoFocus
                                    />
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-5 text-[10px] px-2" onClick={handleEditComment}>Save</Button>
                                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => { setEditingCommentId(null); setEditCommentText('') }}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">{comment.content}</p>
                                )}
                                {/* Actions row */}
                                {!isEditing && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                      onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }}
                                    >
                                      <CornerDownRight className="size-2.5 mr-0.5" /> Reply
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-5 px-1.5 text-[10px] ${comment.resolved ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                                      onClick={() => handleResolveComment(comment.id)}
                                    >
                                      <CheckCircle2 className="size-2.5 mr-0.5" /> {comment.resolved ? 'Unresolve' : 'Resolve'}
                                    </Button>
                                    {isOwn && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                          onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content) }}
                                        >
                                          <Pencil className="size-2.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                                          onClick={() => handleDeleteComment(comment.id)}
                                        >
                                          <Trash2 className="size-2.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="border-t bg-muted/20">
                              {replies.map((reply: any) => {
                                const rAuthor = employeeMap.get(reply.author.toHexString())
                                const rInitials = rAuthor?.name
                                  ? rAuthor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                  : '??'
                                const rIsOwn = reply.author.toHexString() === myHex
                                const rIsEditing = editingCommentId === reply.id
                                return (
                                  <div key={reply.id.toString()} className="px-3 py-2 flex items-start gap-2 ml-4 border-t first:border-t-0 border-muted/40">
                                    <div className="size-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-[7px] text-white font-medium shrink-0 mt-0.5">
                                      {rInitials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[10px] font-medium truncate">{rAuthor?.name ?? 'Unknown'}</span>
                                        <span className="text-[9px] text-muted-foreground">{formatTimeAgo(timestampToDate(reply.createdAt))}</span>
                                      </div>
                                      {rIsEditing ? (
                                        <div className="space-y-1">
                                          <Input
                                            value={editCommentText}
                                            onChange={(e) => setEditCommentText(e.target.value)}
                                            className="h-6 text-[10px]"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') { e.preventDefault(); handleEditComment() }
                                              if (e.key === 'Escape') { setEditingCommentId(null); setEditCommentText('') }
                                            }}
                                            autoFocus
                                          />
                                          <div className="flex gap-1">
                                            <Button size="sm" className="h-4 text-[9px] px-1.5" onClick={handleEditComment}>Save</Button>
                                            <Button size="sm" variant="ghost" className="h-4 text-[9px] px-1.5" onClick={() => { setEditingCommentId(null); setEditCommentText('') }}>Cancel</Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-foreground/80 whitespace-pre-wrap break-words">{reply.content}</p>
                                      )}
                                      {!rIsEditing && rIsOwn && (
                                        <div className="flex items-center gap-0.5 mt-1">
                                          <Button variant="ghost" size="sm" className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground"
                                            onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content) }}>
                                            <Pencil className="size-2" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-4 px-1 text-[9px] text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDeleteComment(reply.id)}>
                                            <Trash2 className="size-2" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Reply input */}
                          {replyingTo === comment.id && (
                            <div className="px-3 py-2 border-t bg-muted/10">
                              <div className="flex gap-1.5 ml-4">
                                <Input
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="h-7 text-[11px] flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleAddComment(comment.id)
                                    }
                                    if (e.key === 'Escape') { setReplyingTo(null); setReplyText('') }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddComment(comment.id)}
                                  disabled={!replyText.trim()}
                                  className="h-7 w-7 p-0 shrink-0"
                                >
                                  <Send className="size-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
              {/* Comment input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddComment()}
                    disabled={!commentText.trim()}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Version History sidebar */}
          {showVersions && (
            <div className="w-80 border-l flex flex-col bg-background shrink-0">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Version History</h3>
                  {docVersions.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{docVersions.length}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowVersions(false)} className="h-6 w-6 p-0">
                  <span className="sr-only">Close</span>
                  <span className="text-xs text-muted-foreground">&times;</span>
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {/* Current version */}
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-medium text-green-400">Current Version</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Auto-saved {saveStatus === 'saved' ? 'just now' : formatTimeAgo(timestampToDate(activeDoc.updatedAt))}
                    </p>
                  </div>

                  {docVersions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <History className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No saved versions</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Click the save icon to create a snapshot</p>
                    </div>
                  ) : (
                    docVersions.map((version) => {
                      const author = employeeMap.get(version.createdBy.toHexString())
                      return (
                        <div key={version.id.toString()} className="group rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground/90">v{version.versionNumber.toString()}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimeAgo(timestampToDate(version.createdAt))}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreVersion(version.id)}
                              className="h-6 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-300"
                            >
                              <RotateCcw className="size-3" />
                              Restore
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {version.title}
                          </p>
                          {author && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              by {author.name}
                            </p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
              {/* Save version button */}
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveVersion}
                  className="w-full h-8 gap-1.5 text-xs"
                >
                  <Save className="size-3.5" />
                  Save Version Snapshot
                </Button>
              </div>
            </div>
          )}

          {/* Table of Contents sidebar */}
          {showToc && !isWhiteboard && (
            <div className="w-64 border-l flex flex-col bg-background shrink-0">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="size-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Contents</h3>
                  {headings.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{headings.length}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowToc(false)} className="h-6 w-6 p-0">
                  <span className="sr-only">Close</span>
                  <span className="text-xs text-muted-foreground">&times;</span>
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-0.5">
                  {headings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <AlignLeft className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No headings yet</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Add headings to generate a table of contents</p>
                    </div>
                  ) : (
                    headings.map((heading, idx) => (
                      <button
                        key={`${heading.id}-${idx}`}
                        onClick={() => scrollToBlock(heading.id)}
                        className="w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors truncate group"
                        style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                        title={heading.text}
                      >
                        <span className={`${
                          heading.level === 1 ? 'font-semibold text-foreground' :
                          heading.level === 2 ? 'font-medium text-foreground/80' :
                          'text-muted-foreground'
                        } group-hover:text-foreground transition-colors`}>
                          {heading.text}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Document Stats sidebar */}
          {showStatsPanel && !isWhiteboard && (
            <div className="w-72 border-l flex flex-col bg-background shrink-0">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">Document Stats</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowStatsPanel(false)} className="h-6 w-6 p-0">
                  <span className="sr-only">Close</span>
                  <span className="text-xs text-muted-foreground">&times;</span>
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Type className="size-4 text-blue-400 mx-auto mb-1" />
                      <p className="text-lg font-bold tabular-nums">{editorStats?.words?.toLocaleString() ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Words</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <AlignJustify className="size-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-lg font-bold tabular-nums">{editorStats?.characters?.toLocaleString() ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Characters</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <List className="size-4 text-amber-400 mx-auto mb-1" />
                      <p className="text-lg font-bold tabular-nums">{editorStats?.paragraphs ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Paragraphs</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <BookOpen className="size-4 text-violet-400 mx-auto mb-1" />
                      <p className="text-lg font-bold tabular-nums">{editorStats?.readingTime ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Min Read</p>
                    </div>
                  </div>

                  {/* Headings breakdown */}
                  <div className="rounded-lg border p-3">
                    <h4 className="text-xs font-semibold mb-2">Structure</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Headings</span>
                        <span className="font-medium tabular-nums">{editorStats?.headings ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Comments</span>
                        <span className="font-medium tabular-nums">{docComments.count}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Versions</span>
                        <span className="font-medium tabular-nums">{docVersions.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Tags</span>
                        <span className="font-medium tabular-nums">{(docTagsMap.get(activeDoc.id.toString()) ?? []).length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard shortcuts reference */}
                  <div className="rounded-lg border p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <Keyboard className="size-3.5" />
                      Shortcuts
                    </h4>
                    <div className="space-y-1.5">
                      {[
                        { keys: 'Ctrl+S', action: 'Save version' },
                        { keys: 'Ctrl+Shift+E', action: 'Export markdown' },
                        { keys: 'Ctrl+Shift+F', action: 'Focus mode' },
                        { keys: 'Esc', action: 'Exit focus mode' },
                        { keys: '/', action: 'Slash commands' },
                        { keys: 'Ctrl+B', action: 'Bold text' },
                        { keys: 'Ctrl+I', action: 'Italic text' },
                      ].map(s => (
                        <div key={s.keys} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{s.action}</span>
                          <kbd className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">{s.keys}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Focus mode overlay bar */}
        {focusMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-popover/95 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg">
            <Focus className="size-3.5 text-violet-400" />
            <span className="text-xs text-muted-foreground">Focus Mode</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-[10px] text-muted-foreground tabular-nums">{editorStats?.words?.toLocaleString() ?? 0} words</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusMode(false)}
              className="h-6 px-2 text-[10px] gap-1"
            >
              <X className="size-3" />
              Exit
            </Button>
          </div>
        )}
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
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <PenTool className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">
            <GradientText colors={['#8b5cf6', '#6366f1', '#a78bfa']} animationSpeed={6}>Canvas</GradientText>
          </h1>
          <Badge variant="secondary" className="text-xs">
            {canvasDocuments.filter((d) => d.docType?.tag !== 'Folder').length}
          </Badge>
          <BlurText text="Collaborative documents and whiteboards" delay={35} animateBy="words" className="text-xs text-muted-foreground hidden lg:block" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search titles &amp; content..."
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
        <div className="p-6 space-y-6">
          {/* Stats row */}
          {currentFolderId === null && !searchQuery && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { label: 'Documents', value: docStats.documents, icon: FileText, color: 'from-blue-500/20 to-blue-600/5' },
                { label: 'Whiteboards', value: docStats.whiteboards, icon: PenTool, color: 'from-emerald-500/20 to-emerald-600/5' },
                { label: 'Folders', value: docStats.folders, icon: Folder, color: 'from-amber-500/20 to-amber-600/5' },
                { label: 'Shared', value: docStats.shared, icon: Users, color: 'from-violet-500/20 to-violet-600/5' },
              ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map((stat) => (
                <SpotlightCard key={stat.label} className="!p-4 !rounded-xl" spotlightColor="rgba(139, 92, 246, 0.15)">
                  <div className={`size-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                    <stat.icon className="size-4 text-foreground/70" />
                  </div>
                  <div className="text-xl font-bold"><CountUp to={stat.value} duration={1.5} /></div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </SpotlightCard>
              ))}
            </div>
          )}

          {/* Filter pills */}
          {currentFolderId === null && (
            <div className="flex items-center gap-2">
              {([
                { id: 'all' as const, label: 'All' },
                { id: 'documents' as const, label: 'Documents' },
                { id: 'whiteboards' as const, label: 'Whiteboards' },
                { id: 'starred' as const, label: 'Starred' },
              ]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setListFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    listFilter === f.id
                      ? 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {f.id === 'starred' && <Star className="size-3 inline mr-1" />}
                  {f.label}
                  {f.id === 'starred' && starredIds.size > 0 && (
                    <span className="ml-1 text-[10px]">({starredIds.size})</span>
                  )}
                </button>
              ))}
              <Separator orientation="vertical" className="h-4 mx-1" />
              {([
                { id: 'all' as const, label: 'All Status' },
                { id: 'draft' as const, label: 'Draft', color: 'text-zinc-500' },
                { id: 'inReview' as const, label: 'In Review', color: 'text-amber-500' },
                { id: 'published' as const, label: 'Published', color: 'text-emerald-500' },
                { id: 'archived' as const, label: 'Archived', color: 'text-slate-400' },
              ]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                    statusFilter === f.id
                      ? 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {f.id !== 'all' && <CircleDot className={`size-2.5 ${f.color}`} />}
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Recent Documents - only at root with no search */}
          {currentFolderId === null && !searchQuery && listFilter === 'all' && recentDocs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recently Updated</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {recentDocs.map((doc) => {
                  const isWhiteboard = doc.docType?.tag === 'Whiteboard'
                  return (
                    <button
                      key={doc.id.toString()}
                      onClick={() => setActiveDocId(doc.id)}
                      className="flex-shrink-0 w-48 rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 group"
                    >
                      <div className={`h-16 rounded-lg mb-2 flex items-center justify-center ${
                        isWhiteboard ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5' : 'bg-gradient-to-br from-blue-500/10 to-blue-500/5'
                      }`}>
                        {isWhiteboard ? <PenTool className="size-6 text-emerald-400/50" /> : <FileText className="size-6 text-blue-400/50" />}
                      </div>
                      <p className="text-xs font-medium truncate">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTimeAgo(timestampToDate(doc.updatedAt))}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {typeFilteredDocuments.length === 0 ? (
            <EmptyState
              inFolder={currentFolderId !== null}
              onCreateClick={() => setShowCreate(true)}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {typeFilteredDocuments.map((doc) => (
                <CanvasCard
                  key={doc.id.toString()}
                  doc={doc}
                  employeeMap={employeeMap}
                  starred={starredIds.has(doc.id)}
                  pinned={pinnedIds.has(doc.id)}
                  tags={docTagsMap.get(doc.id.toString()) ?? []}
                  status={getDocStatus(doc.id)}
                  meta={docMetaMap.get(doc.id.toString())}
                  viewCount={docViewCounts.get(doc.id.toString()) ?? 0}
                  onToggleStar={() => toggleStar(doc.id)}
                  onOpen={() => {
                    if (doc.docType?.tag === 'Folder') {
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
                  onDuplicate={() => duplicateDocument({ documentId: doc.id })}
                  onTogglePin={() => togglePin(doc.id)}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-2">
              {typeFilteredDocuments.map((doc) => (
                <CanvasListItem
                  key={doc.id.toString()}
                  doc={doc}
                  employeeMap={employeeMap}
                  starred={starredIds.has(doc.id)}
                  pinned={pinnedIds.has(doc.id)}
                  tags={docTagsMap.get(doc.id.toString()) ?? []}
                  status={getDocStatus(doc.id)}
                  meta={docMetaMap.get(doc.id.toString())}
                  viewCount={docViewCounts.get(doc.id.toString()) ?? 0}
                  onToggleStar={() => toggleStar(doc.id)}
                  onOpen={() => {
                    if (doc.docType?.tag === 'Folder') {
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
                  onDuplicate={() => duplicateDocument({ documentId: doc.id })}
                  onTogglePin={() => togglePin(doc.id)}
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
                            if (!e.id) return false
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
  starred,
  pinned,
  tags,
  status,
  meta,
  viewCount,
  onToggleStar,
  onOpen,
  onDelete,
  onMove,
  onShare,
  onDuplicate,
  onTogglePin,
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  starred: boolean
  pinned: boolean
  tags: string[]
  status: string
  meta?: { icon: string; coverGradient: string; coverUrl: string; description: string } | null
  viewCount: number
  onToggleStar: () => void
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
  onDuplicate: () => void
  onTogglePin: () => void
}) {
  const isFolder = doc.docType?.tag === 'Folder'
  const isWhiteboard = doc.docType?.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null
  const isPrivate = doc.visibility?.tag === 'Private'
  const hasCover = meta?.coverGradient || meta?.coverUrl

  return (
    <ContextMenu>
      <ContextMenuTrigger>
    <div
      onClick={onOpen}
      className="group relative rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Preview area — show cover gradient if set */}
      <div className={`h-32 flex items-center justify-center relative ${
        hasCover
          ? `bg-gradient-to-r ${meta?.coverGradient || 'from-violet-500 to-indigo-600'}`
          : isFolder
            ? 'bg-gradient-to-br from-amber-500/5 to-amber-500/10'
            : isWhiteboard
              ? 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10'
              : 'bg-gradient-to-br from-blue-500/5 to-blue-500/10'
      }`}>
        {hasCover && meta?.coverUrl && (
          <img src={meta.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {hasCover && meta?.icon && (
          <span className="text-4xl drop-shadow-lg relative z-10">{meta.icon}</span>
        )}
        {!hasCover && isFolder ? (
          <FolderOpen className="size-12 text-amber-400/40" />
        ) : !hasCover && isWhiteboard ? (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-foreground/10 rounded-lg rotate-12" />
            <div className="absolute inset-2 border-2 border-foreground/10 rounded-full" />
            <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-foreground/10 rotate-45" />
          </div>
        ) : !hasCover ? (() => {
          const preview = extractPreviewText(doc.content, 100)
          return preview ? (
            <div className="px-5 py-3 w-full h-full flex flex-col justify-center">
              {meta?.icon && <span className="text-2xl mb-1">{meta.icon}</span>}
              <p className="text-[11px] leading-relaxed text-foreground/40 line-clamp-4 font-mono">
                {preview}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 px-6 w-full">
              {meta?.icon && <span className="text-2xl mb-2 block text-center">{meta.icon}</span>}
              <div className="h-2 bg-foreground/10 rounded-full w-3/4" />
              <div className="h-2 bg-foreground/10 rounded-full w-full" />
              <div className="h-2 bg-foreground/10 rounded-full w-2/3" />
              <div className="h-2 bg-foreground/10 rounded-full w-5/6" />
            </div>
          )
        })() : null}
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
          {viewCount > 0 && (
            <span className="flex items-center gap-0.5 ml-1">
              <Eye className="size-2.5" />
              {viewCount}
            </span>
          )}
        </div>
      </div>

      {/* Star + Pin indicators */}
      <div className="absolute top-2 left-2 flex gap-1">
        {starred && <Star className="size-3.5 text-amber-400 fill-amber-400" />}
        {pinned && <Pin className="size-3.5 text-blue-500" />}
      </div>

      {/* Status badge */}
      {!isFolder && status !== 'Draft' && (
        <div className={`absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border backdrop-blur-sm ${
          status === 'InReview' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
          status === 'Published' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
          status === 'Archived' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' :
          'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'
        }`}>
          <CircleDot className="size-2" />
          {status === 'InReview' ? 'Review' : status}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="absolute bottom-[52px] left-2 right-2 flex gap-1 flex-wrap">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium">
              <Tag className="size-2" />{tag}
            </span>
          ))}
          {tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{tags.length - 3}</span>}
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar() }}
            className="p-1.5 rounded-md bg-background/80 border hover:bg-muted transition-colors"
            title={starred ? 'Unstar' : 'Star'}
          >
            <Star className={`size-3.5 ${starred ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
        )}
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
        {!isFolder && (
          <ContextMenuItem onClick={onDuplicate}>
            <CopyPlus className="size-3.5" /> Duplicate
          </ContextMenuItem>
        )}
        {!isFolder && (
          <ContextMenuItem onClick={onTogglePin}>
            {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            {pinned ? 'Unpin' : 'Pin to top'}
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
  starred,
  pinned,
  tags,
  status,
  meta,
  viewCount,
  onToggleStar,
  onOpen,
  onDelete,
  onMove,
  onShare,
  onDuplicate,
  onTogglePin,
}: {
  doc: SpacetimeDocument
  employeeMap: Map<string, any>
  starred: boolean
  pinned: boolean
  tags: string[]
  status: string
  meta?: { icon: string; coverGradient: string; coverUrl: string; description: string } | null
  viewCount: number
  onToggleStar: () => void
  onOpen: () => void
  onDelete: () => void
  onMove: () => void
  onShare: () => void
  onDuplicate: () => void
  onTogglePin: () => void
}) {
  const isFolder = doc.docType?.tag === 'Folder'
  const isWhiteboard = doc.docType?.tag === 'Whiteboard'
  const lastEditor = doc.lastEditedBy ? employeeMap.get(doc.lastEditedBy.toHexString()) : null

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-sm hover:border-primary/20"
    >
      <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${
        meta?.coverGradient
          ? `bg-gradient-to-r ${meta.coverGradient}`
          : isFolder
            ? 'bg-amber-500/10'
            : isWhiteboard
              ? 'bg-emerald-500/10'
              : 'bg-blue-500/10'
      }`}>
        {meta?.icon ? (
          <span className="text-xl">{meta.icon}</span>
        ) : isFolder ? (
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
          {!isFolder && status !== 'Draft' && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium border shrink-0 ${
              status === 'InReview' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
              status === 'Published' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
              status === 'Archived' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' :
              'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'
            }`}>
              <CircleDot className="size-2" />
              {status === 'InReview' ? 'Review' : status}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isFolder ? 'Folder' : isWhiteboard ? 'Whiteboard' : 'Document'} · Updated {formatTimeAgo(timestampToDate(doc.updatedAt))}
          {lastEditor && <span> · Last edited by {lastEditor.name}</span>}
        </p>
        {!isFolder && !isWhiteboard && (() => {
          const preview = extractPreviewText(doc.content, 80)
          return preview ? (
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{preview}</p>
          ) : null
        })()}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar() }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title={starred ? 'Unstar' : 'Star'}
          >
            <Star className={`size-3.5 ${starred ? 'text-amber-400 fill-amber-400' : ''}`} />
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
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {/* Indicators */}
      <div className="flex items-center gap-1 shrink-0">
        {pinned && <Pin className="size-3 text-blue-500 shrink-0" />}
        {starred && !isFolder && <Star className="size-3 text-amber-400 fill-amber-400 shrink-0" />}
      </div>
      {tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {tags.slice(0, 2).map(tag => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium">
              <Tag className="size-2" />{tag}
            </span>
          ))}
          {tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{tags.length - 2}</span>}
        </div>
      )}
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
