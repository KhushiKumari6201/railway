'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  ShieldCheck,
  TrainFront,
  Wrench,
  Layers,
  Radio,
  Sparkles,
  Zap,
  Activity,
  Check,
  X,
} from 'lucide-react'
import type { CorridorNetworkDetail } from '@/lib/data/network-intelligence'
import { dispatchCommsData } from '@/lib/data/network-intelligence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CorridorDetailPanelProps {
  corridor: CorridorNetworkDetail
  onSelectCorridor: (id: string) => void
}

// SVG Semi-Circular Arc Radial Gauge
function TrackHealthGauge({ score }: { score: number }) {
  // Angle from -180 to 0 degrees (semi-circle)
  const radius = 38
  const cx = 50
  const cy = 46
  const strokeWidth = 7
  const circumference = Math.PI * radius // ~119.38
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/25 p-2.5">
      <div className="relative size-20 shrink-0">
        <svg viewBox="0 0 100 55" className="size-full overflow-visible">
          {/* Background Track Arc */}
          <path
            d="M 12 46 A 38 38 0 0 1 88 46"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border/50"
            strokeLinecap="round"
          />
          {/* Active Score Arc */}
          <path
            d="M 12 46 A 38 38 0 0 1 88 46"
            fill="none"
            stroke={score >= 95 ? '#10b981' : score >= 85 ? '#3b82f6' : '#f59e0b'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 font-mono">
          <span className="text-base font-bold text-foreground tabular-nums leading-none">
            {score}%
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
            THI Score
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-0.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
          <span>Track Health Index (RDSO)</span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          Rolling ultrasonic flaw detection & OMR geometry assessment within limits.
        </p>
      </div>
    </div>
  )
}

