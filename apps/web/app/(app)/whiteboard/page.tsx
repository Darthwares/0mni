'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTable, useReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar } from '@/components/presence-bar'
import {
  Search,
  Plus,
  ArrowLeft,
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Clock,
  Users,
  LayoutGrid,
  SortAsc,
  Download,
  Copy,
  MoreHorizontal,
  Edit3,
  Lightbulb,
  GitBranch,
  Columns,
  Brain,
  Shapes,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
import BlurText from '@/components/reactbits/BlurText'
import { exportCSV } from '@/lib/csv-export'

// --- Types ---

type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'line' | 'text' | 'sticky' | 'eraser'

interface Point { x: number; y: number }

interface Stroke { type: 'pen' | 'eraser'; points: Point[]; color: string; width: number }
interface RectShape { type: 'rect'; start: Point; end: Point; color: string; width: number }
interface EllipseShape { type: 'ellipse'; start: Point; end: Point; color: string; width: number }
interface LineShape { type: 'line'; start: Point; end: Point; color: string; width: number }
interface TextShape { type: 'text'; position: Point; content: string; color: string; fontSize: number }
interface StickyShape { type: 'sticky'; position: Point; content: string; bgColor: string; width: number; height: number }

type DrawElement = Stroke | RectShape | EllipseShape | LineShape | TextShape | StickyShape

// --- Helpers ---

function tsToDate(ts: unknown): Date {
  if (!ts) return new Date(0)
  if (ts instanceof Date) return ts
  if (typeof ts === 'bigint') return new Date(Number(ts / 1000n))
  if (typeof ts === 'object' && ts !== null && 'microsSinceUnixEpoch' in ts) {
    return new Date(Number((ts as { microsSinceUnixEpoch: bigint }).microsSinceUnixEpoch / 1000n))
  }
  return new Date(0)
}

function parseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) } catch { return fallback }
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(diff / 86400000)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// --- Constants ---

const PRESET_COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
const STICKY_COLORS = ['#fef08a', '#fde68a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3']
const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

// --- Board Templates ---

