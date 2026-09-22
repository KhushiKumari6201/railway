'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, CalendarPlus, Clock, ShieldAlert } from 'lucide-react'
import type { MaintenanceTask } from '@/lib/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { corridorName } from '@/lib/data/corridors'
import { useAppState } from '@/lib/app-state-context'
import {
  criticalityTone,
  priorityTone,
  priorityLabel,
  taskStatusTone,
} from '@/lib/status'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

export function TaskDetail({
  task,
  open,
  onOpenChange,
}: {
  task: MaintenanceTask | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const { addTaskToPlan } = useAppState()

  if (!task) return null

  const handleAddToPlanner = () => {
    addTaskToPlan(task.id)
    toast.success(`Task ${task.id} selected for Block Planner`, {
      description: `Targeting corridor ${corridorName(task.corridorId)}`,
    })
    onOpenChange(false)
    router.push('/planner')
  }

  const handleSchedule = () => {
    addTaskToPlan(task.id)
    toast.success(`Task ${task.id} scheduled for upcoming block`, {
      description: `Assigned to ${task.crew}`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md bg-white">
        <SheetHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-slate-900">{task.id}</span>
            <StatusBadge tone={taskStatusTone(task.status)}>{task.status}</StatusBadge>
          </div>
          <SheetTitle className="text-sm font-semibold text-slate-800 text-left">
            {task.taskType}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground text-left">
            {task.department} · {task.assetType} {task.assetId} · {task.location}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Main Task Information */}
          <div className="rounded-lg border border-border bg-slate-50/70 p-3.5 space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Task Details
            </h4>
            <DetailRow label="Department" value={task.department} />
            <DetailRow label="Asset ID" value={`${task.assetType} (${task.assetId})`} />
            <DetailRow label="Corridor" value={corridorName(task.corridorId)} />
            <DetailRow
              label="Criticality"
              value={
                <StatusBadge tone={criticalityTone(task.criticality)} dot={false}>
                  {task.criticality}
                </StatusBadge>
              }
            />
            <DetailRow
              label="Due Date"
              value={new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
            <DetailRow
              label="Overdue Days"
              value={
                task.overdueDays > 0 ? (
                  <span className="font-bold text-red-600">{task.overdueDays} days overdue</span>
                ) : (
                  <span className="text-emerald-700 font-medium">On schedule</span>
                )
              }
            />
            <DetailRow
              label="Estimated Duration"
              value={`${Math.floor(task.estimatedDuration / 60)}h ${task.estimatedDuration % 60 ? `${task.estimatedDuration % 60}m` : ''} (${task.estimatedDuration} min)`}
            />
            <DetailRow label="Required Block" value={task.requiredBlockType} />
            <DetailRow
              label="Priority Score"
              value={
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-primary">{task.priority}/100</span>
                  <StatusBadge tone={priorityTone(task.priority)} dot={false}>
                    {priorityLabel(task.priority)}
                  </StatusBadge>
                </div>
              }
            />
          </div>

          {/* Why is this task important? */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <ShieldAlert className="size-4" />
              <span>Why is this task important?</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Criticality:</span>
                <span className="font-semibold text-slate-900">{task.criticality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Overdue:</span>
                <span className="font-semibold text-slate-900">
                  {task.overdueDays > 0 ? `${task.overdueDays} days` : 'None (Due on time)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Safety impact:</span>
                <span className="font-semibold text-slate-900">
                  {task.criticality === 'Critical' || task.criticality === 'High' ? 'High' : 'Medium'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Asset impact:</span>
                <span className="font-semibold text-slate-900">
                  {task.defectSeverity > 60 ? 'High' : 'Medium'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/70 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Recommended Priority:</span>
              <span className="font-bold text-primary text-sm">{priorityLabel(task.priority)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleAddToPlanner} className="flex-1 gap-1.5 text-xs">
              <CalendarPlus className="size-3.5" />
              Add to Block Planner
            </Button>
            <Button variant="outline" onClick={handleSchedule} className="flex-1 gap-1.5 text-xs">
              <CheckCircle2 className="size-3.5" />
              Mark Scheduled
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
