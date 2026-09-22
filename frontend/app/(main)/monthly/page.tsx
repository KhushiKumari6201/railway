'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CalendarRange,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  CalendarPlus,
  Wrench,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppState } from '@/lib/app-state-context'
import type { MaintenanceTask, Department } from '@/lib/types'
import { monthlyCorridorCapacity } from '@/lib/data/dashboard'
import { corridorName, corridors } from '@/lib/data/corridors'
import { cn } from '@/lib/utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const weeklyPlanSummaries = [
  {
    week: 'Week 1 (1–7 Sep 2026)',
    summary: 'Track deep screening on C01 (Howrah–Kharagpur) and signal interlocking check at Kharagpur Yard.',
    plannedBlocks: 4,
    hours: '14.5 h',
    status: 'Completed',
  },
  {
    week: 'Week 2 (8–14 Sep 2026)',
    summary: 'OHE insulator replacement on C02 (KGP–Bhubaneswar) and turnout tamping across 3 station yards.',
    plannedBlocks: 5,
    hours: '16.0 h',
    status: 'Completed',
  },
  {
    week: 'Week 3 (15–21 Sep 2026) — CURRENT',
    summary: 'Rail defect rectification on C03 (KGP–Tatanagar) and TSS substation maintenance at Kharagpur.',
    plannedBlocks: 5,
    hours: '16.2 h',
    status: 'Active Planning',
  },
  {
    week: 'Week 4 (22–30 Sep 2026)',
    summary: 'Bridge deck bearing inspection on C05 (KGP–Digha) and power block on Adra section.',
    plannedBlocks: 4,
    hours: '15.5 h',
    status: 'Scheduled',
  },
]

const unscheduledExceptions = [
  {
    type: 'Critical Task Not Yet Planned',
    item: 'ENG-221 (Rail Fracture Repair at KM 118, C01)',
    reason: 'Traffic density peak during suburban morning hours; no 2-hour window available without local EMU regulation.',
    action: 'Carry forward to Sunday maintenance corridor or request 90-minute night power block.',
  },
  {
    type: 'Capacity Shortage',
    item: 'Corridor C01 (Howrah – Kharagpur)',
    reason: 'Demand of 22.5 hours exceeds total available line possession capacity of 18.0 hours this month.',
    action: 'Prioritize critical track work; defer routine ballast cleaning to October cycle.',
  },
  {
    type: 'Block Conflict',
    item: 'CF-02 on Corridor C02 (Balasore Section)',
    reason: 'Overlap between scheduled freight goods train BCN/321 and planned OHE maintenance.',
    action: 'Shift maintenance block by 25 minutes after dispatch of passenger express.',
  },
]

