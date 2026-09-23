/**
 * optimizationService.js
 * Central Phase 9 Deterministic Constraint-Based Network Optimization Service
 * 
 * STRICT COMPLIANCE:
 * - 100% DETERMINISTIC: Same inputs always produce identical candidate schedules.
 * - 100% READ-ONLY: Does not modify MongoDB (Tasks, Blocks, Conflicts) or timetable data.
 * - DECISION SUPPORT ONLY: Does NOT auto-approve blocks or modify live schedules.
 * - Centralized Hard & Soft Constraint Model.
 * - Explicit Feasible & Infeasible Candidate Classification.
 */

const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')
const { trainMovements } = require('../data/timetableData')
const { timeToMin, intervalsOverlap } = require('./conflictService')
const { CORRIDOR_GRAPH, TRAIN_CROSS_CORRIDOR_PATHS } = require('./networkCoordinationService')
const { getDisruptions } = require('./disruptionService')

const SAFETY_BUFFER_MIN = 20
const TOTAL_NETWORK_SECTIONS = 12
const TOTAL_NETWORK_CAPACITY_MINUTES = TOTAL_NETWORK_SECTIONS * 1440

function minToTime(minutes) {
  const m = Math.floor(minutes) % 1440
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Validates optimization input parameters
 */
function validateOptimizationInputs({ taskIds, corridorIds, date, planningHorizon, availableWindows, safetyBufferMinutes, maxBlocksPerSection }) {
  const errors = []

  if (safetyBufferMinutes !== undefined && (typeof safetyBufferMinutes !== 'number' || safetyBufferMinutes < 0)) {
    errors.push('safetyBufferMinutes must be a non-negative number.')
  }

  if (maxBlocksPerSection !== undefined && (typeof maxBlocksPerSection !== 'number' || maxBlocksPerSection <= 0)) {
    errors.push('maxBlocksPerSection must be a positive number.')
  }

  if (taskIds !== undefined && (!Array.isArray(taskIds))) {
    errors.push('taskIds must be an array of valid task identifiers.')
  }

  if (!Array.isArray(corridorIds) || corridorIds.length === 0) {
    errors.push('corridorIds must be a non-empty array of valid corridors (e.g. ["C01"]).')
  } else {
    for (const c of corridorIds) {
      if (!CORRIDOR_GRAPH[c.trim().toUpperCase()]) {
        errors.push(`Invalid corridor "${c}". Valid corridors are C01, C02, C03, C04, C05.`)
      }
    }
  }

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    errors.push('date must be a valid date in YYYY-MM-DD format.')
  }

  if (planningHorizon) {
    const sMin = timeToMin(planningHorizon.start || '00:00')
    const eMin = timeToMin(planningHorizon.end || '24:00')
    if (eMin <= sMin && eMin !== 0) {
      errors.push('planningHorizon.end must be after planningHorizon.start.')
    }
  }

  if (availableWindows && Array.isArray(availableWindows)) {
    for (const w of availableWindows) {
      if (!w.start || !w.end) {
        errors.push('Each availableWindow must contain valid start and end times.')
      } else if (timeToMin(w.end) <= timeToMin(w.start)) {
        errors.push(`availableWindow window end (${w.end}) must be after start (${w.start}).`)
      }
    }
  }

  return errors
}

/**
 * Bundles compatible tasks
 */
function buildTaskBundles(tasks) {
  const sectionMap = {}
  for (const t of tasks) {
    const sec = t.location || 'DEFAULT'
    if (!sectionMap[sec]) {
      sectionMap[sec] = []
    }
    sectionMap[sec].push(t)
  }

  const bundles = []
  for (const [sec, secTasks] of Object.entries(sectionMap)) {
    const totalDuration = secTasks.reduce((acc, t) => acc + Number(t.estimatedDuration || 60), 0)
    const departments = Array.from(new Set(secTasks.map((t) => t.department || 'Engineering')))
    const crews = Array.from(new Set(secTasks.map((t) => t.crew || 'Engineering Gang 1')))
    const allDependencies = Array.from(new Set(secTasks.flatMap((t) => t.dependencies || [])))

    bundles.push({
      bundleId: `BND-${secTasks[0].corridorId}-${sec}`,
      corridorId: secTasks[0].corridorId,
      section: sec,
      taskIds: secTasks.map((t) => t.id),
      tasks: secTasks,
      totalDuration,
      departments,
      crews,
      dependencies: allDependencies,
    })
  }

  return bundles
}