const BOARD_TEMPLATES: { name: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string; elements: DrawElement[] }[] = [
  {
    name: 'Brainstorming',
    icon: Lightbulb,
    color: '#eab308',
    description: 'Sticky notes for ideation',
    elements: [
      { type: 'text', position: { x: 280, y: 40 }, content: 'Brainstorming Session', color: '#ffffff', fontSize: 28 },
      { type: 'sticky', position: { x: 60, y: 100 }, content: 'Idea 1', bgColor: '#fef08a', width: 160, height: 120 },
      { type: 'sticky', position: { x: 260, y: 100 }, content: 'Idea 2', bgColor: '#bbf7d0', width: 160, height: 120 },
      { type: 'sticky', position: { x: 460, y: 100 }, content: 'Idea 3', bgColor: '#bfdbfe', width: 160, height: 120 },
      { type: 'sticky', position: { x: 660, y: 100 }, content: 'Idea 4', bgColor: '#e9d5ff', width: 160, height: 120 },
      { type: 'sticky', position: { x: 60, y: 260 }, content: 'Idea 5', bgColor: '#fecdd3', width: 160, height: 120 },
      { type: 'sticky', position: { x: 260, y: 260 }, content: 'Idea 6', bgColor: '#fde68a', width: 160, height: 120 },
    ],
  },
  {
    name: 'Retrospective',
    icon: GitBranch,
    color: '#22c55e',
    description: 'What went well, what to improve',
    elements: [
      { type: 'text', position: { x: 160, y: 40 }, content: 'Went Well', color: '#22c55e', fontSize: 24 },
      { type: 'text', position: { x: 460, y: 40 }, content: 'To Improve', color: '#f97316', fontSize: 24 },
      { type: 'text', position: { x: 760, y: 40 }, content: 'Action Items', color: '#3b82f6', fontSize: 24 },
      { type: 'line', start: { x: 360, y: 30 }, end: { x: 360, y: 500 }, color: '#444444', width: 2 },
      { type: 'line', start: { x: 660, y: 30 }, end: { x: 660, y: 500 }, color: '#444444', width: 2 },
      { type: 'sticky', position: { x: 80, y: 90 }, content: '', bgColor: '#bbf7d0', width: 160, height: 100 },
      { type: 'sticky', position: { x: 380, y: 90 }, content: '', bgColor: '#fde68a', width: 160, height: 100 },
      { type: 'sticky', position: { x: 680, y: 90 }, content: '', bgColor: '#bfdbfe', width: 160, height: 100 },
    ],
  },
  {
    name: 'Kanban Board',
    icon: Columns,
    color: '#3b82f6',
    description: 'To Do / In Progress / Done',
    elements: [
      { type: 'rect', start: { x: 40, y: 30 }, end: { x: 290, y: 70 }, color: '#ef4444', width: 2 },
      { type: 'text', position: { x: 120, y: 58 }, content: 'To Do', color: '#ef4444', fontSize: 22 },
      { type: 'rect', start: { x: 320, y: 30 }, end: { x: 570, y: 70 }, color: '#eab308', width: 2 },
      { type: 'text', position: { x: 385, y: 58 }, content: 'In Progress', color: '#eab308', fontSize: 22 },
      { type: 'rect', start: { x: 600, y: 30 }, end: { x: 850, y: 70 }, color: '#22c55e', width: 2 },
      { type: 'text', position: { x: 690, y: 58 }, content: 'Done', color: '#22c55e', fontSize: 22 },
      { type: 'sticky', position: { x: 60, y: 90 }, content: 'Task 1', bgColor: '#fecdd3', width: 200, height: 80 },
      { type: 'sticky', position: { x: 60, y: 190 }, content: 'Task 2', bgColor: '#fecdd3', width: 200, height: 80 },
      { type: 'sticky', position: { x: 340, y: 90 }, content: 'Task 3', bgColor: '#fef08a', width: 200, height: 80 },
      { type: 'sticky', position: { x: 620, y: 90 }, content: 'Task 4', bgColor: '#bbf7d0', width: 200, height: 80 },
    ],
  },
  {
    name: 'Mind Map',
    icon: Brain,
    color: '#8b5cf6',
    description: 'Central topic with branches',
    elements: [
      { type: 'ellipse', start: { x: 300, y: 180 }, end: { x: 520, y: 280 }, color: '#8b5cf6', width: 3 },
      { type: 'text', position: { x: 365, y: 240 }, content: 'Main Idea', color: '#8b5cf6', fontSize: 20 },
      { type: 'line', start: { x: 300, y: 230 }, end: { x: 140, y: 120 }, color: '#3b82f6', width: 2 },
      { type: 'ellipse', start: { x: 60, y: 80 }, end: { x: 220, y: 150 }, color: '#3b82f6', width: 2 },
      { type: 'text', position: { x: 105, y: 123 }, content: 'Branch 1', color: '#3b82f6', fontSize: 16 },
      { type: 'line', start: { x: 520, y: 210 }, end: { x: 680, y: 120 }, color: '#22c55e', width: 2 },
      { type: 'ellipse', start: { x: 600, y: 80 }, end: { x: 760, y: 150 }, color: '#22c55e', width: 2 },
      { type: 'text', position: { x: 645, y: 123 }, content: 'Branch 2', color: '#22c55e', fontSize: 16 },
      { type: 'line', start: { x: 410, y: 280 }, end: { x: 410, y: 380 }, color: '#f97316', width: 2 },
      { type: 'ellipse', start: { x: 330, y: 360 }, end: { x: 490, y: 430 }, color: '#f97316', width: 2 },
      { type: 'text', position: { x: 375, y: 403 }, content: 'Branch 3', color: '#f97316', fontSize: 16 },
    ],
  },
]

// --- Tool Button ---

