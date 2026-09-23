const express = require('express')
const router = express.Router()
const AuditLog = require('../models/AuditLog')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')

// Only ADMIN and CONTROLLER can view audit logs
router.use(requireAuth, requirePermission(PERMISSIONS.AUDIT_VIEW))

// GET /api/audit
router.get('/', async (req, res) => {
  try {
    const {
      userId,
      role,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
    } = req.query

    const filter = {}

    if (userId) filter.userId = userId
    if (role) filter.role = role.toUpperCase()
    if (action) filter.action = action.toUpperCase()
    if (entityType) filter.entityType = entityType
    if (entityId) filter.entityId = entityId

    if (startDate || endDate) {
      filter.timestamp = {}
      if (startDate) filter.timestamp.$gte = new Date(startDate)
      if (endDate) filter.timestamp.$lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(Number(skip)),
      AuditLog.countDocuments(filter),
    ])

    res.json({
      success: true,
      logs,
      total,
      limit: Number(limit),
      skip: Number(skip),
    })
  } catch (error) {
    console.error('[API /audit GET Error]', error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to retrieve audit trail.' })
  }
})

// GET /api/audit/:id
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findOne({ auditId: req.params.id })
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Audit record '${req.params.id}' not found.`,
      })
    }
    res.json({ success: true, log })
  } catch (error) {
    console.error(`[API /audit/${req.params.id} Error]`, error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch audit record.' })
  }
})

module.exports = router
