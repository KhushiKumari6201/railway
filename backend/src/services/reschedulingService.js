/**
 * reschedulingService.js
 * Generates and validates deterministic alternative maintenance windows following a disruption.
 * 
 * STRICT RULES:
 * - 100% READ-ONLY simulation. Does not modify MongoDB (Task, RecommendedBlock, Conflict).
 * - Factual comparison only. NO "best", "winner", or "optimal" labels.
 * - Does NOT automatically approve any block.
 */

const { trainMovements } = require('../data/timetableData')
const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')
const { timeToMin, intervalsOverlap } = require('./conflictService')
const { CORRIDOR_GRAPH, TRAIN_CROSS_CORRIDOR_PATHS } = require('./networkCoordinationService')

function minToTime(minutes) {
  const m = Math.floor(minutes) % 1440
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const SAFETY_BUFFER_MIN = 20
const TOTAL_NETWORK_CAPACITY_MINUTES = 12 * 1440

/**
 * Evaluates a single candidate rescheduling window factually
 */
async function evaluateReschedulingWindow({
  scenarioId = 'OPT-A',
  label = 'Alternative Window',
  corridorId = 'C01',
  sectionId = 'PKU–KGP',
  date = '2026-09-24',
  start,
  end,
  taskIds = [],
  incidentStart,
  incidentEnd,
}) {
  const sMin = timeToMin(start)
  const eMin = timeToMin(end)
  const durationMin = eMin >= sMin ? eMin - sMin : (1440 - sMin) + eMin

  // Check overlap with incident itself
  let overlapsIncident = false
  if (incidentStart && incidentEnd) {
    const incS = timeToMin(incidentStart)
    const incE = timeToMin(incidentEnd)
    overlapsIncident = intervalsOverlap(sMin, eMin, incS, incE)
  }

  // Fetch DB records read-only
  const [dbTasks, dbBlocks] = await Promise.all([
    Task.find({}).lean(),
    RecommendedBlock.find({}).lean(),
  ])

  // 1. Train timetable overlaps
  const affectedTrains = []
  let simulatedDelayMinutes = 0

  for (const [trainNo, pathList] of Object.entries(TRAIN_CROSS_CORRIDOR_PATHS)) {
    const segment = pathList.find((p) => p.corridorId === corridorId && p.section === sectionId)
    if (segment) {
      const segStart = timeToMin(segment.start)
      const segEnd = timeToMin(segment.end)

      if (intervalsOverlap(sMin, eMin, segStart, segEnd)) {
        const overlap = Math.min(eMin, segEnd) - Math.max(sMin, segStart)
        simulatedDelayMinutes += overlap

        const tm = trainMovements.find((t) => t.trainNo === trainNo) || {}
        affectedTrains.push({
          trainNo,
          trainName: tm.name || `Train ${trainNo}`,
          trainType: tm.type || 'Express',
          scheduledSlot: `${segment.start}–${segment.end}`,
          overlapMinutes: overlap,
        })
      }
    }
  }

  // 2. Existing approved block collisions
  let blockCollisions = 0
  for (const blk of dbBlocks) {
    if (blk.status === 'Approved' && blk.corridorId === corridorId && blk.date === date) {
      const bS = timeToMin(blk.start)
      const bE = timeToMin(blk.end)
      if (intervalsOverlap(sMin, eMin, bS, bE)) {
        blockCollisions++
      }
    }
  }

  // 3. Task duration sum vs window capacity (with 20-min safety buffer)
  const scenarioTasks = dbTasks.filter((t) => taskIds.includes(t.taskId || t.id))
  const totalTaskWorkMin = scenarioTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0)
  const availableWorkingMin = Math.max(0, durationMin - SAFETY_BUFFER_MIN)
  const safetyBufferStatus = totalTaskWorkMin <= availableWorkingMin && !overlapsIncident ? 'PASS' : 'FAIL'

  // 4. Resource crew checks
  let resourceConflictCount = 0
  for (const t of scenarioTasks) {
    if (t.crew) {
      const overlappingCrewTask = dbTasks.find(
        (ot) =>
          ot.crew === t.crew &&
          (ot.taskId || ot.id) !== (t.taskId || t.id) &&
          ot.status === 'Scheduled' &&
          ot.corridorId !== corridorId
      )
      if (overlappingCrewTask) {
        resourceConflictCount++
      }
    }
  }

  // 5. Dependency checks
  let dependencyConflictCount = 0
  for (const t of scenarioTasks) {
    if (Array.isArray(t.dependencies)) {
      for (const depId of t.dependencies) {
        const depTask = dbTasks.find((dt) => (dt.taskId || dt.id) === depId)
        if (depTask && depTask.status !== 'Completed' && !taskIds.includes(depId)) {
          dependencyConflictCount++
        }
      }
    }
  }

  // 6. Network utilization
  let baselineBookedMinutes = 0
  dbBlocks.filter((b) => b.status === 'Approved').forEach((b) => {
    baselineBookedMinutes += b.durationMin || 0
  })
  const baselineUtilization = Math.min(100, Math.round((baselineBookedMinutes / TOTAL_NETWORK_CAPACITY_MINUTES) * 100))
  const scenarioUtilization = Math.min(100, Math.round(((baselineBookedMinutes + durationMin) / TOTAL_NETWORK_CAPACITY_MINUTES) * 100))
  const utilizationDelta = scenarioUtilization - baselineUtilization

  // 7. Conflict counts
  const criticalConflictCount =
    (overlapsIncident ? 1 : 0) +
    blockCollisions +
    resourceConflictCount +
    dependencyConflictCount +
    affectedTrains.filter((t) => t.trainType === 'Superfast').length

  const warningConflictCount = affectedTrains.filter((t) => t.trainType !== 'Superfast').length

  // Operational Impact
  let operationalImpact = 'LOW'
  if (criticalConflictCount > 0 || safetyBufferStatus === 'FAIL') {
    operationalImpact = 'CRITICAL'
  } else if (affectedTrains.length > 1 || simulatedDelayMinutes > 30) {
    operationalImpact = 'HIGH'
  } else if (warningConflictCount > 0 || simulatedDelayMinutes > 0) {
    operationalImpact = 'MEDIUM'
  }

  return {
    scenarioId,
    label,
    corridorId,
    sectionId,
    date,
    start,
    end,
    window: `${start}–${end}`,
    durationMin,
    totalTaskWorkMin,
    availableWorkingMin,
    overlapsIncident,
    affectedTrainCount: affectedTrains.length,
    affectedTrains,
    simulatedDelayMinutes,
    criticalConflictCount,
    warningConflictCount,
    resourceConflictCount,
    dependencyConflictCount,
    safetyBufferStatus,
    baselineUtilization,
    scenarioUtilization,
    networkUtilizationDelta: utilizationDelta,
    operationalImpact,
  }
}

