'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  TriangleAlert,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
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

import { useAppState } from '@/lib/app-state-context'
import type { Conflict } from '@/lib/types'
import { corridorName } from '@/lib/data/corridors'

export default function ConflictsPage() {
  const { conflicts, resolveConflict } = useAppState()
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null)

  const handleResolve = (item: Conflict) => {
    resolveConflict(item.id)
    setSelectedConflict(null)
    toast.success(`Conflict ${item.id} Resolved`, {
      description: item.suggestedAction,
    })
  }

  const openCount = conflicts.filter((c) => !c.resolved).length
  const criticalCount = conflicts.filter((c) => !c.resolved && c.severity === 'Critical').length
  const resolvedCount = conflicts.filter((c) => c.resolved).length

  return (
    <div className="space-y-6">
      <PageHeader
        badge="SOUTH EASTERN RAILWAY · KHARAGPUR DIVISION"
        title="Planning Conflicts"
        description="Active maintenance block overlaps and corridor constraint exceptions. Review issues and apply window resolutions."
      >
        <Button
          onClick={() => {
            conflicts.filter((c) => !c.resolved).forEach((c) => resolveConflict(c.id))
            toast.success('All Conflicts Resolved', {
              description: 'Applied recommended window adjustments across all corridors.',
            })
          }}
          disabled={openCount === 0}
          className="text-xs gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="size-3.5" />
          Resolve All
        </Button>
      </PageHeader>

      {/* Summary KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Open Conflicts</p>
          <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${openCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {openCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Requiring attention</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Critical Severity</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">{criticalCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Train path impact</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Resolved Conflicts</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">{resolvedCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Schedule updated</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Resolution Rate</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {conflicts.length > 0 ? Math.round((resolvedCount / conflicts.length) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Of active corridor issues</p>
        </Card>
      </section>

      {/* Main Conflicts Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Active Planning Conflicts</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Corridor window collisions and departmental coordination flags
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Conflict</th>
                  <th className="px-3.5 py-2.5">Time Window</th>
                  <th className="px-3.5 py-2.5">Corridor</th>
                  <th className="px-3.5 py-2.5">Issue</th>
                  <th className="px-3.5 py-2.5">Severity</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {conflicts.map((c) => (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      c.resolved ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                        <span>{c.title}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-700 whitespace-nowrap font-medium">
                      {c.time}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {corridorName(c.corridorId)}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 max-w-md">
                      <p className="leading-snug">{c.description}</p>
                      {c.resolved && (
                        <p className="text-xs text-emerald-700 font-medium mt-1">
                          ✓ Resolved: {c.suggestedAction}
                        </p>
                      )}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          c.severity === 'Critical'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : c.severity === 'Warning'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      {!c.resolved ? (
                        <Button
                          size="xs"
                          onClick={() => setSelectedConflict(c)}
                          className="h-7 text-xs font-semibold px-3 bg-primary hover:bg-primary/90 cursor-pointer"
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <Check className="size-3" /> Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      {selectedConflict && (
        <Dialog open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TriangleAlert className="size-4 text-amber-600" />
                Resolve Conflict: {selectedConflict.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedConflict.id} · {corridorName(selectedConflict.corridorId)} · {selectedConflict.time}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                <span className="font-semibold text-red-900 block mb-1">Identified Issue:</span>
                <p className="text-slate-700 leading-relaxed">{selectedConflict.description}</p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <span className="font-semibold text-emerald-900 block mb-1">Suggested Resolution:</span>
                <p className="text-slate-800 leading-relaxed font-medium">{selectedConflict.suggestedAction}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setSelectedConflict(null)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleResolve(selectedConflict)} className="text-xs gap-1.5 font-semibold cursor-pointer">
                <Check className="size-3.5" />
                Apply Resolution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
