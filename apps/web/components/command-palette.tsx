"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useTable } from "spacetimedb/react"
import { tables } from "@/generated"
import { useOrg } from "@/components/org-context"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
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
  Folder,
  Image,
  Sheet,
  Video,
  Archive,
  File,
  Palette,
  Plus,
  Sun,
  Moon,
  Monitor,
  Keyboard,
  Search,
  Zap,
} from "lucide-react"

const MAX_RESULTS_PER_GROUP = 8

const navigationItems = [
  // Overview
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview stats", shortcut: "G D" },
  { title: "Notifications", href: "/notifications", icon: Bell, keywords: "alerts inbox" },
  { title: "Activity", href: "/activity", icon: Activity, keywords: "feed log events timeline" },
  { title: "People", href: "/people", icon: Users2, keywords: "team directory members" },
  { title: "Org Chart", href: "/org-chart", icon: Network, keywords: "organization hierarchy tree" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, keywords: "metrics insights data business intelligence" },
  { title: "Reports", href: "/reports", icon: FileBarChart, keywords: "charts dashboards custom" },
  // Communication
  { title: "Messages", href: "/messages", icon: MessageSquare, keywords: "chat channels dm slack", shortcut: "G M" },
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
  { title: "Tickets", href: "/tickets", icon: KanbanSquare, keywords: "kanban board tasks jira", shortcut: "G T" },
  { title: "Calendar", href: "/calendar", icon: CalendarDays, keywords: "schedule meetings events" },
  { title: "Canvas", href: "/canvas", icon: PenTool, keywords: "documents editor confluence wiki", shortcut: "G C" },
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
  { title: "Profile", href: "/profile", icon: User, keywords: "account me", shortcut: "G P" },
  { title: "Settings", href: "/settings", icon: Settings, keywords: "preferences config theme", shortcut: "G S" },
]

