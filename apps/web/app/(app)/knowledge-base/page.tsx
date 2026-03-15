'use client'

import { useState, useMemo, useCallback } from 'react'
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
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ---- Category config --------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  Engineering: { icon: Book, color: 'violet', label: 'Engineering' },
  Product: { icon: Package, color: 'blue', label: 'Product' },
  Design: { icon: Palette, color: 'pink', label: 'Design' },
  Hr: { icon: Users, color: 'amber', label: 'HR & People' },
  Operations: { icon: Settings, color: 'emerald', label: 'Operations' },
  Onboarding: { icon: Rocket, color: 'orange', label: 'Onboarding' },
  Security: { icon: Shield, color: 'red', label: 'Security' },
  General: { icon: FileText, color: 'neutral', label: 'General' },
}

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG)

function categoryBadgeClass(cat: string): string {
  const c = CATEGORY_CONFIG[cat]?.color ?? 'neutral'
  return `bg-${c}-500/10 text-${c}-600 dark:text-${c}-400 border-${c}-500/20`
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

type SortOption = 'recent' | 'views' | 'helpful'

// =============================================================================
// Page component
// =============================================================================

export default function KnowledgeBasePage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()

  const [allArticles] = useTable(tables.kbArticle)
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
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Create form
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [newTags, setNewTags] = useState('')

  // Edit form
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('General')
  const [editTags, setEditTags] = useState('')
  const [editArticleId, setEditArticleId] = useState<bigint | null>(null)

  // Employee map
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>()
    employees.forEach((e) => map.set(e.id.toHexString(), e))
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
          a.content.toLowerCase().includes(q) ||
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

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim() || currentOrgId === null) return
    try {
      await createKbArticle({
        orgId: BigInt(currentOrgId),
        title: newTitle.trim(),
        content: newContent.trim(),
        categoryTag: newCategory,
        tags: newTags.trim(),
      })
      setShowCreateDialog(false)
      setNewTitle('')
      setNewContent('')
      setNewTags('')
    } catch (e) {
      console.error('Failed to create article:', e)
    }
  }, [newTitle, newContent, newCategory, newTags, currentOrgId, createKbArticle])

  const handleDelete = useCallback(async (articleId: bigint) => {
    try {
      await deleteKbArticle({ articleId })
      if (selectedArticleId === articleId) setSelectedArticleId(null)
    } catch (e) {
      console.error(e)
    }
  }, [deleteKbArticle, selectedArticleId])

  const openEditDialog = useCallback((article: any) => {
    setEditArticleId(article.id)
    setEditTitle(article.title)
    setEditContent(article.content)
    setEditCategory(article.category?.tag ?? 'General')
    setEditTags(article.tags)
    setShowEditDialog(true)
  }, [])

  const handleEdit = useCallback(async () => {
    if (!editArticleId || !editTitle.trim()) return
    try {
      await updateKbArticle({
        articleId: editArticleId,
        title: editTitle.trim(),
        content: editContent.trim(),
        categoryTag: editCategory,
        tags: editTags.trim(),
      })
      setShowEditDialog(false)
    } catch (e) {
      console.error(e)
    }
  }, [editArticleId, editTitle, editContent, editCategory, editTags, updateKbArticle])

  // ---- Render ---------------------------------------------------------------

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
        <div className="ml-auto flex items-center gap-2">
          <PresenceBar />
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-8 gap-1.5">
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
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Pinned Articles</p>
              <span className="text-2xl font-bold"><CountUp to={pinnedCount} /></span>
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
                    <Pin className="size-3.5" />
                    Pinned
                  </h3>
                  <div className="space-y-2">
                    {pinnedArticles.map((article) => (
                      <button
                        key={article.id.toString()}
                        onClick={() => handleViewArticle(article.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <p className="font-medium text-foreground truncate">{article.title}</p>
                        <p className="text-xs mt-0.5 truncate">
                          {CATEGORY_CONFIG[article.category?.tag ?? 'General']?.label ?? 'General'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {selectedArticle ? (
                /* ---- Article reader ---- */
                <div className="rounded-xl border bg-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedArticleId(null)}
                        className="-ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="size-4 mr-1.5" />
                        Back to articles
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePin(selectedArticle.id)} className="h-7 gap-1 text-xs">
                          <Pin className={`size-3 ${selectedArticle.pinned ? 'text-amber-500' : ''}`} />
                          {selectedArticle.pinned ? 'Unpin' : 'Pin'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(selectedArticle)} className="h-7 gap-1 text-xs">
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedArticle.id)} className="h-7 gap-1 text-xs text-red-500 hover:text-red-400">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-3">{selectedArticle.title}</h2>

                    {/* Metadata bar */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {employeeMap.get(selectedArticle.author.toHexString())?.name ?? 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDate(timestampToDate(selectedArticle.updatedAt))}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3.5" />
                        {selectedArticle.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="size-3.5" />
                        {selectedArticle.helpful} helpful
                      </span>
                      <Badge variant="outline" className={categoryBadgeClass(selectedArticle.category?.tag ?? 'General')}>
                        {CATEGORY_CONFIG[selectedArticle.category?.tag ?? 'General']?.label ?? 'General'}
                      </Badge>
                    </div>

                    {/* Tags */}
                    {selectedArticle.tags && (
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {selectedArticle.tags.split(',').filter(Boolean).map((tag) => (
                          <Badge key={tag.trim()} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Content paragraphs */}
                    <div className="space-y-4">
                      {selectedArticle.content.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-sm leading-relaxed text-foreground/90">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Helpful button */}
                    <div className="mt-8 pt-6 border-t flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Was this helpful?</span>
                      <Button variant="outline" size="sm" onClick={() => handleHelpful(selectedArticle.id)} className="gap-1.5">
                        <ThumbsUp className="size-3.5" />
                        Yes ({selectedArticle.helpful})
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---- Article list ---- */
                <>
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
                          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="size-3.5" />
                            New Article
                          </Button>
                        </div>
                      ) : (
                        filteredArticles.map((article) => {
                          const catTag = article.category?.tag ?? 'General'
                          const config = CATEGORY_CONFIG[catTag] ?? CATEGORY_CONFIG.General
                          const Icon = config.icon
                          const excerpt = article.content.slice(0, 120) + (article.content.length > 120 ? '...' : '')
                          const authorEmp = employeeMap.get(article.author.toHexString())

                          return (
                            <button
                              key={article.id.toString()}
                              onClick={() => handleViewArticle(article.id)}
                              className="w-full text-left rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {article.pinned && (
                                      <Pin className="size-3.5 text-amber-500 flex-shrink-0" />
                                    )}
                                    <h3 className="text-sm font-semibold text-foreground truncate">
                                      {article.title}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{excerpt}</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={`text-[10px] h-5 ${categoryBadgeClass(catTag)}`}>
                                      <Icon className="size-3 mr-1" />
                                      {config.label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{authorEmp?.name ?? 'Unknown'}</span>
                                    <span className="text-xs text-muted-foreground">{formatDate(timestampToDate(article.updatedAt))}</span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Eye className="size-3" />
                                      {article.views}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <ThumbsUp className="size-3" />
                                      {article.helpful}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Article Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-violet-500" />
              New Article
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Article title" className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-sm">Content</Label>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Write your article content here... Use double newlines for paragraphs."
                className="mt-1 w-full h-40 px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm">
                  {CATEGORY_KEYS.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Tags (comma-separated)</Label>
                <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="tag1, tag2, tag3" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Publish Article</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-violet-500" />
              Edit Article
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-sm">Content</Label>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="mt-1 w-full h-40 px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border bg-background text-sm">
                  {CATEGORY_KEYS.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Tags (comma-separated)</Label>
                <Input value={editTags} onChange={e => setEditTags(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
