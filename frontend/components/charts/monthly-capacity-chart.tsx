'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { ChartTooltip } from './chart-tooltip'

interface DataRow {
  corridor: string
  demandHours: number
  capacityHours: number
  criticalOpen: number
}

export function MonthlyCapacityChart({ data }: { data: DataRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="corridor"
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          unit="h"
        />
        <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }} />
        <Bar dataKey="capacityHours" name="Capacity" fill="var(--color-muted-foreground)" opacity={0.3} radius={[3, 3, 0, 0]} />
        <Bar dataKey="demandHours" name="Demand" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
