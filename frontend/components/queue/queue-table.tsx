'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, Search, Info } from 'lucide-react'
import { useAppState } from '@/lib/app-state-context'
import type { Department, MaintenanceTask, TaskStatus } from '@/lib/types'
import { corridors, corridorName } from '@/lib/data/corridors'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { TaskDetail } from '@/components/queue/task-detail'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  criticalityTone,
  priorityTone,
  taskStatusTone,
} from '@/lib/status'

type SortKey = 'priority' | 'dueDate' | 'overdueDays' | 'estimatedDuration'

const deptOptions: (Department | 'all')[] = ['all', 'Engineering', 'S&T', 'Traction']
const statusOptions: (TaskStatus | 'all')[] = ['all', 'Open', 'Scheduled', 'Completed']

export function QueueTable() {
  const { tasks } = useAppState()
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState<Department | 'all'>('all')
  const [corridor, setCorridor] = useState('all')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [asc, setAsc] = useState(false)
  const [selected, setSelected] = useState<MaintenanceTask | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = tasks.filter((t) => {
      if (dept !== 'all' && t.department !== dept) return false
      if (corridor !== 'all' && t.corridorId !== corridor) return false
      if (status !== 'all' && t.status !== status) return false
      if (q) {
        const hay = `${t.id} ${t.assetId} ${t.taskType} ${t.location} ${t.crew}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    rows.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return asc ? cmp : -cmp
    })
    return rows
  }, [tasks, query, dept, corridor, status, sortKey, asc])

  const selectedTask = useMemo(
    () => (selected ? tasks.find((t) => t.id === selected.id) ?? selected : null),
    [tasks, selected]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v)
    else {
      setSortKey(key)
      setAsc(false)
    }
  }

  function openTask(t: MaintenanceTask) {
    setSelected(t)
    setOpen(true)
  }

  const SortButton = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={cn('flex items-center gap-1 font-medium hover:text-foreground', className)}
    >
      {label}
      <ArrowUpDown className={cn('size-3', sortKey === k ? 'text-primary' : 'text-muted-foreground/50')} />
    </button>
  )

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, asset, location…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dept} onValueChange={(v) => setDept(v as Department | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {deptOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === 'all' ? 'All departments' : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={corridor} onValueChange={(v) => setCorridor(v ?? 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Corridor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All corridors</SelectItem>
              {corridors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground lg:ml-auto">
          {filtered.length} of {tasks.length} tasks
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="w-[110px]">
                  <div className="flex items-center gap-1">
                    <SortButton label="Priority" k="priority" />
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center text-muted-foreground/70 hover:text-foreground cursor-pointer focus:outline-none">
                            <Info className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs font-normal leading-normal">
                          Computed from criticality, overdue days, defect severity, corridor traffic density, and dependencies. Click a row for the full breakdown.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="hidden md:table-cell">Dept</TableHead>
                <TableHead className="hidden lg:table-cell">Corridor</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead className="hidden lg:table-cell">Block type</TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton label="Due" k="dueDate" />
                </TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  <SortButton label="Duration" k="estimatedDuration" className="ml-auto" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => openTask(t)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-9 items-center justify-center rounded-md font-mono text-sm font-semibold tabular-nums',
                          priorityTone(t.priority) === 'danger' && 'bg-danger-muted text-danger',
                          priorityTone(t.priority) === 'warning' && 'bg-warning-muted text-warning-foreground',
                          priorityTone(t.priority) === 'info' && 'bg-info-muted text-info',
                          priorityTone(t.priority) === 'neutral' && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t.priority}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                      </div>
                      <p className="font-medium leading-tight">{t.taskType}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{t.department}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-mono text-xs">{t.corridorId}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={criticalityTone(t.criticality)} dot={false}>
                      {t.criticality}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{t.requiredBlockType}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="text-sm">
                      {new Date(t.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      {t.overdueDays > 0 && (
                        <span className="block text-xs font-medium text-danger">
                          {t.overdueDays}d overdue
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-mono text-sm tabular-nums">
                    {t.estimatedDuration}m
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={taskStatusTone(t.status)}>{t.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No tasks match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TaskDetail task={selectedTask} open={open} onOpenChange={setOpen} />
    </div>
  )
}
