import type { Timestamp } from "spacetimedb"

/** Convert SpacetimeDB Timestamp to a short relative/absolute string */
export function formatTimestamp(ts: Timestamp): string {
  try {
    const d = ts.toDate()
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()

    if (diffMs < 60_000) return "just now"
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

/** Convert SpacetimeDB Timestamp to a full date-time string */
export function formatDateTime(ts: Timestamp): string {
  try {
    return ts.toDate().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

/** Convert SpacetimeDB Timestamp to time-only */
export function formatTime(ts: Timestamp): string {
  try {
    return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

/** Get millis for sorting from SpacetimeDB Timestamp */
export function tsMillis(ts: Timestamp): number {
  try {
    return Number(ts.toMillis())
  } catch {
    return 0
  }
}

/** Format currency values */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
