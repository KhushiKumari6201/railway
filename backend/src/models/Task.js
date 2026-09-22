const mongoose = require('mongoose')

const PriorityFactorSchema = new mongoose.Schema({
  label: { type: String, required: true },
  contribution: { type: Number, required: true },
  positive: { type: Boolean, required: true },
}, { _id: false })

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  sourceSystem: { type: String, enum: ['TMS', 'SMMS', 'TDMS'], required: true },
  department: { type: String, enum: ['Engineering', 'S&T', 'Traction'], required: true },
  assetId: { type: String, required: true },
  assetType: { type: String, required: true },
  corridorId: { type: String, required: true, index: true },
  location: { type: String, required: true },
  taskType: { type: String, required: true },
  criticality: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true, index: true },
  defectSeverity: { type: Number, default: 50 },
  dueDate: { type: String, required: true },
  overdueDays: { type: Number, default: 0 },
  estimatedDuration: { type: Number, required: true }, // in minutes
  requiredBlockType: {
    type: String,
    enum: ['Traffic Block', 'Power Block', 'Signalling Disconnection', 'Corridor Block'],
    required: true,
  },
  crew: { type: String, required: true },
  dependencies: { type: [String], default: [] },
  status: { type: String, enum: ['Open', 'Scheduled', 'Completed'], default: 'Open', index: true },
  priority: { type: Number, default: 50 },
  priorityFactors: { type: [PriorityFactorSchema], default: [] },
  scheduledDate: { type: String, default: null, index: true },
}, {
  timestamps: true,
})

module.exports = mongoose.model('Task', TaskSchema)
