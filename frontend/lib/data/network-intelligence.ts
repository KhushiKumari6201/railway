export type NetworkLayer =
  | 'asset-health'
  | 'maintenance-demand'
  | 'block-capacity'
  | 'train-density'
  | 'conflicts'

export interface StationNode {
  code: string
  name: string
  km: number
  x: number // percentage 0-100 on SVG coordinate plane
  y: number
  majorJunction: boolean
}

export interface SectionEdge {
  id: string
  name: string
  fromCode: string
  toCode: string
  tracks: number
  // Layer states
  assetHealth: 'Healthy' | 'Warning' | 'Critical'
  maintenanceDemand: 'Low' | 'Medium' | 'High'
  blockCapacity: 'Available' | 'Partially Used' | 'Fully Allocated'
  trainDensity: 'Low' | 'Moderate' | 'High'
  hasConflict: boolean
  conflictId?: string
  conflictSummary?: string
  hasRisk: boolean
  riskInfo?: {
    assetId: string
    assetType: string
    criticality: 'High' | 'Critical'
    overdueDays: number
    action: string
  }
  hasActiveBlock: boolean
  activeBlockId?: string
  activeBlockWindow?: string
}

export interface CorridorNetworkDetail {
  id: string
  name: string
  alias: string
  trackDescription: string
  totalKm: number
  stations: StationNode[]
  sections: SectionEdge[]
  kpis: {
    assetAvailability: number
    blockUtilization: number
    criticalTasks: number
    overdueTasks: number
    activeBlocks: number
    availableHours: number
    plannedHours: number
    sectionsCount: number
  }
  operationalStatus: {
    trainConflictState: 'Clear' | 'Warning' | 'Conflict'
    conflictNote: string
    scheduledBlocksNote: string
    unscheduledTasksNote: string
  }
  miniTimeline: {
    start: string
    end: string
    label: string
    kind: 'train' | 'available' | 'block' | 'maintenance'
    meta?: string
  }[]
}

export interface LiveTrain {
  id: string
  number: string
  name: string
  type: 'Superfast' | 'Express' | 'Freight' | 'Maintenance'
  corridorId: string
  fromStation: string
  toStation: string
  direction: 'UP' | 'DN'
  speedKmh: number
  maxSpeedKmh: number
  priority: 'P1' | 'P2' | 'P3'
  currentSection: string
  progress: number // 0.0 to 1.0 along the corridor stations
  scheduledDeparture: string
  estimatedArrival: string
  status: 'On-Time' | 'Caution' | 'Approaching Block'
  statusNote: string
  crewDivision: string
  rakeLengthMeters: number
  wagonsOrCoaches: number
  traction: string
}

export interface StationSignal {
  stationCode: string
  name: string
  aspect: 'green' | 'double-yellow' | 'yellow' | 'red'
  route: string
  interlocking: string
  trackOccupancy: string
}

export interface DispatchCommsLog {
  id: string
  timestamp: string
  speaker: string
  role: string
  stationOrSection: string
  text: string
  type: 'clearance' | 'advisory' | 'alert' | 'block-permit'
}

export interface NetworkTopKpis {
  assetAvailability: number
  blockUtilization: number
  criticalTasks: number
  overdueTasks: number
  activeConflicts: number
  totalAvailableHours: number
  totalPlannedHours: number
  downtimeSavedMin: number
}

export interface MaintenancePressureRow {
  corridorId: string
  name: string
  critical: number
  high: number
  medium: number
  low: number
  totalTasks: number
  pressureLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  score: number // 0-100
}

export interface BlockCapacityRow {
  corridorId: string
  name: string
  availableHours: number
  plannedHours: number
  unusedHours: number
  utilizationPct: number
  status: 'Optimal' | 'Underutilized' | 'Constrained'
}

export interface TrainDensityPoint {
  time: string
  passenger: number
  goods: number
  other: number
  total: number
  isOptimalWindow?: boolean
  label?: string
}

export interface AINetworkInsight {
  id: string
  badge: string
  badgeTone: 'primary' | 'warning' | 'danger' | 'success'
  title: string
  corridorId: string
  description: string
  metric: string
  impact: string
  actionLabel: string
  actionHref: string
}

// Global KPIs
export const networkTopKpis: NetworkTopKpis = {
  assetAvailability: 96.8,
  blockUtilization: 88.2,
  criticalTasks: 12,
  overdueTasks: 37,
  activeConflicts: 8,
  totalAvailableHours: 94.5,
  totalPlannedHours: 83.4,
  downtimeSavedMin: 375,
}

