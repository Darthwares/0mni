'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  LayoutDashboard,
  KanbanSquare,
  PenTool,
  Menu,
  Bell,
  CalendarDays,
  Search,
} from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useMemo } from 'react'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/messages', icon: MessageSquare, label: 'Chat' },
  { href: '/tickets', icon: KanbanSquare, label: 'Tickets' },
  { href: '/notifications', icon: Bell, label: 'Alerts' },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const [allNotifications] = useTable(tables.notification)

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.read && !n.dismissed).length,
    [allNotifications]
  )

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          const showBadge = tab.href === '/notifications' && unreadCount > 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200',
                isActive
                  ? 'text-violet-500 dark:text-violet-400'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-violet-500 dark:bg-violet-400" />
              )}
              <tab.icon className={cn('size-5 transition-transform duration-200', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {showBadge && (
                <span className="absolute top-1.5 right-1/2 -translate-x-[-8px] size-4 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground active:text-foreground transition-colors"
        >
          <Menu className="size-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
