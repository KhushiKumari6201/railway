'use client'

import Link from 'next/link'
import type { BlockCapacityRow } from '@/lib/data/network-intelligence'
import { blockCapacityData } from '@/lib/data/network-intelligence'
import { BatteryCharging, AlertCircle, CheckCircle2, TrendingUp, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlockCapacityChartProps {
  onSelectCorridor?: (id: string) => void
  selectedCorridorId?: string
}

export function BlockCapacityChart({
  onSelectCorridor,
  selectedCorridorId,
}: BlockCapacityChartProps) {
  const totalAvailable = blockCapacityData.reduce((s, c) => s + c.availableHours, 0)
  const totalPlanned = blockCapacityData.reduce((s, c) => s + c.plannedHours, 0)
  const totalUnused = blockCapacityData.reduce((s, c) => s + c.unusedHours, 0)
  const avgUtil = Math.round((totalPlanned / totalAvailable) * 100)

  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-xs">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
              <BatteryCharging className="size-3" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Block Window Capacity vs Planned Booking
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Available timetable gaps vs booked maintenance hours by corridor
          </p>
        </div>

        {/* Global Summary Pill */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground">Network:</span>
          <span className="font-bold text-foreground">{totalPlanned.toFixed(1)}h / {totalAvailable.toFixed(1)}h</span>
          <span className="rounded bg-primary/15 px-1.5 py-0.2 font-bold text-primary">
            {avgUtil}% Utilized
          </span>
        </div>
      </div>

      {/* Corridors Capacity Bars */}
      <div className="mt-3.5 space-y-2.5">
        {blockCapacityData.map((row) => {
          const isSelected = row.corridorId === selectedCorridorId
          const plannedPct = (row.plannedHours / row.availableHours) * 100
          const unusedPct = (row.unusedHours / row.availableHours) * 100

          return (
            <div
              key={row.corridorId}
              onClick={() => onSelectCorridor?.(row.corridorId)}
              className={cn(
                'group cursor-pointer rounded-lg border p-2.5 transition-all duration-150',
                isSelected
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/60 bg-secondary/20 hover:border-border hover:bg-secondary/40',
              )}
            >
              {/* Row Top */}
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-xs font-bold text-primary">
                    {row.corridorId}
                  </span>
                  <span className="font-semibold text-foreground truncate">{row.name}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground">
                    Available: <strong className="text-foreground">{row.availableHours}h</strong>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Planned: <strong className="text-primary">{row.plannedHours}h</strong>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cn(
                    'font-bold',
                    row.unusedHours > 3 ? 'text-emerald-500' : 'text-amber-400'
                  )}>
                    {row.unusedHours.toFixed(1)}h Unused
                  </span>
                </div>
              </div>

              {/* Progress Track: Dual-track Planned vs Surplus */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/80 flex">
                {/* Planned bar */}
                <div
                  style={{ width: `${plannedPct}%` }}
                  className={cn(
                    'h-full transition-all duration-300',
                    row.status === 'Constrained' ? 'bg-amber-500' : 'bg-primary',
                  )}
                  title={`Planned: ${row.plannedHours}h (${plannedPct.toFixed(0)}%)`}
                />
                {/* Unused Surplus Window */}
                <div
                  style={{ width: `${unusedPct}%` }}
                  className={cn(
                    'h-full transition-all duration-300 opacity-60',
                    row.unusedHours > 3 ? 'bg-emerald-500' : 'bg-sky-400/40',
                  )}
                  title={`Unused Surplus: ${row.unusedHours.toFixed(1)}h (${unusedPct.toFixed(0)}%)`}
                />
              </div>

              {/* Bottom metadata tags & Backlog Absorption Link */}
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <span>{row.utilizationPct}% allocated</span>
                  {row.status === 'Underutilized' && (
                    <span className="text-emerald-500 font-semibold">
                      ✓ Surplus capacity ({row.unusedHours.toFixed(1)}h)
                    </span>
                  )}
                  {row.status === 'Constrained' && (
                    <span className="text-amber-500 font-semibold">
                      ⚠️ Saturated timetable margin
                    </span>
                  )}
                  {row.status === 'Optimal' && (
                    <span className="text-primary font-semibold">
                      ✓ Balanced flow
                    </span>
                  )}
                </div>

                {row.unusedHours > 2 && (
                  <Link
                    href={`/planner?corridor=${row.corridorId}&absorb=true`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <span>Absorb Backlog</span>
                    <ArrowRight className="size-2.5" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
