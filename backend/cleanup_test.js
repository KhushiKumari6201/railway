const { connectDB } = require('./src/db')
const Task = require('./src/models/Task')

async function cleanup() {
  await connectDB()
  await Task.deleteOne({ id: 'TST-999' })
  console.log('Cleaned up TST-999')
  process.exit(0)
}

cleanup()
