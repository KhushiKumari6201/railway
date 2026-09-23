'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Network,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Train,
  Wrench,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  ArrowUpRight,
  Info,
  Calendar,
  Zap,
  Users,
  GitBranch,
  Radio,
} from 'lucide-react'
import { api } from '@/lib/api'
import { corridors } from '@/lib/data/corridors'
import type {
  MaintenanceTask,
  NetworkCorridorNode,
  NetworkCoordinationResult,
  NetworkCoordinationScenario,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function NetworkCoordinationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-populate from query params if passed from Planner or What-If
  const qCorridor = searchParams.get('corridorId') || 'C01'
  const qSection = searchParams.get('section') || 'PKU–KGP'
  const qDate = searchParams.get('date') || '2026-09-24'
  const qStart = searchParams.get('start') || '10:00'
  const qEnd = searchParams.get('end') || '12:00'
  const qTaskIds = searchParams.get('taskIds') ? searchParams.get('taskIds')!.split(',').filter(Boolean) : []

  // Primary scenario state
  const [corridorId, setCorridorId] = useState(qCorridor)
  const [section, setSection] = useState(qSection)
  const [date, setDate] = useState(qDate)
  const [start, setStart] = useState(qStart)
  const [end, setEnd] = useState(qEnd)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(qTaskIds)

  // Data state
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [topology, setTopology] = useState<Record<string, NetworkCorridorNode>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NetworkCoordinationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'network' | 'resource' | 'dependency'>('all')

  // Multi-scenario comparison state
  const [compareScenarios, setCompareScenarios] = useState<NetworkCoordinationScenario[]>([
    { scenarioId: 'A', scenarioName: 'Morning Window', corridorId: 'C01', section: 'PKU–KGP', date: '2026-09-24', start: '10:00', end: '12:00' },
    { scenarioId: 'B', scenarioName: 'Afternoon Window', corridorId: 'C01', section: 'PKU–KGP', date: '2026-09-24', start: '14:00', end: '15:30' },
    { scenarioId: 'C', scenarioName: 'Tatanagar Cross-Link', corridorId: 'C03', section: 'KGP–GII', date: '2026-09-24', start: '10:00', end: '11:30' },
  ])
  const [compareResults, setCompareResults] = useState<NetworkCoordinationResult[]>([])
  const [compareLoading, setCompareLoading] = useState(false)

  // Available sections for current corridor
  const currentCorridorDef = corridors.find((c) => c.id === corridorId)
  const availableSections = currentCorridorDef ? currentCorridorDef.sections : []

  // Ensure selected section is valid
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(section)) {
      setSection(availableSections[0])
    }
  }, [corridorId, availableSections, section])

  // Initial data load: Topology & Tasks
  useEffect(() => {
    async function loadInitial() {
      try {
        const [topoRes, tasksRes] = await Promise.all([
          api.getNetworkTopology().catch(() => ({ success: false, topology: {} })),
          api.getTasks().catch(() => []),
        ])
        if (topoRes.topology) {
          setTopology(topoRes.topology)
        }
        setTasks(tasksRes)
      } catch (err: any) {
        console.error('Failed to load initial coordination data:', err)
      }
    }
    loadInitial()
  }, [])

  // Run Coordination Check
  const runCoordinationCheck = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.checkNetworkCoordination({
        corridorId,
        section,
        date,
        start,
        end,
        taskIds: selectedTaskIds,
      })
      setResult(res)
    } catch (err: any) {
      setError(err.message || 'Network coordination check failed')
    } finally {
      setLoading(false)
    }
  }, [corridorId, section, date, start, end, selectedTaskIds])

  // Automatically run once on mount
  useEffect(() => {
    runCoordinationCheck()
  }, [runCoordinationCheck])

  // Run multi-scenario comparison
  const runComparison = async () => {
    setCompareLoading(true)
    try {
      const res = await api.compareNetworkCoordination(compareScenarios)
      setCompareResults(res.comparisons || res.scenarios || [])
    } catch (err: any) {
      console.error('Comparison error:', err)
    } finally {
      setCompareLoading(false)
    }
  }

  // Filter tasks for the selected corridor
  const corridorTasks = tasks.filter((t) => t.corridorId === corridorId)

  const toggleTask = (tId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    )
  }

  // Helpers for formatting
  const getImpactBadgeColor = (impact?: string) => {
    switch (impact) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Operational Railway Intelligence</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">Phase 6 Network Coordination</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Network Coordination
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-Corridor Maintenance & Global Timetable Optimization Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/planner">
            <Button variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Return to Planner
            </Button>
          </Link>
          <Link
            href={`/what-if?corridorId=${corridorId}&start=${start}&end=${end}&date=${date}&taskIds=${selectedTaskIds.join(',')}`}
          >
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Open What-If
            </Button>
          </Link>
          <Link
            href={`/disruptions?corridorId=${corridorId}&start=${start}&end=${end}&date=${date}&incidentId=INC-001`}
          >
            <Button variant="outline" size="sm" className="gap-2 border-amber-800 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60">
              <Radio className="h-4 w-4" />
              Simulate Disruption
            </Button>
          </Link>
          <Link
            href={`/optimization?corridorId=${corridorId}&date=${date}&taskIds=${selectedTaskIds.join(',')}`}
          >
            <Button variant="outline" size="sm" className="gap-2 border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60">
              <Zap className="h-4 w-4" />
              Optimize Network Plan
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={runCoordinationCheck}
            disabled={loading}
            className="gap-2"
          >
            <Network className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Run Coordination Check
          </Button>
        </div>
      </div>

      {/* Simulation Disclaimer Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <span>SIMULATION MODE</span>
            <Badge variant="outline" className="text-[10px] py-0 border-primary/40 text-primary">
              READ-ONLY ENGINE
            </Badge>
          </div>
          <p>
            Network coordination results are calculated deterministically from the project&apos;s
            operational network model and timetable simulation data. They are decision-support
            estimates and do not represent live railway control information.
          </p>
        </div>
      </div>

      {/* Network Topology Schematic (Step 21) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Operational Network Model Schematic
              </CardTitle>
              <CardDescription className="text-xs">
                Logical interchange junctions (KGP, SRC, BBS) connecting Corridors C01 through C05
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Topology: 5 Corridors · 3 Junctions
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
            {/* Visual Schematic Diagram */}
            <div className="flex flex-col items-center gap-6">
              {/* Top Row: C02 */}
              <div className="flex justify-center">
                <div
                  onClick={() => setCorridorId('C02')}
                  className={`cursor-pointer px-4 py-2.5 rounded-lg border text-center transition-all ${
                    corridorId === 'C02'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : result?.affectedCorridors.some((c) => c.corridorId === 'C02')
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-medium'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xs font-bold">C02: Kharagpur–Bhubaneswar</div>
                  <div className="text-[10px] opacity-80">KGP–BLS · BLS–CTC · CTC–BBS</div>
                </div>
              </div>

              {/* Vertical connector line */}
              <div className="h-4 w-0.5 bg-border -my-4" />

              {/* Middle Row: C01 -- KGP Junction -- C03 */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 w-full max-w-2xl">
                {/* C01 Node */}
                <div
                  onClick={() => setCorridorId('C01')}
                  className={`cursor-pointer px-4 py-2.5 rounded-lg border text-center flex-1 transition-all ${
                    corridorId === 'C01'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : result?.affectedCorridors.some((c) => c.corridorId === 'C01')
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-medium'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xs font-bold">C01: Howrah–Kharagpur</div>
                  <div className="text-[10px] opacity-80">HWH–SRC · SRC–PKU · PKU–KGP</div>
                </div>

                {/* Horizontal Line */}
                <div className="h-0.5 w-6 bg-border" />

                {/* Central Interchange Junction */}
                <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold shadow-sm whitespace-nowrap">
                  KGP Junction
                </div>

                {/* Horizontal Line */}
                <div className="h-0.5 w-6 bg-border" />

                {/* C03 Node */}
                <div
                  onClick={() => setCorridorId('C03')}
                  className={`cursor-pointer px-4 py-2.5 rounded-lg border text-center flex-1 transition-all ${
                    corridorId === 'C03'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : result?.affectedCorridors.some((c) => c.corridorId === 'C03')
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-medium'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xs font-bold">C03: Kharagpur–Tatanagar</div>
                  <div className="text-[10px] opacity-80">KGP–GII · GII–TATA</div>
                </div>
              </div>

              {/* Vertical connector line */}
              <div className="h-4 w-0.5 bg-border -my-4" />

              {/* Bottom Row: C05 and C04 */}
              <div className="flex items-center justify-center gap-6">
                <div
                  onClick={() => setCorridorId('C05')}
                  className={`cursor-pointer px-4 py-2.5 rounded-lg border text-center transition-all ${
                    corridorId === 'C05'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : result?.affectedCorridors.some((c) => c.corridorId === 'C05')
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-medium'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xs font-bold">C05: Santragachi Freight</div>
                  <div className="text-[10px] opacity-80">SRC–ULT · ULT–KGP (Via SRC/KGP)</div>
                </div>

                <div
                  onClick={() => setCorridorId('C04')}
                  className={`cursor-pointer px-4 py-2.5 rounded-lg border text-center transition-all ${
                    corridorId === 'C04'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : result?.affectedCorridors.some((c) => c.corridorId === 'C04')
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-medium'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xs font-bold">C04: Bhubaneswar–Puri</div>
                  <div className="text-[10px] opacity-80">BBS–KUR · KUR–PURI (Via BBS)</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-border/40 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary inline-block" />
                <span>Primary Selected Corridor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                <span>Connected / Affected Network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-card border border-border inline-block" />
                <span>Isolated / Unaffected Corridors</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Inputs + Impact Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Primary Block Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Primary Block Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Hypothetical maintenance block parameters to evaluate across connected corridors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Corridor Selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Primary Corridor</label>
              <select
                value={corridorId}
                onChange={(e) => setCorridorId(e.target.value)}
                className="mt-1 w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="mt-1 w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Scheduled Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              />
            </div>

            {/* Start / End Times */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full text-xs rounded-md border border-input bg-background px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">End Time</label>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 w-full text-xs rounded-md border border-input bg-background px-3 py-2"
                />
              </div>
            </div>

            {/* Candidate Tasks */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Candidate Tasks ({selectedTaskIds.length} Selected)
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {corridorTasks.length} available
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
                {corridorTasks.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No open tasks found on corridor {corridorId}
                  </div>
                ) : (
                  corridorTasks.map((t) => {
                    const isSelected = selectedTaskIds.includes(t.id)
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTask(t.id)}
                        className={`text-xs p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                            : 'bg-background hover:bg-muted/40'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-mono text-[11px] font-semibold">{t.id}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {t.taskType} · {t.crew || 'Unassigned crew'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {t.estimatedDuration}m
                        </Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <Button
              className="w-full gap-2 text-xs"
              onClick={runCoordinationCheck}
              disabled={loading}
            >
              <Network className="h-4 w-4" />
              {loading ? 'Evaluating Network...' : 'Evaluate Network Impact'}
            </Button>
          </CardContent>
        </Card>

        {/* Right 2 Columns: Factual Network Impact Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Impact Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground">Affected Corridors</div>
                <div className="text-xl font-bold mt-1 text-primary">
                  {result?.impact?.affectedCorridorCount ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Connected via interchange
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground">Affected Trains</div>
                <div className="text-xl font-bold mt-1 text-amber-500">
                  {result?.impact?.affectedTrainCount ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Cross-corridor paths
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground">Simulated Delay</div>
                <div className="text-xl font-bold mt-1">
                  {result?.impact?.simulatedDelayMinutes ?? 0}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">min</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Deterministic timetable delay
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="text-[10px] font-medium text-muted-foreground">Network Utilization</div>
                <div className="text-xl font-bold mt-1 flex items-baseline gap-1">
                  <span>{result?.impact?.scenarioUtilization ?? 0}%</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({result?.impact?.utilizationDelta !== undefined && result.impact.utilizationDelta >= 0 ? '+' : ''}
                    {result?.impact?.utilizationDelta ?? 0}%)
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Baseline: {result?.impact?.baselineUtilization ?? 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Details: Connected Corridors & Safety Buffer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span>Connected Network Corridors</span>
                  <Badge variant="outline" className="text-[10px]">
                    {result?.connectedCorridors?.length ?? 0} Direct Connections
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2">
                {(!result?.connectedCorridors || result.connectedCorridors.length === 0) ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No connected corridors affected by this sectional window.
                  </div>
                ) : (
                  result.connectedCorridors.map((c) => (
                    <div
                      key={c.corridorId}
                      className="text-xs p-2 rounded bg-muted/30 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold">{c.corridorId}: {c.name}</span>
                        <div className="text-[10px] text-muted-foreground">
                          Junction: {c.interchangeJunction} · Border: {c.sharedBorderSection}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        +{c.transitTimeMin}m transit
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span>Safety Buffer & Impact Status</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getImpactBadgeColor(result?.operationalImpact)}`}
                  >
                    {result?.operationalImpact || 'NORMAL'} IMPACT
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/30 border border-border/50">
                  <span className="text-muted-foreground">20-Min Safety Buffer</span>
                  <Badge
                    variant={result?.safetyBufferStatus === 'PASS' ? 'default' : 'destructive'}
                    className="text-[10px]"
                  >
                    {result?.safetyBufferStatus || 'PASS'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/30 border border-border/50">
                  <span className="text-muted-foreground">Total Conflict Alerts</span>
                  <span className="font-semibold">
                    {result?.impact?.criticalConflicts ?? 0} Critical · {result?.impact?.warningConflicts ?? 0} Warning
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cross-Corridor Train Movements */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Train className="h-4 w-4 text-primary" />
                  Affected Timetable Train Paths ({result?.affectedTrains?.length ?? 0})
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">
                  Cross-corridor propagation evaluated
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {(!result?.affectedTrains || result.affectedTrains.length === 0) ? (
                <div className="text-xs text-muted-foreground py-3 text-center">
                  No train movements overlap with the proposed maintenance window.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-[10px] uppercase text-muted-foreground">
                        <th className="py-1.5 pr-2">Train</th>
                        <th className="py-1.5 pr-2">Type</th>
                        <th className="py-1.5 pr-2">Primary Section</th>
                        <th className="py-1.5 pr-2">Connected Path</th>
                        <th className="py-1.5 pr-2 text-right">Delay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {result.affectedTrains.map((t) => (
                        <tr key={t.trainNo} className="hover:bg-muted/20">
                          <td className="py-2 pr-2 font-mono font-medium">
                            {t.trainNo} - {t.trainName}
                          </td>
                          <td className="py-2 pr-2">
                            <Badge variant="outline" className="text-[10px]">
                              {t.trainType}
                            </Badge>
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">
                            {t.primaryCorridor} ({t.primarySection})
                          </td>
                          <td className="py-2 pr-2">
                            {t.connectedCorridor ? (
                              <span className="text-amber-500 font-medium text-[11px] flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {t.connectedCorridor} ({t.connectingSection})
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Local to {t.primaryCorridor}</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-right font-mono text-amber-500 font-medium">
                            +{t.overlapMinutes}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Conflicts & Constraint Coordination */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Network Conflicts & Resource Coordination
              </CardTitle>
              <CardDescription className="text-xs">
                Deterministic cross-corridor schedule overlaps, crew double-booking, and prerequisite dependencies
              </CardDescription>
            </div>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'all' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                All ({result?.allConflicts?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'network' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                Network ({result?.conflicts?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('resource')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'resource' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                Resources ({result?.resources?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('dependency')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'dependency' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
                }`}
              >
                Dependencies ({result?.dependencies?.length ?? 0})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const list =
              activeTab === 'network'
                ? result?.conflicts || []
                : activeTab === 'resource'
                ? result?.resources || []
                : activeTab === 'dependency'
                ? result?.dependencies || []
                : result?.allConflicts || []

            if (list.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                  <span>No active conflicts detected in this coordination category.</span>
                </div>
              )
            }

            return (
              <div className="space-y-3">
                {list.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      c.severity === 'Critical'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={c.severity === 'Critical' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {c.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {c.type}
                        </Badge>
                        <span className="font-semibold text-foreground">{c.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{c.description}</p>
                    {c.suggestedAction && (
                      <div className="text-[11px] text-primary bg-primary/5 p-2 rounded border border-primary/10 mt-1">
                        <span className="font-semibold">Recommended Action: </span>
                        {c.suggestedAction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Multi-Scenario Side-by-Side Comparison (Step 12) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Multi-Scenario Factual Comparison
              </CardTitle>
              <CardDescription className="text-xs">
                Side-by-side operational comparison without automated winner selection. Controller discretion applies.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runComparison}
              disabled={compareLoading}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${compareLoading ? 'animate-spin' : ''}`} />
              {compareLoading ? 'Evaluating Scenarios...' : 'Run Scenario Comparison'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {compareResults.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Click &quot;Run Scenario Comparison&quot; to evaluate Scenarios A, B, and C across the network.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Operational Metric</th>
                    {compareResults.map((scn, i) => (
                      <th key={i} className="py-2.5 px-3 font-semibold">
                        <div className="text-primary font-bold">
                          Scenario {String.fromCharCode(65 + i)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {scn.primaryCorridor?.corridorId} ({scn.primaryCorridor?.start}–{scn.primaryCorridor?.end})
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Primary Corridor</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3 font-mono">{s.primaryCorridor?.corridorId}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Section</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3 font-mono">{s.primaryCorridor?.section}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Affected Corridors</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3">{s.impact?.affectedCorridorCount ?? 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Affected Sections</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3">{s.affectedSections?.length ?? 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Affected Trains</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3">{s.impact?.affectedTrainCount ?? 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Critical Conflicts</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3 font-bold text-red-500">
                        {s.impact?.criticalConflicts ?? 0}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Warning Conflicts</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3 text-amber-500">
                        {s.impact?.warningConflicts ?? 0}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Simulated Delay</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3 font-mono">
                        {s.impact?.simulatedDelayMinutes ?? 0} min
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Simulated Utilization</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3">
                        {s.impact?.scenarioUtilization ?? 0}% ({s.impact?.utilizationDelta !== undefined && s.impact.utilizationDelta >= 0 ? '+' : ''}{s.impact?.utilizationDelta ?? 0}%)
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-muted-foreground">Safety Buffer Status</td>
                    {compareResults.map((s, i) => (
                      <td key={i} className="py-2 px-3">
                        <Badge
                          variant={s.safetyBufferStatus === 'PASS' ? 'outline' : 'destructive'}
                          className="text-[10px]"
                        >
                          {s.safetyBufferStatus || 'PASS'}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function NetworkCoordinationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Network className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading Network Coordination Module...</span>
          </div>
        </div>
      }
    >
      <NetworkCoordinationContent />
    </Suspense>
  )
}
