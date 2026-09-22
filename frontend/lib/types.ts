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
