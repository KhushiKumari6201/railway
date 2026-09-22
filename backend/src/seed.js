require('dotenv').config()
const { connectDB } = require('./db')
const Task = require('./models/Task')
const RecommendedBlock = require('./models/RecommendedBlock')
const Conflict = require('./models/Conflict')
const { initialTasks, initialRecommendedBlocks, initialConflicts } = require('./seedData')

async function seedDatabase(force = false) {
  const isProduction = process.env.NODE_ENV === 'production'

  if (force && isProduction) {
    throw new Error('Destructive database resetting is strictly prohibited in production environment.')
  }

  const taskCount = await Task.countDocuments()
  if (taskCount > 0 && !force) {
    console.log(`[Seed] Database already contains ${taskCount} tasks. Skipping auto-seed.`)
    return {
      seeded: false,
      message: `Database already populated with ${taskCount} tasks. Skipping.`,
      currentCounts: {
        tasks: taskCount,
        recommendedBlocks: await RecommendedBlock.countDocuments(),
        conflicts: await Conflict.countDocuments(),
      },
    }
  }

  console.log('[Seed] Seeding database with Kharagpur Division railway planning dataset...')

  if (force) {
    await Task.deleteMany({})
    await RecommendedBlock.deleteMany({})
    await Conflict.deleteMany({})
    console.log('[Seed] Cleared existing collections under explicit reset confirmation.')
  }

  await Task.insertMany(initialTasks)
  await RecommendedBlock.insertMany(initialRecommendedBlocks)
  await Conflict.insertMany(initialConflicts)

  const summary = {
    seeded: true,
    clearedPrevious: force,
    tasksCount: initialTasks.length,
    recommendedBlocksCount: initialRecommendedBlocks.length,
    conflictsCount: initialConflicts.length,
  }

  console.log(`[Seed] Successfully seeded:`)
  console.log(`  - ${summary.tasksCount} tasks`)
  console.log(`  - ${summary.recommendedBlocksCount} recommended blocks`)
  console.log(`  - ${summary.conflictsCount} conflicts`)

  return summary
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
      console.error('[Seed] Error during seeding:', err.message)
      process.exit(1)
    })
}

module.exports = { seedDatabase }

