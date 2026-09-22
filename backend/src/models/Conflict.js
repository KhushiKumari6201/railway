const mongoose = require('mongoose')

const ConflictSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  type: {
    type: String,
    enum: ['Operational', 'Resource', 'Corridor', 'Capacity', 'Dependency'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  corridorId: { type: String, required: true, index: true },
  affectedTasks: { type: [String], default: [] },
  affectedTrains: { type: [String], default: [] },
  time: { type: String, required: true },
  suggestedAction: { type: String, required: true },
  resolved: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
})

module.exports = mongoose.model('Conflict', ConflictSchema)
