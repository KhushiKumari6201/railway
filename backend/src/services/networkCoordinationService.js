/**
 * Multi-Corridor Network Coordination & Global Timetable Optimization Service
 * 
 * STRICT COMPLIANCE:
 * - 100% READ-ONLY. Does not modify MongoDB (Task, RecommendedBlock, Conflict) or timetableData.js.
 * - Understands network relationships (corridor graph, interchange stations, border sections).
 * - Evaluates:
 *   1. Cross-corridor conflicts at shared interchanges (e.g. KGP, SRC, BBS).
 *   2. Shared resource conflicts (crew double-booking, department over-allocation).
 *   3. Task dependency sequence violations across connected corridors.
 *   4. Multi-corridor train path propagation and simulated delay impact.
 *   5. Network-wide utilization delta (Baseline vs Scenario).
 * - Strictly factual side-by-side comparison without automated "winner" or "best scenario" claims.
 */

const { trainMovements } = require('../data/timetableData')
const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')
const Conflict = require('../models/Conflict')
const { timeToMin, intervalsOverlap } = require('./conflictService')

const SAFETY_BUFFER_MIN = 20
const TOTAL_NETWORK_SECTIONS = 12
const OPERATIONAL_WINDOW_MINUTES = 1440
const TOTAL_NETWORK_CAPACITY_MINUTES = TOTAL_NETWORK_SECTIONS * OPERATIONAL_WINDOW_MINUTES

// Operational Network Model: Corridor Graph Topology & Junctions
const CORRIDOR_GRAPH = {
  C01: {
    corridorId: 'C01',
    name: 'Howrah–Kharagpur',
    route: 'HWH – SRC – KGP',
    sections: ['HWH–SRC', 'SRC–PKU', 'PKU–KGP'],
    connectedCorridors: [
      {
        corridorId: 'C02',
        name: 'Kharagpur–Bhubaneswar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'PKU–KGP',
        connectingSection: 'KGP–BLS',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C03',
        name: 'Kharagpur–Tatanagar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'PKU–KGP',
        connectingSection: 'KGP–GII',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C05',
        name: 'Santragachi–Kharagpur (Freight)',
        interchangeStation: 'Santragachi (SRC) & Kharagpur (KGP)',
        sharedBorderSection: 'HWH–SRC',
        connectingSection: 'SRC–ULT',
        interchangeType: 'Freight Divergence & Convergence',
      },
    ],
  },
  C02: {
    corridorId: 'C02',
    name: 'Kharagpur–Bhubaneswar',
    route: 'KGP – BLS – CTC – BBS',
    sections: ['KGP–BLS', 'BLS–CTC', 'CTC–BBS'],
    connectedCorridors: [
      {
        corridorId: 'C01',
        name: 'Howrah–Kharagpur',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–BLS',
        connectingSection: 'PKU–KGP',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C03',
        name: 'Kharagpur–Tatanagar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–BLS',
        connectingSection: 'KGP–GII',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C04',
        name: 'Bhubaneswar–Puri',
        interchangeStation: 'Bhubaneswar (BBS)',
        sharedBorderSection: 'CTC–BBS',
        connectingSection: 'BBS–KUR',
        interchangeType: 'Sub-divisional Interchange',
      },
      {
        corridorId: 'C05',
        name: 'Santragachi–Kharagpur (Freight)',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–BLS',
        connectingSection: 'ULT–KGP',
        interchangeType: 'Freight Yard Interchange',
      },
    ],
  },
  C03: {
    corridorId: 'C03',
    name: 'Kharagpur–Tatanagar',
    route: 'KGP – GII – TATA',
    sections: ['KGP–GII', 'GII–TATA'],
    connectedCorridors: [
      {
        corridorId: 'C01',
        name: 'Howrah–Kharagpur',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–GII',
        connectingSection: 'PKU–KGP',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C02',
        name: 'Kharagpur–Bhubaneswar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–GII',
        connectingSection: 'KGP–BLS',
        interchangeType: 'Major Junction',
      },
      {
        corridorId: 'C05',
        name: 'Santragachi–Kharagpur (Freight)',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'KGP–GII',
        connectingSection: 'ULT–KGP',
        interchangeType: 'Freight Yard Interchange',
      },
    ],
  },
  C04: {
    corridorId: 'C04',
    name: 'Bhubaneswar–Puri',
    route: 'BBS – KUR – PURI',
    sections: ['BBS–KUR', 'KUR–PURI'],
    connectedCorridors: [
      {
        corridorId: 'C02',
        name: 'Kharagpur–Bhubaneswar',
        interchangeStation: 'Bhubaneswar (BBS)',
        sharedBorderSection: 'BBS–KUR',
        connectingSection: 'CTC–BBS',
        interchangeType: 'Sub-divisional Interchange',
      },
    ],
  },
  C05: {
    corridorId: 'C05',
    name: 'Santragachi–Kharagpur (Freight)',
    route: 'SRC – ULT – KGP',
    sections: ['SRC–ULT', 'ULT–KGP'],
    connectedCorridors: [
      {
        corridorId: 'C01',
        name: 'Howrah–Kharagpur',
        interchangeStation: 'Santragachi (SRC) & Kharagpur (KGP)',
        sharedBorderSection: 'SRC–ULT',
        connectingSection: 'HWH–SRC',
        interchangeType: 'Freight Divergence & Convergence',
      },
      {
        corridorId: 'C02',
        name: 'Kharagpur–Bhubaneswar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'ULT–KGP',
        connectingSection: 'KGP–BLS',
        interchangeType: 'Freight Yard Interchange',
      },
      {
        corridorId: 'C03',
        name: 'Kharagpur–Tatanagar',
        interchangeStation: 'Kharagpur (KGP)',
        sharedBorderSection: 'ULT–KGP',
        connectingSection: 'KGP–GII',
        interchangeType: 'Freight Yard Interchange',
      },
    ],
  },
}

