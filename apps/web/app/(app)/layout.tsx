"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import ProtectedRoute from "@/components/protected-route"
import { OrgProvider } from "@/components/org-context"
import { PresenceBar } from "@/components/presence-bar"
import { NotificationPrompt } from "@/components/notification-prompt"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

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
}

const fullScreenRoutes = ["/messages", "/tickets", "/canvas"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = routeNames[pathname] ?? "Omni"
  const isFullScreen = fullScreenRoutes.some(
    (r) => pathname === r || pathname?.startsWith(r + "/")
  )

  return (
    <ProtectedRoute>
      <OrgProvider>
        <TooltipProvider>
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              {!isFullScreen && (
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="ml-auto">
                    <PresenceBar />
                  </div>
                </header>
              )}
              <main className={isFullScreen ? "flex-1 overflow-hidden h-screen" : "flex-1 overflow-auto"}>
                {children}
              </main>
            </SidebarInset>
            <NotificationPrompt />
          </SidebarProvider>
        </TooltipProvider>
      </OrgProvider>
    </ProtectedRoute>
  )
}
