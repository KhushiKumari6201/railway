const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    role: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'TASK_CREATED',
        'TASK_UPDATED',
        'BLOCK_CREATED',
        'BLOCK_SUBMITTED',
        'BLOCK_UNDER_REVIEW',
        'BLOCK_APPROVED',
        'BLOCK_REJECTED',
        'CONFLICT_RESOLVED',
        'CONFLICTS_RESOLVED_ALL',
        'DISRUPTION_CREATED',
        'DISRUPTION_RESOLVED',
        'SCENARIO_APPLIED',
        'REPORT_GENERATED',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_ROLE_CHANGED',
        'OPTIMIZATION_GENERATED',
        'OPTIMIZATION_VALIDATED',
        'OPTIMIZATION_COMPARED',
        'OPTIMIZATION_APPLIED',
        'ALERT_ACKNOWLEDGED',
        'ALERT_REVIEW_STARTED',
        'ALERT_RESOLVED',
        'ALERT_DISMISSED',
        'ALERT_EVALUATED',
      ],
    },
    entityType: {
      type: String,
      required: true,
      index: true,
      enum: ['Task', 'RecommendedBlock', 'Conflict', 'Disruption', 'User', 'Report', 'Auth', 'Optimization', 'Alert'],
    },
    entityId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    previousState: { type: mongoose.Schema.Types.Mixed, default: null },
    newState: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    ipAddress: { type: String, default: '127.0.0.1' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

module.exports = mongoose.model('AuditLog', AuditLogSchema)
