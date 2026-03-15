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
  CalendarDays,
  Bell,
  Users2,
  BarChart3,
  HardDrive,
  ClipboardCheck,
  Timer,
  BookOpen,
  ClipboardList,
  Target,
  Receipt,
  Presentation,
  Workflow,
  Network,
  FileBarChart,
  Contact,
  Wallet,
  Coffee,
} from "lucide-react"

const navigationItems = [
  // Overview
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview stats" },
  { title: "Notifications", href: "/notifications", icon: Bell, keywords: "alerts inbox" },
  { title: "Activity", href: "/activity", icon: Activity, keywords: "feed log events timeline" },
  { title: "People", href: "/people", icon: Users2, keywords: "team directory members" },
  { title: "Org Chart", href: "/org-chart", icon: Network, keywords: "organization hierarchy tree" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, keywords: "metrics insights data" },
  { title: "Reports", href: "/reports", icon: FileBarChart, keywords: "charts dashboards custom" },
  // Communication
  { title: "Messages", href: "/messages", icon: MessageSquare, keywords: "chat channels dm slack" },
  { title: "Email", href: "/email", icon: Mail, keywords: "inbox mail send" },
  // Business
  { title: "Support", href: "/support", icon: Headphones, keywords: "help desk tickets zendesk" },
  { title: "Sales", href: "/sales", icon: TrendingUp, keywords: "crm deals leads pipeline salesforce" },
  { title: "Recruitment", href: "/recruitment", icon: Users, keywords: "hiring candidates jobs greenhouse" },
  { title: "Invoicing", href: "/invoicing", icon: Receipt, keywords: "billing payments freshbooks" },
  { title: "Expenses", href: "/expenses", icon: Wallet, keywords: "receipts reimbursement spending" },
  { title: "Contacts", href: "/contacts", icon: Contact, keywords: "address book crm people" },
  { title: "Goals & OKRs", href: "/goals", icon: Target, keywords: "objectives key results lattice" },
  { title: "Approvals", href: "/approvals", icon: ClipboardCheck, keywords: "workflow approve reject" },
  // Workspace
  { title: "Tickets", href: "/tickets", icon: KanbanSquare, keywords: "kanban board tasks jira" },
  { title: "Calendar", href: "/calendar", icon: CalendarDays, keywords: "schedule meetings events" },
  { title: "Canvas", href: "/canvas", icon: PenTool, keywords: "documents editor confluence wiki" },
  { title: "Drive", href: "/drive", icon: HardDrive, keywords: "files storage upload google drive" },
  { title: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, keywords: "wiki articles docs" },
  { title: "Whiteboard", href: "/whiteboard", icon: Presentation, keywords: "draw sketch miro figma" },
  { title: "Forms", href: "/forms", icon: ClipboardList, keywords: "surveys polls typeform" },
  { title: "Standups", href: "/standups", icon: Coffee, keywords: "check-ins daily async geekbot" },
  { title: "Time Tracking", href: "/time-tracking", icon: Timer, keywords: "timer hours toggl clockify" },
  // Development
  { title: "Engineering", href: "/engineering", icon: Code2, keywords: "dev code repos bugs github" },
  { title: "Collaboration", href: "/collaboration", icon: FileText, keywords: "docs files shared" },
  // AI Platform
  { title: "AI Employees", href: "/ai-employees", icon: Bot, keywords: "agents bots automation" },
  { title: "Agent Studio", href: "/agent-studio", icon: Sparkles, keywords: "ai build create deploy" },
  { title: "Workflows", href: "/workflows", icon: Workflow, keywords: "automation zapier triggers" },
  // Other
  { title: "Profile", href: "/profile", icon: User, keywords: "account me" },
  { title: "Settings", href: "/settings", icon: Settings, keywords: "preferences config theme" },
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
