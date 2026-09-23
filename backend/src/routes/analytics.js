const express = require('express')
const router = express.Router()
const { getOperationalAnalytics } = require('../services/analyticsService')
const { generateManagementReport } = require('../services/managementReportService')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')

// GET /api/analytics/overview (All authenticated users can view operational analytics)
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const { corridorId, department } = req.query
    const analytics = await getOperationalAnalytics({ corridorId, department })
    res.json({
      success: true,
      ...analytics,
    })
  } catch (error) {
    console.error('[API /analytics/overview Error]', error)
    res.status(500).json({
      success: false,
      error: 'AnalyticsError',
      message: 'Failed to compute operational analytics.',
      details: error.message,
    })
  }
})

// POST /api/analytics/reports (Generate structured management report)
router.post('/reports', requireAuth, requirePermission(PERMISSIONS.REPORTS_GENERATE), async (req, res) => {
  try {
    const { type, corridorId } = req.body || {}
    if (!type || typeof type !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Report type is required. Valid types: OPERATIONAL_SUMMARY, BLOCK_PLANNING, CONFLICT, DISRUPTION, AUDIT, OPTIMIZATION, COMMAND_CENTER_SUMMARY, ALERT_SUMMARY',
      })
    }

    const report = await generateManagementReport({ type, req, corridorId })
    res.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('[API /analytics/reports Error]', error)
    res.status(500).json({
      success: false,
      error: 'ReportGenerationError',
      message: error.message,
    })
  }
})

module.exports = router

