"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import ProtectedRoute from "@/components/protected-route"
import { OrgProvider } from "@/components/org-context"
import { PresenceBar } from "@/components/presence-bar"
import { NotificationPrompt } from "@/components/notification-prompt"
import { CommandPalette } from "@/components/command-palette"
import { MobileTabBar } from "@/components/mobile-tab-bar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog"
import { useNotificationManager } from "@/hooks/use-notification-manager"

const routeNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/activity": "Activity Feed",
  "/messages": "Messages",
  "/email": "Email",
  "/support": "Support",
  "/sales": "Sales & CRM",
  "/recruitment": "Recruitment",
  "/engineering": "Engineering",
  "/collaboration": "Collaboration",
  "/ai-employees": "AI Employees",
  "/agent-studio": "Agent Studio",
  "/settings": "Settings",
  "/tickets": "Tickets",
  "/canvas": "Canvas",
  "/profile": "Profile",
  "/calendar": "Calendar",
  "/people": "People",
  "/drive": "Drive",
  "/analytics": "Analytics",
  "/approvals": "Approvals",
  "/time-tracking": "Time Tracking",
  "/knowledge-base": "Knowledge Base",
  "/notifications": "Notifications",
  "/forms": "Forms & Surveys",
  "/goals": "Goals & OKRs",
  "/invoicing": "Invoicing",
  "/whiteboard": "Whiteboard",
  "/workflows": "Workflows",
  "/org-chart": "Organization",
  "/reports": "Reports",
}

const fullScreenRoutes = ["/messages", "/tickets", "/canvas", "/whiteboard"]

// Outer layout — only uses hooks that don't need SpacetimeDBProvider
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ProtectedRoute>
  )
}

// Inner layout — safe to use SpacetimeDB hooks (ProtectedRoute ensures provider exists)
function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { showHelp, setShowHelp } = useKeyboardShortcuts()
  useNotificationManager()
  const pageTitle = routeNames[pathname] ?? (pathname?.startsWith("/profile/") ? "Profile" : "Omni")
  const isFullScreen = fullScreenRoutes.some(
    (r) => pathname === r || pathname?.startsWith(r + "/")
  )

  return (
    <OrgProvider>
      <TooltipProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            {!isFullScreen && (
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1 hidden md:flex" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto hidden md:flex items-center gap-3">
                  <PresenceBar />
                </div>
              </header>
            )}
            <main className={
              isFullScreen
                ? "flex-1 overflow-hidden h-[100dvh] md:h-screen"
                : "flex-1 overflow-auto pb-16 md:pb-0"
            }>
              {children}
            </main>
          </SidebarInset>
          <MobileTabBar />
          <NotificationPrompt />
          <CommandPalette />
          <KeyboardShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />
        </SidebarProvider>
      </TooltipProvider>
    </OrgProvider>
  )
}
