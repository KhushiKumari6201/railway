'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Train,
  Calendar,
  Layers,
  Activity,
  Shield,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Eye,
  SlidersHorizontal,
  Share2,
  Radio,
  Cpu,
  FileText,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
  CalendarClock,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type {
  CommandCenterOverview,
  CommandCenterAlert,
  CommandCenterDecisionTrace,
  CommandCenterApproval,
  CommandCenterTrainImpact,
} from '@/lib/types'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function CommandCenterPage() {
  const router = useRouter()
  const { user } = useAuth()

  // State
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<CommandCenterOverview | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')

  // Filters & Search
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL')
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-24')
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modals & Panels
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null)
  const [activeTrace, setActiveTrace] = useState<CommandCenterDecisionTrace | null>(null)
  const [traceModalOpen, setTraceModalOpen] = useState<boolean>(false)
  const [blockCategoryTab, setBlockCategoryTab] = useState<'proposed' | 'approved' | 'rejected'>('proposed')

  // Approval action in-progress
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  // Fetch command center snapshot
  const fetchOverview = useCallback(async (traceTargetId?: string) => {
    setLoading(true)
    try {
      const res = await api.getCommandCenterOverview({
        corridorId: selectedCorridor !== 'ALL' ? selectedCorridor : undefined,
        date: selectedDate || undefined,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        search: searchQuery.trim() || undefined,
        traceId: traceTargetId,
      })
      setData(res)
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour12: false }))
      if (res.decisionTrace && traceTargetId) {
        setActiveTrace(res.decisionTrace)
      }
    } catch (err: any) {
      console.error('Failed to load command center overview:', err)
      toast.error(err.message || 'Failed to load command center data')
    } finally {
      setLoading(false)
    }
  }, [selectedCorridor, selectedDate, selectedDept, selectedSeverity, searchQuery])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  // Open Decision Trace
  const handleOpenTrace = async (entityId: string) => {
    try {
      const res = await api.getCommandCenterOverview({ traceId: entityId })
      if (res.decisionTrace) {
        setActiveTrace(res.decisionTrace)
        setTraceModalOpen(true)
      } else {
        toast.info(`No detailed decision trace recorded for ${entityId}`)
      }
    } catch (err: any) {
      toast.error('Failed to fetch decision trace')
    }
  }

  // Quick Sanction / Reject for Controller
  const handleBlockAction = async (blockId: string, action: 'approve' | 'reject') => {
    if (!user || (user.role !== 'CONTROLLER' && user.role !== 'ADMIN')) {
      toast.error('Only Section Controllers or Administrators have sanction authority under Four-Eyes governance.')
      return
    }

    setActionInProgressId(blockId)
    try {
      if (action === 'approve') {
        await api.approveBlock(blockId)
        toast.success(`Block ${blockId} sanctioned successfully by ${user.name}`)
      } else {
        const reason = prompt('Please enter mandatory rejection reason for operational audit:')
        if (!reason || !reason.trim()) {
          toast.error('Rejection reason is mandatory.')
          setActionInProgressId(null)
          return
        }
        await api.rejectBlock(blockId, reason.trim())
        toast.success(`Block ${blockId} rejected. Tasks reverted to backlog.`)
      }
      // Refresh Command Center
      await fetchOverview()
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} block`)
    } finally {
      setActionInProgressId(null)
    }
  }

  const role = user?.role || 'VIEWER'
  const isControllerOrAdmin = role === 'CONTROLLER' || role === 'ADMIN'

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto text-slate-900 font-sans">
      
      {/* 1. MANDATORY SIMULATION BANNER */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span className="font-bold tracking-wide uppercase text-amber-900">
            SIMULATION / DECISION-SUPPORT ONLY
          </span>
          <span className="hidden md:inline text-slate-600">
            — Operational results are based on the Rail-Sanket operational network model, timetable simulation data, task data, maintenance blocks, disruption simulation and optimization simulation.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="bg-white text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded font-mono text-[11px] font-bold shadow-2xs">
            PROTOTYPE v10.0
          </span>
        </div>
      </div>

      {/* 2. COMMAND CENTER HEADER */}
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-xs">
              <Compass className="size-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Integrated Railway Operations Command Center
                </h1>
                <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-2xs">
                  LIVE SNAPSHOT
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Kharagpur Division • South Eastern Railway • Unified Multi-Corridor Decision-Support
              </p>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500">Backend:</span>
              <span className="font-semibold text-slate-800">{data?.systemHealth?.backend || 'OPERATIONAL'}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-2xs">
              <span className={`size-2 rounded-full ${data?.systemHealth?.database === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-slate-500">DB:</span>
              <span className="font-semibold text-slate-800">{data?.systemHealth?.database || 'CONNECTED'}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-2xs">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-slate-500">Timetable:</span>
              <span className="font-semibold text-slate-800">SIMULATION</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchOverview()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-500 ml-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                {lastRefreshed}
              </span>
            )}
          </div>
        </div>

        {/* 3. OPERATIONAL FILTER & SEARCH BAR */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Filter className="size-3.5 text-blue-600" /> Filter:
            </span>

            {/* Corridor Filter */}
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">All Corridors (C01–C05)</option>
              <option value="C01">C01: Howrah – Kharagpur</option>
              <option value="C02">C02: Kharagpur – Bhubaneswar</option>
              <option value="C03">C03: Kharagpur – Tatanagar</option>
              <option value="C04">C04: Bhubaneswar – Puri</option>
              <option value="C05">C05: Panskura – Haldia</option>
            </select>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Civil Engineering (P-Way)</option>
              <option value="S&T">Signalling & Telecom (S&T)</option>
              <option value="Traction">Traction Distribution (TRD)</option>
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL Only</option>
              <option value="WARNING">WARNING Only</option>
              <option value="INFO">INFO Only</option>
            </select>

            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono shadow-2xs"
            />
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-sm w-full lg:w-auto">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Task, Block, Train, Disruption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="space-y-6">
        
        {/* 4. OPERATIONAL KPI RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3">
          {/* 1. Open Tasks */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block truncate uppercase">Open Tasks</span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
              {data?.summary?.openTasks ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Maintenance queue</span>
          </div>

          {/* 2. Proposed Blocks */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-700 block truncate uppercase">Proposed Blocks</span>
            <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
              {data?.summary?.proposedBlocks ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Awaiting review</span>
          </div>

          {/* 3. Approved Blocks */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 block truncate uppercase">Approved Blocks</span>
            <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
              {data?.summary?.approvedBlocks ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Sanctioned schedule</span>
          </div>

          {/* 4. Active Conflicts */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 block truncate uppercase">Active Conflicts</span>
            <span className="text-xl font-bold font-mono text-amber-700 block mt-1">
              {data?.summary?.activeConflicts ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Timetable clashes</span>
          </div>

          {/* 5. Critical Conflicts */}
          <div className={`bg-white border ${data?.summary?.criticalConflicts ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'} rounded-xl p-3 shadow-xs`}>
            <span className="text-[11px] font-semibold text-rose-700 block truncate uppercase">Critical Conflicts</span>
            <span className="text-xl font-bold font-mono text-rose-700 block mt-1">
              {data?.summary?.criticalConflicts ?? '—'}
            </span>
            <span className="text-[10px] text-rose-600 mt-1 block font-semibold">Immediate attention</span>
          </div>

          {/* 6. Active Disruptions */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-orange-700 block truncate uppercase">Active Incidents</span>
            <span className="text-xl font-bold font-mono text-orange-700 block mt-1">
              {data?.summary?.activeDisruptions ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Caution zones</span>
          </div>

          {/* 7. Affected Trains */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block truncate uppercase">Affected Trains</span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
              {data?.summary?.affectedTrains ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Simulated delay</span>
          </div>

          {/* 8. Pending Approvals */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-700 block truncate uppercase">Pending Sanctions</span>
            <span className="text-xl font-bold font-mono text-indigo-700 block mt-1">
              {data?.summary?.pendingApprovals ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Controller queue</span>
          </div>

          {/* 9. Network Utilization */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block truncate uppercase">Network Util</span>
            <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
              {data?.summary?.networkUtilization ? `${data.summary.networkUtilization}%` : '42%'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Division capacity</span>
          </div>

          {/* 10. Feasible Optimization */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-cyan-700 block truncate uppercase">Opt Candidates</span>
            <span className="text-xl font-bold font-mono text-cyan-700 block mt-1">
              {data?.summary?.feasibleOptimizationCandidates ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Feasible windows</span>
          </div>
        </div>

        {/* 5. SPLIT SECTION: ATTENTION QUEUE + NETWORK SCHEMATIC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* REQUIRES ATTENTION */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Requires Attention</h2>
                    <p className="text-xs text-slate-500">Prioritized operational discrepancies, conflicts, and pending sanctions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/alerts"
                    className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg transition shadow-2xs"
                  >
                    <ShieldAlert className="size-3.5 text-amber-700" />
                    <span>Alert Center</span>
                  </Link>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-700 border border-slate-200">
                    {data?.alerts?.length || 0} ITEMS
                  </span>
                </div>
              </div>

              {/* Alert Items List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {!data?.alerts || data.alerts.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-500">
                    <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-2 opacity-90" />
                    <p className="text-sm font-bold text-slate-800">Operational Clearance</p>
                    <p className="text-xs">No active critical alerts or blocked approvals on selected corridor.</p>
                  </div>
                ) : (
                  data.alerts.map((alert) => {
                    const isExpanded = expandedAlertId === alert.id
                    const isCrit = alert.severity === 'CRITICAL'
                    const isWarn = alert.severity === 'WARNING'

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl border transition p-4 shadow-2xs ${
                          isCrit
                            ? 'bg-rose-50/50 border-rose-200'
                            : isWarn
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  isCrit
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : isWarn
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}
                              >
                                {alert.severity}
                              </span>
                              <span className="text-xs font-mono text-slate-500 font-semibold">{alert.id}</span>
                              <span className="text-xs font-mono text-slate-400">•</span>
                              <span className="text-xs font-mono text-blue-700 font-semibold">{alert.corridor} ({alert.section})</span>
                              {alert.time && (
                                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                                  <Clock className="size-3" /> {alert.time}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">{alert.description}</p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                            <Link
                              href={`/alerts?alertId=${encodeURIComponent(alert.id)}`}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs"
                            >
                              <ShieldAlert className="size-3" />
                              <span>Investigate</span>
                            </Link>
                            <Link
                              href={alert.route}
                              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs"
                            >
                              <span>{alert.actionLabel}</span>
                              <ArrowRight className="size-3" />
                            </Link>
                            <button
                              onClick={() => handleOpenTrace(alert.id)}
                              className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 underline underline-offset-2"
                            >
                              <HelpCircle className="size-3" /> Trace Logic
                            </button>
                          </div>
                        </div>

                        {/* Expandable "Why This Alert Exists" */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                          <button
                            onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition"
                          >
                            <Info className="size-3.5 text-blue-600" />
                            <span>{isExpanded ? 'Hide Factual Root Cause' : 'Why This Alert Exists'}</span>
                          </button>
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1 animate-in fade-in duration-150 shadow-2xs">
                              <p className="font-bold text-blue-900">Engine Factual Assessment:</p>
                              <p className="leading-relaxed">{alert.whyThisAlertExists}</p>
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                                <span>Source: {alert.sourceModule} Engine</span>
                                <span>•</span>
                                <span>Status: Unresolved in active schedule</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick module links */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <span>Attention Queue is updated deterministically from live conflicts, blocks & incidents.</span>
              <Link href="/conflicts" className="text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1">
                Open Conflict Manager <ArrowRight className="size-3" />
              </Link>
            </div>
          </section>

          {/* NETWORK SNAPSHOT & SCHEMATIC */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <Share2 className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Network Schematic</h2>
                    <p className="text-xs text-slate-500">Operational corridor topology & sectional occupancy states</p>
                  </div>
                </div>
                <Link
                  href="/network-coordination"
                  className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  Full Network <ExternalLink className="size-3" />
                </Link>
              </div>

              {/* Schematic ASCII / Visual Layout */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono">
                <div className="text-slate-700 mb-2 font-sans font-bold flex items-center justify-between">
                  <span>Topology Flow:</span>
                  <span className="text-[11px] font-mono text-emerald-700">KGP DIVISIONAL HUB</span>
                </div>

                {/* Visual Node Diagram */}
                <div className="space-y-2.5 py-1">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-blue-700 font-bold">C01 (Howrah–KGP)</span>
                    <span className="text-slate-700">HWH ── SRC ── PKU ── [KGP]</span>
                    <span className="text-emerald-700 text-[10px] font-bold">42% Util</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-emerald-700 font-bold">C02 (KGP–Bhubaneswar)</span>
                    <span className="text-slate-700">[KGP] ── BLS ── CTC ── BBS</span>
                    <span className="text-amber-700 text-[10px] font-bold">58% Util</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-indigo-700 font-bold">C03 (KGP–Tatanagar)</span>
                    <span className="text-slate-700">[KGP] ── GII ── TATA</span>
                    <span className="text-emerald-700 text-[10px] font-bold">35% Util</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-orange-700 font-bold">C05 (Panskura–Haldia)</span>
                    <span className="text-slate-700">PKU ── HLZ (Port Freight)</span>
                    <span className="text-emerald-700 text-[10px] font-bold">48% Util</span>
                  </div>
                </div>

                {/* Section State Legend */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">FREE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="text-slate-600">OCCUPIED</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="text-slate-600">MAINT_BLOCK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500" />
                    <span className="text-slate-600">CONFLICT</span>
                  </div>
                </div>
              </div>

              {/* Corridor Quick Links */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <button
                  onClick={() => setSelectedCorridor('C01')}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left transition shadow-2xs"
                >
                  <span className="font-bold text-blue-700 block">Corridor C01</span>
                  <span className="text-[11px] text-slate-500">HWH–SRC–PKU–KGP (3 Sections)</span>
                </button>
                <button
                  onClick={() => setSelectedCorridor('C02')}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left transition shadow-2xs"
                >
                  <span className="font-bold text-emerald-700 block">Corridor C02</span>
                  <span className="text-[11px] text-slate-500">KGP–BLS–CTC–BBS (3 Sections)</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Overall Divisional Utilization:</span>
              <span className="font-mono font-bold text-emerald-700">
                {data?.summary?.networkUtilization ? `${data.summary.networkUtilization}%` : '42%'} Capacity
              </span>
            </div>
          </section>
        </div>

        {/* 6. TRAIN IMPACT TABLE & ACTIVE DISRUPTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SIMULATED TRAIN IMPACT */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Train className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Simulated Train Impact</h2>
                  <p className="text-xs text-slate-500">Estimated passenger and freight regulation resulting from maintenance & disruptions</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-semibold">
                SIMULATED DELAY ONLY
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="pb-2.5 pl-2">Train</th>
                    <th className="pb-2.5">Corridor / Section</th>
                    <th className="pb-2.5">Window</th>
                    <th className="pb-2.5">Simulated Delay</th>
                    <th className="pb-2.5">Cause Attribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {!data?.trains || data.trains.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        Zero passenger or freight trains affected under current simulated schedule.
                      </td>
                    </tr>
                  ) : (
                    data.trains.slice(0, 6).map((train) => (
                      <tr key={train.trainNumber} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 pl-2">
                          <span className="font-bold text-slate-900 block">{train.trainNumber}</span>
                          <span className="text-[10px] text-slate-500 font-sans block">{train.trainName}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-blue-700 font-semibold">{train.corridor}</span>
                          <span className="text-slate-500 text-[11px] font-sans block">{train.section}</span>
                        </td>
                        <td className="py-2.5 text-slate-700">{train.scheduledMovement}</td>
                        <td className="py-2.5">
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              train.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            +{train.simulatedDelayMinutes}m
                          </span>
                        </td>
                        <td className="py-2.5 font-sans text-slate-700 text-xs">{train.cause}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ACTIVE DISRUPTIONS */}
          <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <Radio className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Active Disruptions</h2>
                    <p className="text-xs text-slate-500">Simulated unscheduled incidents</p>
                  </div>
                </div>
                <Link
                  href="/disruptions"
                  className="text-xs text-orange-700 hover:text-orange-800 font-semibold flex items-center gap-1"
                >
                  Manage <ArrowRight className="size-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {!data?.disruptions || data.disruptions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                    Zero active disruptions reported on selected corridor.
                  </div>
                ) : (
                  data.disruptions.map((d) => (
                    <div
                      key={d.incidentId}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-orange-700 font-mono">{d.incidentId}</span>
                        <span className="text-[10px] font-mono bg-orange-100 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded font-bold">
                          {d.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{d.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>{d.corridorId} ({d.sectionId || 'Section'})</span>
                        <span>{d.start}–{d.end}</span>
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {d.affectedTrainCount} trains cautioned
                        </span>
                        <Link
                          href={`/disruptions?incidentId=${d.incidentId}`}
                          className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold underline"
                        >
                          Find Rescheduling
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Section cautions auto-quarantined</span>
              <span className="font-mono text-emerald-700 font-semibold">Zero collision risk</span>
            </div>
          </section>
        </div>

        {/* 7. MAINTENANCE BLOCKS STATUS & PENDING APPROVALS QUEUE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PENDING APPROVALS */}
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Shield className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pending Approvals Queue</h2>
                  <p className="text-xs text-slate-500">Maintenance block plans awaiting Four-Eyes Section Controller review</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded shadow-2xs">
                FOUR-EYES GOVERNANCE
              </span>
            </div>

            <div className="space-y-3">
              {!data?.approvals || data.approvals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                  <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1.5 opacity-90" />
                  <p className="font-bold text-slate-800">Approval Queue Clear</p>
                  <p>All submitted block plans have been sanctioned or reviewed.</p>
                </div>
              ) : (
                data.approvals.map((b) => (
                  <div
                    key={b.blockId}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">{b.blockId}</span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                          {b.status}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            b.conflictStatus === 'CLEAR'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {b.conflictStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{b.date}</span>
                    </div>

                    <div className="text-xs text-slate-800 flex items-center justify-between">
                      <span className="font-medium">{b.corridorId} • {b.section}</span>
                      <span className="font-mono text-blue-700 font-bold">{b.window} ({b.durationMin}m)</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Bundled Tasks: {b.taskCount} ({b.taskIds.slice(0, 3).join(', ')}{b.taskIds.length > 3 ? '...' : ''})</span>
                      <span>Staged by: {b.createdBy}</span>
                    </div>

                    {/* Controller Action Buttons */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenTrace(b.blockId)}
                        className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <HelpCircle className="size-3" /> Decision Trace
                      </button>

                      {isControllerOrAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleBlockAction(b.blockId, 'approve')}
                            disabled={actionInProgressId === b.blockId}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-3 py-1 rounded text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <Check className="size-3" /> Sanction
                          </button>
                          <button
                            onClick={() => handleBlockAction(b.blockId, 'reject')}
                            disabled={actionInProgressId === b.blockId}
                            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-2.5 py-1 rounded text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <X className="size-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/approvals"
                          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="size-3" /> View Only
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ALL MAINTENANCE BLOCKS STATUS */}
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <CalendarClock className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Maintenance Block Status</h2>
                  <p className="text-xs text-slate-500">Overview of proposed, approved, and rejected railway blocks</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setBlockCategoryTab('proposed')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    blockCategoryTab === 'proposed' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Proposed ({data?.blocks?.proposed?.length || 0})
                </button>
                <button
                  onClick={() => setBlockCategoryTab('approved')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    blockCategoryTab === 'approved' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Approved ({data?.blocks?.approved?.length || 0})
                </button>
                <button
                  onClick={() => setBlockCategoryTab('rejected')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    blockCategoryTab === 'rejected' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rejected ({data?.blocks?.rejected?.length || 0})
                </button>
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {(!data?.blocks || !data.blocks[blockCategoryTab] || data.blocks[blockCategoryTab].length === 0) ? (
                <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                  Zero blocks found in category &quot;{blockCategoryTab}&quot;.
                </div>
              ) : (
                data.blocks[blockCategoryTab].map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-900">{b.id}</span>
                      <span className="text-slate-500">{b.date} • {b.start}–{b.end}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-800">
                      <span className="font-medium">{b.corridorId} • {b.section}</span>
                      <span className="text-blue-700 font-mono font-bold">{b.durationMin}m</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{b.blockType || 'Traffic Block'} • Tasks: {(b.taskIds || []).length}</span>
                      <button
                        onClick={() => handleOpenTrace(b.id)}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        Inspect Trace
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Total Divisional Blocks: {data?.blocks?.total || 0}</span>
              <Link href="/planner" className="text-blue-700 font-semibold hover:underline">
                Open Block Planner →
              </Link>
            </div>
          </section>
        </div>

        {/* 8. OPTIMIZATION & AUDIT STREAM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* OPTIMIZATION STATUS */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Cpu className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Constraint Optimization</h2>
                  <p className="text-xs text-slate-500">Automated candidate window discovery</p>
                </div>
              </div>
              <Link
                href="/optimization"
                className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1"
              >
                Open Optimizer <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Last Optimization Run:</span>
                <span className="font-mono text-cyan-800 font-bold">{data?.optimization?.lastRunId || 'OPT-C01'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Corridors Evaluated:</span>
                <span className="font-mono text-slate-800 font-semibold">{(data?.optimization?.corridors || ['C01']).join(', ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-emerald-700 block font-bold">Feasible Windows</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{data?.optimization?.feasibleCount ?? 4}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-rose-700 block font-bold">Pruned Infeasible</span>
                  <span className="text-lg font-bold font-mono text-rose-800">{data?.optimization?.infeasibleCount ?? 2}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                Deterministic solver scans timetable gaps, crew limits, and active disruptions. Candidates remain in simulation until staged as Proposed.
              </p>
            </div>
          </section>

          {/* RECENT OPERATIONAL ACTIVITY (Audit Stream) */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <Activity className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent Operational Activity</h2>
                  <p className="text-xs text-slate-500">Live immutable audit trail of officer decisions</p>
                </div>
              </div>
              <Link
                href="/settings"
                className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                Full Audit Trail <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
              {!data?.recentActivity || data.recentActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl text-xs">
                  Zero recent activity logs found.
                </div>
              ) : (
                data.recentActivity.slice(0, 5).map((log) => (
                  <div
                    key={log.auditId}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-700 font-bold text-[11px]">{log.action}</span>
                        <span className="text-slate-700 font-medium">{log.entityType}:{log.entityId}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{log.reason || 'Operational execution'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-800 font-semibold block">{log.userName} ({log.role})</span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* 9. ROLE-AWARE QUICK ACTIONS */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="size-4 text-amber-600" /> Quick Operational Actions ({role})
              </h3>
              <p className="text-xs text-slate-500">Contextual shortcuts enabled for your assigned railway cadre</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-semibold">
            <Link
              href="/planner"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <CalendarClock className="size-4 text-blue-600" />
              <span>Plan Block</span>
            </Link>

            <Link
              href="/what-if"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <SlidersHorizontal className="size-4 text-emerald-600" />
              <span>Run What-If</span>
            </Link>

            <Link
              href="/network-coordination"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <Share2 className="size-4 text-indigo-600" />
              <span>Network Plan</span>
            </Link>

            <Link
              href="/disruptions"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <Radio className="size-4 text-orange-600" />
              <span>Disruptions</span>
            </Link>

            <Link
              href="/optimization"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <Cpu className="size-4 text-cyan-600" />
              <span>Optimize Plan</span>
            </Link>

            <Link
              href="/reports"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5 text-slate-800 transition shadow-2xs"
            >
              <FileText className="size-4 text-amber-600" />
              <span>Dossier Reports</span>
            </Link>
          </div>
        </section>

      </main>

      {/* 10. EXPLAINABLE OPERATIONAL DECISION TRACE MODAL */}
      {traceModalOpen && activeTrace && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <HelpCircle className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Operational Decision Trace</h3>
                  <p className="text-xs text-slate-500 font-mono">{activeTrace.title}</p>
                </div>
              </div>
              <button
                onClick={() => setTraceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Trace Steps Timeline */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 shadow-2xs">
                <span className="font-bold">Transparent Audit Trail:</span> This step-by-step breakdown reflects exact algorithmic constraint evaluations performed by the Rail-Sanket decision-support platform.
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activeTrace.steps.map((step) => {
                  const isWarn = step.status === 'WARNING' || step.status === 'ACTIVE'
                  const isApproved = step.status === 'APPROVED' || step.status === 'PASSED' || step.status === 'COMPLETED'
                  const isPending = step.status === 'PENDING_SANCTION' || step.status === 'AWAITING_RESOLUTION'

                  return (
                    <div key={step.stepNumber} className="relative group">
                      {/* Step Circle */}
                      <div
                        className={`absolute -left-6 top-1 size-5 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold ${
                          isWarn
                            ? 'bg-rose-100 border-rose-400 text-rose-800'
                            : isApproved
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                            : isPending
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                            : 'bg-white border-slate-300 text-slate-600'
                        }`}
                      >
                        {step.stepNumber}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {step.name}
                          </h4>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isWarn
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{step.summary}</p>
                        {step.details && step.details.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 pl-3 list-disc text-[11px] text-slate-500">
                            {step.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Section Controller retains final sanction authority.</span>
              <button
                onClick={() => setTraceModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-1.5 rounded-lg transition shadow-2xs"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
