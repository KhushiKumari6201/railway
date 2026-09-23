/**
 * What-If Scenario Simulation & Decision Support Service
 * 
 * STRICT COMPLIANCE:
 * - 100% READ-ONLY. No writes to MongoDB (Task, RecommendedBlock, Conflict) or timetableData.js.
 * - Reuses existing conflict detection engine (conflictService.js).
 * - Simulates alternative block windows, modified task selections, and in-memory train delays.
 * - Computes deterministic impact metrics:
 *   1. Task completion count & total task work duration
 *   2. Available working time & 20-minute safety buffer status (PASS/FAIL)
 *   3. Critical & warning conflict counts
 *   4. Unique affected trains
 *   5. Simulated delay impact (sum of overlap minutes with timetable trains)
 *   6. Window utilization percentage
 *   7. Operational impact classification (LOW, MEDIUM, HIGH, CRITICAL)
 * - Facilitates side-by-side scenario comparison for railway controller decision making.
 */

const { checkBlockConflicts, timeToMin, intervalsOverlap } = require('./conflictService')
const { trainMovements } = require('../data/timetableData')
const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')

const SAFETY_BUFFER_MIN = 20

function minToTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mins = m % 60
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function calculateWindowDuration(startStr, endStr) {
  const s = timeToMin(startStr)
  const e = timeToMin(endStr)
  if (e >= s) return e - s
  return 1440 - s + e
}

/**
 * Apply in-memory train delay adjustments to timetable data
 * Returns a cloned array with shifted arrival and departure times.
 * Does NOT modify timetableData.js.
 */
function applyTrainDelayAdjustments(delayAdjustments = []) {
  if (!Array.isArray(delayAdjustments) || delayAdjustments.length === 0) {
    return trainMovements.map((t) => ({ ...t }))
  }

  const adjustmentMap = new Map()
  for (const adj of delayAdjustments) {
    if (adj && adj.trainNumber) {
      adjustmentMap.set(String(adj.trainNumber).trim(), Number(adj.delayMinutes) || 0)
    }
  }

  return trainMovements.map((train) => {
    const delay = adjustmentMap.get(String(train.trainNo).trim())
    if (!delay) {
      return { ...train }
    }

    const origArrMin = timeToMin(train.arrival)
    const origDepMin = train.departure ? timeToMin(train.departure) : origArrMin + 20
    const duration = origDepMin - origArrMin

    const shiftedArrMin = origArrMin + delay
    const shiftedDepMin = shiftedArrMin + duration

    return {
      ...train,
      arrival: minToTime(shiftedArrMin),
      departure: minToTime(shiftedDepMin),
      delayMinutes: delay,
      isSimulatedDelay: true,
    }
  })
}

/**
 * Calculate simulated delay impact on trains overlapping the maintenance window
 */
function calculateSimulatedDelayMinutes(proposedBlock, activeTrains) {
  if (!proposedBlock || !proposedBlock.start || !proposedBlock.end || !proposedBlock.corridorId) {
    return 0
  }

  const pStart = timeToMin(proposedBlock.start)
  const pEnd = timeToMin(proposedBlock.end)
  const corridorId = proposedBlock.corridorId.trim().toUpperCase()

  const corridorTrains = activeTrains.filter((t) => t.corridorId === corridorId)
  let totalOverlapMin = 0

  for (const train of corridorTrains) {
    const tArr = timeToMin(train.arrival)
    const tDep = train.departure ? timeToMin(train.departure) : tArr + 20
    const tStart = Math.min(tArr, tDep)
    const tEnd = Math.max(tArr, tDep)

    if (intervalsOverlap(pStart, pEnd, tStart, tEnd)) {
      const overlap = Math.min(pEnd, tEnd) - Math.max(pStart, tStart)
      if (overlap > 0) {
        totalOverlapMin += overlap
      }
    }
  }

  return totalOverlapMin
}

/**
 * Determine operational impact category based on deterministic thresholds
 */
function classifyOperationalImpact(hasBlockingConflict, criticalCount, affectedTrainsCount, simulatedDelayMin, safetyBufferStatus) {
  if (hasBlockingConflict || criticalCount > 0) {
    return 'CRITICAL'
  }
  if (affectedTrainsCount > 1 || simulatedDelayMin > 30) {
    return 'HIGH'
  }
  if (affectedTrainsCount > 0 || simulatedDelayMin > 0 || safetyBufferStatus === 'FAIL') {
    return 'MEDIUM'
  }
  return 'LOW'
}

/**
 * Simulate a single What-If scenario (100% in-memory and read-only)
 */
