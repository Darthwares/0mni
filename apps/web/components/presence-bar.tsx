'use client'

import { useMemo, useState } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Eye, EyeOff } from 'lucide-react'

const PRESENCE_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
]

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function nameToColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

export function PresenceBar() {
  const { identity } = useSpacetimeDB()
  const [employees] = useTable(tables.employee)
  const [visible, setVisible] = useState(true)

  const onlineOthers = useMemo(() => {
    if (!identity) return []
    const myHex = identity.toHexString()
    return employees.filter(
      (e) =>
        e.id.toHexString() !== myHex &&
        (e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall')
    ).slice(0, 8)
  }, [identity, employees])

  if (onlineOthers.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setVisible(!visible)}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>
      {visible && (
        <div className="flex -space-x-1.5">
          {onlineOthers.map((emp) => (
            <Tooltip key={emp.id.toHexString()}>
              <TooltipTrigger render={<div />} className="relative">
                  <Avatar className="size-6 border-2 border-background ring-0 transition-transform hover:scale-110 hover:z-10">
                    <AvatarFallback className={`${nameToColor(emp.name)} text-[9px] font-bold text-white`}>
                      {getInitials(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background ${
                    emp.status.tag === 'Online' ? 'bg-emerald-500' :
                    emp.status.tag === 'Busy' ? 'bg-amber-500' :
                    emp.status.tag === 'InCall' ? 'bg-blue-500' : 'bg-neutral-500'
                  }`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{emp.name}</p>
                <p className="text-muted-foreground">{emp.status.tag}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {onlineOthers.length >= 8 && (
            <div className="flex items-center justify-center size-6 rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
              +
            </div>
          )}
        </div>
      )}
    </div>
  )
}
