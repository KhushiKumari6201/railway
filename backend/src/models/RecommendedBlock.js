const mongoose = require('mongoose')

const AlternativeSchema = new mongoose.Schema({
  start: { type: String },
  end: { type: String },
  operationalImpact: { type: String },
  note: { type: String },
}, { _id: false })

const RecommendedBlockSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true, index: true },
  corridorId: { type: String, required: true, index: true },
  section: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  durationMin: { type: Number, required: true },
  blockType: { type: String, required: true },
  confidence: { type: String, enum: ['Low', 'Medium', 'High'], default: 'High' },
  utilization: { type: Number, default: 85 },
  operationalImpact: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  status: { type: String, enum: ['Recommended', 'Approved', 'Rejected'], default: 'Recommended', index: true },
  taskIds: { type: [String], default: [] },
  criticalTasks: { type: Number, default: 0 },
  downtimeSavedMin: { type: Number, default: 0 },
  reasons: { type: [String], default: [] },
  alternative: { type: AlternativeSchema, default: null },
}, {
  timestamps: true,
})

module.exports = mongoose.model('RecommendedBlock', RecommendedBlockSchema)
