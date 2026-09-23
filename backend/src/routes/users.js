const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { hashPassword } = require('../services/authService')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')
const { logAuditEvent } = require('../services/auditService')

const VALID_ROLES = ['ADMIN', 'CONTROLLER', 'PLANNER', 'MAINTENANCE_OFFICER', 'VIEWER']
const VALID_DEPARTMENTS = ['Operating', 'Civil Engineering', 'S&T', 'Traction Distribution', 'General']

// All user management routes require USERS_MANAGE permission (ADMIN)
router.use(requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE))

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { role, department, active, search, limit = 50, skip = 0 } = req.query
    const filter = {}

    if (role && VALID_ROLES.includes(role.toUpperCase())) {
      filter.role = role.toUpperCase()
    }
    if (department && VALID_DEPARTMENTS.includes(department)) {
      filter.department = department
    }
    if (typeof active === 'string') {
      filter.active = active === 'true'
    }
    if (search && typeof search === 'string') {
      const q = search.trim()
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { userId: { $regex: q, $options: 'i' } },
        { employeeCode: { $regex: q, $options: 'i' } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip)),
      User.countDocuments(filter),
    ])

    res.json({
      success: true,
      users,
      total,
      limit: Number(limit),
      skip: Number(skip),
    })
  } catch (error) {
    console.error('[API /users GET Error]', error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch users list.' })
  }
})

// POST /api/users (Create a new user)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, department, employeeCode } = req.body || {}

    if (!name || !email || !password || !role || !department || !employeeCode) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'name, email, password, role, department, and employeeCode are required.',
      })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanRole = role.trim().toUpperCase()

    if (!VALID_ROLES.includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid role '${role}'. Valid roles: ${VALID_ROLES.join(', ')}`,
      })
    }

    if (!VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid department '${department}'. Valid departments: ${VALID_DEPARTMENTS.join(', ')}`,
      })
    }

    const existing = await User.findOne({ email: cleanEmail })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'DuplicateUser',
        message: `A user with email '${cleanEmail}' already exists.`,
      })
    }

    const userId = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`

    const newUser = await User.create({
      userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      role: cleanRole,
      department,
      employeeCode: employeeCode.trim(),
      active: true,
    })

    const safeUser = newUser.toObject()
    delete safeUser.passwordHash

    // Audit log
    await logAuditEvent({
      req,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: userId,
      reason: `New user account created by Administrator ${req.user.name}`,
      newState: safeUser,
      metadata: { role: cleanRole, email: cleanEmail },
    })

    res.status(201).json({
      success: true,
      user: safeUser,
      message: `User '${safeUser.name}' created successfully with role ${cleanRole}.`,
    })
  } catch (error) {
    console.error('[API /users POST Error]', error)
    res.status(500).json({ success: false, error: 'CreateError', message: error.message })
  }
})

// PATCH /api/users/:id (Update user role, status, or details)
router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `User with ID '${req.params.id}' not found.`,
      })
    }

    const previousState = user.toObject()
    delete previousState.passwordHash

    const { role, active, department, name, employeeCode } = req.body || {}

    // Safeguard: Cannot alter own role to prevent administrator lockout
    if (role && req.user.userId === user.userId && role.toUpperCase() !== user.role) {
      return res.status(403).json({
        success: false,
        error: 'SelfRoleModificationBlocked',
        message: 'Administrators are prevented from altering their own administrative role.',
      })
    }

    let isRoleChanged = false
    if (role && typeof role === 'string') {
      const cleanRole = role.trim().toUpperCase()
      if (!VALID_ROLES.includes(cleanRole)) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: `Invalid role '${role}'. Valid roles: ${VALID_ROLES.join(', ')}`,
        })
      }
      if (cleanRole !== user.role) {
        user.role = cleanRole
        isRoleChanged = true
      }
    }

    if (typeof active === 'boolean') {
      user.active = active
    }
    if (department && VALID_DEPARTMENTS.includes(department)) {
      user.department = department
    }
    if (name && typeof name === 'string') {
      user.name = name.trim()
    }
    if (employeeCode && typeof employeeCode === 'string') {
      user.employeeCode = employeeCode.trim()
    }

    await user.save()

    const newState = user.toObject()
    delete newState.passwordHash

    // Audit log
    await logAuditEvent({
      req,
      action: isRoleChanged ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
      entityType: 'User',
      entityId: user.userId,
      previousState,
      newState,
      reason: req.body.reason || (isRoleChanged ? `Role changed to ${user.role}` : 'User details updated'),
      metadata: { targetUserId: user.userId, modifiedBy: req.user.userId },
    })

    res.json({
      success: true,
      user: newState,
      message: 'User profile updated successfully.',
    })
  } catch (error) {
    console.error('[API /users PATCH Error]', error)
    res.status(500).json({ success: false, error: 'UpdateError', message: error.message })
  }
})

module.exports = router
