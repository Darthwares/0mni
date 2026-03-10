"use client"

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
  ChevronsUpDown,
  Plus,
  Check,
  Link2,
  Settings,
  KanbanSquare,
  PenTool,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useTable } from "spacetimedb/react"
import { tables } from "@/generated"
import { useOrg } from "@/components/org-context"

const navSections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Messages", href: "/messages", icon: MessageSquare, countKey: "messages" as const },
      { title: "Email", href: "/email", icon: Mail },
    ],
  },
  {
    label: "Business",
    items: [
      { title: "Support", href: "/support", icon: Headphones, countKey: "tickets" as const },
      { title: "Sales", href: "/sales", icon: TrendingUp, countKey: "leads" as const },
      { title: "Recruitment", href: "/recruitment", icon: Users, countKey: "candidates" as const },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Tickets", href: "/tickets", icon: KanbanSquare, countKey: "tasks" as const },
      { title: "Canvas", href: "/canvas", icon: PenTool },
    ],
  },
  {
    label: "Development",
    items: [
      { title: "Engineering", href: "/engineering", icon: Code2 },
      { title: "Collaboration", href: "/collaboration", icon: FileText },
    ],
  },
  {
    label: "AI Platform",
    items: [
      { title: "AI Employees", href: "/ai-employees", icon: Bot },
      { title: "Agent Studio", href: "/agent-studio", icon: Sparkles },
    ],
  },
]

function useCounts() {
  const [allTickets] = useTable(tables.ticket)
  const [allLeads] = useTable(tables.lead)
  const [allCandidates] = useTable(tables.candidate)
  const [allTasks] = useTable(tables.task)

  const openTickets = allTickets.filter(
    (t) => t.status.tag !== "Closed" && t.status.tag !== "Resolved"
  ).length

  const activeLeads = allLeads.filter(
    (l) => l.status.tag !== "Converted" && l.status.tag !== "Lost"
  ).length

  const activeCandidates = allCandidates.filter(
    (c) => c.status.tag !== "Hired" && c.status.tag !== "Rejected"
  ).length

  const pendingTasks = allTasks.filter(
    (t) => t.status.tag === "Unclaimed" || t.status.tag === "NeedsReview"
  ).length

  return {
    tickets: openTickets,
    leads: activeLeads,
    candidates: activeCandidates,
    messages: 0,
    tasks: pendingTasks,
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const counts = useCounts()
  const { currentOrg, allOrgs, switchOrg } = useOrg()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-bold">{currentOrg?.name || 'OMNI'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {allOrgs.length > 1 ? `${allOrgs.length} organizations` : 'AI Operating Platform'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Organizations
                  </DropdownMenuLabel>
                  {allOrgs.map((org) => {
                    const isActive = Number(org.id) === (currentOrg ? Number(currentOrg.id) : -1)
                    return (
                      <DropdownMenuItem
                        key={org.id.toString()}
                        onClick={() => switchOrg(Number(org.id))}
                        className="gap-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                          <span className="text-xs font-semibold">{org.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="flex-1 truncate">{org.name}</span>
                        {isActive && <Check className="size-4 text-primary" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/setup')}>
                    <Plus className="mr-2 size-4" />
                    Create Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/setup?mode=join')}>
                    <Link2 className="mr-2 size-4" />
                    Join with Invite Link
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  const count = item.countKey ? counts[item.countKey] : undefined

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="size-4" />
                        <span className="flex-1">{item.title}</span>
                        {count !== undefined && count > 0 && (
                          <Badge variant="secondary" className="ml-auto size-5 justify-center rounded-full p-0 text-[10px]">
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              render={<Link href="/settings" />}
              isActive={pathname === "/settings"}
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
