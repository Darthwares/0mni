'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

// --- Types ---

type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'line' | 'text' | 'sticky' | 'eraser'

interface Point {
  x: number
  y: number
}

interface Stroke {
  type: 'pen' | 'eraser'
  points: Point[]
  color: string
  width: number
}

interface RectShape {
  type: 'rect'
  start: Point
  end: Point
  color: string
  width: number
}

interface EllipseShape {
  type: 'ellipse'
  start: Point
  end: Point
  color: string
  width: number
}

interface LineShape {
  type: 'line'
  start: Point
  end: Point
  color: string
  width: number
}

interface TextShape {
  type: 'text'
  position: Point
  content: string
  color: string
  fontSize: number
}

interface StickyShape {
  type: 'sticky'
  position: Point
  content: string
  bgColor: string
  width: number
  height: number
}

type DrawElement = Stroke | RectShape | EllipseShape | LineShape | TextShape | StickyShape

interface Board {
  id: string
  title: string
  lastModified: string
  collaborators: number
  elements: DrawElement[]
  previewColor: string
}

// --- Constants ---

const PRESET_COLORS = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

const STICKY_COLORS = ['#fef08a', '#fde68a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3']

const STROKE_WIDTHS: { label: string; value: number }[] = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

const SAMPLE_BOARDS: Board[] = [
  {
    id: 'board-1',
    title: 'Product Roadmap Q2',
    lastModified: '2 hours ago',
    collaborators: 5,
    elements: [
      { type: 'sticky', position: { x: 80, y: 80 }, content: 'Launch v2.0', bgColor: '#fef08a', width: 160, height: 120 },
      { type: 'sticky', position: { x: 280, y: 80 }, content: 'User Research', bgColor: '#bbf7d0', width: 160, height: 120 },
      { type: 'sticky', position: { x: 480, y: 80 }, content: 'API Redesign', bgColor: '#bfdbfe', width: 160, height: 120 },
      { type: 'line', start: { x: 240, y: 140 }, end: { x: 280, y: 140 }, color: '#ffffff', width: 2 },
      { type: 'line', start: { x: 440, y: 140 }, end: { x: 480, y: 140 }, color: '#ffffff', width: 2 },
    ],
    previewColor: '#3b82f6',
  },
  {
    id: 'board-2',
    title: 'Sprint Retrospective',
    lastModified: '1 day ago',
    collaborators: 8,
    elements: [
      { type: 'rect', start: { x: 50, y: 50 }, end: { x: 250, y: 300 }, color: '#22c55e', width: 2 },
      { type: 'rect', start: { x: 280, y: 50 }, end: { x: 480, y: 300 }, color: '#ef4444', width: 2 },
      { type: 'rect', start: { x: 510, y: 50 }, end: { x: 710, y: 300 }, color: '#3b82f6', width: 2 },
      { type: 'text', position: { x: 110, y: 80 }, content: 'Went Well', color: '#22c55e', fontSize: 16 },
      { type: 'text', position: { x: 330, y: 80 }, content: 'Improve', color: '#ef4444', fontSize: 16 },
      { type: 'text', position: { x: 565, y: 80 }, content: 'Actions', color: '#3b82f6', fontSize: 16 },
    ],
    previewColor: '#22c55e',
  },
  {
    id: 'board-3',
    title: 'System Architecture',
    lastModified: '3 days ago',
    collaborators: 3,
    elements: [
      { type: 'rect', start: { x: 200, y: 40 }, end: { x: 400, y: 100 }, color: '#8b5cf6', width: 2 },
      { type: 'text', position: { x: 255, y: 78 }, content: 'Frontend', color: '#8b5cf6', fontSize: 14 },
      { type: 'line', start: { x: 300, y: 100 }, end: { x: 300, y: 160 }, color: '#6b7280', width: 2 },
      { type: 'rect', start: { x: 200, y: 160 }, end: { x: 400, y: 220 }, color: '#3b82f6', width: 2 },
      { type: 'text', position: { x: 262, y: 198 }, content: 'API Layer', color: '#3b82f6', fontSize: 14 },
      { type: 'line', start: { x: 300, y: 220 }, end: { x: 300, y: 280 }, color: '#6b7280', width: 2 },
      { type: 'ellipse', start: { x: 220, y: 280 }, end: { x: 380, y: 360 }, color: '#f97316', width: 2 },
      { type: 'text', position: { x: 260, y: 328 }, content: 'Database', color: '#f97316', fontSize: 14 },
    ],
    previewColor: '#8b5cf6',
  },
]

