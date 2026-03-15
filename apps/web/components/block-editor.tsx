'use client'

import '@blocknote/core/fonts/inter.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useTheme } from 'next-themes'

interface BlockEditorProps {
  initialContent?: any
  onChange?: (content: any) => void
  editable?: boolean
}

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  })

  return (
    <div className="bn-container [&_.bn-editor]:min-h-[calc(100vh-200px)] [&_.bn-editor]:max-w-4xl [&_.bn-editor]:mx-auto [&_.bn-editor]:px-8 [&_.bn-editor]:py-6">
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={() => {
          onChange?.(editor.document)
        }}
        theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      />
    </div>
  )
}