function ToolButton({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 ${
        active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-700/80'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// --- Board List View ---

function BoardListView({ boards, onOpenBoard, onNewBoard, onNewFromTemplate, onDeleteBoard, onRenameBoard, onDuplicateBoard }: {
  boards: { id: number; title: string; modified: Date; elements: DrawElement[]; previewColor: string }[]
  onOpenBoard: (id: number) => void
  onNewBoard: () => void
  onNewFromTemplate: (template: typeof BOARD_TEMPLATES[0]) => void
  onDeleteBoard: (id: number) => void
  onRenameBoard: (id: number, title: string) => void
  onDuplicateBoard: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  const filtered = boards
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return b.modified.getTime() - a.modified.getTime()
    })

  const handleExport = useCallback(() => {
    const headers = ['Title', 'Elements', 'Last Modified']
    const rows = boards.map(b => [b.title, String(b.elements.length), b.modified.toLocaleString()])
    exportCSV('whiteboards', headers, rows)
  }, [boards])

  const startRename = (id: number, currentTitle: string) => {
    setRenamingId(id)
    setRenameValue(currentTitle)
  }

  const commitRename = () => {
    if (renamingId !== null && renameValue.trim()) {
      onRenameBoard(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Shapes className="size-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              <GradientText colors={['#06b6d4', '#3b82f6', '#8b5cf6']} animationSpeed={6} className="font-bold">
                Whiteboard
              </GradientText>
            </h1>
          </div>
          <BlurText text="Collaborate visually with your team" delay={35} animateBy="words" className="text-sm text-neutral-500 dark:text-neutral-400" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SpotlightCard className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" spotlightColor="rgba(6, 182, 212, 0.15)">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10">
                <Shapes className="size-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Total Boards</p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={boards.length} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                <StickyNote className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Total Elements</p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={boards.reduce((a, b) => a + b.elements.length, 0)} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Clock className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">Active This Week</p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tabular-nums">
                  <CountUp to={boards.filter(b => b.modified >= new Date(Date.now() - 7 * 86400000)).length} duration={1} />
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Templates Strip */}
        {showTemplates && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BOARD_TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.name}
                  onClick={() => { onNewFromTemplate(t); setShowTemplates(false) }}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-left"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${t.color}20` }}>
                    <Icon className="size-4" style={{ color: t.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{t.name}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{t.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input placeholder="Search boards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortBy(s => s === 'recent' ? 'name' : 'recent')} className="gap-1.5">
            {sortBy === 'recent' ? <Clock className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
            {sortBy === 'recent' ? 'Recent' : 'A-Z'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(s => !s)} className="gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <span className="text-xs text-neutral-500 tabular-nums shrink-0">{filtered.length} boards</span>
        </div>

        {/* Board Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <button
            onClick={onNewBoard}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-cyan-500/60 bg-neutral-50 dark:bg-neutral-900/40 hover:bg-cyan-50 dark:hover:bg-neutral-800/60 transition-all duration-200 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-600/20 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-neutral-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
            </div>
            <span className="text-sm text-neutral-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 font-medium transition-colors">New Board</span>
          </button>

          {filtered.map(board => (
            <div
              key={board.id}
              className="group relative flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900/60 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Hover Actions */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(board.id, board.title) }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Rename"
                >
                  <Edit3 className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicateBoard(board.id) }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id) }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-neutral-600 dark:text-neutral-300 hover:text-red-500" />
                </button>
              </div>

              <button onClick={() => onOpenBoard(board.id)} className="text-left">
                <div className="relative h-28 bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at 30% 50%, ${board.previewColor}, transparent 70%)` }} />
                  <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet">
                    {board.elements.slice(0, 6).map((el, i) => {
                      if (el.type === 'rect') {
                        const r = el as RectShape
                        return <rect key={i} x={r.start.x * 0.4} y={r.start.y * 0.35} width={Math.abs(r.end.x - r.start.x) * 0.4} height={Math.abs(r.end.y - r.start.y) * 0.35} fill="none" stroke={r.color} strokeWidth={1} opacity={0.6} />
                      }
                      if (el.type === 'sticky') {
                        const s = el as StickyShape
                        return <rect key={i} x={s.position.x * 0.4} y={s.position.y * 0.35} width={s.width * 0.4} height={s.height * 0.35} fill={s.bgColor} opacity={0.5} rx={3} />
                      }
                      if (el.type === 'ellipse') {
                        const e = el as EllipseShape
                        return <ellipse key={i} cx={((e.start.x + e.end.x) / 2) * 0.4} cy={((e.start.y + e.end.y) / 2) * 0.35} rx={(Math.abs(e.end.x - e.start.x) / 2) * 0.4} ry={(Math.abs(e.end.y - e.start.y) / 2) * 0.35} fill="none" stroke={e.color} strokeWidth={1} opacity={0.6} />
                      }
                      if (el.type === 'line') {
                        const l = el as LineShape
                        return <line key={i} x1={l.start.x * 0.4} y1={l.start.y * 0.35} x2={l.end.x * 0.4} y2={l.end.y * 0.35} stroke={l.color} strokeWidth={1} opacity={0.6} />
                      }
                      return null
                    })}
                  </svg>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1">
                  {renamingId === board.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null) }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-medium bg-transparent border-b border-cyan-500 outline-none text-neutral-900 dark:text-neutral-100 pb-0.5"
                    />
                  ) : (
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white truncate">{board.title}</div>
                  )}
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(board.modified)}</span>
                    <span className="flex items-center gap-1">{board.elements.length} elements</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Board Editor View ---

function BoardEditor({ boardId, title, initialElements, onBack, onSave }: {
  boardId: number; title: string; initialElements: DrawElement[]
  onBack: () => void; onSave: (title: string, elements: DrawElement[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [elements, setElements] = useState<DrawElement[]>(initialElements)
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([])

  const isDrawing = useRef(false)
  const currentStroke = useRef<Point[]>([])
  const startPoint = useRef<Point | null>(null)

  const cursorForTool: Record<Tool, string> = {
    select: 'default', pen: 'crosshair', rect: 'crosshair', ellipse: 'crosshair',
    line: 'crosshair', text: 'text', sticky: 'cell', eraser: 'pointer',
  }

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), elements])
    setRedoStack([])
  }, [elements])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    setRedoStack(r => [...r, elements])
    setUndoStack(u => u.slice(0, -1))
    setElements(undoStack[undoStack.length - 1])
  }, [undoStack, elements])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    setUndoStack(u => [...u, elements])
    setRedoStack(r => r.slice(0, -1))
    setElements(redoStack[redoStack.length - 1])
  }, [redoStack, elements])

  const handleClear = useCallback(() => { pushUndo(); setElements([]) }, [pushUndo])

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }, [zoom])

  const eraseAt = useCallback((pos: Point) => {
    const threshold = 12
    const idx = elements.findIndex(el => {
      if (el.type === 'pen' || el.type === 'eraser') return (el as Stroke).points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold)
      if (el.type === 'rect') { const r = el as RectShape; return pos.x >= Math.min(r.start.x, r.end.x) - threshold && pos.x <= Math.max(r.start.x, r.end.x) + threshold && pos.y >= Math.min(r.start.y, r.end.y) - threshold && pos.y <= Math.max(r.start.y, r.end.y) + threshold }
      if (el.type === 'ellipse') { const e = el as EllipseShape; const cx = (e.start.x + e.end.x) / 2; const cy = (e.start.y + e.end.y) / 2; const rx = Math.abs(e.end.x - e.start.x) / 2; const ry = Math.abs(e.end.y - e.start.y) / 2; if (rx === 0 || ry === 0) return false; return Math.abs(((pos.x - cx) ** 2) / rx ** 2 + ((pos.y - cy) ** 2) / ry ** 2 - 1) < 0.5 }
      if (el.type === 'line') { const l = el as LineShape; const len = Math.hypot(l.end.x - l.start.x, l.end.y - l.start.y); if (len === 0) return Math.hypot(pos.x - l.start.x, pos.y - l.start.y) < threshold; const t = Math.max(0, Math.min(1, ((pos.x - l.start.x) * (l.end.x - l.start.x) + (pos.y - l.start.y) * (l.end.y - l.start.y)) / len ** 2)); const proj = { x: l.start.x + t * (l.end.x - l.start.x), y: l.start.y + t * (l.end.y - l.start.y) }; return Math.hypot(pos.x - proj.x, pos.y - proj.y) < threshold }
      if (el.type === 'text') { const t = el as TextShape; return pos.x >= t.position.x - 10 && pos.x <= t.position.x + 200 && pos.y >= t.position.y - t.fontSize && pos.y <= t.position.y + 10 }
      if (el.type === 'sticky') { const s = el as StickyShape; return pos.x >= s.position.x && pos.x <= s.position.x + s.width && pos.y >= s.position.y && pos.y <= s.position.y + s.height }
      return false
    })
    if (idx !== -1) { pushUndo(); setElements(prev => prev.filter((_, i) => i !== idx)) }
  }, [elements, pushUndo])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return
    const pos = getPos(e)
    if (tool === 'text') { const text = prompt('Enter text:'); if (text) { pushUndo(); setElements(prev => [...prev, { type: 'text', position: pos, content: text, color, fontSize: 16 + strokeWidth * 2 }]) }; return }
    if (tool === 'sticky') { const text = prompt('Sticky note text:') || ''; pushUndo(); setElements(prev => [...prev, { type: 'sticky', position: pos, content: text, bgColor: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)], width: 160, height: 120 }]); return }
    if (tool === 'eraser') { isDrawing.current = true; eraseAt(pos); return }
    isDrawing.current = true; startPoint.current = pos
    if (tool === 'pen') currentStroke.current = [pos]
  }, [tool, color, strokeWidth, getPos, pushUndo, eraseAt])

  const renderElement = useCallback((ctx: CanvasRenderingContext2D, el: DrawElement) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (el.type === 'pen') { const s = el as Stroke; if (s.points.length < 2) return; ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y); for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y); ctx.stroke() }
    else if (el.type === 'rect') { const r = el as RectShape; ctx.strokeStyle = r.color; ctx.lineWidth = r.width; ctx.strokeRect(r.start.x, r.start.y, r.end.x - r.start.x, r.end.y - r.start.y) }
    else if (el.type === 'ellipse') { const e = el as EllipseShape; ctx.strokeStyle = e.color; ctx.lineWidth = e.width; ctx.beginPath(); ctx.ellipse((e.start.x + e.end.x) / 2, (e.start.y + e.end.y) / 2, Math.abs(e.end.x - e.start.x) / 2, Math.abs(e.end.y - e.start.y) / 2, 0, 0, Math.PI * 2); ctx.stroke() }
    else if (el.type === 'line') { const l = el as LineShape; ctx.strokeStyle = l.color; ctx.lineWidth = l.width; ctx.beginPath(); ctx.moveTo(l.start.x, l.start.y); ctx.lineTo(l.end.x, l.end.y); ctx.stroke() }
    else if (el.type === 'text') { const t = el as TextShape; ctx.fillStyle = t.color; ctx.font = `${t.fontSize}px Inter, system-ui, sans-serif`; ctx.fillText(t.content, t.position.x, t.position.y) }
    else if (el.type === 'sticky') {
      const s = el as StickyShape
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
      ctx.fillStyle = s.bgColor; const r = 6
      ctx.beginPath(); ctx.moveTo(s.position.x + r, s.position.y); ctx.lineTo(s.position.x + s.width - r, s.position.y); ctx.quadraticCurveTo(s.position.x + s.width, s.position.y, s.position.x + s.width, s.position.y + r); ctx.lineTo(s.position.x + s.width, s.position.y + s.height - r); ctx.quadraticCurveTo(s.position.x + s.width, s.position.y + s.height, s.position.x + s.width - r, s.position.y + s.height); ctx.lineTo(s.position.x + r, s.position.y + s.height); ctx.quadraticCurveTo(s.position.x, s.position.y + s.height, s.position.x, s.position.y + s.height - r); ctx.lineTo(s.position.x, s.position.y + r); ctx.quadraticCurveTo(s.position.x, s.position.y, s.position.x + r, s.position.y); ctx.closePath(); ctx.fill()
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
      ctx.fillStyle = '#1e1e1e'; ctx.font = '13px Inter, system-ui, sans-serif'
      const words = s.content.split(' '); const lines: string[] = []; let cur = ''
      for (const w of words) { const test = cur ? `${cur} ${w}` : w; if (ctx.measureText(test).width > s.width - 20 && cur) { lines.push(cur); cur = w } else cur = test }
      if (cur) lines.push(cur); (lines.length ? lines : ['']).forEach((ln, idx) => ctx.fillText(ln, s.position.x + 10, s.position.y + 24 + idx * 18))
    }
  }, [])

  const redrawCanvas = useCallback((els: DrawElement[], preview?: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save(); ctx.scale(zoom, zoom)
    const gridSize = 40; ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1
    const w = canvas.width / zoom; const h = canvas.height / zoom
    for (let x = 0; x < w; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    els.forEach(el => renderElement(ctx, el))
    if (preview) preview(ctx)
    ctx.restore()
  }, [zoom, renderElement])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const pos = getPos(e)
    if (tool === 'eraser') { eraseAt(pos); return }
    if (tool === 'pen') {
      currentStroke.current.push(pos)
      const canvas = canvasRef.current; if (!canvas) return
      const ctx = canvas.getContext('2d'); if (!ctx) return
      const pts = currentStroke.current; if (pts.length < 2) return
      ctx.save(); ctx.scale(zoom, zoom); ctx.strokeStyle = color; ctx.lineWidth = strokeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y); ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.stroke(); ctx.restore()
      return
    }
    redrawCanvas(elements, ctx => {
      ctx.strokeStyle = color; ctx.lineWidth = strokeWidth; ctx.setLineDash([6, 4])
      const s = startPoint.current!
      if (tool === 'rect') ctx.strokeRect(s.x, s.y, pos.x - s.x, pos.y - s.y)
      else if (tool === 'ellipse') { ctx.beginPath(); ctx.ellipse((s.x + pos.x) / 2, (s.y + pos.y) / 2, Math.abs(pos.x - s.x) / 2, Math.abs(pos.y - s.y) / 2, 0, 0, Math.PI * 2); ctx.stroke() }
      else if (tool === 'line') { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(pos.x, pos.y); ctx.stroke() }
      ctx.setLineDash([])
    })
  }, [tool, color, strokeWidth, zoom, getPos, elements, eraseAt, redrawCanvas])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return; isDrawing.current = false
    const pos = getPos(e); if (tool === 'eraser') return
    pushUndo()
    if (tool === 'pen') { if (currentStroke.current.length > 1) setElements(prev => [...prev, { type: 'pen', points: [...currentStroke.current], color, width: strokeWidth }]); currentStroke.current = []; return }
    const s = startPoint.current!
    if (tool === 'rect') setElements(prev => [...prev, { type: 'rect', start: s, end: pos, color, width: strokeWidth }])
    else if (tool === 'ellipse') setElements(prev => [...prev, { type: 'ellipse', start: s, end: pos, color, width: strokeWidth }])
    else if (tool === 'line') setElements(prev => [...prev, { type: 'line', start: s, end: pos, color, width: strokeWidth }])
    startPoint.current = null
  }, [tool, color, strokeWidth, getPos, pushUndo])

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current; const container = containerRef.current; if (!canvas || !container) return
      const dpr = window.devicePixelRatio || 1; const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d'); if (ctx) ctx.scale(dpr, dpr)
      redrawCanvas(elements)
    }
    resize(); window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { redrawCanvas(elements) }, [elements, zoom, redrawCanvas])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) { if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }; if (e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo() }; if (e.key === 'y') { e.preventDefault(); handleRedo() } }
      if (!e.ctrlKey && !e.metaKey) { if (e.key === 'v' || e.key === 'V') setTool('select'); if (e.key === 'p' || e.key === 'P') setTool('pen'); if (e.key === 'r' || e.key === 'R') setTool('rect'); if (e.key === 'o' || e.key === 'O') setTool('ellipse'); if (e.key === 'l' || e.key === 'L') setTool('line'); if (e.key === 't' || e.key === 'T') setTool('text'); if (e.key === 's' || e.key === 'S') setTool('sticky'); if (e.key === 'e' || e.key === 'E') setTool('eraser') }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo])

  // Save on back
  const handleBack = useCallback(() => {
    onSave(title, elements)
    onBack()
  }, [title, elements, onSave, onBack])

  const tools: { tool: Tool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { tool: 'select', icon: MousePointer2, label: 'Select (V)' },
    { tool: 'pen', icon: Pencil, label: 'Draw (P)' },
    { tool: 'rect', icon: Square, label: 'Rectangle (R)' },
    { tool: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
    { tool: 'line', icon: Minus, label: 'Line (L)' },
    { tool: 'text', icon: Type, label: 'Text (T)' },
    { tool: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser (E)' },
  ]

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-14 bg-neutral-900/90 border-r border-neutral-800 flex flex-col items-center py-3 gap-1 shrink-0">
        {tools.map(t => <ToolButton key={t.tool} icon={t.icon} label={t.label} active={tool === t.tool} onClick={() => setTool(t.tool)} />)}
        <Separator className="my-2 w-7 bg-neutral-700" />
        <div className="flex flex-col gap-1 items-center">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-neutral-600 hover:border-neutral-400'}`} style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
        <Separator className="my-2 w-7 bg-neutral-700" />
        <div className="flex flex-col gap-1 items-center">
          {STROKE_WIDTHS.map(sw => (
            <button key={sw.label} onClick={() => setStrokeWidth(sw.value)} title={sw.label} className={`w-9 h-7 rounded flex items-center justify-center transition-all ${strokeWidth === sw.value ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}>
              <div className="rounded-full bg-current" style={{ width: sw.value * 2.5, height: sw.value * 2.5 }} />
            </button>
          ))}
        </div>
        <Separator className="my-2 w-7 bg-neutral-700" />
        <ToolButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={handleUndo} />
        <ToolButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={handleRedo} />
        <ToolButton icon={Trash2} label="Clear Board" onClick={handleClear} />
        <div className="flex-1" />
        <ToolButton icon={ZoomIn} label="Zoom In" onClick={() => setZoom(z => Math.min(3, z + 0.25))} />
        <div className="text-[10px] text-neutral-500 font-mono my-0.5">{Math.round(zoom * 100)}%</div>
        <ToolButton icon={ZoomOut} label="Zoom Out" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} />
        <ToolButton icon={Maximize} label="Fit to Screen" onClick={() => setZoom(1)} />
      </div>
      <div ref={containerRef} className="flex-1 bg-neutral-950 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ cursor: cursorForTool[tool] }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (isDrawing.current) { isDrawing.current = false; currentStroke.current = [] } }}
        />
      </div>
    </div>
  )
}

// --- Main Page ---

export default function WhiteboardPage() {
  const { currentOrgId } = useOrg()
  const allBoards = useTable(tables.whiteboard_board)
  const createWhiteboardBoard = useReducer(reducers.createWhiteboardBoard)
  const updateWhiteboardBoard = useReducer(reducers.updateWhiteboardBoard)
  const deleteWhiteboardBoard = useReducer(reducers.deleteWhiteboardBoard)

  const [activeBoardId, setActiveBoardId] = useState<number | null>(null)

  const boards = useMemo(() => {
    if (currentOrgId === null) return []
    return allBoards
      .filter(b => b.orgId === BigInt(currentOrgId))
      .map(b => ({
        id: Number(b.id),
        title: b.title,
        modified: tsToDate(b.modifiedAt),
        elements: parseJson<DrawElement[]>(b.elementsJson, []),
        previewColor: b.previewColor || '#3b82f6',
      }))
  }, [allBoards, currentOrgId])

  const activeBoard = boards.find(b => b.id === activeBoardId) || null

  const handleNewBoard = useCallback(() => {
    if (currentOrgId === null) return
    createWhiteboardBoard({
      orgId: BigInt(currentOrgId),
      title: 'Untitled Board',
      previewColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    })
  }, [currentOrgId, createWhiteboardBoard])

  const handleNewFromTemplate = useCallback((template: typeof BOARD_TEMPLATES[0]) => {
    if (currentOrgId === null) return
    createWhiteboardBoard({
      orgId: BigInt(currentOrgId),
      title: template.name,
      previewColor: template.color,
    })
    // After creation, we need to find and update with elements — schedule for next render
    setTimeout(() => {
      const latest = allBoards
        .filter(b => b.orgId === BigInt(currentOrgId!))
        .sort((a, b) => Number(b.id) - Number(a.id))[0]
      if (latest) {
        updateWhiteboardBoard({
          boardId: latest.id,
          title: template.name,
          elementsJson: JSON.stringify(template.elements),
        })
      }
    }, 500)
  }, [currentOrgId, createWhiteboardBoard, updateWhiteboardBoard, allBoards])

  const handleDeleteBoard = useCallback((id: number) => {
    deleteWhiteboardBoard({ boardId: BigInt(id) })
  }, [deleteWhiteboardBoard])

  const handleRenameBoard = useCallback((id: number, title: string) => {
    const board = boards.find(b => b.id === id)
    if (!board) return
    updateWhiteboardBoard({
      boardId: BigInt(id),
      title,
      elementsJson: JSON.stringify(board.elements),
    })
  }, [boards, updateWhiteboardBoard])

  const handleDuplicateBoard = useCallback((id: number) => {
    if (currentOrgId === null) return
    const board = boards.find(b => b.id === id)
    if (!board) return
    createWhiteboardBoard({
      orgId: BigInt(currentOrgId),
      title: `${board.title} (Copy)`,
      previewColor: board.previewColor,
    })
    // Update with elements after creation
    setTimeout(() => {
      const latest = allBoards
        .filter(b => b.orgId === BigInt(currentOrgId!))
        .sort((a, b) => Number(b.id) - Number(a.id))[0]
      if (latest) {
        updateWhiteboardBoard({
          boardId: latest.id,
          title: `${board.title} (Copy)`,
          elementsJson: JSON.stringify(board.elements),
        })
      }
    }, 500)
  }, [currentOrgId, boards, createWhiteboardBoard, updateWhiteboardBoard, allBoards])

  const handleSave = useCallback((title: string, elements: DrawElement[]) => {
    if (activeBoardId === null) return
    updateWhiteboardBoard({
      boardId: BigInt(activeBoardId),
      title,
      elementsJson: JSON.stringify(elements),
    })
  }, [activeBoardId, updateWhiteboardBoard])

  // Editor uses its own dark chrome (canvas needs dark bg)
  if (activeBoard) {
    return (
      <div className="flex flex-col h-screen bg-neutral-950 text-white">
        <div className="h-12 border-b border-neutral-800 flex items-center px-3 gap-3 shrink-0 bg-neutral-900/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5 bg-neutral-700" />
          <PresenceBar />
          <Separator orientation="vertical" className="h-5 bg-neutral-700" />
          <Button variant="ghost" size="sm" onClick={() => { handleSave(activeBoard.title, activeBoard.elements); setActiveBoardId(null) }} className="text-neutral-400 hover:text-white gap-1.5 h-7 px-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Boards
          </Button>
          <span className="text-sm text-neutral-300 font-medium truncate">{activeBoard.title}</span>
        </div>
        <BoardEditor
          boardId={activeBoard.id}
          title={activeBoard.title}
          initialElements={activeBoard.elements}
          onBack={() => setActiveBoardId(null)}
          onSave={handleSave}
        />
      </div>
    )
  }

  // List view uses standard app theming
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
          <BoardListView
            boards={boards}
            onOpenBoard={id => setActiveBoardId(id)}
            onNewBoard={handleNewBoard}
            onNewFromTemplate={handleNewFromTemplate}
            onDeleteBoard={handleDeleteBoard}
            onRenameBoard={handleRenameBoard}
            onDuplicateBoard={handleDuplicateBoard}
          />
        </div>
      </div>
    </div>
  )
}
