"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

export function useKeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)
  const gPressedRef = useRef(false)
  const gTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const closeHelp = useCallback(() => {
    setShowHelp(false)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Still allow Escape to close help dialog even in inputs
        if (e.key === "Escape" && showHelp) {
          setShowHelp(false)
        }
        return
      }

      // Escape — close help dialog
      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false)
        }
        return
      }

      // "g then X" navigation pattern
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressedRef.current = true
        if (gTimeoutRef.current) {
          clearTimeout(gTimeoutRef.current)
        }
        gTimeoutRef.current = setTimeout(() => {
          gPressedRef.current = false
        }, 1000)
        return
      }

      if (gPressedRef.current) {
        gPressedRef.current = false
        if (gTimeoutRef.current) {
          clearTimeout(gTimeoutRef.current)
          gTimeoutRef.current = null
        }

        switch (e.key) {
          case "d":
            router.push("/dashboard")
            break
          case "m":
            router.push("/messages")
            break
          case "t":
            router.push("/tickets")
            break
          case "c":
            router.push("/canvas")
            break
          case "p":
            router.push("/profile")
            break
          case "s":
            router.push("/settings")
            break
        }
        return
      }

      // "?" — toggle keyboard shortcuts help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setShowHelp((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (gTimeoutRef.current) {
        clearTimeout(gTimeoutRef.current)
      }
    }
  }, [router, showHelp])

  return { showHelp, setShowHelp, closeHelp }
}
