'use client'

import { useState } from 'react'
import {
  TrainFront,
  Wrench,
  Zap,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Navigation,
  ShieldAlert,
} from 'lucide-react'
import { corridors, corridorName } from '@/lib/data/corridors'
import { useAppState } from '@/lib/app-state-context'
import type { RecommendedBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { confidenceTone, impactTone } from '@/lib/status'

interface StationNode {
  code: string
  name: string
  km: number
  majorJunction?: boolean
}

interface CorridorTrackData {
  corridorId: string
  name: string
  tracks: string
  stations: StationNode[]
  activeBlock?: {
    blockId: string
    fromStation: string
    toStation: string
    dept: 'Engineering' | 'S&T' | 'Traction' | 'Combined'
    type: string
    duration: string
    utilization: number
  }
  trainsEnRoute: {
    trainNo: string
    name: string
    between: string
    status: 'On Time' | 'Delayed 12m' | 'Passing'
  }[]
}

const corridorSchematics: CorridorTrackData[] = [
  {
    corridorId: 'C01',
    name: 'Howrah – Kharagpur Main Line',
    tracks: 'Quadruple Track (2 Up / 2 Down) · 25kV AC',
    stations: [
      { code: 'HWH', name: 'Howrah Jn', km: 0, majorJunction: true },
      { code: 'SRC', name: 'Santragachi', km: 7 },
      { code: 'ADL', name: 'Andul', km: 12 },
      { code: 'BZN', name: 'Bagnan', km: 45 },
      { code: 'PKU', name: 'Panskura', km: 71, majorJunction: true },
      { code: 'KGP', name: 'Kharagpur Jn', km: 115, majorJunction: true },
    ],
    activeBlock: {
      blockId: 'REC-101',
      fromStation: 'HWH',
      toStation: 'SRC',
      dept: 'Combined',
      type: 'Traffic & Power Block',
      duration: '11:30–13:15 (105m)',
      utilization: 87.5,
    },
    trainsEnRoute: [
      { trainNo: '12841', name: 'Coromandel Exp', between: 'SRC–PKU', status: 'On Time' },
      { trainNo: 'GDS-4412', name: 'BOXN Freight', between: 'PKU–KGP', status: 'Passing' },
    ],
  },
  {
    corridorId: 'C02',
    name: 'Kharagpur – Bhadrak Section',
    tracks: 'Double Track · Auto Signalling · 25kV AC',
    stations: [
      { code: 'KGP', name: 'Kharagpur Jn', km: 0, majorJunction: true },
      { code: 'BLDA', name: 'Belda', km: 45 },
      { code: 'JER', name: 'Jaleswar', km: 68 },
      { code: 'BLS', name: 'Balasore', km: 116, majorJunction: true },
      { code: 'BHC', name: 'Bhadrak', km: 178, majorJunction: true },
    ],
    activeBlock: {
      blockId: 'REC-102',
      fromStation: 'BLS',
      toStation: 'BHC',
      dept: 'Engineering',
      type: 'Corridor Traffic Block',
      duration: '12:00–15:00 (180m)',
      utilization: 100,
    },
    trainsEnRoute: [
      { trainNo: '12277', name: 'Shatabdi Exp', between: 'KGP–BLS', status: 'On Time' },
    ],
  },
  {
    corridorId: 'C03',
    name: 'Kharagpur – Tatanagar Line',
    tracks: 'Double Track · Heavy Mineral Corridor',
    stations: [
      { code: 'KGP', name: 'Kharagpur Jn', km: 0, majorJunction: true },
      { code: 'JGM', name: 'Jhargram', km: 39 },
      { code: 'GTS', name: 'Ghatsila', km: 96 },
      { code: 'TATA', name: 'Tatanagar Jn', km: 134, majorJunction: true },
    ],
    activeBlock: {
      blockId: 'REC-104',
      fromStation: 'JGM',
      toStation: 'GTS',
      dept: 'Combined',
      type: 'Integrated Block',
      duration: '09:00–11:30 (150m)',
      utilization: 93.3,
    },
    trainsEnRoute: [
      { trainNo: 'GDS-8820', name: 'Iron Ore Rake', between: 'GTS–TATA', status: 'On Time' },
    ],
  },
  {
    corridorId: 'C04',
    name: 'Bhubaneswar – Khurda Road',
    tracks: 'Triple Track · High Density Passenger Trunk',
    stations: [
      { code: 'CTC', name: 'Cuttack', km: 0, majorJunction: true },
      { code: 'BBS', name: 'Bhubaneswar', km: 28, majorJunction: true },
      { code: 'KUR', name: 'Khurda Road', km: 47, majorJunction: true },
      { code: 'PURI', name: 'Puri', km: 91, majorJunction: true },
    ],
    activeBlock: {
      blockId: 'REC-105',
      fromStation: 'BBS',
      toStation: 'KUR',
      dept: 'Traction',
      type: 'OHE Power Block',
      duration: '14:00–15:00 (60m)',
      utilization: 83.3,
    },
    trainsEnRoute: [
      { trainNo: '18409', name: 'Sri Jagannath Exp', between: 'CTC–BBS', status: 'On Time' },
    ],
  },
  {
    corridorId: 'C05',
    name: 'Santragachi – Uluberia Suburban',
    tracks: 'Quadruple Track · Suburban EMU Trunk',
    stations: [
      { code: 'SRC', name: 'Santragachi', km: 0, majorJunction: true },
      { code: 'ADL', name: 'Andul', km: 5 },
      { code: 'BVA', name: 'Bauria', km: 17 },
      { code: 'ULB', name: 'Uluberia', km: 25, majorJunction: true },
    ],
    trainsEnRoute: [
      { trainNo: '38012', name: 'Howrah Local EMU', between: 'SRC–ADL', status: 'On Time' },
    ],
  },
]

export function CorridorNetworkMap({
  selectedBlock,
  onSelectBlock,
}: {
  selectedBlock: RecommendedBlock
  onSelectBlock: (block: RecommendedBlock) => void
}) {
  const { recommendedBlocks } = useAppState()
  const [hoveredStation, setHoveredStation] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Map Header info */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="size-4 text-primary" />
          <span className="font-semibold text-foreground">
            Kharagpur Division Network Schematic
          </span>
          <span className="text-muted-foreground">· 5 Corridors · Live Section Occupancy</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
            Active AI Block
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Clear Section
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Train Occupancy
          </span>
        </div>
      </div>

      {/* Corridor Visual Tracks */}
      <div className="space-y-4">
        {corridorSchematics.map((corridor) => {
          const matchingBlock = recommendedBlocks.find((b) => b.corridorId === corridor.corridorId)
          const isCorridorActive = selectedBlock.corridorId === corridor.corridorId

          return (
            <div
              key={corridor.corridorId}
              className={cn(
                'rounded-xl border bg-card p-4 transition-all duration-200 shadow-xs',
                isCorridorActive
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/70 hover:border-border hover:bg-secondary/20',
              )}
            >
              {/* Corridor Top info */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                    {corridor.corridorId}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      {corridor.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{corridor.tracks}</p>
                  </div>
                </div>

                {corridor.activeBlock && matchingBlock && (
                  <button
                    onClick={() => onSelectBlock(matchingBlock)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold transition-all text-left',
                      selectedBlock.id === matchingBlock.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
                    )}
                  >
                    <Wrench className="size-3.5" />
                    <span>
                      {corridor.activeBlock.blockId}: {corridor.activeBlock.fromStation}–
                      {corridor.activeBlock.toStation}
                    </span>
                    <span className="font-mono text-xs opacity-80">
                      {corridor.activeBlock.duration}
                    </span>
                  </button>
                )}
              </div>

              {/* Schematic Track Line Diagram */}
              <div className="relative py-6 px-2 sm:px-6">
                {/* Track Line Background (Rails) */}
                <div className="relative h-2 w-full rounded-full bg-border/80">
                  {/* Active Block Highlight Zone on Track */}
                  {corridor.activeBlock && (
                    <div
                      className="absolute inset-y-0 rounded-full bg-primary/80 shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-pulse"
                      style={{
                        left: '15%',
                        width: '35%',
                      }}
                    />
                  )}
                </div>

                {/* Second rail line for double-track visual effect */}
                <div className="relative mt-1 h-0.5 w-full bg-border/50" />

                {/* Stations along the track */}
                <div className="relative -mt-4.5 flex items-center justify-between">
                  {corridor.stations.map((stn, idx) => (
                    <div
                      key={stn.code}
                      className="group relative flex flex-col items-center cursor-pointer"
                      onMouseEnter={() => setHoveredStation(`${corridor.corridorId}-${stn.code}`)}
                      onMouseLeave={() => setHoveredStation(null)}
                    >
                      {/* Station Node Marker */}
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-full border-2 bg-background transition-all duration-150',
                          stn.majorJunction
                            ? 'size-5.5 border-primary shadow-xs'
                            : 'size-4 border-muted-foreground/50 hover:border-primary',
                          (stn.code === corridor.activeBlock?.fromStation ||
                            stn.code === corridor.activeBlock?.toStation) &&
                            'border-primary bg-primary text-primary-foreground scale-110 shadow-sm ring-4 ring-primary/20',
                        )}
                      >
                        {stn.majorJunction && (
                          <div className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Station Label */}
                      <div className="mt-2 text-center">
                        <span
                          className={cn(
                            'block font-mono text-xs font-bold leading-none',
                            stn.majorJunction ? 'text-foreground' : 'text-muted-foreground',
                            (stn.code === corridor.activeBlock?.fromStation ||
                              stn.code === corridor.activeBlock?.toStation) &&
                              'text-primary font-extrabold',
                          )}
                        >
                          {stn.code}
                        </span>
                        <span className="hidden sm:block text-xs text-muted-foreground/70 truncate max-w-[65px] mt-0.5">
                          {stn.km} km
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Operations Context (Trains & Maintenance) */}
              <div className="mt-2 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Active trains in section */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Section Trains:
                  </span>
                  {corridor.trainsEnRoute.map((tr) => (
                    <span
                      key={tr.trainNo}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-xs"
                    >
                      <TrainFront className="size-3 text-amber-500" />
                      <span className="font-semibold text-foreground">{tr.trainNo}</span>
                      <span className="text-muted-foreground">{tr.between}</span>
                    </span>
                  ))}
                </div>

                {/* Block quick link */}
                {corridor.activeBlock && matchingBlock && (
                  <button
                    onClick={() => onSelectBlock(matchingBlock)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View {corridor.activeBlock.blockId} Rationale & Bundled Tasks →
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
