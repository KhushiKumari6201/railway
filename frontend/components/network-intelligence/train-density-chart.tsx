'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { trainDensityTimeline } from '@/lib/data/network-intelligence'
import { TrainTrack, Sparkles, Info, SlidersHorizontal, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrainDensityChartProps {
  simMinute?: number
}

function getClosestHourString(minutes: number): string {
  const h = Math.round(minutes / 60) % 24
  return `${h.toString().padStart(2, '0')}:00`
}

export function TrainDensityChart({ simMinute = 750 }: TrainDensityChartProps) {
  const [simulateFreightShift, setSimulateFreightShift] = useState<boolean>(false)
  const currentHourStr = getClosestHourString(simMinute)

  // Adjusted data when simulating freight path shifting
  const chartData = trainDensityTimeline.map((pt) => {
    if (simulateFreightShift && (pt.time === '11:00' || pt.time === '12:00' || pt.time === '13:00')) {
      const reducedGoods = Math.max(1, pt.goods - 2)
      return {
        ...pt,
        goods: reducedGoods,
        total: pt.passenger + reducedGoods + pt.other,
      }
    }
    return pt
  })

  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
              <TrainTrack className="size-3" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Network Train Movement Density & Headway Windows
            </h3>
            <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-xs font-bold text-primary">
              OCC Chrono
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hourly passenger & freight path occupancy (06:00–22:00) with real-time synchronized OCC time cursor
          </p>
        </div>

        {/* Legend & What-If Simulation Toggle */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-primary" /> Passenger (Trunk/EMU)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-xs bg-amber-500" /> Goods (Freight/BOXN)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
            <Sparkles className="size-3" /> 11:30–13:30 Optimal Window
          </span>

          <button
            onClick={() => setSimulateFreightShift(!simulateFreightShift)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 py-1 transition-all',
              simulateFreightShift
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500 font-bold'
                : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
            )}
            title="Simulate rescheduling 2 freight rakes to off-peak slots"
          >
            <SlidersHorizontal className="size-2.5" />
            <span>Simulate Freight De-confliction</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="passengerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="goodsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Highlight Optimal Maintenance Window at 11:00-13:00 */}
            <ReferenceArea
              x1="11:00"
              x2="13:00"
              strokeOpacity={0.3}
              fill="var(--color-success)"
              fillOpacity={simulateFreightShift ? 0.16 : 0.08}
              stroke="var(--color-success)"
              strokeDasharray="3 3"
            />

            {/* Synchronized Live OCC Scrubber Time Marker */}
            <ReferenceLine
              x={currentHourStr}
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: `OCC TIME: ${currentHourStr}`,
                position: 'top',
                fill: '#06b6d4',
                fontSize: 9,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeWidth: 0.5 }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 32]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const d = payload[0].payload
                return (
                  <div className="rounded-lg border border-border/90 bg-background/95 p-2.5 shadow-xl backdrop-blur-md text-xs font-mono">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-1 font-bold text-foreground">
                      <span>{d.time}</span>
                      <span className="text-primary">{d.total} movements/hr</span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs">
                      <div className="flex items-center justify-between text-primary">
                        <span>Passenger:</span>
                        <span className="font-bold">{d.passenger}</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-500">
                        <span>Goods:</span>
                        <span className="font-bold">{d.goods}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Other:</span>
                        <span className="font-bold">{d.other}</span>
                      </div>
                    </div>
                    {d.isOptimalWindow && (
                      <div className="mt-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-500">
                        ✓ Prime 120m Maintenance Window
                      </div>
                    )}
                  </div>
                )
              }}
            />

            <Area
              type="monotone"
              dataKey="passenger"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#passengerGrad)"
            />
            <Area
              type="monotone"
              dataKey="goods"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#goodsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Analytical Callout & Simulation Result */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/25 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="size-3.5 text-primary shrink-0" />
          <span>
            {simulateFreightShift ? (
              <span className="text-emerald-500 font-semibold">
                Simulated De-confliction Active: 2 coal rakes re-scheduled to 14:00 loop siding. Midday maintenance margin increased to 135 minutes with 0 passenger clash.
              </span>
            ) : (
              <span>
                <strong>AI Timetable Advisory:</strong> Midday corridor gap (11:30–13:30) allows 120min multi-department bundled work with &lt;4% disruption probability.
              </span>
            )}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-primary">
          Confidence: {simulateFreightShift ? '97.8%' : '94.2%'}
        </span>
      </div>
    </div>
  )
}
