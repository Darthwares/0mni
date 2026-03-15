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

interface BlockEditorProps {
  initialContent?: any
  onChange?: (content: any) => void
  onHeadingsChange?: (headings: HeadingItem[]) => void
  onEditorReady?: (editor: any) => void
  editable?: boolean
  fullWidth?: boolean
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

/** Scroll to a BlockNote block by its ID */
export function scrollToBlock(blockId: string) {
  // BlockNote renders blocks with data-id attributes
  const el = document.querySelector(`[data-id="${blockId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Flash highlight
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

export default function BlockEditor({
  initialContent,
  onChange,
  onHeadingsChange,
  onEditorReady,
  editable = true,
  fullWidth = false,
}: BlockEditorProps) {
  const { resolvedTheme } = useTheme()
  const headingsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onHeadingsChangeRef = useRef(onHeadingsChange)
  const onEditorReadyRef = useRef(onEditorReady)
  onHeadingsChangeRef.current = onHeadingsChange
  onEditorReadyRef.current = onEditorReady

  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  })

  // Notify parent of editor instance
  useEffect(() => {
    onEditorReadyRef.current?.(editor)
  }, [editor])

  // Extract headings on mount
  useEffect(() => {
    if (onHeadingsChangeRef.current && editor.document) {
      const h = extractHeadingsFromBlocks(editor.document)
      onHeadingsChangeRef.current(h)
    }
  }, [editor])

  const handleChange = useCallback(() => {
    onChange?.(editor.document)
    // Debounce heading extraction
    if (onHeadingsChangeRef.current) {
      if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current)
      headingsTimerRef.current = setTimeout(() => {
        const h = extractHeadingsFromBlocks(editor.document)
        onHeadingsChangeRef.current?.(h)
      }, 300)
    }
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
