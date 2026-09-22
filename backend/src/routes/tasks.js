const express = require('express')
const router = express.Router()
const Task = require('../models/Task')

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { criticality, department, corridorId, status } = req.query
    const filter = {}
    if (criticality) filter.criticality = criticality
    if (department) filter.department = department
    if (corridorId) filter.corridorId = corridorId
    if (status) filter.status = status

    const tasks = await Task.find(filter).sort({ priority: -1 })
    res.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message })
  }
})

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id })
    if (!task) return res.status(404).json({ error: 'Task not found' })
    res.json(task)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task', details: error.message })
  }
})

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body)
    await task.save()
    res.status(201).json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(400).json({ error: 'Failed to create task', details: error.message })
  }
})

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Task.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'Task not found' })
    res.json(updated)
  } catch (error) {
    console.error('Error updating task:', error)
    res.status(400).json({ error: 'Failed to update task', details: error.message })
  }
})

module.exports = router
