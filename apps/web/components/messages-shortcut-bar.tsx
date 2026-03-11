'use client'

import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { MESSAGE_SHORTCUTS } from '@/hooks/use-messages-keyboard'

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border/60 bg-muted/80 px-1 font-mono text-[10px] font-medium text-muted-foreground leading-none">
      {children}
    </kbd>
  )
}

export function MessagesShortcutBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-b border-border/50 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-muted-foreground/70 shrink-0">
        <Keyboard className="h-3 w-3" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Shortcuts</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {MESSAGE_SHORTCUTS.map((s) => (
          <div key={s.label} className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5">
              {s.keys.map((k, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-[9px] text-muted-foreground/40">/</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground/60">{s.label}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
