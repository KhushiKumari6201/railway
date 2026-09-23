'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Check,
  Edit3,
  Sliders,
  SlidersHorizontal,
  ArrowRight,
  TrainTrack,
  Search,
  ShieldAlert,
  Info,
  Network,
  Radio,
} from 'lucide-react'
import { corridors, corridorName } from '@/lib/data/corridors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'
import { useAppState } from '@/lib/app-state-context'
import type { MaintenanceTask, RecommendedBlock } from '@/lib/types'

// Indian Railways safety buffer: 10m before + 10m after passenger trains
const SAFETY_BUFFER_MIN = 20

interface WindowConfig {
  id: 'w1' | 'w2'
  label: string
  timeRange: string
  start: string
  end: string
  durationMin: number
  blockType: string
  tag: string
  suitability: string
  section: string
  note: string
}

export function PlannerView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tasks: allTasks, recommendedBlocks, approveBlock, saveBlock, checkConflicts } = useAppState()

  const [selectedDate, setSelectedDate] = useState('2026-09-24')
  const [selectedCorridorId, setSelectedCorridorId] = useState('C01')
  const [isSearching, setIsSearching] = useState(false)
  const [activeWindowId, setActiveWindowId] = useState<'w1' | 'w2'>('w1')
  const [isApproved, setIsApproved] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // Handle parameters applied from What-If Scenario simulation
  useEffect(() => {
    if (searchParams?.get('appliedFromWhatIf') === 'true') {
      const qCorr = searchParams.get('corridorId')
      const qDate = searchParams.get('date')
      const qTasks = searchParams.get('taskIds')
      const qStart = searchParams.get('start')

      if (qCorr) setSelectedCorridorId(qCorr)
      if (qDate) setSelectedDate(qDate)
      if (qTasks) setSelectedTaskIds(qTasks.split(',').filter(Boolean))
      if (qStart === '14:00') {
        setActiveWindowId('w2')
      } else {
        setActiveWindowId('w1')
      }
      toast.info('Applied What-If simulated parameters to Planner view')
    }
  }, [searchParams])

  // Phase 3: Conflict detection state
  const [conflictAnalysis, setConflictAnalysis] = useState<{
    hasConflict: boolean
    hasBlockingConflict: boolean
    conflicts: any[]
    checking: boolean
  }>({
    hasConflict: false,
    hasBlockingConflict: false,
    conflicts: [],
    checking: false,
  })

  // Dynamic window slots for the selected corridor
  const windows: Record<'w1' | 'w2', WindowConfig> = useMemo(() => {
    const corr = corridors.find((c) => c.id === selectedCorridorId)
    const primarySection = corr?.sections[0] || 'Main Line'

    return {
      w1: {
        id: 'w1',
        label: 'Recommended Window',
        timeRange: '10:00 AM – 12:00 PM',
        start: '10:00',
        end: '12:00',
        durationMin: 120,
        blockType: 'Traffic Block',
        tag: 'Recommended',
        suitability: 'Good',
        section: primarySection,
        note: 'Between morning express trains and midday freight paths.',
      },
      w2: {
        id: 'w2',
        label: 'Secondary Window',
        timeRange: '2:00 PM – 3:30 PM',
        start: '14:00',
        end: '15:30',
        durationMin: 90,
        blockType: 'Traffic Block',
        tag: 'Secondary Window',
        suitability: 'Lower suitability',
        section: primarySection,
        note: 'Overlaps with down freight traffic slot. Requires regulation of goods train.',
      },
    }
  }, [selectedCorridorId])

  const activeWindow = windows[activeWindowId]

  // Step 2 & 3: Filter real tasks eligible for planning on this corridor
  const candidateTasks = useMemo(() => {
    return allTasks
      .filter((t) => {
        if (t.corridorId !== selectedCorridorId) return false
        // Eligible if Open or already part of the active selected plan
        if (t.status === 'Completed') return false
        return t.status === 'Open' || selectedTaskIds.includes(t.id)
      })
      .sort((a, b) => {
        // Priority-based sorting (Rule-based recommendation)
        if (b.priority !== a.priority) return b.priority - a.priority
        const critOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
        return (critOrder[b.criticality] || 0) - (critOrder[a.criticality] || 0)
      })
  }, [allTasks, selectedCorridorId, selectedTaskIds])

  // Step 11: Auto-select highest-priority tasks that fit within the window working time
  const autoSelectTasks = useCallback(
    (taskList: MaintenanceTask[], windowCapacity: number) => {
      const maxWorkTime = Math.max(30, windowCapacity - SAFETY_BUFFER_MIN)
      let currentDuration = 0
      const selected: string[] = []

      for (const t of taskList) {
        if (currentDuration + t.estimatedDuration <= maxWorkTime) {
          selected.push(t.id)
          currentDuration += t.estimatedDuration
        }
      }

      // If nothing fit, at least select the top priority task
      if (selected.length === 0 && taskList.length > 0) {
        selected.push(taskList[0].id)
      }

      return selected
    },
    []
  )

  // Initialize/refresh task selection when corridor or window changes
  useEffect(() => {
    setIsApproved(false)
    const matchingTasks = allTasks.filter(
      (t) => t.corridorId === selectedCorridorId && t.status !== 'Completed'
    )
    const initialSelected = autoSelectTasks(matchingTasks, activeWindow.durationMin)
    setSelectedTaskIds(initialSelected)
  }, [selectedCorridorId, activeWindow.durationMin, autoSelectTasks, allTasks])

  // Step 4 & 5: Calculate actual selected tasks and total duration dynamically
  const selectedTasks = useMemo(() => {
    return candidateTasks.filter((t) => selectedTaskIds.includes(t.id))
  }, [candidateTasks, selectedTaskIds])

  const totalDurationMin = useMemo(() => {
    return selectedTasks.reduce((acc, t) => acc + t.estimatedDuration, 0)
  }, [selectedTasks])

  // Step 6 & 7: Window capacity, utilization, and safety buffer calculations
  const windowDurationMin = activeWindow.durationMin
  const availableWorkingTime = Math.max(0, windowDurationMin - SAFETY_BUFFER_MIN)
  const utilizationPct =
    windowDurationMin > 0 ? Math.min(100, Math.round((totalDurationMin / windowDurationMin) * 100)) : 0

  const isExceedingWindow = totalDurationMin > windowDurationMin
  const isViolatingBuffer = totalDurationMin > availableWorkingTime
  const isFeasible = !isExceedingWindow && !isViolatingBuffer && selectedTasks.length > 0

  // Step 9: Dependency check
  const dependencyWarnings = useMemo(() => {
    const warnings: string[] = []
    for (const task of selectedTasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const depTask = allTasks.find((t) => t.id === depId)
          const isSatisfied = depTask?.status === 'Completed' || selectedTaskIds.includes(depId)
          if (!isSatisfied) {
            warnings.push(`${task.id} requires dependency ${depId} (currently ${depTask?.status || 'unresolved'})`)
          }
        }
      }
    }
    return warnings
  }, [selectedTasks, allTasks, selectedTaskIds])

  // Step 10: Automatic conflict recheck whenever window, tasks, corridor, or date changes
  useEffect(() => {
    let isCancelled = false
    const runCheck = async () => {
      const blockConfig: Partial<RecommendedBlock> = {
        id: `REC-${selectedCorridorId}-${selectedDate.replace(/-/g, '')}`,
        date: selectedDate,
        corridorId: selectedCorridorId,
        section: activeWindow.section,
        start: activeWindow.start,
        end: activeWindow.end,
        durationMin: activeWindow.durationMin,
        taskIds: selectedTaskIds,
        alternative: {
          start: activeWindowId === 'w1' ? windows.w2.start : windows.w1.start,
          end: activeWindowId === 'w1' ? windows.w2.end : windows.w1.end,
          operationalImpact: 'Medium',
          note: activeWindowId === 'w1' ? windows.w2.note : windows.w1.note,
        },
      }

      setConflictAnalysis((prev) => ({ ...prev, checking: true }))
      const res = await checkConflicts(blockConfig, false)
      if (!isCancelled) {
        setConflictAnalysis({
          hasConflict: res.hasConflict,
          hasBlockingConflict: res.hasBlockingConflict,
          conflicts: res.conflicts || [],
          checking: false,
        })
      }
    }

    runCheck()
    return () => {
      isCancelled = true
    }
  }, [selectedCorridorId, activeWindowId, selectedDate, selectedTaskIds, activeWindow, windows, checkConflicts])

  // Step 10: Dynamic "Why Recommended?" generation
  const recommendationReasons = useMemo(() => {
    if (selectedTasks.length === 0) {
      return ['Select candidate tasks to generate block recommendations.']
    }

    const reasons: string[] = []
    const depts = Array.from(new Set(selectedTasks.map((t) => t.department)))
    const criticals = selectedTasks.filter((t) => t.criticality === 'Critical')

    reasons.push(`All ${selectedTasks.length} tasks belong to ${corridorName(selectedCorridorId)} (${selectedCorridorId})`)

    if (isFeasible) {
      const remainingBuffer = windowDurationMin - totalDurationMin
      reasons.push(
        `Tasks fit within the ${Math.floor(windowDurationMin / 60)}h ${windowDurationMin % 60 ? windowDurationMin % 60 + 'm ' : ''}window (${totalDurationMin}m required, leaving ${remainingBuffer}m safety buffer)`
      )
    } else if (isExceedingWindow) {
      reasons.push(`Work duration (${totalDurationMin}m) exceeds available window capacity (${windowDurationMin}m)`)
    } else if (isViolatingBuffer) {
      reasons.push(`Work duration (${totalDurationMin}m) leaves less than the required ${SAFETY_BUFFER_MIN}m buffer`)
    }

    if (depts.length > 1) {
      reasons.push(`Bundles multi-department maintenance across ${depts.join(', ')} into a single track closure`)
    } else {
      reasons.push(`Single-department block for ${depts[0]} scheduled without adjacent conflicts`)
    }

    if (criticals.length > 0) {
      reasons.push(`Prioritizes ${criticals.length} critical safety task(s): ${criticals.map((c) => c.id).join(', ')}`)
    }

    if (dependencyWarnings.length === 0) {
      reasons.push('No outstanding dependencies or signal interlocking conflicts detected')
    }

    // Conflict awareness in recommendations
    if (conflictAnalysis.hasConflict) {
      for (const c of conflictAnalysis.conflicts) {
        reasons.push(`⚠️ ${c.severity}: ${c.title} (${c.time})`)
      }
    } else if (isFeasible) {
      reasons.push('No overlapping approved maintenance block detected on this corridor')
      reasons.push('No timetable train clash detected [Simulation / Timetable Data]')
    }

    return reasons
  }, [
    selectedTasks,
    selectedCorridorId,
    isFeasible,
    isExceedingWindow,
    isViolatingBuffer,
    totalDurationMin,
    windowDurationMin,
    dependencyWarnings,
    conflictAnalysis,
  ])

  // Step 4: Toggle task inclusion
  const handleToggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const isSelected = prev.includes(id)
      const next = isSelected ? prev.filter((item) => item !== id) : [...prev, id]
      return next
    })
  }

  // Step 12: Find Best Block (generates / updates the proposed plan)
  const handleFindBlock = async () => {
    setIsSearching(true)
    setIsApproved(false)

    const autoSelected = autoSelectTasks(candidateTasks, activeWindow.durationMin)
    setSelectedTaskIds(autoSelected)

    const blockId = `REC-${selectedCorridorId}-${selectedDate.replace(/-/g, '')}`
    const newBlock: RecommendedBlock = {
      id: blockId,
      date: selectedDate,
      corridorId: selectedCorridorId,
      section: activeWindow.section,
      start: activeWindow.start,
      end: activeWindow.end,
      durationMin: activeWindow.durationMin,
      blockType: activeWindow.blockType as any,
      confidence: isFeasible ? 'High' : 'Medium',
      utilization: utilizationPct,
      operationalImpact: isFeasible ? 'Low' : 'Medium',
      status: 'Recommended',
      taskIds: autoSelected,
      criticalTasks: candidateTasks.filter((t) => autoSelected.includes(t.id) && t.criticality === 'Critical').length,
      downtimeSavedMin: autoSelected.length > 1 ? Math.round(totalDurationMin * 0.3) : 0,
      reasons: recommendationReasons,
      alternative: {
        start: windows.w2.start,
        end: windows.w2.end,
        operationalImpact: 'Medium',
        note: windows.w2.note,
      },
    }

    saveBlock(newBlock)
    // Run conflict check with persistence on explicit plan generation
    await checkConflicts(newBlock, true)

    setIsSearching(false)
    toast.success('Optimal Block Found', {
      description: `Found available maintenance window for ${corridorName(selectedCorridorId)} on ${selectedDate}.`,
    })
  }

  // Step 15: Approve Plan (calls Phase 1 approval workflow with conflict safety)
  const handleApprove = async () => {
    if (selectedTasks.length === 0) {
      toast.error('Cannot Approve Plan', {
        description: 'Please select at least one maintenance task.',
      })
      return
    }

    if (isExceedingWindow) {
      toast.error('Cannot Approve Plan', {
        description: `Selected task duration (${totalDurationMin}m) exceeds window capacity (${windowDurationMin}m).`,
      })
      return
    }

    if (conflictAnalysis.hasBlockingConflict) {
      const topConflict = conflictAnalysis.conflicts[0]
      toast.error('Approval Blocked by Scheduling Conflict', {
        description: topConflict?.description || 'A critical timetable or approved block clash must be resolved first.',
      })
      return
    }

    setIsApproved(true)
    setIsModifying(false)

    const blockId = `REC-${selectedCorridorId}-${selectedDate.replace(/-/g, '')}`
    const finalBlock: RecommendedBlock = {
      id: blockId,
      date: selectedDate,
      corridorId: selectedCorridorId,
      section: activeWindow.section,
      start: activeWindow.start,
      end: activeWindow.end,
      durationMin: activeWindow.durationMin,
      blockType: activeWindow.blockType as any,
      confidence: isFeasible ? 'High' : 'Medium',
      utilization: utilizationPct,
      operationalImpact: isFeasible ? 'Low' : 'Medium',
      status: 'Recommended',
      taskIds: selectedTasks.map((t) => t.id),
      criticalTasks: selectedTasks.filter((t) => t.criticality === 'Critical').length,
      downtimeSavedMin: selectedTasks.length > 1 ? Math.round(totalDurationMin * 0.3) : 0,
      reasons: recommendationReasons,
    }

    saveBlock(finalBlock)
    try {
      await approveBlock(blockId)
      toast.success('Block Plan Approved', {
        description: `${activeWindow.timeRange} block on ${corridorName(selectedCorridorId)} marked as Approved. Notice dispatched to Divisional Operating Control.`,
      })
    } catch (err: any) {
      setIsApproved(false)
      toast.error('Approval Failed', {
        description: err.message || 'Server rejected approval due to a conflicting schedule constraint.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Visual Workflow Steps */}
      <div className="rounded-lg border border-border bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 font-medium text-primary">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              1
            </span>
            <span>Available Window</span>
          </div>
          <ArrowRight className="size-3 text-slate-300 shrink-0" />
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              2
            </span>
            <span>Candidate Tasks</span>
          </div>
          <ArrowRight className="size-3 text-slate-300 shrink-0" />
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              3
            </span>
            <span>Smart Recommendation</span>
          </div>
          <ArrowRight className="size-3 text-slate-300 shrink-0" />
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full text-xs font-bold',
                isApproved ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              )}
            >
              4
            </span>
            <span>Planner Approval</span>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Corridor</label>
              <select
                value={selectedCorridorId}
                onChange={(e) => setSelectedCorridorId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleFindBlock}
              disabled={isSearching}
              className="h-9 gap-2 text-xs font-semibold w-full cursor-pointer"
            >
              <Search className="size-3.5" />
              {isSearching ? 'Finding Best Window…' : 'Find Best Block'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Block Windows Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Available Block Windows
            </h2>
            <p className="text-xs text-muted-foreground">
              Candidate traffic and power block slots for {corridorName(selectedCorridorId)}
            </p>
          </div>
          {isApproved && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="size-3.5" />
              Plan Approved
            </span>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Window Card */}
          <Card
            className={cn(
              'lg:col-span-2 border-2 transition-all shadow-xs',
              activeWindowId === 'w1' ? 'border-primary bg-white' : 'border-border bg-slate-50/50'
            )}
          >
            <CardHeader className="border-b border-border/80 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {activeWindow.timeRange}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border',
                        activeWindowId === 'w1'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      )}
                    >
                      <Sparkles className="size-3" />
                      {activeWindow.tag}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Duration: <strong>{activeWindow.durationMin / 60} hours</strong> ({activeWindow.durationMin} min) ·{' '}
                    Availability: <span className="text-emerald-700 font-semibold">{activeWindow.suitability}</span> · Up &amp; Down Lines
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right sm:block hidden">
                    <span className="text-xs uppercase font-bold text-slate-400 block">Corridor</span>
                    <span className="text-xs font-bold text-slate-700">
                      {corridorName(selectedCorridorId)}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-5">
              {/* Candidate Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Candidate Tasks ({selectedTasks.length} of {candidateTasks.length} selected)
                  </span>
                  {isModifying && (
                    <span className="text-xs text-primary font-medium">
                      Check/uncheck tasks to modify block composition
                    </span>
                  )}
                </div>

                {candidateTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                    No eligible maintenance tasks available for {corridorName(selectedCorridorId)}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {candidateTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id)
                      return (
                        <div
                          key={task.id}
                          onClick={() => isModifying && handleToggleTask(task.id)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border text-xs transition-colors',
                            isSelected
                              ? 'border-blue-200 bg-blue-50/50 text-slate-900'
                              : 'border-slate-200 bg-slate-50 text-slate-400 line-through',
                            isModifying && 'cursor-pointer hover:border-primary'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleTask(task.id)}
                              disabled={!isModifying}
                              className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <div>
                              <span className="font-mono font-bold text-slate-900 mr-2">
                                {task.id}
                              </span>
                              <span className="font-medium text-slate-800">{task.taskType}</span>
                              <span className="ml-2 text-slate-400 text-xs">({task.location})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.criticality === 'Critical' && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                                Critical
                              </span>
                            )}
                            <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold border border-slate-200 text-slate-600">
                              {task.department}
                            </span>
                            <span className="font-mono font-semibold text-slate-700">
                              {task.estimatedDuration}m
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Dynamic Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                <div>
                  <span className="text-slate-500 block text-xs">Total Duration</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {Math.floor(totalDurationMin / 60)}h {totalDurationMin % 60}m ({totalDurationMin} min)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Window Capacity</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {windowDurationMin} min ({windowDurationMin / 60}h)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Safety Buffer</span>
                  <span className="font-mono font-bold text-sm text-slate-700">
                    {SAFETY_BUFFER_MIN} min
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Utilization</span>
                  <span
                    className={cn(
                      'font-mono font-bold text-sm',
                      isExceedingWindow
                        ? 'text-red-600'
                        : isViolatingBuffer
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    )}
                  >
                    {utilizationPct}%
                  </span>
                </div>
              </div>

              {/* Capacity Status Alert */}
              {isExceedingWindow ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Infeasible Block Size</span>
                    Selected tasks require {totalDurationMin}m which exceeds the {windowDurationMin}m window. Click &apos;Modify&apos; to deselect tasks.
                  </div>
                </div>
              ) : isViolatingBuffer ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Safety Buffer Encroached</span>
                    Available time is {availableWorkingTime}m (with {SAFETY_BUFFER_MIN}m buffer). Current work requires {totalDurationMin}m.
                  </div>
                </div>
              ) : null}

              {/* Dependency Alerts */}
              {dependencyWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="size-3.5 text-amber-600" />
                    <span>Dependency Notice</span>
                  </div>
                  {dependencyWarnings.map((w, idx) => (
                    <p key={idx} className="text-amber-900">• {w}</p>
                  ))}
                </div>
              )}

              {/* Phase 3: Conflict Status Section */}
              {conflictAnalysis.hasConflict ? (
                <div className="rounded-lg border border-red-200 bg-red-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <AlertTriangle className="size-4 text-red-600 shrink-0" />
                      <span>CONFLICT DETECTED ({conflictAnalysis.conflicts.length})</span>
                    </div>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-200 uppercase tracking-wider">
                      {conflictAnalysis.hasBlockingConflict ? 'Critical Blocking' : 'Warning'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {conflictAnalysis.conflicts.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-md border border-red-200/90 bg-white p-2.5 text-xs space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-red-500 shrink-0" />
                            {c.title}
                          </span>
                          <span className="font-mono text-xs font-bold text-red-700">{c.time}</span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{c.description}</p>
                        {c.suggestedAction && (
                          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 mt-1">
                            <span className="text-amber-800 font-medium">💡 {c.suggestedAction}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveWindowId(activeWindowId === 'w1' ? 'w2' : 'w1')}
                              className="h-6 text-xs px-2.5 cursor-pointer border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 font-semibold"
                            >
                              Switch Window
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : isFeasible ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>✓ NO SCHEDULING CONFLICTS DETECTED</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-mono font-medium">Timetable &amp; Track Paths Clear</span>
                </div>
              ) : null}

              {/* Dynamic Why Recommended? */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Why recommended?</span>
                </div>
                <ul className="space-y-1 text-xs text-emerald-950 list-disc list-inside leading-relaxed">
                  {recommendationReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleApprove}
                  disabled={
                    selectedTasks.length === 0 ||
                    isExceedingWindow ||
                    conflictAnalysis.hasBlockingConflict
                  }
                  className={cn(
                    'gap-2 text-xs font-semibold px-5 cursor-pointer',
                    isApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary'
                  )}
                >
                  <Check className="size-4" />
                  {isApproved ? 'Plan Approved' : 'Approve Plan'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsModifying(!isModifying)}
                  className="gap-2 text-xs font-medium cursor-pointer"
                >
                  <Edit3 className="size-3.5" />
                  {isModifying ? 'Done Modifying' : 'Modify'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams({
                      corridorId: selectedCorridorId,
                      start: activeWindow.start,
                      end: activeWindow.end,
                      date: selectedDate,
                      taskIds: selectedTaskIds.join(','),
                    })
                    router.push(`/what-if?${params.toString()}`)
                  }}
                  className="gap-2 text-xs font-medium cursor-pointer border-indigo-700/60 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Run What-If
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams({
                      corridorId: selectedCorridorId,
                      section: activeWindow.section || 'PKU–KGP',
                      start: activeWindow.start,
                      end: activeWindow.end,
                      date: selectedDate,
                      taskIds: selectedTaskIds.join(','),
                    })
                    router.push(`/network-coordination?${params.toString()}`)
                  }}
                  className="gap-2 text-xs font-medium cursor-pointer border-cyan-700/60 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50"
                >
                  <Network className="size-3.5" />
                  Check Network Impact
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams({
                      incidentId: 'INC-001',
                      corridorId: selectedCorridorId,
                      section: activeWindow.section || 'PKU–KGP',
                      start: activeWindow.start,
                      end: activeWindow.end,
                      date: selectedDate,
                    })
                    router.push(`/disruptions?${params.toString()}`)
                  }}
                  className="gap-2 text-xs font-medium cursor-pointer border-amber-700/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50"
                >
                  <Radio className="size-3.5" />
                  Check Disruption Impact
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams({
                      corridorId: selectedCorridorId,
                      date: selectedDate,
                      taskIds: selectedTaskIds.join(','),
                    })
                    router.push(`/optimization?${params.toString()}`)
                  }}
                  className="gap-2 text-xs font-medium cursor-pointer border-emerald-700/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                >
                  <Sparkles className="size-3.5" />
                  Optimize Block Plan
                </Button>

                {conflictAnalysis.hasBlockingConflict && (
                  <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="size-3.5" />
                    Approval blocked: Resolve critical conflict first.
                  </span>
                )}

                {isApproved && (
                  <span className="text-xs text-emerald-700 font-medium">
                    ✓ Ready for execution on {selectedDate}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Secondary Available Window Card */}
          <div className="space-y-4">
            <Card
              className={cn(
                'border transition-all shadow-xs',
                activeWindowId === 'w2' ? 'border-primary bg-white' : 'border-border bg-white'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">
                    {windows.w2.timeRange}
                  </span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    {windows.w2.tag}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Duration: <strong>{windows.w2.durationMin / 60} hours</strong> ({windows.w2.durationMin} min) ·{' '}
                  <span className="text-amber-700 font-medium">{windows.w2.suitability}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  {windows.w2.note}
                </p>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Window:</span>
                    <strong className="text-slate-800">{windows.w2.start} – {windows.w2.end}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Safe Working Time:</span>
                    <strong className="text-slate-800">
                      {windows.w2.durationMin - SAFETY_BUFFER_MIN}m (after buffer)
                    </strong>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newWindowId = activeWindowId === 'w2' ? 'w1' : 'w2'
                    setActiveWindowId(newWindowId)
                    toast.info(`Switched view to ${windows[newWindowId].timeRange} window`)
                  }}
                  className="w-full text-xs cursor-pointer"
                >
                  {activeWindowId === 'w2' ? 'Viewing This Window' : 'View Window'}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Helper Note */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
              <span className="font-semibold text-slate-800 block">Planner Guidance</span>
              <p className="leading-relaxed">
                Indian Railways block rules mandate minimum 10 min safety buffer before and after passenger trains. Both windows adhere to SER working time-table margins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

