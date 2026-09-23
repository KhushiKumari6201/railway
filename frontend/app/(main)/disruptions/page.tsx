'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ShieldAlert,
  Flame,
  Zap,
  Clock,
  Train,
  Wrench,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  GitBranch,
  FileText,
  Printer,
  X,
  Plus,
  Network,
  Share2,
  Check,
  AlertCircle,
  Radio,
  Lock,
} from 'lucide-react'
import { api } from '@/lib/api'
import { corridors } from '@/lib/data/corridors'
import type {
  OperationalIncident,
  DisruptionImpact,
  ReschedulingOption,
  OperationalRequisitionReport,
  IncidentType,
  IncidentSeverity,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function DisruptionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const qIncidentId = searchParams.get('incidentId') || 'INC-001'

  // Incidents state
  const [incidents, setIncidents] = useState<OperationalIncident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(qIncidentId)
  const [selectedIncident, setSelectedIncident] = useState<OperationalIncident | null>(null)
  const [impactData, setImpactData] = useState<DisruptionImpact | null>(null)
  const [reschedulingOptions, setReschedulingOptions] = useState<ReschedulingOption[]>([])
  const [loading, setLoading] = useState(false)
  const [reschedulingLoading, setReschedulingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simulation form modal state
  const [showSimModal, setShowSimModal] = useState(false)
  const [simType, setSimType] = useState<IncidentType>('OHE_FAILURE')
  const [simSeverity, setSimSeverity] = useState<IncidentSeverity>('CRITICAL')
  const [simCorridor, setSimCorridor] = useState('C01')
  const [simSection, setSimSection] = useState('PKU–KGP')
  const [simStart, setSimStart] = useState('10:00')
  const [simEnd, setSimEnd] = useState('11:30')
  const [simDesc, setSimDesc] = useState('Overhead traction catenary defect near Kharagpur outer signal.')

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState<OperationalRequisitionReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Fetch list of incidents
  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getDisruptions()
      if (res.data) {
        setIncidents(res.data)
        if (res.data.length > 0 && !res.data.some((i) => i.incidentId === selectedIncidentId)) {
          setSelectedIncidentId(res.data[0].incidentId)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch simulated incidents')
    } finally {
      setLoading(false)
    }
  }, [selectedIncidentId])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  // Fetch detailed impact and candidate rescheduling options for the selected incident
  const loadIncidentImpact = useCallback(async (incId: string) => {
    if (!incId) return
    try {
      setReschedulingLoading(true)
      setError(null)
      const res = await api.getDisruption(incId)
      if (res.incident) {
        setSelectedIncident(res.incident)
        setImpactData(res.impact)

        // Fetch candidate rescheduling options around this incident
        const resch = await api.simulateRescheduling({
          corridorId: res.incident.corridorId,
          sectionId: res.incident.sectionId,
          date: res.incident.date,
          incidentStart: res.incident.start,
          incidentEnd: res.incident.end,
          estimatedDuration: res.incident.estimatedDuration,
        })
        if (resch.reschedulingOptions) {
          setReschedulingOptions(resch.reschedulingOptions)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load incident impact evaluation')
    } finally {
      setReschedulingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedIncidentId) {
      loadIncidentImpact(selectedIncidentId)
    }
  }, [selectedIncidentId, loadIncidentImpact])

  // Handle incident simulation submission
  const handleCreateSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.simulateDisruption({
        type: simType,
        severity: simSeverity,
        corridorId: simCorridor,
        sectionId: simSection,
        start: simStart,
        end: simEnd,
        description: simDesc,
      })
      setShowSimModal(false)
      await loadIncidents()
      if (res.incident) {
        setSelectedIncidentId(res.incident.incidentId)
      }
    } catch (err: any) {
      setError(err.message || 'Incident simulation failed')
    } finally {
      setLoading(false)
    }
  }

  // Handle resolving an incident
  const handleResolveIncident = async (id: string) => {
    try {
      await api.resolveDisruption(id)
      await loadIncidents()
      await loadIncidentImpact(id)
    } catch (err: any) {
      setError(err.message || 'Failed to resolve incident')
    }
  }

  // Handle generating the requisition report
  const handleOpenReport = async () => {
    if (!selectedIncidentId) return
    try {
      setReportLoading(true)
      const report = await api.getDisruptionReport(selectedIncidentId)
      setReportData(report)
      setShowReportModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to generate requisition report')
    } finally {
      setReportLoading(false)
    }
  }

  // Apply a rescheduling option to Block Planner
  const handleApplyOption = (opt: ReschedulingOption) => {
    const params = new URLSearchParams({
      corridorId: opt.corridorId,
      section: opt.sectionId,
      date: opt.date,
      start: opt.start,
      end: opt.end,
      rescheduledFromIncident: selectedIncidentId,
    })
    router.push(`/planner?${params.toString()}`)
  }

  // Helper colors
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="text-[10px]">CRITICAL</Badge>
      case 'WARNING':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px]">WARNING</Badge>
      case 'INFO':
      default:
        return <Badge variant="outline" className="text-[10px]">INFO</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Operational Railway Intelligence</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">Phase 7 Disruption Rescheduling</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Radio className="h-7 w-7 text-rose-500 animate-pulse" />
            Operational Disruptions & Rescheduling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulated Incident Management, Downstream Delay Propagation & Prototype Block Requisition Reporting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/planner">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Return to Planner
            </Button>
          </Link>
          <Link href="/network-coordination">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5" />
              Coordination
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowSimModal(true)}
            className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Simulate Incident
          </Button>
        </div>
      </div>

      {/* Mandatory Simulation Mode Banner (Step 32) */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <span>SIMULATION MODE</span>
            <Badge variant="outline" className="text-[10px] py-0 border-primary/40 text-primary">
              DECISION-SUPPORT ONLY
            </Badge>
          </div>
          <p>
            Operational incidents shown here are simulated decision-support scenarios and do not represent live
            railway control information, CRIS/NTES live telemetry, or official train movement instructions.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Active Incidents List & Incident Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Incidents List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                Simulated Incidents ({incidents.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadIncidents}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Select an incident to evaluate its network propagation and rescheduling options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-[560px] overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No simulated incidents present.
              </div>
            ) : (
              incidents.map((inc) => {
                const isSelected = inc.incidentId === selectedIncidentId
                return (
                  <div
                    key={inc.incidentId}
                    onClick={() => setSelectedIncidentId(inc.incidentId)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-sm'
                        : 'bg-card hover:bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">{inc.incidentId}</span>
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(inc.severity)}
                        <Badge
                          variant={inc.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {inc.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="font-semibold text-foreground text-xs leading-tight">
                      {inc.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                      <span>{inc.corridorId} · {inc.sectionId}</span>
                      <span className="font-mono text-[10px]">{inc.start}–{inc.end}</span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right 2 Columns: Detailed Impact & Propagation Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {selectedIncident && impactData && (
            <>
              {/* Selected Incident Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary">
                          {selectedIncident.incidentId}
                        </span>
                        {getSeverityBadge(selectedIncident.severity)}
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {selectedIncident.type}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold mt-1">
                        {selectedIncident.title}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedIncident.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveIncident(selectedIncident.incidentId)}
                          className="text-xs gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Resolve Incident
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleOpenReport}
                        disabled={reportLoading}
                        className="text-xs gap-1.5 bg-primary"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Generate Requisition
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {selectedIncident.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Factual Impact KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Affected Corridors</div>
                      <div className="text-xl font-bold mt-1 text-primary">
                        {impactData.impact.affectedCorridorCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Primary + Connected</div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Affected Trains</div>
                      <div className="text-xl font-bold mt-1 text-rose-500">
                        {impactData.impact.affectedTrainCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Timetable overlaps</div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Delay Impact</div>
                      <div className="text-xl font-bold mt-1 text-amber-500">
                        {impactData.impact.totalSimulatedDelayMinutes}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">min</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Propagated delay</div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Track Utilization</div>
                      <div className="text-xl font-bold mt-1 flex items-baseline gap-1">
                        <span>{impactData.impact.incidentUtilization}%</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          ({impactData.impact.utilizationDelta >= 0 ? '+' : ''}{impactData.impact.utilizationDelta}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Baseline: {impactData.impact.baselineUtilization}%
                      </div>
                    </div>
                  </div>

                  {/* Track Access & Crossover Status (Step 24) */}
                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-primary" />
                        Simulated Track & Crossover Lock Status
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {impactData.trackCrossoverStatus.section}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="p-2 rounded bg-background border border-border/50">
                        <div className="text-[10px] text-muted-foreground">Section Access</div>
                        <Badge
                          variant={impactData.trackCrossoverStatus.trackAccess === 'BLOCKED' ? 'destructive' : 'secondary'}
                          className="mt-1 text-[10px]"
                        >
                          {impactData.trackCrossoverStatus.trackAccess}
                        </Badge>
                      </div>

                      <div className="p-2 rounded bg-background border border-border/50">
                        <div className="text-[10px] text-muted-foreground">Crossover State</div>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {impactData.trackCrossoverStatus.crossoverState}
                        </Badge>
                      </div>

                      <div className="p-2 rounded bg-background border border-border/50">
                        <div className="text-[10px] text-muted-foreground">Speed Restriction</div>
                        <div className="font-mono font-bold mt-1">
                          {impactData.trackCrossoverStatus.speedRestrictionKmph} km/h
                        </div>
                      </div>

                      <div className="p-2 rounded bg-background border border-border/50">
                        <div className="text-[10px] text-muted-foreground">Interlocking</div>
                        <div className="font-mono text-[10px] mt-1 text-muted-foreground truncate">
                          Local Isolation
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Train Propagation Breakdown (Step 5, 13) */}
                  <div>
                    <div className="text-xs font-semibold mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Train className="h-4 w-4 text-primary" />
                        Affected Train Movements & Downstream Propagation
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {impactData.affectedTrains.length} train paths evaluated
                      </span>
                    </div>

                    {impactData.affectedTrains.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/20 text-center">
                        No scheduled timetable trains overlap this incident window.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground border-b">
                            <tr>
                              <th className="py-2 px-3">Train</th>
                              <th className="py-2 px-3">Primary Path</th>
                              <th className="py-2 px-3">Overlap</th>
                              <th className="py-2 px-3">Downstream Propagation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {impactData.affectedTrains.map((trn) => (
                              <tr key={trn.trainNo} className="hover:bg-muted/10">
                                <td className="py-2 px-3 font-medium">
                                  <span className="font-mono">{trn.trainNo}</span> · {trn.trainName}
                                </td>
                                <td className="py-2 px-3 text-muted-foreground">
                                  {trn.primaryCorridor} ({trn.primarySection}) @ {trn.scheduledSlot}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-rose-500">
                                  +{trn.overlapMinutes}m
                                </td>
                                <td className="py-2 px-3">
                                  {trn.propagatesAcrossNetwork ? (
                                    <span className="flex items-center gap-1 text-amber-500 text-[11px] font-medium">
                                      <GitBranch className="h-3 w-3" />
                                      {trn.downstreamCorridor} ({trn.downstreamSection}) +{trn.downstreamSimulatedDelay}m
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">Local to corridor</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rescheduling Options Table (Step 8, 9, 11) */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                        Candidate Rescheduling Windows
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Factual alternative window analysis around disruption. No automatic winner declared.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/optimization?corridorId=${selectedIncident?.corridorId || 'C01'}&date=${selectedIncident?.date || '2026-09-24'}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Find Feasible Rescheduling
                        </Button>
                      </Link>
                      {reschedulingLoading && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Evaluating...
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {reschedulingOptions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No candidate rescheduling windows generated.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground border-b">
                          <tr>
                            <th className="py-2 px-3">Option</th>
                            <th className="py-2 px-3">Window</th>
                            <th className="py-2 px-3">Train Delays</th>
                            <th className="py-2 px-3">Conflicts</th>
                            <th className="py-2 px-3">Safety Buffer</th>
                            <th className="py-2 px-3">Utilization</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {reschedulingOptions.map((opt) => (
                            <tr key={opt.scenarioId} className="hover:bg-muted/10">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-foreground">{opt.label}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">{opt.scenarioId}</div>
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                <div>{opt.window}</div>
                                <div className="text-[10px] text-muted-foreground">{opt.durationMin}m</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-amber-500">
                                  {opt.simulatedDelayMinutes}m
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {opt.affectedTrainCount} trains
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div>
                                  <span className="text-red-500 font-bold">{opt.criticalConflictCount} Crit</span> ·{' '}
                                  <span className="text-amber-500">{opt.warningConflictCount} Warn</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge
                                  variant={opt.safetyBufferStatus === 'PASS' ? 'outline' : 'destructive'}
                                  className="text-[10px]"
                                >
                                  {opt.safetyBufferStatus}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3">
                                <span>{opt.scenarioUtilization}%</span>
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({opt.networkUtilizationDelta >= 0 ? '+' : ''}{opt.networkUtilizationDelta}%)
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApplyOption(opt)}
                                  className="text-xs h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                                >
                                  <span>Apply to Planner</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                Simulate Operational Incident
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSimModal(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSimulation} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground">Incident Type</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as IncidentType)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="OHE_FAILURE">OHE Failure (Traction Power Loss)</option>
                  <option value="TRACK_FAILURE">Track Failure (Rail Defect / Weld Fracture)</option>
                  <option value="SIGNAL_FAILURE">Signal Failure (Point / Circuit Indication Drop)</option>
                  <option value="TRACK_OBSTRUCTION">Track Obstruction (Tree / Boulder / Derailment)</option>
                  <option value="EQUIPMENT_FAILURE">Equipment Failure (Loco / OHE Machine)</option>
                  <option value="EMERGENCY_MAINTENANCE">Emergency Maintenance Block</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Severity</label>
                  <select
                    value={simSeverity}
                    onChange={(e) => setSimSeverity(e.target.value as IncidentSeverity)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="CRITICAL">CRITICAL (Track Blocked)</option>
                    <option value="WARNING">WARNING (Speed Restriction)</option>
                    <option value="INFO">INFO (Advisory Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground">Corridor</label>
                  <select
                    value={simCorridor}
                    onChange={(e) => {
                      setSimCorridor(e.target.value)
                      const def = corridors.find((c) => c.id === e.target.value)
                      if (def && def.sections.length > 0) setSimSection(def.sections[0])
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    {corridors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Section</label>
                <select
                  value={simSection}
                  onChange={(e) => setSimSection(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  {(corridors.find((c) => c.id === simCorridor)?.sections || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    value={simStart}
                    onChange={(e) => setSimStart(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    value={simEnd}
                    onChange={(e) => setSimEnd(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Description</label>
                <textarea
                  value={simDesc}
                  onChange={(e) => setSimDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSimModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {loading ? 'Simulating...' : 'Execute Simulation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prototype Requisition Report Modal (Step 23) */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                  {reportData.reportMetadata.reportId} · {reportData.reportMetadata.division}
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {reportData.reportMetadata.documentTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Disclaimer in Report */}
            <div className="p-3 bg-muted/40 rounded border text-[11px] text-muted-foreground">
              <strong>Notice: </strong>{reportData.reportMetadata.disclaimer}
            </div>

            {/* Section 1: Incident & Affected Area */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-foreground border-b pb-1 text-xs uppercase tracking-wide">
                1. Incident Specification & Sectional Coordinates
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/20 rounded">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Incident ID</span>
                  <span className="font-mono font-bold">{reportData.incidentSummary.incidentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Disruption Type</span>
                  <span className="font-semibold">{reportData.incidentSummary.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Corridor & Section</span>
                  <span className="font-semibold">{reportData.incidentSummary.corridorId} ({reportData.incidentSummary.sectionId})</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Incident Window</span>
                  <span className="font-mono font-semibold">{reportData.incidentSummary.timeWindow} ({reportData.incidentSummary.durationMin}m)</span>
                </div>
              </div>
            </div>

            {/* Section 2: Train Impacts & Downstream Propagation */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-foreground border-b pb-1 text-xs uppercase tracking-wide">
                2. Timetable Delays & Downstream Corridor Propagation
              </h3>
              {reportData.networkImpactSummary.affectedTrains.length === 0 ? (
                <div className="text-muted-foreground p-2">No train path overlaps recorded.</div>
              ) : (
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Train</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Primary Section</th>
                        <th className="p-2">Simulated Delay</th>
                        <th className="p-2">Downstream Route</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.networkImpactSummary.affectedTrains.map((t) => (
                        <tr key={t.trainNo}>
                          <td className="p-2 font-mono">{t.trainNo} - {t.trainName}</td>
                          <td className="p-2">{t.trainType}</td>
                          <td className="p-2">{t.primaryCorridor} ({t.primarySection})</td>
                          <td className="p-2 font-bold font-mono text-rose-500">+{t.overlapMinutes}m</td>
                          <td className="p-2">{t.downstreamCorridor ? `${t.downstreamCorridor} (${t.downstreamSection})` : 'Direct Path'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 3: Recommended Rescheduling Options */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-foreground border-b pb-1 text-xs uppercase tracking-wide">
                3. Candidate Rescheduling Alternatives Evaluated
              </h3>
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Option</th>
                      <th className="p-2">Window</th>
                      <th className="p-2">Delay Impact</th>
                      <th className="p-2">Buffer Status</th>
                      <th className="p-2">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.reschedulingAlternatives.map((o) => (
                      <tr key={o.scenarioId}>
                        <td className="p-2 font-semibold">{o.label}</td>
                        <td className="p-2 font-mono">{o.window} ({o.durationMin}m)</td>
                        <td className="p-2 font-mono">{o.simulatedDelayMinutes} min</td>
                        <td className="p-2">{o.safetyBufferStatus}</td>
                        <td className="p-2">{o.scenarioUtilization}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Controller Sign-Off Block */}
            <div className="p-4 rounded-lg border border-dashed border-border/80 bg-muted/10 space-y-3 text-xs">
              <h4 className="font-bold text-foreground uppercase tracking-wide">
                4. Sectional Controller Authorisation & Action Sign-Off
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground block">Controller Name & Staff No.</label>
                  <div className="h-8 border rounded bg-background px-2.5 flex items-center text-muted-foreground font-mono text-[11px]">
                    SER/KGP/CTRL-4102 (Shift Supervisor)
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block">Action Selected</label>
                  <div className="h-8 border rounded bg-background px-2.5 flex items-center font-mono text-[11px]">
                    RESCHEDULE_TO_POST_CLEARANCE_WINDOW
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block">Authorisation Remarks</label>
                <div className="h-12 border rounded bg-background p-2 text-muted-foreground text-[11px]">
                  Simulated block requisition verified with Ser/Kharagpur control. 20-minute safety buffer satisfied.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DisruptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Radio className="h-8 w-8 animate-spin text-rose-500" />
            <span className="text-xs text-muted-foreground">Loading Disruption Rescheduling Module...</span>
          </div>
        </div>
      }
    >
      <DisruptionsContent />
    </Suspense>
  )
}
