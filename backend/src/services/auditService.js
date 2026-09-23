const AuditLog = require('../models/AuditLog')

/**
 * Strips sensitive data like passwords or tokens before logging
 */
function sanitizeState(data) {
  if (!data || typeof data !== 'object') return data
  const clone = JSON.parse(JSON.stringify(data))

  function scrub(obj) {
    if (!obj || typeof obj !== 'object') return
    for (const key of Object.keys(obj)) {
      if (['password', 'passwordHash', 'token', 'authorization'].includes(key.toLowerCase())) {
        delete obj[key]
      } else if (typeof obj[key] === 'object') {
        scrub(obj[key])
      }
    }
  }

  scrub(clone)
  return clone
}

/**
 * Asynchronously record an operational audit event
 * @param {Object} params
 * @param {Object} params.req - Express request object
 * @param {string} params.action - Event action enum
 * @param {string} params.entityType - Entity category
 * @param {string} params.entityId - Primary identifier
 * @param {Object} [params.previousState]
 * @param {Object} [params.newState]
 * @param {string} [params.reason]
 * @param {Object} [params.metadata]
 */
async function logAuditEvent({
  req,
  action,
  entityType,
  entityId,
  previousState = null,
  newState = null,
  reason = '',
  metadata = {},
}) {
  try {
    const user = req?.user || {
      userId: 'SYSTEM',
      name: 'Automated System',
      role: 'SYSTEM',
    }

    const ipAddress =
      req?.headers?.['x-forwarded-for'] ||
      req?.connection?.remoteAddress ||
      req?.socket?.remoteAddress ||
      '127.0.0.1'

    const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    const logEntry = new AuditLog({
      auditId,
      userId: user.userId || 'UNKNOWN',
      userName: user.name || 'Unknown Officer',
      role: user.role || 'VIEWER',
      action,
      entityType,
      entityId: String(entityId),
      timestamp: new Date(),
      previousState: sanitizeState(previousState),
      newState: sanitizeState(newState),
      reason: reason || '',
      ipAddress: String(ipAddress),
      metadata: sanitizeState(metadata),
    })

    await logEntry.save()
    return logEntry
  } catch (err) {
    console.error('[AuditLog Error] Failed to write audit event:', err.message)
    // Non-fatal to caller to avoid blocking operations, but logged
    return null
  }
}

module.exports = {
  logAuditEvent,
  sanitizeState,
}
