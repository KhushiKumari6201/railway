'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { departmentWorkload } from '@/lib/data/dashboard'
import { ChartTooltip } from '@/components/charts/chart-tooltip'

export function WorkloadChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={departmentWorkload} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="department"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip />} />
        <Bar dataKey="open" name="Open" stackId="a" fill="var(--chart-4)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="var(--chart-3)" />
        <Bar dataKey="bundled" name="Bundled" stackId="a" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
