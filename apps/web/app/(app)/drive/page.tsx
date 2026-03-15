'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  HardDrive,
  Search,
  Grid3X3,
  List,
  Upload,
  FolderPlus,
  Folder,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Film,
  Music,
  Archive,
  File,
  Star,
  StarOff,
  Trash2,
  Download,
  MoreVertical,
  ChevronRight,
  Clock,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { CountUp } from '@/components/reactbits/CountUp'

// ── Types ──────────────────────────────────────
interface DriveItem {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'spreadsheet' | 'code' | 'video' | 'audio' | 'archive' | 'other'
  size: number // bytes
  modifiedAt: Date
  createdAt: Date
  parentId: string | null
  starred: boolean
  owner: string
  shared: boolean
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'modified' | 'size'
type FilterTab = 'all' | 'starred' | 'recent' | 'shared'

// ── Helpers ────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function formatDate(d: Date): string {
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

const FILE_ICONS: Record<DriveItem['type'], { icon: LucideIcon; color: string; bg: string }> = {
  folder: { icon: Folder, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  document: { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  image: { icon: FileImage, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  spreadsheet: { icon: FileSpreadsheet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  code: { icon: FileCode, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  video: { icon: Film, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  audio: { icon: Music, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
  archive: { icon: Archive, color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-500/10' },
  other: { icon: File, color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-500/10' },
}

// ── Sample Data ────────────────────────────────
function createSampleFiles(): DriveItem[] {
  const now = new Date()
  const h = (hours: number) => new Date(now.getTime() - hours * 3600000)
  const d = (days: number) => new Date(now.getTime() - days * 86400000)

  return [
    { id: 'f1', name: 'Projects', type: 'folder', size: 0, modifiedAt: h(2), createdAt: d(90), parentId: null, starred: true, owner: 'You', shared: true },
    { id: 'f2', name: 'Design Assets', type: 'folder', size: 0, modifiedAt: h(5), createdAt: d(60), parentId: null, starred: false, owner: 'You', shared: true },
    { id: 'f3', name: 'Reports', type: 'folder', size: 0, modifiedAt: d(1), createdAt: d(30), parentId: null, starred: true, owner: 'You', shared: false },
    { id: 'f4', name: 'Archive', type: 'folder', size: 0, modifiedAt: d(14), createdAt: d(120), parentId: null, starred: false, owner: 'You', shared: false },
    { id: 'd1', name: 'Q1 Product Roadmap.doc', type: 'document', size: 245760, modifiedAt: h(1), createdAt: d(15), parentId: null, starred: true, owner: 'You', shared: true },
    { id: 'd2', name: 'Engineering Handbook.doc', type: 'document', size: 512000, modifiedAt: h(8), createdAt: d(45), parentId: null, starred: false, owner: 'Alice', shared: true },
    { id: 'd3', name: 'Meeting Notes — March.doc', type: 'document', size: 98304, modifiedAt: h(3), createdAt: d(2), parentId: null, starred: false, owner: 'You', shared: false },
    { id: 's1', name: 'Sales Pipeline Q1.xlsx', type: 'spreadsheet', size: 1048576, modifiedAt: d(1), createdAt: d(20), parentId: null, starred: true, owner: 'Bob', shared: true },
    { id: 's2', name: 'Budget 2026.xlsx', type: 'spreadsheet', size: 786432, modifiedAt: d(3), createdAt: d(10), parentId: null, starred: false, owner: 'You', shared: true },
    { id: 'i1', name: 'Brand Logo.png', type: 'image', size: 2097152, modifiedAt: d(7), createdAt: d(60), parentId: null, starred: false, owner: 'Diana', shared: true },
    { id: 'i2', name: 'Dashboard Mockup.fig', type: 'image', size: 15728640, modifiedAt: h(12), createdAt: d(5), parentId: null, starred: true, owner: 'You', shared: true },
    { id: 'c1', name: 'deploy.config.ts', type: 'code', size: 4096, modifiedAt: h(6), createdAt: d(30), parentId: null, starred: false, owner: 'You', shared: false },
    { id: 'c2', name: 'api-schema.graphql', type: 'code', size: 8192, modifiedAt: d(2), createdAt: d(25), parentId: null, starred: false, owner: 'Charlie', shared: true },
    { id: 'v1', name: 'Product Demo.mp4', type: 'video', size: 157286400, modifiedAt: d(5), createdAt: d(5), parentId: null, starred: false, owner: 'You', shared: true },
    { id: 'a1', name: 'release-archive-v2.3.zip', type: 'archive', size: 52428800, modifiedAt: d(10), createdAt: d(10), parentId: null, starred: false, owner: 'You', shared: false },
    { id: 'o1', name: 'Client NDA.pdf', type: 'other', size: 65536, modifiedAt: d(20), createdAt: d(60), parentId: null, starred: false, owner: 'Legal', shared: true },
  ]
}

// ── Component ──────────────────────────────────
export default function DrivePage() {
  const [files, setFiles] = useState<DriveItem[]>(createSampleFiles)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('modified')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }])
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Stats
  const stats = useMemo(() => {
    const totalFiles = files.filter((f) => f.type !== 'folder').length
    const totalFolders = files.filter((f) => f.type === 'folder').length
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    const sharedCount = files.filter((f) => f.shared).length
    return { totalFiles, totalFolders, totalSize, sharedCount }
  }, [files])

  // Filtered & sorted files
  const visibleFiles = useMemo(() => {
    let list = files.filter((f) => f.parentId === currentFolder)

    // Filter tab
    if (filterTab === 'starred') list = files.filter((f) => f.starred)
    if (filterTab === 'recent') {
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      list = files.filter((f) => f.modifiedAt >= weekAgo)
    }
    if (filterTab === 'shared') list = files.filter((f) => f.shared)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = files.filter((f) => f.name.toLowerCase().includes(q))
    }

    // Sort: folders first, then by criteria
    return list.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'size') return b.size - a.size
      return b.modifiedAt.getTime() - a.modifiedAt.getTime()
    })
  }, [files, currentFolder, filterTab, search, sortBy])

  const toggleStar = useCallback((id: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, starred: !f.starred } : f))
  }, [])

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const openFolder = useCallback((folder: DriveItem) => {
    setCurrentFolder(folder.id)
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
  }, [])

