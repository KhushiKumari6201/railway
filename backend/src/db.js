const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/railsanket'
  try {
    const conn = await mongoose.connect(uri)
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error(`[MongoDB] Connection error:`, error.message)
    console.warn(`[MongoDB] Tip: Ensure MongoDB service is running or provide a valid MONGO_URI in backend/.env`)
    throw error
  }
}

module.exports = { connectDB }
