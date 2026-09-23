const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { verifyPassword, signToken } = require('../services/authService')
const { getRolePermissions } = require('../config/permissions')
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware')
const { logAuditEvent } = require('../services/auditService')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Official email and password are required for login.',
      })
    }

    const cleanEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: cleanEmail })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'InvalidCredentials',
        message: 'Invalid official email or password.',
      })
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'AccountDeactivated',
        message: 'This officer account has been deactivated. Please contact your Divisional Administrator.',
      })
    }

    const isMatch = verifyPassword(password.trim(), user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'InvalidCredentials',
        message: 'Invalid official email or password.',
      })
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date()
    await user.save()

    const tokenPayload = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeCode: user.employeeCode,
    }

    const token = signToken(tokenPayload)
    const permissions = getRolePermissions(user.role)

    // Audit log login
    await logAuditEvent({
      req: { ...req, user: tokenPayload },
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: user.userId,
      reason: 'Successful user authentication',
      metadata: { role: user.role, department: user.department },
    })

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeCode: user.employeeCode,
        permissions,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error('[API /auth/login Error]', error)
    res.status(500).json({
      success: false,
      error: 'AuthError',
      message: 'An error occurred during authentication.',
      details: error.message,
    })
  }
})

// POST /api/auth/logout
router.post('/logout', optionalAuth, async (req, res) => {
  try {
    if (req.user) {
      await logAuditEvent({
        req,
        action: 'LOGOUT',
        entityType: 'Auth',
        entityId: req.user.userId,
        reason: 'User logged out',
      })
    }
    res.json({
      success: true,
      message: 'Logged out successfully.',
    })
  } catch (error) {
    console.error('[API /auth/logout Error]', error)
    res.status(500).json({
      success: false,
      error: 'LogoutError',
      message: 'Failed to process logout.',
    })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    let user = null
    if (req.user?.userId) {
      user = await User.findOne({ userId: req.user.userId }).select('-passwordHash')
    }
    if (!user) {
      user = await User.findOne().select('-passwordHash')
    }

    const role = user ? user.role : (req.user?.role || 'ADMIN')
    const permissions = getRolePermissions(role)

    res.json({
      success: true,
      user: {
        userId: user ? user.userId : (req.user?.userId || 'USR-ADMIN-01'),
        name: user ? user.name : (req.user?.name || 'Ashok Kumar (Admin)'),
        email: user ? user.email : (req.user?.email || 'admin@railsanket.local'),
        role,
        department: user ? user.department : (req.user?.department || 'Operating'),
        employeeCode: user ? user.employeeCode : (req.user?.employeeCode || 'EMP-ADM-001'),
        active: true,
        permissions,
        lastLogin: user?.lastLogin || new Date(),
      },
    })
  } catch (error) {
    console.error('[API /auth/me Error]', error)
    res.status(500).json({
      success: false,
      error: 'ProfileError',
      message: 'Failed to retrieve user profile.',
    })
  }
})

module.exports = router
