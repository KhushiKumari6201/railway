'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight, ShieldAlert, Cpu, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { aiNetworkInsights } from '@/lib/data/network-intelligence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AINetworkInsights({
  onSelectCorridor,
}: {
  onSelectCorridor?: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-4 shadow-xs">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
            <Sparkles className="size-3" />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            AI Network Intelligence & Automated Advisory
          </h3>
          <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-xs font-bold text-primary">
            Analytical Dispatch Layer
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Constraint-driven cross-departmental recommendations evaluated every 15 min
        </p>
      </div>

      {/* Grid of Compact Operational Insight Cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {aiNetworkInsights.map((insight) => {
          const isDanger = insight.badgeTone === 'danger'
          const isWarning = insight.badgeTone === 'warning'
          const isSuccess = insight.badgeTone === 'success'

          return (
            <div
              key={insight.id}
              onClick={() => onSelectCorridor?.(insight.corridorId)}
              className={cn(
                'group flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 cursor-pointer',
                isDanger && 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 hover:bg-rose-500/10',
                isWarning && 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10',
                isSuccess && 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10',
                !isDanger && !isWarning && !isSuccess && 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10',
              )}
            >
              <div>
                {/* Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider',
                      isDanger && 'bg-rose-500/15 text-rose-500',
                      isWarning && 'bg-amber-500/15 text-amber-500',
                      isSuccess && 'bg-emerald-500/15 text-emerald-500',
                      !isDanger && !isWarning && !isSuccess && 'bg-primary/15 text-primary',
                    )}
                  >
                    <span className="size-1 rounded-full bg-current animate-pulse" />
                    {insight.badge}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground font-semibold">
                    {insight.corridorId}
                  </span>
                </div>

                {/* Title */}
                <h4 className="mt-2 text-xs font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                  {insight.title}
                </h4>

                {/* Concise explanation */}
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {insight.description}
                </p>

                {/* Metric & Impact Box */}
                <div className="mt-2.5 space-y-1 rounded border border-border/60 bg-background/60 p-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Key Metric:</span>
                    <strong className="text-foreground">{insight.metric}</strong>
                  </div>
                  <div className="flex items-center justify-between text-primary font-medium">
                    <span>Impact:</span>
                    <span className="truncate max-w-[140px] text-right">{insight.impact}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 border-t border-border/40 pt-2">
                <Button
                  variant="ghost"
                  size="xs"
                  asChild
                  className="w-full justify-between text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link href={insight.actionHref} onClick={(e) => e.stopPropagation()}>
                    <span>{insight.actionLabel}</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