const quickActions = [
  { title: "Create Task", href: "/tickets", icon: KanbanSquare, keywords: "new task ticket issue create add" },
  { title: "Create Document", href: "/canvas", icon: PenTool, keywords: "new document page canvas create write" },
  { title: "New Channel", href: "/messages", icon: Hash, keywords: "new channel chat create messaging" },
  { title: "Schedule Meeting", href: "/calendar", icon: CalendarDays, keywords: "new meeting event calendar schedule book" },
  { title: "New Whiteboard", href: "/whiteboard", icon: Presentation, keywords: "new whiteboard draw sketch create" },
  { title: "Create Form", href: "/forms", icon: ClipboardList, keywords: "new form survey poll create" },
  { title: "Create Invoice", href: "/invoicing", icon: Receipt, keywords: "new invoice billing create send" },
  { title: "Add Contact", href: "/contacts", icon: Contact, keywords: "new contact person add create" },
  { title: "Create Goal", href: "/goals", icon: Target, keywords: "new goal objective okr create" },
  { title: "Log Time", href: "/time-tracking", icon: Timer, keywords: "new time entry log hours track" },
  { title: "Submit Expense", href: "/expenses", icon: Wallet, keywords: "new expense receipt submit claim" },
  { title: "Create Workflow", href: "/workflows", icon: Workflow, keywords: "new workflow automation create build" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { currentOrgId } = useOrg()

  const allChannels = useTable(tables.channel)
  const allEmployees = useTable(tables.employee)
  const allTasks = useTable(tables.task)
  const allDocuments = useTable(tables.document)
  const allDriveItems = useTable(tables.drive_item)
  const allContacts = useTable(tables.contact)
  const allInvoices = useTable(tables.invoice)
  const allWhiteboards = useTable(tables.whiteboard_board)
  const allAgents = useTable(tables.agent_config)
  const allDeals = useTable(tables.deal)
  const allTickets = useTable(tables.ticket)
  const allLeads = useTable(tables.lead)

  // Org-scoped data
  const orgChannels = useMemo(() => allChannels.filter(c => Number(c.orgId) === currentOrgId), [allChannels, currentOrgId])
  const orgTasks = useMemo(() => allTasks.filter(t => Number(t.orgId) === currentOrgId), [allTasks, currentOrgId])
  const orgDocs = useMemo(() => allDocuments.filter(d => Number(d.orgId) === currentOrgId), [allDocuments, currentOrgId])
  const orgDriveItems = useMemo(() => allDriveItems.filter(d => Number(d.orgId) === currentOrgId), [allDriveItems, currentOrgId])
  const orgContacts = useMemo(() => allContacts.filter(c => Number(c.orgId) === currentOrgId), [allContacts, currentOrgId])
  const orgInvoices = useMemo(() => allInvoices.filter(i => Number(i.orgId) === currentOrgId), [allInvoices, currentOrgId])
  const orgWhiteboards = useMemo(() => allWhiteboards.filter(w => Number(w.orgId) === currentOrgId), [allWhiteboards, currentOrgId])
  const orgAgents = useMemo(() => allAgents.filter(a => Number(a.orgId) === currentOrgId), [allAgents, currentOrgId])
  const orgDeals = useMemo(() => allDeals.filter(d => Number(d.orgId) === currentOrgId), [allDeals, currentOrgId])
  const orgTickets = useMemo(() => allTickets.filter(t => Number(t.orgId) === currentOrgId), [allTickets, currentOrgId])
  const orgLeads = useMemo(() => allLeads.filter(l => Number(l.orgId) === currentOrgId), [allLeads, currentOrgId])

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

  // Counts for the footer
  const totalEntities = orgTasks.length + orgDocs.length + orgChannels.length +
    allEmployees.length + orgDriveItems.length + orgContacts.length +
    orgInvoices.length + orgWhiteboards.length + orgAgents.length +
    orgDeals.length + orgTickets.length + orgLeads.length

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Search anything or type a command..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/60">Try searching for pages, tasks, people, or documents</p>
            </div>
          </CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={`action-${action.title}`}
                value={`action-${action.title} ${action.keywords}`}
                onSelect={() => runCommand(() => router.push(action.href))}
              >
                <div className="mr-2 flex size-5 items-center justify-center rounded bg-primary/10">
                  <Plus className="size-3 text-primary" />
                </div>
                <span>{action.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">→ {action.href.replace("/", "")}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

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
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Theme */}
          <CommandGroup heading="Preferences">
            <CommandItem
              value="theme-light light mode"
              onSelect={() => runCommand(() => setTheme("light"))}
            >
              <Sun className="mr-2 size-4 shrink-0" />
              <span>Light Mode</span>
              {theme === "light" && <span className="ml-auto text-xs text-emerald-500">Active</span>}
            </CommandItem>
            <CommandItem
              value="theme-dark dark mode"
              onSelect={() => runCommand(() => setTheme("dark"))}
            >
              <Moon className="mr-2 size-4 shrink-0" />
              <span>Dark Mode</span>
              {theme === "dark" && <span className="ml-auto text-xs text-emerald-500">Active</span>}
            </CommandItem>
            <CommandItem
              value="theme-system system mode auto"
              onSelect={() => runCommand(() => setTheme("system"))}
            >
              <Monitor className="mr-2 size-4 shrink-0" />
              <span>System Theme</span>
              {theme === "system" && <span className="ml-auto text-xs text-emerald-500">Active</span>}
            </CommandItem>
            <CommandItem
              value="keyboard shortcuts help"
              onSelect={() => runCommand(() => {
                // Trigger ? key press to open shortcuts dialog
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))
              })}
            >
              <Keyboard className="mr-2 size-4 shrink-0" />
              <span>Keyboard Shortcuts</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Channels */}
          {orgChannels.length > 0 && (
            <>
              <CommandGroup heading={`Channels (${orgChannels.length})`}>
                {orgChannels.slice(0, MAX_RESULTS_PER_GROUP).map((channel) => (
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
                {orgChannels.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="channels-show-all-more"
                    onSelect={() => runCommand(() => router.push("/messages"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgChannels.length} channels →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* People */}
          {allEmployees.length > 0 && (
            <>
              <CommandGroup heading={`People (${allEmployees.length})`}>
                {allEmployees.slice(0, MAX_RESULTS_PER_GROUP).map((emp) => (
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
                {allEmployees.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="people-show-all-more"
                    onSelect={() => runCommand(() => router.push("/people"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {allEmployees.length} people →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Tasks */}
          {orgTasks.length > 0 && (
            <>
              <CommandGroup heading={`Tasks (${orgTasks.length})`}>
                {orgTasks.slice(0, MAX_RESULTS_PER_GROUP).map((task) => (
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
                {orgTasks.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="tasks-show-all-more"
                    onSelect={() => runCommand(() => router.push("/tickets"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgTasks.length} tasks →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Support Tickets */}
          {orgTickets.length > 0 && (
            <>
              <CommandGroup heading={`Support Tickets (${orgTickets.length})`}>
                {orgTickets.slice(0, MAX_RESULTS_PER_GROUP).map((ticket) => (
                  <CommandItem
                    key={`ticket-${ticket.id}`}
                    value={`ticket-${ticket.subject} ${ticket.description ?? ""} support`}
                    onSelect={() => runCommand(() => router.push("/support"))}
                  >
                    <Headphones className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{ticket.subject}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {ticket.status?.tag ?? ""}
                    </span>
                  </CommandItem>
                ))}
                {orgTickets.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="tickets-show-all-more"
                    onSelect={() => runCommand(() => router.push("/support"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgTickets.length} tickets →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Documents */}
          {orgDocs.length > 0 && (
            <>
              <CommandGroup heading={`Documents (${orgDocs.length})`}>
                {orgDocs.slice(0, MAX_RESULTS_PER_GROUP).map((doc) => (
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
                {orgDocs.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="docs-show-all-more"
                    onSelect={() => runCommand(() => router.push("/canvas"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgDocs.length} documents →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Deals */}
          {orgDeals.length > 0 && (
            <>
              <CommandGroup heading={`Deals (${orgDeals.length})`}>
                {orgDeals.slice(0, MAX_RESULTS_PER_GROUP).map((deal) => (
                  <CommandItem
                    key={`deal-${deal.id}`}
                    value={`deal-${deal.name} ${deal.stage?.tag ?? ""} sales`}
                    onSelect={() => runCommand(() => router.push("/sales"))}
                  >
                    <TrendingUp className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{deal.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      ${Math.round(deal.value).toLocaleString()} · {deal.stage?.tag ?? ""}
                    </span>
                  </CommandItem>
                ))}
                {orgDeals.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="deals-show-all-more"
                    onSelect={() => runCommand(() => router.push("/sales"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgDeals.length} deals →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Leads */}
          {orgLeads.length > 0 && (
            <>
              <CommandGroup heading={`Leads (${orgLeads.length})`}>
                {orgLeads.slice(0, MAX_RESULTS_PER_GROUP).map((lead) => (
                  <CommandItem
                    key={`lead-${lead.id}`}
                    value={`lead-${lead.name} ${lead.company ?? ""} ${lead.email ?? ""} sales`}
                    onSelect={() => runCommand(() => router.push("/sales"))}
                  >
                    <Users className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{lead.name}</span>
                    {lead.company && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">{lead.company}</span>
                    )}
                  </CommandItem>
                ))}
                {orgLeads.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="leads-show-all-more"
                    onSelect={() => runCommand(() => router.push("/sales"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgLeads.length} leads →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Drive Files */}
          {orgDriveItems.length > 0 && (
            <>
              <CommandGroup heading={`Drive (${orgDriveItems.length})`}>
                {orgDriveItems.slice(0, MAX_RESULTS_PER_GROUP).map((item) => {
                  const typeTag = item.itemType?.tag ?? "Other"
                  const Icon = typeTag === "Folder" ? Folder : typeTag === "Image" ? Image : typeTag === "Spreadsheet" ? Sheet : typeTag === "Video" ? Video : typeTag === "Archive" ? Archive : typeTag === "Code" ? Code2 : File
                  return (
                    <CommandItem
                      key={`drive-${item.id}`}
                      value={`drive-${item.name} ${typeTag}`}
                      onSelect={() => runCommand(() => router.push("/drive"))}
                    >
                      <Icon className="mr-2 size-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">{typeTag}</span>
                    </CommandItem>
                  )
                })}
                {orgDriveItems.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="drive-show-all-more"
                    onSelect={() => runCommand(() => router.push("/drive"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgDriveItems.length} files →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Contacts */}
          {orgContacts.length > 0 && (
            <>
              <CommandGroup heading={`Contacts (${orgContacts.length})`}>
                {orgContacts.slice(0, MAX_RESULTS_PER_GROUP).map((c) => (
                  <CommandItem
                    key={`contact-${c.id}`}
                    value={`contact-${c.name} ${c.email} ${c.company} ${c.contactType?.tag ?? ""}`}
                    onSelect={() => runCommand(() => router.push("/contacts"))}
                  >
                    <Contact className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{c.name}</span>
                    {c.company && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">{c.company}</span>
                    )}
                  </CommandItem>
                ))}
                {orgContacts.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="contacts-show-all-more"
                    onSelect={() => runCommand(() => router.push("/contacts"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgContacts.length} contacts →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Invoices */}
          {orgInvoices.length > 0 && (
            <>
              <CommandGroup heading={`Invoices (${orgInvoices.length})`}>
                {orgInvoices.slice(0, MAX_RESULTS_PER_GROUP).map((inv) => (
                  <CommandItem
                    key={`invoice-${inv.id}`}
                    value={`invoice-${inv.invoiceNumber} ${inv.clientName} ${inv.status?.tag ?? ""}`}
                    onSelect={() => runCommand(() => router.push("/invoicing"))}
                  >
                    <Receipt className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{inv.invoiceNumber} — {inv.clientName}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">{inv.status?.tag ?? ""}</span>
                  </CommandItem>
                ))}
                {orgInvoices.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="invoices-show-all-more"
                    onSelect={() => runCommand(() => router.push("/invoicing"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgInvoices.length} invoices →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Whiteboard Boards */}
          {orgWhiteboards.length > 0 && (
            <>
              <CommandGroup heading={`Whiteboards (${orgWhiteboards.length})`}>
                {orgWhiteboards.slice(0, MAX_RESULTS_PER_GROUP).map((b) => (
                  <CommandItem
                    key={`wb-${b.id}`}
                    value={`whiteboard-${b.title}`}
                    onSelect={() => runCommand(() => router.push("/whiteboard"))}
                  >
                    <Palette className="mr-2 size-4 shrink-0" />
                    <span className="truncate">{b.title}</span>
                  </CommandItem>
                ))}
                {orgWhiteboards.length > MAX_RESULTS_PER_GROUP && (
                  <CommandItem
                    value="whiteboards-show-all-more"
                    onSelect={() => runCommand(() => router.push("/whiteboard"))}
                    className="text-muted-foreground"
                  >
                    <span className="text-xs">Show all {orgWhiteboards.length} whiteboards →</span>
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* AI Agents */}
          {orgAgents.length > 0 && (
            <CommandGroup heading={`AI Agents (${orgAgents.length})`}>
              {orgAgents.slice(0, MAX_RESULTS_PER_GROUP).map((a) => (
                <CommandItem
                  key={`agent-${a.id}`}
                  value={`agent-${a.name} ${a.department} ${a.model}`}
                  onSelect={() => runCommand(() => router.push("/agent-studio"))}
                >
                  <Bot className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{a.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{a.department}</span>
                </CommandItem>
              ))}
              {orgAgents.length > MAX_RESULTS_PER_GROUP && (
                <CommandItem
                  value="agents-show-all-more"
                  onSelect={() => runCommand(() => router.push("/agent-studio"))}
                  className="text-muted-foreground"
                >
                  <span className="text-xs">Show all {orgAgents.length} agents →</span>
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>

        {/* Footer with hints */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[9px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[9px]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[9px]">esc</kbd>
              close
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {totalEntities > 0 && `${totalEntities.toLocaleString()} items`}
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}
