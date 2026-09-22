const express = require('express')
const router = express.Router()
const RecommendedBlock = require('../models/RecommendedBlock')
const Task = require('../models/Task')

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

// PATCH /api/blocks/:id/approve
router.patch('/:id/approve', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }

    block.status = 'Approved'
    await block.save()

    // Update bundled tasks to Scheduled and set their scheduledDate
    let scheduledTasksCount = 0
    if (block.taskIds && block.taskIds.length > 0) {
      const updateResult = await Task.updateMany(
        { id: { $in: block.taskIds } },
        { $set: { status: 'Scheduled', scheduledDate: block.date } }
      )
      scheduledTasksCount = updateResult.modifiedCount
    }

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
// STEP 7 FIX: Revert tasks scheduled by this block back to 'Open' so they don't remain orphaned
router.patch('/:id/reject', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Block '${req.params.id}' not found` })
    }

    block.status = 'Rejected'
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

