"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navigationShortcuts = [
  { keys: ["g", "d"], description: "Go to Dashboard" },
  { keys: ["g", "m"], description: "Go to Messages" },
  { keys: ["g", "t"], description: "Go to Tickets" },
  { keys: ["g", "c"], description: "Go to Canvas" },
  { keys: ["g", "p"], description: "Go to Profile" },
  { keys: ["g", "s"], description: "Go to Settings" },
]

const messagesShortcuts = [
  { keys: ["↑", "↓"], description: "Navigate channels & DMs" },
  { keys: ["/"], description: "Focus message composer" },
  { keys: ["f"], description: "Focus search" },
  { keys: ["t"], description: "Open thread on last message" },
  { keys: ["e"], description: "Edit your last message" },
  { keys: ["+"], description: "React to last message" },
  { keys: ["n"], description: "Create new channel" },
  { keys: ["Esc"], description: "Close thread / blur input" },
]

const generalShortcuts = [
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["Esc"], description: "Close dialog / panel" },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

function ShortcutRow({
  keys,
  description,
}: {
  keys: string[]
  description: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-xs text-muted-foreground">then</span>
            )}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly. Press{" "}
            <Kbd>g</Kbd> then a letter within 1 second to navigate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Navigation */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </h4>
            <div className="divide-y divide-border">
              {navigationShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.description}
                  keys={shortcut.keys}
                  description={shortcut.description}
                />
              ))}
            </div>
          </div>

          {/* Messages */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Messages
            </h4>
            <div className="divide-y divide-border">
              {messagesShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.description}
                  keys={shortcut.keys}
                  description={shortcut.description}
                />
              ))}
            </div>
          </div>

          {/* General */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              General
            </h4>
            <div className="divide-y divide-border">
              {generalShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.description}
                  keys={shortcut.keys}
                  description={shortcut.description}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
