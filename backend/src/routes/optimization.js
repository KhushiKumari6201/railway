/**
 * routes/optimization.js
 * Express router for Phase 9 Constraint-Based Network Optimization
 * 
 * STRICT COMPLIANCE:
 * - Read-only generation, validation, and comparison endpoints.
 * - Staging apply endpoint creates PROPOSED blocks only. NEVER auto-approves.
 * - Enforces Phase 8 RBAC permissions and logs to immutable AuditLog.
 */

const express = require('express')
const router = express.Router()
const { generateOptimization, validateOptimizationSchedule } = require('../services/optimizationService')
const { compareOptimizationCandidates } = require('../services/optimizationComparisonService')
const RecommendedBlock = require('../models/RecommendedBlock')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')
const { logAuditEvent } = require('../services/auditService')

// In-memory cache for recent optimization results
const optimizationCache = new Map()

// 1. POST /api/optimization/generate (Read-only candidate discovery)
router.post('/generate', requireAuth, requirePermission(PERMISSIONS.OPTIMIZATION_RUN), async (req, res) => {
  try {
    const { taskIds, corridorIds, date, targetDate, planningHorizon, availableWindows, scenario, disruptionContext, safetyBufferMinutes, maxBlocksPerSection } = req.body || {}
    const effectiveDate = date || targetDate

    const result = await generateOptimization({
      taskIds,
      corridorIds,
      date: effectiveDate,
      planningHorizon,
      availableWindows,
      scenario,
      disruptionContext,
      safetyBufferMinutes,
      maxBlocksPerSection,
    })

    const optimizationId = `OPT-${Date.now()}`
    result.optimizationId = optimizationId
    optimizationCache.set(optimizationId, result)

    // Audit Event
    await logAuditEvent({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: 'OPTIMIZATION_GENERATED',
      entityType: 'Optimization',
      entityId: optimizationId,
      metadata: {
        taskCount: taskIds?.length,
        corridors: corridorIds,
        feasibleCount: result.summary.feasibleCount,
      },
      ipAddress: req.ip || '127.0.0.1',
    })

    res.json(result)
  } catch (error) {
    console.error('[API /optimization/generate Error]', error)
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({
      success: false,
      error: error.name || 'OptimizationError',
      message: error.message,
      validationErrors: error.validationErrors || [],
    })
  }
})

// 2. POST /api/optimization/validate (Read-only validation of target schedule)
router.post('/validate', requireAuth, requirePermission(PERMISSIONS.OPTIMIZATION_RUN), async (req, res) => {
  try {
    const raw = req.body?.schedule || req.body || {}
    const schedule = {
      corridorId: raw.corridorId,
      sectionId: raw.sectionId || raw.section || 'General',
      date: raw.date,
      start: raw.start || raw.startTime,
      end: raw.end || raw.endTime,
      taskIds: raw.taskIds,
      enforceTimetableSeparation: raw.enforceTimetableSeparation,
    }

    if (!schedule.corridorId || !schedule.start || !schedule.end || !schedule.date) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'schedule object with corridorId, start, end, and date is required for validation.',
      })
    }

    const result = await validateOptimizationSchedule(schedule)
    result.isValid = result.isFeasible
    result.violations = result.candidate?.infeasibleReasons || []

    await logAuditEvent({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: 'OPTIMIZATION_VALIDATED',
      entityType: 'Optimization',
      entityId: `VAL-${schedule.corridorId}-${Date.now()}`,
      metadata: {
        isFeasible: result.isFeasible,
        corridorId: schedule.corridorId,
        window: `${schedule.start}–${schedule.end}`,
      },
      ipAddress: req.ip || '127.0.0.1',
    })

    res.json(result)
  } catch (error) {
    console.error('[API /optimization/validate Error]', error)
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({
      success: false,
      error: error.name || 'ValidationError',
      message: error.message,
    })
  }
})

