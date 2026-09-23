export type Department = 'Engineering' | 'S&T' | 'Traction'

export type SourceSystem = 'TMS' | 'SMMS' | 'TDMS'

export type Criticality = 'Low' | 'Medium' | 'High' | 'Critical'

export type TaskStatus = 'Open' | 'Scheduled' | 'Completed'

export type BlockType =
  | 'Traffic Block'
  | 'Power Block'
  | 'Signalling Disconnection'
  | 'Corridor Block'

export type AssetType =
  | 'Track'
  | 'Turnout'
  | 'Bridge'
  | 'Signal'
  | 'Point Machine'
  | 'Track Circuit'
  | 'OHE'
  | 'Traction Substation'
  | 'Level Crossing'

export interface Corridor {
  id: string
  name: string
  route: string
  sections: string[]
  trafficDensity: 'Low' | 'Medium' | 'High'
}

export interface MaintenanceTask {
  id: string
  sourceSystem: SourceSystem
  department: Department
  assetId: string
  assetType: AssetType
  corridorId: string
  location: string
  taskType: string
  criticality: Criticality
  defectSeverity: number // 0-100
  dueDate: string // ISO date
  overdueDays: number
  estimatedDuration: number // minutes
  requiredBlockType: BlockType
  crew: string
  dependencies: string[]
  status: TaskStatus
  priority: number // 0-100 computed
  priorityFactors: PriorityFactor[]
  scheduledDate?: string // YYYY-MM-DD
}

export interface PriorityFactor {
  label: string
  contribution: number // points contributed
  positive: boolean
}

export interface TrainMovement {
  id: string
  trainNo: string
  name: string
  corridorId: string
  section: string
  arrival: string // HH:MM
  departure: string // HH:MM
  type: 'Passenger' | 'Express' | 'Goods' | 'Superfast'
  priority: 'Low' | 'Medium' | 'High'
  forecast: boolean
  forecastConfidence?: number
}

export interface BlockWindow {
  id: string
  date: string
  corridorId: string
  section: string
  start: string
  end: string
  durationMin: number
  blockType: BlockType
  availability: 'Available' | 'Restricted' | 'Blackout'
  operationalRisk: 'Low' | 'Medium' | 'High'
}

export type PlanTaskStatus = 'Recommended' | 'Approved' | 'Rejected'

export interface RecommendedBlock {
  id: string
  date: string
  corridorId: string
  section: string
  start: string
  end: string
  durationMin: number
  blockType: BlockType
  confidence: 'Low' | 'Medium' | 'High'
  utilization: number // %
  operationalImpact: 'Low' | 'Medium' | 'High'
  status: PlanTaskStatus
  taskIds: string[]
  reasons: string[]
  downtimeSavedMin: number
  criticalTasks: number
  alternative?: {
    start: string
    end: string
    operationalImpact: 'Low' | 'Medium' | 'High'
    note: string
  }
}

export type ConflictType =
  | 'Operational'
  | 'Resource'
  | 'Corridor'
  | 'Capacity'
  | 'Dependency'

export type Severity = 'Critical' | 'Warning' | 'Info'

export interface Conflict {
  id: string
  type: ConflictType
  severity: Severity
  title: string
  description: string
  corridorId: string
  affectedTasks: string[]
  affectedTrains: string[]
  time: string
  suggestedAction: string
  resolved: boolean
}

export interface Exception {
  id: string
  taskId: string
  priority: number
  reason: string
  suggestedAction: string
}

