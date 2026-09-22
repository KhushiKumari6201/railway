'use client'

import { useState } from 'react'
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
  ArrowRight,
  TrainTrack,
  Search,
} from 'lucide-react'
import { corridors, corridorName } from '@/lib/data/corridors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'

import { useAppState } from '@/lib/app-state-context'

interface CandidateTask {
  id: string
  name: string
  dept: string
  durationMin: number
  selected: boolean
}

export function PlannerView() {
  const { recommendedBlocks, approveBlock } = useAppState()
  const [selectedDate, setSelectedDate] = useState('2026-09-24')
  const [selectedCorridorId, setSelectedCorridorId] = useState('C03')
  const [isSearching, setIsSearching] = useState(false)
  const [activeWindowId, setActiveWindowId] = useState<'w1' | 'w2'>('w1')
  const [isApproved, setIsApproved] = useState(false)
  const [isModifying, setIsModifying] = useState(false)

  const [tasks, setTasks] = useState<CandidateTask[]>([
    { id: 'ENG-221', name: 'Rail inspection & weld check', dept: 'Engineering', durationMin: 45, selected: true },
    { id: 'SNT-221', name: 'Signal point machine verification', dept: 'S&T', durationMin: 35, selected: true },
    { id: 'TD-101', name: 'OHE contact wire height inspection', dept: 'Traction', durationMin: 40, selected: true },
  ])

  const selectedTasks = tasks.filter((t) => t.selected)
  const totalDurationMin = selectedTasks.reduce((acc, t) => acc + t.durationMin, 0)
  const windowDurationMin = activeWindowId === 'w1' ? 120 : 90
  const utilizationPct = Math.min(100, Math.round((totalDurationMin / windowDurationMin) * 100))

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    )
  }

  const handleFindBlock = () => {
    setIsSearching(true)
    setTimeout(() => {
      setIsSearching(false)
      setIsApproved(false)
      toast.success('Optimal Block Found', {
        description: `Found 2 available maintenance windows for ${corridorName(selectedCorridorId)} on ${selectedDate}.`,
      })
    }, 350)
  }

  const handleApprove = () => {
    setIsApproved(true)
    setIsModifying(false)
    const matchingBlock = recommendedBlocks.find((b) => b.corridorId === selectedCorridorId) || recommendedBlocks[0]
    if (matchingBlock) {
      approveBlock(matchingBlock.id)
    } else {
      approveBlock('REC-101')
    }
    toast.success('Block Plan Approved', {
      description: `10:00–12:00 block on ${corridorName(selectedCorridorId)} marked as Approved. Notice dispatched to Divisional Operating Control.`,
    })
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
            <span className={cn(
              "flex size-5 items-center justify-center rounded-full text-xs font-bold",
              isApproved ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
            )}>
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
              className="h-9 gap-2 text-xs font-semibold w-full"
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
          {/* Main Recommended Window Card */}
          <Card className={cn(
            "lg:col-span-2 border-2 transition-all shadow-xs",
            activeWindowId === 'w1' ? "border-primary bg-white" : "border-border bg-slate-50/50"
          )}>
            <CardHeader className="border-b border-border/80 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      10:00 AM – 12:00 PM
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                      <Sparkles className="size-3" />
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Duration: <strong>2 hours</strong> · Availability: <span className="text-emerald-700 font-semibold">Good</span> · Up &amp; Down Lines
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right sm:block hidden">
                    <span className="text-xs uppercase font-bold text-slate-400 block">Corridor</span>
                    <span className="text-xs font-bold text-slate-700">{corridorName(selectedCorridorId)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-5">
              {/* Candidate Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Candidate Tasks ({selectedTasks.length} selected)
                  </span>
                  {isModifying && (
                    <span className="text-xs text-primary font-medium">
                      Check/uncheck tasks to modify block composition
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => isModifying && handleToggleTask(task.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-xs transition-colors",
                        task.selected
                          ? "border-blue-200 bg-blue-50/50 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-400 line-through",
                        isModifying && "cursor-pointer hover:border-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.selected}
                          onChange={() => handleToggleTask(task.id)}
                          disabled={!isModifying}
                          className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-900 mr-2">{task.id}</span>
                          <span className="font-medium text-slate-800">{task.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold border border-slate-200 text-slate-600">
                          {task.dept}
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {task.durationMin}m
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                <div>
                  <span className="text-slate-500 block text-xs">Total Duration</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {Math.floor(totalDurationMin / 60)}h {totalDurationMin % 60}m ({totalDurationMin} min)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Window Capacity</span>
                  <span className="font-mono font-bold text-sm text-slate-900">120 min (2.0h)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Utilization</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    {utilizationPct}%
                  </span>
                </div>
              </div>

              {/* Why Recommended? */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Why recommended?</span>
                </div>
                <ul className="space-y-1 text-xs text-emerald-950 list-disc list-inside leading-relaxed">
                  <li>All tasks are on the same corridor ({corridorName(selectedCorridorId)})</li>
                  <li>Tasks fit cleanly within the available 2-hour window (1h 40m required)</li>
                  <li>No dependency conflicts with adjacent signal interlocking</li>
                  <li>High-priority safety and track maintenance work is handled first</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleApprove}
                  className={cn(
                    "gap-2 text-xs font-semibold px-5",
                    isApproved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"
                  )}
                >
                  <Check className="size-4" />
                  {isApproved ? 'Plan Approved' : 'Approve Plan'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsModifying(!isModifying)}
                  className="gap-2 text-xs font-medium"
                >
                  <Edit3 className="size-3.5" />
                  {isModifying ? 'Done Modifying' : 'Modify'}
                </Button>

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
            <Card className={cn(
              "border transition-all shadow-xs",
              activeWindowId === 'w2' ? "border-primary bg-white" : "border-border bg-white"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">2:00 PM – 3:30 PM</span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    Secondary Window
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Duration: <strong>1.5 hours</strong> (90 min) · <span className="text-amber-700 font-medium">Lower suitability</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  Window overlaps with down freight traffic slot. Requires regulation of goods train BCN/321.
                </p>
                <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Window:</span>
                    <strong className="text-slate-800">14:00 – 15:30</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Suitable for:</span>
                    <strong className="text-slate-800">Single task (60m max)</strong>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveWindowId(activeWindowId === 'w2' ? 'w1' : 'w2')
                    toast.info(`Switched view to 14:00–15:30 window`)
                  }}
                  className="w-full text-xs"
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