export default function MonthlyPage() {
  const { tasks, recommendedBlocks, scheduleTaskDate } = useAppState()

  // Calendar month state: September 2026 (year 2026, month 8 in 0-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(8) // 0-indexed: 8 = September

  // Filters
  const [criticalOnly, setCriticalOnly] = useState(true)
  const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all')
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all')

  // Selected Day for inspection
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>('2026-09-14')

  // Dialog state for scheduling / viewing a task
  const [inspectTask, setInspectTask] = useState<MaintenanceTask | null>(null)
  const [targetDateInput, setTargetDateInput] = useState<string>('')

  // Derived counts
  const criticalTasks = useMemo(
    () => tasks.filter((t) => t.criticality === 'Critical'),
    [tasks]
  )

  const scheduledCriticalCount = useMemo(
    () => criticalTasks.filter((t) => t.status === 'Scheduled' || t.status === 'Completed').length,
    [criticalTasks]
  )

  const openCriticalCount = useMemo(
    () => criticalTasks.filter((t) => t.status === 'Open').length,
    [criticalTasks]
  )

  // Map each task to its effective calendar date (prefer scheduledDate, then dueDate if in matching month)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (criticalOnly && t.criticality !== 'Critical') return false
      if (selectedDept !== 'all' && t.department !== selectedDept) return false
      if (selectedCorridor !== 'all' && t.corridorId !== selectedCorridor) return false
      return true
    })
  }, [tasks, criticalOnly, selectedDept, selectedCorridor])

  // Calendar matrix generator for currentYear and currentMonth
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Sunday is 0, Monday is 1 in JS getDay(). Convert so Mon=0, Sun=6
    let startingDay = firstDay.getDay() - 1
    if (startingDay === -1) startingDay = 6

    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const cells: {
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      tasks: MaintenanceTask[]
      blocks: typeof recommendedBlocks
    }[] = []

    // Previous month padding
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        tasks: [],
        blocks: [],
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      // Tasks matching this date (either scheduledDate, or fallback to dueDate if no scheduledDate)
      const dayTasks = filteredTasks.filter((t) => {
        const taskDate = t.scheduledDate || t.dueDate
        return taskDate === dateStr
      })

      const dayBlocks = recommendedBlocks.filter((b) => b.date === dateStr)

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        tasks: dayTasks,
        blocks: dayBlocks,
      })
    }

    // Next month padding to fill complete weeks (up to multiple of 7)
    const remainingCells = 7 - (cells.length % 7)
    if (remainingCells < 7) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      for (let i = 1; i <= remainingCells; i++) {
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        cells.push({
          dateStr,
          dayNum: i,
          isCurrentMonth: false,
          tasks: [],
          blocks: [],
        })
      }
    }

    return cells
  }, [currentYear, currentMonth, filteredTasks, recommendedBlocks])

  // Navigation functions
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleScheduleTask = () => {
    if (!inspectTask || !targetDateInput) return
    scheduleTaskDate(inspectTask.id, targetDateInput)
    toast.success(`Task ${inspectTask.id} Scheduled on Monthly Calendar`, {
      description: `Allocated to maintenance window on ${targetDateInput}.`,
    })
    setSelectedDateStr(targetDateInput)
    setInspectTask(null)
  }

  // Selected Day's details
  const selectedDayData = useMemo(() => {
    if (!selectedDateStr) return null
    return calendarCells.find((c) => c.dateStr === selectedDateStr) || null
  }, [selectedDateStr, calendarCells])

  const totalDemand = monthlyCorridorCapacity.reduce((s, c) => s + c.demandHours, 0)
  const totalCapacity = monthlyCorridorCapacity.reduce((s, c) => s + c.capacityHours, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">
            SOUTH EASTERN RAILWAY · KHARAGPUR DIVISION
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Monthly Maintenance Plan &amp; Calendar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calendar-based maintenance scheduling for Critical queue items, department possessions, and monthly block allocations
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="px-3 py-1.5 rounded-lg border border-border bg-white font-mono text-xs font-bold text-slate-800 shadow-xs min-w-[135px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-xs text-muted-foreground font-medium">Critical Queue Tasks</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-red-700 tabular-nums">
              {criticalTasks.length}
            </span>
            <span className="text-xs font-medium text-slate-500">
              ({scheduledCriticalCount} scheduled, {openCriticalCount} open)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Mapped to monthly calendar</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Queue Tasks</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">{tasks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Across TMS, SMMS &amp; TDMS</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Planned Block Hours</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">{totalDemand} h</p>
          <p className="text-xs text-muted-foreground mt-0.5">Allocated for {MONTH_NAMES[currentMonth]}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Capacity Utilization</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {Math.round((totalDemand / totalCapacity) * 100)}%
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">
            {totalCapacity}h available possession
          </p>
        </Card>
      </section>

      {/* CRITICAL PRIORITY SECTION: Maintenance Queue Critical Workload */}
      <Card className="border-red-200 bg-red-50/20">
        <CardHeader className="pb-3 border-b border-red-100 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-red-100 text-red-700">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Critical Priority Maintenance Queue (TMS / SMMS / TDMS)
              </CardTitle>
              <p className="text-xs text-slate-600">
                High-urgency items from the work backlog stored and scheduled into the monthly calendar plan
              </p>
            </div>
          </div>
          <Button size="xs" variant="outline" asChild className="gap-1 bg-white border-red-200 text-red-700 hover:bg-red-50">
            <Link href="/queue">
              <span>View Full Queue ({tasks.length})</span>
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {criticalTasks.map((t) => {
              const assignedDate = t.scheduledDate || t.dueDate
              const isAssigned = !!t.scheduledDate
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (t.scheduledDate) {
                      setSelectedDateStr(t.scheduledDate)
                    }
                  }}
                  className={cn(
                    "rounded-lg border p-3 transition-all cursor-pointer text-xs space-y-2",
                    selectedDateStr === assignedDate
                      ? "border-red-500 bg-white ring-2 ring-red-400/30 shadow-xs"
                      : "border-red-200/80 bg-white hover:border-red-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">{t.id}</span>
                      <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-xs font-bold text-red-700">
                        Critical
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-semibold",
                        t.status === 'Scheduled'
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : t.status === 'Completed'
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      )}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p className="font-medium text-slate-800 line-clamp-1">{t.taskType}</p>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <span>
                      {t.department} · {corridorName(t.corridorId)}
                    </span>
                    <span className="font-mono font-semibold text-slate-700">
                      {t.estimatedDuration}m ({t.requiredBlockType.split(' ')[0]})
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-slate-700 font-mono text-xs">
                      <CalendarDays className="size-3 text-red-600" />
                      <span>{assignedDate || 'Unscheduled'}</span>
                      {isAssigned && <span className="text-xs text-emerald-600 font-bold">✓</span>}
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setInspectTask(t)
                        setTargetDateInput(t.scheduledDate || t.dueDate || '2026-09-14')
                      }}
                      className="h-6 text-xs px-2 cursor-pointer bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700"
                    >
                      <CalendarPlus className="size-3 mr-1" />
                      {isAssigned ? 'Reschedule' : 'Set Date'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION: Monthly Calendar View */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-5 text-primary" />
              <div>
                <CardTitle className="text-base">
                  {MONTH_NAMES[currentMonth]} {currentYear} Maintenance Calendar
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Day-by-day distribution of critical track, signal, and power block maintenance
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button
                size="xs"
                variant={criticalOnly ? "default" : "outline"}
                onClick={() => setCriticalOnly(!criticalOnly)}
                className={cn(
                  "gap-1 h-7 text-xs font-semibold cursor-pointer",
                  criticalOnly && "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                <ShieldAlert className="size-3" />
                Critical Only ({criticalTasks.length})
              </Button>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value as Department | 'all')}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">All Departments</option>
                <option value="Engineering">Engineering (TMS)</option>
                <option value="S&T">S&amp;T (SMMS)</option>
                <option value="Traction">Traction (TDMS)</option>
              </select>

              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">All Corridors</option>
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} ({c.name.split('–')[0].trim()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5">
          {/* Calendar Grid Header (Mon to Sun) */}
          <div className="grid grid-cols-7 border border-slate-200 rounded-t-lg bg-slate-100/80 text-center font-bold text-xs text-slate-700 divide-x divide-slate-200">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} className="py-2">
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 border-x border-b border-slate-200 rounded-b-lg divide-x divide-y divide-slate-200 bg-white">
            {calendarCells.map((cell, idx) => {
              const isSelected = selectedDateStr === cell.dateStr
              const hasCritical = cell.tasks.some((t) => t.criticality === 'Critical')
              const hasBlocks = cell.blocks.length > 0
              const totalItems = cell.tasks.length + cell.blocks.length

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => cell.isCurrentMonth && setSelectedDateStr(cell.dateStr)}
                  className={cn(
                    "min-h-[105px] p-1.5 sm:p-2 transition-all flex flex-col justify-between",
                    !cell.isCurrentMonth
                      ? "bg-slate-50/60 opacity-40 select-none cursor-default"
                      : "cursor-pointer hover:bg-blue-50/40",
                    isSelected && cell.isCurrentMonth && "ring-2 ring-primary ring-inset bg-blue-50/30",
                    hasCritical && cell.isCurrentMonth && "bg-red-50/15"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-xs font-mono font-bold",
                        isSelected
                          ? "bg-primary text-white"
                          : hasCritical
                          ? "text-red-700 font-black bg-red-100/70"
                          : "text-slate-700"
                      )}
                    >
                      {cell.dayNum}
                    </span>

                    {totalItems > 0 && cell.isCurrentMonth && (
                      <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] font-bold text-slate-700">
                        {totalItems}
                      </span>
                    )}
                  </div>

                  {/* Task Badges in Calendar Day */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {cell.tasks.slice(0, 2).map((t) => {
                      const isCrit = t.criticality === 'Critical'
                      return (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDateStr(cell.dateStr)
                            setInspectTask(t)
                            setTargetDateInput(t.scheduledDate || t.dueDate || cell.dateStr)
                          }}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate border cursor-pointer transition-transform hover:scale-[1.02]",
                            isCrit
                              ? "border-red-300 bg-red-50 text-red-900 font-semibold"
                              : "border-blue-200 bg-blue-50 text-primary"
                          )}
                          title={`${t.id}: ${t.taskType} (${t.department})`}
                        >
                          <span className="font-mono font-bold mr-1">{t.id}</span>
                          <span className="truncate">{t.taskType}</span>
                        </div>
                      )
                    })}

                    {/* AI Recommended Block badge if present */}
                    {cell.blocks.slice(0, 1).map((b) => (
                      <div
                        key={b.id}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate border border-emerald-300 bg-emerald-50 text-emerald-900"
                        title={`${b.id}: ${b.section} (${b.start}–${b.end})`}
                      >
                        <span className="font-mono font-bold mr-1">{b.id}</span>
                        <span className="font-mono">{b.start}–{b.end}</span>
                      </div>
                    ))}

                    {cell.tasks.length > 2 && (
                      <div className="text-[10px] font-bold text-slate-500 pl-1">
                        +{cell.tasks.length - 2} more tasks
                      </div>
                    )}
                  </div>

                  {/* Footer status pill */}
                  {hasCritical && cell.isCurrentMonth && (
                    <div className="mt-1 pt-0.5 border-t border-red-100 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-red-600">Critical</span>
                      <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-red-500" />
                <strong className="text-slate-900">Critical Priority Task</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-emerald-500" />
                <span>AI Recommended Block</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-blue-500" />
                <span>Normal Scheduled Maintenance</span>
              </span>
            </div>
            <span className="text-slate-500">
              Click any calendar day to inspect scheduled maintenance activities
            </span>
          </div>
        </CardContent>
      </Card>

      {/* DAY DETAIL INSPECTOR: Shows tasks and maintenance scheduled on selected day */}
      {selectedDayData && (
        <Card className="border-2 border-blue-200 bg-white">
          <CardHeader className="pb-3 border-b border-border/80 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white font-mono font-bold text-sm">
                {selectedDayData.dayNum}
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Maintenance Schedule for {selectedDayData.dateStr}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedDayData.tasks.length} tasks scheduled · {selectedDayData.blocks.length} AI corridor block windows
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                asChild
                className="text-xs gap-1 cursor-pointer"
              >
                <Link href="/planner">
                  <span>Open Block Planner</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {selectedDayData.tasks.length === 0 && selectedDayData.blocks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">No maintenance items currently scheduled on {selectedDayData.dateStr}.</p>
                <p>Select any Critical task from the queue above and click &quot;Set Date&quot; to assign it to this date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* List of Tasks for this Day */}
                {selectedDayData.tasks.map((t) => {
                  const isCrit = t.criticality === 'Critical'
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-colors",
                        isCrit ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-slate-50/60"
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">{t.id}</span>
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-bold",
                              isCrit
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {t.criticality}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="font-semibold text-slate-800">{t.department}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-600">{corridorName(t.corridorId)}</span>
                        </div>
                        <p className="font-medium text-slate-800">{t.taskType}</p>
                        <p className="text-slate-500 text-xs">{t.location} · Asset: {t.assetId} ({t.assetType})</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-slate-200 sm:pl-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Required Block</span>
                          <span className="font-mono font-bold text-slate-800">{t.estimatedDuration}m</span>
                          <span className="text-xs text-slate-600 block">{t.requiredBlockType}</span>
                        </div>

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setInspectTask(t)
                            setTargetDateInput(t.scheduledDate || t.dueDate || selectedDayData.dateStr)
                          }}
                          className="h-7 text-xs bg-white cursor-pointer"
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* List of Blocks for this Day */}
                {selectedDayData.blocks.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-900">{b.id}</span>
                        <span className="rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs">
                          {b.blockType}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-semibold text-slate-800">{corridorName(b.corridorId)}</span>
                      </div>
                      <p className="font-medium text-slate-800">
                        Section: {b.section} · Window: {b.start} – {b.end} ({Math.floor(b.durationMin / 60)}h {b.durationMin % 60}m)
                      </p>
                      <p className="text-slate-600 text-xs">Bundled Tasks: {b.taskIds.join(', ')} · Utilization: {b.utilization}%</p>
                    </div>

                    <div className="shrink-0">
                      <Button size="xs" variant="outline" asChild className="bg-white border-emerald-300 text-emerald-800">
                        <Link href="/recommendations">Review Block</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CORRIDOR SUMMARY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Corridor Summary</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Monthly workload and possession capacity distribution across division corridors
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Corridor</th>
                  <th className="px-3.5 py-2.5">Tasks</th>
                  <th className="px-3.5 py-2.5">Planned Hours</th>
                  <th className="px-3.5 py-2.5">Available Hours</th>
                  <th className="px-3.5 py-2.5 text-right">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {monthlyCorridorCapacity.map((c) => {
                  const util = Math.round((c.demandHours / c.capacityHours) * 100)
                  return (
                    <tr key={c.corridor} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-semibold text-slate-900">
                        {corridorName(c.corridor)}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-700">
                        {c.criticalOpen + 12} tasks
                      </td>
                      <td className="px-3.5 py-3 font-mono text-primary font-bold">
                        {c.demandHours} h
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600">
                        {c.capacityHours} h
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold ${
                            util > 100
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : util > 85
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {util}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* WEEKLY PLAN */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Plan</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grouped 4-week block execution schedule for September 2026
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyPlanSummaries.map((w) => (
              <div
                key={w.week}
                className="rounded-lg border border-border bg-slate-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{w.week}</span>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                        w.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.status === 'Active Planning'
                          ? 'bg-blue-100 text-blue-800 font-bold'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{w.summary}</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0 sm:border-l sm:border-border sm:pl-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block font-sans">Blocks</span>
                    <span className="font-bold text-slate-800">{w.plannedBlocks} blocks</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block font-sans">Time</span>
                    <span className="font-bold text-primary">{w.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* UNSCHEDULED / EXCEPTIONS */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <CardTitle className="text-base">Unscheduled / Exceptions</CardTitle>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Items requiring special block extension or departmental review
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unscheduledExceptions.map((exc) => (
              <div
                key={exc.item}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">{exc.type}</span>
                  <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                    Exception
                  </span>
                </div>
                <div className="font-semibold text-slate-900">{exc.item}</div>
                <p className="text-slate-700 leading-relaxed">{exc.reason}</p>
                <div className="pt-1 text-xs text-primary font-medium">
                  → Recommended Action: {exc.action}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TASK INSPECTION & SCHEDULING DIALOG */}
      {inspectTask && (
        <Dialog open={!!inspectTask} onOpenChange={(open) => !open && setInspectTask(null)}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {inspectTask.id}
                </span>
                <span className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">
                  {inspectTask.criticality} Priority
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                {inspectTask.taskType}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {inspectTask.department} · {inspectTask.assetType} ({inspectTask.assetId}) · {inspectTask.location}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Corridor:</span>
                  <span className="font-semibold text-slate-800">{corridorName(inspectTask.corridorId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Block Window:</span>
                  <span className="font-mono font-bold text-slate-900">{inspectTask.estimatedDuration} min ({inspectTask.requiredBlockType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Crew:</span>
                  <span className="font-medium text-slate-800">{inspectTask.crew}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Due Date:</span>
                  <span className="font-mono text-slate-700">{inspectTask.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-primary">{inspectTask.status}</span>
                </div>
              </div>

              {/* Date Input for Monthly Calendar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" />
                  <span>Assign to Date in Monthly Calendar:</span>
                </label>
                <input
                  type="date"
                  value={targetDateInput}
                  onChange={(e) => setTargetDateInput(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary font-mono font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  Setting this date maps this critical task to the day&apos;s block schedule on the Monthly Plan calendar.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectTask(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleScheduleTask}
                className="text-xs gap-1.5 bg-primary font-semibold cursor-pointer"
              >
                <Check className="size-3.5" />
                Save &amp; Schedule on Calendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
