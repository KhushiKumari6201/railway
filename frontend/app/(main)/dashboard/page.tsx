'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Home,
  Check,
  Eye,
  TrainTrack,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AvailabilityChart } from '@/components/charts/availability-chart'
import { useAppState } from '@/lib/app-state-context'
import type { RecommendedBlock } from '@/lib/types'
import { exceptions } from '@/lib/data/conflicts'
import { corridorName } from '@/lib/data/corridors'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const {
    tasks,
    recommendedBlocks,
    conflicts,
    approveBlock,
    pendingTasksCount,
    criticalTasksCount,
    openConflictsCount,
  } = useAppState()

  const [reviewModalBlock, setReviewModalBlock] = useState<RecommendedBlock | null>(null)

  const dashboardKpis = [
    { id: 'pending', label: 'Pending Tasks', value: String(pendingTasksCount), tone: 'text-foreground', note: 'Across 5 corridors' },
    { id: 'critical', label: 'Critical Tasks', value: String(criticalTasksCount), tone: 'text-danger', note: 'Needs immediate block' },
    { id: 'avail-hours', label: 'Available Block Hours', value: '18.5 h', tone: 'text-foreground', note: 'Approved line capacity' },
    { id: 'planned-hours', label: 'Planned Block Hours', value: '16.2 h', tone: 'text-primary', note: 'Scheduled this week' },
    { id: 'availability', label: 'Asset Availability', value: '96.8%', tone: 'text-success', note: '↑ 1.4% from last week' },
    { id: 'conflicts', label: 'Conflicts', value: String(openConflictsCount), tone: 'text-warning', note: 'Needs traffic resolution' },
  ]

  const priorityTasks = tasks
    .filter((t) => t.status === 'Open' || t.status === 'Scheduled')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)

  const openConflicts = conflicts.filter((c) => !c.resolved)

  const handleApproveBlock = (blockId: string, corridor: string, date: string) => {
    approveBlock(blockId)
    toast.success(`Block Approved: ${corridor}`, {
      description: `Scheduled maintenance window confirmed for ${date}. Notice sent to Operating Control.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-center">
          <div className="p-5 md:p-6 md:col-span-2 lg:col-span-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3 text-primary" />
                KHARAGPUR DIVISION · SER
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="size-3 text-emerald-600" />
                This week&apos;s maintenance planning overview
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                title="Click logo to go to Public Home Page"
                className="relative h-10 w-48 shrink-0 hover:opacity-90 transition-opacity cursor-pointer block"
              >
                <Image
                  src="/images/rail-sanket-logo.png"
                  alt="Rail Sanket"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Operations &amp; Block Planning
              </h1>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Coordinating Engineering (TMS), S&amp;T (SMMS), and Traction (TDMS) maintenance block windows. Bundling tasks to minimize traffic possessions and eliminate train delays.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button size="sm" asChild>
                <Link href="/planner">
                  <CalendarClock className="size-3.5" />
                  Block Planner
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/recommendations">
                  Smart Recommendations
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/queue">
                  Maintenance Queue (85)
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900">
                <Link href="/" title="Return to Public Home Page">
                  <Home className="size-3.5 text-primary" />
                  <span>Public Home</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Locomotive Image Frame */}
          <div className="relative h-44 md:h-full min-h-[170px] w-full border-t md:border-t-0 md:border-l border-border bg-slate-100 overflow-hidden">
            <Image
              src="/images/train-photo.jpg"
              alt="Indian Railways Locomotive"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:to-black/30" />
            <div className="absolute bottom-2 left-3 right-3 text-white">
              <span className="text-xs font-medium tracking-wide uppercase text-slate-200 block">
                Indian Railways
              </span>
              <span className="text-xs font-bold leading-tight drop-shadow-sm block">
                WAP-4 · Kharagpur Operations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Banner: Single Most Important Action Right Now */}
      {(() => {
        const pendingCount = recommendedBlocks.filter((b) => b.status === 'Recommended').length
        return (
          <div className="rounded-xl border border-blue-200/40 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
                <Sparkles className="size-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                    Primary Action Required
                  </span>
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    {pendingCount} AI Blocks Awaiting Approval
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                  Review bundled multi-department block windows to prevent train detention &amp; corridor conflicts
                </h2>
              </div>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs shrink-0 gap-1.5 cursor-pointer" asChild>
              <Link href="/recommendations">
                <span>Review Recommendations ({pendingCount})</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )
      })()}

      {/* 6 KPI Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {dashboardKpis.map((k) => (
          <Card key={k.id} className="p-4">
            <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${k.tone}`}>{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.note}</p>
          </Card>
        ))}
      </section>

      {/* SECTION 1: Weekly Block Utilization */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Weekly Block Utilization</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Available Hours vs. Planned Hours across corridors (past 7 days)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-full bg-chart-1" /> Available Hours
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-full bg-chart-2" /> Planned Hours
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <AvailabilityChart />
        </CardContent>
      </Card>

      {/* SECTION 2: Recommended Blocks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recommended Blocks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Corridor windows ready for review and immediate approval
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/recommendations">
              View All Recommendations
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Corridor</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Time</th>
                  <th className="px-3.5 py-2.5">Duration</th>
                  <th className="px-3.5 py-2.5">Tasks</th>
                  <th className="px-3.5 py-2.5">Utilization</th>
                  <th className="px-3.5 py-2.5">Reason</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {recommendedBlocks.map((b) => {
                  const isApproved = b.status === 'Approved'
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {corridorName(b.corridorId)}
                      </td>
                      <td className="px-3.5 py-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {b.date}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {b.start} – {b.end}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {Math.floor(b.durationMin / 60)} hours
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {b.taskIds.length} tasks
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          83%
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 max-w-[240px]">
                        <p className="truncate text-slate-700 font-medium">
                          Same corridor · Tasks fit available window
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          No dependency conflict · High-priority work included
                        </p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            <Sparkles className="size-3 text-primary" />
                            Recommended
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setReviewModalBlock(b)}
                            className="h-7 text-xs gap-1 px-2 text-slate-700 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="size-3 text-slate-500" />
                            Review
                          </Button>
                          <Button
                            size="xs"
                            disabled={isApproved}
                            onClick={() => handleApproveBlock(b.id, corridorName(b.corridorId), b.date)}
                            className={cn(
                              "h-7 text-xs gap-1 px-2.5 font-semibold cursor-pointer",
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            <Check className="size-3" />
                            {isApproved ? 'Approved' : 'Approve'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Priority Maintenance Tasks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Priority Maintenance Tasks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Highest urgency maintenance items requiring block allocation
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/queue">
              Open Maintenance Queue
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Priority</th>
                  <th className="px-3.5 py-2.5">Task ID</th>
                  <th className="px-3.5 py-2.5">Task</th>
                  <th className="px-3.5 py-2.5">Department</th>
                  <th className="px-3.5 py-2.5">Corridor</th>
                  <th className="px-3.5 py-2.5">Due Date</th>
                  <th className="px-3.5 py-2.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {priorityTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          t.criticality === 'Critical'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : t.criticality === 'High'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {t.criticality}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {t.id}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-800">
                      {t.taskType}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                      {t.department}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                      {corridorName(t.corridorId)}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {t.dueDate}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-right text-slate-600 whitespace-nowrap">
                      {t.estimatedDuration} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Planning Alerts */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Planning Alerts</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Critical issues, conflicts, and overdue maintenance requiring attention
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/conflicts">
              Review Conflicts
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {/* Alert 1: Critical Task Not Scheduled */}
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-700 font-semibold text-xs mb-1.5">
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>Critical Task Not Scheduled</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {exceptions[0]?.taskId || 'ENG-221'} — {exceptions[0]?.reason || 'No feasible window found in C01 corridor.'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-red-200/60 flex items-center justify-between">
                <span className="text-xs font-mono text-red-600 font-semibold">Priority: Immediate</span>
                <Button size="xs" variant="outline" className="h-6 text-xs bg-white border-red-200 hover:bg-red-50 text-red-700" asChild>
                  <Link href="/planner">Find Window</Link>
                </Button>
              </div>
            </div>

            {/* Alert 2: Block Conflict */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs mb-1.5">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>Block Conflict Detected</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {openConflicts[0]?.title || 'Two maintenance plans overlap with Coromandel Express schedule on C01.'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-xs font-mono text-amber-700 font-semibold">Corridor: C01</span>
                <Button size="xs" variant="outline" className="h-6 text-xs bg-white border-amber-200 hover:bg-amber-50 text-amber-800" asChild>
                  <Link href="/conflicts">Resolve</Link>
                </Button>
              </div>
            </div>

            {/* Alert 3: Overdue Maintenance */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs mb-1.5">
                  <Clock className="size-4 shrink-0 text-blue-600" />
                  <span>Overdue Maintenance</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Track welding and point machine check on C03 are 4 days overdue safety inspection window.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200/60 flex items-center justify-between">
                <span className="text-xs font-mono text-blue-700 font-semibold">Asset: PWay Gang 5</span>
                <Button size="xs" variant="outline" className="h-6 text-xs bg-white border-blue-200 hover:bg-blue-50 text-blue-800" asChild>
                  <Link href="/queue">View Queue</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog for Recommended Block */}
      {reviewModalBlock && (
        <Dialog open={!!reviewModalBlock} onOpenChange={(open) => !open && setReviewModalBlock(null)}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {reviewModalBlock.id}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {reviewModalBlock.date}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                {corridorName(reviewModalBlock.corridorId)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Window: {reviewModalBlock.start} – {reviewModalBlock.end} ({Math.floor(reviewModalBlock.durationMin / 60)} hours)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bundled Tasks:</span>
                  <span className="font-mono font-bold text-slate-900">{reviewModalBlock.taskIds.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Window Utilization:</span>
                  <span className="font-mono font-bold text-emerald-700">83%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Section:</span>
                  <span className="font-semibold text-slate-800">{reviewModalBlock.section}</span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Recommendation Reason
                </span>
                <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                  <li>Same corridor alignment minimizes gang movement</li>
                  <li>Tasks fit into available traffic interval without detention</li>
                  <li>No dependency conflicts identified</li>
                  <li>High-priority safety inspection work included</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewModalBlock(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleApproveBlock(
                    reviewModalBlock.id,
                    corridorName(reviewModalBlock.corridorId),
                    reviewModalBlock.date
                  )
                  setReviewModalBlock(null)
                }}
                className="text-xs gap-1.5 bg-primary font-semibold"
              >
                <Check className="size-3.5" />
                Approve Block
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