export interface Kpi {
  id: string
  label: string
  value: string
  numeric: number
  unit?: string
  delta: number // percentage point change
  trend: 'up' | 'down' | 'flat'
  goodDirection: 'up' | 'down'
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

// --- Phase 4: Network Intelligence Types ---
export type NetworkSectionStatus =
  | 'FREE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'MAINTENANCE_BLOCK'
  | 'CONFLICT'
  | 'CLOSED'
  | 'UNKNOWN'

export interface NetworkSectionOccupancy {
  isOccupied: boolean
  trainCount: number
  trains: string[]
}

export interface NetworkActiveBlockSummary {
  id: string
  corridorId?: string
  section?: string
  date?: string
  start: string
  end: string
  durationMin: number
  status: string
  blockType: string
  taskCount: number
  taskIds?: string[]
  confidence?: string
}

export interface NetworkTrain {
  id: string
  trainNumber: string
  trainName: string
  trainType: string
  priority: string
  origin: string
  destination: string
  corridorId: string
  section: string
  start: string
  end: string
  durationMin: number
  status: 'ON TIME' | 'DELAYED' | 'APPROACHING' | 'IN SECTION' | 'COMPLETED'
  delayMinutes: number
  forecast?: boolean
  forecastConfidence?: number | null
}

export interface NetworkSection {
  corridorId: string
  section: string
  from: string
  to: string
  status: NetworkSectionStatus
  occupancy: NetworkSectionOccupancy
  activeBlock: NetworkActiveBlockSummary | null
  trains: NetworkTrain[]
  tasksCount: number
  conflictsCount: number
  utilization: number
}

export interface NetworkCorridor {
  corridorId: string
  name: string
  route: string
  sections: NetworkSection[]
  utilization: number
  totalSections: number
}

export interface NetworkSummary {
  totalCorridors: number
  totalSections: number
  occupiedSections: number
  maintenanceBlocks: number
  activeConflicts: number
  trainsInNetwork: number
  utilizationPercent: number
}

export interface NetworkIntelligenceResponse {
  success: boolean
  mode: string
  generatedAt: string
  corridors: NetworkCorridor[]
  trains: NetworkTrain[]
  activeBlocks: NetworkActiveBlockSummary[]
  conflicts: Conflict[]
  summary: NetworkSummary
  metrics?: {
    formula: string
    operationalWindowMinutesPerSection: number
  }
}

// --- Phase 5: What-If Simulation Types ---
export interface TrainDelayAdjustment {
  trainNumber: string
  delayMinutes: number
}

export interface WhatIfScenario {
  scenarioId?: string
  scenarioName?: string
  baseBlockId?: string | null
  corridorId: string
  section?: string
  date: string
  start: string
  end: string
  durationMin?: number
  taskIds: string[]
  trainDelayAdjustments?: TrainDelayAdjustment[]
  blockType?: string
  mode?: 'SIMULATION'
}

export interface WhatIfImpact {
  taskCount: number
  durationMin: number
  totalTaskWorkMin: number
  availableWorkingMin: number
  safetyBufferStatus: 'PASS' | 'FAIL'
  criticalConflicts: number
  warningConflicts: number
  affectedTrains: number
  affectedTrainNumbers: string[]
  simulatedDelayMinutes: number
  utilizationPercent: number
  operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface WhatIfSimulationResult {
  success: boolean
  mode: string
  generatedAt: string
  scenario: WhatIfScenario
  conflicts: {
    hasConflict: boolean
    hasBlockingConflict: boolean
    conflicts: Conflict[]
  }
  impact: WhatIfImpact
}

export interface WhatIfComparisonResponse {
  success: boolean
  mode: string
  generatedAt: string
  baseline: WhatIfSimulationResult
  scenarios: WhatIfSimulationResult[]
}

// ==========================================
// Phase 6: Multi-Corridor Network Coordination Types
// ==========================================

export interface NetworkConnection {
  corridorId: string
  name: string
  interchangeJunction: string
  sharedBorderSection: string
  transitTimeMin: number
}

export interface NetworkCorridorNode {
  corridorId: string
  name: string
  route: string
  sections: string[]
  interchangeJunctions: string[]
  connectedCorridors: string[]
  connections: NetworkConnection[]
}

export interface NetworkAffectedCorridor {
  corridorId: string
  name: string
  interchangeJunction: string
  sharedBorderSection: string
  transitTimeMin: number
}

export interface NetworkAffectedTrain {
  trainNo: string
  trainNumber: string
  trainName: string
  trainType: string
  primaryCorridor: string
  primarySection: string
  connectedCorridor: string | null
  connectingSection: string | null
  scheduledSlot: string
  overlapMinutes: number
  propagatesAcrossNetwork: boolean
}

export interface NetworkCoordinationConflict {
  id: string
  type: 'Network' | 'Corridor' | 'Train'
  severity: 'Critical' | 'Warning'
  title: string
  description: string
  corridorId: string
  affectedCorridor?: string
  affectedSection?: string
  affectedTrains?: string[]
  interchange?: string
  time: string
  suggestedAction: string
}

export interface NetworkResourceConflict {
  id: string
  type: 'Resource'
  severity: 'Critical' | 'Warning'
  title: string
  description: string
  crew?: string
  task?: string
  corridorA?: string
  corridorB?: string
  time: string
  suggestedAction: string
}

export interface NetworkDependencyConflict {
  id: string
  type: 'Dependency'
  severity: 'Critical' | 'Warning'
  title: string
  description: string
  taskId: string
  dependencyId: string
  suggestedAction: string
}

export interface NetworkCoordinationImpact {
  criticalConflicts: number
  warningConflicts: number
  totalConflicts: number
  affectedTrainCount: number
  simulatedDelayMinutes: number
  baselineUtilization: number
  scenarioUtilization: number
  utilizationDelta: number
  safetyBufferStatus: 'PASS' | 'FAIL'
  durationMin: number
  affectedCorridorCount: number
  affectedSectionCount: number
}

export interface NetworkCoordinationScenario {
  scenarioId?: string
  scenarioName?: string
  corridorId: string
  section?: string
  date: string
  start: string
  end: string
  taskIds?: string[]
  blockType?: string
}

export interface NetworkCoordinationResult {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  primaryCorridor: {
    corridorId: string
    name: string
    route: string
    section: string
    date: string
    start: string
    end: string
    durationMin: number
    taskCount: number
  }
  connectedCorridors: NetworkAffectedCorridor[]
  affectedCorridors: NetworkAffectedCorridor[]
  affectedSections: string[]
  affectedTrains: NetworkAffectedTrain[]
  conflicts: NetworkCoordinationConflict[]
  resources: NetworkResourceConflict[]
  dependencies: NetworkDependencyConflict[]
  allConflicts: (NetworkCoordinationConflict | NetworkResourceConflict | NetworkDependencyConflict)[]
  safetyBufferStatus: 'PASS' | 'FAIL'
  operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  impact: NetworkCoordinationImpact
}

export interface NetworkCoordinationComparison {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  scenarios: NetworkCoordinationResult[]
  comparisons: NetworkCoordinationResult[]
}

// ==========================================
// Phase 7: Real-Time Operational Feedback & Disruption Rescheduling Types
// ==========================================

export type IncidentType =
  | 'OHE_FAILURE'
  | 'TRACK_FAILURE'
  | 'SIGNAL_FAILURE'
  | 'TRACK_OBSTRUCTION'
  | 'EQUIPMENT_FAILURE'
  | 'EMERGENCY_MAINTENANCE'

export type IncidentSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'SIMULATED'

export interface OperationalIncident {
  incidentId: string
  type: IncidentType
  severity: IncidentSeverity
  title: string
  corridorId: string
  sectionId: string
  date: string
  start: string
  end: string
  estimatedDuration: number
  description: string
  affectedTrainIds?: string[]
  status: IncidentStatus
  reportedBy?: string
  loggedAt?: string
  resolvedAt?: string
}

export interface DisruptionAffectedTrain {
  trainNo: string
  trainNumber: string
  trainName: string
  trainType: string
  origin: string
  destination: string
  primaryCorridor: string
  primarySection: string
  scheduledSlot: string
  overlapMinutes: number
  propagatesAcrossNetwork: boolean
  downstreamCorridor?: string | null
  downstreamSection?: string | null
  downstreamSlot?: string | null
  downstreamSimulatedDelay?: number
}

export interface DisruptionImpactedBlock {
  blockId: string
  corridorId: string
  section: string
  date: string
  start: string
  end: string
  status: string
  impactStatus: string
  taskIds: string[]
  reason: string
}

export interface DisruptionImpactedTask {
  taskId: string
  department: string
  taskType: string
  criticality: string
  priority: number
  crew: string
  estimatedDuration: number
  dependencies: string[]
  impactStatus: string
}

export interface TrackCrossoverStatus {
  section: string
  corridorId: string
  trackAccess: 'AVAILABLE' | 'RESERVED' | 'BLOCKED' | 'UNDER_MAINTENANCE'
  crossoverState: 'AVAILABLE' | 'RESERVED' | 'BLOCKED' | 'CAUTION'
  speedRestrictionKmph: number
  interlockingStatus: string
  adjacentSectionStatus: {
    corridorId: string
    section: string
    trackAccess: string
    crossoverState: string
  }[]
}

export interface DisruptionImpact {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  incidentDetails: OperationalIncident
  connectedCorridors: {
    corridorId: string
    name: string
    interchangeStation: string
    sharedBorderSection: string
    connectingSection: string
  }[]
  affectedSections: string[]
  affectedTrains: DisruptionAffectedTrain[]
  impactedBlocks: DisruptionImpactedBlock[]
  impactedTasks: DisruptionImpactedTask[]
  resourceConflicts: any[]
  dependencyConflicts: any[]
  trackCrossoverStatus: TrackCrossoverStatus
  impact: {
    affectedCorridorCount: number
    affectedSectionCount: number
    affectedTrainCount: number
    impactedBlockCount: number
    impactedTaskCount: number
    totalSimulatedDelayMinutes: number
    criticalConflicts: number
    warningConflicts: number
    baselineUtilization: number
    incidentUtilization: number
    utilizationDelta: number
    operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
}

export interface ReschedulingOption {
  scenarioId: string
  label: string
  corridorId: string
  sectionId: string
  date: string
  start: string
  end: string
  window: string
  durationMin: number
  totalTaskWorkMin: number
  availableWorkingMin: number
  overlapsIncident: boolean
  affectedTrainCount: number
  affectedTrains: any[]
  simulatedDelayMinutes: number
  criticalConflictCount: number
  warningConflictCount: number
  resourceConflictCount: number
  dependencyConflictCount: number
  safetyBufferStatus: 'PASS' | 'FAIL'
  baselineUtilization: number
  scenarioUtilization: number
  networkUtilizationDelta: number
  operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface ReschedulingSimulationResult {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  incidentReference: {
    corridorId: string
    sectionId: string
    date: string
    incidentStart: string
    incidentEnd: string
    estimatedDuration: number
  }
  reschedulingOptions: ReschedulingOption[]
}

export interface ReschedulingComparison {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  comparisons: ReschedulingOption[]
  scenarios: ReschedulingOption[]
}

export interface OperationalRequisitionReport {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  reportMetadata: {
    reportId: string
    projectName: string
    documentTitle: string
    division: string
    disclaimer: string
    controllerSignOffRequired: boolean
  }
  incidentSummary: OperationalIncident & { timeWindow: string; durationMin: number }
  networkImpactSummary: {
    primaryCorridor: string
    connectedCorridors: any[]
    affectedSections: string[]
    affectedTrainCount: number
    affectedTrains: DisruptionAffectedTrain[]
    impactedBlocks: DisruptionImpactedBlock[]
    impactedTasks: DisruptionImpactedTask[]
    trackCrossoverStatus: TrackCrossoverStatus
    totalSimulatedDelayMinutes: number
    networkUtilizationDelta: number
    operationalImpact: string
  }
  reschedulingAlternatives: ReschedulingOption[]
  decisionSignOff: {
    controllerAction: string
    selectedOptionId: string | null
    controllerNotes: string
    verifiedSafetyBuffer: string
    authorizedBy: string | null
    authorizationTimestamp: string | null
  }
}

// ==========================================
// Phase 8: RBAC, Audit Trail & Analytics
// ==========================================

export type UserRole = 'ADMIN' | 'CONTROLLER' | 'PLANNER' | 'MAINTENANCE_OFFICER' | 'VIEWER'

export interface UserAccount {
  userId: string
  name: string
  email: string
  role: UserRole
  department: string
  employeeCode: string
  active: boolean
  lastLogin?: string
  createdAt?: string
}

export interface AuditLogEntry {
  auditId: string
  userId: string
  userName: string
  role: string
  action: string
  entityType: 'Task' | 'RecommendedBlock' | 'Conflict' | 'Disruption' | 'User' | 'Report' | 'Auth'
  entityId: string
  timestamp: string
  previousState?: any
  newState?: any
  reason?: string
  ipAddress?: string
  metadata?: Record<string, any>
}

export interface AuditLogsResponse {
  success: boolean
  logs: AuditLogEntry[]
  total: number
  limit: number
  skip: number
}

export interface OperationalAnalyticsResponse {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  summary: {
    totalTasks: number
    openTasks: number
    scheduledTasks: number
    completedTasks: number
    taskCompletionRate: number
    taskSchedulingRate: number
    totalBlocks: number
    approvedBlocks: number
    pendingReviewBlocks: number
    rejectedBlocks: number
    activeConflicts: number
    activeDisruptions: number
    totalSimulatedDelayMin: number
    averageSimulatedDelay: number
    affectedTrainsCount: number
    networkUtilization: number
    totalDowntimeSavedMin: number
    totalApprovedMaintenanceHours: string
  }
  tasks: {
    statusDistribution: { Open: number; Scheduled: number; Completed: number }
    departmentDistribution: { Engineering: number; 'S&T': number; Traction: number }
    totalOverdueDays: number
  }
  blocks: {
    statusDistribution: Record<string, number>
    corridorDistribution: Record<string, number>
  }
  conflicts: {
    severityDistribution: Record<string, number>
    corridorDistribution: Record<string, number>
    unresolvedCount: number
  }
  disruptions: {
    activeCount: number
    incidents: {
      id: string
      type: string
      corridorId: string
      section: string
      severity: string
      delayMinutes: number
    }[]
  }
  governanceDisclaimer: string
}

export interface ManagementReportResponse {
  success: boolean
  report: {
    reportId: string
    generatedAt: string
    generatedBy: {
      userId: string
      name: string
      role: string
    }
    type: string
    disclaimer: string
    data: any
  }
}

// ==========================================
// Phase 9: Constraint-Based Network Optimization
// ==========================================

export interface OptimizationCandidate {
  candidateId: string
  status: 'FEASIBLE' | 'INFEASIBLE'
  corridorId: string
  section: string
  date: string
  start: string
  end: string
  window: string
  durationMin: number
  source: string
  label: string
  taskIds: string[]
  taskCount: number
  totalTaskWorkMin: number
  availableWorkingMin: number
  safetyBufferMin: number
  safetyBufferStatus: 'PASS' | 'FAIL'
  idleTimeMin: number
  maintenanceCoverage: number
  affectedTrainCount: number
  affectedTrains: any[]
  simulatedDelayMinutes: number
  criticalConflictCount: number
  warningConflictCount: number
  criticalConflicts: string[]
  warningConflicts: string[]
  networkUtilizationDelta: number
  connectedCorridorsImpacted: number
  resourceFragmentation: number
  infeasibleReasons: string[]
  failureDetails: {
    constraint: string
    code: string
    message: string
  }[]
  operationalImpact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface OptimizationResult {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  optimizationId?: string
  planningParameters: {
    date: string
    corridorIds: string[]
    taskIds: string[]
    planningHorizon: { start?: string; end?: string }
    availableWindowsCount: number
  }
  summary: {
    totalCandidatesGenerated: number
    feasibleCount: number
    infeasibleCount: number
    totalTasksRequested: number
    eligibleTasksFound: number
    bundlesFormed: number
  }
  feasibleCandidates: OptimizationCandidate[]
  infeasibleCandidates: OptimizationCandidate[]
  allCandidates: OptimizationCandidate[]
  governanceDisclaimer: string
}

export interface OptimizationComparison {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  candidateCount: number
  comparisons: (OptimizationCandidate & {
    tasksCoveredCount: number
    operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  })[]
  factualSummary: {
    delayRangeMinutes: string
    durationRangeMinutes: string
    feasibleCandidatesCount: number
    infeasibleCandidatesCount: number
  }
  governanceDisclaimer: string
}

export interface OptimizationApplyResponse {
  success: boolean
  mode: 'SIMULATION'
  message: string
  requiresApproval: boolean
  block: RecommendedBlock
}

// ==========================================
// PHASE 10: INTEGRATED RAILWAY OPERATIONS COMMAND CENTER
// ==========================================

export interface CommandCenterHealth {
  backend: 'OPERATIONAL' | 'DEGRADED' | 'DOWN'
  database: 'CONNECTED' | 'UNAVAILABLE' | 'DEGRADED'
  authentication: 'ACTIVE' | 'INACTIVE'
  timetableModel: 'SIMULATION DATA' | 'UNAVAILABLE'
  networkModel: 'AVAILABLE' | 'UNAVAILABLE'
  simulationMode: 'DECISION-SUPPORT ONLY'
}

export interface CommandCenterSummary {
  openTasks: number
  proposedBlocks: number
  approvedBlocks: number
  activeConflicts: number
  criticalConflicts: number
  activeDisruptions: number
  affectedTrains: number
  pendingApprovals: number
  networkUtilization: number
  feasibleOptimizationCandidates: number
}

export interface CommandCenterAlert {
  id: string
  type:
    | 'CRITICAL_CONFLICT'
    | 'WARNING_CONFLICT'
    | 'ACTIVE_DISRUPTION'
    | 'PENDING_APPROVAL'
    | 'CRITICAL_TASK'
    | 'RESOURCE_CONFLICT'
    | 'NETWORK_CONFLICT'
    | 'RESCHEDULING_REQUIRED'
    | 'OPTIMIZATION_REVIEW'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  corridor: string
  section: string
  time: string
  description: string
  sourceModule: string
  route: string
  actionLabel: string
  whyThisAlertExists: string
}

export interface CommandCenterNetworkSchematicNode {
  id: string
  label: string
  type: string
  corridor: string
}

export interface CommandCenterNetworkSchematicEdge {
  from: string
  to: string
  corridor: string
  section: string
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE_BLOCK' | 'CONFLICT' | 'CLOSED' | 'UNKNOWN'
}

export interface CommandCenterNetwork {
  corridors: NetworkCorridor[]
  schematic: {
    nodes: CommandCenterNetworkSchematicNode[]
    edges: CommandCenterNetworkSchematicEdge[]
  }
  utilizationPercent: number
  totalCorridors: number
  totalSections: number
}

export interface CommandCenterTrainImpact {
  trainNumber: string
  trainName: string
  corridor: string
  section: string
  scheduledMovement: string
  simulatedDelayMinutes: number
  cause: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
}

export interface CommandCenterBlockSummary {
  proposed: RecommendedBlock[]
  approved: RecommendedBlock[]
  rejected: RecommendedBlock[]
  total: number
}

export interface CommandCenterDisruption {
  incidentId: string
  type: string
  title: string
  severity: string
  corridorId: string
  sectionId?: string
  start: string
  end: string
  affectedTrainCount: number
  affectedTrains: string[]
  status: string
  reschedulingStatus: string
}

export interface CommandCenterApproval {
  blockId: string
  corridorId: string
  section: string
  window: string
  date: string
  durationMin: number
  status: string
  taskCount: number
  taskIds: string[]
  conflictStatus: 'CLEAR' | 'POTENTIAL_CONFLICT'
  createdBy: string
  requiresControllerSanction: boolean
}

export interface CommandCenterOptimization {
  lastRunId: string
  corridors: string[]
  evaluatedWindowsCount: number
  feasibleCount: number
  infeasibleCount: number
  generatedAt: string
  mode: 'SIMULATION'
  governanceNotice: string
}

export interface CommandCenterActivity {
  auditId: string
  timestamp: string
  userName: string
  role: string
  action: string
  entityType: string
  entityId: string
  reason: string
}

export interface CommandCenterDecisionTraceStep {
  stepNumber: number
  name: string
  status:
    | 'COMPLETED'
    | 'PASSED'
    | 'WARNING'
    | 'ACTIVE'
    | 'APPROVED'
    | 'REJECTED'
    | 'PENDING_SANCTION'
    | 'AWAITING_RESOLUTION'
    | 'UNDER_INVESTIGATION'
  summary: string
  details?: string[]
}

export interface CommandCenterDecisionTrace {
  entityId: string
  entityType: string
  title: string
  steps: CommandCenterDecisionTraceStep[]
}

export interface CommandCenterOverview {
  success: boolean
  mode: 'SIMULATION'
  generatedAt: string
  disclaimer: string
  systemHealth: CommandCenterHealth
  summary: CommandCenterSummary
  alerts: CommandCenterAlert[]
  network: CommandCenterNetwork
  trains: CommandCenterTrainImpact[]
  blocks: CommandCenterBlockSummary
  disruptions: CommandCenterDisruption[]
  approvals: CommandCenterApproval[]
  optimization: CommandCenterOptimization
  recentActivity: CommandCenterActivity[]
  decisionTrace: CommandCenterDecisionTrace | null
  activeFilters: {
    corridorId: string | null
    date: string | null
    department: string | null
    severity: string | null
    search: string | null
    traceId: string | null
  }
}

// ==========================================
// PHASE 11: OPERATIONAL ALERT INTELLIGENCE & ACTION CENTER
// ==========================================

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'

export type AlertType =
  | 'CRITICAL_CONFLICT'
  | 'NETWORK_CONFLICT'
  | 'ACTIVE_DISRUPTION'
  | 'TRAIN_IMPACT'
  | 'PENDING_APPROVAL'
  | 'RESOURCE_DOUBLE_BOOKED'
  | 'DEPENDENCY_VIOLATION'
  | 'SAFETY_BUFFER_FAILURE'
  | 'RESCHEDULING_REQUIRED'
  | 'OPTIMIZATION_REVIEW'
  | 'HIGH_NETWORK_UTILIZATION'
  | 'UNRESOLVED_OPERATIONAL_CONFLICT'
  | 'SYSTEM_HEALTH_WARNING'

export interface AlertEvidence {
  conflictType?: string
  time?: string
  corridorId?: string
  section?: string
  affectedTrains?: string[]
  affectedTasks?: string[]
  isBlocking?: boolean
  incidentType?: string
  timeWindow?: string
  estimatedDurationMinutes?: number
  cautionOrderSpeed?: string
  blockId?: string
  date?: string
  durationMinutes?: number
  bundledTasksCount?: number
  createdBy?: string
  trainNo?: string
  name?: string
  trainType?: string
  scheduledArrival?: string
  scheduledDeparture?: string
  simulatedDelayMinutes?: number
  cause?: string
  taskId?: string
  department?: string
  taskType?: string
  overdueDays?: number
  defectSeverity?: number
  location?: string
  utilizationPercent?: number
  threshold?: number
  totalSections?: number
  occupiedSections?: number
  databaseStatus?: string
  backendStatus?: string
  [key: string]: any
}

export interface AlertSimulatedImpact {
  delayMinutes: number
  affectedTrainsCount: number
  operationalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  networkUtilizationImpactPct: number
  details: string
}

export interface AlertAction {
  label: string
  route: string
  action: 'NAVIGATE' | 'SANCTION'
  variant?: 'default' | 'outline' | 'secondary' | 'destructive'
  requiresPermission?: string
}

export interface OperationalAlert {
  alertId: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  summary: string
  explanation: string
  whyThisAlertExists: string
  corridorId: string
  section: string
  sourceModule: string
  recommendedModule: string
  route: string
  relatedTaskIds: string[]
  relatedBlockIds: string[]
  relatedConflictIds: string[]
  relatedTrainNumbers: string[]
  relatedDisruptionIds: string[]
  relatedOptimizationIds: string[]
  evidence: AlertEvidence
  simulatedImpact: AlertSimulatedImpact
  availableActions: AlertAction[]
  decisionTraceReference: string
  createdAt: string
  updatedAt: string
  acknowledgedAt?: string | null
  acknowledgedBy?: string | null
  reviewedAt?: string | null
  reviewedBy?: string | null
  reviewNotes?: string
  resolvedAt?: string | null
  resolvedBy?: string | null
  resolutionNotes?: string
  dismissedAt?: string | null
  dismissedBy?: string | null
  dismissalReason?: string
}

export interface AlertSummary {
  total: number
  critical: number
  warning: number
  info: number
  open: number
  acknowledged: number
  inReview: number
  resolved: number
  dismissed: number
  affectedCorridors: string[]
  affectedSections: string[]
  affectedTrains: string[]
  pendingHumanActions: number
}

export interface AlertSummaryResponse {
  success: boolean
  disclaimer: string
  summary: AlertSummary
  timestamp: string
}

export interface AlertsResponse {
  success: boolean
  disclaimer: string
  alerts: OperationalAlert[]
  total: number
  count: number
  limit: number
  skip: number
}

export interface AlertEvaluationResult {
  success: boolean
  mode: 'SIMULATION'
  disclaimer: string
  evaluatedCount: number
  activeAlertsCount: number
  timestamp: string
}

export interface AlertDecisionTraceStep {
  stepNumber: number
  name: string
  status: string
  summary: string
  details?: string[]
}

export interface AlertDecisionTrace {
  entityId: string
  entityType: string
  title: string
  steps: AlertDecisionTraceStep[]
}






