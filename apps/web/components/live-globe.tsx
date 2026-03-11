'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import createGlobe from 'cobe'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { useOrg } from '@/components/org-context'

// Deterministic geo coordinates from an identity hex string (fallback when no real location)
function hexToGeo(hex: string): [number, number] {
  let h = 0
  for (let i = 0; i < Math.min(hex.length, 16); i++) {
    h = (h * 31 + hex.charCodeAt(i)) | 0
  }
  const lat = ((Math.abs(h) % 1800) / 10) - 90 // -90 to 90
  let h2 = 0
  for (let i = 8; i < Math.min(hex.length, 24); i++) {
    h2 = (h2 * 37 + hex.charCodeAt(i)) | 0
  }
  const lng = ((Math.abs(h2) % 3600) / 10) - 180 // -180 to 180
  return [lat, lng]
}

type ArcData = {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  timestamp: number
  senderName: string
  content: string
}

export function LiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)

  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const [allMessages] = useTable(tables.message)
  const [allChannels] = useTable(tables.channel)
  const [allEmployees] = useTable(tables.employee)
  const [allUserLocations] = useTable(tables.user_location)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map(e => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Build a map of user_id hex -> real [lat, lng] from the user_location table
  const locationMap = useMemo(() => {
    const map = new Map<string, [number, number]>()
    for (const loc of allUserLocations) {
      map.set(loc.userId.toHexString(), [loc.latitude, loc.longitude])
    }
    return map
  }, [allUserLocations])

  // Get coordinates for a user: prefer real location, fall back to hash
  function getUserGeo(hex: string): [number, number] {
    return locationMap.get(hex) ?? hexToGeo(hex)
  }

  const orgChannelIds = useMemo(() => {
    return new Set(
      allChannels
        .filter(c => Number(c.orgId) === currentOrgId)
        .map(c => c.id)
    )
  }, [allChannels, currentOrgId])

  // Get recent messages (last 60 seconds) as arcs
  const recentArcs: ArcData[] = useMemo(() => {
    const now = Date.now()
    const cutoff = now - 60_000 // last 60 seconds
    const arcs: ArcData[] = []

    for (const msg of allMessages) {
      if (msg.contextType.tag !== 'Channel') continue
      if (!orgChannelIds.has(msg.contextId)) continue
      if (msg.content.startsWith('[system]')) continue

      try {
        const sentTime = msg.sentAt.toDate?.().getTime() ?? 0
        if (sentTime < cutoff) continue

        const senderHex = msg.sender.toHexString()
        const sender = employeeMap.get(senderHex)
        const [sLat, sLng] = getUserGeo(senderHex)

        // Find channel to get a "destination" — use the channel ID hash as destination point
        const channelIdStr = msg.contextId.toString()
        const [eLat, eLng] = hexToGeo(channelIdStr)

        arcs.push({
          startLat: sLat,
          startLng: sLng,
          endLat: eLat,
          endLng: eLng,
          timestamp: sentTime,
          senderName: sender?.name ?? 'Unknown',
          content: msg.content.slice(0, 60),
        })
      } catch {}
    }

    return arcs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
  }, [allMessages, orgChannelIds, employeeMap, locationMap])

  // Marker locations from active employees — use real location when available
  const markers = useMemo(() => {
    return allEmployees
      .filter(e => e.status.tag === 'Online' || e.status.tag === 'Busy')
      .map(e => {
        const hex = e.id.toHexString()
        const [lat, lng] = getUserGeo(hex)
        const hasRealLocation = locationMap.has(hex)
        return {
          location: [lat, lng] as [number, number],
          size: hasRealLocation ? 0.06 : 0.03, // Larger dot for users with real location
        }
      })
  }, [allEmployees, locationMap])

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      widthRef.current = canvasRef.current.offsetWidth
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [onResize])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    let phi = 0

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.15, 0.1, 0.25],      // Deep purple base
      markerColor: [0.6, 0.3, 1.0],       // Violet markers
      glowColor: [0.3, 0.15, 0.5],        // Purple glow
      markers,
      onRender: (state) => {
        if (!pointerInteracting.current) {
          phi += 0.003
        }
        state.phi = phi + pointerInteractionMovement.current
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })

    globeRef.current = globe
    return () => {
      globe.destroy()
      globeRef.current = null
    }
  }, [markers])

  // Format time ago
  function timeAgo(ts: number) {
    const diff = Date.now() - ts
    if (diff < 5_000) return 'just now'
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
    return `${Math.floor(diff / 60_000)}m ago`
  }

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      {/* Globe canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current
          canvasRef.current!.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          pointerInteracting.current = null
          canvasRef.current!.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          pointerInteracting.current = null
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current
            pointerInteractionMovement.current = delta / 200
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current
            pointerInteractionMovement.current = delta / 200
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          contain: 'layout paint size',
        }}
      />

      {/* Radial gradient overlay for blend into background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_30%,hsl(var(--background))_70%)]" />

      {/* Live message feed floating overlay */}
      {recentArcs.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 space-y-1 max-h-32 overflow-hidden pointer-events-none">
          {recentArcs.slice(0, 3).map((arc, i) => (
            <div
              key={`${arc.timestamp}-${i}`}
              className="flex items-center gap-2 bg-neutral-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs border border-neutral-800/50 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="size-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
              <span className="text-violet-400 font-medium shrink-0">{arc.senderName}</span>
              <span className="text-neutral-400 truncate">{arc.content}</span>
              <span className="text-neutral-600 shrink-0 ml-auto">{timeAgo(arc.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
