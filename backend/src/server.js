require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connectDB } = require('./db')
const { seedDatabase } = require('./seed')

const tasksRouter = require('./routes/tasks')
const blocksRouter = require('./routes/blocks')
const conflictsRouter = require('./routes/conflicts')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for prototype flexibility (port 3000, 3001, etc.)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}))
app.use(express.json())

// Request logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`)
  next()
})

// Routes
app.use('/api/tasks', tasksRouter)
app.use('/api/blocks', blocksRouter)
app.use('/api/conflicts', conflictsRouter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RailSanket Backend',
    database: 'MongoDB',
  })
})

// Seed endpoint to allow resetting database via API
app.post('/api/seed', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body.force === true
    await seedDatabase(force)
    res.json({ success: true, message: 'Database seeded successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed database', details: error.message })
  }
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err)
  res.status(500).json({ error: 'Internal Server Error', message: err.message })
})

// Connect to DB and start server
async function startServer() {
  try {
    await connectDB()
    // Auto-seed if database is empty
    await seedDatabase(false)
  } catch (err) {
    console.warn(`[Warning] Database initialization failed. Server will start, but API endpoints requiring MongoDB may fail until database is accessible.`)
  }

  app.listen(PORT, () => {
    console.log(`===============================================`)
    console.log(`🚀 RailSanket Backend running on http://localhost:${PORT}`)
    console.log(`📡 REST API Endpoints:`)
    console.log(`   - Tasks:     http://localhost:${PORT}/api/tasks`)
    console.log(`   - Blocks:    http://localhost:${PORT}/api/blocks`)
    console.log(`   - Conflicts: http://localhost:${PORT}/api/conflicts`)
    console.log(`   - Health:    http://localhost:${PORT}/api/health`)
    console.log(`===============================================`)
  })
}

startServer()
