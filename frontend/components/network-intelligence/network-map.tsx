'use client'

import { useState, useEffect, useId, useMemo } from 'react'
import type {
  NetworkLayer,
  CorridorNetworkDetail,
  SectionEdge,
  StationNode,
  LiveTrain,
  StationSignal,
} from '@/lib/data/network-intelligence'
import {
  networkCorridors,
  liveTrainsData,
  stationSignalsData,
} from '@/lib/data/network-intelligence'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Zap,
  Radio,
  TrainFront,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Clock,
  ArrowRight,
  Sparkles,
  Gauge,
  CheckCircle2,
  X,
  Radar,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NetworkMapProps {
  selectedCorridorId: string
  onSelectCorridor: (corridorId: string) => void
  activeLayer: NetworkLayer
  simMinute?: number
  onSimMinuteChange?: (min: number) => void
}

interface HoverState {
  type: 'section' | 'station' | 'train' | 'signal'
  corridorId?: string
  section?: SectionEdge
  station?: StationNode
  train?: LiveTrain
  signal?: StationSignal
  x: number
  y: number
}

// Visual color encodings for each layer
function getSectionColor(section: SectionEdge, layer: NetworkLayer): string {
  if (layer === 'conflicts') {
    return section.hasConflict ? '#f43f5e' : '#334155'
  }
  if (layer === 'asset-health') {
    switch (section.assetHealth) {
      case 'Critical':
        return '#f43f5e'
      case 'Warning':
        return '#f59e0b'
      default:
        return '#10b981'
    }
  }
  if (layer === 'maintenance-demand') {
    switch (section.maintenanceDemand) {
      case 'High':
        return '#8b5cf6'
      case 'Medium':
        return '#3b82f6'
      default:
        return '#64748b'
    }
  }
  if (layer === 'block-capacity') {
    switch (section.blockCapacity) {
      case 'Available':
        return '#10b981'
      case 'Partially Used':
        return '#0284c7'
      default:
        return '#64748b'
    }
  }
  if (layer === 'train-density') {
    switch (section.trainDensity) {
      case 'High':
        return '#f97316'
      case 'Moderate':
        return '#eab308'
      default:
        return '#10b981'
    }
  }
  return '#3b82f6'
}

function formatMinuteToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function NetworkMap({
  selectedCorridorId,
  onSelectCorridor,
  activeLayer,
  simMinute: externalSimMinute,
  onSimMinuteChange,
}: NetworkMapProps) {
  const [internalMinute, setInternalMinute] = useState<number>(750) // 12:30 IST default
  const minute = externalSimMinute !== undefined ? externalSimMinute : internalMinute

  const setMinute = (m: number) => {
    setInternalMinute(m)
    onSimMinuteChange?.(m)
  }

  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 5>(1)
  const [showRadar, setShowRadar] = useState<boolean>(true)
  const [showTrains, setShowTrains] = useState<boolean>(true)
  const [showSignals, setShowSignals] = useState<boolean>(true)
  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<StationSignal | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [activeRiskModal, setActiveRiskModal] = useState<SectionEdge['riskInfo'] | null>(null)

  const gradientId = useId()
  const corridorsList = Object.values(networkCorridors)

  // Simulation timer loop
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setMinute((minute + 1 * playSpeed) % 1440)
    }, 450)
    return () => clearInterval(interval)
  }, [isPlaying, minute, playSpeed])

  // Is current time in the midday optimal block window (11:30–13:30 = 690m to 810m)
  const isOptimalBlockWindow = minute >= 690 && minute <= 810

  // Calculate live train positions along corridor routes based on simulation minute
  const computedTrains = useMemo(() => {
    return liveTrainsData.map((train) => {
      const corridor = networkCorridors[train.corridorId]
      if (!corridor || corridor.stations.length < 2) return null

      // Progress variation over time: 1 loop cycle = 120 minutes of simulation
      const timeOffset = (minute % 120) / 120
      let dynamicProgress = (train.progress + timeOffset) % 1.0
      if (train.direction === 'UP') {
        dynamicProgress = 1.0 - dynamicProgress
      }

      const stns = corridor.stations
      const totalSegments = stns.length - 1
      const segIndex = Math.min(totalSegments - 1, Math.floor(dynamicProgress * totalSegments))
      const segFraction = dynamicProgress * totalSegments - segIndex

      const stn1 = stns[segIndex]
      const stn2 = stns[segIndex + 1]

      const x1 = (stn1.x / 100) * 1000
      const y1 = (stn1.y / 100) * 560
      const x2 = (stn2.x / 100) * 1000
      const y2 = (stn2.y / 100) * 560

      const curX = x1 + segFraction * (x2 - x1)
      const curY = y1 + segFraction * (y2 - y1)

      const dx = x2 - x1
      const dy = y2 - y1
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)

      return {
        ...train,
        x: curX,
        y: curY,
        angle: train.direction === 'UP' ? angle + 180 : angle,
        currentSectionName: `${stn1.code}–${stn2.code}`,
      }
    }).filter(Boolean) as (LiveTrain & { x: number; y: number; angle: number; currentSectionName: string })[]
  }, [minute])

  return (
    <div className="relative flex flex-col rounded-xl border border-border/80 bg-card/75 shadow-xs overflow-hidden">
      {/* Top OCC Control Bar: Time, Speed, and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-secondary/25 px-4 py-2.5 text-xs">
        {/* Left: Division Badge & Time Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs">
            OCC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-foreground">
                Kharagpur Division Grid
              </span>
              <span className="rounded bg-primary/15 px-1.5 py-0.2 font-mono text-xs font-bold text-primary">
                17 SECTIONS
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>Time: <strong className="text-foreground">{formatMinuteToTime(minute)} IST</strong></span>
              <span>·</span>
              {isOptimalBlockWindow ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Optimal Maintenance Slot (11:30–13:30)
                </span>
              ) : (
                <span>Trunk Traffic Active</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & 24h Time Scrubber */}
        <div className="flex flex-1 items-center justify-center max-w-md gap-2 px-2">
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'flex size-7 items-center justify-center rounded-md border transition-all',
              isPlaying
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-foreground hover:bg-secondary',
            )}
            title={isPlaying ? 'Pause simulation' : 'Play live train motion'}
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
          </button>

          {/* Reset button */}
          <button
            onClick={() => {
              setIsPlaying(false)
              setMinute(750)
            }}
            className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Reset to 12:30 midday"
          >
            <RotateCcw className="size-3" />
          </button>

          {/* Speed selector */}
          <div className="flex rounded-md border border-border bg-background p-0.5 font-mono text-xs">
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaySpeed(spd)}
                className={cn(
                  'rounded px-1.5 py-0.5 font-bold transition-all',
                  playSpeed === spd
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* 24-Hour Slider */}
          <div className="flex-1 flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">06h</span>
            <input
              type="range"
              min="0"
              max="1439"
              step="5"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
            <span className="font-mono text-xs text-muted-foreground">22h</span>
          </div>
        </div>

        {/* Right: View Layers Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTrains(!showTrains)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all',
              showTrains
                ? 'border-primary/40 bg-primary/10 text-primary font-bold'
                : 'border-border bg-background text-muted-foreground',
            )}
          >
            <TrainFront className="size-3" />
            <span>Trains ({computedTrains.length})</span>
          </button>

          <button
            onClick={() => setShowSignals(!showSignals)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all',
              showSignals
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold'
                : 'border-border bg-background text-muted-foreground',
            )}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Signals</span>
          </button>

          <button
            onClick={() => setShowRadar(!showRadar)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-all',
              showRadar
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-bold'
                : 'border-border bg-background text-muted-foreground',
            )}
            title="Toggle OCC Radar Scanner line"
          >
            <Radar className="size-3" />
            <span>Radar</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas for Railway Topology */}
      <div className="relative aspect-[16/9] w-full min-h-[420px] max-h-[560px] select-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Optional Radar Scanline */}
        {showRadar && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="radar-sweep-line absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent border-r border-cyan-500/30" />
          </div>
        )}

        <svg
          viewBox="0 0 1000 560"
          className="size-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft railway glow filter */}
            <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pulsing train glow */}
            <filter id={`${gradientId}-train-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pattern for railway sleepers (ties) */}
            <pattern
              id={`${gradientId}-ties`}
              width="10"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(90)"
            >
              <line x1="0" y1="4" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" className="text-border/60" />
            </pattern>

            {/* Pattern for Active Maintenance Block Hazard */}
            <pattern
              id={`${gradientId}-hazard`}
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="16" stroke="#f43f5e" strokeWidth="6" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background Grid Coordinates & Crosshairs */}
          <g className="text-border/20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6">
            <line x1="100" y1="0" x2="100" y2="560" />
            <line x1="300" y1="0" x2="300" y2="560" />
            <line x1="500" y1="0" x2="500" y2="560" />
            <line x1="700" y1="0" x2="700" y2="560" />
            <line x1="900" y1="0" x2="900" y2="560" />
            <line x1="0" y1="120" x2="1000" y2="120" />
            <line x1="0" y1="280" x2="1000" y2="280" />
            <line x1="0" y1="440" x2="1000" y2="440" />
          </g>

          {/* Division Boundary Compass / Coordinates Watermark */}
          <text
            x="30"
            y="535"
            fill="currentColor"
            className="text-muted-foreground/30 font-mono text-xs select-none"
          >
            SER KHARAGPUR DIVISION · TOPOLOGICAL DISPATCH SCHEMATIC · 22°20&apos;N 87°19&apos;E
          </text>

          {/* Render Sections (Edges) as Railway Track Double-Lines */}
          {corridorsList.map((corridor) => {
            const isCorridorSelected = corridor.id === selectedCorridorId
            const stnMap = new Map(corridor.stations.map((s) => [s.code, s]))

            return (
              <g
                key={`group-${corridor.id}`}
                className={cn(
                  'cursor-pointer transition-opacity duration-200',
                  selectedCorridorId && !isCorridorSelected ? 'opacity-35 hover:opacity-75' : 'opacity-100',
                )}
                onClick={() => onSelectCorridor(corridor.id)}
              >
                {corridor.sections.map((sec) => {
                  const from = stnMap.get(sec.fromCode)
                  const to = stnMap.get(sec.toCode)
                  if (!from || !to) return null

                  const x1 = (from.x / 100) * 1000
                  const y1 = (from.y / 100) * 560
                  const x2 = (to.x / 100) * 1000
                  const y2 = (to.y / 100) * 560

                  const strokeColor = getSectionColor(sec, activeLayer)
                  const isSectionConflict = activeLayer === 'conflicts' && sec.hasConflict
                  const isSectionActiveBlock = sec.hasActiveBlock && isOptimalBlockWindow

                  return (
                    <g
                      key={sec.id}
                      className="group"
                      onMouseEnter={(e) => {
                        setHover({
                          type: 'section',
                          corridorId: corridor.id,
                          section: sec,
                          x: (x1 + x2) / 2,
                          y: (y1 + y2) / 2,
                        })
                      }}
                      onMouseLeave={() => setHover(null)}
                    >
                      {/* Broad invisible hit area */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="transparent"
                        strokeWidth="32"
                        className="cursor-pointer"
                      />

                      {/* Outer Ballast Bed Line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isCorridorSelected ? 'var(--color-primary)' : 'currentColor'}
                        strokeWidth={isCorridorSelected ? '10' : '6'}
                        strokeOpacity={isCorridorSelected ? 0.35 : 0.15}
                        strokeLinecap="round"
                        className="text-border"
                      />

                      {/* Main Track Bed Line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth={isCorridorSelected ? '4.5' : '3.5'}
                        strokeLinecap="round"
                        strokeDasharray={sec.hasActiveBlock ? '8 4' : undefined}
                        className={cn(
                          'transition-all duration-300',
                          isSectionConflict && 'animate-pulse',
                        )}
                        filter={isCorridorSelected || isSectionActiveBlock ? `url(#${gradientId}-glow)` : undefined}
                      />

                      {/* Live Dynamic Maintenance Block Hazard Zone Overlay (Active between 11:30–13:30) */}
                      {isSectionActiveBlock && (
                        <g>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={`url(#${gradientId}-hazard)`}
                            strokeWidth="18"
                            strokeLinecap="round"
                            className="animate-pulse"
                          />
                          {/* Pulsing work tag at midpoint */}
                          <g transform={`translate(${(x1 + x2) / 2 - 60}, ${(y1 + y2) / 2 - 24})`}>
                            <rect
                              width="120"
                              height="20"
                              rx="4"
                              fill="#f43f5e"
                              fillOpacity="0.9"
                              stroke="#ffffff"
                              strokeWidth="1"
                              filter={`url(#${gradientId}-glow)`}
                            />
                            <text
                              x="60"
                              y="14"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              ⚡ ACTIVE BLOCK (OHE)
                            </text>
                          </g>
                        </g>
                      )}

                      {/* Risk Indicator Marker (▲ !) if section has critical asset defect */}
                      {sec.hasRisk && sec.riskInfo && (
                        <g
                          transform={`translate(${(x1 * 0.4 + x2 * 0.6) - 9}, ${(y1 * 0.4 + y2 * 0.6) - 9})`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveRiskModal(sec.riskInfo)
                          }}
                        >
                          <rect
                            width="18"
                            height="18"
                            rx="4"
                            fill="#f43f5e"
                            className="shadow-sm animate-bounce"
                          />
                          <text
                            x="9"
                            y="13"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            !
                          </text>
                        </g>
                      )}

                      {/* Conflict Alert Badge on Track */}
                      {sec.hasConflict && activeLayer === 'conflicts' && (
                        <g
                          transform={`translate(${(x1 + x2) / 2 - 10}, ${(y1 + y2) / 2 - 10})`}
                          className="animate-pulse"
                        >
                          <circle cx="10" cy="10" r="12" fill="#f43f5e" fillOpacity="0.3" />
                          <rect width="20" height="20" rx="5" fill="#f43f5e" />
                          <text
                            x="10"
                            y="14"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            CF
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* Corridor Identifier Tag */}
                {corridor.stations[0] && (
                  <g
                    transform={`translate(${(corridor.stations[0].x / 100) * 1000 - 45}, ${(corridor.stations[0].y / 100) * 560 - 18})`}
                  >
                    <rect
                      width="36"
                      height="18"
                      rx="4"
                      fill={isCorridorSelected ? 'var(--color-primary)' : 'var(--color-secondary)'}
                      stroke="var(--color-border)"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y="13"
                      textAnchor="middle"
                      fill={isCorridorSelected ? '#ffffff' : 'var(--color-foreground)'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {corridor.id}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Render Station Junction Throat Signals */}
          {showSignals &&
            stationSignalsData.map((sig) => {
              // Find matching station coordinates
              let matchedStn: StationNode | undefined
              for (const c of corridorsList) {
                matchedStn = c.stations.find((s) => s.code === sig.stationCode)
                if (matchedStn) break
              }
              if (!matchedStn) return null

              const sx = (matchedStn.x / 100) * 1000
              const sy = (matchedStn.y / 100) * 560

              // Signal aspect color - turns red if active block window at KGP/PKU
              const isRedDuringBlock = isOptimalBlockWindow && (sig.stationCode === 'PKU' || sig.stationCode === 'KGP')
              const aspect = isRedDuringBlock ? 'red' : sig.aspect

              const aspectColor =
                aspect === 'green'
                  ? '#10b981'
                  : aspect === 'double-yellow'
                  ? '#eab308'
                  : aspect === 'yellow'
                  ? '#f59e0b'
                  : '#f43f5e'

              return (
                <g
                  key={`sig-${sig.stationCode}`}
                  transform={`translate(${sx + 14}, ${sy - 16})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSignal(sig)
                  }}
                  onMouseEnter={() => {
                    setHover({
                      type: 'signal',
                      signal: sig,
                      x: sx + 14,
                      y: sy - 16,
                    })
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Signal Mast Post */}
                  <line x1="6" y1="12" x2="6" y2="24" stroke="#64748b" strokeWidth="2" />
                  <rect x="0" y="0" width="12" height="14" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  {/* Aspect Lamp with Pulse */}
                  <circle
                    cx="6"
                    cy="7"
                    r="4"
                    fill={aspectColor}
                    filter={aspect !== 'green' ? `url(#${gradientId}-glow)` : undefined}
                    className={cn(aspect === 'red' && 'animate-pulse')}
                  />
                </g>
              )
            })}

          {/* Render Station Nodes (Junctions and Halts) */}
          {corridorsList.map((corridor) => {
            const isCorridorSelected = corridor.id === selectedCorridorId
            return (
              <g key={`nodes-${corridor.id}`}>
                {corridor.stations.map((stn) => {
                  const cx = (stn.x / 100) * 1000
                  const cy = (stn.y / 100) * 560
                  const isHovered = hover?.station?.code === stn.code

                  return (
                    <g
                      key={`${corridor.id}-${stn.code}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCorridor(corridor.id)
                      }}
                      onMouseEnter={() => {
                        setHover({
                          type: 'station',
                          corridorId: corridor.id,
                          station: stn,
                          x: cx,
                          y: cy,
                        })
                      }}
                      onMouseLeave={() => setHover(null)}
                    >
                      {/* Outer pulse ring on major junctions */}
                      {stn.majorJunction && isCorridorSelected && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="14"
                          fill="var(--color-primary)"
                          fillOpacity="0.15"
                          className="animate-ping"
                        />
                      )}

                      {/* Station Outer Ring */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={stn.majorJunction ? 8.5 : 5.5}
                        fill="var(--color-background)"
                        stroke={isCorridorSelected ? 'var(--color-primary)' : 'var(--color-border)'}
                        strokeWidth={stn.majorJunction ? 3 : 2}
                        className={cn(
                          'transition-all duration-150',
                          isHovered && 'scale-125 stroke-primary',
                        )}
                      />

                      {/* Station Center Core */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={stn.majorJunction ? 4 : 2.5}
                        fill={isCorridorSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                      />

                      {/* Station Code Label */}
                      <text
                        x={cx}
                        y={cy + (stn.y > 60 ? -14 : 20)}
                        textAnchor="middle"
                        fill="var(--color-foreground)"
                        fontSize={stn.majorJunction ? '11' : '9.5'}
                        fontWeight={stn.majorJunction ? 'bold' : '500'}
                        fontFamily="monospace"
                        className="pointer-events-none drop-shadow-xs"
                      >
                        {stn.code}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Render Live Moving Trains along Corridors */}
          {showTrains &&
            computedTrains.map((train) => {
              const isSuperfast = train.type === 'Superfast'
              const isExpress = train.type === 'Express'
              const isFreight = train.type === 'Freight'

              const trainColor = isSuperfast
                ? '#06b6d4' // cyan-500
                : isExpress
                ? '#8b5cf6' // violet-500
                : isFreight
                ? '#f59e0b' // amber-500
                : '#10b981' // emerald-500

              const isSelected = selectedTrain?.id === train.id

              return (
                <g
                  key={train.id}
                  transform={`translate(${train.x}, ${train.y})`}
                  className="cursor-pointer transition-transform duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTrain(train)
                  }}
                  onMouseEnter={() => {
                    setHover({
                      type: 'train',
                      train,
                      x: train.x,
                      y: train.y,
                    })
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Outer beacon pulse */}
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill={trainColor}
                    fillOpacity="0.25"
                    className="animate-ping"
                  />

                  {/* Directional Locomotive Head */}
                  <g transform={`rotate(${train.angle})`}>
                    <path
                      d="M -7 -6 L 8 0 L -7 6 Z"
                      fill={trainColor}
                      stroke="#ffffff"
                      strokeWidth="1"
                      filter={`url(#${gradientId}-train-glow)`}
                    />
                  </g>

                  {/* Core Train Token Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? '6.5' : '5'}
                    fill="#0f172a"
                    stroke={trainColor}
                    strokeWidth={isSelected ? '2.5' : '2'}
                  />

                  {/* Compact Train ID Tag Badge */}
                  <g transform="translate(10, -10)">
                    <rect
                      x="0"
                      y="0"
                      width="52"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      fillOpacity="0.9"
                      stroke={trainColor}
                      strokeWidth="1"
                    />
                    <text
                      x="26"
                      y="11"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {train.number}
                    </text>
                  </g>
                </g>
              )
            })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hover && (
          <div
            className="pointer-events-none absolute z-30 min-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border/90 bg-background/95 p-2.5 shadow-xl backdrop-blur-md"
            style={{
              left: `${Math.min(90, Math.max(10, (hover.x / 1000) * 100))}%`,
              top: `${Math.max(12, (hover.y / 560) * 100 - 5)}%`,
            }}
          >
            {/* Hover Section */}
            {hover.type === 'section' && hover.section && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <span className="font-mono font-bold text-foreground">
                    Section {hover.section.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {hover.corridorId}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-xs">
                  <span className="text-muted-foreground">Health:</span>
                  <span className="font-semibold text-foreground text-right">{hover.section.assetHealth}</span>
                  <span className="text-muted-foreground">Demand:</span>
                  <span className="font-semibold text-foreground text-right">{hover.section.maintenanceDemand}</span>
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-semibold text-foreground text-right">{hover.section.blockCapacity}</span>
                  <span className="text-muted-foreground">Train Density:</span>
                  <span className="font-semibold text-foreground text-right">{hover.section.trainDensity}</span>
                </div>
                {hover.section.hasActiveBlock && (
                  <div className="mt-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                    AI Block Window: {hover.section.activeBlockId} ({hover.section.activeBlockWindow})
                  </div>
                )}
                {hover.section.hasConflict && (
                  <div className="mt-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-xs text-rose-500">
                    Conflict: {hover.section.conflictSummary}
                  </div>
                )}
              </div>
            )}

            {/* Hover Train */}
            {hover.type === 'train' && hover.train && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <span className="font-mono font-bold text-foreground">
                    {hover.train.number} {hover.train.name}
                  </span>
                  <span className="rounded bg-primary/15 px-1 py-0.2 font-mono text-xs font-bold text-primary">
                    {hover.train.type}
                  </span>
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Speed:</span>
                    <span className="font-mono font-bold text-emerald-500">{hover.train.speedKmh} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section:</span>
                    <span className="font-mono text-foreground">{hover.train.currentSection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-semibold text-foreground">{hover.train.status}</span>
                  </div>
                </div>
                <p className="text-xs text-primary font-medium pt-0.5">Click for OCC telemetry</p>
              </div>
            )}

            {/* Hover Signal */}
            {hover.type === 'signal' && hover.signal && (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <span className="font-bold text-foreground">{hover.signal.name}</span>
                  <span className="capitalize font-bold text-emerald-500">{hover.signal.aspect} Aspect</span>
                </div>
                <p className="text-xs text-muted-foreground">{hover.signal.route}</p>
                <div className="text-xs text-muted-foreground">
                  Interlocking: <strong className="text-foreground">{hover.signal.interlocking}</strong>
                </div>
              </div>
            )}

            {/* Hover Station */}
            {hover.type === 'station' && hover.station && (
              <div className="space-y-1 text-xs">
                <div className="font-bold text-foreground">
                  {hover.station.name} ({hover.station.code})
                </div>
                <div className="text-xs text-muted-foreground">
                  Chainage: <span className="font-mono font-medium">{hover.station.km} km</span>
                  {hover.station.majorJunction && ' · Major Division Junction'}
                </div>
                <p className="text-xs text-primary">Click to focus corridor</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Train Telemetry HUD Card */}
        {selectedTrain && (
          <div className="absolute bottom-3 left-3 right-3 z-40 max-w-md rounded-xl border border-primary/40 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <TrainFront className="size-4" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-foreground">
                    {selectedTrain.number} {selectedTrain.name}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedTrain.type} · {selectedTrain.fromStation} → {selectedTrain.toStation} ({selectedTrain.direction})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="rounded border border-border/60 bg-secondary/30 p-1.5">
                <span className="text-xs uppercase text-muted-foreground">Speed</span>
                <p className="font-bold text-foreground text-sm">{selectedTrain.speedKmh} km/h</p>
                <span className="text-xs text-muted-foreground">Max {selectedTrain.maxSpeedKmh}</span>
              </div>
              <div className="rounded border border-border/60 bg-secondary/30 p-1.5">
                <span className="text-xs uppercase text-muted-foreground">Traction</span>
                <p className="font-bold text-foreground truncate text-xs">{selectedTrain.traction.split(' ')[0]}</p>
                <span className="text-xs text-muted-foreground">{selectedTrain.wagonsOrCoaches} units</span>
              </div>
              <div className="rounded border border-border/60 bg-secondary/30 p-1.5">
                <span className="text-xs uppercase text-muted-foreground">Priority</span>
                <p className="font-bold text-primary text-sm">{selectedTrain.priority}</p>
                <span className="text-xs text-emerald-500">{selectedTrain.status}</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground italic border-t border-border/40 pt-1.5">
              &ldquo;{selectedTrain.statusNote}&rdquo;
            </p>
          </div>
        )}

        {/* Selected Signal Modal Drawer */}
        {selectedSignal && (
          <div className="absolute top-3 right-3 z-40 max-w-sm rounded-xl border border-emerald-500/40 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between border-b border-border/50 pb-2">
              <div>
                <h4 className="font-mono text-xs font-bold text-foreground">
                  {selectedSignal.name} ({selectedSignal.stationCode})
                </h4>
                <p className="text-xs text-muted-foreground">Junction Interlocking Telemetry</p>
              </div>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-muted-foreground">Current Aspect:</span>
                <span className="font-bold capitalize text-emerald-500">{selectedSignal.aspect}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-muted-foreground">Interlocking:</span>
                <span className="font-semibold text-foreground">{selectedSignal.interlocking}</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-muted-foreground">Track Circuit:</span>
                <span className="font-semibold text-foreground">{selectedSignal.trackOccupancy}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                Route: <strong>{selectedSignal.route}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Asset Risk Alert Drawer */}
      {activeRiskModal && (
        <div className="border-t border-rose-500/40 bg-rose-500/10 p-3 text-xs text-foreground">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-500">
              <ShieldAlert className="size-4" />
              <span>Asset Risk Alert: {activeRiskModal.assetId} ({activeRiskModal.assetType})</span>
            </div>
            <button
              onClick={() => setActiveRiskModal(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              ✕ Close
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            <span>Criticality: <strong className="text-rose-500">{activeRiskModal.criticality}</strong></span>
            <span>Overdue: <strong className="text-foreground">{activeRiskModal.overdueDays} days</strong></span>
            <span>Recommended Action: <strong className="text-foreground">{activeRiskModal.action}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
