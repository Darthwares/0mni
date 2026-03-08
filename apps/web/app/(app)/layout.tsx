"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import ProtectedRoute from "@/components/protected-route"
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
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = routeNames[pathname] ?? "Omni"
  const isMessagesRoute = pathname === "/messages"

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <SidebarProvider defaultOpen={!isMessagesRoute}>
          <AppSidebar />
          <SidebarInset>
            {!isMessagesRoute && (
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
              </header>
            )}
            <main className={isMessagesRoute ? "flex-1 overflow-hidden h-screen" : "flex-1 overflow-auto"}>
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ProtectedRoute>
  )
}