/**
 * Deterministically generates candidate time windows across the planning horizon
 */
function generateCandidateWindows({ planningHorizon, requiredDurationMin, availableWindows = [], relevantTrains = [] }) {
  const horizonStart = timeToMin(planningHorizon?.start || '00:00')
  const horizonEnd = timeToMin(planningHorizon?.end || '24:00') || 1440
  const effectiveDuration = Math.max(60, requiredDurationMin)
  const windowNeeded = effectiveDuration + SAFETY_BUFFER_MIN

  const candidates = []

  // If explicit available windows were passed, use them
  if (Array.isArray(availableWindows) && availableWindows.length > 0) {
    for (const aw of availableWindows) {
      const s = timeToMin(aw.start)
      const e = timeToMin(aw.end)
      if (e - s >= windowNeeded && s >= horizonStart && e <= horizonEnd) {
        candidates.push({
          start: aw.start,
          end: aw.end,
          source: 'AVAILABLE_WINDOW',
          label: aw.label || `User Window (${aw.start}–${aw.end})`,
        })
      }
    }
  }

  // Canonical Indian Railways maintenance windows across Kharagpur Division
  const canonicalSlots = [
    { start: '01:00', end: '03:30', label: 'Night Major Maintenance Window' },
    { start: '05:00', end: '07:30', label: 'Early Morning Low-Traffic Window' },
    { start: '10:00', end: '12:30', label: 'Mid-Morning Maintenance Window' },
    { start: '11:15', end: '13:45', label: 'Midday Freight Interval Window' },
    { start: '14:00', end: '16:30', label: 'Afternoon Non-Peak Slot' },
    { start: '15:30', end: '18:00', label: 'Late Afternoon Inspection Slot' },
    { start: '21:30', end: '23:45', label: 'Late Evening Shift Window' },
  ]

  for (const slot of canonicalSlots) {
    const s = timeToMin(slot.start)
    const e = timeToMin(slot.end)
    if (s >= horizonStart && e <= horizonEnd && (e - s) >= windowNeeded) {
      candidates.push({
        start: slot.start,
        end: slot.end,
        source: 'CANONICAL_RAIL_SLOT',
        label: slot.label,
      })
    }
  }

  // Systematic gaps between timetable trains
  const sortedTrains = [...relevantTrains].sort((a, b) => timeToMin(a.arrival) - timeToMin(b.arrival))
  for (let i = 0; i < sortedTrains.length - 1; i++) {
    const t1 = sortedTrains[i]
    const t2 = sortedTrains[i + 1]
    const gapStart = timeToMin(t1.departure || t1.arrival) + 15
    const gapEnd = timeToMin(t2.arrival) - 15

    if (gapEnd - gapStart >= windowNeeded && gapStart >= horizonStart && gapEnd <= horizonEnd) {
      candidates.push({
        start: minToTime(gapStart),
        end: minToTime(gapEnd),
        source: 'TIMETABLE_GAP',
        label: `Timetable Gap between ${t1.trainNo} and ${t2.trainNo}`,
      })
    }
  }

  // Deduplicate candidates by start + end
  const uniqueMap = new Map()
  for (const c of candidates) {
    const key = `${c.start}-${c.end}`
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c)
    }
  }

  return Array.from(uniqueMap.values())
}

/**
 * Validates a single candidate window against HARD and SOFT constraints
 */
