'use client'

import '@blocknote/core/fonts/inter.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useTheme } from 'next-themes'
import { useCallback, useRef, useEffect } from 'react'

export interface HeadingItem {
  id: string
  text: string
  level: number
}

export interface DocumentStats {
  words: number
  characters: number
  paragraphs: number
  headings: number
  readingTime: number // minutes
}

interface BlockEditorProps {
  initialContent?: any
  onChange?: (content: any) => void
  onHeadingsChange?: (headings: HeadingItem[]) => void
  onEditorReady?: (editor: any) => void
  onStatsChange?: (stats: DocumentStats) => void
  editable?: boolean
  fullWidth?: boolean
  focusMode?: boolean
}

function extractHeadingsFromBlocks(blocks: any[]): HeadingItem[] {
  const headings: HeadingItem[] = []
  const walk = (items: any[]) => {
    for (const block of items) {
      if (block.type === 'heading') {
        const text = (block.content || [])
          .map((c: any) => c.text || '')
          .join('')
        if (text.trim()) {
          headings.push({
            id: block.id,
            text: text.trim(),
            level: block.props?.level ?? 1,
          })
        }
      }
      if (block.children?.length) walk(block.children)
    }
  }
  walk(blocks)
  return headings
}

function computeStats(blocks: any[]): DocumentStats {
  let words = 0
  let characters = 0
  let paragraphs = 0
  let headingCount = 0
  const walk = (items: any[]) => {
    for (const block of items) {
      if (block.type === 'heading') headingCount++
      if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem') {
        paragraphs++
      }
      if (block.content && Array.isArray(block.content)) {
        for (const inline of block.content) {
          if (inline.text) {
            const txt = inline.text
            characters += txt.length
            words += txt.trim().split(/\s+/).filter(Boolean).length
          }
        }
      }
      if (block.children?.length) walk(block.children)
    }
  }
  walk(blocks)
  return { words, characters, paragraphs, headings: headingCount, readingTime: Math.max(1, Math.ceil(words / 200)) }
}

/** Scroll to a BlockNote block by its ID */
export function scrollToBlock(blockId: string) {
  const el = document.querySelector(`[data-id="${blockId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-violet-500/50', 'rounded-lg', 'transition-all')
    setTimeout(() => el.classList.remove('ring-2', 'ring-violet-500/50', 'rounded-lg', 'transition-all'), 1500)
  }
}

/** Extract plain-text preview from BlockNote content JSON string */
export function extractPreviewText(content: string, maxLength = 120): string {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return ''
    const texts: string[] = []
    const walk = (blocks: any[]) => {
      for (const block of blocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const inline of block.content) {
            if (inline.text) texts.push(inline.text)
          }
        }
        if (block.children?.length) walk(block.children)
        if (texts.join(' ').length > maxLength) return
      }
    }
    walk(parsed)
    const full = texts.join(' ').trim()
    return full.length > maxLength ? full.slice(0, maxLength) + '...' : full
  } catch {
    return ''
  }
}

/** Extract heading structure from BlockNote content JSON string (for TOC without editor) */
export function extractHeadingsFromContent(content: string): HeadingItem[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return []
    return extractHeadingsFromBlocks(parsed)
  } catch {
    return []
  }
}

/** Compute document statistics from content JSON string */
export function computeStatsFromContent(content: string): DocumentStats | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return null
    return computeStats(parsed)
  } catch {
    return null
  }
}

export default function BlockEditor({
  initialContent,
  onChange,
  onHeadingsChange,
  onEditorReady,
  onStatsChange,
  editable = true,
  fullWidth = false,
  focusMode = false,
}: BlockEditorProps) {
  const { resolvedTheme } = useTheme()
  const headingsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onHeadingsChangeRef = useRef(onHeadingsChange)
  const onEditorReadyRef = useRef(onEditorReady)
  const onStatsChangeRef = useRef(onStatsChange)
  onHeadingsChangeRef.current = onHeadingsChange
  onEditorReadyRef.current = onEditorReady
  onStatsChangeRef.current = onStatsChange

  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  })

  // Notify parent of editor instance
  useEffect(() => {
    onEditorReadyRef.current?.(editor)
  }, [editor])

  // Extract headings + stats on mount
  useEffect(() => {
    if (editor.document) {
      if (onHeadingsChangeRef.current) {
        const h = extractHeadingsFromBlocks(editor.document)
        onHeadingsChangeRef.current(h)
      }
      if (onStatsChangeRef.current) {
        const s = computeStats(editor.document)
        onStatsChangeRef.current(s)
      }
    }
  }, [editor])

  const handleChange = useCallback(() => {
    onChange?.(editor.document)
    // Debounce heading + stats extraction
    if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current)
    headingsTimerRef.current = setTimeout(() => {
      if (onHeadingsChangeRef.current) {
        const h = extractHeadingsFromBlocks(editor.document)
        onHeadingsChangeRef.current(h)
      }
      if (onStatsChangeRef.current) {
        const s = computeStats(editor.document)
        onStatsChangeRef.current(s)
      }
    }, 300)
  }, [editor, onChange])

  useEffect(() => {
    return () => {
      if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current)
    }
  }, [])

  return (
    <div
      className={[
        'bn-container',
        '[&_.bn-editor]:min-h-[calc(100vh-200px)]',
        '[&_.bn-editor]:px-8',
        '[&_.bn-editor]:py-6',
        fullWidth ? '' : '[&_.bn-editor]:max-w-4xl [&_.bn-editor]:mx-auto',
        // Premium typography
        '[&_.bn-block-group]:leading-relaxed',
        // Code block styling
        '[&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50',
        '[&_code]:text-[13px] [&_code]:font-mono',
        // Table styling
        '[&_table]:border-collapse [&_td]:border [&_td]:px-3 [&_td]:py-1.5',
        '[&_th]:border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted/50 [&_th]:font-semibold',
        // Focus mode — larger text, more padding
        focusMode ? '[&_.bn-editor]:text-lg [&_.bn-editor]:leading-loose [&_.bn-editor]:py-12 [&_.bn-editor]:px-12' : '',
      ].filter(Boolean).join(' ')}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      />
    </div>
  )
}
