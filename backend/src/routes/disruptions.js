/**
 * routes/disruptions.js
 * Express router for simulated operational incidents & disruption impact analysis (Phase 7)
 */

const express = require('express')
const router = express.Router()
const {
  getAllIncidents,
  getIncidentById,
  createSimulatedIncident,
  resolveIncident,
  VALID_INCIDENT_TYPES,
  VALID_SEVERITIES,
} = require('../services/disruptionService')
const { evaluateDisruptionImpact } = require('../services/disruptionImpactService')
const { generateOperationalReport } = require('../services/reportService')

/**
 * GET /api/disruptions
 * List all simulated operational incidents
 */
router.get('/', (req, res) => {
  try {
    const { corridorId, severity, status, type } = req.query
    const list = getAllIncidents({ corridorId, severity, status, type })
    res.json({
      success: true,
      mode: 'SIMULATION',
      count: list.length,
      data: list,
    })
  } catch (err) {
    console.error('[API /api/disruptions GET Error]', err)
    res.status(500).json({ success: false, error: 'QueryError', message: err.message })
  }
})

/**
 * POST /api/disruptions/simulate
 * Simulates a new operational incident and evaluates its multi-corridor impact
 */
router.post('/simulate', async (req, res) => {
  try {
    const { incident } = req.body
    if (!incident) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Incident payload object is required.',
      })
    }

    const { type, corridorId, sectionId, start, end } = incident
    if (!type || !VALID_INCIDENT_TYPES.includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid incident type "${type}". Allowed: ${VALID_INCIDENT_TYPES.join(', ')}`,
      })
    }
    if (!corridorId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'corridorId is required.',
      })
    }
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'sectionId is required.',
      })
    }
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'start and end times are required.',
      })
    }

    // 1. Create simulated incident in in-memory store
    const created = createSimulatedIncident(incident)

    // 2. Evaluate multi-corridor operational impact
    const impact = await evaluateDisruptionImpact(created)

    res.status(201).json({
      success: true,
      mode: 'SIMULATION',
      incident: created,
      impact,
    })
  } catch (err) {
    console.error('[API /api/disruptions/simulate Error]', err)
    res.status(400).json({ success: false, error: 'SimulationError', message: err.message })
  }
})

/**
 * GET /api/disruptions/:id
 * Retrieve specific simulated incident and full impact evaluation
 */
router.get('/:id', async (req, res) => {
  try {
    const incident = getIncidentById(req.params.id)
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Incident "${req.params.id}" not found.`,
      })
    }

    const impact = await evaluateDisruptionImpact(incident)

    res.json({
      success: true,
      mode: 'SIMULATION',
      incident,
      impact,
    })
  } catch (err) {
    console.error(`[API /api/disruptions/${req.params.id} GET Error]`, err)
    res.status(500).json({ success: false, error: 'QueryError', message: err.message })
  }
})

/**
 * PATCH /api/disruptions/:id/resolve
 * Marks a simulated incident as resolved
 */
router.patch('/:id/resolve', (req, res) => {
  try {
    const resolved = resolveIncident(req.params.id)
    res.json({
      success: true,
      mode: 'SIMULATION',
      message: `Incident ${req.params.id} marked as RESOLVED.`,
      incident: resolved,
    })
  } catch (err) {
    console.error(`[API /api/disruptions/${req.params.id}/resolve Error]`, err)
    res.status(404).json({ success: false, error: 'NotFound', message: err.message })
  }
})

/**
 * GET /api/disruptions/:id/report
 * Generates the structured prototype block requisition report
 */
router.get('/:id/report', async (req, res) => {
  try {
    const incident = getIncidentById(req.params.id)
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Incident "${req.params.id}" not found.`,
      })
    }

    const report = await generateOperationalReport(incident)
    res.json(report)
  } catch (err) {
    console.error(`[API /api/disruptions/${req.params.id}/report Error]`, err)
    res.status(500).json({ success: false, error: 'ReportGenerationError', message: err.message })
  }
})

module.exports = router