  const navigateBreadcrumb = useCallback((index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1))
    setCurrentFolder(breadcrumb[index]?.id ?? null)
  }, [breadcrumb])

  const createFolder = () => {
    if (!newFolderName.trim()) return
    const folder: DriveItem = {
      id: `f-${Date.now()}`,
      name: newFolderName.trim(),
      type: 'folder',
      size: 0,
      modifiedAt: new Date(),
      createdAt: new Date(),
      parentId: currentFolder,
      starred: false,
      owner: 'You',
      shared: false,
    }
    setFiles((prev) => [...prev, folder])
    setNewFolderDialog(false)
    setNewFolderName('')
  }

  const setNewFolderDialog = setShowNewFolderDialog

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 text-white shadow-lg shadow-sky-500/25">
            <HardDrive className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#0ea5e9', '#3b82f6', '#6366f1']} animationSpeed={6}>
                Drive
              </GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              Store, organize, and share files with your team
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
            <FolderPlus className="mr-2 size-4" />
            New Folder
          </Button>
          <Button>
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Files', value: stats.totalFiles, color: '#0ea5e9' },
          { label: 'Folders', value: stats.totalFolders, color: '#f59e0b' },
          { label: 'Storage Used', value: 0, display: formatSize(stats.totalSize), color: '#6366f1' },
          { label: 'Shared', value: stats.sharedCount, color: '#22c55e' },
        ].map((stat) => (
          <SpotlightCard key={stat.label} spotlightColor={stat.color} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold mt-1">
              {'display' in stat ? stat.display : <CountUp to={stat.value} />}
            </p>
          </SpotlightCard>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          {breadcrumb.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
              <button
                className={`hover:text-primary transition-colors ${
                  i === breadcrumb.length - 1 ? 'font-medium' : 'text-muted-foreground'
                }`}
                onClick={() => navigateBreadcrumb(i)}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="pl-10 h-8 text-sm"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1">
          {(['all', 'starred', 'recent', 'shared'] as FilterTab[]).map((tab) => (
            <Button
              key={tab}
              variant={filterTab === tab ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => setFilterTab(tab)}
            >
              {tab === 'starred' && <Star className="size-3 mr-1" />}
              {tab === 'recent' && <Clock className="size-3 mr-1" />}
              {tab}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <ArrowUpDown className="size-3 mr-1" />
              {sortBy === 'name' ? 'Name' : sortBy === 'size' ? 'Size' : 'Modified'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('modified')}>Last Modified</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('size')}>Size</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {visibleFiles.map((item) => {
            const iconCfg = FILE_ICONS[item.type]
            const Icon = iconCfg.icon

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                onDoubleClick={() => item.type === 'folder' && openFolder(item)}
              >
                {/* Star button */}
                <button
                  className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                    item.starred ? 'opacity-100 text-amber-500' : 'text-muted-foreground hover:text-amber-500'
                  }`}
                  onClick={(e) => { e.stopPropagation(); toggleStar(item.id) }}
                >
                  {item.starred ? <Star className="size-3.5 fill-current" /> : <Star className="size-3.5" />}
                </button>

                {/* Icon */}
                <div className={`rounded-lg ${iconCfg.bg} p-3 mb-3 flex items-center justify-center`}>
                  <Icon className={`size-8 ${iconCfg.color}`} />
                </div>

                {/* Name */}
                <p className="text-xs font-medium truncate" title={item.name}>
                  {item.name}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{formatDate(item.modifiedAt)}</span>
                  {item.type !== 'folder' && (
                    <span className="text-[10px] text-muted-foreground">{formatSize(item.size)}</span>
                  )}
                </div>

                {/* Badges */}
                <div className="flex gap-1 mt-1.5">
                  {item.shared && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">Shared</Badge>
                  )}
                </div>

                {/* Context menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
                      <MoreVertical className="size-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {item.type === 'folder' && (
                      <DropdownMenuItem onClick={() => openFolder(item)}>
                        <Folder className="mr-2 size-3.5" />
                        Open
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => toggleStar(item.id)}>
                      {item.starred ? <StarOff className="mr-2 size-3.5" /> : <Star className="mr-2 size-3.5" />}
                      {item.starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                    {item.type !== 'folder' && (
                      <DropdownMenuItem>
                        <Download className="mr-2 size-3.5" />
                        Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteFile(item.id)}>
                      <Trash2 className="mr-2 size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              <span>Name</span>
              <span>Owner</span>
              <span>Modified</span>
              <span className="text-right">Size</span>
              <span />
            </div>
            {/* Rows */}
            <div className="divide-y">
              {visibleFiles.map((item) => {
                const iconCfg = FILE_ICONS[item.type]
                const Icon = iconCfg.icon

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-4 px-4 py-2.5 items-center hover:bg-accent/50 transition-colors cursor-pointer group"
                    onDoubleClick={() => item.type === 'folder' && openFolder(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        className={`shrink-0 ${item.starred ? 'text-amber-500' : 'text-transparent group-hover:text-muted-foreground hover:!text-amber-500'} transition-colors`}
                        onClick={(e) => { e.stopPropagation(); toggleStar(item.id) }}
                      >
                        <Star className={`size-3.5 ${item.starred ? 'fill-current' : ''}`} />
                      </button>
                      <div className={`rounded p-1 shrink-0 ${iconCfg.bg}`}>
                        <Icon className={`size-4 ${iconCfg.color}`} />
                      </div>
                      <span className="text-sm truncate">{item.name}</span>
                      {item.shared && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0">Shared</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{item.owner}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(item.modifiedAt)}</span>
                    <span className="text-xs text-muted-foreground text-right tabular-nums">
                      {item.type === 'folder' ? '—' : formatSize(item.size)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
                          <MoreVertical className="size-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {item.type === 'folder' && (
                          <DropdownMenuItem onClick={() => openFolder(item)}>
                            <Folder className="mr-2 size-3.5" />
                            Open
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toggleStar(item.id)}>
                          {item.starred ? <StarOff className="mr-2 size-3.5" /> : <Star className="mr-2 size-3.5" />}
                          {item.starred ? 'Unstar' : 'Star'}
                        </DropdownMenuItem>
                        {item.type !== 'folder' && (
                          <DropdownMenuItem>
                            <Download className="mr-2 size-3.5" />
                            Download
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteFile(item.id)}>
                          <Trash2 className="mr-2 size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {visibleFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <HardDrive className="size-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search ? 'No files found' : filterTab === 'starred' ? 'No starred files' : 'This folder is empty'}
          </p>
          <p className="text-xs mt-1">
            {search ? 'Try adjusting your search' : 'Upload files or create a new folder'}
          </p>
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Create a new folder in {breadcrumb[breadcrumb.length - 1]?.name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Untitled folder"
              className="mt-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewFolderDialog(false); setNewFolderName('') }}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
