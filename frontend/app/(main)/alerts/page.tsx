'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Train,
  Filter,
  Search,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  X,
  Check,
  Eye,
  SlidersHorizontal,
  Compass,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import type {
  OperationalAlert,
  AlertSummary,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AlertDecisionTrace,
} from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function AlertCenterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryAlertId = searchParams.get('alertId')
  const { user, isLoading: isAuthLoading } = useAuth()

  // Data state
  const [alerts, setAlerts] = useState<OperationalAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(queryAlertId)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  // Filters state
  const [search, setSearch] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL')

  // Explainability & Decision Trace state
  const [decisionTrace, setDecisionTrace] = useState<AlertDecisionTrace | null>(null)
  const [isTraceLoading, setIsTraceLoading] = useState<boolean>(false)
  const [traceModalOpen, setTraceModalOpen] = useState<boolean>(false)

  // Operational notes action modal
  const [notesModalOpen, setNotesModalOpen] = useState<boolean>(false)
  const [notesModalMode, setNotesModalMode] = useState<'REVIEW' | 'RESOLVE' | 'DISMISS'>('REVIEW')
  const [notesInput, setNotesInput] = useState<string>('')

  // Load Alerts & Summary
  const loadAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      const [alertsData, summaryData] = await Promise.all([
        api.getAlerts({
          severity: severityFilter !== 'ALL' ? severityFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          corridorId: corridorFilter !== 'ALL' ? corridorFilter : undefined,
          search: search.trim() || undefined,
        }),
        api.getAlertSummary({
          corridorId: corridorFilter !== 'ALL' ? corridorFilter : undefined,
        }),
      ])
      setAlerts(alertsData.alerts || [])
      setSummary(summaryData.summary || null)

      // Auto-select first alert or persist query alert
      if (queryAlertId && alertsData.alerts?.some((a) => a.alertId === queryAlertId)) {
        setSelectedAlertId(queryAlertId)
      } else if (!selectedAlertId && alertsData.alerts && alertsData.alerts.length > 0) {
        setSelectedAlertId(alertsData.alerts[0].alertId)
      }
    } catch (err: any) {
      console.error('Failed to load operational alerts:', err)
      toast.error(err.message || 'Failed to connect to Alert Intelligence API')
    } finally {
      setIsLoading(false)
    }
  }, [severityFilter, statusFilter, typeFilter, corridorFilter, search, queryAlertId, selectedAlertId])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  // Selected Alert Object
  const selectedAlert = useMemo(() => {
    return alerts.find((a) => a.alertId === selectedAlertId) || alerts[0] || null
  }, [alerts, selectedAlertId])

  // Controller / Officer evaluation trigger
  const handleEvaluate = async () => {
    setIsEvaluating(true)
    try {
      const res = await api.evaluateAlerts()
      toast.success('Operational alerts re-evaluated across SER Kharagpur network', {
        description: `Active alerts: ${res.activeAlertsCount}.`,
      })
      await loadAlerts()
    } catch (err: any) {
      toast.error(err.message || 'Evaluation run failed.')
    } finally {
      setIsEvaluating(false)
    }
  }

  // Permission Checks
  const userRole = user?.role || 'VIEWER'
  const isControllerOrAdmin = userRole === 'CONTROLLER' || userRole === 'ADMIN'
  const canAcknowledge = isControllerOrAdmin || userRole === 'OFFICER'
  const canReview = isControllerOrAdmin || userRole === 'OFFICER'
  const canResolve = isControllerOrAdmin
  const canDismiss = isControllerOrAdmin
  const canEvaluate = isControllerOrAdmin

  // Quick Lifecycle Action: ACKNOWLEDGE
  const handleAcknowledge = async () => {
    if (!selectedAlert) return
    setActionLoading(true)
    try {
      await api.acknowledgeAlert(selectedAlert.alertId)
      toast.success(`Alert ${selectedAlert.alertId} acknowledged.`)
      await loadAlerts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to acknowledge alert.')
    } finally {
      setActionLoading(false)
    }
  }

  // Open Notes Modal for Review, Resolve, Dismiss
  const handleOpenNotesModal = (mode: 'REVIEW' | 'RESOLVE' | 'DISMISS') => {
    setNotesModalMode(mode)
    setNotesInput('')
    setNotesModalOpen(true)
  }

  // Submit Lifecycle Notes Action
  const handleNotesSubmit = async () => {
    if (!selectedAlert) return
    setActionLoading(true)
    try {
      if (notesModalMode === 'REVIEW') {
        await api.reviewAlert(selectedAlert.alertId, notesInput)
        toast.success(`Alert ${selectedAlert.alertId} moved to Under Review.`)
      } else if (notesModalMode === 'RESOLVE') {
        await api.resolveAlert(selectedAlert.alertId, notesInput)
        toast.success(`Alert ${selectedAlert.alertId} marked as Resolved.`)
      } else if (notesModalMode === 'DISMISS') {
        if (!notesInput.trim()) {
          toast.error('Formal dismissal reason is mandatory for operational audit.')
          setActionLoading(false)
          return
        }
        await api.dismissAlert(selectedAlert.alertId, notesInput)
        toast.success(`Alert ${selectedAlert.alertId} dismissed with audit log.`)
      }
      setNotesModalOpen(false)
      await loadAlerts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update alert state.')
    } finally {
      setActionLoading(false)
    }
  }

  // Fetch 9-Step Explainable Decision Trace
  const handleOpenDecisionTrace = async () => {
    if (!selectedAlert) return
    setIsTraceLoading(true)
    setTraceModalOpen(true)
    try {
      const res = await api.getAlertDecisionTrace(selectedAlert.alertId)
      setDecisionTrace(res.trace)
    } catch (err: any) {
      console.error('Failed to load decision trace:', err)
      toast.error('Unable to fetch detailed decision trace.')
    } finally {
      setIsTraceLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto text-slate-900 font-sans">
      {/* SIMULATION MANDATORY BANNER */}
      <div className="bg-amber-50 border border-amber-200/90 text-slate-700 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          <span className="font-bold tracking-wide uppercase text-amber-900">
            SIMULATION / DECISION-SUPPORT ONLY — KHAI/SER OPERATIONAL ALERT INTELLIGENCE
          </span>
        </div>
        <div className="text-[11px] text-amber-800 font-mono font-semibold">
          Final Sanction Authority: Operating Section Controller (Four-Eyes Principle)
        </div>
      </div>

      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <ShieldAlert className="size-7 text-amber-600" />
              Operational Alert Center
            </h1>
            <span className="bg-slate-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-mono border border-slate-200 font-semibold">
              Phase 11
            </span>
            <span className="bg-emerald-50 text-emerald-800 text-[11px] px-2 py-0.5 rounded-md font-mono border border-emerald-300 font-semibold">
              Role: {userRole}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Intelligent aggregation, root-cause explainability, and multi-cadre action resolution for South Eastern Railway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/command-center"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Compass className="size-4 text-blue-600" />
            <span>Command Center</span>
          </Link>
          <button
            onClick={loadAlerts}
            disabled={isLoading}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {canEvaluate && (
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Sparkles className={`size-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Operational State'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI RIBBON STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Alerts</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{summary?.total ?? '-'}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Across all categories</div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-600 animate-pulse" />
            Critical
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{summary?.critical ?? '-'}</div>
          <div className="text-[10px] text-rose-600 mt-0.5 font-medium">Immediate intervention</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">Warning</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{summary?.warning ?? '-'}</div>
          <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Caution / Secondary</div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-blue-800 font-bold uppercase tracking-wider">Info</div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">{summary?.info ?? '-'}</div>
          <div className="text-[10px] text-blue-600 mt-0.5 font-medium">Routine advisory</div>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-indigo-800 font-bold uppercase tracking-wider">In Review</div>
          <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">{summary?.inReview ?? '-'}</div>
          <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">Investigation active</div>
        </div>

        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-amber-900 font-bold uppercase tracking-wider">Pending Action</div>
          <div className="text-2xl font-bold font-mono text-amber-800 mt-1">{summary?.pendingHumanActions ?? '-'}</div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-medium">Awaiting Controller</div>
        </div>
      </div>

      {/* FILTER & OPERATIONAL SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alert ID, title, train #, task ID, block ID, section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>

            <select
              value={corridorFilter}
              onChange={(e) => setCorridorFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">Corridor: All (Division)</option>
              <option value="C01">C01 (Howrah–KGP)</option>
              <option value="C02">C02 (KGP–Bhubaneswar)</option>
              <option value="C03">C03 (KGP–Tatanagar)</option>
              <option value="C04">C04 (BBS–Puri)</option>
              <option value="C05">C05 (Santragachi–KGP)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">Type: All</option>
              <option value="CRITICAL_CONFLICT">Critical Conflict</option>
              <option value="ACTIVE_DISRUPTION">Disruption Incident</option>
              <option value="TRAIN_IMPACT">Train Impact</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="RESOURCE_DOUBLE_BOOKED">Resource Double-Booked</option>
              <option value="HIGH_NETWORK_UTILIZATION">High Utilization</option>
              <option value="SYSTEM_HEALTH_WARNING">System Health</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ALERT ROSTER */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold px-1">
            <span>Operational Alert Queue ({alerts.length})</span>
            <span className="font-mono text-[11px] text-slate-500">Sorted: Critical &gt; Warning &gt; Info</span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-xs">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Loading operational alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 shadow-xs">
                <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                <p className="text-sm font-bold text-slate-800">Clear Operations</p>
                <p className="text-xs text-slate-500 mt-1">No operational alerts matching current filter selection.</p>
              </div>
            ) : (
              alerts.map((a) => {
                const isSelected = selectedAlert?.alertId === a.alertId
                const isCrit = a.severity === 'CRITICAL'
                const isWarn = a.severity === 'WARNING'

                return (
                  <div
                    key={a.alertId}
                    onClick={() => setSelectedAlertId(a.alertId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition text-left relative shadow-xs ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : isCrit
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                        : isWarn
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isCrit
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isWarn
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {a.severity}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-500">{a.alertId}</span>
                        <span className="text-[10px] font-mono text-slate-400">•</span>
                        <span className="text-[10px] font-mono text-blue-700 font-semibold">
                          {a.corridorId} {a.section ? `(${a.section})` : ''}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                          a.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : a.status === 'DISMISSED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : a.status === 'IN_REVIEW'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : a.status === 'ACKNOWLEDGED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{a.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug">{a.summary}</p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span>Source: {a.sourceModule}</span>
                      {a.simulatedImpact?.delayMinutes > 0 && (
                        <span className="text-rose-700 font-mono font-bold flex items-center gap-1">
                          <Clock className="size-2.5" /> +{a.simulatedImpact.delayMinutes}m delay
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ALERT DETAIL INVESTIGATION & ACTION CENTER */}
        <div className="lg:col-span-7">
          {!selectedAlert ? (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
              <p>Select an alert from the left panel to inspect root-cause evidence and resolve actions.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
              {/* DETAIL HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        selectedAlert.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : selectedAlert.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {selectedAlert.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">{selectedAlert.alertId}</span>
                    <span className="text-xs font-mono text-slate-400">•</span>
                    <span className="text-xs font-mono text-blue-700 font-semibold">{selectedAlert.type}</span>
                    <span className="text-xs font-mono text-slate-400">•</span>
                    <span
                      className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        selectedAlert.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedAlert.status === 'DISMISSED'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : selectedAlert.status === 'IN_REVIEW'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : selectedAlert.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {selectedAlert.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedAlert.title}</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedAlert.explanation}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenDecisionTrace}
                    className="bg-white hover:bg-slate-50 text-blue-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <HelpCircle className="size-3.5" />
                    <span>Decision Trace</span>
                  </button>
                </div>
              </div>

              {/* WHY THIS ALERT EXISTS */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Info className="size-4 text-amber-600" />
                  <span>Why This Alert Exists (Factual Root Cause)</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-sans">{selectedAlert.whyThisAlertExists}</p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500 font-mono">
                  <span>Corridor: {selectedAlert.corridorId}</span>
                  {selectedAlert.section && <span>• Section: {selectedAlert.section}</span>}
                  <span>• Detection Source: {selectedAlert.sourceModule} Engine</span>
                </div>
              </div>

              {/* CONCRETE FACTUAL EVIDENCE */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational Evidence</h3>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 font-mono text-xs text-slate-800 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    {selectedAlert.evidence &&
                      Object.entries(selectedAlert.evidence).map(([key, val]) => (
                        <div key={key} className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 uppercase text-[9px] block mb-0.5 font-medium">{key}</span>
                          <span className="text-slate-900 font-bold truncate block">
                            {Array.isArray(val) ? val.join(', ') || 'None' : String(val)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* RELATED OPERATIONAL OBJECTS */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Affected Operational Objects</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedAlert.relatedTrainNumbers?.map((tn) => (
                    <span
                      key={tn}
                      className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md flex items-center gap-1 font-mono font-medium shadow-2xs"
                    >
                      <Train className="size-3" /> Train #{tn}
                    </span>
                  ))}
                  {selectedAlert.relatedConflictIds?.map((cid) => (
                    <span
                      key={cid}
                      className="bg-rose-50 border border-rose-200 text-rose-900 px-2.5 py-1 rounded-md font-mono font-medium shadow-2xs"
                    >
                      Conflict: {cid}
                    </span>
                  ))}
                  {selectedAlert.relatedBlockIds?.map((bid) => (
                    <span
                      key={bid}
                      className="bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-md font-mono font-medium shadow-2xs"
                    >
                      Block: {bid}
                    </span>
                  ))}
                  {selectedAlert.relatedTaskIds?.map((tid) => (
                    <span
                      key={tid}
                      className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-md font-mono font-medium shadow-2xs"
                    >
                      Task: {tid}
                    </span>
                  ))}
                  {selectedAlert.relatedDisruptionIds?.map((did) => (
                    <span
                      key={did}
                      className="bg-purple-50 border border-purple-200 text-purple-900 px-2.5 py-1 rounded-md font-mono font-medium shadow-2xs"
                    >
                      Incident: {did}
                    </span>
                  ))}
                </div>
              </div>

              {/* SIMULATED IMPACT */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Simulated Network & Train Impact</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Projected Delay</span>
                    <span className="text-rose-700 font-bold text-base">
                      +{selectedAlert.simulatedImpact?.delayMinutes || 0}m
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Affected Trains</span>
                    <span className="text-slate-900 font-bold text-base">
                      {selectedAlert.simulatedImpact?.affectedTrainsCount || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Operational Risk</span>
                    <span
                      className={`font-bold text-base ${
                        selectedAlert.simulatedImpact?.operationalRisk === 'CRITICAL' ||
                        selectedAlert.simulatedImpact?.operationalRisk === 'HIGH'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {selectedAlert.simulatedImpact?.operationalRisk || 'LOW'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Network Load Delta</span>
                    <span className="text-blue-700 font-bold text-base">
                      +{selectedAlert.simulatedImpact?.networkUtilizationImpactPct || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION CENTER SHORTCUTS */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Operational Actions</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAlert.availableActions?.map((act, idx) => (
                    <Link
                      key={idx}
                      href={act.route}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-300 shadow-2xs"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="size-3.5 text-blue-600" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* LIFECYCLE STATE TRANSITIONS */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Alert Lifecycle Governance ({userRole})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Current: <strong className="text-slate-900 font-bold">{selectedAlert.status}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedAlert.status === 'OPEN' && canAcknowledge && (
                    <button
                      onClick={handleAcknowledge}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <Check className="size-3.5" />
                      <span>Acknowledge Alert</span>
                    </button>
                  )}

                  {(selectedAlert.status === 'OPEN' || selectedAlert.status === 'ACKNOWLEDGED') && canReview && (
                    <button
                      onClick={() => handleOpenNotesModal('REVIEW')}
                      disabled={actionLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <Eye className="size-3.5" />
                      <span>Start Investigation</span>
                    </button>
                  )}

                  {selectedAlert.status !== 'RESOLVED' && canResolve && (
                    <button
                      onClick={() => handleOpenNotesModal('RESOLVE')}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Resolve Alert</span>
                    </button>
                  )}

                  {selectedAlert.status !== 'DISMISSED' && canDismiss && (
                    <button
                      onClick={() => handleOpenNotesModal('DISMISS')}
                      disabled={actionLoading}
                      className="bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <X className="size-3.5" />
                      <span>Dismiss Alert</span>
                    </button>
                  )}
                </div>

                {/* Audit & Cadre Attribution */}
                <div className="mt-3 pt-2 text-[11px] text-slate-500 space-y-1">
                  {selectedAlert.acknowledgedAt && (
                    <p>
                      Acknowledged by <strong className="text-slate-800">{selectedAlert.acknowledgedBy}</strong> at{' '}
                      {new Date(selectedAlert.acknowledgedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                  {selectedAlert.reviewedAt && (
                    <p>
                      Investigation initiated by <strong className="text-slate-800">{selectedAlert.reviewedBy}</strong>: &quot;
                      {selectedAlert.reviewNotes}&quot;
                    </p>
                  )}
                  {selectedAlert.resolvedAt && (
                    <p className="text-emerald-700 font-semibold">
                      Resolved by <strong>{selectedAlert.resolvedBy}</strong>: &quot;{selectedAlert.resolutionNotes}&quot;
                    </p>
                  )}
                  {selectedAlert.dismissedAt && (
                    <p className="text-rose-700 font-semibold">
                      Dismissed by <strong>{selectedAlert.dismissedBy}</strong>. Reason: &quot;{selectedAlert.dismissalReason}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 9-STEP EXPLAINABLE DECISION TRACE MODAL */}
      {traceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="size-4 text-blue-600" />
                  Explainable Decision Trace
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{decisionTrace?.title || selectedAlert?.title}</p>
              </div>
              <button
                onClick={() => setTraceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs">
              {isTraceLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p>Generating deterministic decision trace...</p>
                </div>
              ) : decisionTrace?.steps?.length ? (
                decisionTrace.steps.map((st) => (
                  <div key={st.stepNumber} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-700">
                        STEP {st.stepNumber}: {st.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          st.status === 'APPROVED' || st.status === 'PASSED' || st.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : st.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs font-sans leading-relaxed">{st.summary}</p>
                    {st.details && st.details.length > 0 && (
                      <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5 pt-1">
                        {st.details.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-6">No decision trace available for this entity.</p>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setTraceModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-2xs"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTES MODAL (REVIEW, RESOLVE, DISMISS) */}
      {notesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {notesModalMode === 'REVIEW'
                  ? 'Start Operational Investigation'
                  : notesModalMode === 'RESOLVE'
                  ? 'Resolve Operational Alert'
                  : 'Dismiss Operational Alert'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {notesModalMode === 'REVIEW'
                  ? 'Record notes regarding your investigation strategy.'
                  : notesModalMode === 'RESOLVE'
                  ? 'Verify underlying conflict or disruption is resolved or record controller override.'
                  : 'Enter formal operational rationale for dismissing this alert.'}
              </p>
            </div>

            <textarea
              rows={3}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder={
                notesModalMode === 'DISMISS'
                  ? 'Reason for dismissal (required, min 5 chars)...'
                  : 'Operational remarks / resolution notes...'
              }
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans shadow-2xs"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNotesModalOpen(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs"
              >
                Cancel
              </button>
              <button
                onClick={handleNotesSubmit}
                disabled={actionLoading}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50 shadow-xs ${
                  notesModalMode === 'DISMISS'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : notesModalMode === 'RESOLVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
