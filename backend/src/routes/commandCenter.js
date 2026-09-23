/**
 * routes/commandCenter.js
 * Express Router for Phase 10 Integrated Railway Operations Command Center
 * 
 * STRICT COMPLIANCE:
 * - Read-only aggregator endpoint.
 * - Does NOT mutate tasks, blocks, conflicts, or disruptions.
 * - Does NOT create AuditLog entries on view queries (preserves audit integrity).
 * - Enforces authentication and RBAC permissions.
 */

const express = require('express')
const router = express.Router()
const { getCommandCenterOverview } = require('../services/commandCenterService')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')

// GET /api/command-center/overview
router.get('/overview', requireAuth, requirePermission(PERMISSIONS.DATA_VIEW_ALL), async (req, res) => {
  try {
    const { corridorId, date, department, severity, search, traceId } = req.query || {}

    const overview = await getCommandCenterOverview({
      corridorId,
      date,
      department,
      severity,
      search,
      traceId,
    })

    res.json(overview)
  } catch (error) {
    console.error('[API /command-center/overview Error]', error)
    res.status(500).json({
      success: false,
      error: 'CommandCenterError',
      message: error.message || 'Failed to aggregate command center operational overview.',
    })
  }
})

module.exports = router
