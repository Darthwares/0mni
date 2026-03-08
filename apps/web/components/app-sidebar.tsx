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
} from "lucide-react"
import { usePathname } from "next/navigation"
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
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useTable } from "spacetimedb/react"
import { tables } from "@/generated"

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
  const counts = useCounts()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">OMNI</span>
                <span className="truncate text-xs text-muted-foreground">AI Operating Platform</span>
              </div>
            </SidebarMenuButton>
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
        <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
