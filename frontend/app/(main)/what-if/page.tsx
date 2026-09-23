'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  SlidersHorizontal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Train,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Network,
  Radio,
} from 'lucide-react'
import { api } from '@/lib/api'
import { corridors, corridorName } from '@/lib/data/corridors'
import type {
  MaintenanceTask,
  WhatIfScenario,
  WhatIfSimulationResult,
  TrainDelayAdjustment,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Preset windows for quick scenario testing
const PRESET_WINDOWS = [
  { label: 'Morning Slot (10:00 – 12:00)', start: '10:00', end: '12:00', duration: 120 },
  { label: 'Midday Slot (14:00 – 15:30)', start: '14:00', end: '15:30', duration: 90 },
  { label: 'Evening Slot (16:00 – 18:00)', start: '16:00', end: '18:00', duration: 120 },
  { label: 'Night Window (01:00 – 03:00)', start: '01:00', end: '03:00', duration: 120 },
]

// Available delay options for timetable train simulation
const DELAY_OPTIONS = [0, 5, 10, 15, 30, 60]

function WhatIfContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Query params from Planner if passed
  const qCorridor = searchParams.get('corridorId') || 'C01'
  const qStart = searchParams.get('start') || '10:00'
  const qEnd = searchParams.get('end') || '12:00'
  const qDate = searchParams.get('date') || '2026-09-24'
  const qTasks = searchParams.get('taskIds') ? searchParams.get('taskIds')!.split(',') : []

  // All tasks from MongoDB
  const [allTasks, setAllTasks] = useState<MaintenanceTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  // Baseline scenario state
  const [baseline, setBaseline] = useState<WhatIfScenario>({
    scenarioName: 'Baseline Plan',
    corridorId: qCorridor,
    section: 'HWH–SRC',
    date: qDate,
    start: qStart,
    end: qEnd,
    durationMin: 120,
    taskIds: qTasks,
    trainDelayAdjustments: [],
  })

  // Current active editable scenario
  const [currentScenario, setCurrentScenario] = useState<WhatIfScenario>({
    scenarioName: 'Scenario A (Alternative)',
    corridorId: qCorridor,
    section: 'HWH–SRC',
    date: qDate,
    start: qStart === '10:00' ? '14:00' : '10:00',
    end: qStart === '10:00' ? '15:30' : '12:00',
    durationMin: 90,
    taskIds: qTasks,
    trainDelayAdjustments: [],
  })

  // Simulation Results
  const [baselineResult, setBaselineResult] = useState<WhatIfSimulationResult | null>(null)
  const [currentResult, setCurrentResult] = useState<WhatIfSimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)

  // Comparison List (Multiple Scenarios)
  const [savedScenarios, setSavedScenarios] = useState<WhatIfSimulationResult[]>([])

  // Train delay selector state
  const [selectedTrainNo, setSelectedTrainNo] = useState('12841')
  const [selectedDelayMin, setSelectedDelayMin] = useState(15)

  // Load Tasks from MongoDB
  useEffect(() => {
    async function loadTasks() {
      try {
        setLoadingTasks(true)
        const tasks = await api.getTasks()
        setAllTasks(tasks)
      } catch (err) {
        console.error('Failed to load tasks for What-If sandbox:', err)
      } finally {
        setLoadingTasks(false)
      }
    }
    loadTasks()
  }, [])

  // Filter tasks for current corridor
  const corridorTasks = useMemo(() => {
    return allTasks.filter((t) => t.corridorId === currentScenario.corridorId)
  }, [allTasks, currentScenario.corridorId])

  // Run Baseline simulation on initial mount
  useEffect(() => {
    async function runBaseline() {
      try {
        const res = await api.simulateWhatIf(baseline)
        setBaselineResult(res)
      } catch (err: any) {
        console.error('Baseline simulation failed:', err)
      }
    }
    runBaseline()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Run simulation on current active scenario
  const runCurrentSimulation = useCallback(async () => {
    try {
      setIsSimulating(true)
      setSimError(null)

      // Calculate durationMin from start/end
      const [sh, sm] = currentScenario.start.split(':').map(Number)
      const [eh, em] = currentScenario.end.split(':').map(Number)
      let diff = (eh * 60 + em) - (sh * 60 + sm)
      if (diff < 0) diff += 24 * 60

      const payload = {
        ...currentScenario,
        durationMin: diff > 0 ? diff : 60,
      }

      const res = await api.simulateWhatIf(payload)
      setCurrentResult(res)
    } catch (err: any) {
      console.error('What-If simulation failed:', err)
      setSimError(err.message || 'Simulation execution failed.')
    } finally {
      setIsSimulating(false)
    }
  }, [currentScenario])

  // Trigger initial simulation for current scenario once baseline loads
  useEffect(() => {
    runCurrentSimulation()
  }, [runCurrentSimulation])

  // Toggle task selection in current scenario
  const handleToggleTask = (taskId: string) => {
    setCurrentScenario((prev) => {
      const exists = prev.taskIds.includes(taskId)
      return {
        ...prev,
        taskIds: exists ? prev.taskIds.filter((id) => id !== taskId) : [...prev.taskIds, taskId],
      }
    })
  }

  // Add train delay adjustment
  const handleAddTrainDelay = () => {
    if (!selectedTrainNo || selectedDelayMin <= 0) return
    setCurrentScenario((prev) => {
      const existing = prev.trainDelayAdjustments || []
      const filtered = existing.filter((a) => a.trainNumber !== selectedTrainNo)
      return {
        ...prev,
        trainDelayAdjustments: [
          ...filtered,
          { trainNumber: selectedTrainNo, delayMinutes: selectedDelayMin },
        ],
      }
    })
  }

  // Remove train delay adjustment
  const handleRemoveTrainDelay = (trainNo: string) => {
    setCurrentScenario((prev) => ({
      ...prev,
      trainDelayAdjustments: (prev.trainDelayAdjustments || []).filter(
        (a) => a.trainNumber !== trainNo
      ),
    }))
  }

  // Save current scenario to comparison list
  const handleSaveToComparison = () => {
    if (!currentResult) return
    const name = `Scenario ${String.fromCharCode(65 + savedScenarios.length)} (${currentScenario.start}–${currentScenario.end})`
    const withName = {
      ...currentResult,
      scenario: { ...currentResult.scenario, scenarioName: name },
    }
    setSavedScenarios((prev) => [...prev, withName])
  }

  // Apply scenario back to Planner UI
  const handleApplyToPlanner = () => {
    const params = new URLSearchParams({
      corridorId: currentScenario.corridorId,
      start: currentScenario.start,
      end: currentScenario.end,
      date: currentScenario.date,
      taskIds: currentScenario.taskIds.join(','),
      appliedFromWhatIf: 'true',
    })
    router.push(`/planner?${params.toString()}`)
  }

  // Status Badge Helper
  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'CRITICAL':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">CRITICAL</Badge>
      case 'HIGH':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">HIGH</Badge>
      case 'MEDIUM':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">MEDIUM</Badge>
      case 'LOW':
      default:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">LOW</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto text-slate-900">
      {/* ======================================================== */}
      {/* 1. HEADER & DISCLAIMER BANNER                            */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Operational Railway Intelligence</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-indigo-700 font-semibold">What-If Simulation Sandbox</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                What-If Scenario Simulation & Decision Support
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Railway Controller Sandbox — Test alternative maintenance windows & train delays in-memory before approval
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/planner">
            <Button variant="outline" size="sm" className="border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 gap-1.5 shadow-xs">
              ← Return to Planner
            </Button>
          </Link>
          <Link
            href={`/network-coordination?corridorId=${currentScenario.corridorId}&start=${currentScenario.start}&end=${currentScenario.end}&date=${currentScenario.date}&taskIds=${currentScenario.taskIds.join(',')}`}
          >
            <Button size="sm" variant="outline" className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs gap-1.5 shadow-xs">
              <Network className="w-3.5 h-3.5 text-blue-600" />
              Check Network Impact
            </Button>
          </Link>
          <Link
            href={`/disruptions?corridorId=${currentScenario.corridorId}&start=${currentScenario.start}&end=${currentScenario.end}&date=${currentScenario.date}&incidentId=INC-001`}
          >
            <Button size="sm" variant="outline" className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs gap-1.5 shadow-xs">
              <Radio className="w-3.5 h-3.5 text-amber-600" />
              Simulate Disruption
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent Mandatory Simulation Disclaimer */}
      <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="bg-white text-indigo-800 border-indigo-300 font-mono text-[11px] px-2.5 py-0.5 font-semibold shadow-xs">
            SIMULATION MODE
          </Badge>
          <span className="text-slate-700">
            Results are decision-support estimates calculated from timetable simulation data and maintenance records. Simulation is read-only and does not modify MongoDB production state.
          </span>
        </div>
        <span className="text-[11px] text-indigo-800 font-mono font-medium flex-shrink-0">
          ✓ Read-Only Engine
        </span>
      </div>

      {/* Error Banner */}
      {simError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{simError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BASELINE PLAN CARD                                    */}
      {/* ======================================================== */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Baseline Reference Plan
              </CardTitle>
            </div>
            {baselineResult && getImpactBadge(baselineResult.impact.operationalImpact)}
          </div>
          <CardDescription className="text-xs text-slate-500">
            Corridor: <span className="text-slate-800 font-mono font-semibold">{corridorName(baseline.corridorId)} ({baseline.corridorId})</span> | Date: <span className="text-slate-800 font-mono font-semibold">{baseline.date}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Window</span>
            <span className="text-slate-900 font-bold">{baseline.start} – {baseline.end}</span>
            <span className="text-slate-500 block text-[10px]">({baseline.durationMin} min)</span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Selected Tasks</span>
            <span className="text-slate-900 font-bold">{baseline.taskIds.length} tasks</span>
            <span className="text-slate-500 block text-[10px]">
              {baselineResult?.impact.totalTaskWorkMin ?? 0}m work
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Critical Conflicts</span>
            <span className={`font-bold ${baselineResult?.impact.criticalConflicts ? 'text-rose-600' : 'text-slate-700'}`}>
              {baselineResult?.impact.criticalConflicts ?? 0}
            </span>
            <span className="text-slate-500 block text-[10px]">Blocking</span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Warning Alerts</span>
            <span className={`font-bold ${baselineResult?.impact.warningConflicts ? 'text-amber-600' : 'text-slate-700'}`}>
              {baselineResult?.impact.warningConflicts ?? 0}
            </span>
            <span className="text-slate-500 block text-[10px]">Advisories</span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Affected Trains</span>
            <span className="text-slate-900 font-bold">
              {baselineResult?.impact.affectedTrains ?? 0}
            </span>
            <span className="text-slate-500 block text-[10px]">Paths crossed</span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Safety Buffer</span>
            <span className={`font-bold ${baselineResult?.impact.safetyBufferStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {baselineResult?.impact.safetyBufferStatus ?? 'PASS'}
            </span>
            <span className="text-slate-500 block text-[10px]">20m margin</span>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* 3. SCENARIO SIMULATION SANDBOX                           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parameter Sandbox Controls (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3.5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-slate-900 flex items-center gap-2 font-bold">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    Configure Hypothetical Scenario
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Adjust block window, task composition, or simulate train delays. Changes are in-memory only.
                  </CardDescription>
                </div>
                <Button
                  onClick={runCurrentSimulation}
                  disabled={isSimulating}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
                >
                  <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-5">
              {/* Window & Corridor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Corridor</label>
                  <select
                    value={currentScenario.corridorId}
                    onChange={(e) => {
                      const cId = e.target.value
                      const corr = corridors.find((c) => c.id === cId)
                      setCurrentScenario((prev) => ({
                        ...prev,
                        corridorId: cId,
                        section: corr?.sections[0] || 'Main Line',
                        taskIds: [],
                      }))
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {corridors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Window Start (HH:MM)</label>
                  <input
                    type="time"
                    value={currentScenario.start}
                    onChange={(e) => setCurrentScenario((prev) => ({ ...prev, start: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Window End (HH:MM)</label>
                  <input
                    type="time"
                    value={currentScenario.end}
                    onChange={(e) => setCurrentScenario((prev) => ({ ...prev, end: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Window Presets */}
              <div>
                <label className="text-slate-600 text-xs font-semibold block mb-1.5">
                  Alternative Window Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_WINDOWS.map((pw, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentScenario((prev) => ({
                          ...prev,
                          start: pw.start,
                          end: pw.end,
                          durationMin: pw.duration,
                        }))
                      }}
                      className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] h-7 px-2.5 shadow-2xs"
                    >
                      {pw.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Train Delay Simulation */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-blue-600" />
                    Simulate Train Delay (In-Memory Only)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Temporary timetable shift</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={selectedTrainNo}
                    onChange={(e) => setSelectedTrainNo(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="12841">12841 Coromandel Express (07:40)</option>
                    <option value="12073">12073 Howrah Jan Shatabdi (09:10)</option>
                    <option value="GDS-4412">GDS-4412 Freight BOXN (10:15)</option>
                    <option value="18045">18045 East Coast Express (13:15)</option>
                    <option value="22201">22201 Duronto Express (16:20)</option>
                    <option value="12277">12277 Shatabdi Express (08:30)</option>
                    <option value="12703">12703 Falaknuma Express (15:10)</option>
                  </select>

                  <select
                    value={selectedDelayMin}
                    onChange={(e) => setSelectedDelayMin(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-500"
                  >
                    {DELAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        +{d} min delay
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    onClick={handleAddTrainDelay}
                    disabled={selectedDelayMin <= 0}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 font-medium"
                  >
                    Add Delay
                  </Button>
                </div>

                {/* Active Simulated Delays */}
                {currentScenario.trainDelayAdjustments && currentScenario.trainDelayAdjustments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currentScenario.trainDelayAdjustments.map((adj) => (
                      <div
                        key={adj.trainNumber}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono"
                      >
                        <span>Train {adj.trainNumber}: +{adj.delayMinutes}m</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTrainDelay(adj.trainNumber)}
                          className="hover:text-amber-900"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintenance Task Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-purple-600" />
                    Simulated Task Composition ({currentScenario.taskIds.length} selected)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    20m safety buffer applied automatically
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {corridorTasks.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-4 text-center">No tasks available for this corridor.</p>
                  ) : (
                    corridorTasks.map((task) => {
                      const isChecked = currentScenario.taskIds.includes(task.id)
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                            isChecked
                              ? 'bg-purple-50 border-purple-300 text-purple-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded border-slate-300 text-purple-600 focus:ring-0"
                            />
                            <span className="font-mono font-bold text-slate-900">{task.id}</span>
                            <span className="text-slate-700 truncate max-w-[200px]">{task.taskType}</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-slate-500">{task.estimatedDuration}m</span>
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 bg-white">
                              {task.criticality}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scenario Result Breakdown & Actions (1 Col) */}
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="py-3.5 px-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Scenario Evaluation
                </CardTitle>
                {currentResult && getImpactBadge(currentResult.impact.operationalImpact)}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs font-mono">
              {currentResult ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Critical Conflicts:</span>
                      <span className={`font-bold ${currentResult.impact.criticalConflicts ? 'text-rose-600' : 'text-slate-800'}`}>
                        {currentResult.impact.criticalConflicts}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Warning Conflicts:</span>
                      <span className={`font-bold ${currentResult.impact.warningConflicts ? 'text-amber-600' : 'text-slate-800'}`}>
                        {currentResult.impact.warningConflicts}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Affected Trains:</span>
                      <span className="font-bold text-slate-800">{currentResult.impact.affectedTrains}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600" title="Sum of overlapping train path minutes">
                        Simulated Delay Impact:
                      </span>
                      <span className="font-bold text-amber-700">{currentResult.impact.simulatedDelayMinutes} min</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Work Duration:</span>
                      <span className="font-bold text-slate-800">
                        {currentResult.impact.totalTaskWorkMin}m / {currentResult.impact.durationMin}m
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Window Utilization:</span>
                      <span className="font-bold text-emerald-700">{currentResult.impact.utilizationPercent}%</span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-600">Safety Buffer:</span>
                      <span className={`font-bold ${currentResult.impact.safetyBufferStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {currentResult.impact.safetyBufferStatus} ({currentResult.impact.availableWorkingMin}m avail)
                      </span>
                    </div>
                  </div>

                  {/* Conflict details if any */}
                  {currentResult.conflicts.conflicts.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1 text-[11px]">
                      <span className="text-rose-800 font-bold block">Simulated Alerts:</span>
                      {currentResult.conflicts.conflicts.map((c) => (
                        <div key={c.id} className="text-slate-700">
                          • [{c.severity}] {c.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handleApplyToPlanner}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Apply Scenario to Planner
                    </Button>

                    <Button
                      onClick={() => {
                        const params = new URLSearchParams({
                          corridorId: currentScenario.corridorId,
                          start: currentScenario.start,
                          end: currentScenario.end,
                          date: currentScenario.date,
                          taskIds: currentScenario.taskIds.join(','),
                        })
                        router.push(`/network-coordination?${params.toString()}`)
                      }}
                      variant="outline"
                      className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <Network className="w-3.5 h-3.5 text-blue-600" />
                      Check Cross-Corridor Impact
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          corridorId: currentScenario.corridorId,
                          start: currentScenario.start,
                          end: currentScenario.end,
                          date: currentScenario.date,
                          incidentId: 'INC-001',
                        })
                        router.push(`/disruptions?${params.toString()}`)
                      }}
                      variant="outline"
                      className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-600" />
                      Simulate Disruption Impact
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          corridorId: currentScenario.corridorId,
                          date: currentScenario.date,
                          taskIds: currentScenario.taskIds.join(','),
                        })
                        router.push(`/optimization?${params.toString()}`)
                      }}
                      variant="outline"
                      className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Optimize Scenario
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSaveToComparison}
                      variant="outline"
                      className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs gap-1.5 shadow-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      Add to Comparison Table
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setCurrentScenario(baseline)}
                      variant="ghost"
                      className="w-full text-slate-500 hover:text-slate-800 text-xs gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Baseline
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">Simulating scenario...</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SCENARIO COMPARISON TABLE                             */}
      {/* ======================================================== */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-3.5 px-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Factual Scenario Comparison (Decision Support)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Compare baseline against simulated alternatives side-by-side. The controller makes the final decision.
              </CardDescription>
            </div>
            {savedScenarios.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSavedScenarios([])}
                className="text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Clear Added Scenarios
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="p-3">Scenario Parameter / Metric</th>
                <th className="p-3 border-l border-slate-200 bg-blue-50/70 text-blue-900 font-bold">
                  Baseline Plan
                </th>
                <th className="p-3 border-l border-slate-200 bg-indigo-50/70 text-indigo-900 font-bold">
                  Current Sandbox
                </th>
                {savedScenarios.map((s, idx) => (
                  <th key={idx} className="p-3 border-l border-slate-200 text-slate-800 font-bold">
                    {s.scenario.scenarioName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 text-slate-600 font-medium">Window & Duration</td>
                <td className="p-3 border-l border-slate-200 text-slate-900 font-bold bg-blue-50/20">
                  {baseline.start}–{baseline.end} ({baseline.durationMin}m)
                </td>
                <td className="p-3 border-l border-slate-200 text-slate-900 font-bold bg-indigo-50/20">
                  {currentScenario.start}–{currentScenario.end} ({currentResult?.impact.durationMin ?? 0}m)
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-slate-800 font-medium">
                    {s.scenario.start}–{s.scenario.end} ({s.impact.durationMin}m)
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Tasks Bundled</td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-blue-50/20">
                  {baseline.taskIds.length} tasks ({baselineResult?.impact.totalTaskWorkMin ?? 0}m work)
                </td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-indigo-50/20">
                  {currentScenario.taskIds.length} tasks ({currentResult?.impact.totalTaskWorkMin ?? 0}m work)
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-slate-800">
                    {s.impact.taskCount} tasks ({s.impact.totalTaskWorkMin}m work)
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Critical Conflicts</td>
                <td className={`p-3 border-l border-slate-200 font-bold bg-blue-50/20 ${baselineResult?.impact.criticalConflicts ? 'text-rose-600' : 'text-slate-700'}`}>
                  {baselineResult?.impact.criticalConflicts ?? 0}
                </td>
                <td className={`p-3 border-l border-slate-200 font-bold bg-indigo-50/20 ${currentResult?.impact.criticalConflicts ? 'text-rose-600' : 'text-slate-700'}`}>
                  {currentResult?.impact.criticalConflicts ?? 0}
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className={`p-3 border-l border-slate-200 font-bold ${s.impact.criticalConflicts ? 'text-rose-600' : 'text-slate-700'}`}>
                    {s.impact.criticalConflicts}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Warning Advisories</td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-blue-50/20">
                  {baselineResult?.impact.warningConflicts ?? 0}
                </td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-indigo-50/20">
                  {currentResult?.impact.warningConflicts ?? 0}
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-slate-800">
                    {s.impact.warningConflicts}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Affected Timetable Trains</td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-blue-50/20">
                  {baselineResult?.impact.affectedTrains ?? 0} trains
                </td>
                <td className="p-3 border-l border-slate-200 text-slate-800 bg-indigo-50/20">
                  {currentResult?.impact.affectedTrains ?? 0} trains
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-slate-800">
                    {s.impact.affectedTrains} trains
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Simulated Delay Impact</td>
                <td className="p-3 border-l border-slate-200 text-amber-700 font-bold bg-blue-50/20">
                  {baselineResult?.impact.simulatedDelayMinutes ?? 0} min
                </td>
                <td className="p-3 border-l border-slate-200 text-amber-700 font-bold bg-indigo-50/20">
                  {currentResult?.impact.simulatedDelayMinutes ?? 0} min
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-amber-700 font-bold">
                    {s.impact.simulatedDelayMinutes} min
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Window Utilization</td>
                <td className="p-3 border-l border-slate-200 text-emerald-700 font-bold bg-blue-50/20">
                  {baselineResult?.impact.utilizationPercent ?? 0}%
                </td>
                <td className="p-3 border-l border-slate-200 text-emerald-700 font-bold bg-indigo-50/20">
                  {currentResult?.impact.utilizationPercent ?? 0}%
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200 text-emerald-700 font-bold">
                    {s.impact.utilizationPercent}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Safety Buffer Status</td>
                <td className={`p-3 border-l border-slate-200 font-bold bg-blue-50/20 ${baselineResult?.impact.safetyBufferStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {baselineResult?.impact.safetyBufferStatus ?? 'PASS'}
                </td>
                <td className={`p-3 border-l border-slate-200 font-bold bg-indigo-50/20 ${currentResult?.impact.safetyBufferStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {currentResult?.impact.safetyBufferStatus ?? 'PASS'}
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className={`p-3 border-l border-slate-200 font-bold ${s.impact.safetyBufferStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {s.impact.safetyBufferStatus}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-600 font-medium">Operational Impact</td>
                <td className="p-3 border-l border-slate-200 bg-blue-50/20">
                  {baselineResult && getImpactBadge(baselineResult.impact.operationalImpact)}
                </td>
                <td className="p-3 border-l border-slate-200 bg-indigo-50/20">
                  {currentResult && getImpactBadge(currentResult.impact.operationalImpact)}
                </td>
                {savedScenarios.map((s, idx) => (
                  <td key={idx} className="p-3 border-l border-slate-200">
                    {getImpactBadge(s.impact.operationalImpact)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function WhatIfPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-slate-500 text-sm">Loading What-If Simulation Sandbox...</div>}>
      <WhatIfContent />
    </Suspense>
  )
}
