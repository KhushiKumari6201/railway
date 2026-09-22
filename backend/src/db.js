const mongoose = require('mongoose')

// Disable Mongoose command buffering so queries fail immediately with clear errors
// rather than hanging for 10-30s when MongoDB is offline
mongoose.set('bufferCommands', false)

let isConnecting = false

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/railsanket'

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }
  if (isConnecting) {
    return mongoose.connection
  }

  isConnecting = true
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // 2.5s fail-fast timeout (instead of default 30s)
      connectTimeoutMS: 3000,
    })
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`)
    console.warn(`[MongoDB] Tip: Ensure MongoDB service is running (e.g. net start MongoDB) or check MONGO_URI in backend/.env`)
    throw error
  } finally {
    isConnecting = false
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database.')
})

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected to database.')
})

function isDBConnected() {
  return mongoose.connection.readyState === 1
}

module.exports = { connectDB, isDBConnected, mongoose }

