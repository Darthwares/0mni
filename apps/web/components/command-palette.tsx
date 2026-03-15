"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTable } from "spacetimedb/react"
import { tables } from "@/generated"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  Headphones,
  TrendingUp,
  Users,
  Code2,
  FileText,
  Bot,
  Sparkles,
  Activity,
  Settings,
  KanbanSquare,
  PenTool,
  Hash,
  User,
  CheckSquare,
} from "lucide-react"

const navigationItems = [
  { title: "Feed", href: "/feed", icon: LayoutDashboard, keywords: "home feed timeline posts social" },
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview" },
  { title: "Messages", href: "/messages", icon: MessageSquare, keywords: "chat channels dm" },
  { title: "Tickets", href: "/tickets", icon: KanbanSquare, keywords: "kanban board tasks" },
  { title: "Canvas", href: "/canvas", icon: PenTool, keywords: "documents editor whiteboard" },
  { title: "Profile", href: "/profile", icon: User, keywords: "account me" },
  { title: "Settings", href: "/settings", icon: Settings, keywords: "preferences config" },
  { title: "Support", href: "/support", icon: Headphones, keywords: "help desk tickets" },
  { title: "Sales", href: "/sales", icon: TrendingUp, keywords: "crm deals leads pipeline" },
  { title: "Recruitment", href: "/recruitment", icon: Users, keywords: "hiring candidates jobs" },
  { title: "Engineering", href: "/engineering", icon: Code2, keywords: "dev code repos bugs" },
  { title: "Activity", href: "/activity", icon: Activity, keywords: "feed log events" },
  { title: "Email", href: "/email", icon: Mail, keywords: "inbox mail" },
  { title: "Collaboration", href: "/collaboration", icon: FileText, keywords: "docs files" },
  { title: "AI Employees", href: "/ai-employees", icon: Bot, keywords: "agents bots automation" },
  { title: "Agent Studio", href: "/agent-studio", icon: Sparkles, keywords: "ai build create" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [allChannels] = useTable(tables.channel)
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allDocuments] = useTable(tables.document)

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false)
      command()
    },
    []
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`nav-${item.title} ${item.keywords}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 size-4 shrink-0" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Channels */}
          {allChannels.length > 0 && (
            <>
              <CommandGroup heading="Channels">
                {allChannels.map((channel) => (
                  <CommandItem
                    key={`channel-${channel.id}`}
                    value={`channel-${channel.name} ${channel.description ?? ""}`}
                    onSelect={() => runCommand(() => router.push("/messages"))}
                  >
                    <Hash className="mr-2 size-4 shrink-0" />
                    <span>{channel.name}</span>
                    {channel.description && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">
                        {channel.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* People */}
          {allEmployees.length > 0 && (
            <>
              <CommandGroup heading="People">
                {allEmployees.map((emp) => (
                  <CommandItem
                    key={`person-${emp.id.toHexString()}`}
                    value={`person-${emp.name} ${emp.role} ${emp.department?.tag ?? ""}`}
                    onSelect={() =>
                      runCommand(() =>
                        router.push(`/profile/${emp.id.toHexString()}`)
                      )
                    }
                  >
                    <User className="mr-2 size-4 shrink-0" />
                    <span>{emp.name}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {emp.role}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Tasks */}
          {allTasks.length > 0 && (
            <>
              <CommandGroup heading="Tasks">
                {allTasks.map((task) => (
                  <CommandItem
                    key={`task-${task.id}`}
                    value={`task-${task.title} ${task.description}`}
                    onSelect={() => runCommand(() => router.push("/tickets"))}
                  >
                    <CheckSquare className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {task.status?.tag ?? ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Documents */}
          {allDocuments.length > 0 && (
            <CommandGroup heading="Documents">
              {allDocuments.map((doc) => (
                <CommandItem
                  key={`doc-${doc.id}`}
                  value={`doc-${doc.title} ${doc.docType?.tag ?? ""}`}
                  onSelect={() => runCommand(() => router.push("/canvas"))}
                >
                  <FileText className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {doc.docType?.tag ?? ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
