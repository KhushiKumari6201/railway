const crypto = require('crypto')
const User = require('../models/User')
const { getRolePermissions } = require('../config/permissions')

const JWT_SECRET = process.env.JWT_SECRET || 'railsanket-secret-prototype-auth-key-2026'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// --- Password Hashing with PBKDF2 ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `pbkdf2$sha512$100000$${salt}$${hash}`
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  const parts = storedHash.split('$')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false
  const salt = parts[3]
  const originalHash = parts[4]
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'))
}

// --- Lightweight Secure JWT Implementation ---
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return Buffer.from(str, 'base64').toString('utf8')
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Date.now()
  const exp = now + TOKEN_EXPIRY_MS

  const tokenPayload = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  const signatureData = `${encodedHeader}.${encodedPayload}`
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureData)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signatureData}.${signature}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const signatureData = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureData)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  if (signature.length !== expectedSignature.length) return null
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )
  if (!isMatch) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null // Expired
    }
    return payload
  } catch (e) {
    return null
  }
}

/**
 * Deterministic Test/Demo Token Generator
 */
function getTestToken(role = 'ADMIN', userId = 'USR-TEST-01', name = 'Test User') {
  return signToken({
    userId,
    name,
    role,
    department: 'Operating',
    employeeCode: 'EMP-TEST',
  })
}

/**
 * Seed Canonical Prototype Users
 */
async function seedUsers() {
  const canonicalUsers = [
    {
      userId: 'USR-ADMIN-01',
      name: 'Ashok Kumar (Admin)',
      email: 'admin@railsanket.local',
      password: 'Admin@123',
      role: 'ADMIN',
      department: 'General',
      employeeCode: 'EMP-ADM-001',
      active: true,
    },
    {
      userId: 'USR-CTRL-01',
      name: 'S. K. Mukherjee (Chief Controller)',
      email: 'controller@railsanket.local',
      password: 'Controller@123',
      role: 'CONTROLLER',
      department: 'Operating',
      employeeCode: 'EMP-DOM-001',
      active: true,
    },
    {
      userId: 'USR-PLAN-01',
      name: 'Rajesh Verma (Sr. DEN / Planning)',
      email: 'planner@railsanket.local',
      password: 'Planner@123',
      role: 'PLANNER',
      department: 'Civil Engineering',
      employeeCode: 'EMP-DEN-002',
      active: true,
    },
    {
      userId: 'USR-MAINT-01',
      name: 'Priya Nair (S&T Maintenance)',
      email: 'maintenance@railsanket.local',
      password: 'Maintenance@123',
      role: 'MAINTENANCE_OFFICER',
      department: 'S&T',
      employeeCode: 'EMP-SNT-003',
      active: true,
    },
    {
      userId: 'USR-VIEW-01',
      name: 'V. Raman (Operations Auditor)',
      email: 'viewer@railsanket.local',
      password: 'Viewer@123',
      role: 'VIEWER',
      department: 'General',
      employeeCode: 'EMP-AUD-004',
      active: true,
    },
    // Backward-compatible demo officers
    {
      userId: 'dom',
      name: 'S. K. Mukherjee',
      email: 'srdom.kgp@ser.railnet.gov.in',
      password: 'ser•planner•2026',
      role: 'CONTROLLER',
      department: 'Operating',
      employeeCode: 'EMP-DOM-001',
      active: true,
    },
    {
      userId: 'den',
      name: 'Rajesh Verma',
      email: 'srden.plan.kgp@ser.railnet.gov.in',
      password: 'ser•planner•2026',
      role: 'PLANNER',
      department: 'Civil Engineering',
      employeeCode: 'EMP-DEN-002',
      active: true,
    },
    {
      userId: 'dee',
      name: 'Amit Sen',
      email: 'srdee.trd.kgp@ser.railnet.gov.in',
      password: 'ser•planner•2026',
      role: 'PLANNER',
      department: 'Traction Distribution',
      employeeCode: 'EMP-TRD-003',
      active: true,
    },
    {
      userId: 'dste',
      name: 'Priya Nair',
      email: 'srdste.kgp@ser.railnet.gov.in',
      password: 'ser•planner•2026',
      role: 'MAINTENANCE_OFFICER',
      department: 'S&T',
      employeeCode: 'EMP-SNT-004',
      active: true,
    },
  ]

  for (const u of canonicalUsers) {
    const existing = await User.findOne({ email: u.email.toLowerCase() })
    if (!existing) {
      await User.create({
        userId: u.userId,
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash: hashPassword(u.password),
        role: u.role,
        department: u.department,
        employeeCode: u.employeeCode,
        active: u.active,
      })
    }
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getTestToken,
  seedUsers,
}
