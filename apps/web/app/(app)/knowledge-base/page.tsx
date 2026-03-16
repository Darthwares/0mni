'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import {
  Search,
  Book,
  Package,
  Palette,
  Users,
  Settings,
  Rocket,
  Shield,
  FileText,
  Eye,
  ThumbsUp,
  Pin,
  ArrowLeft,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Download,
  BarChart3,
  List,
  Hash,
  AlignLeft,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { exportCSV } from '@/lib/csv-export'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import {
  extractPreviewText,
  extractHeadingsFromContent,
  computeStatsFromContent,
  scrollToBlock,
  type HeadingItem,
  type DocumentStats,
} from '@/components/block-editor'

// Dynamic import for BlockNote editor (heavy component)
const BlockEditor = dynamic(() => import('@/components/block-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse mx-auto mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading editor...</p>
      </div>
    </div>
  ),
})

// ---- Category config --------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string; gradient: string }> = {
  Engineering: { icon: Book, color: 'violet', label: 'Engineering', gradient: 'from-violet-500 to-purple-600' },
  Product: { icon: Package, color: 'blue', label: 'Product', gradient: 'from-blue-500 to-indigo-600' },
  Design: { icon: Palette, color: 'pink', label: 'Design', gradient: 'from-pink-500 to-rose-600' },
  Hr: { icon: Users, color: 'amber', label: 'HR & People', gradient: 'from-amber-500 to-orange-600' },
  Operations: { icon: Settings, color: 'emerald', label: 'Operations', gradient: 'from-emerald-500 to-green-600' },
  Onboarding: { icon: Rocket, color: 'orange', label: 'Onboarding', gradient: 'from-orange-500 to-red-500' },
  Security: { icon: Shield, color: 'red', label: 'Security', gradient: 'from-red-500 to-rose-600' },
  General: { icon: FileText, color: 'neutral', label: 'General', gradient: 'from-neutral-500 to-neutral-600' },
}

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG)

const KB_COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  neutral: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
}

function categoryBadgeClass(cat: string): string {
  const c = CATEGORY_CONFIG[cat]?.color ?? 'neutral'
  return KB_COLOR_CLASSES[c] ?? KB_COLOR_CLASSES.neutral
}

// ---- Helpers ----------------------------------------------------------------

function timestampToDate(ts: any): Date {
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'number') return new Date(ts / 1000)
  return new Date()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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

/** Detect if content is BlockNote JSON or plain text */
function isBlockNoteContent(content: string): boolean {
  if (!content) return false
  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed)
  } catch {
    return false
  }
}

