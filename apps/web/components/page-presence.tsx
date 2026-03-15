'use client'

import { useMemo } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ShinyText from '@/components/reactbits/ShinyText'

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-pink-600',
  'bg-indigo-600',
]

const STATUS_GLOW: Record<string, string> = {
  Online: 'shadow-emerald-500/40',
  Busy: 'shadow-amber-500/40',
  InCall: 'shadow-blue-500/40',
}

const STATUS_RING: Record<string, string> = {
  Online: 'bg-emerald-500',
  Busy: 'bg-amber-500',
  InCall: 'bg-blue-500',
}

function nameToColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type PagePresenceProps = {
  /** Max avatars to show before "+N" overflow */
  maxShow?: number
  /** Accent color for the glow aura — use the page's theme color */
  glowColor?: string
  /** Color for the ShinyText count — defaults to page theme or white */
  shineColor?: string
  /** Additional className */
  className?: string
}

export function PagePresence({
  maxShow = 6,
  glowColor = 'rgba(139, 92, 246, 0.15)',
  shineColor = '#a78bfa',
  className = '',
}: PagePresenceProps) {
  const { identity } = useSpacetimeDB()
  const [employees] = useTable(tables.employee)

  const myHex = identity?.toHexString() ?? ''

  const onlineOthers = useMemo(() => {
    return employees
      .filter(
        (e) =>
          e.id.toHexString() !== myHex &&
          (e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall')
      )
      .slice(0, 12)
  }, [employees, myHex])

  if (onlineOthers.length === 0) return null

  const shown = onlineOthers.slice(0, maxShow)
  const overflow = onlineOthers.length - maxShow

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={`flex items-center gap-2.5 ${className}`}
    >
      {/* Aura glow behind avatar stack */}
      <div className="relative flex items-center">
        <div
          className="absolute inset-0 -inset-x-3 rounded-full blur-xl opacity-60 animate-pulse"
          style={{ background: `radial-gradient(ellipse, ${glowColor}, transparent 70%)` }}
        />
        <div className="relative flex -space-x-2">
          <AnimatePresence mode="popLayout">
            {shown.map((emp, i) => {
              const hex = emp.id.toHexString()
              const statusTag = emp.status.tag as string
              const glowClass = STATUS_GLOW[statusTag] ?? ''
              const ringColor = STATUS_RING[statusTag] ?? 'bg-neutral-500'

              return (
                <motion.div
                  key={hex}
                  layout
                  initial={{ opacity: 0, scale: 0.3, x: -12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.3, x: -12 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 22,
                    delay: i * 0.06,
                  }}
                  className="relative"
                >
                  <Tooltip>
                    <TooltipTrigger render={<div />} className="cursor-default">
                      <Avatar
                        className={`size-7 ring-2 ring-background shadow-md transition-transform duration-200 hover:scale-125 hover:z-20 ${glowClass ? `shadow-lg ${glowClass}` : ''}`}
                      >
                        {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} />}
                        <AvatarFallback
                          className={`text-[10px] font-bold text-white ${nameToColor(emp.name)}`}
                        >
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status dot */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${ringColor}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-muted-foreground capitalize">{statusTag}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Overflow badge */}
          {overflow > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22, delay: shown.length * 0.06 }}
              className="relative z-10 flex items-center justify-center size-7 rounded-full bg-muted/80 backdrop-blur-sm ring-2 ring-background text-[10px] font-semibold text-muted-foreground"
            >
              +{overflow}
            </motion.div>
          )}
        </div>
      </div>

      {/* Online count with shiny effect */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="size-2 rounded-full bg-emerald-500"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ShinyText
          text={`${onlineOthers.length} online`}
          speed={3}
          color="var(--color-muted-foreground)"
          shineColor={shineColor}
          className="text-xs font-medium"
        />
      </div>
    </motion.div>
  )
}
