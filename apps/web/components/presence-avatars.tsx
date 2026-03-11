'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function avatarColor(name: string) {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return colors[Math.abs(hash) % colors.length]
}

function statusRing(status: string) {
  switch (status) {
    case 'Online': return 'ring-emerald-500'
    case 'Busy': return 'ring-amber-500'
    default: return 'ring-muted-foreground/30'
  }
}

type PresenceUser = {
  hex: string
  name: string
  status: string
  avatarUrl: string | null
}

export function PresenceAvatars({
  users,
  maxShow = 5,
  size = 'sm',
  label,
}: {
  users: PresenceUser[]
  maxShow?: number
  size?: 'xs' | 'sm' | 'md'
  label?: string
}) {
  if (users.length === 0) return null

  const shown = users.slice(0, maxShow)
  const overflow = users.length - maxShow

  const sizeClasses = {
    xs: 'size-5 text-[8px]',
    sm: 'size-6 text-[9px]',
    md: 'size-7 text-[10px]',
  }

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
      <div className="flex -space-x-1.5">
        {shown.map((user) => (
          <Tooltip key={user.hex}>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClasses[size]} ring-2 ring-background ${statusRing(user.status)} cursor-default`}>
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className={`text-white ${avatarColor(user.name)}`}>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user.name}
              <span className="text-muted-foreground ml-1">is here</span>
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <div className={`${sizeClasses[size]} rounded-full bg-muted ring-2 ring-background flex items-center justify-center font-medium text-muted-foreground`}>
            +{overflow}
          </div>
        )}
      </div>
      {users.length > 0 && (
        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
    </div>
  )
}
