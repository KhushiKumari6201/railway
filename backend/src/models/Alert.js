const mongoose = require('mongoose')

const AlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        'CRITICAL_CONFLICT',
        'NETWORK_CONFLICT',
        'ACTIVE_DISRUPTION',
        'TRAIN_IMPACT',
        'PENDING_APPROVAL',
        'RESOURCE_DOUBLE_BOOKED',
        'DEPENDENCY_VIOLATION',
        'SAFETY_BUFFER_FAILURE',
        'RESCHEDULING_REQUIRED',
        'OPTIMIZATION_REVIEW',
        'HIGH_NETWORK_UTILIZATION',
        'UNRESOLVED_OPERATIONAL_CONFLICT',
        'SYSTEM_HEALTH_WARNING',
      ],
    },
    severity: {
      type: String,
      required: true,
      index: true,
      enum: ['CRITICAL', 'WARNING', 'INFO'],
    },
    status: {
      type: String,
      required: true,
      index: true,
      enum: ['OPEN', 'ACKNOWLEDGED', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
    },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    explanation: { type: String, default: '' },
    whyThisAlertExists: { type: String, default: '' },
    corridorId: { type: String, index: true, default: 'ALL' },
    section: { type: String, default: '' },
    sourceModule: { type: String, default: 'Alert Intelligence' },
    recommendedModule: { type: String, default: 'Command Center' },
    route: { type: String, default: '/command-center' },

    // Structured Entity Links
    relatedTaskIds: { type: [String], default: [] },
    relatedBlockIds: { type: [String], default: [] },
    relatedConflictIds: { type: [String], default: [] },
    relatedTrainNumbers: { type: [String], default: [] },
    relatedDisruptionIds: { type: [String], default: [] },
    relatedOptimizationIds: { type: [String], default: [] },

    // Factual Evidence & Impact Metrics
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    simulatedImpact: {
      delayMinutes: { type: Number, default: 0 },
      affectedTrainsCount: { type: Number, default: 0 },
      operationalRisk: { type: String, default: 'LOW' },
      networkUtilizationImpactPct: { type: Number, default: 0 },
      details: { type: String, default: '' },
    },

    // Action Center
    availableActions: { type: mongoose.Schema.Types.Mixed, default: [] },
    decisionTraceReference: { type: String, default: '' },

    // Timestamps and Cadre Tracking
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    reviewNotes: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolutionNotes: { type: String, default: '' },
    dismissedAt: { type: Date, default: null },
    dismissedBy: { type: String, default: null },
    dismissalReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

module.exports = mongoose.model('Alert', AlertSchema)
