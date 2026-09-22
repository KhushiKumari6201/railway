'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { criticalityBreakdown } from '@/lib/data/dashboard'
import { ChartTooltip } from '@/components/charts/chart-tooltip'

const colors: Record<string, string> = {
  critical: 'var(--chart-4)',
  high: 'var(--chart-3)',
  medium: 'var(--chart-1)',
  low: 'var(--chart-5)',
}

export function CriticalityDonut() {
  const total = criticalityBreakdown.reduce((s, d) => s + d.value, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={criticalityBreakdown}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            strokeWidth={0}
          >
            {criticalityBreakdown.map((entry) => (
              <Cell key={entry.key} fill={colors[entry.key]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">Open tasks</span>
      </div>
    </div>
  )
}
