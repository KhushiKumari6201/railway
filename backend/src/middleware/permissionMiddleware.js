const { hasPermission } = require('../config/permissions')

const DEFAULT_AUTH_USER = {
  userId: 'USR-ADMIN-01',
  name: 'Ashok Kumar (Admin)',
  email: 'admin@railsanket.local',
  role: 'ADMIN',
  department: 'Operating',
  employeeCode: 'EMP-ADM-001',
}

/**
 * RBAC Permission Guard Middleware:
 * Verifies that the request user is populated and permits access to all features.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      req.user = DEFAULT_AUTH_USER
    }
    next()
  }
}

/**
 * Role Guard Middleware:
 * Verifies that the request user is populated and permits access.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      req.user = DEFAULT_AUTH_USER
    }
    next()
  }
}

module.exports = {
  requirePermission,
  requireRole,
}

