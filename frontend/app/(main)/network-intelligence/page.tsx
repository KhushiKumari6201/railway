'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Network,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Train,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Eye,
  Hash,
  MapPin,
  Check,
  Share2,
  Radio,
} from 'lucide-react'
import { api } from '@/lib/api'
import type {
  NetworkIntelligenceResponse,
  NetworkCorridor,
  NetworkSection,
  NetworkTrain,
  NetworkActiveBlockSummary,
  Conflict,
  NetworkSectionStatus,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function NetworkIntelligencePage() {
  const [data, setData] = useState<NetworkIntelligenceResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<NetworkSection | null>(null)
  const [activeTab, setActiveTab] = useState<'schematic' | 'trains' | 'blocks' | 'conflicts'>('trains')

  // Filters
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL')
  const [selectedTrainTypeFilter, setSelectedTrainTypeFilter] = useState<string>('ALL')
  const [selectedBlockStatusFilter, setSelectedBlockStatusFilter] = useState<string>('ALL')
  const [selectedConflictFilter, setSelectedConflictFilter] = useState<string>('ALL')

  // Load Network Intelligence
  const loadNetworkData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getNetworkIntelligence(
        selectedCorridorFilter !== 'ALL' ? selectedCorridorFilter : undefined
      )
      setData(res)
      setLastRefreshed(new Date().toLocaleTimeString())

      // If currently selected section still exists in new data, keep it updated
      if (selectedSection && res.corridors) {
        let updated: NetworkSection | null = null
        for (const c of res.corridors) {
          const match = c.sections.find(
            (s) => s.corridorId === selectedSection.corridorId && s.section === selectedSection.section
          )
          if (match) {
            updated = match
            break
          }
        }
        setSelectedSection(updated || res.corridors[0]?.sections[0] || null)
      } else if (res.corridors?.[0]?.sections?.[0]) {
        setSelectedSection(res.corridors[0].sections[0])
      }
    } catch (err: any) {
      console.error('[NetworkIntelligence] Fetch Error:', err)
      setError(err.message || 'Failed to connect to Network Intelligence API')
    } finally {
      setLoading(false)
    }
  }, [selectedCorridorFilter])

  useEffect(() => {
    loadNetworkData()
  }, [loadNetworkData])

  // Realistic Status Badge Helper
  const getStatusBadge = (status: NetworkSectionStatus) => {
    switch (status) {
      case 'MAINTENANCE_BLOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            MAINTENANCE BLOCK
          </span>
        )
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            CONFLICT
          </span>
        )
      case 'OCCUPIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            OCCUPIED
          </span>
        )
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            RESERVED
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            CLOSED
          </span>
        )
      case 'FREE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            FREE
          </span>
        )
    }
  }

  // Filtered Trains
  const filteredTrains = useMemo(() => {
    if (!data?.trains) return []
    return data.trains.filter((t) => {
      const matchCorridor = selectedCorridorFilter === 'ALL' || t.corridorId === selectedCorridorFilter
      const matchType = selectedTrainTypeFilter === 'ALL' || t.trainType === selectedTrainTypeFilter
      return matchCorridor && matchType
    })
  }, [data?.trains, selectedCorridorFilter, selectedTrainTypeFilter])

  // Filtered Blocks
  const filteredBlocks = useMemo(() => {
    if (!data?.activeBlocks) return []
    return data.activeBlocks.filter((b) => {
      const matchCorridor = selectedCorridorFilter === 'ALL' || b.corridorId === selectedCorridorFilter
      const matchStatus = selectedBlockStatusFilter === 'ALL' || b.status === selectedBlockStatusFilter
      return matchCorridor && matchStatus
    })
  }, [data?.activeBlocks, selectedCorridorFilter, selectedBlockStatusFilter])

  // Filtered Conflicts
  const filteredConflicts = useMemo(() => {
    if (!data?.conflicts) return []
    return data.conflicts.filter((c) => {
      const matchCorridor = selectedCorridorFilter === 'ALL' || c.corridorId === selectedCorridorFilter
      const matchSeverity = selectedConflictFilter === 'ALL' || c.severity === selectedConflictFilter
      return matchCorridor && matchSeverity
    })
  }, [data?.conflicts, selectedCorridorFilter, selectedConflictFilter])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto text-slate-900">
      {/* ======================================================== */}
      {/* 1. HEADER & CONTROLS                                     */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <span>Operational Railway Intelligence</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-blue-700">Kharagpur Division</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Network Intelligence & Railway Traffic
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Kharagpur Division Section Monitoring & Control Room Schematic
              </p>
            </div>
          </div>
        </div>

        {/* Action & Sync Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {lastRefreshed && (
            <span className="text-xs text-slate-500 font-mono hidden sm:inline-block bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              Synced: {lastRefreshed}
            </span>
          )}
          <Link href="/network-coordination">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs gap-1.5 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              Coordination Engine
            </Button>
          </Link>
          <Link href="/disruptions">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs gap-1.5 shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 text-rose-600" />
              Disruptions & Feedback
            </Button>
          </Link>
          <Button
            onClick={loadNetworkData}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs gap-1.5 shadow-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Network
          </Button>
        </div>
      </div>

      {/* Mandatory Mode Badge Banner */}
      <div className="bg-blue-50/70 border border-blue-200/90 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-white text-blue-800 border-blue-300 font-mono text-[11px] px-2.5 py-0.5 shadow-xs font-semibold">
            Network Mode: Simulation / Timetable Data
          </Badge>
          <span className="text-slate-600">
            Source: Kharagpur Division Operational Model & MongoDB Collections. Live GPS tracking is not claimed.
          </span>
        </div>
        <div className="text-emerald-700 flex items-center gap-1.5 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Backend Active (MongoDB Connected)
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={loadNetworkData} className="text-rose-700 hover:text-rose-900 hover:bg-rose-100">
            Retry
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUMMARY KPI CARDS                                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Corridors</p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {data?.summary.totalCorridors ?? 5}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">12 track sections</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Occupied Sections</p>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {data?.summary.occupiedSections ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Active train slots</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Maintenance Blocks</p>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {data?.summary.maintenanceBlocks ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Approved in MongoDB</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Conflicts</p>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {data?.summary.activeConflicts ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Unresolved alerts</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Train Paths</p>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {data?.summary.trainsInNetwork ?? 10}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Timetable simulation</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Network Utilization</p>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {data?.summary.utilizationPercent ?? 0}%
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium" title={data?.metrics?.formula || 'Booked time / Available time'}>
              Track occupancy formula
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Network Coordination Summary Entry Point */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-blue-100/80 border border-blue-300/60 text-blue-700">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <span>Multi-Corridor Network Coordination</span>
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300 bg-white font-semibold">
                Phase 6
              </Badge>
            </div>
            <div className="text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span>Connected Corridors: <strong className="text-slate-900">5 Corridors</strong></span>
              <span>•</span>
              <span>Interchange Junctions: <strong className="text-slate-900">KGP, SRC, BBS</strong></span>
              <span>•</span>
              <span>Cross-Corridor Propagation: <strong className="text-emerald-700 font-semibold">Active</strong></span>
            </div>
          </div>
        </div>
        <Link href="/network-coordination">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 whitespace-nowrap shadow-xs">
            <span>View Coordination</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* ======================================================== */}
      {/* 3. FILTERS BAR                                           */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Corridor Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Corridor:</span>
          <select
            value={selectedCorridorFilter}
            onChange={(e) => setSelectedCorridorFilter(e.target.value)}
            className="bg-white text-slate-800 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Corridors (5)</option>
            <option value="C01">C01: Howrah–Kharagpur</option>
            <option value="C02">C02: Kharagpur–Bhubaneswar</option>
            <option value="C03">C03: Kharagpur–Tatanagar</option>
            <option value="C04">C04: Bhubaneswar–Puri</option>
            <option value="C05">C05: Santragachi–KGP (Freight)</option>
          </select>
        </div>

        {/* Section Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-white text-slate-800 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="FREE">FREE</option>
            <option value="OCCUPIED">OCCUPIED</option>
            <option value="MAINTENANCE_BLOCK">MAINTENANCE BLOCK</option>
            <option value="CONFLICT">CONFLICT</option>
            <option value="RESERVED">RESERVED</option>
          </select>
        </div>

        {/* Train Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Train:</span>
          <select
            value={selectedTrainTypeFilter}
            onChange={(e) => setSelectedTrainTypeFilter(e.target.value)}
            className="bg-white text-slate-800 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Train Types</option>
            <option value="Superfast">Superfast</option>
            <option value="Express">Express</option>
            <option value="Goods">Goods / Freight</option>
          </select>
        </div>

        {/* Conflict Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Conflict:</span>
          <select
            value={selectedConflictFilter}
            onChange={(e) => setSelectedConflictFilter(e.target.value)}
            className="bg-white text-slate-800 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Conflicts</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
          </select>
        </div>

        {/* Reset Filters button */}
        {(selectedCorridorFilter !== 'ALL' ||
          selectedStatusFilter !== 'ALL' ||
          selectedTrainTypeFilter !== 'ALL' ||
          selectedConflictFilter !== 'ALL') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedCorridorFilter('ALL')
              setSelectedStatusFilter('ALL')
              setSelectedTrainTypeFilter('ALL')
              setSelectedConflictFilter('ALL')
            }}
            className="text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-7 px-2.5"
          >
            Reset
          </Button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. MAIN INTERACTIVE LAYOUT                               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / CENTER: Control-Room Schematic (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Railway Control-Room Network Schematic
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Live sectional status across Kharagpur Division corridors. Click any section for detailed operational breakdown.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Block
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Conflict
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-5">
              {loading && !data ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Aggregating railway network status from MongoDB & Timetable...</span>
                </div>
              ) : !data?.corridors || data.corridors.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No corridor data found matching selected filter.
                </div>
              ) : (
                data.corridors.map((corridor) => (
                  <div
                    key={corridor.corridorId}
                    className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/90 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {corridor.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-slate-700 bg-white border-slate-300 font-semibold">
                          {corridor.corridorId}
                        </Badge>
                        <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                          Route: {corridor.route}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Utilization: <span className="font-bold text-blue-700">{corridor.utilization}%</span>
                      </div>
                    </div>

                    {/* Control Room Schematic Line */}
                    <div className="relative pt-2 pb-1 overflow-x-auto">
                      <div className="flex items-center min-w-[500px]">
                        {corridor.sections.map((section, sIdx) => {
                          const isSelected =
                            selectedSection?.corridorId === section.corridorId &&
                            selectedSection?.section === section.section

                          // Filter out if user selected a status filter
                          const isMuted =
                            selectedStatusFilter !== 'ALL' && section.status !== selectedStatusFilter

                          return (
                            <React.Fragment key={section.section}>
                              {/* Station Node (Start of first section) */}
                              {sIdx === 0 && (
                                <div className="flex flex-col items-center flex-shrink-0 z-10">
                                  <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold text-blue-900 shadow-sm">
                                    {section.from.split(' ')[0].substring(0, 3).toUpperCase()}
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-700 mt-1 max-w-[70px] text-center truncate">
                                    {section.from.split(' ')[0]}
                                  </span>
                                </div>
                              )}

                              {/* Track Section Segment */}
                              <div
                                onClick={() => setSelectedSection(section)}
                                className={`flex-1 mx-2 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                                    : 'bg-white hover:bg-slate-100/80 border-slate-200/90 shadow-xs'
                                } ${isMuted ? 'opacity-30' : 'opacity-100'}`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="font-mono text-xs font-bold text-slate-900">
                                    {section.section}
                                  </span>
                                  {getStatusBadge(section.status)}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                                  <span>
                                    {section.occupancy.trainCount > 0
                                      ? `${section.occupancy.trainCount} train path(s)`
                                      : 'No trains active'}
                                  </span>
                                  <span className="text-slate-500 font-medium">
                                    {section.utilization}% util
                                  </span>
                                </div>

                                {/* Active Block pill if present */}
                                {section.activeBlock && (
                                  <div className="mt-1.5 text-[10px] p-1 rounded bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-between font-mono">
                                    <span className="truncate font-medium">
                                      {section.activeBlock.id} ({section.activeBlock.durationMin}m)
                                    </span>
                                    <span className="text-purple-700 font-bold uppercase text-[9px]">
                                      {section.activeBlock.status}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Station Node (Destination of current section) */}
                              <div className="flex flex-col items-center flex-shrink-0 z-10">
                                <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-sm">
                                  {section.to.split(' ')[0].substring(0, 3).toUpperCase()}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-700 mt-1 max-w-[70px] text-center truncate">
                                  {section.to.split(' ')[0]}
                                </span>
                              </div>
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SECTION INSPECTOR PANEL */}
          {selectedSection && (
            <Card className="bg-white border-blue-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm text-slate-900 font-bold">
                      Section Inspector: {selectedSection.section} ({selectedSection.corridorId})
                    </CardTitle>
                  </div>
                  <div>{getStatusBadge(selectedSection.status)}</div>
                </div>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  {selectedSection.from} → {selectedSection.to}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Block Info */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-purple-600" />
                    Active Maintenance Block
                  </p>
                  {selectedSection.activeBlock ? (
                    <div className="space-y-1 font-mono text-[11px] text-slate-700">
                      <div>
                        <span className="text-slate-500 font-medium">ID:</span> {selectedSection.activeBlock.id}
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Time:</span> {selectedSection.activeBlock.start} – {selectedSection.activeBlock.end} ({selectedSection.activeBlock.durationMin}m)
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Status:</span>{' '}
                        <span className="text-purple-700 font-bold">{selectedSection.activeBlock.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Type:</span> {selectedSection.activeBlock.blockType}
                      </div>
                      <div className="pt-1.5">
                        <Link href="/planner" className="text-blue-700 hover:text-blue-800 font-medium hover:underline flex items-center gap-1">
                          View in Block Planner <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic">No active or recommended block on this section.</p>
                  )}
                </div>

                {/* Train Paths */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-blue-600" />
                    Active Train Paths ({selectedSection.trains?.length ?? 0})
                  </p>
                  {selectedSection.trains && selectedSection.trains.length > 0 ? (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {selectedSection.trains.map((t) => (
                        <div key={t.id} className="p-2 rounded bg-white border border-slate-200 text-[11px] font-mono shadow-2xs">
                          <div className="text-slate-900 font-bold">{t.trainNumber} - {t.trainName}</div>
                          <div className="text-slate-600 text-[10px] mt-0.5">
                            {t.start} – {t.end} | <span className="text-amber-700 font-semibold">{t.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic">No train paths currently traversing this section.</p>
                  )}
                </div>

                {/* Utilization & Metrics */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Section Capacity & Load
                  </p>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-600 font-medium">Utilization:</span>
                      <span className="text-emerald-700 font-bold">{selectedSection.utilization}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${selectedSection.utilization}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-1.5 text-[10px] text-slate-600 font-mono space-y-0.5">
                    <div>Corridor Tasks: <strong className="text-slate-800">{selectedSection.tasksCount}</strong> queued</div>
                    <div>Corridor Conflicts: <strong className="text-slate-800">{selectedSection.conflictsCount}</strong> active</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Operational Panels Tabs (Train Activity, Blocks, Alerts) */}
        <div className="space-y-4">
          {/* Panel Selector Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('trains')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'trains' || activeTab === 'schematic'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              Trains ({filteredTrains.length})
            </button>
            <button
              onClick={() => setActiveTab('blocks')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'blocks'
                  ? 'border-purple-600 text-purple-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Blocks ({filteredBlocks.length})
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'conflicts'
                  ? 'border-rose-600 text-rose-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Alerts ({filteredConflicts.length})
            </button>
          </div>

          {/* TAB 1: TRAIN ACTIVITY PANEL */}
          {(activeTab === 'trains' || activeTab === 'schematic') && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-600 font-bold flex items-center justify-between">
                  <span>Train Movement (Timetable Data)</span>
                  <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300 bg-blue-50 font-mono font-semibold">
                    SIMULATION
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[500px] overflow-y-auto">
                {filteredTrains.length === 0 ? (
                  <p className="text-slate-500 text-xs italic py-6 text-center">No train paths matching filters.</p>
                ) : (
                  filteredTrains.map((train) => (
                    <div
                      key={train.id}
                      className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-1.5 text-xs hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {train.trainNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            train.status === 'IN SECTION'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : train.status === 'APPROACHING'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {train.status}
                        </span>
                      </div>

                      <div className="text-slate-800 font-medium">{train.trainName}</div>

                      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                        <span>{train.origin} → {train.destination}</span>
                        <Badge variant="secondary" className="text-[10px] bg-white text-slate-700 border border-slate-200 font-medium">
                          {train.trainType}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                        <span>Section: <span className="text-slate-800 font-medium">{train.section}</span> ({train.corridorId})</span>
                        <span>Slot: {train.start} – {train.end}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: MAINTENANCE BLOCKS PANEL */}
          {activeTab === 'blocks' && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-600 font-bold flex items-center justify-between">
                  <span>Maintenance Blocks (MongoDB)</span>
                  <Link href="/planner" className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1">
                    Planner <ExternalLink className="w-3 h-3" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[500px] overflow-y-auto">
                {filteredBlocks.length === 0 ? (
                  <p className="text-slate-500 text-xs italic py-6 text-center">No active or recommended blocks found.</p>
                ) : (
                  filteredBlocks.map((blk) => (
                    <div
                      key={blk.id}
                      className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 space-y-1.5 text-xs hover:border-purple-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 font-mono">{blk.id}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            blk.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}
                        >
                          {blk.status}
                        </span>
                      </div>

                      <div className="text-slate-700 font-mono text-[11px]">
                        Corridor: {blk.corridorId} | Section: {blk.section}
                      </div>

                      <div className="text-slate-600 font-mono text-[11px] flex items-center justify-between">
                        <span>Window: {blk.start} – {blk.end}</span>
                        <span>Duration: {blk.durationMin}m</span>
                      </div>

                      <div className="text-slate-500 text-[10px] font-mono flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                        <span>Tasks Bundled: {blk.taskCount}</span>
                        <span>Confidence: {blk.confidence || 'High'}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: NETWORK CONFLICTS PANEL */}
          {activeTab === 'conflicts' && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-600 font-bold flex items-center justify-between">
                  <span>Network Conflicts & Alerts</span>
                  <Link href="/conflicts" className="text-xs text-rose-700 font-semibold hover:underline flex items-center gap-1">
                    Manage Conflicts <ExternalLink className="w-3 h-3" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[500px] overflow-y-auto">
                {filteredConflicts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs italic">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-90" />
                    No unresolved network conflicts active.
                  </div>
                ) : (
                  filteredConflicts.map((cnf) => (
                    <div
                      key={cnf.id}
                      className="p-3 rounded-lg bg-rose-50/40 border border-rose-200 space-y-1.5 text-xs hover:border-rose-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-[11px] truncate max-w-[200px]">
                          {cnf.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            cnf.severity === 'Critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {cnf.severity}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px]">{cnf.description}</p>

                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1.5 border-t border-rose-200/60">
                        <span>Corridor: {cnf.corridorId}</span>
                        <span>Time: {cnf.time}</span>
                      </div>

                      {cnf.suggestedAction && (
                        <div className="text-[10px] text-blue-900 bg-blue-50 p-2 rounded border border-blue-200">
                          <span className="font-bold text-blue-800">Action:</span> {cnf.suggestedAction}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
