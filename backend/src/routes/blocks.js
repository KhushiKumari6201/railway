const express = require('express')
const router = express.Router()
const RecommendedBlock = require('../models/RecommendedBlock')
const Task = require('../models/Task')

// GET /api/blocks
router.get('/', async (req, res) => {
  try {
    const blocks = await RecommendedBlock.find().sort({ date: 1, start: 1 })
    res.json(blocks)
  } catch (error) {
    console.error('Error fetching blocks:', error)
    res.status(500).json({ error: 'Failed to fetch blocks', details: error.message })
  }
})

// GET /api/blocks/:id
router.get('/:id', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOne({ id: req.params.id })
    if (!block) return res.status(404).json({ error: 'Block not found' })
    res.json(block)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch block', details: error.message })
  }
})

// PATCH /api/blocks/:id/approve
router.patch('/:id/approve', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: 'Approved' } },
      { new: true }
    )
    if (!block) return res.status(404).json({ error: 'Block not found' })

    // Update bundled tasks to Scheduled and set their scheduledDate
    if (block.taskIds && block.taskIds.length > 0) {
      await Task.updateMany(
        { id: { $in: block.taskIds } },
        { $set: { status: 'Scheduled', scheduledDate: block.date } }
      )
    }

    res.json({ success: true, block })
  } catch (error) {
    console.error('Error approving block:', error)
    res.status(500).json({ error: 'Failed to approve block', details: error.message })
  }
})

// PATCH /api/blocks/:id/reject
router.patch('/:id/reject', async (req, res) => {
  try {
    const block = await RecommendedBlock.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: 'Rejected' } },
      { new: true }
    )
    if (!block) return res.status(404).json({ error: 'Block not found' })
    res.json({ success: true, block })
  } catch (error) {
    console.error('Error rejecting block:', error)
    res.status(500).json({ error: 'Failed to reject block', details: error.message })
  }
})

module.exports = router
