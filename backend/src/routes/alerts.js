/**
 * routes/alerts.js
 * Express Router for Phase 11 Operational Alert Intelligence & Action Center
 *
 * STRICT COMPLIANCE:
 * - Read-only queries do NOT create AuditLog entries (preserves audit integrity).
 * - Lifecycle state changes are strictly logged in AuditLog.
 * - RBAC enforced via requireAuth and requirePermission middleware.
 * - Input validation prevents arbitrary MongoDB operator injections.
 */

const express = require('express')
const router = express.Router()
const {
  evaluateAlerts,
  getAlerts,
  getAlertById,
  getAlertsSummary,
  acknowledgeAlert,
  reviewAlert,
  resolveAlert,
  dismissAlert,
  generateAlertDecisionTrace,
} = require('../services/alertIntelligenceService')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')
const { logAuditEvent } = require('../services/auditService')

// GET /api/alerts/summary
router.get('/summary', requireAuth, requirePermission(PERMISSIONS.ALERTS_VIEW), async (req, res) => {
  try {
    const { corridorId } = req.query || {}
    const summary = await getAlertsSummary({ corridorId })
    res.json(summary)
  } catch (err) {
    console.error('[API /alerts/summary Error]', err)
    res.status(500).json({
      success: false,
      error: 'AlertSummaryError',
      message: err.message || 'Failed to compute alert summary.',
    })
  }
})

// GET /api/alerts
router.get('/', requireAuth, requirePermission(PERMISSIONS.ALERTS_VIEW), async (req, res) => {
  try {
    const {
      severity,
      type,
      status,
      corridorId,
      section,
      trainNumber,
      taskId,
      blockId,
      disruptionId,
      search,
      limit,
      skip,
    } = req.query || {}

    const result = await getAlerts({
      severity,
      type,
      status,
      corridorId,
      section,
      trainNumber,
      taskId,
      blockId,
      disruptionId,
      search,
      limit: limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 100,
      skip: skip ? Math.max(0, parseInt(skip, 10)) : 0,
    })

    res.json(result)
  } catch (err) {
    console.error('[API /alerts Error]', err)
    res.status(500).json({
      success: false,
      error: 'AlertQueryError',
      message: err.message || 'Failed to fetch operational alerts.',
    })
  }
})

// GET /api/alerts/:id
router.get('/:id', requireAuth, requirePermission(PERMISSIONS.ALERTS_VIEW), async (req, res) => {
  try {
    const alert = await getAlertById(req.params.id)
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Alert '${req.params.id}' not found.`,
      })
    }
    res.json({
      success: true,
      alert,
    })
  } catch (err) {
    console.error(`[API /alerts/${req.params.id} Error]`, err)
    res.status(500).json({
      success: false,
      error: 'AlertDetailError',
      message: err.message,
    })
  }
})

// POST /api/alerts/evaluate
router.post('/evaluate', requireAuth, requirePermission(PERMISSIONS.ALERTS_EVALUATE), async (req, res) => {
  try {
    const { corridorId } = req.body || {}
    const result = await evaluateAlerts({ corridorId })

    await logAuditEvent({
      req,
      action: 'ALERT_EVALUATED',
      entityType: 'Alert',
      entityId: 'SYSTEM-EVAL',
      reason: `Operational alerts evaluated for ${corridorId || 'All Corridors'}`,
      metadata: { activeAlertsCount: result.activeAlertsCount },
    })

    res.json(result)
  } catch (err) {
    console.error('[API /alerts/evaluate Error]', err)
    res.status(500).json({
      success: false,
      error: 'AlertEvaluationError',
      message: err.message || 'Failed to evaluate operational alerts.',
    })
  }
})

// POST /api/alerts/:id/trace
router.post('/:id/trace', requireAuth, requirePermission(PERMISSIONS.ALERTS_VIEW), async (req, res) => {
  try {
    const trace = await generateAlertDecisionTrace(req.params.id)
    res.json({
      success: true,
      trace,
    })
  } catch (err) {
    console.error(`[API /alerts/${req.params.id}/trace Error]`, err)
    res.status(err.statusCode || 500).json({
      success: false,
      error: 'DecisionTraceError',
      message: err.message,
    })
  }
})

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', requireAuth, requirePermission(PERMISSIONS.ALERTS_ACKNOWLEDGE), async (req, res) => {
  try {
    const result = await acknowledgeAlert(req.params.id, req.user)

    await logAuditEvent({
      req,
      action: 'ALERT_ACKNOWLEDGED',
      entityType: 'Alert',
      entityId: req.params.id,
      previousState: result.previousState,
      newState: result.alert,
      reason: 'Operational alert acknowledged by cadre officer',
    })

    res.json(result)
  } catch (err) {
    console.error(`[API /alerts/${req.params.id}/acknowledge Error]`, err)
    res.status(err.statusCode || 500).json({
      success: false,
      error: 'AcknowledgeError',
      message: err.message,
    })
  }
})

// PATCH /api/alerts/:id/review
router.patch('/:id/review', requireAuth, requirePermission(PERMISSIONS.ALERTS_REVIEW), async (req, res) => {
  try {
    const { notes } = req.body || {}
    const result = await reviewAlert(req.params.id, req.user, notes)

    await logAuditEvent({
      req,
      action: 'ALERT_REVIEW_STARTED',
      entityType: 'Alert',
      entityId: req.params.id,
      previousState: result.previousState,
      newState: result.alert,
      reason: notes || 'Operational alert investigation initiated',
    })

    res.json(result)
  } catch (err) {
    console.error(`[API /alerts/${req.params.id}/review Error]`, err)
    res.status(err.statusCode || 500).json({
      success: false,
      error: 'ReviewError',
      message: err.message,
    })
  }
})

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', requireAuth, requirePermission(PERMISSIONS.ALERTS_RESOLVE), async (req, res) => {
  try {
    const { notes } = req.body || {}
    const result = await resolveAlert(req.params.id, req.user, notes)

    await logAuditEvent({
      req,
      action: 'ALERT_RESOLVED',
      entityType: 'Alert',
      entityId: req.params.id,
      previousState: result.previousState,
      newState: result.alert,
      reason: notes || 'Operational alert resolved and closed',
    })

    res.json(result)
  } catch (err) {
    console.error(`[API /alerts/${req.params.id}/resolve Error]`, err)
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.name || 'ResolveError',
      message: err.message,
    })
  }
})

// PATCH /api/alerts/:id/dismiss
router.patch('/:id/dismiss', requireAuth, requirePermission(PERMISSIONS.ALERTS_DISMISS), async (req, res) => {
  try {
    const { reason } = req.body || {}
    const result = await dismissAlert(req.params.id, req.user, reason)

    await logAuditEvent({
      req,
      action: 'ALERT_DISMISSED',
      entityType: 'Alert',
      entityId: req.params.id,
      previousState: result.previousState,
      newState: result.alert,
      reason: reason || 'Operational alert dismissed by authority',
    })

    res.json(result)
  } catch (err) {
    console.error(`[API /alerts/${req.params.id}/dismiss Error]`, err)
    res.status(err.statusCode || 500).json({
      success: false,
      error: 'DismissError',
      message: err.message,
    })
  }
})

module.exports = router
