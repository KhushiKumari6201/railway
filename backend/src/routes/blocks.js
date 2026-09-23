const express = require('express')
const router = express.Router()
const RecommendedBlock = require('../models/RecommendedBlock')
const Task = require('../models/Task')
const Conflict = require('../models/Conflict')
const { checkBlockConflicts } = require('../services/conflictService')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')
const { logAuditEvent } = require('../services/auditService')

// GET /api/blocks
router.get('/', async (req, res) => {
  try {
    const { status, corridorId } = req.query
    const filter = {}
    if (status) filter.status = status
    if (corridorId) filter.corridorId = corridorId.trim().toUpperCase()

    const blocks = await RecommendedBlock.find(filter).sort({ date: 1, start: 1 })
    res.json(blocks)
  } catch (error) {
    console.error('Error fetching blocks:', error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch blocks', details: error.message })
  }
})

// GET /api/blocks/:id
router.get('/:id', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }
    res.json(block)
  } catch (error) {
    console.error(`Error fetching block ${req.params.id}:`, error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch block', details: error.message })
  }
})

// POST /api/blocks (Create or upsert a proposed block plan)
router.post('/', requireAuth, requirePermission(PERMISSIONS.BLOCKS_CREATE), async (req, res) => {
  try {
    const {
      id,
      date,
      corridorId,
      section,
      start,
      end,
      durationMin,
      blockType,
      confidence,
      utilization,
      operationalImpact,
      status,
      taskIds,
      criticalTasks,
      downtimeSavedMin,
      reasons,
      alternative,
      createdBy,
    } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Block id is required' })
    }
    if (!date || !corridorId || !section || !start || !end || !durationMin || !blockType) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'date, corridorId, section, start, end, durationMin, and blockType are required',
      })
    }

    let parsedConfidence = 'High'
    if (typeof confidence === 'string' && ['Low', 'Medium', 'High'].includes(confidence)) {
      parsedConfidence = confidence
    } else if (typeof confidence === 'number') {
      parsedConfidence = confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low'
    }

    const blockData = {
      id,
      date,
      corridorId: corridorId.trim().toUpperCase(),
      section,
      start,
      end,
      durationMin: Number(durationMin),
      blockType,
      confidence: parsedConfidence,
      utilization: typeof utilization === 'number' ? Math.round(utilization) : 85,
      operationalImpact: ['Low', 'Medium', 'High'].includes(operationalImpact) ? operationalImpact : 'Low',
      status: status || 'Recommended',
      createdBy: createdBy || req.user?.userId || 'USR-PLAN-01',
      taskIds: Array.isArray(taskIds) ? taskIds : [],
      criticalTasks: Array.isArray(criticalTasks) ? criticalTasks.length : (typeof criticalTasks === 'number' ? criticalTasks : 0),
      downtimeSavedMin: typeof downtimeSavedMin === 'number' ? downtimeSavedMin : 0,
      reasons: Array.isArray(reasons) ? reasons : [],
      alternative: alternative ? {
        start: alternative.start || '',
        end: alternative.end || '',
        operationalImpact: alternative.operationalImpact || 'Low',
        note: alternative.note || alternative.tradeoff || '',
      } : null,
    }

    const block = await RecommendedBlock.findOneAndUpdate(
      { id },
      { $set: blockData },
      { upsert: true, new: true, runValidators: true }
    )

    await logAuditEvent({
      req,
      action: 'BLOCK_CREATED',
      entityType: 'RecommendedBlock',
      entityId: block.id,
      newState: block.toObject(),
      reason: `Maintenance block proposed for ${block.date} on ${block.corridorId}`,
      metadata: { corridorId: block.corridorId, durationMin: block.durationMin, taskCount: block.taskIds.length },
    })

    res.status(201).json(block)
  } catch (error) {
    console.error('Error creating/saving block:', error)
    res.status(400).json({ success: false, error: 'ValidationError', message: 'Failed to save block', details: error.message })
  }
})

// PATCH /api/blocks/:id/review (Move block to Under_Review)
router.patch('/:id/review', requireAuth, requirePermission(PERMISSIONS.BLOCKS_SUBMIT_REVIEW), async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }

    const previousState = block.toObject()
    block.status = 'Under_Review'
    block.reviewedBy = req.user?.userId || 'USR-CTRL-01'
    await block.save()

    await logAuditEvent({
      req,
      action: 'BLOCK_UNDER_REVIEW',
      entityType: 'RecommendedBlock',
      entityId: block.id,
      previousState,
      newState: block.toObject(),
      reason: req.body?.notes || 'Block submitted for formal Controller review',
      metadata: { corridorId: block.corridorId },
    })

    res.json({
      success: true,
      block,
      message: `Block '${block.id}' is now Under Review.`,
    })
  } catch (error) {
    console.error('Error submitting block for review:', error)
    res.status(500).json({ success: false, error: 'OperationError', message: error.message })
  }
})

