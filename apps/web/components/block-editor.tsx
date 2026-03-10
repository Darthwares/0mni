'use client'

import '@blocknote/core/fonts/inter.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

interface BlockEditorProps {
  initialContent?: any
  onChange?: (content: any) => void
  editable?: boolean
}

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  })

  return (
    <div className="bn-container [&_.bn-editor]:min-h-[calc(100vh-200px)]">
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={() => {
          onChange?.(editor.document)
        }}
        theme="dark"
      />
    </div>
  )
}
