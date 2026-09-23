const express = require('express')
const router = express.Router()
const { simulateScenario, compareScenarios } = require('../services/whatIfService')

/**
 * POST /api/what-if/simulate
 * Simulates a hypothetical maintenance block scenario in-memory.
 * Read-only: does not modify any MongoDB collections or timetable files.
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { baseBlockId, scenario } = req.body

    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Scenario object is required in request body.',
      })
    }

    const result = await simulateScenario(baseBlockId, scenario)
    res.json(result)
  } catch (err) {
    if (err.message && (err.message.includes('required') || err.message.includes('Invalid'))) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      })
    }
    console.error('[API What-If Simulation Error]', err)
    next(err)
  }
})

/**
 * POST /api/what-if/compare
 * Evaluates a baseline scenario and a list of alternative scenarios side-by-side.
 */
router.post('/compare', async (req, res, next) => {
  try {
    const { baseline, scenarios } = req.body

    if (!baseline) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Baseline scenario object is required for comparison.',
      })
    }

    const result = await compareScenarios(baseline, scenarios || [])
    res.json(result)
  } catch (err) {
    if (err.message && (err.message.includes('required') || err.message.includes('Invalid'))) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      })
    }
    console.error('[API What-If Compare Error]', err)
    next(err)
  }
})

module.exports = router
