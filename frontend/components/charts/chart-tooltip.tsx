'use client'

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  unit?: string
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  unit?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground capitalize">{entry.name}</span>
            <span className="ml-auto font-mono font-medium text-popover-foreground tabular-nums">
              {entry.value}
              {unit ?? entry.unit ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
