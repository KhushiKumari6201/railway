'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { ChartTooltip } from './chart-tooltip'

interface DataRow {
  week: string
  backlog: number
  critical: number
}

export function MonthlyBacklogChart({ data }: { data: DataRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="backlog"
          name="Total backlog"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-chart-1)' }}
        />
        <Line
          type="monotone"
          dataKey="critical"
          name="Critical tasks"
          stroke="var(--color-chart-4)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-chart-4)' }}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
