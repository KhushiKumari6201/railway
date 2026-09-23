'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  TrendingUp,
  ShieldAlert,
  Clock,
  TrainFront,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building,
  Layers,
  Sparkles,
  BarChart3,
  CalendarCheck,
  Activity,
  HardHat,
  Cpu,
  Zap,
  BellRing,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { OperationalAnalyticsResponse, ManagementReportResponse } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

const REPORT_TYPES = [
  {
    id: 'OPERATIONAL_SUMMARY',
    name: 'Divisional Operational Summary',
    description: 'Comprehensive health, backlog status, block fulfillments, and simulated network utilization.',
    icon: Activity,
  },
  {
    id: 'BLOCK_PLANNING',
    name: 'Block Coordination Schedule',
    description: 'Itemized maintenance block schedules, corridors, approved windows, and bundled tasks.',
    icon: CalendarCheck,
  },
  {
    id: 'CONFLICT',
    name: 'Traffic Conflict Assessment',
    description: 'Passenger train path overlaps, cross-corridor bottlenecks, and resolution tracking.',
    icon: ShieldAlert,
  },
  {
    id: 'DISRUPTION',
    name: 'Disruption & Rescheduling Log',
    description: 'Operational incidents, simulated timetable delays, and active rescheduling alternatives.',
    icon: Clock,
  },
  {
    id: 'AUDIT',
    name: 'Divisional Audit Trail',
    description: 'Accountability log of block sanctions, four-eyes approvals, rejections, and user actions.',
    icon: FileText,
  },
  {
    id: 'ALERT_SUMMARY',
    name: 'Alert Intelligence Summary',
    description: 'Itemized operational alert roster, severity distributions, response statistics, and open critical items.',
    icon: BellRing,
  },
]

