'use client'

import { HeartPulse, Wrench, BatteryCharging, TrainTrack, AlertTriangle } from 'lucide-react'
import type { NetworkLayer } from '@/lib/data/network-intelligence'
import { cn } from '@/lib/utils'

interface LayerOption {
  id: NetworkLayer
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  indicatorColor: string
}

const layers: LayerOption[] = [
  {
    id: 'asset-health',
    label: 'Asset Health',
    shortLabel: 'Health',
    icon: HeartPulse,
    description: 'Infrastructure condition: Healthy, Warning, Critical track defects',
    indicatorColor: 'bg-emerald-500',
  },
  {
    id: 'maintenance-demand',
    label: 'Maintenance Demand',
    shortLabel: 'Demand',
    icon: Wrench,
    description: 'Work order density: Low, Medium, High backlogs from TMS/SMMS/TDMS',
    indicatorColor: 'bg-primary',
  },
  {
    id: 'block-capacity',
    label: 'Block Capacity',
    shortLabel: 'Capacity',
    icon: BatteryCharging,
    description: 'Window availability: Available, Partially Used, Fully Allocated',
    indicatorColor: 'bg-sky-400',
  },
  {
    id: 'train-density',
    label: 'Train Density',
    shortLabel: 'Density',
    icon: TrainTrack,
    description: 'Timetable movement pressure: Low, Moderate, High traffic paths',
    indicatorColor: 'bg-amber-400',
  },
  {
    id: 'conflicts',
    label: 'Conflicts',
    shortLabel: 'Conflicts',
    icon: AlertTriangle,
    description: 'Timetable overlaps, resource contention, and unfeasible windows',
    indicatorColor: 'bg-rose-500',
  },
]

interface NetworkLayerSwitcherProps {
  activeLayer: NetworkLayer
  onChangeLayer: (layer: NetworkLayer) => void
}

export function NetworkLayerSwitcher({
  activeLayer,
  onChangeLayer,
}: NetworkLayerSwitcherProps) {
  const current = layers.find((l) => l.id === activeLayer)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Control Segmented Bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-secondary/40 p-1">
        <span className="px-2 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
          VIEW
        </span>

        {layers.map((layer) => {
          const isActive = activeLayer === layer.id
          const Icon = layer.icon
          return (
            <button
              key={layer.id}
              onClick={() => onChangeLayer(layer.id)}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/80'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full transition-transform',
                  layer.indicatorColor,
                  isActive ? 'scale-125' : 'opacity-60 group-hover:opacity-100',
                )}
              />
              <Icon className="size-3.5 opacity-80" />
              <span className="hidden sm:inline">{layer.label}</span>
              <span className="sm:hidden">{layer.shortLabel}</span>
            </button>
          )
        })}
      </div>

      {/* Dynamic Layer Explanation */}
      {current && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{current.label}:</span>
          <span className="truncate">{current.description}</span>
        </div>
      )}
    </div>
  )
}
