import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { Kpi } from '@/lib/types'
import { toneDot } from '@/lib/status'

// Visual progress fill per metric type
function getProgressPct(kpi: Kpi): number | null {
  if (kpi.unit === '%') return Math.min(100, Math.max(0, kpi.numeric))
  if (kpi.id === 'critical') return Math.min(100, (kpi.numeric / 20) * 100)
  if (kpi.id === 'overdue') return Math.min(100, (kpi.numeric / 60) * 100)
  if (kpi.id === 'conflicts') return Math.min(100, (kpi.numeric / 15) * 100)
  if (kpi.id === 'bundled') return Math.min(100, (kpi.numeric / 30) * 100)
  return null
}

const toneBar: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground/40',
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const improving =
    kpi.trend === 'flat'
      ? null
      : (kpi.trend === 'up') === (kpi.goodDirection === 'up')

  const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : kpi.trend === 'down' ? ArrowDownRight : Minus
  const progressPct = getProgressPct(kpi)

  return (
    <Card className="relative gap-0 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground leading-tight">
          {kpi.label}
        </p>
        <span className={cn('size-2 shrink-0 rounded-full', toneDot[kpi.tone])} />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </span>
        {kpi.unit && <span className="text-sm font-medium text-muted-foreground">{kpi.unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            improving === null
              ? 'text-muted-foreground'
              : improving
                ? 'text-success'
                : 'text-danger',
          )}
        >
          <TrendIcon className="size-3.5" />
          {kpi.delta > 0 ? '+' : ''}
          {kpi.delta}
          {kpi.unit === '%' ? 'pp' : ''}
        </span>
        <span className="text-muted-foreground">vs last week</span>
      </div>
      {progressPct !== null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500', toneBar[kpi.tone])}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </Card>
  )
}
