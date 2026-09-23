const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const { requireAuth } = require('../middleware/authMiddleware')
const { requirePermission } = require('../middleware/permissionMiddleware')
const { PERMISSIONS } = require('../config/permissions')
const { logAuditEvent } = require('../services/auditService')

const VALID_DEPARTMENTS = ['Engineering', 'S&T', 'Traction']
const VALID_CRITICALITIES = ['Low', 'Medium', 'High', 'Critical']
const VALID_STATUSES = ['Open', 'Scheduled', 'Completed']
const VALID_BLOCK_TYPES = [
  'Traffic Block',
  'Power Block',
  'Signalling Disconnection',
  'Corridor Block',
]
const VALID_SOURCE_SYSTEMS = ['TMS', 'SMMS', 'TDMS']

// Whitelist of fields permitted for client PATCH updates
const ALLOWED_UPDATE_FIELDS = [
  'status',
  'scheduledDate',
  'priority',
  'criticality',
  'defectSeverity',
  'overdueDays',
  'estimatedDuration',
  'crew',
  'requiredBlockType',
  'dependencies',
  'priorityFactors',
  'taskType',
  'location',
]

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { criticality, department, corridorId, status } = req.query
    const filter = {}

    if (criticality && VALID_CRITICALITIES.includes(criticality)) {
      filter.criticality = criticality
    }
    if (department && VALID_DEPARTMENTS.includes(department)) {
      filter.department = department
    }
    if (corridorId && typeof corridorId === 'string') {
      filter.corridorId = corridorId.trim().toUpperCase()
    }
    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status
    }

    const tasks = await Task.find(filter).sort({ priority: -1 })
    res.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch tasks', details: error.message })
  }
})

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id })
    if (!task) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Task with id '${req.params.id}' not found` })
    }
    res.json(task)
  } catch (error) {
    console.error(`Error fetching task ${req.params.id}:`, error)
    res.status(500).json({ success: false, error: 'QueryError', message: 'Failed to fetch task', details: error.message })
  }
})

// POST /api/tasks
router.post('/', requireAuth, requirePermission(PERMISSIONS.TASKS_CREATE), async (req, res) => {
  try {
    const {
      id,
      sourceSystem,
      department,
      assetId,
      assetType,
      corridorId,
      location,
      taskType,
      criticality,
      defectSeverity,
      dueDate,
      overdueDays,
      estimatedDuration,
      requiredBlockType,
      crew,
      dependencies,
      priority,
      priorityFactors,
      status,
    } = req.body

    // Basic required field validations
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Task id is required and must be a string' })
    }
    if (!sourceSystem || !VALID_SOURCE_SYSTEMS.includes(sourceSystem)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `sourceSystem must be one of: ${VALID_SOURCE_SYSTEMS.join(', ')}`,
      })
    }
    if (!department || !VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `department must be one of: ${VALID_DEPARTMENTS.join(', ')}`,
      })
    }
    if (!assetId || typeof assetId !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'assetId is required' })
    }
    if (!corridorId || typeof corridorId !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'corridorId is required' })
    }
    if (!taskType || typeof taskType !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'taskType is required' })
    }
    if (!criticality || !VALID_CRITICALITIES.includes(criticality)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `criticality must be one of: ${VALID_CRITICALITIES.join(', ')}`,
      })
    }
    if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'estimatedDuration is required and must be a positive number of minutes',
      })
    }
    if (!requiredBlockType || !VALID_BLOCK_TYPES.includes(requiredBlockType)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `requiredBlockType must be one of: ${VALID_BLOCK_TYPES.join(', ')}`,
      })
    }
    if (!crew || typeof crew !== 'string') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'crew is required' })
    }

    // Check duplicate ID
    const existing = await Task.findOne({ id })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: `A task with id '${id}' already exists`,
      })
    }

    const task = new Task({
      id,
      sourceSystem,
      department,
      assetId,
      assetType: assetType || 'Track',
      corridorId,
      location: location || '',
      taskType,
      criticality,
      defectSeverity: typeof defectSeverity === 'number' ? defectSeverity : 50,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      overdueDays: typeof overdueDays === 'number' ? overdueDays : 0,
      estimatedDuration,
      requiredBlockType,
      crew,
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      priority: typeof priority === 'number' ? priority : 50,
      priorityFactors: Array.isArray(priorityFactors) ? priorityFactors : [],
      status: VALID_STATUSES.includes(status) ? status : 'Open',
    })

    await task.save()

    await logAuditEvent({
      req,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      newState: task.toObject(),
      reason: `Task created in corridor ${task.corridorId}`,
      metadata: { department: task.department, assetId: task.assetId },
    })

    res.status(201).json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(400).json({ success: false, error: 'ValidationError', message: 'Failed to create task', details: error.message })
  }
})

// PATCH /api/tasks/:id
router.patch('/:id', requireAuth, requirePermission(PERMISSIONS.TASKS_UPDATE), async (req, res) => {
  try {
    const rawUpdates = req.body
    if (!rawUpdates || typeof rawUpdates !== 'object') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Update payload must be a JSON object' })
    }

    const previousTask = await Task.findOne({ id: req.params.id }).lean()
    if (!previousTask) {
      return res.status(404).json({ success: false, error: 'NotFound', message: `Task '${req.params.id}' not found` })
    }

    // Build sanitized updates exclusively from the whitelist
    // Explicitly stripping _id, id, createdAt, updatedAt to guarantee immutability
    const sanitizedUpdates = {}
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (rawUpdates[key] !== undefined) {
        sanitizedUpdates[key] = rawUpdates[key]
      }
    }

    // Validate enum fields if present in update
    if (sanitizedUpdates.status && !VALID_STATUSES.includes(sanitizedUpdates.status)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    }
    if (sanitizedUpdates.criticality && !VALID_CRITICALITIES.includes(sanitizedUpdates.criticality)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `criticality must be one of: ${VALID_CRITICALITIES.join(', ')}`,
      })
    }
    if (sanitizedUpdates.requiredBlockType && !VALID_BLOCK_TYPES.includes(sanitizedUpdates.requiredBlockType)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `requiredBlockType must be one of: ${VALID_BLOCK_TYPES.join(', ')}`,
      })
    }
    if (sanitizedUpdates.priority !== undefined) {
      const p = Number(sanitizedUpdates.priority)
      if (isNaN(p) || p < 0 || p > 100) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'priority must be a number between 0 and 100',
        })
      }
      sanitizedUpdates.priority = p
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No valid editable fields provided in update payload',
        allowedFields: ALLOWED_UPDATE_FIELDS,
      })
    }

    const updated = await Task.findOneAndUpdate(
      { id: req.params.id },
      { $set: sanitizedUpdates },
      { new: true, runValidators: true }
    )

    await logAuditEvent({
      req,
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: req.params.id,
      previousState: previousTask,
      newState: updated.toObject(),
      reason: req.body.reason || 'Operational task parameters updated',
      metadata: { modifiedFields: Object.keys(sanitizedUpdates) },
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating task:', error)
    res.status(400).json({ success: false, error: 'UpdateError', message: 'Failed to update task', details: error.message })
  }
})

module.exports = router