async function simulateScenario(baseBlockId, scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Scenario configuration is required.')
  }

  const {
    corridorId,
    section = 'Main Line',
    date = new Date().toISOString().split('T')[0],
    start,
    end,
    taskIds = [],
    trainDelayAdjustments = [],
    scenarioName = 'What-If Scenario',
  } = scenario

  if (!corridorId || !start || !end) {
    throw new Error('Corridor, start time, and end time are required for scenario simulation.')
  }

  const durationMin = scenario.durationMin || calculateWindowDuration(start, end)
  if (durationMin <= 0) {
    throw new Error('Invalid simulation window: duration must be greater than 0 minutes.')
  }

  // 1. Fetch task details for work duration calculation (Read-Only)
  let tasks = []
  if (Array.isArray(taskIds) && taskIds.length > 0) {
    tasks = await Task.find({ id: { $in: taskIds } }).lean()
  }
  const totalTaskWorkMin = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
  const availableWorkingMin = Math.max(0, durationMin - SAFETY_BUFFER_MIN)
  const safetyBufferStatus = totalTaskWorkMin <= availableWorkingMin ? 'PASS' : 'FAIL'

  // 2. Apply in-memory train delays (Does NOT modify timetableData.js)
  const simulatedTrains = applyTrainDelayAdjustments(trainDelayAdjustments)

  // 3. Construct hypothetical block
  const hypotheticalBlock = {
    id: `SIM-${corridorId}-${Date.now()}`,
    baseBlockId: baseBlockId || null,
    corridorId,
    section,
    date,
    start,
    end,
    durationMin,
    taskIds,
    status: 'Recommended',
    blockType: scenario.blockType || 'Traffic Block',
  }

  // 4. Run conflict detection against simulated trains and existing MongoDB approved blocks (persist: false)
  const conflictResult = await checkBlockConflicts(hypotheticalBlock, {
    persist: false,
    customTrainMovements: simulatedTrains,
  })

  // 5. Calculate impact metrics
  const conflictsList = conflictResult.conflicts || []
  const criticalConflicts = conflictsList.filter((c) => c.severity === 'Critical').length
  const warningConflicts = conflictsList.filter((c) => c.severity === 'Warning').length

  const affectedTrainSet = new Set()
  conflictsList.forEach((c) => {
    (c.affectedTrains || []).forEach((tNo) => affectedTrainSet.add(tNo))
  })
  const affectedTrainsCount = affectedTrainSet.size

  const simulatedDelayMinutes = calculateSimulatedDelayMinutes(hypotheticalBlock, simulatedTrains)

  const utilizationPercent =
    durationMin > 0 ? Math.min(100, Math.round((totalTaskWorkMin / durationMin) * 100)) : 0

  const operationalImpact = classifyOperationalImpact(
    conflictResult.hasBlockingConflict,
    criticalConflicts,
    affectedTrainsCount,
    simulatedDelayMinutes,
    safetyBufferStatus
  )

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    scenario: {
      scenarioId: `SCN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      scenarioName,
      baseBlockId: baseBlockId || null,
      corridorId,
      section,
      date,
      start,
      end,
      durationMin,
      taskIds,
      trainDelayAdjustments,
      mode: 'SIMULATION',
    },
    conflicts: {
      hasConflict: conflictResult.hasConflict,
      hasBlockingConflict: conflictResult.hasBlockingConflict,
      conflicts: conflictsList,
    },
    impact: {
      taskCount: taskIds.length,
      durationMin,
      totalTaskWorkMin,
      availableWorkingMin,
      safetyBufferStatus,
      criticalConflicts,
      warningConflicts,
      affectedTrains: affectedTrainsCount,
      affectedTrainNumbers: Array.from(affectedTrainSet),
      simulatedDelayMinutes,
      utilizationPercent,
      operationalImpact,
    },
  }
}

/**
 * Compare multiple scenarios side-by-side against a baseline scenario
 */
async function compareScenarios(baselineInput, scenariosList = []) {
  if (!baselineInput) {
    throw new Error('Baseline scenario is required for comparison.')
  }

  const baselineResult = await simulateScenario(
    baselineInput.baseBlockId || null,
    { ...baselineInput, scenarioName: baselineInput.scenarioName || 'Baseline Plan' }
  )

  const simulatedScenarios = []
  for (let i = 0; i < scenariosList.length; i++) {
    const scn = scenariosList[i]
    const res = await simulateScenario(
      scn.baseBlockId || baselineInput.baseBlockId || null,
      { ...scn, scenarioName: scn.scenarioName || `Scenario ${String.fromCharCode(65 + i)}` }
    )
    simulatedScenarios.push(res)
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    baseline: baselineResult,
    scenarios: simulatedScenarios,
  }
}

module.exports = {
  simulateScenario,
  compareScenarios,
  applyTrainDelayAdjustments,
  calculateSimulatedDelayMinutes,
  classifyOperationalImpact,
}