/**
 * Automatically generates 3-4 deterministic candidate rescheduling options
 * around a given disruption or impacted block
 */
async function generateReschedulingOptions({
  corridorId = 'C01',
  sectionId = 'PKU–KGP',
  date = '2026-09-24',
  incidentStart = '10:00',
  incidentEnd = '11:30',
  estimatedDuration = 90,
  taskIds = [],
}) {
  const incS = timeToMin(incidentStart)
  const incE = timeToMin(incidentEnd)

  const candidateSlots = []

  // Option A: Immediate Post-Clearance Slot (30m buffer after incident end)
  const postStartMin = incE + 30
  const postEndMin = postStartMin + estimatedDuration
  if (postEndMin <= 1430) {
    candidateSlots.push({
      scenarioId: 'OPT-A',
      label: 'Post-Clearance Window (Same-Day Afternoon)',
      start: minToTime(postStartMin),
      end: minToTime(postEndMin),
    })
  }

  // Option B: Standard Afternoon Off-Peak Window (14:00 - 15:30)
  candidateSlots.push({
    scenarioId: 'OPT-B',
    label: 'Afternoon Off-Peak Slot',
    start: '14:00',
    end: minToTime(timeToMin('14:00') + estimatedDuration),
  })

  // Option C: Evening Low-Traffic Window (16:30 - 18:00)
  candidateSlots.push({
    scenarioId: 'OPT-C',
    label: 'Evening Coordination Slot',
    start: '16:30',
    end: minToTime(timeToMin('16:30') + estimatedDuration),
  })

  // Option D: Night Traffic & Power Maintenance Window (01:00 - 02:30)
  candidateSlots.push({
    scenarioId: 'OPT-D',
    label: 'Night Engineering Window (Zero Passenger Traffic)',
    start: '01:00',
    end: minToTime(timeToMin('01:00') + estimatedDuration),
  })

  // Evaluate each slot factually
  const options = []
  for (const slot of candidateSlots) {
    const evaluated = await evaluateReschedulingWindow({
      scenarioId: slot.scenarioId,
      label: slot.label,
      corridorId,
      sectionId,
      date,
      start: slot.start,
      end: slot.end,
      taskIds,
      incidentStart,
      incidentEnd,
    })
    options.push(evaluated)
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    incidentReference: {
      corridorId,
      sectionId,
      date,
      incidentStart,
      incidentEnd,
      estimatedDuration,
    },
    reschedulingOptions: options,
  }
}

/**
 * Compares an array of user-defined rescheduling scenarios side-by-side
 */
async function compareReschedulingScenarios(scenarios = []) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('At least one rescheduling scenario is required for comparison.')
  }

  const results = []
  for (let i = 0; i < scenarios.length; i++) {
    const scn = scenarios[i]
    const evaluated = await evaluateReschedulingWindow({
      scenarioId: scn.scenarioId || `SCN-${String.fromCharCode(65 + i)}`,
      label: scn.label || `Scenario ${String.fromCharCode(65 + i)}`,
      corridorId: scn.corridorId || 'C01',
      sectionId: scn.sectionId || 'PKU–KGP',
      date: scn.date || '2026-09-24',
      start: scn.start || '12:00',
      end: scn.end || '13:30',
      taskIds: scn.taskIds || [],
      incidentStart: scn.incidentStart,
      incidentEnd: scn.incidentEnd,
    })
    results.push(evaluated)
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    comparisons: results,
    scenarios: results,
  }
}

module.exports = {
  evaluateReschedulingWindow,
  generateReschedulingOptions,
  compareReschedulingScenarios,
}