// --- Tool Button ---

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150
        ${active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-700/80'
        }
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// --- Board List View ---

function BoardListView({
  boards,
  onOpenBoard,
  onNewBoard,
}: {
  boards: Board[]
  onOpenBoard: (id: string) => void
  onNewBoard: () => void
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')

  const filtered = boards
    .filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return 0 // already in recent order
    })

  const sharedCount = boards.filter((b) => b.collaborators > 1).length

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SpotlightCard className="!p-4" spotlightColor="rgba(6, 182, 212, 0.15)">
            <div className="text-xs text-neutral-400 mb-1">Total Boards</div>
            <div className="text-2xl font-bold text-white">
              <CountUp to={boards.length} duration={1} />
            </div>
          </SpotlightCard>
          <SpotlightCard className="!p-4" spotlightColor="rgba(59, 130, 246, 0.15)">
            <div className="text-xs text-neutral-400 mb-1">Shared Boards</div>
            <div className="text-2xl font-bold text-white">
              <CountUp to={sharedCount} duration={1} />
            </div>
          </SpotlightCard>
          <SpotlightCard className="!p-4" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="text-xs text-neutral-400 mb-1">Recent Activity</div>
            <div className="text-2xl font-bold text-white">
              <CountUp to={12} duration={1} />
            </div>
          </SpotlightCard>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-neutral-900 border-neutral-700 text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            className="text-neutral-400 hover:text-white gap-1.5"
          >
            {sortBy === 'recent' ? <Clock className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
            {sortBy === 'recent' ? 'Recent' : 'A-Z'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-400 hover:text-white"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        {/* Board Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* New Board Card */}
          <button
            onClick={onNewBoard}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-700 hover:border-blue-500/60 bg-neutral-900/40 hover:bg-neutral-800/60 transition-all duration-200 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-neutral-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <span className="text-sm text-neutral-500 group-hover:text-blue-400 font-medium transition-colors">
              New Board
            </span>
          </button>

          {/* Board Cards */}
          {filtered.map((board) => (
            <button
              key={board.id}
              onClick={() => onOpenBoard(board.id)}
              className="group flex flex-col rounded-xl border border-neutral-800 hover:border-neutral-600 bg-neutral-900/60 hover:bg-neutral-800/60 transition-all duration-200 overflow-hidden text-left"
            >
              {/* Preview Thumbnail */}
              <div className="relative h-28 bg-neutral-950 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${board.previewColor}, transparent 70%)`,
                  }}
                />
                {/* Mini preview shapes */}
                <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet">
                  {board.elements.slice(0, 6).map((el, i) => {
                    if (el.type === 'rect') {
                      const r = el as RectShape
                      return (
                        <rect
                          key={i}
                          x={r.start.x * 0.4}
                          y={r.start.y * 0.35}
                          width={Math.abs(r.end.x - r.start.x) * 0.4}
                          height={Math.abs(r.end.y - r.start.y) * 0.35}
                          fill="none"
                          stroke={r.color}
                          strokeWidth={1}
                          opacity={0.6}
                        />
                      )
                    }
                    if (el.type === 'sticky') {
                      const s = el as StickyShape
                      return (
                        <rect
                          key={i}
                          x={s.position.x * 0.4}
                          y={s.position.y * 0.35}
                          width={s.width * 0.4}
                          height={s.height * 0.35}
                          fill={s.bgColor}
                          opacity={0.5}
                          rx={3}
                        />
                      )
                    }
                    if (el.type === 'ellipse') {
                      const e = el as EllipseShape
                      const cx = ((e.start.x + e.end.x) / 2) * 0.4
                      const cy = ((e.start.y + e.end.y) / 2) * 0.35
                      const rx = (Math.abs(e.end.x - e.start.x) / 2) * 0.4
                      const ry = (Math.abs(e.end.y - e.start.y) / 2) * 0.35
                      return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={e.color} strokeWidth={1} opacity={0.6} />
                    }
                    if (el.type === 'line') {
                      const l = el as LineShape
                      return <line key={i} x1={l.start.x * 0.4} y1={l.start.y * 0.35} x2={l.end.x * 0.4} y2={l.end.y * 0.35} stroke={l.color} strokeWidth={1} opacity={0.6} />
                    }
                    return null
                  })}
                </svg>
              </div>
              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-1">
                <div className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                  {board.title}
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {board.lastModified}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {board.collaborators}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Board Editor View ---

function BoardEditor({
  board,
  onBack,
  onUpdateBoard,
}: {
  board: Board
  onBack: () => void
  onUpdateBoard: (updated: Board) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [elements, setElements] = useState<DrawElement[]>(board.elements)
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([])

  const isDrawing = useRef(false)
  const currentStroke = useRef<Point[]>([])
  const startPoint = useRef<Point | null>(null)

  // Canvas cursor based on tool
  const cursorForTool: Record<Tool, string> = {
    select: 'default',
    pen: 'crosshair',
    rect: 'crosshair',
    ellipse: 'crosshair',
    line: 'crosshair',
    text: 'text',
    sticky: 'cell',
    eraser: 'pointer',
  }

  // Push to undo stack
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-30), elements])
    setRedoStack([])
  }, [elements])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack((r) => [...r, elements])
    setUndoStack((u) => u.slice(0, -1))
    setElements(prev)
  }, [undoStack, elements])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack((u) => [...u, elements])
    setRedoStack((r) => r.slice(0, -1))
    setElements(next)
  }, [redoStack, elements])

  const handleClear = useCallback(() => {
    pushUndo()
    setElements([])
  }, [pushUndo])

  // Get mouse position relative to canvas, accounting for zoom
  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      }
    },
    [zoom]
  )

  // Eraser: check if point is near any element
  const eraseAt = useCallback(
    (pos: Point) => {
      const threshold = 12
      const idx = elements.findIndex((el) => {
        if (el.type === 'pen' || el.type === 'eraser') {
          return (el as Stroke).points.some(
            (p) => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold
          )
        }
        if (el.type === 'rect') {
          const r = el as RectShape
          const minX = Math.min(r.start.x, r.end.x)
          const maxX = Math.max(r.start.x, r.end.x)
          const minY = Math.min(r.start.y, r.end.y)
          const maxY = Math.max(r.start.y, r.end.y)
          return pos.x >= minX - threshold && pos.x <= maxX + threshold && pos.y >= minY - threshold && pos.y <= maxY + threshold
        }
        if (el.type === 'ellipse') {
          const e = el as EllipseShape
          const cx = (e.start.x + e.end.x) / 2
          const cy = (e.start.y + e.end.y) / 2
          const rx = Math.abs(e.end.x - e.start.x) / 2
          const ry = Math.abs(e.end.y - e.start.y) / 2
          if (rx === 0 || ry === 0) return false
          const dist = ((pos.x - cx) ** 2) / rx ** 2 + ((pos.y - cy) ** 2) / ry ** 2
          return Math.abs(dist - 1) < 0.5
        }
        if (el.type === 'line') {
          const l = el as LineShape
          const len = Math.hypot(l.end.x - l.start.x, l.end.y - l.start.y)
          if (len === 0) return Math.hypot(pos.x - l.start.x, pos.y - l.start.y) < threshold
          const t = Math.max(0, Math.min(1,
            ((pos.x - l.start.x) * (l.end.x - l.start.x) + (pos.y - l.start.y) * (l.end.y - l.start.y)) / len ** 2
          ))
          const proj = { x: l.start.x + t * (l.end.x - l.start.x), y: l.start.y + t * (l.end.y - l.start.y) }
          return Math.hypot(pos.x - proj.x, pos.y - proj.y) < threshold
        }
        if (el.type === 'text') {
          const t = el as TextShape
          return pos.x >= t.position.x - 10 && pos.x <= t.position.x + 200 && pos.y >= t.position.y - t.fontSize && pos.y <= t.position.y + 10
        }
        if (el.type === 'sticky') {
          const s = el as StickyShape
          return pos.x >= s.position.x && pos.x <= s.position.x + s.width && pos.y >= s.position.y && pos.y <= s.position.y + s.height
        }
        return false
      })
      if (idx !== -1) {
        pushUndo()
        setElements((prev) => prev.filter((_, i) => i !== idx))
      }
    },
    [elements, pushUndo]
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'select') return
      const pos = getPos(e)

      if (tool === 'text') {
        const text = prompt('Enter text:')
        if (text) {
          pushUndo()
          setElements((prev) => [
            ...prev,
            { type: 'text', position: pos, content: text, color, fontSize: 16 + strokeWidth * 2 } as TextShape,
          ])
        }
        return
      }

      if (tool === 'sticky') {
        const text = prompt('Sticky note text:') || ''
        const stickyColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)]
        pushUndo()
        setElements((prev) => [
          ...prev,
          { type: 'sticky', position: pos, content: text, bgColor: stickyColor, width: 160, height: 120 } as StickyShape,
        ])
        return
      }

      if (tool === 'eraser') {
        isDrawing.current = true
        eraseAt(pos)
        return
      }

      isDrawing.current = true
      startPoint.current = pos

      if (tool === 'pen') {
        currentStroke.current = [pos]
      }
    },
    [tool, color, strokeWidth, getPos, pushUndo, eraseAt]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return
      const pos = getPos(e)

      if (tool === 'eraser') {
        eraseAt(pos)
        return
      }

      if (tool === 'pen') {
        currentStroke.current.push(pos)
        // Draw live stroke
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const pts = currentStroke.current
        if (pts.length < 2) return
        ctx.save()
        ctx.scale(zoom, zoom)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
        ctx.restore()
        return
      }

      // For shapes, redraw everything + preview
      redrawCanvas(elements, ctx => {
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.setLineDash([6, 4])
        const s = startPoint.current!
        if (tool === 'rect') {
          ctx.strokeRect(s.x, s.y, pos.x - s.x, pos.y - s.y)
        } else if (tool === 'ellipse') {
          const cx = (s.x + pos.x) / 2
          const cy = (s.y + pos.y) / 2
          const rx = Math.abs(pos.x - s.x) / 2
          const ry = Math.abs(pos.y - s.y) / 2
          ctx.beginPath()
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          ctx.stroke()
        } else if (tool === 'line') {
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
        }
        ctx.setLineDash([])
      })
    },
    [tool, color, strokeWidth, zoom, getPos, elements, eraseAt]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return
      isDrawing.current = false
      const pos = getPos(e)

      if (tool === 'eraser') return

      pushUndo()

      if (tool === 'pen') {
        if (currentStroke.current.length > 1) {
          setElements((prev) => [
            ...prev,
            { type: 'pen', points: [...currentStroke.current], color, width: strokeWidth } as Stroke,
          ])
        }
        currentStroke.current = []
        return
      }

      const s = startPoint.current!
      if (tool === 'rect') {
        setElements((prev) => [...prev, { type: 'rect', start: s, end: pos, color, width: strokeWidth } as RectShape])
      } else if (tool === 'ellipse') {
        setElements((prev) => [...prev, { type: 'ellipse', start: s, end: pos, color, width: strokeWidth } as EllipseShape])
      } else if (tool === 'line') {
        setElements((prev) => [...prev, { type: 'line', start: s, end: pos, color, width: strokeWidth } as LineShape])
      }
      startPoint.current = null
    },
    [tool, color, strokeWidth, getPos, pushUndo]
  )

  // Render a single element
  const renderElement = useCallback((ctx: CanvasRenderingContext2D, el: DrawElement) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (el.type === 'pen') {
      const s = el as Stroke
      if (s.points.length < 2) return
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.beginPath()
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y)
      }
      ctx.stroke()
    } else if (el.type === 'rect') {
      const r = el as RectShape
      ctx.strokeStyle = r.color
      ctx.lineWidth = r.width
      ctx.strokeRect(r.start.x, r.start.y, r.end.x - r.start.x, r.end.y - r.start.y)
    } else if (el.type === 'ellipse') {
      const e = el as EllipseShape
      const cx = (e.start.x + e.end.x) / 2
      const cy = (e.start.y + e.end.y) / 2
      const rx = Math.abs(e.end.x - e.start.x) / 2
      const ry = Math.abs(e.end.y - e.start.y) / 2
      ctx.strokeStyle = e.color
      ctx.lineWidth = e.width
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (el.type === 'line') {
      const l = el as LineShape
      ctx.strokeStyle = l.color
      ctx.lineWidth = l.width
      ctx.beginPath()
      ctx.moveTo(l.start.x, l.start.y)
      ctx.lineTo(l.end.x, l.end.y)
      ctx.stroke()
    } else if (el.type === 'text') {
      const t = el as TextShape
      ctx.fillStyle = t.color
      ctx.font = `${t.fontSize}px Inter, system-ui, sans-serif`
      ctx.fillText(t.content, t.position.x, t.position.y)
    } else if (el.type === 'sticky') {
      const s = el as StickyShape
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      // Background
      ctx.fillStyle = s.bgColor
      const radius = 6
      ctx.beginPath()
      ctx.moveTo(s.position.x + radius, s.position.y)
      ctx.lineTo(s.position.x + s.width - radius, s.position.y)
      ctx.quadraticCurveTo(s.position.x + s.width, s.position.y, s.position.x + s.width, s.position.y + radius)
      ctx.lineTo(s.position.x + s.width, s.position.y + s.height - radius)
      ctx.quadraticCurveTo(s.position.x + s.width, s.position.y + s.height, s.position.x + s.width - radius, s.position.y + s.height)
      ctx.lineTo(s.position.x + radius, s.position.y + s.height)
      ctx.quadraticCurveTo(s.position.x, s.position.y + s.height, s.position.x, s.position.y + s.height - radius)
      ctx.lineTo(s.position.x, s.position.y + radius)
      ctx.quadraticCurveTo(s.position.x, s.position.y, s.position.x + radius, s.position.y)
      ctx.closePath()
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      // Text
      ctx.fillStyle = '#1e1e1e'
      ctx.font = '13px Inter, system-ui, sans-serif'
      const lines = wrapText(ctx, s.content, s.width - 20)
      lines.forEach((line, idx) => {
        ctx.fillText(line, s.position.x + 10, s.position.y + 24 + idx * 18)
      })
    }
  }, [])

  // Wrap text helper
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : ['']
  }

  // Redraw canvas
  const redrawCanvas = useCallback(
    (els: DrawElement[], preview?: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Subtle grid
      ctx.save()
      ctx.scale(zoom, zoom)
      const gridSize = 40
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      const w = canvas.width / zoom
      const h = canvas.height / zoom
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      els.forEach((el) => renderElement(ctx, el))

      if (preview) {
        preview(ctx)
      }
      ctx.restore()
    },
    [zoom, renderElement]
  )

  // Resize canvas to fit container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      redrawCanvas(elements)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when elements or zoom change
  useEffect(() => {
    redrawCanvas(elements)
  }, [elements, zoom, redrawCanvas])

  // Sync elements back to board
  useEffect(() => {
    onUpdateBoard({ ...board, elements })
  }, [elements]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo() }
        if (e.key === 'y') { e.preventDefault(); handleRedo() }
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select')
        if (e.key === 'p' || e.key === 'P') setTool('pen')
        if (e.key === 'r' || e.key === 'R') setTool('rect')
        if (e.key === 'o' || e.key === 'O') setTool('ellipse')
        if (e.key === 'l' || e.key === 'L') setTool('line')
        if (e.key === 't' || e.key === 'T') setTool('text')
        if (e.key === 's' || e.key === 'S') setTool('sticky')
        if (e.key === 'e' || e.key === 'E') setTool('eraser')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo])

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
      {/* Left Toolbar */}
      <div className="w-14 bg-neutral-900/90 border-r border-neutral-800 flex flex-col items-center py-3 gap-1 shrink-0">
        {/* Tools */}
        {tools.map((t) => (
          <ToolButton key={t.tool} icon={t.icon} label={t.label} active={tool === t.tool} onClick={() => setTool(t.tool)} />
        ))}

        <Separator className="my-2 w-7 bg-neutral-700" />

        {/* Colors */}
        <div className="flex flex-col gap-1 items-center">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                color === c ? 'border-white scale-125' : 'border-neutral-600 hover:border-neutral-400'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <Separator className="my-2 w-7 bg-neutral-700" />

        {/* Stroke Width */}
        <div className="flex flex-col gap-1 items-center">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.label}
              onClick={() => setStrokeWidth(sw.value)}
              title={sw.label}
              className={`w-9 h-7 rounded flex items-center justify-center transition-all ${
                strokeWidth === sw.value
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: sw.value * 2.5, height: sw.value * 2.5 }}
              />
            </button>
          ))}
        </div>

        <Separator className="my-2 w-7 bg-neutral-700" />

        {/* Actions */}
        <ToolButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={handleUndo} />
        <ToolButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={handleRedo} />
        <ToolButton icon={Trash2} label="Clear Board" onClick={handleClear} />

        <div className="flex-1" />

        {/* Zoom */}
        <ToolButton icon={ZoomIn} label="Zoom In" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} />
        <div className="text-[10px] text-neutral-500 font-mono my-0.5">{Math.round(zoom * 100)}%</div>
        <ToolButton icon={ZoomOut} label="Zoom Out" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} />
        <ToolButton icon={Maximize} label="Fit to Screen" onClick={() => setZoom(1)} />
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 bg-neutral-950 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ cursor: cursorForTool[tool] }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing.current) {
              isDrawing.current = false
              currentStroke.current = []
            }
          }}
        />
      </div>
    </div>
  )
}

// --- Main Page ---

export default function WhiteboardPage() {
  const [boards, setBoards] = useState<Board[]>(SAMPLE_BOARDS)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)

  const activeBoard = boards.find((b) => b.id === activeBoardId) || null

  const handleOpenBoard = (id: string) => setActiveBoardId(id)

  const handleNewBoard = () => {
    const id = `board-${Date.now()}`
    const newBoard: Board = {
      id,
      title: `Untitled Board`,
      lastModified: 'Just now',
      collaborators: 1,
      elements: [],
      previewColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    }
    setBoards((prev) => [newBoard, ...prev])
    setActiveBoardId(id)
  }

  const handleBack = () => setActiveBoardId(null)

  const handleUpdateBoard = (updated: Board) => {
    setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white">
      {/* Top Bar */}
      <div className="h-12 border-b border-neutral-800 flex items-center px-3 gap-3 shrink-0 bg-neutral-900/80">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5 bg-neutral-700" />
        <GradientText
          colors={['#06b6d4', '#3b82f6', '#8b5cf6']}
          className="text-sm font-semibold"
          animationSpeed={6}
        >
          Whiteboard
        </GradientText>
        {activeBoard && (
          <>
            <Separator orientation="vertical" className="h-5 bg-neutral-700" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-neutral-400 hover:text-white gap-1.5 h-7 px-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Boards
            </Button>
            <span className="text-sm text-neutral-300 font-medium truncate">
              {activeBoard.title}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {activeBoard ? (
        <BoardEditor board={activeBoard} onBack={handleBack} onUpdateBoard={handleUpdateBoard} />
      ) : (
        <BoardListView boards={boards} onOpenBoard={handleOpenBoard} onNewBoard={handleNewBoard} />
      )}
    </div>
  )
}
