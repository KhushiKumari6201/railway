/**
 * routes/rescheduling.js
 * Express router for disruption rescheduling simulation & comparison (Phase 7)
 * 
 * STRICT RULES:
 * - 100% READ-ONLY. Does not modify MongoDB.
 * - Does NOT automatically approve any block.
 */

const express = require('express')
const router = express.Router()
const {
  generateReschedulingOptions,
  evaluateReschedulingWindow,
  compareReschedulingScenarios,
} = require('../services/reschedulingService')

/**
 * POST /api/rescheduling/simulate
 * Simulates and generates deterministic candidate alternative windows around a disruption
 */
router.post('/simulate', async (req, res) => {
  try {
    const { scenario } = req.body
    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Scenario object is required.',
      })
    }

    const { corridorId, sectionId, date, estimatedDuration, taskIds } = scenario
    const incidentStart = scenario.incidentStart || scenario.start
    const incidentEnd = scenario.incidentEnd || scenario.end

    if (!corridorId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'corridorId is required.',
      })
    }
    if (!incidentStart || !incidentEnd) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'incidentStart and incidentEnd (or start/end) times are required.',
      })
    }

    const result = await generateReschedulingOptions({
      corridorId,
      sectionId: sectionId || 'PKU–KGP',
      date: date || '2026-09-24',
      incidentStart,
      incidentEnd,
      estimatedDuration: estimatedDuration || 90,
      taskIds: Array.isArray(taskIds) ? taskIds : [],
    })

    res.json(result)
  } catch (err) {
    console.error('[API /api/rescheduling/simulate Error]', err)
    res.status(400).json({ success: false, error: 'SimulationError', message: err.message })
  }
})

/**
 * POST /api/rescheduling/compare
 * Evaluates multiple user-provided rescheduling alternatives side-by-side
 */
router.post('/compare', async (req, res) => {
  try {
    const { scenarios } = req.body
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'scenarios array with at least 1 item is required.',
      })
    }

    const result = await compareReschedulingScenarios(scenarios)
    res.json(result)
  } catch (err) {
    console.error('[API /api/rescheduling/compare Error]', err)
    res.status(400).json({ success: false, error: 'ComparisonError', message: err.message })
  }
})

/**
 * POST /api/rescheduling/apply
 * Validates selected rescheduling scenario and prepares parameters for Planner UI consumption
 * NOTE: Does NOT automatically approve any block.
 */
router.post('/apply', async (req, res) => {
  try {
    const { selectedScenario } = req.body
    if (!selectedScenario || !selectedScenario.start || !selectedScenario.end) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Valid selectedScenario object is required.',
      })
    }

    // Evaluate the window to ensure latest conflict state is verified
    const evaluation = await evaluateReschedulingWindow(selectedScenario)

    res.json({
      success: true,
      mode: 'SIMULATION',
      message: 'Rescheduled window prepared for Block Planner inspection. Controller approval required.',
      requiresApproval: true,
      plannerParameters: {
        corridorId: selectedScenario.corridorId || 'C01',
        sectionId: selectedScenario.sectionId || 'PKU–KGP',
        date: selectedScenario.date || '2026-09-24',
        start: selectedScenario.start,
        end: selectedScenario.end,
        taskIds: selectedScenario.taskIds || [],
      },
      evaluation,
    })
  } catch (err) {
    console.error('[API /api/rescheduling/apply Error]', err)
    res.status(400).json({ success: false, error: 'ApplyError', message: err.message })
  }
})

module.exports = router