/** Get reading time from content (supports both BlockNote JSON and plain text) */
function getReadingTime(content: string): number {
  if (!content) return 1
  if (isBlockNoteContent(content)) {
    const stats = computeStatsFromContent(content)
    return stats?.readingTime ?? 1
  }
  const words = content.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/** Get preview text from content (supports both BlockNote JSON and plain text) */
function getPreviewText(content: string, maxLength = 140): string {
  if (!content) return ''
  if (isBlockNoteContent(content)) {
    return extractPreviewText(content, maxLength)
  }
  return content.length > maxLength ? content.slice(0, maxLength) + '...' : content
}

/** Get word count from content */
function getWordCount(content: string): number {
  if (!content) return 0
  if (isBlockNoteContent(content)) {
    const stats = computeStatsFromContent(content)
    return stats?.words ?? 0
  }
  return content.split(/\s+/).filter(Boolean).length
}

type SortOption = 'recent' | 'views' | 'helpful'
type ViewState = 'list' | 'reading' | 'editing' | 'creating'

// =============================================================================
// Page component
// =============================================================================

export default function KnowledgeBasePage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()

  const [allArticles] = useTable(tables.kb_article)
  const [employees] = useTable(tables.employee)

  const createKbArticle = useReducer(reducers.createKbArticle)
  const updateKbArticle = useReducer(reducers.updateKbArticle)
  const deleteKbArticle = useReducer(reducers.deleteKbArticle)
  const togglePin = useReducer(reducers.toggleKbArticlePin)
  const markHelpful = useReducer(reducers.markKbArticleHelpful)
  const incrementViews = useReducer(reducers.incrementKbArticleViews)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<bigint | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewState, setViewState] = useState<ViewState>('list')
  const [showToc, setShowToc] = useState(true)
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [editorStats, setEditorStats] = useState<DocumentStats | null>(null)

  // Create/Edit form state
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState('General')
  const [formTags, setFormTags] = useState('')
  const [formContent, setFormContent] = useState<any>(null)
  const [editArticleId, setEditArticleId] = useState<bigint | null>(null)
  const editorRef = useRef<any>(null)

  // Employee map
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.filter(e => e.id).forEach((e) => map.set(e.id.toHexString(), e))
    return map
  }, [employees])

  // Org-scoped articles
  const orgArticles = useMemo(() => {
    if (currentOrgId === null) return []
    return allArticles.filter(a => a.orgId === BigInt(currentOrgId))
  }, [allArticles, currentOrgId])

  // Stats
  const totalViews = useMemo(() => orgArticles.reduce((sum, a) => sum + a.views, 0), [orgArticles])
  const pinnedCount = useMemo(() => orgArticles.filter((a) => a.pinned).length, [orgArticles])
  const totalWords = useMemo(() => orgArticles.reduce((sum, a) => sum + getWordCount(a.content), 0), [orgArticles])
  const categories = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of orgArticles) {
      const tag = a.category?.tag ?? 'General'
      counts[tag] = (counts[tag] || 0) + 1
    }
    return counts
  }, [orgArticles])
  const uniqueCategories = useMemo(() => {
    const cats = new Set(orgArticles.map((a) => a.category?.tag ?? 'General'))
    return cats.size
  }, [orgArticles])

  // Filtered & sorted
  const filteredArticles = useMemo(() => {
    let result = [...orgArticles]

    if (selectedCategory) {
      result = result.filter((a) => (a.category?.tag ?? 'General') === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          getPreviewText(a.content, 500).toLowerCase().includes(q) ||
          a.tags.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      switch (sortBy) {
        case 'views':
          return b.views - a.views
        case 'helpful':
          return b.helpful - a.helpful
        case 'recent':
        default:
          return timestampToDate(b.updatedAt).getTime() - timestampToDate(a.updatedAt).getTime()
      }
    })

    return result
  }, [orgArticles, selectedCategory, searchQuery, sortBy])

  const selectedArticle = useMemo(
    () => (selectedArticleId ? orgArticles.find((a) => a.id === selectedArticleId) ?? null : null),
    [orgArticles, selectedArticleId]
  )

  const pinnedArticles = useMemo(() => orgArticles.filter((a) => a.pinned), [orgArticles])

  // ---- Handlers ----

  const handleViewArticle = useCallback(async (articleId: bigint) => {
    try {
      await incrementViews({ articleId })
    } catch (e) {
      console.error(e)
    }
    setSelectedArticleId(articleId)
    setViewState('reading')
  }, [incrementViews])

  const handleHelpful = useCallback(async (articleId: bigint) => {
    try {
      await markHelpful({ articleId })
    } catch (e) {
      console.error(e)
    }
  }, [markHelpful])

  const handleTogglePin = useCallback(async (articleId: bigint) => {
    try {
      await togglePin({ articleId })
    } catch (e) {
      console.error(e)
    }
  }, [togglePin])

  const handleStartCreate = useCallback(() => {
    setFormTitle('')
    setFormCategory('General')
    setFormTags('')
    setFormContent(null)
    setEditArticleId(null)
    setViewState('creating')
    setHeadings([])
    setEditorStats(null)
  }, [])

  const handleStartEdit = useCallback((article: any) => {
    setEditArticleId(article.id)
    setFormTitle(article.title)
    setFormCategory(article.category?.tag ?? 'General')
    setFormTags(article.tags)
    // Parse BlockNote content or convert plain text
    if (isBlockNoteContent(article.content)) {
      try {
        setFormContent(JSON.parse(article.content))
      } catch {
        setFormContent(null)
      }
    } else {
      // Convert plain text to BlockNote blocks
      const blocks = article.content.split('\n\n').filter(Boolean).map((p: string) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: p }],
      }))
      setFormContent(blocks.length > 0 ? blocks : null)
    }
    setViewState('editing')
  }, [])

  const handleSave = useCallback(async () => {
    if (!formTitle.trim() || currentOrgId === null) return
    const contentStr = formContent ? JSON.stringify(formContent) : ''

    try {
      if (viewState === 'creating') {
        await createKbArticle({
          orgId: BigInt(currentOrgId),
          title: formTitle.trim(),
          content: contentStr,
          categoryTag: formCategory,
          tags: formTags.trim(),
        })
      } else if (viewState === 'editing' && editArticleId) {
        await updateKbArticle({
          articleId: editArticleId,
          title: formTitle.trim(),
          content: contentStr,
          categoryTag: formCategory,
          tags: formTags.trim(),
        })
      }
      setViewState('list')
      setFormTitle('')
      setFormContent(null)
      setFormTags('')
    } catch (e) {
      console.error('Failed to save article:', e)
    }
  }, [formTitle, formContent, formCategory, formTags, currentOrgId, viewState, editArticleId, createKbArticle, updateKbArticle])

  const handleDelete = useCallback(async (articleId: bigint) => {
    try {
      await deleteKbArticle({ articleId })
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null)
        setViewState('list')
      }
    } catch (e) {
      console.error(e)
    }
  }, [deleteKbArticle, selectedArticleId])

  const handleBackToList = useCallback(() => {
    setSelectedArticleId(null)
    setViewState('list')
    setHeadings([])
    setEditorStats(null)
  }, [])

  const handleEditorChange = useCallback((content: any) => {
    setFormContent(content)
  }, [])

  // ---- Render: Editor View (Create / Edit) ----

  if (viewState === 'creating' || viewState === 'editing') {
    return (
      <div className="flex flex-col h-full">
        {/* Editor header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1.5 -ml-1">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <BookOpen className="size-3.5 text-white" />
            </div>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Untitled Article"
              className="flex-1 text-lg font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 min-w-0"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editorStats && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlignLeft className="size-3" />
                {editorStats.words} words
              </span>
            )}
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="h-8 px-2.5 rounded-md border bg-background text-xs font-medium"
            >
              {CATEGORY_KEYS.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleBackToList} className="h-8 gap-1.5">
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!formTitle.trim()} className="h-8 gap-1.5">
              <Save className="size-3.5" />
              {viewState === 'creating' ? 'Publish' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tags bar */}
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30">
          <Hash className="size-3.5 text-muted-foreground shrink-0" />
          <input
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
            placeholder="Add tags (comma-separated)..."
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-auto">
          <BlockEditor
            initialContent={formContent}
            onChange={handleEditorChange}
            onHeadingsChange={setHeadings}
            onStatsChange={setEditorStats}
            editable
          />
        </div>
      </div>
    )
  }

  // ---- Render: Article Reader ----

  if (viewState === 'reading' && selectedArticle) {
    const articleHeadings = extractHeadingsFromContent(selectedArticle.content)
    const articleStats = computeStatsFromContent(selectedArticle.content)
    const authorEmp = employeeMap.get(selectedArticle.author.toHexString())
    const catTag = selectedArticle.category?.tag ?? 'General'
    const catConfig = CATEGORY_CONFIG[catTag] ?? CATEGORY_CONFIG.General
    const CatIcon = catConfig.icon
    const isRichContent = isBlockNoteContent(selectedArticle.content)

    return (
      <div className="flex flex-col h-full">
        {/* Reader header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1.5 -ml-1">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{selectedArticle.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {articleHeadings.length > 0 && (
              <Button
                variant={showToc ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowToc(!showToc)}
                className="h-7 gap-1 text-xs"
              >
                <List className="size-3" />
                TOC
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleTogglePin(selectedArticle.id)} className="h-7 gap-1 text-xs">
              <Pin className={`size-3 ${selectedArticle.pinned ? 'text-amber-500 fill-amber-500' : ''}`} />
              {selectedArticle.pinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleStartEdit(selectedArticle)} className="h-7 gap-1 text-xs">
              <Pencil className="size-3" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedArticle.id)} className="h-7 gap-1 text-xs text-red-500 hover:text-red-400">
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        {/* Reader body */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Article content */}
            <div className="flex-1 min-w-0">
              <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Article title */}
                <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">{selectedArticle.title}</h1>

                {/* Metadata bar */}
                <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-muted-foreground">
                  {authorEmp && (
                    <span className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-semibold">
                        {(authorEmp.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground">{authorEmp.name}</span>
                    </span>
                  )}
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {formatDate(timestampToDate(selectedArticle.updatedAt))}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="size-3.5" />
                    {getReadingTime(selectedArticle.content)} min read
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {selectedArticle.views} views
                  </span>
                  <Badge variant="outline" className={`${categoryBadgeClass(catTag)} gap-1`}>
                    <CatIcon className="size-3" />
                    {catConfig.label}
                  </Badge>
                </div>

                {/* Tags */}
                {selectedArticle.tags && (
                  <div className="flex flex-wrap gap-1.5 mb-8">
                    {selectedArticle.tags.split(',').filter(Boolean).map((tag) => (
                      <Badge key={tag.trim()} variant="secondary" className="text-xs gap-1">
                        <Hash className="size-2.5" />
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Content */}
                {isRichContent ? (
                  <BlockEditor
                    initialContent={JSON.parse(selectedArticle.content)}
                    editable={false}
                  />
                ) : (
                  <div className="prose prose-neutral dark:prose-invert max-w-none">
                    {selectedArticle.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-[15px] leading-relaxed text-foreground/90 mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {/* Helpful footer */}
                <div className="mt-12 pt-6 border-t flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Was this article helpful?</span>
                  <Button variant="outline" size="sm" onClick={() => handleHelpful(selectedArticle.id)} className="gap-1.5">
                    <ThumbsUp className="size-3.5" />
                    Yes ({selectedArticle.helpful})
                  </Button>
                </div>

                {/* Article stats */}
                {articleStats && (
                  <div className="mt-6 grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold tabular-nums">{articleStats.words}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Words</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold tabular-nums">{articleStats.paragraphs}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paragraphs</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold tabular-nums">{articleStats.headings}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Headings</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold tabular-nums">{articleStats.readingTime}m</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Read Time</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table of Contents sidebar */}
            {showToc && articleHeadings.length > 0 && (
              <div className="hidden lg:block w-64 border-l shrink-0 sticky top-0 self-start">
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <List className="size-3.5" />
                    On this page
                  </h4>
                  <nav className="space-y-1">
                    {articleHeadings.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => scrollToBlock(h.id)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors truncate py-1"
                        style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                      >
                        {h.text}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- Render: Article List ----

  return (
    <div className="flex flex-col h-full">
      {/* Top header bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="size-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">
            <GradientText colors={['#8b5cf6', '#7c3aed', '#6d28d9']} animationSpeed={6}>
              Knowledge Base
            </GradientText>
          </h1>
          <Badge variant="secondary" className="text-xs">{orgArticles.length}</Badge>
        </div>
        <BlurText text="Create and share knowledge across your organization" delay={35} animateBy="words" className="text-xs text-muted-foreground ml-0.5 hidden lg:block" />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportCSV('knowledge-base', [
              { header: 'Title', accessor: (a: any) => a.title },
              { header: 'Category', accessor: (a: any) => CATEGORY_CONFIG[a.category?.tag ?? 'General']?.label ?? 'General' },
              { header: 'Author', accessor: (a: any) => employeeMap.get(a.author.toHexString())?.name ?? 'Unknown' },
              { header: 'Views', accessor: (a: any) => a.views },
              { header: 'Helpful', accessor: (a: any) => a.helpful },
              { header: 'Pinned', accessor: (a: any) => a.pinned ? 'Yes' : 'No' },
              { header: 'Tags', accessor: (a: any) => a.tags },
              { header: 'Reading Time', accessor: (a: any) => `${getReadingTime(a.content)} min` },
              { header: 'Updated', accessor: (a: any) => formatDate(timestampToDate(a.updatedAt)) },
            ], filteredArticles)}
          >
            <Download className="size-3.5" />
            Export
          </Button>
          <PresenceBar />
          <Button size="sm" onClick={handleStartCreate} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            New Article
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-6 p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(139,92,246,0.15)">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Articles</p>
              <span className="text-2xl font-bold"><CountUp to={orgArticles.length} /></span>
            </SpotlightCard>
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(139,92,246,0.15)">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Categories</p>
              <span className="text-2xl font-bold"><CountUp to={uniqueCategories} /></span>
            </SpotlightCard>
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(139,92,246,0.15)">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Views</p>
              <span className="text-2xl font-bold"><CountUp to={totalViews} separator="," /></span>
            </SpotlightCard>
            <SpotlightCard className="!p-4 !rounded-xl" spotlightColor="rgba(139,92,246,0.15)">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Words</p>
              <span className="text-2xl font-bold"><CountUp to={totalWords} separator="," /></span>
            </SpotlightCard>
          </div>

          {/* Search bar */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search articles, tags, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Two-panel layout */}
          <div className="flex gap-6 min-h-0">
            {/* Left sidebar */}
            <div className="w-1/4 min-w-[220px] flex-shrink-0 space-y-6">
              {/* Category list */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === null
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>All Articles</span>
                    <span className="text-xs tabular-nums">{orgArticles.length}</span>
                  </button>
                  {CATEGORY_KEYS.map((cat) => {
                    const config = CATEGORY_CONFIG[cat]
                    const Icon = config.icon
                    const count = categories[cat] || 0
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === cat
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {config.label}
                        </span>
                        <span className="text-xs tabular-nums">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Pinned articles */}
              {pinnedArticles.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Pin className="size-3.5 text-amber-500" />
                    Pinned
                  </h3>
                  <div className="space-y-2">
                    {pinnedArticles.map((article) => (
                      <button
                        key={article.id.toString()}
                        onClick={() => handleViewArticle(article.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
                      >
                        <p className="font-medium text-foreground truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{article.title}</p>
                        <p className="text-xs mt-0.5 truncate">
                          {CATEGORY_CONFIG[article.category?.tag ?? 'General']?.label ?? 'General'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick stats */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-violet-500" />
                  Quick Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total articles</span>
                    <span className="font-medium tabular-nums">{orgArticles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pinned</span>
                    <span className="font-medium tabular-nums">{pinnedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total views</span>
                    <span className="font-medium tabular-nums">{totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total words</span>
                    <span className="font-medium tabular-nums">{totalWords.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right content — Article list */}
            <div className="flex-1 min-w-0">
              {/* Sort bar */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground mr-1">Sort by:</span>
                {(['recent', 'views', 'helpful'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      sortBy === option
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {option === 'recent' ? 'Recent' : option === 'views' ? 'Most Viewed' : 'Most Helpful'}
                  </button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                </span>
              </div>

              <ScrollArea className="h-[calc(100vh-26rem)]">
                <div className="space-y-3">
                  {filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <BookOpen className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">No articles found</p>
                      <p className="text-xs text-muted-foreground mb-4">Create one or try a different search</p>
                      <Button size="sm" onClick={handleStartCreate} className="gap-1.5">
                        <Plus className="size-3.5" />
                        New Article
                      </Button>
                    </div>
                  ) : (
                    filteredArticles.map((article) => {
                      const catTag = article.category?.tag ?? 'General'
                      const config = CATEGORY_CONFIG[catTag] ?? CATEGORY_CONFIG.General
                      const Icon = config.icon
                      const excerpt = getPreviewText(article.content, 140)
                      const authorEmp = employeeMap.get(article.author.toHexString())
                      const isRich = isBlockNoteContent(article.content)

                      return (
                        <button
                          key={article.id.toString()}
                          onClick={() => handleViewArticle(article.id)}
                          className="w-full text-left rounded-xl border bg-card p-4 hover:border-violet-500/30 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                {article.pinned && (
                                  <Pin className="size-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                                <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                  {article.title}
                                </h3>
                                {isRich && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0 gap-0.5">
                                    <Sparkles className="size-2.5" />
                                    Rich
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{excerpt}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] h-5 ${categoryBadgeClass(catTag)}`}>
                                  <Icon className="size-3 mr-1" />
                                  {config.label}
                                </Badge>
                                {authorEmp && (
                                  <span className="text-xs text-muted-foreground">{authorEmp.name}</span>
                                )}
                                <span className="text-xs text-muted-foreground">{formatTimeAgo(timestampToDate(article.updatedAt))}</span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Eye className="size-3" />
                                  {article.views}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ThumbsUp className="size-3" />
                                  {article.helpful}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="size-3" />
                                  {getReadingTime(article.content)} min
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
