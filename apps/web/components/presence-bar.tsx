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
import { Eye, EyeOff, Circle } from 'lucide-react'
import ShinyText from '@/components/reactbits/ShinyText'

const PRESENCE_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
]

const PRESENCE_RING_COLORS = [
  'ring-violet-500/40', 'ring-blue-500/40', 'ring-emerald-500/40', 'ring-amber-500/40',
  'ring-pink-500/40', 'ring-cyan-500/40', 'ring-rose-500/40', 'ring-indigo-500/40',
]

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function nameToColorIndex(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % PRESENCE_COLORS.length
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => setVisible(!visible)}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>
      {visible && (
        <>
          <div className="flex -space-x-1.5">
            {onlineOthers.map((emp) => {
              const colorIdx = nameToColorIndex(emp.name)
              return (
                <Tooltip key={emp.id.toHexString()}>
                  <TooltipTrigger render={<div />} className="relative">
                      <Avatar className={`size-6 border-2 border-background ring-2 ${PRESENCE_RING_COLORS[colorIdx]} transition-all duration-300 hover:scale-125 hover:z-10 hover:ring-4`}>
                        <AvatarFallback className={`${PRESENCE_COLORS[colorIdx]} text-[9px] font-bold text-white`}>
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background ${
                        emp.status.tag === 'Online' ? 'bg-emerald-500' :
                        emp.status.tag === 'Busy' ? 'bg-amber-500' :
                        emp.status.tag === 'InCall' ? 'bg-blue-500 animate-pulse' : 'bg-neutral-500'
                      }`} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Circle className={`size-1.5 fill-current ${
                        emp.status.tag === 'Online' ? 'text-emerald-500' :
                        emp.status.tag === 'Busy' ? 'text-amber-500' :
                        emp.status.tag === 'InCall' ? 'text-blue-500' : 'text-neutral-500'
                      }`} />
                      {emp.status.tag === 'InCall' ? 'In a call' : emp.status.tag}
                    </p>
                    {emp.role && <p className="text-muted-foreground/70">{emp.role}</p>}
                  </TooltipContent>
                </Tooltip>
              )
            })}
            {onlineOthers.length >= 8 && (
              <div className="flex items-center justify-center size-6 rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
                +
              </div>
            )}
          </div>
          <span className="text-[10px] whitespace-nowrap inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <ShinyText
              text={`${onlineOthers.length} active`}
              speed={3}
              color="#a1a1aa"
              shineColor="#10b981"
              className="text-[10px] font-medium"
            />
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Inline page-level presence strip — drop into any page header.
 * Shows a subtle, beautiful presence indicator with animated avatars.
 */
export function PagePresenceStrip({ className = '' }: { className?: string }) {
  const { identity } = useSpacetimeDB()
  const [employees] = useTable(tables.employee)

  const onlineOthers = useMemo(() => {
    if (!identity) return []
    const myHex = identity.toHexString()
    return employees.filter(
      (e) =>
        e.id.toHexString() !== myHex &&
        (e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall')
    ).slice(0, 5)
  }, [identity, employees])

  if (onlineOthers.length === 0) return null

  return (
    <div className={`flex items-center gap-2 rounded-full bg-muted/50 border border-border/50 pl-1 pr-3 py-1 ${className}`}>
      <div className="flex -space-x-1">
        {onlineOthers.map((emp) => {
          const colorIdx = nameToColorIndex(emp.name)
          return (
            <Tooltip key={emp.id.toHexString()}>
              <TooltipTrigger render={<div />}>
                <Avatar className={`size-5 border-2 border-muted/50 ring-1 ${PRESENCE_RING_COLORS[colorIdx]} transition-transform hover:scale-125 hover:z-10`}>
                  <AvatarFallback className={`${PRESENCE_COLORS[colorIdx]} text-[8px] font-bold text-white`}>
                    {getInitials(emp.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{emp.name}</p>
                <p className="text-muted-foreground">{emp.status.tag}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <span className="text-[10px] whitespace-nowrap flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <ShinyText
          text={`${onlineOthers.length} online`}
          speed={3}
          color="#a1a1aa"
          shineColor="#10b981"
          className="text-[10px] font-medium"
        />
      </span>
    </div>
  )
}
