'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Folder,
  FileText,
  Image,
  Sheet,
  Code2,
  Video,
  Music,
  Archive,
  File,
  Search,
  Star,
  Grid3X3,
  List,
  Plus,
  ChevronRight,
  ArrowUpDown,
  HardDrive,
  Upload,
  Users,
  Clock,
  Home,
  type LucideIcon,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// ── Types ──────────────────────────────────────
type FileType = 'folder' | 'document' | 'image' | 'spreadsheet' | 'code' | 'video' | 'audio' | 'archive' | 'other'

type DriveItem = {
  id: string
  name: string
  type: FileType
  size: number
  modifiedAt: Date
  owner: string
  starred: boolean
  shared: boolean
  parentId: string | null
}

type ViewMode = 'grid' | 'list'
type FilterTab = 'all' | 'starred' | 'recent' | 'shared'
type SortField = 'name' | 'modifiedAt' | 'size'
type SortDirection = 'asc' | 'desc'

// ── Config ─────────────────────────────────────
const FILE_ICONS: Record<FileType, { icon: LucideIcon; color: string; bg: string }> = {
  folder: { icon: Folder, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  document: { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  image: { icon: Image, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  spreadsheet: { icon: Sheet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  code: { icon: Code2, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  video: { icon: Video, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
  audio: { icon: Music, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  archive: { icon: Archive, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  other: { icon: File, color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-500/10' },
}

// ── Helpers ────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes === 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTotalSize(items: DriveItem[]): number {
  return items.filter((i) => i.type !== 'folder').reduce((acc, i) => acc + i.size, 0)
}

// ── Sample Data ────────────────────────────────
function createSampleData(): DriveItem[] {
  const now = new Date()
  const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000)
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000)

  return [
    // Root folders
    { id: 'f1', name: 'Engineering', type: 'folder', size: 0, modifiedAt: h(2), owner: 'You', starred: true, shared: true, parentId: null },
    { id: 'f2', name: 'Design Assets', type: 'folder', size: 0, modifiedAt: d(1), owner: 'You', starred: false, shared: true, parentId: null },
    { id: 'f3', name: 'Finance', type: 'folder', size: 0, modifiedAt: d(3), owner: 'Alice Chen', starred: false, shared: false, parentId: null },
    { id: 'f4', name: 'Marketing', type: 'folder', size: 0, modifiedAt: d(5), owner: 'You', starred: false, shared: true, parentId: null },

    // Root files
    { id: 'd1', name: 'Q1 Roadmap.docx', type: 'document', size: 245760, modifiedAt: h(1), owner: 'You', starred: true, shared: true, parentId: null },
    { id: 's1', name: 'Budget 2026.xlsx', type: 'spreadsheet', size: 1572864, modifiedAt: h(4), owner: 'Alice Chen', starred: false, shared: true, parentId: null },
    { id: 'i1', name: 'Logo Final.png', type: 'image', size: 4194304, modifiedAt: d(2), owner: 'You', starred: true, shared: false, parentId: null },
    { id: 'v1', name: 'Product Demo.mp4', type: 'video', size: 157286400, modifiedAt: d(1), owner: 'Bob Park', starred: false, shared: true, parentId: null },

    // Engineering children
    { id: 'c1', name: 'src', type: 'folder', size: 0, modifiedAt: h(1), owner: 'You', starred: false, shared: false, parentId: 'f1' },
    { id: 'c2', name: 'architecture.md', type: 'document', size: 51200, modifiedAt: h(3), owner: 'You', starred: true, shared: true, parentId: 'f1' },
    { id: 'c3', name: 'schema.sql', type: 'code', size: 12288, modifiedAt: d(2), owner: 'Charlie Wu', starred: false, shared: true, parentId: 'f1' },
    { id: 'c4', name: 'deploy.tar.gz', type: 'archive', size: 52428800, modifiedAt: d(4), owner: 'You', starred: false, shared: false, parentId: 'f1' },

    // Design Assets children
    { id: 'da1', name: 'Brand Guidelines.pdf', type: 'document', size: 8388608, modifiedAt: d(3), owner: 'Diana Lee', starred: false, shared: true, parentId: 'f2' },
    { id: 'da2', name: 'Hero Banner.png', type: 'image', size: 6291456, modifiedAt: h(6), owner: 'You', starred: false, shared: false, parentId: 'f2' },
    { id: 'da3', name: 'Promo Jingle.mp3', type: 'audio', size: 3145728, modifiedAt: d(7), owner: 'Eve Santos', starred: false, shared: true, parentId: 'f2' },

    // Src children (nested in Engineering)
    { id: 'sc1', name: 'main.rs', type: 'code', size: 8192, modifiedAt: h(1), owner: 'You', starred: false, shared: false, parentId: 'c1' },
    { id: 'sc2', name: 'lib.rs', type: 'code', size: 24576, modifiedAt: h(2), owner: 'You', starred: false, shared: false, parentId: 'c1' },
  ]
}

// ── Component ──────────────────────────────────
export default function DrivePage() {
  const [items, setItems] = useState<DriveItem[]>(createSampleData)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // ── Breadcrumb path ──────────────────────────
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'My Drive' }]
    let folderId = currentFolderId
    while (folderId) {
      const folder = items.find((i) => i.id === folderId)
      if (folder) {
        path.splice(1, 0, { id: folder.id, name: folder.name })
        folderId = folder.parentId
      } else {
        break
      }
    }
    return path
  }, [currentFolderId, items])

  // ── Filtering and sorting ────────────────────
  const filteredItems = useMemo(() => {
    let result = items

    // Search across all items
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(q))
    } else {
      // When not searching, show items in current folder
      result = result.filter((i) => i.parentId === currentFolderId)
    }

    // Filter tab
    if (filterTab === 'starred') result = result.filter((i) => i.starred)
    if (filterTab === 'shared') result = result.filter((i) => i.shared)
    if (filterTab === 'recent') {
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      result = result.filter((i) => i.modifiedAt >= weekAgo)
    }

    // Sort: folders first, then by field
    result = [...result].sort((a, b) => {
      // Folders always first
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1

      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'modifiedAt') cmp = a.modifiedAt.getTime() - b.modifiedAt.getTime()
      else if (sortField === 'size') cmp = a.size - b.size

      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [items, searchQuery, currentFolderId, filterTab, sortField, sortDirection])

  // ── Stats ────────────────────────────────────
  const totalFiles = items.filter((i) => i.type !== 'folder').length
  const totalSize = getTotalSize(items)
  const sharedCount = items.filter((i) => i.shared).length
  const recentCount = items.filter((i) => i.modifiedAt >= new Date(Date.now() - 7 * 86400000) && i.type !== 'folder').length

  const stats = [
    { label: 'Total Files', value: totalFiles, color: '#0ea5e9', suffix: '' },
    { label: 'Storage Used', value: parseFloat((totalSize / (1024 * 1024)).toFixed(0)), color: '#3b82f6', suffix: ' MB' },
    { label: 'Shared Files', value: sharedCount, color: '#6366f1', suffix: '' },
    { label: 'Recent Uploads', value: recentCount, color: '#8b5cf6', suffix: '' },
  ]

  // ── Handlers ─────────────────────────────────
  const toggleStar = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    )
  }, [])

  const navigateToFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId)
    setSearchQuery('')
  }, [])

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    const folder: DriveItem = {
      id: `f-${Date.now()}`,
      name: newFolderName.trim(),
      type: 'folder',
      size: 0,
      modifiedAt: new Date(),
      owner: 'You',
      starred: false,
      shared: false,
      parentId: currentFolderId,
    }
    setItems((prev) => [...prev, folder])
    setNewFolderName('')
    setShowNewFolderDialog(false)
  }

  const cycleSortField = () => {
    const fields: SortField[] = ['name', 'modifiedAt', 'size']
    const idx = fields.indexOf(sortField)
    const nextField = fields[(idx + 1) % fields.length]
    if (nextField === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(nextField)
      setSortDirection('asc')
    }
  }

  const sortLabel = sortField === 'name' ? 'Name' : sortField === 'modifiedAt' ? 'Modified' : 'Size'

  // ── Render helpers ───────────────────────────
  const renderFileIcon = (type: FileType, sizeClass = 'size-5') => {
    const config = FILE_ICONS[type]
    const Icon = config.icon
    return <Icon className={`${sizeClass} ${config.color}`} />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-sky-500/25">
            <HardDrive className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#0ea5e9', '#3b82f6', '#6366f1']} animationSpeed={6}>
                Drive
              </GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              Store, share, and collaborate on files
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
            <Plus className="mr-2 size-4" />
            New Folder
          </Button>
          <Button>
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <SpotlightCard key={stat.label} spotlightColor={stat.color} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">
                <CountUp to={stat.value} />
                {stat.suffix && <span className="text-sm font-medium text-muted-foreground ml-0.5">{stat.suffix}</span>}
              </p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Filter Tabs */}
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="starred">
                <Star className="size-3.5 mr-1" />
                Starred
              </TabsTrigger>
              <TabsTrigger value="recent">
                <Clock className="size-3.5 mr-1" />
                Recent
              </TabsTrigger>
              <TabsTrigger value="shared">
                <Users className="size-3.5 mr-1" />
                Shared
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Button variant="ghost" size="sm" onClick={cycleSortField} className="text-xs text-muted-foreground">
            <ArrowUpDown className="size-3.5 mr-1" />
            {sortLabel}
            <span className="ml-0.5 opacity-60">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          {/* View mode */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      {!searchQuery && (
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.id ?? 'root'} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
              <button
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent ${
                  idx === breadcrumbs.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setCurrentFolderId(crumb.id)}
              >
                {idx === 0 && <Home className="size-3.5" />}
                {crumb.name}
              </button>
            </div>
          ))}
        </nav>
      )}

      {/* Content */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-2xl bg-muted/50 p-4 mb-4">
              <Folder className="size-10 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? 'No files match your search' : 'This folder is empty'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery ? 'Try a different search term' : 'Upload files or create a folder to get started'}
            </p>
            {!searchQuery && (
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowNewFolderDialog(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  New Folder
                </Button>
                <Button size="sm">
                  <Upload className="mr-1.5 size-3.5" />
                  Upload
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredItems.map((item) => {
            const config = FILE_ICONS[item.type]
            const Icon = config.icon
            return (
              <Card
                key={item.id}
                className="group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
                onClick={() => item.type === 'folder' ? navigateToFolder(item.id) : undefined}
              >
                <CardContent className="p-3">
                  {/* Star button */}
                  <button
                    className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                      item.starred ? 'opacity-100' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleStar(item.id)
                    }}
                  >
                    <Star
                      className={`size-4 transition-colors ${
                        item.starred
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground hover:text-amber-400'
                      }`}
                    />
                  </button>

                  {/* Icon area */}
                  <div className={`flex items-center justify-center rounded-xl ${config.bg} p-4 mb-3`}>
                    <Icon className={`size-8 ${config.color}`} />
                  </div>

                  {/* File info */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(item.modifiedAt)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatSize(item.size)}
                      </p>
                    </div>
                    {/* Badges */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {item.shared && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                          <Users className="size-2.5" />
                          Shared
                        </span>
                      )}
                      {item.type === 'folder' && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                          {items.filter((i) => i.parentId === item.id).length} items
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => {
                        if (sortField === 'name') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                        else { setSortField('name'); setSortDirection('asc') }
                      }}
                    >
                      Name
                      {sortField === 'name' && (
                        <span className="opacity-60">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Owner</th>
                  <th className="text-left font-medium px-4 py-3">
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => {
                        if (sortField === 'modifiedAt') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                        else { setSortField('modifiedAt'); setSortDirection('asc') }
                      }}
                    >
                      Modified
                      {sortField === 'modifiedAt' && (
                        <span className="opacity-60">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right font-medium px-4 py-3">
                    <button
                      className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      onClick={() => {
                        if (sortField === 'size') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                        else { setSortField('size'); setSortDirection('asc') }
                      }}
                    >
                      Size
                      {sortField === 'size' && (
                        <span className="opacity-60">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                      )}
                    </button>
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const config = FILE_ICONS[item.type]
                  const Icon = config.icon
                  return (
                    <tr
                      key={item.id}
                      className="group border-b last:border-b-0 transition-colors hover:bg-accent/50 cursor-pointer"
                      onClick={() => item.type === 'folder' ? navigateToFolder(item.id) : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center rounded-lg ${config.bg} p-1.5`}>
                            <Icon className={`size-4 ${config.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.shared && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0 text-[10px] font-medium">
                                  <Users className="size-2.5" />
                                  Shared
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {item.owner}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(item.modifiedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-right tabular-nums">
                        {formatSize(item.size)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                            item.starred ? 'opacity-100' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStar(item.id)
                          }}
                        >
                          <Star
                            className={`size-4 transition-colors ${
                              item.starred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground hover:text-amber-400'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Storage bar */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="size-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatSize(totalSize)} of 15 GB used
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min((totalSize / (15 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3">
            {(['document', 'image', 'video', 'code', 'other'] as FileType[]).map((type) => {
              const config = FILE_ICONS[type]
              const Icon = config.icon
              const typeSize = items.filter((i) => i.type === type).reduce((acc, i) => acc + i.size, 0)
              if (typeSize === 0) return null
              return (
                <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className={`size-3 ${config.color}`} />
                  <span className="capitalize">{type}s</span>
                  <span className="tabular-nums">{formatSize(typeSize)}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder{currentFolderId ? ' inside the current directory' : ' in My Drive'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Folder name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Untitled folder"
              className="mt-1.5"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewFolderDialog(false); setNewFolderName('') }}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