function evaluateCandidateWindow({
  candidateIndex,
  window,
  bundle,
  date,
  allTasks,
  approvedBlocks,
  activeDisruptions,
  trainList,
}) {
  const candidateId = `OPT-CAND-${String(candidateIndex + 1).padStart(2, '0')}`
  const sMin = timeToMin(window.start)
  const eMin = timeToMin(window.end)
  const windowDurationMin = eMin >= sMin ? eMin - sMin : (1440 - sMin) + eMin

  const hardFailures = []
  const criticalConflicts = []
  const warningConflicts = []
  const affectedTrains = []

  // 1. HARD CONSTRAINT: Task Duration & Window Capacity
  const totalTaskWorkMin = bundle.totalDuration
  const availableWorkingMin = windowDurationMin - SAFETY_BUFFER_MIN

  if (totalTaskWorkMin > availableWorkingMin) {
    hardFailures.push({
      constraint: 'TASK_DURATION_CAPACITY',
      code: 'SAFETY_BUFFER_FAILURE',
      message: `Task work duration (${totalTaskWorkMin}m) exceeds available working capacity (${availableWorkingMin}m) after ${SAFETY_BUFFER_MIN}m safety buffer.`,
    })
    criticalConflicts.push('Safety buffer capacity violated')
  }

  // 2. HARD CONSTRAINT: Timetable Passenger Train Overlap
  let totalSimulatedDelayMin = 0
  for (const train of trainList) {
    const tArr = timeToMin(train.arrival)
    const tDep = train.departure ? timeToMin(train.departure) : tArr + 20
    const tStart = Math.min(tArr, tDep)
    const tEnd = Math.max(tArr, tDep)

    if (intervalsOverlap(sMin, eMin, tStart, tEnd)) {
      const overlapMin = Math.min(eMin, tEnd) - Math.max(sMin, tStart)
      const isExpress = train.type === 'Superfast' || train.type === 'Express' || train.priority === 'High'

      affectedTrains.push({
        trainNo: train.trainNo,
        name: train.name,
        type: train.type,
        overlapMinutes: overlapMin,
        simulatedDelayMinutes: overlapMin,
        isBlocking: isExpress,
      })

      totalSimulatedDelayMin += overlapMin

      if (isExpress) {
        hardFailures.push({
          constraint: 'TIMETABLE_PASSENGER_COLLISION',
          code: 'TIMETABLE_COLLISION',
          alias: 'TIMETABLE_CONFLICT',
          message: `Direct collision with passenger express train ${train.trainNo} (${train.name}) on section ${bundle.section}.`,
        })
        criticalConflicts.push(`Express train overlap: ${train.trainNo}`)
      } else {
        warningConflicts.push(`Freight train delay: ${train.trainNo} (${overlapMin}m)`)
      }
    }
  }

  // 3. HARD CONSTRAINT: Existing Approved Maintenance Blocks
  for (const ab of approvedBlocks) {
    if (ab.date === date && ab.corridorId === bundle.corridorId) {
      const abS = timeToMin(ab.start)
      const abE = timeToMin(ab.end)

      if (intervalsOverlap(sMin, eMin, abS, abE)) {
        // Direct same-section clash is blocking
        if (!ab.section || ab.section === bundle.section) {
          hardFailures.push({
            constraint: 'BLOCK_SECTION_COLLISION',
            code: 'BLOCK_COLLISION',
            alias: 'NETWORK_CONFLICT',
            message: `Overlaps existing approved block ${ab.id} on same section ${bundle.section} (${ab.start}–${ab.end}).`,
          })
          criticalConflicts.push(`Concurrent approved block: ${ab.id}`)
        } else {
          warningConflicts.push(`Concurrent block on corridor: ${ab.id} (${ab.section})`)
        }
      }
    }
  }

  // 4. HARD CONSTRAINT: Task Double-Booking
  for (const t of bundle.tasks) {
    if (t.status === 'Scheduled' && t.scheduledDate === date) {
      const existingAppr = approvedBlocks.find((b) => (b.taskIds || []).includes(t.id))
      if (existingAppr) {
        hardFailures.push({
          constraint: 'TASK_DOUBLE_BOOKING',
          code: 'TASK_ALREADY_SCHEDULED',
          alias: 'RESOURCE_CONFLICT',
          message: `Task ${t.id} is already scheduled in approved block ${existingAppr.id}.`,
        })
        criticalConflicts.push(`Task double-booking: ${t.id}`)
      }
    }
  }

  // 5. HARD CONSTRAINT: Crew / Resource Double-Booking
  const candidateCrews = bundle.crews || []
  for (const ab of approvedBlocks) {
    if (ab.date === date) {
      const abS = timeToMin(ab.start)
      const abE = timeToMin(ab.end)
      if (intervalsOverlap(sMin, eMin, abS, abE)) {
        const abTasks = allTasks.filter((t) => (ab.taskIds || []).includes(t.id))
        const abCrews = abTasks.map((t) => t.crew).filter(Boolean)
        const commonCrews = candidateCrews.filter((c) => abCrews.includes(c))

        if (commonCrews.length > 0) {
          hardFailures.push({
            constraint: 'CREW_DOUBLE_BOOKING',
            code: 'RESOURCE_DOUBLE_BOOKED',
            alias: 'RESOURCE_CONFLICT',
            message: `Crew "${commonCrews.join(', ')}" is double-booked on concurrent block ${ab.id}.`,
          })
          criticalConflicts.push(`Crew double-booking: ${commonCrews[0]}`)
        }
      }
    }
  }

  // 6. HARD CONSTRAINT: Dependency Ordering
  for (const t of bundle.tasks) {
    if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
      for (const depId of t.dependencies) {
        const depTask = allTasks.find((at) => at.id === depId)
        if (depTask) {
          const isCompleted = depTask.status === 'Completed'
          const isBundled = bundle.taskIds.includes(depId)
          const isEarlierBlock = approvedBlocks.some(
            (b) => (b.taskIds || []).includes(depId) && (b.date < date || (b.date === date && timeToMin(b.end) <= sMin))
          )

          if (!isCompleted && !isBundled && !isEarlierBlock) {
            hardFailures.push({
              constraint: 'TASK_DEPENDENCY_SEQUENCE',
              code: 'DEPENDENCY_VIOLATION',
              alias: 'DEPENDENCY_CONFLICT',
              message: `Task ${t.id} depends on uncompleted prerequisite ${depId} (${depTask.taskType}).`,
            })
            criticalConflicts.push(`Prerequisite unmet: ${depId}`)
          }
        }
      }
    }
  }

  // 7. HARD CONSTRAINT: Active Blocking Disruption Overlap
  for (const d of activeDisruptions) {
    if (d.corridorId === bundle.corridorId && (d.sectionId === bundle.section || d.section === bundle.section)) {
      const dS = timeToMin(d.start)
      const dE = timeToMin(d.end)
      if (intervalsOverlap(sMin, eMin, dS, dE)) {
        hardFailures.push({
          constraint: 'DISRUPTION_INTERFERENCE',
          code: 'ACTIVE_DISRUPTION_ZONE',
          alias: 'DISRUPTION_CONFLICT',
          message: `Overlaps active operational incident ${d.incidentId || d.id} (${d.type}) on section ${bundle.section}.`,
        })
        criticalConflicts.push(`Active disruption on track: ${d.type}`)
      }
    }
  }

  // 8. HARD CONSTRAINT: Connected Corridor Border Check
  const corridorMeta = CORRIDOR_GRAPH[bundle.corridorId]
  let connectedCorridorsImpacted = 0
  if (corridorMeta && corridorMeta.connectedCorridors) {
    for (const conn of corridorMeta.connectedCorridors) {
      if (conn.sharedBorderSection === bundle.section) {
        connectedCorridorsImpacted++
        // Check for concurrent approved blocks on connected border
        const concurrentConnBlock = approvedBlocks.find(
          (ab) =>
            ab.corridorId === conn.corridorId &&
            ab.date === date &&
            ab.section === conn.connectingSection &&
            intervalsOverlap(sMin, eMin, timeToMin(ab.start), timeToMin(ab.end))
        )
        if (concurrentConnBlock) {
          warningConflicts.push(
            `Interchange junction overlap with corridor ${conn.corridorId} at ${conn.interchangeStation}`
          )
        }
      }
    }
  }

  // Classification
  const isFeasible = hardFailures.length === 0
  const status = isFeasible ? 'FEASIBLE' : 'INFEASIBLE'

  // Soft Metrics
  const idleTimeMin = Math.max(0, windowDurationMin - totalTaskWorkMin - SAFETY_BUFFER_MIN)
  const maintenanceCoverage = Math.round((bundle.tasks.length / Math.max(1, allTasks.length)) * 100)
  const networkUtilizationDelta = Number(((windowDurationMin / TOTAL_NETWORK_CAPACITY_MINUTES) * 100).toFixed(2))

  return {
    candidateId,
    status,
    corridorId: bundle.corridorId,
    section: bundle.section,
    date,
    start: window.start,
    end: window.end,
    startTime: window.start,
    endTime: window.end,
    window: `${window.start}–${window.end}`,
    windowObj: { startTime: window.start, endTime: window.end, durationMinutes: windowDurationMin },
    durationMin: windowDurationMin,
    source: window.source,
    label: window.label,
    taskIds: bundle.taskIds,
    taskCount: bundle.taskIds.length,
    totalTaskWorkMin,
    availableWorkingMin,
    safetyBufferMin: SAFETY_BUFFER_MIN,
    safetyBufferStatus: totalTaskWorkMin <= availableWorkingMin ? 'PASS' : 'FAIL',
    idleTimeMin,
    maintenanceCoverage,
    affectedTrainCount: affectedTrains.length,
    affectedTrains,
    simulatedDelayMinutes: totalSimulatedDelayMin,
    criticalConflictCount: criticalConflicts.length,
    warningConflictCount: warningConflicts.length,
    criticalConflicts,
    warningConflicts,
    networkUtilizationDelta,
    connectedCorridorsImpacted,
    resourceFragmentation: bundle.crews.length,
    infeasibleReasons: hardFailures.map((f) => f.code),
    violations: Array.from(new Set(hardFailures.flatMap((f) => [f.code, f.alias, f.constraint].filter(Boolean)))),
    failureReasons: hardFailures.map((f) => f.message),
    failureDetails: hardFailures,
    metrics: {
      estimatedTrainDelayMinutes: totalSimulatedDelayMin,
      totalMaintenanceMinutes: totalTaskWorkMin,
      resourceUtilizationPct: Math.round((totalTaskWorkMin / Math.max(1, windowDurationMin)) * 100),
      tasksAccomplishedCount: bundle.taskIds.length,
    },
  }
}

