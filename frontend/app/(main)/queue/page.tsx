'use client'

import { Download, Filter, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { QueueTable } from '@/components/queue/queue-table'
import { Card } from '@/components/ui/card'
import { useAppState } from '@/lib/app-state-context'

export default function QueuePage() {
  const { tasks } = useAppState()
  const open = tasks.filter((t) => t.status === 'Open').length
  const critical = tasks.filter((t) => t.criticality === 'Critical').length
  const overdue = tasks.filter((t) => t.overdueDays > 0).length

  const stats = [
    { label: 'Open tasks', value: open },
    { label: 'Critical priority', value: critical, tone: 'text-danger' },
    { label: 'Overdue items', value: overdue, tone: 'text-warning-foreground' },
    { label: 'Total normalized', value: tasks.length },
  ]

  function exportCsv() {
    const headers = [
      'Task ID',
      'Source System',
      'Department',
      'Asset ID',
      'Corridor',
      'Task Type',
      'Criticality',
      'Due Date',
      'Overdue Days',
      'Duration (min)',
      'Priority Score',
      'Status',
    ]
    const rows = tasks.map((t) => [
      t.id,
      t.sourceSystem,
      t.department,
      t.assetId,
      t.corridorId,
      `"${t.taskType.replace(/"/g, '""')}"`,
      t.criticality,
      t.dueDate,
      t.overdueDays,
      t.estimatedDuration,
      t.priority,
      t.status,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `railonic_maintenance_work_queue_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Maintenance Queue CSV exported', {
      description: `${tasks.length} tasks exported successfully.`,
    })
  }

  return (
    <div>
      <PageHeader
        badge="UNIFIED WORK QUEUE · TMS / SMMS / TDMS"
        title="Unified Maintenance Backlog"
        description="Cross-departmental maintenance activities normalized from Track (TMS), Signalling (SMMS) and Traction (TDMS), evaluated with AI priority scoring (PRD Section 7)."
      >
        <Button
          variant="outline"
          onClick={() =>
            toast.info('Data Sync Complete', {
              description: 'Latest work orders pulled from TMS, SMMS & TDMS mock feeds.',
            })
          }
        >
          <RefreshCw className="size-3.5" />
          Sync feeds
        </Button>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </PageHeader>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className={`font-mono text-2xl font-semibold tabular-nums ${s.tone ?? ''}`}>
              {s.value}
            </p>
          </Card>
        ))}
      </section>

      <QueueTable />
    </div>
  )
}
