'use client'

import '@blocknote/core/fonts/inter.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  List,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BlockEditorProps {
  initialContent?: any
  onChange?: (content: any) => void
  editable?: boolean
}

// Extract text from BlockNote block tree
function extractText(blocks: any[]): string {
  let text = ''
  for (const block of blocks) {
    if (block.content) {
      if (Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.text) text += item.text + ' '
          if (item.content) text += extractText([item])
        }
      }
    }
    if (block.children?.length) {
      text += extractText(block.children)
    }
  }
  return text
}

// Extract headings for Table of Contents
function extractHeadings(blocks: any[]): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = []
  for (const block of blocks) {
    if (block.type === 'heading' && block.content) {
      const text = block.content.map((c: any) => c.text ?? '').join('')
      if (text.trim()) {
        headings.push({
          id: block.id,
          text: text.trim(),
          level: block.props?.level ?? 1,
        })
      }
    }
    if (block.children?.length) {
      headings.push(...extractHeadings(block.children))
    }
  }
  return headings
}

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
  const { resolvedTheme } = useTheme()
  const [showToc, setShowToc] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  })

  const theme = resolvedTheme === 'light' ? 'light' : 'dark'

  // Update stats when content changes
  const handleChange = useCallback(() => {
    const doc = editor.document
    onChange?.(doc)

    // Update headings
    const h = extractHeadings(doc)
    setHeadings(h)

    // Update word/char count
    const text = extractText(doc)
    const trimmed = text.trim()
    setCharCount(trimmed.length)
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0)
  }, [editor, onChange])

  // Init stats on mount
  useEffect(() => {
    if (editor.document) {
      setHeadings(extractHeadings(editor.document))
      const text = extractText(editor.document)
      const trimmed = text.trim()
      setCharCount(trimmed.length)
      setWordCount(trimmed ? trimmed.split(/\s+/).length : 0)
    }
  }, [editor])

  // Fullscreen escape handler
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isFullscreen])

  // Navigate to heading
  const scrollToBlock = useCallback((blockId: string) => {
    try {
      // BlockNote renders blocks with data-id attribute
      const el = document.querySelector(`[data-id="${blockId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } catch {}
  }, [])

  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background flex flex-col'
    : 'flex flex-col h-full'

  return (
    <div className={containerClass}>
      {/* Toolbar strip */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Button
            variant={showToc ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowToc(!showToc)}
          >
            <List className="size-3.5" />
            Contents
            {headings.length > 0 && (
              <span className="text-muted-foreground">({headings.length})</span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {wordCount.toLocaleString()} words
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {readingTime} min read
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {isFullscreen ? 'Exit' : 'Focus'}
          </Button>
        </div>
      </div>

      {/* Main area: optional TOC + editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table of Contents sidebar */}
        <AnimatePresence>
          {showToc && headings.length > 0 && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="border-r bg-muted/30 overflow-hidden shrink-0"
            >
              <div className="p-3 w-[240px]">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Table of Contents
                </p>
                <nav className="flex flex-col gap-0.5">
                  {headings.map((h, i) => (
                    <button
                      key={h.id}
                      onClick={() => scrollToBlock(h.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded px-2 py-1 hover:bg-accent/50 text-left"
                      style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                    >
                      <ChevronRight className="size-3 shrink-0 opacity-40" />
                      <span className="truncate">{h.text}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <div className="bn-container [&_.bn-editor]:min-h-[calc(100vh-200px)] max-w-4xl mx-auto">
            <BlockNoteView
              editor={editor}
              editable={editable}
              onChange={handleChange}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
