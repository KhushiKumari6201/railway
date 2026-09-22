'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  TrainFront,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppState } from '@/lib/app-state-context'
import { corridorName } from '@/lib/data/corridors'

export default function RecommendationsPage() {
  const { recommendedBlocks, approveBlock, rejectBlock } = useAppState()

  const handleApprove = (id: string, corridorCode: string) => {
    approveBlock(id)
    toast.success(`Recommendation ${id} Approved`, {
      description: `Block plan for ${corridorCode} added to active weekly plan.`,
    })
  }

  const handleReject = (id: string) => {
    rejectBlock(id)
    toast.info(`Recommendation ${id} Deferred`, {
      description: 'Returned to queue for next scheduling cycle.',
    })
  }

  const approvedCount = recommendedBlocks.filter((b) => b.status === 'Approved').length
  const totalTasksCount = recommendedBlocks.reduce((acc, b) => acc + (b.taskIds?.length || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        badge="SOUTH EASTERN RAILWAY · KHARAGPUR DIVISION"
        title="Smart Recommendations"
        description="Explainable decision-support block recommendations. Review bundled tasks, corridor windows, and approve plans for the weekly schedule."
      >
        <Button
          onClick={() => {
            recommendedBlocks
              .filter((b) => b.status === 'Recommended')
              .forEach((b) => approveBlock(b.id))
            toast.success('All Pending Recommendations Approved', {
              description: 'Weekly block schedule updated and finalized.',
            })
          }}
          disabled={recommendedBlocks.every((b) => b.status !== 'Recommended')}
          className="text-xs gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="size-3.5" />
          Approve All Pending
        </Button>
      </PageHeader>

      {/* Summary KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Recommended Blocks</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{recommendedBlocks.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Across 5 corridors</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Approved by Planner</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">{approvedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{recommendedBlocks.length - approvedCount} pending review</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Tasks Bundled</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">{totalTasksCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">3 departments coordinated</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Avg. Window Utilization</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900">83.5%</p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">375 min downtime saved</p>
        </Card>
      </section>

      {/* Recommendation Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {recommendedBlocks.map((rec) => {
          const isApproved = rec.status === 'Approved'
          const isRejected = rec.status === 'Rejected'
          const corridorTitle = corridorName(rec.corridorId)
          return (
            <Card
              key={rec.id}
              className={`border-2 transition-all shadow-xs ${
                isApproved
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : isRejected
                  ? 'border-slate-200 bg-slate-50/40 opacity-70'
                  : 'border-border bg-white'
              }`}
            >
              <CardHeader className="border-b border-border/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{rec.id}</span>
                    <span className="text-base font-bold text-slate-900">
                      Recommended Block
                    </span>
                  </div>
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      <Check className="size-3" /> Approved
                    </span>
                  ) : isRejected ? (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                      Deferred
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-primary border border-blue-200">
                      {rec.confidence} Confidence
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Metrics Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-border bg-slate-50/80">
                  <div>
                    <span className="text-muted-foreground block text-xs">Corridor</span>
                    <strong className="text-slate-900">{corridorTitle}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Window</span>
                    <strong className="text-slate-900">{rec.start} – {rec.end}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Tasks</span>
                    <strong className="text-slate-900">{rec.taskIds.length} tasks</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Utilization</span>
                    <strong className="text-emerald-700">{rec.utilization}%</strong>
                  </div>
                </div>

                {/* Bundled Tasks */}
                <div>
                  <span className="text-xs font-semibold text-slate-600 block mb-1">
                    Bundled Maintenance Tasks:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.taskIds.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Why? Section */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-1.5">
                  <span className="font-bold text-slate-900 text-xs block">Why recommended?</span>
                  <ul className="space-y-1 text-slate-700 leading-relaxed">
                    {rec.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {!isApproved ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(rec.id, corridorTitle)}
                        className="flex-1 text-xs gap-1.5 font-semibold cursor-pointer"
                      >
                        <Check className="size-3.5" />
                        Approve Plan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(rec.id)}
                        className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Defer
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href="/planner">
                          Review in Planner
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                        <CheckCircle2 className="size-4" /> Ready for weekly block dispatch
                      </span>
                      <Button size="xs" variant="ghost" asChild>
                        <Link href="/planner">Inspect</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
