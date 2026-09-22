require('dotenv').config()
const { connectDB } = require('./db')
const Task = require('./models/Task')
const RecommendedBlock = require('./models/RecommendedBlock')
const Conflict = require('./models/Conflict')
const { initialTasks, initialRecommendedBlocks, initialConflicts } = require('./seedData')

async function seedDatabase(force = false) {
  const taskCount = await Task.countDocuments()
  if (taskCount > 0 && !force) {
    console.log(`[Seed] Database already contains ${taskCount} tasks. Skipping auto-seed.`)
    return
  }

  console.log('[Seed] Seeding database with railway planning datasets...')

  if (force) {
    await Task.deleteMany({})
    await RecommendedBlock.deleteMany({})
    await Conflict.deleteMany({})
    console.log('[Seed] Cleared existing collections.')
  }

  await Task.insertMany(initialTasks)
  await RecommendedBlock.insertMany(initialRecommendedBlocks)
  await Conflict.insertMany(initialConflicts)

  console.log(`[Seed] Successfully seeded:`)
  console.log(`  - ${initialTasks.length} tasks`)
  console.log(`  - ${initialRecommendedBlocks.length} recommended blocks`)
  console.log(`  - ${initialConflicts.length} conflicts`)
}

// Standalone execution: node src/seed.js
if (require.main === module) {
  connectDB()
    .then(() => seedDatabase(true))
    .then(() => {
      console.log('[Seed] Completed. Exiting process.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err)
      process.exit(1)
    })
}

module.exports = { seedDatabase }
