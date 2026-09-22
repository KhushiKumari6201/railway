const express = require('express')
const router = express.Router()
const Conflict = require('../models/Conflict')

// GET /api/conflicts
router.get('/', async (req, res) => {
  try {
    const conflicts = await Conflict.find()
    res.json(conflicts)
  } catch (error) {
    console.error('Error fetching conflicts:', error)
    res.status(500).json({ error: 'Failed to fetch conflicts', details: error.message })
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
    if (!conflict) return res.status(404).json({ error: 'Conflict not found' })
    res.json({ success: true, conflict })
  } catch (error) {
    console.error('Error resolving conflict:', error)
    res.status(500).json({ error: 'Failed to resolve conflict', details: error.message })
  }
})

// PATCH /api/conflicts/resolve-all
router.patch('/resolve-all', async (req, res) => {
  try {
    await Conflict.updateMany({ resolved: false }, { $set: { resolved: true } })
    const conflicts = await Conflict.find()
    res.json({ success: true, conflicts })
  } catch (error) {
    console.error('Error resolving all conflicts:', error)
    res.status(500).json({ error: 'Failed to resolve all conflicts', details: error.message })
  }
})

module.exports = router
