'use client'

import { useId } from 'react'
import {
  Gauge,
  ShieldCheck,
  AlertCircle,
  Clock,
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from 'lucide-react'
import type { NetworkTopKpis } from '@/lib/data/network-intelligence'
import { kpiSparklines } from '@/lib/data/network-intelligence'
import { cn } from '@/lib/utils'

interface NetworkMetricsProps {
  kpis: NetworkTopKpis
  filteredCorridor?: string
}

// Helper to generate smooth SVG path for 7-point sparklines
function generateSparklinePaths(data: number[], width: number, height: number) {
  if (!data || data.length < 2) return { linePath: '', areaPath: '' }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 3

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y }
  })

  // Build SVG path
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }, '')

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
  return { linePath, areaPath }
}

export function NetworkMetrics({ kpis, filteredCorridor }: NetworkMetricsProps) {
  const compId = useId()

  const items = [
    {
      id: 'avail',
      label: 'Asset Availability',
      value: `${kpis.assetAvailability}%`,
      sub: filteredCorridor ? `${filteredCorridor} Corridor Availability` : 'Network target: >95.0% (RDSO)',
      delta: '+1.4% vs 7d avg',
      deltaType: 'positive' as const,
      icon: ShieldCheck,
      tone: 'text-emerald-500',
      strokeColor: '#10b981',
      sparkData: kpiSparklines.assetAvailability,
      percent: kpis.assetAvailability,
    },
    {
      id: 'util',
      label: 'Block Utilization',
      value: `${kpis.blockUtilization}%`,
      sub: `${kpis.totalPlannedHours}h planned / ${kpis.totalAvailableHours}h window`,
      delta: '+4.2h capacity booked',
      deltaType: 'positive' as const,
      icon: Gauge,
      tone: 'text-primary',
      strokeColor: '#3b82f6',
      sparkData: kpiSparklines.blockUtilization,
      percent: kpis.blockUtilization,
    },
    {
      id: 'crit',
      label: 'Critical Tasks',
      value: kpis.criticalTasks,
      sub: 'Mandatory window required <48h',
      delta: '-3 resolved today',
      deltaType: 'neutral' as const,
      icon: AlertCircle,
      tone: 'text-rose-500',
      strokeColor: '#f43f5e',
      sparkData: kpiSparklines.criticalTasks,
      percent: (kpis.criticalTasks / 20) * 100,
    },
    {
      id: 'overdue',
      label: 'Overdue Backlog',
      value: kpis.overdueTasks,
      sub: 'Cumulative TMS, SMMS & TDMS',
      delta: '-6 absorbed in bundled slots',
      deltaType: 'positive' as const,
      icon: Clock,
      tone: 'text-amber-500',
      strokeColor: '#f59e0b',
      sparkData: kpiSparklines.overdueTasks,
      percent: (kpis.overdueTasks / 60) * 100,
    },
    {
      id: 'conflicts',
      label: 'Active Conflicts',
      value: kpis.activeConflicts,
      sub: 'Timetable overlap or crew clashes',
      delta: kpis.activeConflicts === 0 ? '0 unresolved' : '-2 since 08:00 shift',
      deltaType: kpis.activeConflicts === 0 ? 'positive' as const : 'warning' as const,
      icon: TriangleAlert,
      tone: kpis.activeConflicts > 0 ? 'text-amber-400' : 'text-emerald-500',
      strokeColor: kpis.activeConflicts > 0 ? '#fbbf24' : '#10b981',
      sparkData: kpiSparklines.activeConflicts,
      percent: (kpis.activeConflicts / 15) * 100,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const { linePath, areaPath } = generateSparklinePaths(item.sparkData, 80, 26)
        const gradId = `${compId}-${item.id}-grad`

        return (
          <div
            key={item.label}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card/95 hover:shadow-md"
          >
            {/* Ambient corner glow indicator */}
            <div
              className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full opacity-10 blur-xl transition-opacity group-hover:opacity-25"
              style={{ backgroundColor: item.strokeColor }}
            />

            <div>
              {/* Top Row: Micro Icon, Label & Live Radar Dot */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <item.icon className={cn('size-3.5', item.tone)} />
                </div>
              </div>

              {/* Middle Row: Large Tabular Metric & Sparkline Curve */}
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <span className="font-mono text-2xl font-black tracking-tight text-foreground tabular-nums">
                  {item.value}
                </span>

                {/* SVG Mini Sparkline */}
                <div className="h-6 w-20 shrink-0">
                  <svg viewBox="0 0 80 26" className="size-full overflow-visible">
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={item.strokeColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={item.strokeColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#${gradId})`} />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={item.strokeColor}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Subtitle / Department Context */}
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {item.sub}
              </p>
            </div>

            {/* Bottom Row: Delta Badge & Micro Progress Bar */}
            <div className="mt-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs font-mono">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-semibold',
                    item.deltaType === 'positive' && 'text-emerald-500',
                    item.deltaType === 'warning' && 'text-amber-400',
                    item.deltaType === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {item.deltaType === 'positive' ? (
                    <TrendingUp className="size-2.5 shrink-0" />
                  ) : item.deltaType === 'warning' ? (
                    <TrendingDown className="size-2.5 shrink-0" />
                  ) : (
                    <Activity className="size-2.5 shrink-0" />
                  )}
                  {item.delta}
                </span>
                <span className="text-muted-foreground/70">7d Trend</span>
              </div>

              {/* ChargeSmart subtle micro progress track */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(10, item.percent))}%`,
                    backgroundColor: item.strokeColor,
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