// Corridors Detailed Topology
export const networkCorridors: Record<string, CorridorNetworkDetail> = {
  C01: {
    id: 'C01',
    name: 'Howrah – Kharagpur Main Line',
    alias: 'Eastern Trunk Corridor',
    trackDescription: 'Quadruple Track (2 Up / 2 Down) · 25kV AC Traction',
    totalKm: 115,
    stations: [
      { code: 'HWH', name: 'Howrah Junction', km: 0, x: 8, y: 22, majorJunction: true },
      { code: 'SRC', name: 'Santragachi', km: 7, x: 26, y: 22, majorJunction: true },
      { code: 'BZN', name: 'Bagnan', km: 45, x: 48, y: 22, majorJunction: false },
      { code: 'PKU', name: 'Panskura', km: 71, x: 70, y: 22, majorJunction: true },
      { code: 'KGP', name: 'Kharagpur Junction', km: 115, x: 92, y: 22, majorJunction: true },
    ],
    sections: [
      {
        id: 'C01-S1',
        name: 'HWH–SRC',
        fromCode: 'HWH',
        toCode: 'SRC',
        tracks: 4,
        assetHealth: 'Warning',
        maintenanceDemand: 'High',
        blockCapacity: 'Partially Used',
        trainDensity: 'High',
        hasConflict: true,
        conflictId: 'CF-01',
        conflictSummary: 'Block-01 overlaps 12841 Coromandel path',
        hasRisk: true,
        riskInfo: {
          assetId: 'TRK-HWH-09',
          assetType: 'Point Machine #44B',
          criticality: 'Critical',
          overdueDays: 14,
          action: 'Schedule 60m power & traffic block',
        },
        hasActiveBlock: true,
        activeBlockId: 'REC-101',
        activeBlockWindow: '11:30–13:15',
      },
      {
        id: 'C01-S2',
        name: 'SRC–BZN',
        fromCode: 'SRC',
        toCode: 'BZN',
        tracks: 4,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Medium',
        blockCapacity: 'Available',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C01-S3',
        name: 'BZN–PKU',
        fromCode: 'BZN',
        toCode: 'PKU',
        tracks: 4,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Medium',
        blockCapacity: 'Partially Used',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C01-S4',
        name: 'PKU–KGP',
        fromCode: 'PKU',
        toCode: 'KGP',
        tracks: 4,
        assetHealth: 'Warning',
        maintenanceDemand: 'High',
        blockCapacity: 'Fully Allocated',
        trainDensity: 'High',
        hasConflict: false,
        hasRisk: true,
        riskInfo: {
          assetId: 'SIG-PKU-12',
          assetType: 'Axle Counter Head',
          criticality: 'High',
          overdueDays: 8,
          action: 'Calibrate during next available window',
        },
        hasActiveBlock: true,
        activeBlockId: 'REC-103',
        activeBlockWindow: '13:00–14:30',
      },
    ],
    kpis: {
      assetAvailability: 97.2,
      blockUtilization: 87.5,
      criticalTasks: 3,
      overdueTasks: 7,
      activeBlocks: 2,
      availableHours: 18.5,
      plannedHours: 16.2,
      sectionsCount: 4,
    },
    operationalStatus: {
      trainConflictState: 'Warning',
      conflictNote: '1 operational conflict with passenger timetable on HWH–SRC (resolvable by 15m shift)',
      scheduledBlocksNote: '2 coordinated blocks scheduled (105m & 90m)',
      unscheduledTasksNote: '1 high-priority task unscheduled due to peak EMU hours',
    },
    miniTimeline: [
      { start: '11:00', end: '11:30', label: '12841 Coromandel Exp', kind: 'train', meta: 'Passenger Trunk' },
      { start: '11:30', end: '13:15', label: 'AI Block REC-101 (ENG + S&T)', kind: 'block', meta: '87.5% Utilized · 105m' },
      { start: '11:35', end: '12:35', label: 'Track Tamping (ENG-104)', kind: 'maintenance', meta: 'Engineering 60m' },
      { start: '12:30', end: '13:15', label: 'Signal Overhaul (SNT-087)', kind: 'maintenance', meta: 'S&T 45m' },
      { start: '13:15', end: '13:45', label: '18045 East Coast Exp', kind: 'train', meta: 'Express Movement' },
      { start: '13:45', end: '14:30', label: 'Available Block Window', kind: 'available', meta: '45m Gap' },
    ],
  },
  C02: {
    id: 'C02',
    name: 'Kharagpur – Bhadrak Section',
    alias: 'Southern Coastal Trunk',
    trackDescription: 'Double Track · Automatic Signalling · 25kV AC Traction',
    totalKm: 178,
    stations: [
      { code: 'KGP', name: 'Kharagpur Junction', km: 0, x: 92, y: 22, majorJunction: true },
      { code: 'BLDA', name: 'Belda', km: 45, x: 80, y: 44, majorJunction: false },
      { code: 'JER', name: 'Jaleswar', km: 68, x: 68, y: 56, majorJunction: false },
      { code: 'BLS', name: 'Balasore', km: 116, x: 50, y: 68, majorJunction: true },
      { code: 'BHC', name: 'Bhadrak', km: 178, x: 30, y: 78, majorJunction: true },
    ],
    sections: [
      {
        id: 'C02-S1',
        name: 'KGP–BLDA',
        fromCode: 'KGP',
        toCode: 'BLDA',
        tracks: 2,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Medium',
        blockCapacity: 'Available',
        trainDensity: 'High',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C02-S2',
        name: 'BLDA–JER',
        fromCode: 'BLDA',
        toCode: 'JER',
        tracks: 2,
        assetHealth: 'Warning',
        maintenanceDemand: 'Medium',
        blockCapacity: 'Partially Used',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C02-S3',
        name: 'JER–BLS',
        fromCode: 'JER',
        toCode: 'BLS',
        tracks: 2,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Low',
        blockCapacity: 'Available',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C02-S4',
        name: 'BLS–BHC',
        fromCode: 'BLS',
        toCode: 'BHC',
        tracks: 2,
        assetHealth: 'Critical',
        maintenanceDemand: 'High',
        blockCapacity: 'Fully Allocated',
        trainDensity: 'High',
        hasConflict: true,
        conflictId: 'CF-02',
        conflictSummary: 'Track circuit defect pending 180m corridor block',
        hasRisk: true,
        riskInfo: {
          assetId: 'TRK-BLS-44',
          assetType: 'Rail Flange Sensor',
          criticality: 'Critical',
          overdueDays: 19,
          action: 'Integrated corridor block required',
        },
        hasActiveBlock: true,
        activeBlockId: 'REC-102',
        activeBlockWindow: '12:00–15:00',
      },
    ],
    kpis: {
      assetAvailability: 95.8,
      blockUtilization: 92.4,
      criticalTasks: 4,
      overdueTasks: 9,
      activeBlocks: 1,
      availableHours: 19.0,
      plannedHours: 17.5,
      sectionsCount: 4,
    },
    operationalStatus: {
      trainConflictState: 'Conflict',
      conflictNote: 'Corridor block BLS–BHC conflicts with goods path GDS-5521 (priority rerouting possible)',
      scheduledBlocksNote: '1 major corridor block scheduled (180m)',
      unscheduledTasksNote: '2 overdue tasks requiring extended night disconnection',
    },
    miniTimeline: [
      { start: '11:00', end: '11:45', label: 'GDS-5521 Freight (BCN)', kind: 'train', meta: 'Goods Train' },
      { start: '12:00', end: '15:00', label: 'AI Corridor Block REC-102', kind: 'block', meta: '100% Utilized · 180m' },
      { start: '12:00', end: '14:30', label: 'Heavy Ballast Cleaning (ENG-221)', kind: 'maintenance', meta: 'Engineering 150m' },
      { start: '15:10', end: '15:35', label: '12703 Falaknuma Exp', kind: 'train', meta: 'Superfast' },
    ],
  },
  C03: {
    id: 'C03',
    name: 'Kharagpur – Tatanagar Line',
    alias: 'Mineral Freight Corridor',
    trackDescription: 'Double Track · Heavy Axle Load Mineral Route',
    totalKm: 134,
    stations: [
      { code: 'KGP', name: 'Kharagpur Junction', km: 0, x: 92, y: 22, majorJunction: true },
      { code: 'JGM', name: 'Jhargram', km: 39, x: 74, y: 12, majorJunction: false },
      { code: 'GTS', name: 'Ghatsila', km: 96, x: 52, y: 10, majorJunction: false },
      { code: 'TATA', name: 'Tatanagar Junction', km: 134, x: 30, y: 12, majorJunction: true },
    ],
    sections: [
      {
        id: 'C03-S1',
        name: 'KGP–JGM',
        fromCode: 'KGP',
        toCode: 'JGM',
        tracks: 2,
        assetHealth: 'Warning',
        maintenanceDemand: 'High',
        blockCapacity: 'Partially Used',
        trainDensity: 'High',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C03-S2',
        name: 'JGM–GTS',
        fromCode: 'JGM',
        toCode: 'GTS',
        tracks: 2,
        assetHealth: 'Critical',
        maintenanceDemand: 'High',
        blockCapacity: 'Fully Allocated',
        trainDensity: 'High',
        hasConflict: false,
        hasRisk: true,
        riskInfo: {
          assetId: 'BRG-JGM-02',
          assetType: 'Bridge Girder Bearing #12',
          criticality: 'Critical',
          overdueDays: 22,
          action: 'Execute 150m traffic block immediately',
        },
        hasActiveBlock: true,
        activeBlockId: 'REC-104',
        activeBlockWindow: '09:00–11:30',
      },
      {
        id: 'C03-S3',
        name: 'GTS–TATA',
        fromCode: 'GTS',
        toCode: 'TATA',
        tracks: 2,
        assetHealth: 'Warning',
        maintenanceDemand: 'High',
        blockCapacity: 'Partially Used',
        trainDensity: 'High',
        hasConflict: false,
        hasRisk: true,
        riskInfo: {
          assetId: 'OHE-GTS-08',
          assetType: 'Contact Wire Wear',
          criticality: 'High',
          overdueDays: 11,
          action: 'Tower wagon inspection required',
        },
        hasActiveBlock: false,
      },
    ],
    kpis: {
      assetAvailability: 94.6,
      blockUtilization: 93.3,
      criticalTasks: 5,
      overdueTasks: 12,
      activeBlocks: 1,
      availableHours: 16.0,
      plannedHours: 15.0,
      sectionsCount: 3,
    },
    operationalStatus: {
      trainConflictState: 'Clear',
      conflictNote: 'No timetable clash; however 9 iron-ore goods paths constrain daytime gaps',
      scheduledBlocksNote: '1 integrated bridge & track block scheduled (150m)',
      unscheduledTasksNote: '3 tasks unscheduled due to lack of 3+ hour continuous windows',
    },
    miniTimeline: [
      { start: '09:00', end: '11:30', label: 'AI Block REC-104 (Bridge Inspection)', kind: 'block', meta: '93.3% Utilized · 150m' },
      { start: '09:10', end: '11:15', label: 'Girder Bearing Overhaul (ENG-142)', kind: 'maintenance', meta: 'Engineering 125m' },
      { start: '11:30', end: '12:30', label: 'GDS-8820 Iron Ore Rake', kind: 'train', meta: 'Freight Movement' },
    ],
  },
  C04: {
    id: 'C04',
    name: 'Bhubaneswar – Khurda Road – Puri',
    alias: 'Pilgrim Passenger Corridor',
    trackDescription: 'Triple Track CTC–KUR · Double Track to Puri',
    totalKm: 91,
    stations: [
      { code: 'CTC', name: 'Cuttack', km: 0, x: 20, y: 72, majorJunction: true },
      { code: 'BBS', name: 'Bhubaneswar', km: 28, x: 22, y: 84, majorJunction: true },
      { code: 'KUR', name: 'Khurda Road Junction', km: 47, x: 38, y: 92, majorJunction: true },
      { code: 'PURI', name: 'Puri Terminus', km: 91, x: 62, y: 92, majorJunction: true },
    ],
    sections: [
      {
        id: 'C04-S1',
        name: 'CTC–BBS',
        fromCode: 'CTC',
        toCode: 'BBS',
        tracks: 3,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Low',
        blockCapacity: 'Available',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C04-S2',
        name: 'BBS–KUR',
        fromCode: 'BBS',
        toCode: 'KUR',
        tracks: 3,
        assetHealth: 'Critical',
        maintenanceDemand: 'High',
        blockCapacity: 'Fully Allocated',
        trainDensity: 'High',
        hasConflict: true,
        conflictId: 'CF-03',
        conflictSummary: 'OHE isolator replacement cannot find 90m window without delaying Express train',
        hasRisk: true,
        riskInfo: {
          assetId: 'SIG-118',
          assetType: 'Signalling Relay Rack',
          criticality: 'High',
          overdueDays: 14,
          action: 'Schedule within next available disconnection',
        },
        hasActiveBlock: true,
        activeBlockId: 'REC-105',
        activeBlockWindow: '14:00–15:00',
      },
      {
        id: 'C04-S3',
        name: 'KUR–PURI',
        fromCode: 'KUR',
        toCode: 'PURI',
        tracks: 2,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Low',
        blockCapacity: 'Available',
        trainDensity: 'Low',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
    ],
    kpis: {
      assetAvailability: 96.9,
      blockUtilization: 83.3,
      criticalTasks: 2,
      overdueTasks: 4,
      activeBlocks: 1,
      availableHours: 21.0,
      plannedHours: 17.5,
      sectionsCount: 3,
    },
    operationalStatus: {
      trainConflictState: 'Warning',
      conflictNote: 'High risk on SIG-118: no feasible block within next 48h without timetable adjustment',
      scheduledBlocksNote: '1 OHE maintenance block scheduled (60m)',
      unscheduledTasksNote: '1 critical signalling defect flagged as exception',
    },
    miniTimeline: [
      { start: '14:00', end: '15:00', label: 'AI Block REC-105 (OHE Power Block)', kind: 'block', meta: '83.3% Utilized · 60m' },
      { start: '14:05', end: '14:55', label: 'Catenary Wire Tensioning (TD-031)', kind: 'maintenance', meta: 'Traction 50m' },
      { start: '15:10', end: '15:40', label: '18409 Sri Jagannath Exp', kind: 'train', meta: 'Passenger Movement' },
    ],
  },
  C05: {
    id: 'C05',
    name: 'Santragachi – Uluberia Freight Bypass',
    alias: 'Suburban Freight Trunk',
    trackDescription: 'Double Track Freight Bypass · Automatic Block',
    totalKm: 25,
    stations: [
      { code: 'SRC', name: 'Santragachi', km: 0, x: 26, y: 22, majorJunction: true },
      { code: 'ADL', name: 'Andul', km: 5, x: 34, y: 34, majorJunction: false },
      { code: 'BVA', name: 'Bauria', km: 17, x: 44, y: 40, majorJunction: false },
      { code: 'ULB', name: 'Uluberia', km: 25, x: 56, y: 44, majorJunction: true },
    ],
    sections: [
      {
        id: 'C05-S1',
        name: 'SRC–ADL',
        fromCode: 'SRC',
        toCode: 'ADL',
        tracks: 2,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Low',
        blockCapacity: 'Available',
        trainDensity: 'Low',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C05-S2',
        name: 'ADL–BVA',
        fromCode: 'ADL',
        toCode: 'BVA',
        tracks: 2,
        assetHealth: 'Warning',
        maintenanceDemand: 'Medium',
        blockCapacity: 'Available',
        trainDensity: 'Moderate',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
      {
        id: 'C05-S3',
        name: 'BVA–ULB',
        fromCode: 'BVA',
        toCode: 'ULB',
        tracks: 2,
        assetHealth: 'Healthy',
        maintenanceDemand: 'Low',
        blockCapacity: 'Available',
        trainDensity: 'Low',
        hasConflict: false,
        hasRisk: false,
        hasActiveBlock: false,
      },
    ],
    kpis: {
      assetAvailability: 98.4,
      blockUtilization: 72.0,
      criticalTasks: 1,
      overdueTasks: 5,
      activeBlocks: 0,
      availableHours: 20.0,
      plannedHours: 14.4,
      sectionsCount: 3,
    },
    operationalStatus: {
      trainConflictState: 'Clear',
      conflictNote: 'Ample block capacity available; low passenger conflict risk',
      scheduledBlocksNote: '0 blocks scheduled today; capacity available for backlog clearance',
      unscheduledTasksNote: 'All routine tasks fit easily into night windows',
    },
    miniTimeline: [
      { start: '12:00', end: '14:30', label: 'Available Window (2.5h Unused)', kind: 'available', meta: 'High Opportunity for Bundling' },
      { start: '14:30', end: '15:10', label: 'GDS-6610 Freight (BTAP)', kind: 'train', meta: 'Freight Movement' },
    ],
  },
}

// Maintenance Pressure Dataset
export const maintenancePressureData: MaintenancePressureRow[] = [
  { corridorId: 'C01', name: 'Howrah – Kharagpur', critical: 3, high: 8, medium: 14, low: 22, totalTasks: 47, pressureLevel: 'High', score: 78 },
  { corridorId: 'C02', name: 'Kharagpur – Bhadrak', critical: 4, high: 7, medium: 12, low: 18, totalTasks: 41, pressureLevel: 'High', score: 82 },
  { corridorId: 'C03', name: 'Kharagpur – Tatanagar', critical: 5, high: 11, medium: 16, low: 14, totalTasks: 46, pressureLevel: 'Critical', score: 94 },
  { corridorId: 'C04', name: 'Bhubaneswar – Puri', critical: 2, high: 4, medium: 9, low: 15, totalTasks: 30, pressureLevel: 'Low', score: 48 },
  { corridorId: 'C05', name: 'Santragachi – Uluberia', critical: 1, high: 3, medium: 8, low: 12, totalTasks: 24, pressureLevel: 'Medium', score: 55 },
]

// Block Capacity Dataset
export const blockCapacityData: BlockCapacityRow[] = [
  { corridorId: 'C01', name: 'Howrah – Kharagpur', availableHours: 18.5, plannedHours: 16.2, unusedHours: 2.3, utilizationPct: 87.5, status: 'Optimal' },
  { corridorId: 'C02', name: 'Kharagpur – Bhadrak', availableHours: 19.0, plannedHours: 17.5, unusedHours: 1.5, utilizationPct: 92.1, status: 'Constrained' },
  { corridorId: 'C03', name: 'Kharagpur – Tatanagar', availableHours: 16.0, plannedHours: 15.0, unusedHours: 1.0, utilizationPct: 93.8, status: 'Constrained' },
  { corridorId: 'C04', name: 'Bhubaneswar – Puri', availableHours: 21.0, plannedHours: 17.5, unusedHours: 3.5, utilizationPct: 83.3, status: 'Optimal' },
  { corridorId: 'C05', name: 'Santragachi – Uluberia', availableHours: 20.0, plannedHours: 14.4, unusedHours: 5.6, utilizationPct: 72.0, status: 'Underutilized' },
]

// Hourly Train Movement Pressure (06:00 to 22:00)
export const trainDensityTimeline: TrainDensityPoint[] = [
  { time: '06:00', passenger: 14, goods: 4, other: 1, total: 19 },
  { time: '07:00', passenger: 18, goods: 3, other: 2, total: 23 },
  { time: '08:00', passenger: 24, goods: 2, other: 1, total: 27, label: 'Morning Peak' },
  { time: '09:00', passenger: 22, goods: 4, other: 2, total: 28 },
  { time: '10:00', passenger: 16, goods: 6, other: 2, total: 24 },
  { time: '11:00', passenger: 9, goods: 4, other: 1, total: 14 },
  { time: '12:00', passenger: 6, goods: 3, other: 1, total: 10, isOptimalWindow: true, label: 'Optimal Window' },
  { time: '13:00', passenger: 5, goods: 4, other: 1, total: 10, isOptimalWindow: true },
  { time: '14:00', passenger: 10, goods: 7, other: 2, total: 19 },
  { time: '15:00', passenger: 14, goods: 8, other: 1, total: 23 },
  { time: '16:00', passenger: 19, goods: 6, other: 2, total: 27 },
  { time: '17:00', passenger: 25, goods: 3, other: 1, total: 29, label: 'Evening Peak' },
  { time: '18:00', passenger: 26, goods: 2, other: 1, total: 29 },
  { time: '19:00', passenger: 21, goods: 4, other: 2, total: 27 },
  { time: '20:00', passenger: 15, goods: 7, other: 2, total: 24 },
  { time: '21:00', passenger: 10, goods: 9, other: 2, total: 21 },
]

// Actionable Operational AI Insights
export const aiNetworkInsights: AINetworkInsight[] = [
  {
    id: 'AI-01',
    badge: 'HIGH MAINTENANCE PRESSURE',
    badgeTone: 'danger',
    title: 'C03 Tatanagar Line requires priority block allocation',
    corridorId: 'C03',
    description:
      'C03 has the highest maintenance pressure this week with 9 critical/overdue tasks and only 4 available windows. Mineral freight density is squeezing daylight maintenance time.',
    metric: '9 Critical/Overdue Tasks · 93.8% Capacity Used',
    impact: 'Prevents speed restrictions on heavy iron ore transit',
    actionLabel: 'Review C03 Corridor',
    actionHref: '/planner?corridor=C03',
  },
  {
    id: 'AI-02',
    badge: 'BUNDLING OPPORTUNITY',
    badgeTone: 'primary',
    title: 'C01 has 2.3 hours of compatible unused block window',
    corridorId: 'C01',
    description:
      'Available window between 13:45 and 16:00 on Santragachi–Panskura has zero timetable conflicts. Compatible for bundling Engineering turnout renewal with S&T axle-counter calibration.',
    metric: '+2.3h Unused Window · 2 Departments Compatible',
    impact: 'Saves an estimated 45 minutes avoidable secondary downtime',
    actionLabel: 'Bundle Work in Planner',
    actionHref: '/planner?corridor=C01',
  },
  {
    id: 'AI-03',
    badge: 'OPERATIONAL RISK',
    badgeTone: 'warning',
    title: 'Critical S&T defect SIG-118 on C04 has no feasible 48h window',
    corridorId: 'C04',
    description:
      'Relay rack defect at Bhubaneswar–Khurda is 14 days overdue. High passenger density currently prevents standard 90m daytime block without 18409 delay.',
    metric: '14 Days Overdue · 0 Feasible Daytime Slots',
    impact: 'Requires night disconnection approval or train re-routing',
    actionLabel: 'Resolve in Conflicts',
    actionHref: '/conflicts',
  },
  {
    id: 'AI-04',
    badge: 'CAPACITY UNDERUTILIZATION',
    badgeTone: 'success',
    title: 'C05 Freight Bypass has 5.6 hours surplus capacity',
    corridorId: 'C05',
    description:
      'Suburban freight corridor operates at only 72% block utilization. High-potential corridor to absorb deferred maintenance backlog without operational impact.',
    metric: '5.6h Surplus Window · 72% Utilization',
    impact: 'Opportunity to advance 5 deferred routine track inspection tasks',
    actionLabel: 'Simulate What-If',
    actionHref: '/what-if',
  },
]

// 7-day Historical Sparkline Trends for Top KPIs
export const kpiSparklines = {
  assetAvailability: [94.1, 94.8, 95.2, 95.9, 96.2, 96.5, 96.8],
  blockUtilization: [78.5, 81.2, 83.0, 85.4, 87.1, 86.8, 88.2],
  criticalTasks: [18, 16, 15, 14, 13, 11, 12],
  overdueTasks: [45, 42, 40, 39, 38, 36, 37],
  activeConflicts: [14, 12, 11, 9, 8, 7, 8],
}

// Live Active Trains on Kharagpur Division
export const liveTrainsData: LiveTrain[] = [
  {
    id: 'TR-12841',
    number: '12841',
    name: 'Coromandel Express',
    type: 'Superfast',
    corridorId: 'C01',
    fromStation: 'HWH',
    toStation: 'BLS',
    direction: 'DN',
    speedKmh: 122,
    maxSpeedKmh: 130,
    priority: 'P1',
    currentSection: 'SRC-BZN',
    progress: 0.38,
    scheduledDeparture: '15:20',
    estimatedArrival: '17:35',
    status: 'On-Time',
    statusNote: 'Passing Bagnan outer at 122 km/h · Signals Clear',
    crewDivision: 'KGP/SER',
    rakeLengthMeters: 624,
    wagonsOrCoaches: 24,
    traction: 'WAP-7 (6000 HP)',
  },
  {
    id: 'TR-12863',
    number: '12863',
    name: 'Howrah – SMVB Superfast',
    type: 'Superfast',
    corridorId: 'C01',
    fromStation: 'HWH',
    toStation: 'KGP',
    direction: 'DN',
    speedKmh: 114,
    maxSpeedKmh: 130,
    priority: 'P1',
    currentSection: 'BZN-PKU',
    progress: 0.65,
    scheduledDeparture: '10:55',
    estimatedArrival: '12:45',
    status: 'On-Time',
    statusNote: 'Approaching Panskura Junction Up Main line',
    crewDivision: 'HWH/ER',
    rakeLengthMeters: 580,
    wagonsOrCoaches: 22,
    traction: 'WAP-7 (6000 HP)',
  },
  {
    id: 'TR-18001',
    number: '18001',
    name: 'Kandari Express',
    type: 'Express',
    corridorId: 'C04',
    fromStation: 'PKU',
    toStation: 'DGHA',
    direction: 'DN',
    speedKmh: 86,
    maxSpeedKmh: 110,
    priority: 'P2',
    currentSection: 'TMZ-HEN',
    progress: 0.44,
    scheduledDeparture: '14:15',
    estimatedArrival: '16:30',
    status: 'On-Time',
    statusNote: 'Passing Tamluk Junction · Clear route on single line',
    crewDivision: 'KGP/SER',
    rakeLengthMeters: 410,
    wagonsOrCoaches: 16,
    traction: 'WAP-5 (5450 HP)',
  },
  {
    id: 'TR-BOXN-8821',
    number: 'BOXN-8821',
    name: 'Talcher Coal Freight',
    type: 'Freight',
    corridorId: 'C03',
    fromStation: 'TATA',
    toStation: 'KGP',
    direction: 'UP',
    speedKmh: 58,
    maxSpeedKmh: 75,
    priority: 'P3',
    currentSection: 'JGM-KGP',
    progress: 0.72,
    scheduledDeparture: '08:30',
    estimatedArrival: '13:50',
    status: 'Caution',
    statusNote: 'Held for 6 min on Jhargram Loop for Mail precedence',
    crewDivision: 'CKP/SER',
    rakeLengthMeters: 690,
    wagonsOrCoaches: 58,
    traction: 'Twin WAG-9 (12000 HP)',
  },
  {
    id: 'TR-BCN-4019',
    number: 'BCN-4019',
    name: 'UltraTech Cement Freight',
    type: 'Freight',
    corridorId: 'C05',
    fromStation: 'KGP',
    toStation: 'MDN',
    direction: 'DN',
    speedKmh: 52,
    maxSpeedKmh: 75,
    priority: 'P3',
    currentSection: 'GMDN-MDN',
    progress: 0.35,
    scheduledDeparture: '11:10',
    estimatedArrival: '12:25',
    status: 'On-Time',
    statusNote: 'Transit via Giri Maidan bypass · Route isolated from Main line',
    crewDivision: 'KGP/SER',
    rakeLengthMeters: 560,
    wagonsOrCoaches: 42,
    traction: 'WAG-9 (6000 HP)',
  },
  {
    id: 'TR-TWR-411',
    number: 'OHE-TWR-411',
    name: 'KGP TRD Tower Wagon',
    type: 'Maintenance',
    corridorId: 'C01',
    fromStation: 'SRC',
    toStation: 'PKU',
    direction: 'DN',
    speedKmh: 36,
    maxSpeedKmh: 45,
    priority: 'P1',
    currentSection: 'PKU-KGP',
    progress: 0.84,
    scheduledDeparture: '11:30',
    estimatedArrival: '13:30',
    status: 'Approaching Block',
    statusNote: 'Permit #SER-TRD-902 active · De-energization confirmed',
    crewDivision: 'KGP TRD Dept',
    rakeLengthMeters: 25,
    wagonsOrCoaches: 1,
    traction: 'Diesel Hydraulic Tower Unit',
  },
  {
    id: 'TR-12839',
    number: '12839',
    name: 'Howrah – Chennai Mail',
    type: 'Superfast',
    corridorId: 'C02',
    fromStation: 'KGP',
    toStation: 'BLS',
    direction: 'DN',
    speedKmh: 120,
    maxSpeedKmh: 130,
    priority: 'P1',
    currentSection: 'JER-BLS',
    progress: 0.68,
    scheduledDeparture: '23:55',
    estimatedArrival: '02:40',
    status: 'On-Time',
    statusNote: 'Full line speed on Down Main · Automatic Block section',
    crewDivision: 'KGP/SER',
    rakeLengthMeters: 624,
    wagonsOrCoaches: 24,
    traction: 'WAP-7 (6000 HP)',
  },
]

// 3-Aspect Railway Signals at Station Junction Throats
export const stationSignalsData: StationSignal[] = [
  {
    stationCode: 'HWH',
    name: 'Howrah Junction Throat',
    aspect: 'green',
    route: 'Route 4 Up Main to Santragachi',
    interlocking: 'Electronic Interlocking (EI)',
    trackOccupancy: 'TC Clear',
  },
  {
    stationCode: 'SRC',
    name: 'Santragachi Junction East',
    aspect: 'green',
    route: 'Down Main Line',
    interlocking: 'Route Relay Interlocking (RRI)',
    trackOccupancy: 'TC Clear',
  },
  {
    stationCode: 'PKU',
    name: 'Panskura Junction North',
    aspect: 'double-yellow',
    route: 'Tamluk Digha Branch Divergence',
    interlocking: 'Electronic Interlocking (EI)',
    trackOccupancy: 'TC Clear (Caution Approaching)',
  },
  {
    stationCode: 'KGP',
    name: 'Kharagpur Central Throat',
    aspect: 'red',
    route: 'Platform 3 Down Loop (Power Block Shunt)',
    interlocking: 'Electronic Interlocking (EI)',
    trackOccupancy: 'Block Window Isolated',
  },
  {
    stationCode: 'BLS',
    name: 'Balasore South Outer',
    aspect: 'green',
    route: 'Main Line Towards Bhadrak',
    interlocking: 'Electronic Interlocking (EI)',
    trackOccupancy: 'TC Clear',
  },
  {
    stationCode: 'TATA',
    name: 'Tatanagar Mineral Siding',
    aspect: 'yellow',
    route: 'Goods Departure Yard to Salgajhari',
    interlocking: 'Route Relay Interlocking (RRI)',
    trackOccupancy: 'TC Shunted (Train Present)',
  },
  {
    stationCode: 'MDN',
    name: 'Midnapore Bypass Junction',
    aspect: 'green',
    route: 'Adra Main Line',
    interlocking: 'Electronic Interlocking (EI)',
    trackOccupancy: 'TC Clear',
  },
]

// Real-time OCC Radio & Comms Transcript Feed
export const dispatchCommsData: DispatchCommsLog[] = [
  {
    id: 'COM-01',
    timestamp: '12:28:14',
    speaker: 'Section Controller (KGP-SRC)',
    role: 'Dy. Chief Controller',
    stationOrSection: 'Kharagpur OCC',
    text: 'Power Block permit #SER-TRD-902 confirmed for PKU-KGP Down Line. OHE de-energization in effect.',
    type: 'block-permit',
  },
  {
    id: 'COM-02',
    timestamp: '12:25:40',
    speaker: 'Station Master (PKU)',
    role: 'SM On-Duty',
    stationOrSection: 'Panskura Jn',
    text: '12863 Howrah-SMVB Superfast crossed Bagnan on time. Route set for Up Main through passage.',
    type: 'clearance',
  },
  {
    id: 'COM-03',
    timestamp: '12:21:05',
    speaker: 'S&T Inspector (TATA)',
    role: 'Section Engineer',
    stationOrSection: 'Jhargram',
    text: 'Axle Counter unit AC-4B calibration initiated. Holding freight BOXN-8821 in loop line for 10 min.',
    type: 'advisory',
  },
  {
    id: 'COM-04',
    timestamp: '12:17:30',
    speaker: 'Chief Traction Foreman',
    role: 'TRD Supervisor',
    stationOrSection: 'Santragachi Yard',
    text: 'Tower Wagon TWR-411 on track. Speed restricted to 40 km/h due to catenary dropper adjustment.',
    type: 'alert',
  },
  {
    id: 'COM-05',
    timestamp: '12:12:55',
    speaker: 'Chief Dispatcher',
    role: 'OCC In-Charge',
    stationOrSection: 'KGP Division',
    text: 'AI Bundled Window active for 11:30–13:30. Track Machine tamping and OHE inspection synchronized.',
    type: 'clearance',
  },
]

