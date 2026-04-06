/**
 * Shared chart styling for Recharts components.
 * Import and spread these on Tooltip, XAxis, YAxis, CartesianGrid, etc.
 */

export const chartTooltipProps = {
  contentStyle: {
    background: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  },
  itemStyle: {
    color: 'hsl(var(--foreground))',
    padding: '2px 0',
  },
  labelStyle: {
    color: 'hsl(var(--muted-foreground))',
    fontWeight: 500,
    marginBottom: 4,
  },
  cursor: { fill: 'hsl(var(--muted)/0.3)' },
} as const

export const chartAxisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
} as const

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))',
  strokeOpacity: 0.5,
} as const
