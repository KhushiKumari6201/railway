const express = require('express')
const router = express.Router()
const Conflict = require('../models/Conflict')

const VALID_SEVERITIES = ['Critical', 'Warning', 'Info']

// GET /api/conflicts
router.get('/', async (req, res) => {
  try {
    const { severity, corridorId, resolved } = req.query
    const filter = {}

    if (severity && VALID_SEVERITIES.includes(severity)) {
      filter.severity = severity
    }
    if (corridorId && typeof corridorId === 'string') {
      filter.corridorId = corridorId.trim().toUpperCase()
    }
    if (resolved !== undefined) {
      filter.resolved = resolved === 'true'
    }

    const conflicts = await Conflict.find(filter).sort({ severity: 1, createdAt: -1 })
    res.json(conflicts)
  } catch (error) {
    console.error('Error fetching conflicts:', error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch conflicts', details: error.message })
  }
})

// GET /api/conflicts/:id
router.get('/:id', async (req, res) => {
  try {
    const conflict = await Conflict.findOne({ id: req.params.id })
    if (!conflict) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Conflict '${req.params.id}' not found` })
    }
    res.json(conflict)
  } catch (error) {
    console.error(`Error fetching conflict ${req.params.id}:`, error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch conflict', details: error.message })
  }
})

// PATCH /api/conflicts/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  try {
    const conflict = await Conflict.findOneAndUpdate(
      { id: req.params.id },
      { $set: { resolved: true } },
      { new: true }
    )
    if (!conflict) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Conflict '${req.params.id}' not found` })
    }
    res.json({ success: true, conflict })
  } catch (error) {
    console.error('Error resolving conflict:', error)
    res.status(500).json({ success: false, error: 'OperationError', message: 'Failed to resolve conflict', details: error.message })
  }
})

// PATCH /api/conflicts/resolve-all
router.patch('/resolve-all', async (req, res) => {
  try {
    const updateResult = await Conflict.updateMany({ resolved: false }, { $set: { resolved: true } })
    const conflicts = await Conflict.find().sort({ severity: 1 })
    res.json({
      success: true,
      resolvedCount: updateResult.modifiedCount,
      message: `Resolved ${updateResult.modifiedCount} active conflicts across corridors.`,
      conflicts,
    })
  } catch (error) {
    console.error('Error resolving all conflicts:', error)
    res.status(500).json({ success: false, error: 'OperationError', message: 'Failed to resolve all conflicts', details: error.message })
  }
})

module.exports = router

