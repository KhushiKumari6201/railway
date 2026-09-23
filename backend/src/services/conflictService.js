/**
 * Conflict Detection & Schedule Coordination Service
 * Evaluates proposed maintenance blocks against:
 * 1. Approved/Active maintenance block overlaps
 * 2. Passenger & freight timetable paths (Simulation / Timetable Data)
 * 3. Task schedule double-booking
 * 4. Window capacity & 20-minute safety buffer
 */

const RecommendedBlock = require('../models/RecommendedBlock')
const Task = require('../models/Task')
const Conflict = require('../models/Conflict')
const { trainMovements } = require('../data/timetableData')

const SAFETY_BUFFER_MIN = 20

function timeToMin(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0
  const [h, m] = timeStr.trim().split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function intervalsOverlap(s1, e1, s2, e2) {
  return s1 < e2 && e1 > s2
}

async function checkBlockConflicts(proposedBlock, { persist = false, customTrainMovements = null } = {}) {
  const conflicts = []
  
  if (!proposedBlock || !proposedBlock.start || !proposedBlock.end || !proposedBlock.corridorId) {
    return { hasConflict: false, hasBlockingConflict: false, conflicts: [] }
  }

  const corridorId = proposedBlock.corridorId.trim().toUpperCase()
  const pStartMin = timeToMin(proposedBlock.start)
  const pEndMin = timeToMin(proposedBlock.end)
  const pDate = proposedBlock.date || new Date().toISOString().split('T')[0]
  const blockId = proposedBlock.id || `REC-${corridorId}-${pDate.replace(/-/g, '')}`

  // ----------------------------------------------------
  // RULE 1: Block Overlap with Approved Maintenance Blocks
  // ----------------------------------------------------
  const approvedBlocks = await RecommendedBlock.find({
    id: { $ne: proposedBlock.id },
    corridorId,
    date: pDate,
    status: 'Approved',
  })

  for (const ab of approvedBlocks) {
    const abStartMin = timeToMin(ab.start)
    const abEndMin = timeToMin(ab.end)

    if (intervalsOverlap(pStartMin, pEndMin, abStartMin, abEndMin)) {
      const overlapMin = Math.min(pEndMin, abEndMin) - Math.max(pStartMin, abStartMin)
      conflicts.push({
        id: `CF-BLK-${blockId}-${ab.id}`,
        type: 'Corridor',
        severity: 'Critical',
        isBlocking: true,
        title: 'Overlapping Approved Maintenance Block',
        description: `Existing approved block ${ab.id} on ${ab.corridorId} (${ab.section || ''}, ${ab.start}–${ab.end}) overlaps the proposed block window (${proposedBlock.start}–${proposedBlock.end}) by ${overlapMin} minutes.`,
        corridorId,
        affectedTasks: ab.taskIds || [],
        affectedTrains: [],
        time: `${proposedBlock.start}–${proposedBlock.end}`,
        suggestedAction: proposedBlock.alternative?.start
          ? `Shift proposed block to non-conflicting alternative window (${proposedBlock.alternative.start}–${proposedBlock.alternative.end}).`
          : `Shift proposed block to 14:00–15:30 to avoid overlap with block ${ab.id}.`,
        resolved: false,
      })
    }
  }

  // ----------------------------------------------------
  // RULE 2: Train / Timetable Movement Conflict
  // ----------------------------------------------------
  const trainSource = Array.isArray(customTrainMovements) ? customTrainMovements : trainMovements
  const relevantTrains = trainSource.filter((t) => t.corridorId === corridorId)

  for (const train of relevantTrains) {
    const tArrMin = timeToMin(train.arrival)
    const tDepMin = train.departure ? timeToMin(train.departure) : tArrMin + 20
    const tStart = Math.min(tArrMin, tDepMin)
    const tEnd = Math.max(tArrMin, tDepMin)

    if (intervalsOverlap(pStartMin, pEndMin, tStart, tEnd)) {
      const isPassengerSuperfast = train.type === 'Superfast' || train.type === 'Express'
      const severity = isPassengerSuperfast ? 'Critical' : 'Warning'
      const isBlocking = isPassengerSuperfast

      conflicts.push({
        id: `CF-TRN-${blockId}-${train.trainNo}`,
        type: 'Operational',
        severity,
        isBlocking,
        title: isPassengerSuperfast
          ? `Train path conflict with ${train.name} (${train.trainNo})`
          : `Freight path advisory for ${train.name} (${train.trainNo})`,
        description: `[Simulation / Timetable Data] ${train.type} train ${train.trainNo} (${train.name}) is scheduled through ${train.section || 'the corridor'} at ${train.arrival}–${train.departure || train.arrival}, overlapping the proposed maintenance block (${proposedBlock.start}–${proposedBlock.end}).`,
        corridorId,
        affectedTasks: proposedBlock.taskIds || [],
        affectedTrains: [train.trainNo],
        time: `${train.arrival}–${train.departure || train.arrival}`,
        suggestedAction: proposedBlock.alternative?.start
          ? `Shift proposed block to clear passenger train path (use alternative ${proposedBlock.alternative.start}–${proposedBlock.alternative.end}).`
          : `Shift block start after ${train.departure || train.arrival} to allow train passage.`,
        resolved: false,
      })
    }
  }

  // ----------------------------------------------------
  // RULE 3: Task Schedule Double-Booking Conflict
  // ----------------------------------------------------
  if (Array.isArray(proposedBlock.taskIds) && proposedBlock.taskIds.length > 0) {
    const tasks = await Task.find({ id: { $in: proposedBlock.taskIds } })
    for (const task of tasks) {
      if (task.status === 'Scheduled' && task.scheduledDate) {
        // Check if scheduled in another approved block
        const otherApprovedBlock = await RecommendedBlock.findOne({
          id: { $ne: proposedBlock.id },
          status: 'Approved',
          taskIds: task.id,
        })

        if (otherApprovedBlock) {
          conflicts.push({
            id: `CF-TSK-${blockId}-${task.id}`,
            type: 'Resource',
            severity: 'Warning',
            isBlocking: true,
            title: `Task ${task.id} already scheduled in approved block`,
            description: `Task ${task.id} (${task.taskType}) is already assigned to approved block ${otherApprovedBlock.id} on ${task.scheduledDate}. Cannot be double-booked into multiple active blocks.`,
            corridorId,
            affectedTasks: [task.id],
            affectedTrains: [],
            time: `${proposedBlock.start}–${proposedBlock.end}`,
            suggestedAction: `Remove task ${task.id} from proposed block or de-allocate from block ${otherApprovedBlock.id}.`,
            resolved: false,
          })
        }
      }
    }
  }

  // ----------------------------------------------------
  // RULE 4: Window Capacity & Safety Buffer Check
  // ----------------------------------------------------
  const windowDuration = pEndMin - pStartMin
  const availableWorkingTime = windowDuration - SAFETY_BUFFER_MIN

  if (Array.isArray(proposedBlock.taskIds) && proposedBlock.taskIds.length > 0) {
    const tasks = await Task.find({ id: { $in: proposedBlock.taskIds } })
    const totalDuration = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
    
    if (totalDuration > availableWorkingTime) {
      conflicts.push({
        id: `CF-CAP-${blockId}`,
        type: 'Capacity',
        severity: 'Warning',
        isBlocking: false,
        title: 'Requested work duration exceeds window capacity',
        description: `Total task work duration (${totalDuration}m) exceeds available working time (${availableWorkingTime}m) after accounting for the ${SAFETY_BUFFER_MIN}-minute safety buffer in the ${windowDuration}m window.`,
        corridorId,
        affectedTasks: proposedBlock.taskIds,
        affectedTrains: [],
        time: `${proposedBlock.start}–${proposedBlock.end}`,
        suggestedAction: 'Remove lower-priority candidate tasks or select a wider block window.',
        resolved: false,
      })
    }
  }

  // ----------------------------------------------------
  // Persistence (if requested)
  // ----------------------------------------------------
  if (persist && conflicts.length > 0) {
    for (const c of conflicts) {
      await Conflict.findOneAndUpdate(
        { id: c.id },
        { $set: c },
        { upsert: true, new: true }
      )
    }
  }

  const hasBlockingConflict = conflicts.some((c) => c.isBlocking)

  return {
    hasConflict: conflicts.length > 0,
    hasBlockingConflict,
    conflicts,
  }
}

module.exports = {
  checkBlockConflicts,
  timeToMin,
  intervalsOverlap,
}
