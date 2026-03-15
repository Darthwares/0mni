'use client'

import { usePathname } from 'next/navigation'
import { usePagePresence } from '@/hooks/use-page-presence'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function avatarGradient(name: string) {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-fuchsia-500 to-violet-600',
    'from-teal-500 to-emerald-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return gradients[Math.abs(hash) % gradients.length]
}

function statusDot(status: string) {
  switch (status) {
    case 'Online': return 'bg-emerald-500'
    case 'Busy': return 'bg-amber-500'
    case 'InCall': return 'bg-blue-500'
    default: return 'bg-neutral-400'
  }
}

export function PagePresence() {
  const pathname = usePathname()
  const { presentUsers } = usePagePresence(pathname)

  if (presentUsers.length === 0) return null

  const shown = presentUsers.slice(0, 6)
  const overflow = presentUsers.length - 6

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((user, i) => (
          <Tooltip key={user.hex}>
            <TooltipTrigger render={<div />} className="cursor-default">
              <div
                className="relative transition-transform hover:scale-110 hover:z-10"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Avatar className="size-7 ring-2 ring-white dark:ring-neutral-900 shadow-sm">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className={`bg-gradient-to-br ${avatarGradient(user.name)} text-[10px] font-bold text-white`}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-neutral-900 ${statusDot(user.status)}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground capitalize">{user.status.toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <div className="flex items-center justify-center size-7 rounded-full bg-neutral-100 dark:bg-neutral-800 ring-2 ring-white dark:ring-neutral-900 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 shadow-sm">
            +{overflow}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
          {presentUsers.length} here
        </span>
      </div>
    </div>
  )
}