// Multi-corridor train path propagation map
const TRAIN_CROSS_CORRIDOR_PATHS = {
  '12841': [
    { corridorId: 'C01', section: 'HWH–SRC', start: '07:40', end: '08:05' },
    { corridorId: 'C01', section: 'PKU–KGP', start: '10:20', end: '10:45' },
    { corridorId: 'C02', section: 'KGP–BLS', start: '10:45', end: '11:15' },
  ],
  '12073': [
    { corridorId: 'C01', section: 'SRC–PKU', start: '09:10', end: '09:30' },
    { corridorId: 'C01', section: 'PKU–KGP', start: '09:35', end: '10:00' },
    { corridorId: 'C03', section: 'KGP–GII', start: '10:05', end: '10:35' },
  ],
  'GDS-4412': [
    { corridorId: 'C01', section: 'PKU–KGP', start: '10:15', end: '10:55' },
    { corridorId: 'C03', section: 'KGP–GII', start: '11:05', end: '11:45' },
  ],
  '18045': [
    { corridorId: 'C01', section: 'HWH–SRC', start: '13:15', end: '13:35' },
    { corridorId: 'C02', section: 'KGP–BLS', start: '14:40', end: '15:20' },
  ],
  '12277': [
    { corridorId: 'C02', section: 'BLS–CTC', start: '08:30', end: '08:50' },
    { corridorId: 'C02', section: 'CTC–BBS', start: '09:00', end: '09:40' },
    { corridorId: 'C04', section: 'BBS–KUR', start: '09:45', end: '10:05' },
  ],
  'GDS-5521': [
    { corridorId: 'C02', section: 'CTC–BBS', start: '11:00', end: '11:45' },
    { corridorId: 'C04', section: 'BBS–KUR', start: '12:00', end: '12:45' },
  ],
  'GDS-6610': [
    { corridorId: 'C05', section: 'SRC–ULT', start: '12:30', end: '13:10' },
    { corridorId: 'C05', section: 'ULT–KGP', start: '13:20', end: '14:00' },
    { corridorId: 'C03', section: 'KGP–GII', start: '14:15', end: '15:00' },
  ],
}

function calculateWindowDuration(startStr, endStr) {
  const s = timeToMin(startStr)
  const e = timeToMin(endStr)
  if (e >= s) return e - s
  return 1440 - s + e
}

/**
 * Check Multi-Corridor Network Coordination for a proposed block scenario
 */