/**
 * Main Deterministic Constraint-Based Optimization Entry Point
 */
async function generateOptimization({
  taskIds = [],
  corridorIds = [],
  date,
  planningHorizon = { start: '00:00', end: '24:00' },
  availableWindows = [],
  scenario = null,
  disruptionContext = null,
  safetyBufferMinutes,
  maxBlocksPerSection,
}) {
  // 1. Validate inputs
  const validationErrors = validateOptimizationInputs({
    taskIds,
    corridorIds,
    date,
    planningHorizon,
    availableWindows,
    safetyBufferMinutes,
    maxBlocksPerSection,
  })

  if (validationErrors.length > 0) {
    const err = new Error(validationErrors.join(' '))
    err.statusCode = 400
    err.validationErrors = validationErrors
    throw err
  }

  const cleanDate = date.trim()
  const cleanCorridorIds = corridorIds.map((c) => c.trim().toUpperCase())

  // 2. Fetch data in parallel (strictly read-only)
  const taskQuery = (Array.isArray(taskIds) && taskIds.length > 0)
    ? { id: { $in: taskIds } }
    : { corridorId: { $in: cleanCorridorIds } }

  const [dbTasks, dbBlocks] = await Promise.all([
    Task.find(taskQuery).lean(),
    RecommendedBlock.find({ date: cleanDate, status: 'Approved' }).lean(),
  ])

  // Check if all requested tasks were found (if explicit IDs were passed)
  if (Array.isArray(taskIds) && taskIds.length > 0) {
    const foundTaskIds = new Set(dbTasks.map((t) => t.id))
    const missingTaskIds = taskIds.filter((id) => !foundTaskIds.has(id))
    if (missingTaskIds.length > 0) {
      const err = new Error(`The following tasks do not exist in the database: ${missingTaskIds.join(', ')}`)
      err.statusCode = 400
      throw err
    }
  }

  // Filter tasks to match requested corridorIds
  const eligibleTasks = dbTasks.filter((t) => cleanCorridorIds.includes(t.corridorId))
  if (eligibleTasks.length === 0) {
    const err = new Error('None of the requested tasks belong to the specified corridors.')
    err.statusCode = 400
    throw err
  }

  // 3. Fetch active disruptions
  const allDisruptions = getDisruptions()
  const activeDisruptions = allDisruptions.filter((d) => d.status === 'ACTIVE' && cleanCorridorIds.includes(d.corridorId))

  // 4. Filter timetable trains
  const relevantTrains = trainMovements.filter((t) => cleanCorridorIds.includes(t.corridorId))

  // 5. Build task bundles per section
  const bundles = buildTaskBundles(eligibleTasks)

  // 6. Generate candidate windows per bundle and evaluate
  const allEvaluatedCandidates = []
  let globalCandidateIndex = 0

  for (const bundle of bundles) {
    const bundleTrains = relevantTrains.filter(
      (t) => !t.section || t.section === bundle.section || t.corridorId === bundle.corridorId
    )

    const rawWindows = generateCandidateWindows({
      planningHorizon,
      requiredDurationMin: bundle.totalDuration,
      availableWindows,
      relevantTrains: bundleTrains,
    })

    for (const w of rawWindows) {
      const candidateResult = evaluateCandidateWindow({
        candidateIndex: globalCandidateIndex++,
        window: w,
        bundle,
        date: cleanDate,
        allTasks: dbTasks,
        approvedBlocks: dbBlocks,
        activeDisruptions,
        trainList: bundleTrains,
      })

      allEvaluatedCandidates.push(candidateResult)
    }
  }

  // Deterministic stable sort:
  // 1. Status: FEASIBLE before INFEASIBLE
  // 2. Simulated Delay: Ascending
  // 3. Task Count: Descending
  // 4. Idle Time: Ascending
  allEvaluatedCandidates.sort((a, b) => {
    if (a.status === 'FEASIBLE' && b.status !== 'FEASIBLE') return -1
    if (a.status !== 'FEASIBLE' && b.status === 'FEASIBLE') return 1
    if (a.simulatedDelayMinutes !== b.simulatedDelayMinutes) {
      return a.simulatedDelayMinutes - b.simulatedDelayMinutes
    }
    if (a.taskCount !== b.taskCount) {
      return b.taskCount - a.taskCount
    }
    return a.idleTimeMin - b.idleTimeMin
  })

  // Re-index candidates deterministically
  allEvaluatedCandidates.forEach((c, idx) => {
    c.candidateId = `OPT-CAND-${String(idx + 1).padStart(2, '0')}`
  })

  const feasibleCandidates = allEvaluatedCandidates.filter((c) => c.status === 'FEASIBLE')
  const infeasibleCandidates = allEvaluatedCandidates.filter((c) => c.status === 'INFEASIBLE')

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    disclaimer:
      'SIMULATION / DECISION-SUPPORT ONLY: Optimization results are generated from the Rail-Sanket operational network model, timetable simulation data, task data, and simulated disruption data. They do not represent live railway control instructions.',
    governanceDisclaimer:
      'SIMULATION / DECISION-SUPPORT ONLY: Optimization results are generated from the Rail-Sanket operational network model, timetable simulation data, task data, and simulated disruption data. They do not represent live railway control instructions.',
    feasibleCount: feasibleCandidates.length,
    infeasibleCount: infeasibleCandidates.length,
    planningParameters: {
      date: cleanDate,
      corridorIds: cleanCorridorIds,
      taskIds,
      planningHorizon,
      availableWindowsCount: availableWindows.length,
    },
    summary: {
      totalCandidatesGenerated: allEvaluatedCandidates.length,
      feasibleCount: feasibleCandidates.length,
      infeasibleCount: infeasibleCandidates.length,
      totalTasksRequested: taskIds.length,
      eligibleTasksFound: eligibleTasks.length,
      bundlesFormed: bundles.length,
    },
    feasibleCandidates,
    infeasibleCandidates,
    allCandidates: allEvaluatedCandidates,
  }
}

/**
 * Validates a single proposed candidate schedule against all hard & soft constraints
 */
async function validateOptimizationSchedule(schedule) {
  if (!schedule || !schedule.corridorId || !schedule.start || !schedule.end || !schedule.date) {
    const err = new Error('Schedule must include corridorId, start, end, and date.')
    err.statusCode = 400
    throw err
  }

  const res = await generateOptimization({
    taskIds: schedule.taskIds || [],
    corridorIds: [schedule.corridorId],
    date: schedule.date,
    availableWindows: [{ start: schedule.start, end: schedule.end, label: 'Target Schedule' }],
  })

  const matched = res.allCandidates.find(
    (c) => c.start === schedule.start && c.end === schedule.end
  )

  return {
    success: true,
    mode: 'SIMULATION',
    isFeasible: matched ? matched.status === 'FEASIBLE' : false,
    candidate: matched || null,
  }
}

module.exports = {
  generateOptimization,
  validateOptimizationSchedule,
  validateOptimizationInputs,
  buildTaskBundles,
  generateCandidateWindows,
  evaluateCandidateWindow,
}
