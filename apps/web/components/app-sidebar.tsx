"use client"

import { useState } from "react"
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
  Globe,
  AlertTriangle,
  Share2,
  UserPlus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useTable, useReducer } from "spacetimedb/react"
import { tables, reducers } from "@/generated"
import { useOrg } from "@/components/org-context"
import { useAuth } from "react-oidc-context"
import { ShareInviteDialog } from "@/components/share-invite-dialog"

// globalHidden: true means hidden when in Za Warudo (global org)
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
      { title: "Email", href: "/email", icon: Mail, globalHidden: true },
    ],
  },
  {
    label: "Business",
    globalHidden: true,
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
    globalHidden: true,
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

function useMemberCounts() {
  const [allMemberships] = useTable(tables.org_membership)

  const countByOrg = new Map<string, number>()
  for (const m of allMemberships) {
    if (m.status.tag === "Active") {
      const key = m.orgId.toString()
      countByOrg.set(key, (countByOrg.get(key) || 0) + 1)
    }
  }

  return countByOrg
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const counts = useCounts()
  const memberCounts = useMemberCounts()
  const { currentOrg, allOrgs, switchOrg, isGlobalOrg, orgMembers } = useOrg()
  const auth = useAuth()
  const createOrganization = useReducer(reducers.createOrganization)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgDomain, setNewOrgDomain] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    setCreateError("")
    setIsCreating(true)

    try {
      await createOrganization({
        name: newOrgName.trim(),
        domain: newOrgDomain.trim() || undefined,
        email: auth.user?.profile?.email || "",
        displayName: auth.user?.profile?.name || "",
      })
      setCreateDialogOpen(false)
      setNewOrgName("")
      setNewOrgDomain("")
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create organization")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className={isGlobalOrg ? "border-l-4 border-l-amber-500" : ""}
      >
        <SidebarHeader>
          {/* Global mode warning banner */}
          {isGlobalOrg && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 group-data-[collapsible=icon]:hidden">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>You are in Za Warudo — visible to everyone</span>
            </div>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0">
                    <div className={
                      isGlobalOrg
                        ? "flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500 text-white"
                        : "flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                    }>
                      {isGlobalOrg ? (
                        <Globe className="size-4" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <div className="flex items-center gap-1.5">
                        <span className={
                          isGlobalOrg
                            ? "truncate font-bold text-amber-600 dark:text-amber-400"
                            : "truncate font-bold"
                        }>
                          {currentOrg?.name || 'OMNI'}
                        </span>
                        {isGlobalOrg ? (
                          <Badge className="h-4 rounded px-1 py-0 text-[9px] font-semibold uppercase leading-none bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15">
                            Za Warudo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-4 rounded px-1 py-0 text-[9px] font-semibold uppercase leading-none">
                            Company
                          </Badge>
                        )}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {isGlobalOrg
                          ? `${orgMembers.length} member${orgMembers.length !== 1 ? 's' : ''} — public workspace`
                          : allOrgs.length > 1 ? `${allOrgs.length} organizations` : 'AI Operating Platform'
                        }
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
                      const orgIsGlobal = org.isGlobal === true
                      const count = memberCounts.get(org.id.toString()) || 0

                      return (
                        <DropdownMenuItem
                          key={org.id.toString()}
                          onClick={() => switchOrg(Number(org.id))}
                          className="gap-2"
                        >
                          <div className={
                            orgIsGlobal
                              ? "flex size-6 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10"
                              : "flex size-6 items-center justify-center rounded-md border bg-background"
                          }>
                            {orgIsGlobal ? (
                              <Globe className="size-3.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <span className="text-xs font-semibold">{org.name[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <span className={
                            orgIsGlobal
                              ? "flex-1 truncate text-amber-600 dark:text-amber-400 font-medium"
                              : "flex-1 truncate"
                          }>
                            {org.name}
                          </span>
                          {count > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {count}
                            </span>
                          )}
                          {isActive && <Check className="size-4 text-primary" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={(e) => {
                      e.preventDefault()
                      setCreateDialogOpen(true)
                    }}>
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
          {navSections
            .filter((section) => !(isGlobalOrg && 'globalHidden' in section && section.globalHidden))
            .map((section) => {
              const visibleItems = section.items.filter((item) => !(isGlobalOrg && 'globalHidden' in item && item.globalHidden))
              if (visibleItems.length === 0) return null
              return (
                <SidebarGroup key={section.label}>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                        const count = ('countKey' in item && item.countKey) ? counts[item.countKey as keyof typeof counts] : undefined

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              isActive={isActive}
                              tooltip={item.title}
                              render={<Link href={item.href} />}
                            >
                              <item.icon className="size-4 transition-all duration-200 group-hover/menu-button:scale-125 group-hover/menu-button:rotate-[-8deg]" />
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
              )
            })}
        </SidebarContent>

        <SidebarFooter>
          {/* Prominent Share / Invite Button */}
          <div className="px-2 group-data-[collapsible=icon]:px-0">
            {isGlobalOrg ? (
              <Button
                onClick={() => setShareDialogOpen(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
                size="sm"
              >
                <Share2 className="size-4 group-data-[collapsible=icon]:mr-0 mr-2 transition-transform duration-200 hover:scale-110" />
                <span className="group-data-[collapsible=icon]:hidden">Share Za Warudo</span>
              </Button>
            ) : (
              <Button
                onClick={() => setShareDialogOpen(true)}
                variant="outline"
                className="w-full border-primary/30 hover:border-primary/50 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
                size="sm"
              >
                <UserPlus className="size-4 group-data-[collapsible=icon]:mr-0 mr-2 transition-transform duration-200 hover:scale-110" />
                <span className="group-data-[collapsible=icon]:hidden">Invite People</span>
              </Button>
            )}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                render={<Link href="/settings" />}
                isActive={pathname === "/settings"}
              >
                <Settings className="size-4 transition-transform duration-300 group-hover/menu-button:rotate-90" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </div>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <ShareInviteDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization and invite your team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g., Acme Corp"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-domain">Company Domain (optional)</Label>
              <Input
                id="org-domain"
                value={newOrgDomain}
                onChange={(e) => setNewOrgDomain(e.target.value)}
                placeholder="e.g., acme.com"
              />
              <p className="text-xs text-muted-foreground">
                Users with this email domain can auto-join your organization.
              </p>
            </div>

            {createError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false)
                  setNewOrgName("")
                  setNewOrgDomain("")
                  setCreateError("")
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !newOrgName.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
