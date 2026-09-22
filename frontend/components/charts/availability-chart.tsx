'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { availabilityTrend } from '@/lib/data/dashboard'
import { ChartTooltip } from '@/components/charts/chart-tooltip'

export function AvailabilityChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={availabilityTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAvail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillUtil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <YAxis
          domain={[60, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip unit="%" />} />
        <Area
          type="monotone"
          dataKey="availability"
          name="Availability"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#fillAvail)"
        />
        <Area
          type="monotone"
          dataKey="utilization"
          name="Utilization"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#fillUtil)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