// PATCH /api/blocks/:id/approve
router.patch('/:id/approve', requireAuth, requirePermission(PERMISSIONS.BLOCKS_APPROVE), async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }

    const approverId = req.user?.userId || 'USR-CTRL-01'

    // Step 8: Four-Eyes Principle Safeguard
    // The creator of a proposed block cannot approve their own block
    if (block.createdBy && block.createdBy === approverId && !req.body?.force) {
      return res.status(403).json({
        success: false,
        error: 'FourEyesViolation',
        message: 'Four-eyes safeguard: The block creator cannot approve their own proposed block. Final approval must be completed by an independent Controller or Administrator.',
      })
    }

    // Step 11: Backend validation against blocking conflicts before approval
    const conflictResult = await checkBlockConflicts(block, { persist: true })
    if (!req.body?.force && conflictResult.hasBlockingConflict) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'Block cannot be approved because a blocking scheduling conflict exists.',
        conflicts: conflictResult.conflicts.filter((c) => c.isBlocking),
      })
    }

    const previousState = block.toObject()
    block.status = 'Approved'
    block.approvedBy = approverId
    block.approvalRemarks = req.body?.remarks || 'Approved by Divisional Operating Control'
    await block.save()

    // Resolve any active conflicts associated with this block ID
    await Conflict.updateMany(
      { id: { $regex: block.id }, resolved: false },
      { $set: { resolved: true } }
    )

    // Update bundled tasks to Scheduled and set their scheduledDate
    let scheduledTasksCount = 0
    if (block.taskIds && block.taskIds.length > 0) {
      const updateResult = await Task.updateMany(
        { id: { $in: block.taskIds } },
        { $set: { status: 'Scheduled', scheduledDate: block.date } }
      )
      scheduledTasksCount = updateResult.modifiedCount
    }

    await logAuditEvent({
      req,
      action: 'BLOCK_APPROVED',
      entityType: 'RecommendedBlock',
      entityId: block.id,
      previousState,
      newState: block.toObject(),
      reason: block.approvalRemarks,
      metadata: { corridorId: block.corridorId, scheduledTasksCount, approverId },
    })

    res.json({
      success: true,
      block,
      scheduledTasksCount,
      message: `Block approved. ${scheduledTasksCount} tasks marked as Scheduled.`,
    })
  } catch (error) {
    console.error('Error approving block:', error)
    res.status(500).json({ success: false, error: 'OperationError', message: 'Failed to approve block', details: error.message })
  }
})

// PATCH /api/blocks/:id/reject
// STEP 7 FIX & PHASE 8 GUARD: Revert tasks scheduled by this block back to 'Open', require mandatory rejection reason
router.patch('/:id/reject', requireAuth, requirePermission(PERMISSIONS.BLOCKS_REJECT), async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }

    // Step 20: Mandatory rejection reason
    if (!req.body?.reason || typeof req.body.reason !== 'string' || !req.body.reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'RejectionReasonRequired',
        message: 'A documented rejection reason is mandatory to reject an operational block.',
      })
    }

    const previousState = block.toObject()
    block.status = 'Rejected'
    block.rejectedBy = req.user?.userId || 'USR-CTRL-01'
    block.rejectionReason = req.body.reason.trim()
    await block.save()

    // Revert tasks that were scheduled for this block back to Open and clear their scheduledDate
    let revertedTasksCount = 0
    if (block.taskIds && block.taskIds.length > 0) {
      const updateResult = await Task.updateMany(
        { id: { $in: block.taskIds }, status: 'Scheduled', scheduledDate: block.date },
        { $set: { status: 'Open', scheduledDate: null } }
      )
      revertedTasksCount = updateResult.modifiedCount
    }

    await logAuditEvent({
      req,
      action: 'BLOCK_REJECTED',
      entityType: 'RecommendedBlock',
      entityId: block.id,
      previousState,
      newState: block.toObject(),
      reason: block.rejectionReason,
      metadata: { corridorId: block.corridorId, revertedTasksCount, rejectedBy: block.rejectedBy },
    })

    res.json({
      success: true,
      block,
      revertedTasksCount,
      message: `Block rejected. ${revertedTasksCount} tasks returned to Open backlog.`,
    })
  } catch (error) {
    console.error('Error rejecting block:', error)
    res.status(500).json({ success: false, error: 'OperationError', message: 'Failed to reject block', details: error.message })
  }
})

module.exports = router

