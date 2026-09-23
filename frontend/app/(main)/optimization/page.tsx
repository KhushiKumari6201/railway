'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Train,
  Wrench,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  BarChart3,
  GitCompare,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Send,
  Building,
  UserCheck,
  Info,
  HelpCircle,
  AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { corridors, corridorName } from '@/lib/data/corridors'
import type {
  MaintenanceTask,
  OptimizationResult,
  OptimizationCandidate,
  OptimizationComparison,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TIME_HORIZONS = [
  { label: 'Full Day (00:00 - 24:00)', value: 'fullday', start: '00:00', end: '24:00' },
  { label: 'Morning Shift (06:00 - 14:00)', value: 'morning', start: '06:00', end: '14:00' },
  { label: 'Afternoon Shift (14:00 - 22:00)', value: 'afternoon', start: '14:00', end: '22:00' },
  { label: 'Night Window (22:00 - 06:00)', value: 'night', start: '22:00', end: '06:00' },
]

export default function OptimizationDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Form Controls
  const [selectedCorridors, setSelectedCorridors] = useState<string[]>(['C01'])
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-24')
  const [horizonValue, setHorizonValue] = useState<string>('fullday')

  // Hard Constraint Toggles (All on by default per SER safety rules)
  const [hardConstraints, setHardConstraints] = useState({
    enforceTimetableSeparation: true,
    enforceBlockCollision: true,
    enforceResourceExclusivity: true,
    enforceDependencyPrecedence: true,
    enforceDisruptionAvoidance: true,
    enforceSafetyBuffer: true,
  })

  // Pending Tasks to bundle
  const [availableTasks, setAvailableTasks] = useState<MaintenanceTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true)

  // Optimization State
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<OptimizationComparison | null>(null)
  const [isComparing, setIsComparing] = useState<boolean>(false)

  // Staging Feedback
  const [stagingCandidateId, setStagingCandidateId] = useState<string | null>(null)
  const [stagingSuccess, setStagingSuccess] = useState<{ candidateId: string; blockId: string; message: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Active Tab
  const [activeTab, setActiveTab] = useState<'candidates' | 'comparison' | 'infeasible'>('candidates')

  // Load pending tasks on mount & corridor change
  const loadTasks = useCallback(async () => {
    setLoadingTasks(true)
    try {
      const allTasks = await api.getTasks()
      // Filter tasks matching selected corridors
      const eligible = allTasks.filter(t => 
        selectedCorridors.includes(t.corridorId) &&
        (t.status === 'Open' || t.status === 'Scheduled' || !t.status)
      )
      setAvailableTasks(eligible)
      // Auto select first 3 eligible tasks
      setSelectedTaskIds(eligible.slice(0, 3).map(t => t.id))
    } catch (err: any) {
      console.error('Failed to load pending tasks for optimization:', err)
    } finally {
      setLoadingTasks(false)
    }
  }, [selectedCorridors])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Toggle corridor selection
  const toggleCorridor = (cId: string) => {
    setSelectedCorridors(prev => {
      if (prev.includes(cId)) {
        if (prev.length === 1) return prev // Keep at least one
        return prev.filter(id => id !== cId)
      }
      return [...prev, cId]
    })
  }

  // Toggle individual task selection
  const toggleTask = (tId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    )
  }

  // Run Optimization Generation
  const handleRunOptimization = async () => {
    setIsGenerating(true)
    setActionError(null)
    setStagingSuccess(null)
    setComparison(null)
    setSelectedCandidateIds([])

    try {
      const horizonConfig = TIME_HORIZONS.find(h => h.value === horizonValue)
      const res = await api.generateOptimization({
        corridorIds: selectedCorridors,
        date: selectedDate,
        timeHorizonStart: horizonConfig?.start || '00:00',
        timeHorizonEnd: horizonConfig?.end || '24:00',
        taskIds: selectedTaskIds,
        hardConstraints,
      })

      setResult(res)
      setActiveTab('candidates')
    } catch (err: any) {
      console.error('Optimization run failed:', err)
      setActionError(err.message || 'Optimization solver failed to execute. Please verify backend state.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Compare Selected Candidates
  const handleCompareCandidates = async () => {
    if (selectedCandidateIds.length < 2 || !result) return
    setIsComparing(true)
    try {
      const candidatesToCompare = result.feasibleCandidates.filter(c =>
        selectedCandidateIds.includes(c.candidateId)
      )
      const comp = await api.compareOptimization(candidatesToCompare)
      setComparison(comp)
      setActiveTab('comparison')
    } catch (err: any) {
      console.error('Candidate comparison failed:', err)
      setActionError(err.message || 'Failed to compare candidates.')
    } finally {
      setIsComparing(false)
    }
  }

  // Stage candidate block into MongoDB (Proposed Status Only)
  const handleApplyCandidate = async (candidate: OptimizationCandidate) => {
    setStagingCandidateId(candidate.candidateId)
    setActionError(null)
    setStagingSuccess(null)

    try {
      const res = await api.applyOptimization(candidate)
      setStagingSuccess({
        candidateId: candidate.candidateId,
        blockId: res.blockId,
        message: res.message || 'Candidate staged in Proposed status. Controller sanction required.',
      })
    } catch (err: any) {
      console.error('Failed to apply optimization candidate:', err)
      setActionError(err.message || 'Failed to stage candidate.')
    } finally {
      setStagingCandidateId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto text-slate-900">
      {/* Disclaimer / Regulatory Header Banner */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex items-start justify-between shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-800 uppercase tracking-wider text-xs px-2.5 py-0.5 rounded bg-white border border-amber-300 shadow-2xs font-mono">
                Decision-Support Mode Only
              </span>
              <span className="text-xs text-amber-800 font-mono font-semibold">SER-KGP-OPT-P9</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              This constraint-based optimization engine calculates mathematically feasible maintenance block options
              across interconnected corridors. <strong>It NEVER auto-approves or modifies operational schedules.</strong> All
              candidate blocks are staged strictly in <span className="text-amber-800 font-semibold font-mono">Proposed</span> status
              and require full Controller review, interlocking verification, and formal Section Controller sanction.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-amber-300 bg-white text-amber-800 font-mono shrink-0 hidden sm:inline-flex shadow-2xs font-semibold">
          Deterministic v9.0
        </Badge>
      </div>

      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-slate-800">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/planner" className="hover:text-slate-800">Block Planner</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-emerald-700 font-semibold">Constraint Optimization</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Constraint-Based Network Optimization
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Simulate combinations of maintenance tasks across Kharagpur corridors respecting timetables, safety buffers, resources, and disruptions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/what-if">
            <Button variant="outline" size="sm" className="border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 shadow-xs">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> What-If Simulator
            </Button>
          </Link>
          <Link href="/network-coordination">
            <Button variant="outline" size="sm" className="border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 shadow-xs">
              <Building className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Network Coordination
            </Button>
          </Link>
          <Link href="/disruptions">
            <Button variant="outline" size="sm" className="border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Disruption Feed
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Parameters / Constraints (Left) vs Output & Comparison (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Input Configuration (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. Corridor & Horizon Selection */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Target Corridors & Date
                </span>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  {selectedCorridors.length} Selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Corridors Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wider">
                  Operational Corridors (SER Kharagpur)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {corridors.map(c => {
                    const active = selectedCorridors.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCorridor(c.id)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                          active
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-mono font-bold text-slate-900 flex items-center justify-between">
                          <span>{c.id}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <div className="truncate text-[11px] text-slate-500 mt-0.5">{c.name.split('(')[0]}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Target Date & Horizon */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Horizon</label>
                  <select
                    value={horizonValue}
                    onChange={e => setHorizonValue(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {TIME_HORIZONS.map(h => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Tasks to Bundle */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Maintenance Tasks
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select candidate tasks to schedule together
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 font-mono text-xs font-semibold">
                {selectedTaskIds.length}/{availableTasks.length}
              </Badge>
            </CardHeader>
            <CardContent className="pt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {loadingTasks ? (
                <div className="text-xs text-slate-500 py-4 text-center">Loading pending tasks...</div>
              ) : availableTasks.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">No unassigned tasks found for selected corridors.</div>
              ) : (
                availableTasks.map(t => {
                  const isChecked = selectedTaskIds.includes(t.id)
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTask(t.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs flex items-center justify-between ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{t.taskType || t.id}</span>
                          <span className="font-mono text-[10px] text-slate-500">({t.estimatedDuration || 120}m)</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono text-blue-700 font-semibold">{t.corridorId} ({t.location || 'Track'})</span>
                          <span>•</span>
                          <span>Dept: {t.department || 'Engineering'}</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* 3. Hard Safety Constraints (Invariants) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                Hard Constraint Invariants
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mandatory Indian Railways safety invariants
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-2.5">
              {[
                { key: 'enforceTimetableSeparation', label: 'Zero Collision with Timetable Trains', desc: 'Preserves minimum 20m safety buffer before passenger paths' },
                { key: 'enforceBlockCollision', label: 'No Conflicting Approved Blocks', desc: 'No overlapping track occupation on active line' },
                { key: 'enforceResourceExclusivity', label: 'Crew & Machinery Exclusivity', desc: 'Prevents double-booking crews across sections' },
                { key: 'enforceDependencyPrecedence', label: 'Task Dependency Precedence', desc: 'Prerequisite works must finish before secondary' },
                { key: 'enforceDisruptionAvoidance', label: 'Active Disruption Quarantine', desc: 'Blocks disallowed on caution/derailment zones' },
              ].map(c => (
                <div key={c.key} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <input
                    type="checkbox"
                    checked={(hardConstraints as any)[c.key]}
                    onChange={e => setHardConstraints({ ...hardConstraints, [c.key]: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">{c.label}</div>
                    <div className="text-[11px] text-slate-500">{c.desc}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Generator Action Button */}
          <Button
            onClick={handleRunOptimization}
            disabled={isGenerating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 shadow-xs text-sm flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Solving Feasible Candidates...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Solve Constraint Optimization
              </>
            )}
          </Button>

          {actionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{actionError}</span>
            </div>
          )}

          {stagingSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <div className="font-bold">{stagingSuccess.message}</div>
                <div className="font-mono text-[11px] text-emerald-700 font-semibold mt-1">
                  Block ID: {stagingSuccess.blockId} (Status: Proposed)
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Navigate to <Link href="/planner" className="underline text-emerald-700 font-medium">Block Planner</Link> to inspect, verify interlocking, and sanction.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Optimization Results, Infeasible Log & Comparison (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Results Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('candidates')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'candidates'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Feasible Candidates
                {result && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                    {result.feasibleCandidates?.length || 0}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('infeasible')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'infeasible'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Infeasible Windows & Reasons
                {result && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                    {result.infeasibleCandidates?.length || 0}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comparison')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'comparison'
                    ? 'bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                Side-by-Side Comparison
                {comparison && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                    {comparison.comparisons?.length || 0}
                  </Badge>
                )}
              </button>
            </div>

            {/* Quick compare trigger */}
            {activeTab === 'candidates' && selectedCandidateIds.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompareCandidates}
                disabled={isComparing}
                className="border-blue-300 bg-white hover:bg-slate-50 text-blue-700 text-xs flex items-center gap-1.5 shadow-xs font-semibold"
              >
                <GitCompare className="w-3.5 h-3.5" />
                Compare {selectedCandidateIds.length} Selected
              </Button>
            )}
          </div>

          {/* TAB 1: Feasible Candidates */}
          {activeTab === 'candidates' && (
            <div className="space-y-4">
              {!result ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                  <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Optimization Run Active</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Select target corridors, scheduled tasks, and click &quot;Solve Constraint Optimization&quot; to generate mathematically verified candidate windows.
                  </p>
                </div>
              ) : result.feasibleCandidates.length === 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center shadow-xs">
                  <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-rose-900">No Feasible Windows Found</h3>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
                    All candidate time slots violated one or more hard constraints (timetable train conflict, double-booked crew, or disruption zone).
                    Check the &quot;Infeasible Windows&quot; tab to inspect exact constraint violation logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-4 gap-3 bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
                    <div>
                      <div className="text-slate-500 font-semibold">Total Evaluated</div>
                      <div className="text-base font-mono font-bold text-slate-900 mt-0.5">{result.summary?.totalCandidatesGenerated || 0}</div>
                    </div>
                    <div>
                      <div className="text-emerald-700 font-semibold">Feasible Solutions</div>
                      <div className="text-base font-mono font-bold text-emerald-700 mt-0.5">{result.summary?.feasibleCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-rose-700 font-semibold">Infeasible / Pruned</div>
                      <div className="text-base font-mono font-bold text-rose-700 mt-0.5">{result.summary?.infeasibleCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-blue-700 font-semibold">Tasks Bundled</div>
                      <div className="text-base font-mono font-bold text-blue-700 mt-0.5">{result.summary?.eligibleTasksFound || 0}</div>
                    </div>
                  </div>

                  {/* Candidates Cards */}
                  {result.feasibleCandidates.map((cand, idx) => {
                    const isSelectedForComp = selectedCandidateIds.includes(cand.candidateId)
                    return (
                      <Card
                        key={cand.candidateId}
                        className={`bg-white border transition-all shadow-xs ${
                          isSelectedForComp
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-800 font-mono text-xs font-bold">
                                Candidate #{idx + 1}
                              </Badge>
                              <span className="font-mono text-xs text-slate-500 font-semibold">{cand.candidateId}</span>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                                {cand.corridorId} ({cand.section})
                              </Badge>
                            </div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>Window: {cand.start} – {cand.end}</span>
                              <span className="text-slate-500 font-normal">({cand.durationMin} mins)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-600 flex items-center gap-1.5 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={isSelectedForComp}
                                onChange={() => {
                                  setSelectedCandidateIds(prev =>
                                    prev.includes(cand.candidateId)
                                      ? prev.filter(id => id !== cand.candidateId)
                                      : [...prev, cand.candidateId]
                                  )
                                }}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                              />
                              <span>Select for Compare</span>
                            </label>
                            <Button
                              size="sm"
                              onClick={() => handleApplyCandidate(cand)}
                              disabled={stagingCandidateId === cand.candidateId}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold ml-2 flex items-center gap-1.5 shadow-xs"
                            >
                              {stagingCandidateId === cand.candidateId ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileCheck2 className="w-3.5 h-3.5" />
                              )}
                              Stage as Proposed
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-slate-500 block text-[11px] font-medium">Tasks Bundled</span>
                              <span className="font-mono font-bold text-slate-900">
                                {cand.taskCount || 0} tasks
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px] font-medium">Train Delay Est.</span>
                              <span className="font-mono font-bold text-amber-700">
                                {cand.simulatedDelayMinutes || 0} min
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px] font-medium">Task Work Time</span>
                              <span className="font-mono font-bold text-blue-700">
                                {cand.totalTaskWorkMin || 0} min
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px] font-medium">Idle Gap</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {cand.idleTimeMin || 0} min
                              </span>
                            </div>
                          </div>

                          {/* Detail row */}
                          <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
                            <span>Safety Buffer: <strong className="text-emerald-700">{cand.safetyBufferMin}m ({cand.safetyBufferStatus})</strong></span>
                            <span>Affected Trains: <strong className="text-slate-900">{cand.affectedTrainCount}</strong></span>
                            <span>Network Utilization Delta: <strong className="text-blue-700">+{cand.networkUtilizationDelta}%</strong></span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Infeasible Windows & Detailed Pruning Log */}
          {activeTab === 'infeasible' && (
            <div className="space-y-4">
              {!result || result.infeasibleCandidates.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs shadow-xs">
                  No pruned or infeasible candidate logs recorded in this session.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs text-slate-600 flex items-center justify-between px-1 font-medium">
                    <span>Showing mathematically pruned candidate windows violating safety rules</span>
                    <span className="font-mono text-rose-700 font-bold">{result.infeasibleCandidates.length} windows rejected</span>
                  </div>

                  {result.infeasibleCandidates.map((inf, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-rose-50/50 border border-rose-200 text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-mono font-bold text-rose-900">
                            {inf.start} – {inf.end} ({inf.corridorId} - {inf.section})
                          </span>
                        </div>
                        <Badge variant="outline" className="border-rose-300 bg-white text-rose-700 font-mono text-[10px] font-semibold">
                          Pruned
                        </Badge>
                      </div>

                      {/* Failure Reasons */}
                      <div className="space-y-1 pl-6">
                        {inf.failureDetails?.map((detail: any, rIdx: number) => (
                          <div key={rIdx} className="text-rose-900 text-[11px] flex items-start gap-1.5 font-mono">
                            <span className="text-rose-600 font-bold">•</span>
                            <span>[{detail.code}] {detail.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Side-by-Side Multi-Candidate Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              {!comparison ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs space-y-2 shadow-xs">
                  <GitCompare className="w-8 h-8 text-blue-600 mx-auto" />
                  <p>Select at least 2 candidates from the Feasible tab and click &quot;Compare Selected&quot;.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <GitCompare className="w-4 h-4 text-blue-600" />
                        Side-by-Side Factual Evaluation Matrix
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Objective comparative metrics without arbitrary ranking. Controllers determine final selection.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-blue-300 bg-white text-blue-800 font-mono text-xs font-semibold">
                      {comparison.candidateCount} Candidates
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold">
                          <th className="p-3">Candidate ID</th>
                          <th className="p-3">Corridor</th>
                          <th className="p-3">Time Window</th>
                          <th className="p-3 text-center">Tasks Bundled</th>
                          <th className="p-3 text-center">Work Duration</th>
                          <th className="p-3 text-center">Delay Impact</th>
                          <th className="p-3 text-center">Safety Buffer</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {comparison.comparisons.map(row => (
                          <tr key={row.candidateId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-emerald-700">{row.candidateId}</td>
                            <td className="p-3 text-slate-700">{row.corridorId}</td>
                            <td className="p-3 text-slate-900 font-semibold">{row.start} – {row.end}</td>
                            <td className="p-3 text-center text-slate-700">{row.taskCount}</td>
                            <td className="p-3 text-center text-blue-700 font-semibold">{row.totalTaskWorkMin}m</td>
                            <td className="p-3 text-center text-amber-700 font-semibold">{row.simulatedDelayMinutes}m</td>
                            <td className="p-3 text-center text-emerald-700 font-semibold">{row.safetyBufferStatus}</td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyCandidate(row)}
                                disabled={stagingCandidateId === row.candidateId}
                                className="border-amber-300 bg-white hover:bg-slate-50 text-amber-800 text-[11px] h-7 px-2.5 font-semibold shadow-2xs"
                              >
                                {stagingCandidateId === row.candidateId ? 'Staging...' : 'Stage Proposed'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
