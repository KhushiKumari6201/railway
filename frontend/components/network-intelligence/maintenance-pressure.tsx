'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MaintenancePressureRow } from '@/lib/data/network-intelligence'
import { maintenancePressureData } from '@/lib/data/network-intelligence'
import { cn } from '@/lib/utils'
import { Wrench, AlertCircle, ShieldAlert, ArrowRight, Sparkles, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MaintenancePressureProps {
  onSelectCorridor?: (id: string) => void
  selectedCorridorId?: string
}

// Departmental approximate shares per corridor
const deptShares: Record<string, { eng: number; sig: number; trd: number }> = {
  C01: { eng: 18, sig: 11, trd: 7 },
  C02: { eng: 14, sig: 8, trd: 6 },
  C03: { eng: 24, sig: 14, trd: 9 },
  C04: { eng: 10, sig: 9, trd: 3 },
  C05: { eng: 8, sig: 5, trd: 3 },
}

export function MaintenancePressure({
  onSelectCorridor,
  selectedCorridorId,
}: MaintenancePressureProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'total'>('score')

  const sortedData = [...maintenancePressureData].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score
    return b.totalTasks - a.totalTasks
  })

  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-xs">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
              <Wrench className="size-3" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Corridor Maintenance Pressure & Department Backlogs
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Segmented task volume & urgency from TMS, SMMS and TDMS backlogs
          </p>
        </div>

        {/* Sort & Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex rounded-md border border-border bg-secondary/30 p-0.5 font-mono text-xs">
            <button
              onClick={() => setSortBy('score')}
              className={cn(
                'rounded px-2 py-0.5 transition-all',
                sortBy === 'score' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground',
              )}
            >
              Urgency
            </button>
            <button
              onClick={() => setSortBy('total')}
              className={cn(
                'rounded px-2 py-0.5 transition-all',
                sortBy === 'total' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground',
              )}
            >
              Volume
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-xs bg-rose-500" /> Critical
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-xs bg-amber-500" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-xs bg-blue-500" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-xs bg-slate-500" /> Low
            </span>
          </div>
        </div>
      </div>

      {/* Corridor Segmented Bars */}
      <div className="mt-3.5 space-y-2.5">
        {sortedData.map((row) => {
          const isSelected = row.corridorId === selectedCorridorId
          const isHover = hovered === row.corridorId
          const total = row.totalTasks
          const depts = deptShares[row.corridorId] || { eng: 10, sig: 8, trd: 4 }

          const critPct = (row.critical / total) * 100
          const highPct = (row.high / total) * 100
          const medPct = (row.medium / total) * 100
          const lowPct = (row.low / total) * 100

          return (
            <div
              key={row.corridorId}
              onClick={() => onSelectCorridor?.(row.corridorId)}
              onMouseEnter={() => setHovered(row.corridorId)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'group cursor-pointer rounded-lg border p-2.5 transition-all duration-150',
                isSelected
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/60 bg-secondary/20 hover:border-border hover:bg-secondary/40',
              )}
            >
              {/* Corridor Row Header */}
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-xs font-bold text-primary">
                    {row.corridorId}
                  </span>
                  <span className="font-semibold text-foreground truncate">{row.name}</span>

                  {/* Department pill breakdown */}
                  <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <span>(ENG:{depts.eng}</span>
                    <span>· S&amp;T:{depts.sig}</span>
                    <span>· TRD:{depts.trd})</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {row.pressureLevel === 'Critical' && (
                    <span className="flex items-center gap-1 font-bold text-rose-500">
                      <ShieldAlert className="size-3" /> Critical ({row.score}/100)
                    </span>
                  )}
                  {row.pressureLevel === 'High' && (
                    <span className="font-semibold text-amber-500">
                      High ({row.score}/100)
                    </span>
                  )}
                  {row.pressureLevel === 'Medium' && (
                    <span className="text-blue-400">
                      Medium ({row.score}/100)
                    </span>
                  )}
                  {row.pressureLevel === 'Low' && (
                    <span className="text-muted-foreground">
                      Low ({row.score}/100)
                    </span>
                  )}
                  <span className="text-muted-foreground font-bold">· {total} tasks</span>
                </div>
              </div>

              {/* Segmented Intensity Bar with Micro Gaps */}
              <div className="flex h-3 w-full overflow-hidden rounded-md bg-secondary/80 p-0.5 gap-0.5">
                {row.critical > 0 && (
                  <div
                    style={{ width: `${critPct}%` }}
                    className="group-hover:brightness-110 h-full rounded-xs bg-rose-500 transition-all"
                    title={`${row.critical} Critical Tasks (${critPct.toFixed(0)}%)`}
                  />
                )}
                {row.high > 0 && (
                  <div
                    style={{ width: `${highPct}%` }}
                    className="group-hover:brightness-110 h-full rounded-xs bg-amber-500 transition-all"
                    title={`${row.high} High Priority Tasks (${highPct.toFixed(0)}%)`}
                  />
                )}
                {row.medium > 0 && (
                  <div
                    style={{ width: `${medPct}%` }}
                    className="group-hover:brightness-110 h-full rounded-xs bg-blue-500 transition-all"
                    title={`${row.medium} Medium Priority Tasks (${medPct.toFixed(0)}%)`}
                  />
                )}
                {row.low > 0 && (
                  <div
                    style={{ width: `${lowPct}%` }}
                    className="group-hover:brightness-110 h-full rounded-xs bg-slate-500/80 transition-all"
                    title={`${row.low} Low Priority Tasks (${lowPct.toFixed(0)}%)`}
                  />
                )}
              </div>

              {/* Sub-strip: Task counts breakdown & One-Click Planner Link on hover */}
              {(isHover || isSelected) && (
                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-rose-500 font-bold">{row.critical} Critical</span>
                    <span className="text-amber-500 font-medium">{row.high} High</span>
                    <span className="text-blue-400 font-medium">{row.medium} Medium</span>
                    <span className="text-muted-foreground">{row.low} Routine</span>
                  </div>

                  <Link
                    href={`/planner?corridor=${row.corridorId}&action=bundle`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <Sparkles className="size-3" />
                    <span>Auto-Bundle in Planner →</span>
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
