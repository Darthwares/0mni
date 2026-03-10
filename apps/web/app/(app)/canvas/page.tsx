'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PresenceBar } from '@/components/presence-bar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  Plus,
  PenTool,
  FileText,
  Pencil,
  Trash2,
  ArrowLeft,
  Clock,
  MoreHorizontal,
  Sparkles,
  Grid3X3,
  LayoutList,
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

type CanvasType = 'document' | 'whiteboard'
type ViewMode = 'grid' | 'list'

interface LocalCanvas {
  id: string
  title: string
  type: CanvasType
  content: any
  createdAt: Date
  updatedAt: Date
}

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- Main Page --------------------------------------------------------------

export default function CanvasPage() {
  const { identity } = useSpacetimeDB()
  const [employees] = useTable(tables.employee)

  // Local canvas storage (until backend reducers are available)
  const [canvases, setCanvases] = useState<LocalCanvas[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('omni-canvases')
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }))
      }
    } catch {}
    return []
  })

  const saveCanvases = useCallback((updated: LocalCanvas[]) => {
    setCanvases(updated)
    try { localStorage.setItem('omni-canvases', JSON.stringify(updated)) } catch {}
  }, [])

  const [activeCanvas, setActiveCanvas] = useState<LocalCanvas | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<CanvasType>('document')

  const filteredCanvases = useMemo(() => {
    let items = [...canvases]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter((c) => c.title.toLowerCase().includes(q))
    }
    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [canvases, searchQuery])

  const handleCreate = () => {
    if (!newTitle.trim()) return
    const canvas: LocalCanvas = {
      id: generateId(),
      title: newTitle.trim(),
      type: newType,
      content: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    saveCanvases([canvas, ...canvases])
    setShowCreate(false)
    setNewTitle('')
    setActiveCanvas(canvas)
  }

  const handleDelete = (id: string) => {
    saveCanvases(canvases.filter((c) => c.id !== id))
    if (activeCanvas?.id === id) setActiveCanvas(null)
  }

  const handleContentChange = useCallback((content: any) => {
    if (!activeCanvas) return
    const updated = canvases.map((c) =>
      c.id === activeCanvas.id ? { ...c, content, updatedAt: new Date() } : c
    )
    saveCanvases(updated)
  }, [activeCanvas, canvases, saveCanvases])

  // ---- Editor View ----
  if (activeCanvas) {
    return (
      <div className="flex h-full flex-col">
        {/* Editor header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setActiveCanvas(null)} className="gap-1.5 -ml-1">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeCanvas.type === 'document' ? (
              <FileText className="size-4 text-blue-400 shrink-0" />
            ) : (
              <PenTool className="size-4 text-emerald-400 shrink-0" />
            )}
            <h1 className="text-sm font-semibold truncate">{activeCanvas.title}</h1>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {activeCanvas.type === 'document' ? 'Document' : 'Whiteboard'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PresenceBar />
            <span className="text-[10px] text-muted-foreground">
              Saved {formatTimeAgo(activeCanvas.updatedAt)}
            </span>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-hidden">
          {activeCanvas.type === 'document' ? (
            <BlockEditor
              initialContent={activeCanvas.content}
              onChange={handleContentChange}
            />
          ) : (
            <ExcalidrawEditor
              initialData={activeCanvas.content ? { elements: activeCanvas.content } : undefined}
              onChange={(elements) => handleContentChange(elements)}
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
            {canvases.length}
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

          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            New Canvas
          </Button>
        </div>
      </div>

      {/* Canvas List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredCanvases.length === 0 ? (
            <EmptyState onCreateClick={() => setShowCreate(true)} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCanvases.map((canvas) => (
                <CanvasCard
                  key={canvas.id}
                  canvas={canvas}
                  onOpen={() => setActiveCanvas(canvas)}
                  onDelete={() => handleDelete(canvas.id)}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-2">
              {filteredCanvases.map((canvas) => (
                <CanvasListItem
                  key={canvas.id}
                  canvas={canvas}
                  onOpen={() => setActiveCanvas(canvas)}
                  onDelete={() => handleDelete(canvas.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
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
                  onClick={() => setNewType('document')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'document'
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <FileText className={`size-8 mb-2 ${newType === 'document' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-semibold">Document</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rich text, like Notion</p>
                </button>
                <button
                  onClick={() => setNewType('whiteboard')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    newType === 'whiteboard'
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Pencil className={`size-8 mb-2 ${newType === 'whiteboard' ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-semibold">Whiteboard</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Draw with Excalidraw</p>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Canvas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Sub-components ---------------------------------------------------------

function CanvasCard({
  canvas,
  onOpen,
  onDelete,
}: {
  canvas: LocalCanvas
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Preview area */}
      <div className={`h-32 flex items-center justify-center ${
        canvas.type === 'document'
          ? 'bg-gradient-to-br from-blue-500/5 to-blue-500/10'
          : 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10'
      }`}>
        {canvas.type === 'document' ? (
          <div className="space-y-1.5 px-6 w-full">
            <div className="h-2 bg-foreground/10 rounded-full w-3/4" />
            <div className="h-2 bg-foreground/10 rounded-full w-full" />
            <div className="h-2 bg-foreground/10 rounded-full w-2/3" />
            <div className="h-2 bg-foreground/10 rounded-full w-5/6" />
          </div>
        ) : (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-foreground/10 rounded-lg rotate-12" />
            <div className="absolute inset-2 border-2 border-foreground/10 rounded-full" />
            <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-foreground/10 rotate-45" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1">
          {canvas.type === 'document' ? (
            <FileText className="size-3.5 text-blue-400 shrink-0" />
          ) : (
            <PenTool className="size-3.5 text-emerald-400 shrink-0" />
          )}
          <h3 className="text-sm font-semibold truncate">{canvas.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          {formatTimeAgo(canvas.updatedAt)}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function CanvasListItem({
  canvas,
  onOpen,
  onDelete,
}: {
  canvas: LocalCanvas
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 cursor-pointer transition-all hover:shadow-sm hover:border-primary/20"
    >
      <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${
        canvas.type === 'document'
          ? 'bg-blue-500/10'
          : 'bg-emerald-500/10'
      }`}>
        {canvas.type === 'document' ? (
          <FileText className="size-5 text-blue-400" />
        ) : (
          <PenTool className="size-5 text-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{canvas.title}</h3>
        <p className="text-[11px] text-muted-foreground">
          {canvas.type === 'document' ? 'Document' : 'Whiteboard'} · Updated {formatTimeAgo(canvas.updatedAt)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <PenTool className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No canvases yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create a document for rich text editing or a whiteboard for visual collaboration.
      </p>
      <Button onClick={onCreateClick} className="gap-1.5">
        <Plus className="size-4" />
        Create your first canvas
      </Button>
    </div>
  )
}
