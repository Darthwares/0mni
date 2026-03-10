'use client'

import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawEditorProps {
  initialData?: any
  onChange?: (elements: any[], appState: any) => void
}

export default function ExcalidrawEditor({ initialData, onChange }: ExcalidrawEditorProps) {
  return (
    <div className="h-full w-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <Excalidraw
        initialData={initialData}
        onChange={(elements, appState) => {
          onChange?.(elements as any[], appState)
        }}
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  )
}