export function CorridorDetailPanel({ corridor }: CorridorDetailPanelProps) {
  const k = corridor.kpis
  const status = corridor.operationalStatus
  const [showSimModal, setShowSimModal] = useState<boolean>(false)

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/80 bg-card/75 p-4 shadow-xs">
      <div>
        {/* Header Info */}
        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {corridor.id}
              </span>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {corridor.name}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {corridor.alias} · {corridor.totalKm} km · {corridor.sections.length} Sections
            </p>
          </div>
          <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {corridor.trackDescription.split('·')[0]}
          </span>
        </div>

        {/* Semi-Circular Track Health Gauge */}
        <div className="mt-3">
          <TrackHealthGauge score={k.assetAvailability} />
        </div>

        {/* Compact KPI Grid */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border/60 bg-secondary/25 p-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Block Utilization
            </span>
            <p className="mt-0.5 font-mono text-lg font-bold text-primary">
              {k.blockUtilization}%
            </p>
            <span className="text-xs text-muted-foreground font-mono">{k.plannedHours}h / {k.availableHours}h</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/25 p-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Critical Tasks
            </span>
            <p className="mt-0.5 font-mono text-lg font-bold text-rose-500">
              {k.criticalTasks}
            </p>
            <span className="text-xs text-amber-500 font-mono">{k.overdueTasks} overdue</span>
          </div>
        </div>

        {/* Operational Status Checklist */}
        <div className="mt-2.5 space-y-1.5 rounded-lg border border-border/60 bg-secondary/20 p-2.5 text-xs">
          <div className="font-bold uppercase tracking-wider text-xs text-muted-foreground mb-1">
            Operational Status & Conflicts
          </div>

          <div className="flex items-start gap-2 text-xs leading-snug">
            {status.trainConflictState === 'Clear' ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
            ) : status.trainConflictState === 'Warning' ? (
              <AlertTriangle className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
            )}
            <span className="text-foreground font-medium">{status.conflictNote}</span>
          </div>

          <div className="flex items-start gap-2 text-xs leading-snug">
            <CalendarClock className="size-3.5 shrink-0 text-primary mt-0.5" />
            <span className="text-muted-foreground">{status.scheduledBlocksNote}</span>
          </div>
        </div>

        {/* Mini Contextual Timeline */}
        <div className="mt-2.5 rounded-lg border border-border/70 bg-secondary/15 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Corridor Focus Window (11:00–15:00)
            </span>
            <span className="font-mono text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live OCC Feed
            </span>
          </div>

          <div className="space-y-1.5">
            {corridor.miniTimeline.map((slot, i) => {
              const isBlock = slot.kind === 'block'
              const isTrain = slot.kind === 'train'
              const isMaintenance = slot.kind === 'maintenance'
              const isAvailable = slot.kind === 'available'

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-xs font-medium transition-all',
                    isBlock && 'bg-primary/15 border border-primary/40 text-primary font-semibold',
                    isTrain && 'bg-secondary/70 border border-border text-foreground',
                    isMaintenance && 'bg-violet-500/15 border border-violet-500/30 text-violet-400',
                    isAvailable && 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 border-dashed',
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isTrain && <TrainFront className="size-3 shrink-0 text-muted-foreground" />}
                    {isBlock && <CalendarClock className="size-3 shrink-0 text-primary" />}
                    {isMaintenance && <Wrench className="size-3 shrink-0 text-violet-400" />}
                    <span className="truncate">{slot.label}</span>
                  </div>
                  <span className="font-mono text-xs opacity-80 shrink-0">
                    {slot.start}–{slot.end}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live OCC Dispatch Radio Transcript Stream */}
        <div className="mt-2.5 rounded-lg border border-border/60 bg-background/50 p-2.5 font-mono text-xs">
          <div className="flex items-center justify-between text-muted-foreground pb-1 mb-1 border-b border-border/40">
            <span className="flex items-center gap-1 font-bold text-foreground">
              <Radio className="size-3 text-cyan-400 animate-pulse" />
              OCC RADIO LOG
            </span>
            <span>CH-04 KGP OCC</span>
          </div>
          <div className="space-y-1 text-muted-foreground">
            {dispatchCommsData.slice(0, 2).map((c) => (
              <div key={c.id} className="leading-snug">
                <span className="text-primary font-semibold">[{c.timestamp}]</span>{' '}
                <span className="text-foreground font-medium">{c.speaker}:</span>{' '}
                <span className="text-muted-foreground line-clamp-1">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer with One-Click Simulation Trigger */}
      <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSimModal(true)}
          className="w-full justify-center gap-2 text-xs font-semibold border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
        >
          <Sparkles className="size-3.5" />
          Simulate 120min Window Bundling
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1 text-xs">
            <Link href={`/planner?corridor=${corridor.id}`}>
              <Layers className="size-3.5" />
              Inspect
            </Link>
          </Button>
          <Button size="sm" asChild className="flex-1 text-xs font-semibold">
            <Link href="/planner">
              <CalendarClock className="size-3.5" />
              Open Planner
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Simulation Modal Drawer */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-w-md w-full rounded-2xl border border-primary/40 bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    AI Window Bundling Simulation
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {corridor.id} · 11:30–13:30 (120 min window)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-500">
                  <CheckCircle2 className="size-4" />
                  <span>Zero Passenger Delay Impact</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  12863 Howrah-SMVB clears Panskura at 11:22. Next train 12841 scheduled after 13:40.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded border border-border/60 bg-secondary/30 p-2">
                  <span className="text-xs text-muted-foreground uppercase">Work Orders</span>
                  <p className="text-sm font-bold text-foreground">3 Bundled</p>
                  <span className="text-xs text-emerald-500">TMS + SMMS + TDMS</span>
                </div>
                <div className="rounded border border-border/60 bg-secondary/30 p-2">
                  <span className="text-xs text-muted-foreground uppercase">Downtime Saved</span>
                  <p className="text-sm font-bold text-primary">85 Minutes</p>
                  <span className="text-xs text-muted-foreground">vs individual blocks</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="ghost" size="sm" onClick={() => setShowSimModal(false)}>
                Dismiss
              </Button>
              <Button size="sm" asChild className="gap-1.5 font-semibold">
                <Link href={`/planner?corridor=${corridor.id}&simulate=true`}>
                  Commit to Block Planner
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
