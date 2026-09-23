/**
 * disruptionImpactService.js
 * Evaluates the primary and multi-corridor downstream operational impacts of an incident.
 * 
 * STRICT RULES:
 * - 100% READ-ONLY. Does not modify MongoDB (Task, RecommendedBlock, Conflict) or timetableData.js.
 * - Reuses existing network topology (CORRIDOR_GRAPH) and timetable train movements.
 * - Deterministic delay calculation, block impact, task impact, and track/crossover status.
 */

const { trainMovements } = require('../data/timetableData')
const Task = require('../models/Task')
const RecommendedBlock = require('../models/RecommendedBlock')
const { timeToMin, intervalsOverlap } = require('./conflictService')
const { CORRIDOR_GRAPH, TRAIN_CROSS_CORRIDOR_PATHS } = require('./networkCoordinationService')

const TOTAL_NETWORK_CAPACITY_MINUTES = 12 * 1440 // 17,280 minutes across 12 sections

/**
 * Evaluates the full operational impact of a simulated disruption
 * @param {Object} incident 
 */
async function evaluateDisruptionImpact(incident) {
  if (!incident) {
    throw new Error('Incident data is required for impact evaluation.')
  }

  const {
    corridorId,
    sectionId,
    date = '2026-09-24',
    start,
    end,
    estimatedDuration,
    type = 'OPERATIONAL_INCIDENT',
    severity = 'WARNING',
  } = incident

  if (!corridorId || !CORRIDOR_GRAPH[corridorId]) {
    throw new Error(`Invalid or unconfigured corridor "${corridorId}".`)
  }

  const primaryCorridorDef = CORRIDOR_GRAPH[corridorId]
  const validSection = sectionId || primaryCorridorDef.sections[0]

  const incStartMin = timeToMin(start)
  const incEndMin = timeToMin(end)
  const durationMin = estimatedDuration || (incEndMin >= incStartMin ? incEndMin - incStartMin : (1440 - incStartMin) + incEndMin)

  // 1. Identify Connected Corridors from Topology Graph
  const connectedCorridors = []
  const affectedSectionsSet = new Set([validSection])

  if (Array.isArray(primaryCorridorDef.connectedCorridors)) {
    for (const conn of primaryCorridorDef.connectedCorridors) {
      if (conn.sharedBorderSection === validSection) {
        connectedCorridors.push({
          corridorId: conn.corridorId,
          name: conn.name,
          interchangeStation: conn.interchangeStation,
          sharedBorderSection: conn.sharedBorderSection,
          connectingSection: conn.connectingSection,
        })
        affectedSectionsSet.add(conn.connectingSection)
      }
    }
  }

  // 2. Fetch Active Database Records (Read-Only)
  const [dbTasks, dbBlocks] = await Promise.all([
    Task.find({}).lean(),
    RecommendedBlock.find({}).lean(),
  ])

  // 3. Train Path Impact & Downstream Propagation (Step 5)
  const affectedTrains = []
  let totalSimulatedDelayMinutes = 0

  for (const [trainNo, pathList] of Object.entries(TRAIN_CROSS_CORRIDOR_PATHS)) {
    const primarySegment = pathList.find((p) => p.corridorId === corridorId && p.section === validSection)
    const connectedSegment = pathList.find((p) => p.corridorId !== corridorId)

    if (primarySegment) {
      const segStart = timeToMin(primarySegment.start)
      const segEnd = timeToMin(primarySegment.end)

      if (intervalsOverlap(incStartMin, incEndMin, segStart, segEnd)) {
        const overlap = Math.min(incEndMin, segEnd) - Math.max(incStartMin, segStart)
        totalSimulatedDelayMinutes += overlap

        const tm = trainMovements.find((t) => t.trainNo === trainNo) || {}

        affectedTrains.push({
          trainNo,
          trainNumber: trainNo,
          trainName: tm.name || `Train ${trainNo}`,
          trainType: tm.type || 'Express',
          origin: tm.origin || 'Kharagpur',
          destination: tm.destination || 'Howrah',
          primaryCorridor: corridorId,
          primarySection: validSection,
          scheduledSlot: `${primarySegment.start}–${primarySegment.end}`,
          overlapMinutes: overlap,
          propagatesAcrossNetwork: Boolean(connectedSegment),
          downstreamCorridor: connectedSegment ? connectedSegment.corridorId : null,
          downstreamSection: connectedSegment ? connectedSegment.section : null,
          downstreamSlot: connectedSegment ? `${connectedSegment.start}–${connectedSegment.end}` : null,
          downstreamSimulatedDelay: connectedSegment ? Math.min(overlap, 30) : 0,
        })

        if (connectedSegment) {
          affectedSectionsSet.add(connectedSegment.section)
        }
      }
    }
  }

  // 4. Block Impact (Step 6)
  // Check recommended/approved blocks overlapping incident window
  const impactedBlocks = []
  for (const blk of dbBlocks) {
    if (blk.status === 'Rejected') continue

    const blkCorridor = blk.corridorId || 'C01'
    const blkSection = blk.section || validSection
    const blkDate = blk.date || date

    if (blkCorridor === corridorId && blkDate === date) {
      const bStartMin = timeToMin(blk.start)
      const bEndMin = timeToMin(blk.end)

      if (intervalsOverlap(incStartMin, incEndMin, bStartMin, bEndMin)) {
        impactedBlocks.push({
          blockId: blk.blockId || blk._id?.toString(),
          corridorId: blkCorridor,
          section: blkSection,
          date: blkDate,
          start: blk.start,
          end: blk.end,
          status: blk.status, // e.g. Approved, Recommended, Proposed
          impactStatus: 'IMPACTED',
          taskIds: blk.taskIds || [],
          reason: `Incident ${incident.incidentId || type} directly overlaps block window ${blk.start}–${blk.end} on ${validSection}.`,
        })
      }
    }
  }

  // 5. Task Impact & Resource Coordination (Step 7, 14, 15)
  const impactedBlockTaskIds = new Set()
  impactedBlocks.forEach((b) => b.taskIds.forEach((id) => impactedBlockTaskIds.add(id)))

  const impactedTasks = []
  const resourceConflicts = []
  const dependencyConflicts = []

  const sectionTasks = dbTasks.filter((t) => t.corridorId === corridorId && t.status !== 'Completed')

  for (const t of sectionTasks) {
    const isBundledInImpactedBlock = impactedBlockTaskIds.has(t.taskId || t.id)
    const isDirectSection = t.location && t.location.includes(validSection.split('–')[0])

    if (isBundledInImpactedBlock || isDirectSection) {
      impactedTasks.push({
        taskId: t.taskId || t.id,
        department: t.department,
        taskType: t.taskType,
        criticality: t.criticality,
        priority: t.priority,
        crew: t.crew || 'Unassigned',
        estimatedDuration: t.estimatedDuration || 60,
        dependencies: t.dependencies || [],
        impactStatus: isBundledInImpactedBlock ? 'BLOCKED_BY_INCIDENT' : 'SECTION_DISRUPTED',
      })

      // Resource crew overlap check
      if (t.crew) {
        const otherCrewTask = dbTasks.find(
          (ot) =>
            ot.crew === t.crew &&
            (ot.taskId || ot.id) !== (t.taskId || t.id) &&
            ot.status === 'Scheduled' &&
            ot.corridorId !== corridorId
        )
        if (otherCrewTask) {
          resourceConflicts.push({
            id: `RCF-CREW-${t.crew}-${t.taskId || t.id}`,
            type: 'Resource',
            severity: 'Critical',
            title: `Shared Maintenance Crew Compromised: ${t.crew}`,
            description: `Crew ${t.crew} is assigned to task ${t.taskId || t.id} in disrupted section ${validSection} while simultaneously committed on ${otherCrewTask.corridorId}.`,
            crew: t.crew,
            taskId: t.taskId || t.id,
            suggestedAction: `Reallocate crew ${t.crew} or reschedule task on ${otherCrewTask.corridorId}.`,
          })
        }
      }

      // Dependency check
      if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
        for (const depId of t.dependencies) {
          const depTask = dbTasks.find((dt) => (dt.taskId || dt.id) === depId)
          if (depTask && depTask.status !== 'Completed') {
            dependencyConflicts.push({
              id: `DCF-DEP-${t.taskId || t.id}-${depId}`,
              type: 'Dependency',
              severity: 'Critical',
              title: `Prerequisite Chain Disrupted: ${t.taskId || t.id} → ${depId}`,
              description: `Task ${t.taskId || t.id} depends on prerequisite ${depId} (${depTask.taskType}). Disruption prevents prerequisite execution.`,
              taskId: t.taskId || t.id,
              dependencyId: depId,
              suggestedAction: `Reschedule prerequisite ${depId} before committing ${t.taskId || t.id}.`,
            })
          }
        }
      }
    }
  }

  // 6. Track & Crossover Status Simulation (Step 24)
  const trackCrossoverStatus = {
    section: validSection,
    corridorId,
    trackAccess: severity === 'CRITICAL' ? 'BLOCKED' : 'UNDER_MAINTENANCE',
    crossoverState: severity === 'CRITICAL' ? 'BLOCKED' : 'RESERVED',
    speedRestrictionKmph: severity === 'CRITICAL' ? 0 : 30,
    interlockingStatus: 'SIMULATED_LOCAL_ISOLATION',
    adjacentSectionStatus: connectedCorridors.map((c) => ({
      corridorId: c.corridorId,
      section: c.connectingSection,
      trackAccess: 'RESERVED',
      crossoverState: 'CAUTION',
    })),
  }

  // 7. Network Utilization Calculation (Step 16)
  let baselineBookedMinutes = 0
  dbBlocks.filter((b) => b.status === 'Approved').forEach((b) => {
    baselineBookedMinutes += b.durationMin || 0
  })
  trainMovements.forEach((t) => {
    const [aH, aM] = (t.arrival || '10:00').split(':').map(Number)
    const [dH, dM] = (t.departure || t.arrival || '10:25').split(':').map(Number)
    const dur = (dH * 60 + dM) - (aH * 60 + aM)
    baselineBookedMinutes += (dur > 0 ? dur : 25)
  })

  const baselineUtilization = Math.min(100, Math.round((baselineBookedMinutes / TOTAL_NETWORK_CAPACITY_MINUTES) * 100))
  const incidentUtilization = Math.min(100, Math.round(((baselineBookedMinutes + durationMin) / TOTAL_NETWORK_CAPACITY_MINUTES) * 100))
  const utilizationDelta = incidentUtilization - baselineUtilization

  // 8. Overall Operational Impact Classification
  let operationalImpact = 'LOW'
  if (severity === 'CRITICAL' || affectedTrains.length > 2 || totalSimulatedDelayMinutes > 40) {
    operationalImpact = 'CRITICAL'
  } else if (affectedTrains.length > 0 || impactedBlocks.length > 0 || totalSimulatedDelayMinutes > 20) {
    operationalImpact = 'HIGH'
  } else if (durationMin > 60 || connectedCorridors.length > 0) {
    operationalImpact = 'MEDIUM'
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    incidentDetails: {
      incidentId: incident.incidentId || 'INC-SIM',
      type,
      severity,
      corridorId,
      sectionId: validSection,
      date,
      start,
      end,
      durationMin,
      title: incident.title || `${type} on ${corridorId} (${validSection})`,
      description: incident.description,
    },
    connectedCorridors,
    affectedSections: Array.from(affectedSectionsSet),
    affectedTrains,
    impactedBlocks,
    impactedTasks,
    resourceConflicts,
    dependencyConflicts,
    trackCrossoverStatus,
    impact: {
      affectedCorridorCount: connectedCorridors.length + 1,
      affectedSectionCount: affectedSectionsSet.size,
      affectedTrainCount: affectedTrains.length,
      impactedBlockCount: impactedBlocks.length,
      impactedTaskCount: impactedTasks.length,
      totalSimulatedDelayMinutes,
      criticalConflicts: resourceConflicts.filter((c) => c.severity === 'Critical').length + dependencyConflicts.filter((c) => c.severity === 'Critical').length + (severity === 'CRITICAL' ? 1 : 0),
      warningConflicts: resourceConflicts.filter((c) => c.severity === 'Warning').length + dependencyConflicts.filter((c) => c.severity === 'Warning').length + (severity === 'WARNING' ? 1 : 0),
      baselineUtilization,
      incidentUtilization,
      utilizationDelta,
      operationalImpact,
    },
  }
}

module.exports = {
  evaluateDisruptionImpact,
}