// 3. POST /api/optimization/compare (Read-only side-by-side comparison)
router.post('/compare', requireAuth, requirePermission(PERMISSIONS.OPTIMIZATION_RUN), async (req, res) => {
  try {
    const { candidates } = req.body || {}
    const result = compareOptimizationCandidates(candidates)

    await logAuditEvent({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: 'OPTIMIZATION_COMPARED',
      entityType: 'Optimization',
      entityId: `CMP-${Date.now()}`,
      metadata: {
        candidateCount: candidates?.length,
      },
      ipAddress: req.ip || '127.0.0.1',
    })

    res.json(result)
  } catch (error) {
    console.error('[API /optimization/compare Error]', error)
    const statusCode = error.statusCode || 400
    res.status(statusCode).json({
      success: false,
      error: error.name || 'ComparisonError',
      message: error.message,
    })
  }
})

// 4. GET /api/optimization/:id (Retrieve cached optimization result)
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const cached = optimizationCache.get(id)

  if (!cached) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Optimization run ${id} not found in active session cache.`,
    })
  }

  res.json(cached)
})

// 5. POST /api/optimization/apply (Stage selected candidate as PROPOSED block — NEVER auto-approves)
router.post('/apply', requireAuth, requirePermission(PERMISSIONS.OPTIMIZATION_APPLY), async (req, res) => {
  try {
    let { candidate, candidateId } = req.body || {}

    // If candidateId was passed directly, try to resolve it from cache
    if (!candidate && candidateId) {
      for (const opt of optimizationCache.values()) {
        const found = opt.allCandidates?.find((c) => c.candidateId === candidateId)
        if (found) {
          candidate = found
          break
        }
      }
    }

    if (!candidate || !candidate.corridorId || !candidate.start || !candidate.end || !candidate.date) {
      return res.status(404).json({
        success: false,
        error: 'ValidationError',
        message: 'Valid candidate schedule with corridorId, section, date, start, and end is required.',
      })
    }

    if (candidate.status !== 'FEASIBLE') {
      return res.status(400).json({
        success: false,
        error: 'InfeasibleCandidateError',
        message: `Cannot stage infeasible candidate (${candidate.infeasibleReasons?.join(', ')}). Only feasible schedules can be staged.`,
      })
    }

    const proposedBlockId = `REC-PROP-${candidate.corridorId}-${Date.now()}`

    // Create block strictly as 'Proposed' (NOT Approved!)
    const createdBlock = await RecommendedBlock.create({
      id: proposedBlockId,
      corridorId: candidate.corridorId,
      section: candidate.section || 'General',
      date: candidate.date,
      start: candidate.start,
      end: candidate.end,
      durationMin: candidate.durationMin,
      blockType: 'Traffic Block',
      status: 'Proposed',
      taskIds: candidate.taskIds || [],
      trafficImpact: candidate.affectedTrainCount > 0 ? 'Medium' : 'Low',
      downtimeSavedMin: candidate.idleTimeMin || 0,
      createdBy: req.user.userId,
      approvedBy: null,
      approvedAt: null,
    })

    // Log Audit Event
    await logAuditEvent({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: 'OPTIMIZATION_APPLIED',
      entityType: 'RecommendedBlock',
      entityId: proposedBlockId,
      newState: createdBlock.toObject ? createdBlock.toObject() : createdBlock,
      reason: `Staged from optimization candidate ${candidate.candidateId} by ${req.user.name}`,
      metadata: {
        candidateId: candidate.candidateId,
        tasksStaged: candidate.taskIds?.length,
        requiresApproval: true,
      },
      ipAddress: req.ip || '127.0.0.1',
    })

    res.status(201).json({
      success: true,
      mode: 'SIMULATION',
      message: 'Optimization candidate staged successfully as a Proposed block. Awaiting independent Controller review and Four-Eyes sanction.',
      requiresApproval: true,
      block: createdBlock,
      stagedBlock: createdBlock,
    })
  } catch (error) {
    console.error('[API /optimization/apply Error]', error)
    res.status(500).json({
      success: false,
      error: 'StagingError',
      message: error.message,
    })
  }
})

module.exports = router
