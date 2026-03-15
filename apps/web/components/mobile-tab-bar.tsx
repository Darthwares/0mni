'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutDashboard, KanbanSquare, PenTool, Menu, Zap } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/feed', icon: Zap, label: 'Feed' },
  { href: '/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/tickets', icon: KanbanSquare, label: 'Tickets' },
  { href: '/canvas', icon: PenTool, label: 'Canvas' },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-violet-400'
                  : 'text-neutral-500 active:text-neutral-300'
              )}
            >
              <tab.icon className={cn('size-5', isActive && 'text-violet-400')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-neutral-500 active:text-neutral-300 transition-colors"
        >
          <Menu className="size-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
