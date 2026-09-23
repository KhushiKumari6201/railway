require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connectDB, isDBConnected } = require('./db')
const { seedDatabase } = require('./seed')

const tasksRouter = require('./routes/tasks')
const blocksRouter = require('./routes/blocks')
const conflictsRouter = require('./routes/conflicts')
const networkRouter = require('./routes/network')
const whatIfRouter = require('./routes/whatIf')
const disruptionsRouter = require('./routes/disruptions')
const reschedulingRouter = require('./routes/rescheduling')
const authRouter = require('./routes/auth')
const usersRouter = require('./routes/users')
const auditRouter = require('./routes/audit')
const analyticsRouter = require('./routes/analytics')
const optimizationRouter = require('./routes/optimization')
const commandCenterRouter = require('./routes/commandCenter')
const alertsRouter = require('./routes/alerts')
const { seedUsers } = require('./services/authService')

const app = express()
const PORT = process.env.PORT || 5000

// CORS configuration supporting CLIENT_ORIGIN from .env with fallback
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001']

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true)
      }
      return callback(null, true) // Permissive for development convenience
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  })
)

app.use(express.json())

// Request logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`)
  next()
})

// Database readiness guard for MongoDB routes
function requireDatabase(req, res, next) {
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      error: 'DatabaseUnavailable',
      message: 'MongoDB is currently disconnected. Please ensure the MongoDB service is running.',
    })
  }
  next()
}

// Health check endpoint (always accessible even if DB is offline)
app.get('/api/health', (req, res) => {
  const dbStatus = isDBConnected() ? 'connected' : 'disconnected'
  const isHealthy = dbStatus === 'connected'

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'RailSanket Backend',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// Secure Seed endpoint (Protected against accidental wiping)
app.post('/api/seed', async (req, res) => {
  try {
    const isForce = req.query.force === 'true' || req.body?.force === true
    const isProduction = process.env.NODE_ENV === 'production'

    if (isForce) {
      if (isProduction) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Destructive force-seeding is strictly prohibited in production environment.',
        })
      }

      // Require explicit confirmation token/header to prevent accidental wipes
      const hasHeaderConfirm = req.headers['x-seed-confirmation'] === 'CONFIRM_RESET'
      const hasBodyConfirm = req.body?.confirmReset === true

      if (!hasHeaderConfirm && !hasBodyConfirm) {
        return res.status(400).json({
          success: false,
          error: 'ConfirmationRequired',
          message:
            'Force-seeding wipes all collections. To confirm, pass header "x-seed-confirmation: CONFIRM_RESET" or body { "force": true, "confirmReset": true }.',
        })
      }
    }

    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        error: 'DatabaseUnavailable',
        message: 'Cannot seed: MongoDB is disconnected.',
      })
    }

    const result = await seedDatabase(isForce)
    res.json({
      success: true,
      message: isForce ? 'Database reset and seeded successfully' : 'Database checked and seeded',
      details: result,
    })
  } catch (error) {
    console.error('[API /seed Error]', error)
    res.status(500).json({ success: false, error: 'SeedFailed', message: error.message })
  }
})

// API Routes with DB readiness guard
app.use('/api/auth', authRouter)
app.use('/api/users', requireDatabase, usersRouter)
app.use('/api/audit', requireDatabase, auditRouter)
app.use('/api/analytics', requireDatabase, analyticsRouter)
app.use('/api/tasks', requireDatabase, tasksRouter)
app.use('/api/blocks', requireDatabase, blocksRouter)
app.use('/api/conflicts', requireDatabase, conflictsRouter)
app.use('/api/network', requireDatabase, networkRouter)
app.use('/api/what-if', requireDatabase, whatIfRouter)
app.use('/api/disruptions', requireDatabase, disruptionsRouter)
app.use('/api/rescheduling', requireDatabase, reschedulingRouter)
app.use('/api/optimization', requireDatabase, optimizationRouter)
app.use('/api/command-center', commandCenterRouter)
app.use('/api/alerts', requireDatabase, alertsRouter)

// 404 Handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `API endpoint ${req.method} ${req.originalUrl} does not exist.`,
  })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err)
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
  })
})

// Connect to DB and start server
async function startServer() {
  try {
    await connectDB()
    // Auto-seed if database is empty (non-destructive)
    await seedDatabase(false)
    // Seed canonical prototype users and roles
    await seedUsers()
  } catch (err) {
    console.warn(
      `[Warning] Initial MongoDB connection failed. Server will start, but API endpoints requiring MongoDB will return 503 until MongoDB is accessible.`
    )
  }

  app.listen(PORT, () => {
    console.log(`===============================================`)
    console.log(`🚀 RailSanket Backend running on http://localhost:${PORT}`)
    console.log(`📡 REST API Endpoints:`)
    console.log(`   - Health:    http://localhost:${PORT}/api/health`)
    console.log(`   - Tasks:     http://localhost:${PORT}/api/tasks`)
    console.log(`   - Blocks:    http://localhost:${PORT}/api/blocks`)
    console.log(`   - Conflicts: http://localhost:${PORT}/api/conflicts`)
    console.log(`   - Seed:      POST http://localhost:${PORT}/api/seed`)
    console.log(`===============================================`)
  })
}

startServer()