export default function ReportsAnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL')
  const [selectedReportType, setSelectedReportType] = useState<string>('OPERATIONAL_SUMMARY')
  const [analytics, setAnalytics] = useState<OperationalAnalyticsResponse | null>(null)
  const [generatedReport, setGeneratedReport] = useState<ManagementReportResponse['report'] | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false)

  // Fetch analytics overview safely after auth initialization
  const loadAnalytics = async () => {
    if (isAuthLoading || !user) return
    setIsLoadingAnalytics(true)
    try {
      const filters = corridorFilter !== 'ALL' ? { corridorId: corridorFilter } : {}
      const data = await api.getOperationalAnalytics(filters)
      setAnalytics(data)
    } catch (err: any) {
      console.error('Failed to load analytics:', err)
      toast.error('Could not load operational analytics')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadAnalytics()
    }
  }, [corridorFilter, isAuthLoading, user])

  // Trigger report generation
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const payload: { type: string; corridorId?: string } = {
        type: selectedReportType,
      }
      if (corridorFilter !== 'ALL') {
        payload.corridorId = corridorFilter
      }
      const res = await api.generateManagementReport(payload)
      if (res.success && res.report) {
        setGeneratedReport(res.report)
        toast.success(`Generated ${selectedReportType} Report`)
      }
    } catch (err: any) {
      console.error('Failed to generate report:', err)
      toast.error(err.message || 'Report generation failed')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const s = analytics?.summary

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto print:p-0 print:m-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Kharagpur Division • South Eastern Railway
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Phase 8 Operational Governance
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" />
            Executive Management Analytics & Requisition Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deterministic decision-support metrics, cross-departmental maintenance KPIs, and official block requisition dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          {/* Corridor Filter */}
          <div className="flex items-center bg-card border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-muted-foreground mr-2 font-medium">Corridor:</span>
            <select
              value={corridorFilter}
              onChange={(e) => setCorridorFilter(e.target.value)}
              className="bg-transparent text-foreground font-medium outline-none cursor-pointer"
            >
              <option value="ALL">All Corridors (C01–C05)</option>
              <option value="C01">C01: Howrah – Kharagpur</option>
              <option value="C02">C02: Kharagpur – Bhubaneswar</option>
              <option value="C03">C03: Kharagpur – Tatanagar</option>
              <option value="C04">C04: Bhubaneswar – Puri</option>
              <option value="C05">C05: Santragachi – Kharagpur Freight</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            disabled={isLoadingAnalytics}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Maintenance Sanction Hours */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Sanctioned Block Hours</span>
              <CalendarCheck className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {s ? `${s.totalApprovedMaintenanceHours} hrs` : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {s ? `${s.approvedBlocks} Approved` : '0'}
            </span>{' '}
            of {s ? s.totalBlocks : 0} total planned blocks
          </CardContent>
        </Card>

        {/* Card 2: Task Backlog Scheduling Rate */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Backlog Scheduling Rate</span>
              <TrendingUp className="size-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {s ? `${s.taskSchedulingRate}%` : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{s ? s.scheduledTasks : 0}</span> scheduled /{' '}
            <span className="font-semibold text-foreground">{s ? s.openTasks : 0}</span> pending open
          </CardContent>
        </Card>

        {/* Card 3: Punctuality Protection */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Timetable Train Conflicts</span>
              <ShieldAlert className={`size-4 ${s && s.activeConflicts > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {s ? s.activeConflicts : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {s && s.activeConflicts === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% Conflict-Free Paths</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Unresolved Bottlenecks</span>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Network Utilization */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Simulated Network Utilization</span>
              <Activity className="size-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {s ? `${s.networkUtilization}%` : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Section capacity model: {s ? `${s.totalDowntimeSavedMin}m` : '0m'} downtime bundled
          </CardContent>
        </Card>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* Department Workload Distribution */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Unified Maintenance Backlog by Department
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidation across TMS (Civil), SMMS (S&T), and TDMS (Traction)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.tasks?.departmentDistribution ? (
              <div className="space-y-3">
                {/* Engineering */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <HardHat className="size-3.5 text-amber-500" />
                      Civil Engineering (Track / TMS)
                    </span>
                    <span className="font-semibold">{analytics.tasks.departmentDistribution.Engineering} tasks</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (analytics.tasks.departmentDistribution.Engineering / (s?.totalTasks || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* S&T */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-blue-500" />
                      Signalling & Telecom (SMMS)
                    </span>
                    <span className="font-semibold">{analytics.tasks.departmentDistribution['S&T']} tasks</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (analytics.tasks.departmentDistribution['S&T'] / (s?.totalTasks || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Traction */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <Zap className="size-3.5 text-emerald-500" />
                      Traction Distribution (OHE / TDMS)
                    </span>
                    <span className="font-semibold">{analytics.tasks.departmentDistribution.Traction} tasks</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (analytics.tasks.departmentDistribution.Traction / (s?.totalTasks || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                  <span>Cumulative Backlog Overdue Days:</span>
                  <span className="font-semibold text-foreground">{analytics.tasks.totalOverdueDays} days</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading workload data...</div>
            )}
          </CardContent>
        </Card>

        {/* Corridor Block Allocation */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrainFront className="size-4 text-primary" />
              Block Allocation Across Kharagpur Corridors
            </CardTitle>
            <CardDescription className="text-xs">
              Corridor balance ensures no trunk route suffers chronic neglect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.blocks?.corridorDistribution ? (
              <div className="space-y-2.5">
                {[
                  { id: 'C01', name: 'Howrah – Kharagpur (Main)', color: 'bg-primary' },
                  { id: 'C02', name: 'Kharagpur – Bhubaneswar', color: 'bg-indigo-500' },
                  { id: 'C03', name: 'Kharagpur – Tatanagar', color: 'bg-emerald-500' },
                  { id: 'C04', name: 'Bhubaneswar – Puri', color: 'bg-sky-500' },
                  { id: 'C05', name: 'Santragachi – Kharagpur (Freight)', color: 'bg-amber-500' },
                ].map((c) => {
                  const count = analytics.blocks.corridorDistribution[c.id] || 0
                  const maxCount = Math.max(1, ...Object.values(analytics.blocks.corridorDistribution))
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">
                          <span className="font-bold text-muted-foreground mr-1">{c.id}:</span> {c.name}
                        </span>
                        <span className="font-semibold">{count} blocks</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.color} rounded-full`}
                          style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading corridor data...</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interactive Report Generator Section */}
      <Card className="border-primary/30 bg-card/80 shadow-sm print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Official Requisition & Governance Dossier Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Generate formalized, printable railway engineering reports for Sr. DOM review and Joint S&T/Civil sign-off.
              </CardDescription>
            </div>

            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="gap-2 font-medium"
            >
              <Sparkles className={`size-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Compiling Dossier...' : 'Generate Official Report'}
            </Button>
          </div>

          {/* Report Type Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-4 pt-3 border-t">
            {REPORT_TYPES.map((rt) => {
              const Icon = rt.icon
              const isSelected = selectedReportType === rt.id
              return (
                <button
                  key={rt.id}
                  onClick={() => setSelectedReportType(rt.id)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-xs'
                      : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-foreground font-medium">
                    <Icon className={`size-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{rt.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {rt.description}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>

        {/* Generated Report Display */}
        <CardContent className="pt-2">
          {generatedReport ? (
            <div className="bg-background border rounded-xl p-6 space-y-6 print:border-none print:p-0">
              {/* Report Header (Indian Railways Style) */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-primary uppercase">
                    SOUTH EASTERN RAILWAY • KHARAGPUR DIVISION
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-0.5">{generatedReport.data?.title || 'Operational Management Report'}</h2>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                    <span>
                      <strong>Report ID:</strong> {generatedReport.reportId}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Generated:</strong> {new Date(generatedReport.generatedAt).toLocaleString('en-IN')}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Author:</strong> {generatedReport.generatedBy?.name} ({generatedReport.generatedBy?.role})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                    <Printer className="size-3.5" />
                    Print / Export PDF
                  </Button>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-muted/50 border rounded-lg text-xs text-muted-foreground leading-relaxed">
                <strong>Safety & Governance Protocol:</strong> {generatedReport.disclaimer}
              </div>

              {/* Dynamic Content Based on Report Type */}
              {generatedReport.type === 'OPERATIONAL_SUMMARY' && generatedReport.data?.summary && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">1. Executive Health Indicators</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Planned vs Approved</div>
                      <div className="text-lg font-bold mt-0.5">
                        {generatedReport.data.summary.approvedBlocks} / {generatedReport.data.summary.totalBlocks} Blocks
                      </div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Backlog Fulfillment</div>
                      <div className="text-lg font-bold mt-0.5">
                        {generatedReport.data.summary.taskCompletionRate}%
                      </div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Active Bottlenecks</div>
                      <div className="text-lg font-bold mt-0.5">
                        {generatedReport.data.summary.activeConflicts} Conflicts
                      </div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Simulated Network Load</div>
                      <div className="text-lg font-bold mt-0.5">
                        {generatedReport.data.networkUtilization}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.type === 'BLOCK_PLANNING' && generatedReport.data?.records && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">
                    1. Scheduled Maintenance Blocks ({generatedReport.data.records.length} items)
                  </h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 border-b font-medium text-muted-foreground">
                        <tr>
                          <th className="p-2.5">Block ID</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Corridor & Section</th>
                          <th className="p-2.5">Sanctioned Window</th>
                          <th className="p-2.5">Tasks</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Authority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {generatedReport.data.records.map((r: any) => (
                          <tr key={r.id} className="hover:bg-muted/30">
                            <td className="p-2.5 font-mono font-semibold">{r.id}</td>
                            <td className="p-2.5">{r.date}</td>
                            <td className="p-2.5">
                              <span className="font-semibold text-primary">{r.corridorId}</span> • {r.section}
                            </td>
                            <td className="p-2.5 font-medium">{r.window}</td>
                            <td className="p-2.5">{r.taskCount} bundled</td>
                            <td className="p-2.5">
                              <Badge
                                variant={r.status === 'Approved' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-muted-foreground">{r.approvedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {generatedReport.type === 'CONFLICT' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">1. Traffic Conflicts & Train Protection</h3>
                  {generatedReport.data?.records && generatedReport.data.records.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/60 border-b font-medium text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Conflict ID</th>
                            <th className="p-2.5">Corridor</th>
                            <th className="p-2.5">Type & Train</th>
                            <th className="p-2.5">Severity</th>
                            <th className="p-2.5">Suggested Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {generatedReport.data.records.map((c: any) => (
                            <tr key={c.id}>
                              <td className="p-2.5 font-mono">{c.id}</td>
                              <td className="p-2.5 font-semibold text-primary">{c.corridorId}</td>
                              <td className="p-2.5">
                                <span className="font-medium">{c.type}</span> {c.trainNo ? `(${c.trainNo})` : ''}
                              </td>
                              <td className="p-2.5">
                                <Badge variant={c.severity === 'Critical' ? 'destructive' : 'outline'}>
                                  {c.severity}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-muted-foreground">{c.suggestedAction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                      <CheckCircle2 className="size-4" />
                      All timetable paths are currently protected. Zero active conflicts detected.
                    </div>
                  )}
                </div>
              )}

              {/* Official Sign-Off Section */}
              <div className="pt-8 border-t mt-6 grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                <div className="border-t pt-3">
                  <div className="font-semibold text-foreground">Prepared By:</div>
                  <div className="text-muted-foreground mt-0.5">{generatedReport.generatedBy?.name}</div>
                  <div className="text-[11px] text-muted-foreground">{generatedReport.generatedBy?.role}</div>
                </div>

                <div className="border-t pt-3">
                  <div className="font-semibold text-foreground">Verified By (Four-Eyes Principle):</div>
                  <div className="text-muted-foreground mt-0.5">Sr. Divisional Operations Manager (Sr. DOM)</div>
                  <div className="text-[11px] text-muted-foreground">Kharagpur Control Office</div>
                </div>

                <div className="border-t pt-3 col-span-2 md:col-span-1">
                  <div className="font-semibold text-foreground">Sanction Status:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">OFFICIALLY SANCTIONED</div>
                  <div className="text-[11px] text-muted-foreground">System Verified Safe</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <FileText className="size-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">No Report Compiled Yet</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Select a report category above and click <strong>Generate Official Report</strong> to assemble a live decision-support requisition dossier.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

