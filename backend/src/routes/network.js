const express = require('express')
const router = express.Router()
const { getNetworkIntelligence, NETWORK_CORRIDORS } = require('../services/networkService')
const {
  checkNetworkCoordination,
  compareNetworkCoordination,
  CORRIDOR_GRAPH,
} = require('../services/networkCoordinationService')

/**
 * GET /api/network/intelligence
 * Returns aggregated railway network corridors, sections, trains, blocks, and conflicts
 */
router.get('/intelligence', async (req, res, next) => {
  try {
    const { corridorId } = req.query
    const data = await getNetworkIntelligence(corridorId)
    res.json(data)
  } catch (err) {
    console.error('[API Network Intelligence Error]', err)
    next(err)
  }
})

/**
 * GET /api/network/corridors
 * Returns metadata list of all configured corridors
 */
router.get('/corridors', (req, res) => {
  res.json({
    success: true,
    corridors: NETWORK_CORRIDORS,
  })
})

/**
 * GET /api/network/topology
 * Returns the operational network graph topology with interchange junctions
 */
router.get('/topology', (req, res) => {
  res.json({
    success: true,
    corridors: Object.values(CORRIDOR_GRAPH),
    topology: CORRIDOR_GRAPH,
  })
})

/**
 * POST /api/network/coordination/check
 * Evaluates multi-corridor cross-connections, resource double-booking, dependencies, and network utilization
 */
router.post('/coordination/check', async (req, res, next) => {
  try {
    const { scenario } = req.body
    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Scenario object is required in request body.',
      })
    }

    const result = await checkNetworkCoordination(scenario)
    res.json(result)
  } catch (err) {
    if (err.message && (err.message.includes('required') || err.message.includes('not recognized'))) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      })
    }
    console.error('[API Network Coordination Check Error]', err)
    next(err)
  }
})

/**
 * POST /api/network/coordination/compare
 * Compares multiple multi-corridor scenarios side-by-side
 */
router.post('/coordination/compare', async (req, res, next) => {
  try {
    const { scenarios } = req.body
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Array of scenarios is required for comparison.',
      })
    }

    const result = await compareNetworkCoordination(scenarios)
    res.json(result)
  } catch (err) {
    if (err.message && (err.message.includes('required') || err.message.includes('not recognized'))) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      })
    }
    console.error('[API Network Coordination Compare Error]', err)
    next(err)
  }
})

module.exports = router
