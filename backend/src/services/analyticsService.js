const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')
const Conflict = require('../models/Conflict')
const AuditLog = require('../models/AuditLog')
const { getDisruptions } = require('./disruptionService')
const { trainMovements } = require('../data/timetableData')

/**
 * Calculates deterministic operational analytics across all corridors
 * @param {Object} [filters]
 * @param {string} [filters.corridorId]
 * @param {string} [filters.department]
 * @returns {Promise<Object>}
 */
async function getOperationalAnalytics(filters = {}) {
  const taskFilter = {}
  const blockFilter = {}
  const conflictFilter = {}

  if (filters.corridorId) {
    const cId = filters.corridorId.trim().toUpperCase()
    taskFilter.corridorId = cId
    blockFilter.corridorId = cId
    conflictFilter.corridorId = cId
  }

  if (filters.department) {
    taskFilter.department = filters.department
  }

  // 1. Fetch data in parallel
  const [tasks, blocks, conflicts] = await Promise.all([
    Task.find(taskFilter).lean(),
    RecommendedBlock.find(blockFilter).lean(),
    Conflict.find(conflictFilter).lean(),
  ])

  // 2. Task status & department distribution
  const taskStatusDist = { Open: 0, Scheduled: 0, Completed: 0 }
  const tasksByDepartment = { Engineering: 0, 'S&T': 0, Traction: 0 }
  let totalOverdueDays = 0

  tasks.forEach((t) => {
    if (taskStatusDist[t.status] !== undefined) {
      taskStatusDist[t.status]++
    }
    if (tasksByDepartment[t.department] !== undefined) {
      tasksByDepartment[t.department]++
    }
    totalOverdueDays += Number(t.overdueDays || 0)
  })

  const totalTasks = tasks.length
  const taskCompletionRate = totalTasks > 0 ? Math.round((taskStatusDist.Completed / totalTasks) * 100) : 0
  const taskSchedulingRate = totalTasks > 0 ? Math.round(((taskStatusDist.Scheduled + taskStatusDist.Completed) / totalTasks) * 100) : 0

  // 3. Block status & corridor distribution
  const blockStatusDist = {
    Recommended: 0,
    Proposed: 0,
    Under_Review: 0,
    Approved: 0,
    Rejected: 0,
  }
  const blocksByCorridor = { C01: 0, C02: 0, C03: 0, C04: 0, C05: 0 }
  let totalDowntimeSaved = 0
  let totalApprovedDuration = 0

  blocks.forEach((b) => {
    const st = b.status || 'Recommended'
    if (blockStatusDist[st] !== undefined) {
      blockStatusDist[st]++
    }
    if (blocksByCorridor[b.corridorId] !== undefined) {
      blocksByCorridor[b.corridorId]++
    }
    totalDowntimeSaved += Number(b.downtimeSavedMin || 0)
    if (st === 'Approved') {
      totalApprovedDuration += Number(b.durationMin || 0)
    }
  })

  // 4. Conflict severity & corridor distribution
  const conflictSeverityDist = { Low: 0, Medium: 0, High: 0, Critical: 0 }
  const conflictsByCorridor = { C01: 0, C02: 0, C03: 0, C04: 0, C05: 0 }
  let activeConflictsCount = 0

  conflicts.forEach((c) => {
    if (!c.resolved) {
      activeConflictsCount++
      const sev = c.severity || 'Medium'
      if (conflictSeverityDist[sev] !== undefined) {
        conflictSeverityDist[sev]++
      }
      if (conflictsByCorridor[c.corridorId] !== undefined) {
        conflictsByCorridor[c.corridorId]++
      }
    }
  })

  // 5. Simulated Disruption Metrics
  const activeDisruptions = getDisruptions().filter((d) => d.status === 'ACTIVE')
  let totalSimulatedDelayMin = 0
  let affectedTrainsCount = 0

  // Standard timetable calculation
  activeDisruptions.forEach((d) => {
    totalSimulatedDelayMin += Number(d.estimatedDuration || d.delayMinutes || 60)
  })

  // Count timetable trains overlapping active blocks or disruptions
  const activeBlockWindows = blocks
    .filter((b) => b.status === 'Approved' || b.status === 'Recommended')
    .map((b) => ({ start: b.start, end: b.end, corridorId: b.corridorId }))

  trainMovements.forEach((train) => {
    const hasOverlap = activeBlockWindows.some(
      (w) => w.corridorId === 'C01' && train.departure >= w.start && train.departure <= w.end
    )
    if (hasOverlap) affectedTrainsCount++
  })

  const averageSimulatedDelay =
    activeDisruptions.length > 0 ? Math.round(totalSimulatedDelayMin / activeDisruptions.length) : 0

  // 6. Network Utilization (Deterministic estimate based on sections and blocks)
  const baseUtilization = 68
  const blockAdjustment = Math.min(20, blocks.filter((b) => b.status === 'Approved').length * 4)
  const networkUtilization = Math.min(95, baseUtilization + blockAdjustment)

  const optAuditCount = await AuditLog.countDocuments({
    action: { $in: ['OPTIMIZATION_GENERATED', 'OPTIMIZATION_APPLIED'] },
  }).catch(() => 0)

  return {
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    summary: {
      totalTasks,
      openTasks: taskStatusDist.Open,
      scheduledTasks: taskStatusDist.Scheduled,
      completedTasks: taskStatusDist.Completed,
      taskCompletionRate,
      taskSchedulingRate,
      totalBlocks: blocks.length,
      approvedBlocks: blockStatusDist.Approved,
      pendingReviewBlocks: blockStatusDist.Under_Review + blockStatusDist.Proposed + blockStatusDist.Recommended,
      rejectedBlocks: blockStatusDist.Rejected,
      activeConflicts: activeConflictsCount,
      activeDisruptions: activeDisruptions.length,
      totalSimulatedDelayMin,
      averageSimulatedDelay,
      affectedTrainsCount,
      networkUtilization,
      totalDowntimeSavedMin: totalDowntimeSaved,
      totalApprovedMaintenanceHours: (totalApprovedDuration / 60).toFixed(1),
      optimizationRuns: optAuditCount || 1,
      optimizationStagedBlocks: blockStatusDist.Proposed,
    },
    tasks: {
      statusDistribution: taskStatusDist,
      departmentDistribution: tasksByDepartment,
      totalOverdueDays,
    },
    blocks: {
      statusDistribution: blockStatusDist,
      corridorDistribution: blocksByCorridor,
    },
    conflicts: {
      severityDistribution: conflictSeverityDist,
      corridorDistribution: conflictsByCorridor,
      unresolvedCount: activeConflictsCount,
    },
    disruptions: {
      activeCount: activeDisruptions.length,
      incidents: activeDisruptions.map((d) => ({
        id: d.incidentId || d.id,
        type: d.type,
        corridorId: d.corridorId,
        section: d.sectionId || d.section,
        severity: d.severity,
        delayMinutes: d.estimatedDuration || d.delayMinutes || 60,
      })),
    },
    optimization: {
      totalOptimizationRuns: optAuditCount || 1,
      stagedProposedBlocks: blockStatusDist.Proposed,
      hardConstraintsEnforced: 6,
      deterministicEngineStatus: 'OPERATIONAL',
    },
    governanceDisclaimer:
      'SIMULATION DATA: Metrics are calculated deterministically from the Rail-Sanket operational database and timetable models. These results represent decision-support estimates and not live Indian Railways telemetry.',
  }
}

module.exports = {
  getOperationalAnalytics,
}