async function checkNetworkCoordination(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Scenario object is required.')
  }

  const {
    corridorId,
    section,
    date = new Date().toISOString().split('T')[0],
    start,
    end,
    taskIds = [],
    scenarioName = 'Network Coordination Scenario',
  } = scenario

  if (!corridorId || !start || !end) {
    throw new Error('Corridor, start time, and end time are required for network coordination.')
  }

  const primaryCorridorDef = CORRIDOR_GRAPH[corridorId]
  if (!primaryCorridorDef) {
    throw new Error(`Corridor ${corridorId} is not recognized in the operational network topology.`)
  }

  const durationMin = scenario.durationMin || calculateWindowDuration(start, end)
  const pStartMin = timeToMin(start)
  const pEndMin = timeToMin(end)

  // 1. Fetch live database records for correlation (100% Read-Only)
  const [dbApprovedBlocks, dbTasks, dbConflicts] = await Promise.all([
    RecommendedBlock.find({ date, status: 'Approved' }).lean(),
    Task.find({}).lean(),
    Conflict.find({ resolved: false }).lean(),
  ])

  // Tasks in current scenario
  const scenarioTasks = dbTasks.filter((t) => taskIds.includes(t.id))
  const totalTaskDuration = scenarioTasks.reduce((acc, t) => acc + (t.estimatedDuration || 0), 0)
  const availableWorkingMin = Math.max(0, durationMin - SAFETY_BUFFER_MIN)
  const safetyBufferStatus = totalTaskDuration <= availableWorkingMin ? 'PASS' : 'FAIL'

  // 2. Identify connected corridors & interchange sections
  const connectedCorridors = primaryCorridorDef.connectedCorridors.map((cc) => ({
    corridorId: cc.corridorId,
    name: cc.name,
    interchangeStation: cc.interchangeStation,
    sharedBorderSection: cc.sharedBorderSection,
    connectingSection: cc.connectingSection,
    interchangeType: cc.interchangeType,
  }))

  const affectedSectionsSet = new Set()
  if (section) affectedSectionsSet.add(section)

  // 3. Evaluate Cross-Corridor Block Overlaps at Interchanges
  const networkConflicts = []

  // Check if primary block occupies an interchange border section
  const touchesInterchange = connectedCorridors.some(
    (cc) => !section || section === cc.sharedBorderSection
  )

  for (const cc of connectedCorridors) {
    // Check if an existing approved block on the connected corridor occupies the connecting section
    const connectedApprovedBlock = dbApprovedBlocks.find(
      (ab) =>
        ab.corridorId === cc.corridorId &&
        (!ab.section || ab.section === cc.connectingSection) &&
        intervalsOverlap(pStartMin, pEndMin, timeToMin(ab.start), timeToMin(ab.end))
    )

    if (connectedApprovedBlock) {
      affectedSectionsSet.add(cc.connectingSection)
      const overlapMin =
        Math.min(pEndMin, timeToMin(connectedApprovedBlock.end)) -
        Math.max(pStartMin, timeToMin(connectedApprovedBlock.start))

      networkConflicts.push({
        id: `NCF-INT-${corridorId}-${cc.corridorId}-${Date.now()}`,
        type: 'Network',
        severity: 'Critical',
        title: `Interchange Bottleneck between ${corridorId} and ${cc.corridorId}`,
        description: `Proposed block on ${corridorId} (${section || 'interchange'}) overlaps existing approved block ${connectedApprovedBlock.id} on connected corridor ${cc.corridorId} (${cc.connectingSection}, ${connectedApprovedBlock.start}–${connectedApprovedBlock.end}) at ${cc.interchangeStation} by ${overlapMin}m. Simultaneous track closures across connected lines will stall through-traffic.`,
        corridorId,
        affectedCorridor: cc.corridorId,
        affectedSection: cc.connectingSection,
        time: `${start}–${end}`,
        suggestedAction: `Stagger block start times by at least 90 minutes to keep ${cc.interchangeStation} junction operational.`,
      })
    }
  }

  // 4. Train Path Propagation across Connected Corridors
  const affectedTrainsList = []
  let totalSimulatedDelayMin = 0

  for (const [trainNo, pathSegments] of Object.entries(TRAIN_CROSS_CORRIDOR_PATHS)) {
    // Check if train travels on primary corridor or any connected corridor
    const primarySegment = pathSegments.find(
      (s) => s.corridorId === corridorId && (!section || s.section === section)
    )

    const connectedSegment = pathSegments.find((s) =>
      connectedCorridors.some((cc) => cc.corridorId === s.corridorId)
    )

    if (primarySegment) {
      const segStart = timeToMin(primarySegment.start)
      const segEnd = timeToMin(primarySegment.end)

      if (intervalsOverlap(pStartMin, pEndMin, segStart, segEnd)) {
        const overlap = Math.min(pEndMin, segEnd) - Math.max(pStartMin, segStart)
        totalSimulatedDelayMin += overlap

        const tm = trainMovements.find((t) => t.trainNo === trainNo) || {}
        const isSuperfast = tm.type === 'Superfast' || tm.type === 'Express'

        affectedTrainsList.push({
          trainNo,
          trainName: tm.name || `Train ${trainNo}`,
          trainType: tm.type || 'Express',
          primaryCorridor: corridorId,
          primarySection: primarySegment.section,
          connectedCorridor: connectedSegment ? connectedSegment.corridorId : null,
          connectingSection: connectedSegment ? connectedSegment.section : null,
          scheduledSlot: `${primarySegment.start}–${primarySegment.end}`,
          overlapMinutes: overlap,
          propagatesAcrossNetwork: Boolean(connectedSegment),
        })

        if (connectedSegment) {
          affectedSectionsSet.add(connectedSegment.section)
          networkConflicts.push({
            id: `NCF-TRN-${trainNo}-${corridorId}-${connectedSegment.corridorId}`,
            type: 'Network',
            severity: isSuperfast ? 'Critical' : 'Warning',
            title: `Cross-Corridor Train Path Conflict: ${tm.name} (${trainNo})`,
            description: `Block on ${corridorId} (${primarySegment.section}) delays ${tm.type} train ${trainNo}. This train subsequently propagates to connected corridor ${connectedSegment.corridorId} (${connectedSegment.section}) scheduled at ${connectedSegment.start}–${connectedSegment.end}, creating downstream sectional delays.`,
            corridorId,
            affectedCorridor: connectedSegment.corridorId,
            affectedSection: connectedSegment.section,
            affectedTrains: [trainNo],
            time: `${primarySegment.start}–${primarySegment.end}`,
            suggestedAction: `Shift proposed window to allow uninterrupted transit of train ${trainNo} through ${corridorId}.`,
          })
        }
      }
    }
  }

  // 5. Shared Resource Coordination (Step 13)
  const resourceConflicts = []
  const scenarioCrews = new Set(scenarioTasks.map((t) => t.crew).filter(Boolean))

  for (const crew of scenarioCrews) {
    // Find other tasks in the division assigned to this crew
    const conflictingTasks = dbTasks.filter(
      (t) =>
        t.crew === crew &&
        !taskIds.includes(t.id) &&
        (t.status === 'Scheduled' || t.status === 'Open')
    )

    for (const ct of conflictingTasks) {
      // Check if scheduled on the same date
      const ctBlock = dbApprovedBlocks.find((b) => (b.taskIds || []).includes(ct.id))
      if (ctBlock && intervalsOverlap(pStartMin, pEndMin, timeToMin(ctBlock.start), timeToMin(ctBlock.end))) {
        resourceConflicts.push({
          id: `RCF-CREW-${crew.replace(/\s+/g, '')}-${ct.id}`,
          type: 'Resource',
          severity: 'Critical',
          title: `Crew Resource Double-Booking: ${crew}`,
          description: `Crew "${crew}" is assigned to task ${ct.id} in approved block ${ctBlock.id} on corridor ${ct.corridorId} (${ctBlock.start}–${ctBlock.end}). The same crew cannot execute tasks in the proposed block on ${corridorId} simultaneously.`,
          crew,
          conflictingTask: ct.id,
          conflictingCorridor: ct.corridorId,
          time: `${start}–${end}`,
          suggestedAction: `Reassign tasks to an alternate gang or stagger the block schedule.`,
        })
      }
    }
  }

  // Task Double Booking
  for (const t of scenarioTasks) {
    const doubleBookedBlock = dbApprovedBlocks.find(
      (ab) => (ab.taskIds || []).includes(t.id)
    )
    if (doubleBookedBlock) {
      resourceConflicts.push({
        id: `RCF-TSK-${t.id}-${doubleBookedBlock.id}`,
        type: 'Resource',
        severity: 'Critical',
        title: `Task Already Assigned to Approved Block`,
        description: `Task ${t.id} (${t.taskType}) is already allocated to approved block ${doubleBookedBlock.id} on ${doubleBookedBlock.corridorId} (${doubleBookedBlock.start}–${doubleBookedBlock.end}).`,
        task: t.id,
        time: `${start}–${end}`,
        suggestedAction: `Remove task ${t.id} from proposed block or cancel block ${doubleBookedBlock.id}.`,
      })
    }
  }

  // 6. Dependency Coordination (Step 14)
  const dependencyConflicts = []
  for (const task of scenarioTasks) {
    if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTask = dbTasks.find((t) => t.id === depId)
        if (!depTask) continue

        const isCompleted = depTask.status === 'Completed'
        const isIncludedInBlock = taskIds.includes(depId)

        if (!isCompleted && !isIncludedInBlock) {
          // Check if scheduled in an earlier block
          const depBlock = dbApprovedBlocks.find((b) => (b.taskIds || []).includes(depId))
          const isEarlier =
            depBlock &&
            (depBlock.date < date ||
              (depBlock.date === date && timeToMin(depBlock.end) <= pStartMin))

          if (!isEarlier) {
            dependencyConflicts.push({
              id: `DCF-${task.id}-${depId}`,
              type: 'Dependency',
              severity: 'Critical',
              title: `Unresolved Prerequisite Dependency: ${task.id} → ${depId}`,
              description: `Task ${task.id} (${task.taskType}) depends on prerequisite ${depId} (${depTask.taskType}). Prerequisite is currently "${depTask.status}" and not scheduled prior to this block window.`,
              taskId: task.id,
              dependencyId: depId,
              suggestedAction: `Include prerequisite task ${depId} into this block or execute it prior to ${start}.`,
            })
          }
        }
      }
    }
  }

  // 7. Network Utilization Delta Calculation (Step 9)
  let baselineBookedMinutes = 0
  dbApprovedBlocks.forEach((b) => {
    baselineBookedMinutes += b.durationMin || 0
  })
  trainMovements.forEach((t) => {
    baselineBookedMinutes += calculateWindowDuration(t.arrival, t.departure || t.arrival) || 25
  })

  const baselineUtilization = Math.min(
    100,
    Math.round((baselineBookedMinutes / TOTAL_NETWORK_CAPACITY_MINUTES) * 100)
  )

  const scenarioBookedMinutes = baselineBookedMinutes + durationMin
  const scenarioUtilization = Math.min(
    100,
    Math.round((scenarioBookedMinutes / TOTAL_NETWORK_CAPACITY_MINUTES) * 100)
  )

  const utilizationDelta = scenarioUtilization - baselineUtilization

  // 8. Overall Impact Classification
  const allConflicts = [...networkConflicts, ...resourceConflicts, ...dependencyConflicts]
  const criticalCount = allConflicts.filter((c) => c.severity === 'Critical').length
  const warningCount = allConflicts.filter((c) => c.severity === 'Warning').length

  let operationalImpact = 'LOW'
  if (criticalCount > 0) {
    operationalImpact = 'CRITICAL'
  } else if (affectedTrainsList.length > 1 || totalSimulatedDelayMin > 30) {
    operationalImpact = 'HIGH'
  } else if (warningCount > 0 || totalSimulatedDelayMin > 0 || safetyBufferStatus === 'FAIL') {
    operationalImpact = 'MEDIUM'
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    primaryCorridor: {
      corridorId,
      name: primaryCorridorDef.name,
      route: primaryCorridorDef.route,
      section: section || primaryCorridorDef.sections[0],
      date,
      start,
      end,
      durationMin,
      taskCount: taskIds.length,
    },
    connectedCorridors,
    affectedCorridors: connectedCorridors,
    affectedSections: Array.from(affectedSectionsSet),
    affectedTrains: affectedTrainsList.map((t) => ({ ...t, trainNumber: t.trainNo })),
    conflicts: networkConflicts,
    resources: resourceConflicts,
    dependencies: dependencyConflicts,
    allConflicts,
    safetyBufferStatus,
    operationalImpact,
    impact: {
      criticalConflicts: criticalCount,
      warningConflicts: warningCount,
      totalConflicts: allConflicts.length,
      affectedTrainCount: affectedTrainsList.length,
      simulatedDelayMinutes: totalSimulatedDelayMin,
      baselineUtilization,
      scenarioUtilization,
      utilizationDelta,
      safetyBufferStatus,
      durationMin,
      affectedCorridorCount: connectedCorridors.length,
      affectedSectionCount: affectedSectionsSet.size,
    },
  }
}

/**
 * Compare multiple multi-corridor scenarios side-by-side
 */
async function compareNetworkCoordination(scenarios = []) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('At least one scenario is required for multi-corridor comparison.')
  }

  const results = []
  for (let i = 0; i < scenarios.length; i++) {
    const scn = scenarios[i]
    const res = await checkNetworkCoordination({
      ...scn,
      scenarioName: scn.scenarioName || `Scenario ${String.fromCharCode(65 + i)}`,
    })
    results.push(res)
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    scenarios: results,
    comparisons: results,
  }
}

module.exports = {
  checkNetworkCoordination,
  compareNetworkCoordination,
  CORRIDOR_GRAPH,
  TRAIN_CROSS_CORRIDOR_PATHS,
}
