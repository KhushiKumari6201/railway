import type {
  AssetType,
  BlockType,
  Criticality,
  Department,
  MaintenanceTask,
  PriorityFactor,
  SourceSystem,
  TaskStatus,
} from '@/lib/types'
import { corridorMap } from '@/lib/data/corridors'

interface RawTask {
  id: string
  department: Department
  assetId: string
  assetType: AssetType
  corridorId: string
  location: string
  taskType: string
  criticality: Criticality
  defectSeverity: number
  overdueDays: number
  estimatedDuration: number
  requiredBlockType: BlockType
  crew: string
  dependencies?: string[]
  status?: TaskStatus
  dueDate: string
  scheduledDate?: string
}

const sourceByDept: Record<Department, SourceSystem> = {
  Engineering: 'TMS',
  'S&T': 'SMMS',
  Traction: 'TDMS',
}

const criticalityScore: Record<Criticality, number> = {
  Low: 25,
  Medium: 55,
  High: 80,
  Critical: 100,
}

function computePriority(t: RawTask): {
  priority: number
  factors: PriorityFactor[]
} {
  const density = corridorMap[t.corridorId]?.trafficDensity ?? 'Medium'
  const densityScore = density === 'High' ? 100 : density === 'Medium' ? 65 : 35

  const safeCrit = (['Low', 'Medium', 'High', 'Critical'].includes(t.criticality)
    ? t.criticality
    : 'Medium') as Criticality
  const critical = criticalityScore[safeCrit] ?? 55
  const urgency = Math.max(0, Math.min(100, 100 - (t.overdueDays || 0) * -4))
  const overdue = Math.min(100, (t.overdueDays || 0) * 6)
  const safety = t.defectSeverity || 50
  const assetImpact = densityScore
  const operational = t.dependencies && t.dependencies.length ? 40 : 70

  const raw =
    0.3 * critical +
    0.2 * Math.min(100, 60 + overdue * 0.4) +
    0.2 * safety +
    0.15 * assetImpact +
    0.1 * overdue +
    0.05 * operational

  const priority = isNaN(raw) ? 50 : Math.round(Math.max(0, Math.min(100, raw)))

  const factors: PriorityFactor[] = [
    {
      label: `${t.criticality} criticality asset`,
      contribution: Math.round(0.3 * critical),
      positive: t.criticality === 'High' || t.criticality === 'Critical',
    },
    {
      label:
        t.overdueDays > 0
          ? `${t.overdueDays} days overdue`
          : 'Within due window',
      contribution: Math.round(0.1 * overdue + 0.2 * Math.min(100, 60 + overdue * 0.4) * 0.3),
      positive: t.overdueDays > 3,
    },
    {
      label:
        t.defectSeverity >= 70
          ? 'High defect severity'
          : t.defectSeverity >= 40
            ? 'Moderate defect severity'
            : 'Low defect severity',
      contribution: Math.round(0.2 * safety),
      positive: t.defectSeverity >= 60,
    },
    {
      label: `${density}-traffic corridor (${t.corridorId})`,
      contribution: Math.round(0.15 * assetImpact),
      positive: density === 'High',
    },
    {
      label:
        t.dependencies && t.dependencies.length
          ? `Has ${t.dependencies.length} dependency`
          : 'No blocking dependencies',
      contribution: Math.round(0.05 * operational),
      positive: !(t.dependencies && t.dependencies.length),
    },
  ]

  return { priority, factors }
}

const rawTasks: RawTask[] = [
  // --- Critical / overdue demo tasks ---
  { id: 'SNT-221', department: 'S&T', assetId: 'PM-4471', assetType: 'Point Machine', corridorId: 'C01', location: 'SRC Yard, Line 3', taskType: 'Point machine defect repair', criticality: 'Critical', defectSeverity: 92, overdueDays: 14, estimatedDuration: 90, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang B', dueDate: '2026-08-26', status: 'Open' },
  { id: 'ENG-104', department: 'Engineering', assetId: 'TRK-1120', assetType: 'Track', corridorId: 'C01', location: 'HWH–SRC, KM 12/4', taskType: 'Rail fracture repair', criticality: 'Critical', defectSeverity: 88, overdueDays: 6, estimatedDuration: 60, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 3', dueDate: '2026-09-03', status: 'Open' },
  { id: 'SNT-087', department: 'S&T', assetId: 'SIG-2209', assetType: 'Signal', corridorId: 'C01', location: 'SRC Home Signal', taskType: 'Signal maintenance', criticality: 'High', defectSeverity: 64, overdueDays: 3, estimatedDuration: 45, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang B', dueDate: '2026-09-06', status: 'Open' },
  { id: 'TD-031', department: 'Traction', assetId: 'OHE-8802', assetType: 'OHE', corridorId: 'C02', location: 'BLS–CTC, KM 214', taskType: 'OHE inspection', criticality: 'Medium', defectSeverity: 41, overdueDays: 0, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 1', dueDate: '2026-09-14', status: 'Open' },
  { id: 'ENG-118', department: 'Engineering', assetId: 'TRN-330', assetType: 'Turnout', corridorId: 'C02', location: 'CTC Yard, Turnout 14A', taskType: 'Turnout renewal', criticality: 'High', defectSeverity: 71, overdueDays: 9, estimatedDuration: 120, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 5', dueDate: '2026-08-31', status: 'Open' },

  { id: 'TD-055', department: 'Traction', assetId: 'TSS-12', assetType: 'Traction Substation', corridorId: 'C02', location: 'BBS TSS', taskType: 'Transformer oil filtration', criticality: 'High', defectSeverity: 68, overdueDays: 2, estimatedDuration: 180, requiredBlockType: 'Power Block', crew: 'TRD Team 2', dueDate: '2026-09-07', status: 'Open' },
  { id: 'ENG-142', department: 'Engineering', assetId: 'BRG-77', assetType: 'Bridge', corridorId: 'C03', location: 'GII–TATA, Br. 412', taskType: 'Bridge girder inspection', criticality: 'Critical', defectSeverity: 79, overdueDays: 11, estimatedDuration: 150, requiredBlockType: 'Corridor Block', crew: 'Bridge Unit 1', dueDate: '2026-08-29', status: 'Open' },
  { id: 'SNT-113', department: 'S&T', assetId: 'TC-5521', assetType: 'Track Circuit', corridorId: 'C02', location: 'KGP–BLS, TC-119', taskType: 'Track circuit failure', criticality: 'High', defectSeverity: 73, overdueDays: 5, estimatedDuration: 75, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang A', dueDate: '2026-09-05', status: 'Open' },
  { id: 'ENG-160', department: 'Engineering', assetId: 'TRK-2044', assetType: 'Track', corridorId: 'C04', location: 'BBS–KUR, KM 8', taskType: 'Ballast cleaning', criticality: 'Medium', defectSeverity: 38, overdueDays: 0, estimatedDuration: 240, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 7', dueDate: '2026-09-18', status: 'Open' },
  { id: 'TD-072', department: 'Traction', assetId: 'OHE-9110', assetType: 'OHE', corridorId: 'C01', location: 'PKU–KGP, KM 96', taskType: 'OHE tension adjustment', criticality: 'Medium', defectSeverity: 46, overdueDays: 1, estimatedDuration: 90, requiredBlockType: 'Power Block', crew: 'TRD Team 1', dueDate: '2026-09-11', status: 'Open' },

  { id: 'SNT-131', department: 'S&T', assetId: 'PM-4490', assetType: 'Point Machine', corridorId: 'C03', location: 'TATA Yard, Line 5', taskType: 'Point machine overhaul', criticality: 'Medium', defectSeverity: 52, overdueDays: 4, estimatedDuration: 120, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang C', dueDate: '2026-09-08', status: 'Open' },
  { id: 'ENG-171', department: 'Engineering', assetId: 'TRK-1180', assetType: 'Track', corridorId: 'C01', location: 'HWH–SRC, KM 4', taskType: 'Rail grinding', criticality: 'Low', defectSeverity: 22, overdueDays: 0, estimatedDuration: 180, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 3', dueDate: '2026-09-22', status: 'Open' },
  { id: 'TD-088', department: 'Traction', assetId: 'OHE-8830', assetType: 'OHE', corridorId: 'C02', location: 'CTC–BBS, KM 240', taskType: 'Insulator replacement', criticality: 'High', defectSeverity: 66, overdueDays: 7, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 2', dueDate: '2026-09-02', status: 'Open' },
  { id: 'SNT-146', department: 'S&T', assetId: 'SIG-2240', assetType: 'Signal', corridorId: 'C04', location: 'KUR Distant Signal', taskType: 'Signal lamp replacement', criticality: 'Low', defectSeverity: 18, overdueDays: 0, estimatedDuration: 30, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang D', dueDate: '2026-09-20', status: 'Open' },
  { id: 'ENG-188', department: 'Engineering', assetId: 'LC-231', assetType: 'Level Crossing', corridorId: 'C05', location: 'SRC–ULT, LC-231', taskType: 'Level crossing resurfacing', criticality: 'Medium', defectSeverity: 44, overdueDays: 2, estimatedDuration: 120, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 9', dueDate: '2026-09-09', status: 'Open' },

  { id: 'TD-101', department: 'Traction', assetId: 'TSS-08', assetType: 'Traction Substation', corridorId: 'C01', location: 'KGP TSS', taskType: 'Circuit breaker maintenance', criticality: 'Critical', defectSeverity: 84, overdueDays: 8, estimatedDuration: 120, requiredBlockType: 'Power Block', crew: 'TRD Team 1', dueDate: '2026-08-30', status: 'Open' },
  { id: 'SNT-159', department: 'S&T', assetId: 'TC-5540', assetType: 'Track Circuit', corridorId: 'C01', location: 'SRC–PKU, TC-140', taskType: 'Track circuit calibration', criticality: 'Medium', defectSeverity: 49, overdueDays: 0, estimatedDuration: 45, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang A', dueDate: '2026-09-16', status: 'Open' },
  { id: 'ENG-202', department: 'Engineering', assetId: 'TRN-350', assetType: 'Turnout', corridorId: 'C03', location: 'GII Yard, Turnout 7', taskType: 'Turnout inspection', criticality: 'Medium', defectSeverity: 40, overdueDays: 3, estimatedDuration: 60, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 5', dueDate: '2026-09-08', status: 'Open' },
  { id: 'ENG-221', department: 'Engineering', assetId: 'BRG-81', assetType: 'Bridge', corridorId: 'C02', location: 'BLS–CTC, Br. 388', taskType: 'Bridge bearing replacement', criticality: 'Critical', defectSeverity: 90, overdueDays: 16, estimatedDuration: 300, requiredBlockType: 'Corridor Block', crew: 'Bridge Unit 2', dueDate: '2026-08-24', status: 'Open' },
  { id: 'TD-118', department: 'Traction', assetId: 'OHE-9145', assetType: 'OHE', corridorId: 'C03', location: 'KGP–GII, KM 22', taskType: 'OHE mast painting', criticality: 'Low', defectSeverity: 15, overdueDays: 0, estimatedDuration: 90, requiredBlockType: 'Power Block', crew: 'TRD Team 3', dueDate: '2026-09-25', status: 'Open' },

  { id: 'SNT-168', department: 'S&T', assetId: 'PM-4502', assetType: 'Point Machine', corridorId: 'C02', location: 'BBS Yard, Line 2', taskType: 'Point machine lubrication', criticality: 'Low', defectSeverity: 20, overdueDays: 1, estimatedDuration: 30, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang C', dueDate: '2026-09-19', status: 'Open' },
  { id: 'ENG-233', department: 'Engineering', assetId: 'TRK-2090', assetType: 'Track', corridorId: 'C05', location: 'ULT–KGP, KM 44', taskType: 'Sleeper renewal', criticality: 'High', defectSeverity: 62, overdueDays: 5, estimatedDuration: 150, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 9', dependencies: ['ENG-188'], dueDate: '2026-09-05', status: 'Open' },
  { id: 'TD-133', department: 'Traction', assetId: 'TSS-15', assetType: 'Traction Substation', corridorId: 'C04', location: 'PURI TSS', taskType: 'Panel wiring check', criticality: 'Medium', defectSeverity: 43, overdueDays: 0, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 2', dueDate: '2026-09-15', status: 'Open' },
  { id: 'SNT-177', department: 'S&T', assetId: 'SIG-2261', assetType: 'Signal', corridorId: 'C01', location: 'PKU Starter Signal', taskType: 'Signal aspect verification', criticality: 'High', defectSeverity: 58, overdueDays: 2, estimatedDuration: 45, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang A', dueDate: '2026-09-07', status: 'Open' },
  { id: 'ENG-247', department: 'Engineering', assetId: 'TRK-1210', assetType: 'Track', corridorId: 'C02', location: 'KGP–BLS, KM 172', taskType: 'Weld inspection', criticality: 'Medium', defectSeverity: 47, overdueDays: 4, estimatedDuration: 90, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 7', dueDate: '2026-09-06', status: 'Open' },

  { id: 'TD-149', department: 'Traction', assetId: 'OHE-8870', assetType: 'OHE', corridorId: 'C02', location: 'CTC–BBS, KM 255', taskType: 'Contact wire replacement', criticality: 'High', defectSeverity: 70, overdueDays: 6, estimatedDuration: 120, requiredBlockType: 'Power Block', crew: 'TRD Team 2', dueDate: '2026-09-03', status: 'Open' },
  { id: 'SNT-184', department: 'S&T', assetId: 'TC-5560', assetType: 'Track Circuit', corridorId: 'C03', location: 'GII–TATA, TC-201', taskType: 'Bond wire repair', criticality: 'Medium', defectSeverity: 51, overdueDays: 3, estimatedDuration: 60, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang C', dueDate: '2026-09-08', status: 'Open' },
  { id: 'ENG-259', department: 'Engineering', assetId: 'TRN-372', assetType: 'Turnout', corridorId: 'C01', location: 'KGP Yard, Turnout 22', taskType: 'Turnout tamping', criticality: 'Medium', defectSeverity: 42, overdueDays: 1, estimatedDuration: 90, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 3', dueDate: '2026-09-12', status: 'Open' },
  { id: 'TD-158', department: 'Traction', assetId: 'OHE-9180', assetType: 'OHE', corridorId: 'C04', location: 'KUR–PURI, KM 15', taskType: 'OHE inspection', criticality: 'Low', defectSeverity: 24, overdueDays: 0, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 3', dueDate: '2026-09-21', status: 'Open' },
  { id: 'SNT-193', department: 'S&T', assetId: 'PM-4518', assetType: 'Point Machine', corridorId: 'C01', location: 'HWH Yard, Line 7', taskType: 'Point machine defect repair', criticality: 'High', defectSeverity: 67, overdueDays: 4, estimatedDuration: 75, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang B', dueDate: '2026-09-06', status: 'Open' },

  { id: 'ENG-268', department: 'Engineering', assetId: 'TRK-2130', assetType: 'Track', corridorId: 'C03', location: 'KGP–GII, KM 30', taskType: 'Track alignment', criticality: 'Medium', defectSeverity: 39, overdueDays: 0, estimatedDuration: 120, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 5', dueDate: '2026-09-17', status: 'Scheduled' },
  { id: 'TD-166', department: 'Traction', assetId: 'TSS-08', assetType: 'Traction Substation', corridorId: 'C01', location: 'KGP TSS Bay 4', taskType: 'Relay testing', criticality: 'Medium', defectSeverity: 45, overdueDays: 2, estimatedDuration: 90, requiredBlockType: 'Power Block', crew: 'TRD Team 1', dueDate: '2026-09-10', status: 'Scheduled' },
  { id: 'SNT-201', department: 'S&T', assetId: 'SIG-2280', assetType: 'Signal', corridorId: 'C02', location: 'BLS Home Signal', taskType: 'Signal maintenance', criticality: 'Medium', defectSeverity: 48, overdueDays: 0, estimatedDuration: 45, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang A', dueDate: '2026-09-16', status: 'Scheduled' },
  { id: 'ENG-277', department: 'Engineering', assetId: 'TRK-1250', assetType: 'Track', corridorId: 'C02', location: 'BLS–CTC, KM 220', taskType: 'Rail fracture repair', criticality: 'Critical', defectSeverity: 55, overdueDays: 0, estimatedDuration: 60, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 7', dueDate: '2026-09-01', status: 'Completed' },
  { id: 'TD-174', department: 'Traction', assetId: 'OHE-8890', assetType: 'OHE', corridorId: 'C01', location: 'SRC–PKU, KM 60', taskType: 'OHE inspection', criticality: 'Low', defectSeverity: 21, overdueDays: 0, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 1', dueDate: '2026-09-02', status: 'Completed' },

  { id: 'SNT-214', department: 'S&T', assetId: 'TC-5580', assetType: 'Track Circuit', corridorId: 'C04', location: 'BBS–KUR, TC-260', taskType: 'Track circuit failure', criticality: 'High', defectSeverity: 69, overdueDays: 5, estimatedDuration: 75, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang D', dueDate: '2026-09-05', status: 'Open' },
  { id: 'ENG-286', department: 'Engineering', assetId: 'BRG-92', assetType: 'Bridge', corridorId: 'C05', location: 'SRC–ULT, Br. 501', taskType: 'Bridge deck repair', criticality: 'High', defectSeverity: 64, overdueDays: 7, estimatedDuration: 240, requiredBlockType: 'Corridor Block', crew: 'Bridge Unit 1', dueDate: '2026-09-01', status: 'Open' },
  { id: 'TD-182', department: 'Traction', assetId: 'OHE-9200', assetType: 'OHE', corridorId: 'C02', location: 'KGP–BLS, KM 160', taskType: 'Insulator replacement', criticality: 'Medium', defectSeverity: 50, overdueDays: 1, estimatedDuration: 60, requiredBlockType: 'Power Block', crew: 'TRD Team 2', dueDate: '2026-09-13', status: 'Open' },
  { id: 'ENG-295', department: 'Engineering', assetId: 'TRK-2170', assetType: 'Track', corridorId: 'C04', location: 'KUR–PURI, KM 20', taskType: 'Ballast cleaning', criticality: 'Low', defectSeverity: 26, overdueDays: 0, estimatedDuration: 180, requiredBlockType: 'Traffic Block', crew: 'PWay Gang 9', dueDate: '2026-09-23', status: 'Open' },
  { id: 'SNT-227', department: 'S&T', assetId: 'PM-4530', assetType: 'Point Machine', corridorId: 'C05', location: 'ULT Yard, Line 1', taskType: 'Point machine overhaul', criticality: 'Medium', defectSeverity: 53, overdueDays: 3, estimatedDuration: 120, requiredBlockType: 'Signalling Disconnection', crew: 'S&T Gang C', dueDate: '2026-09-09', status: 'Open' },
]

export const tasks: MaintenanceTask[] = rawTasks.map((t) => {
  const { priority, factors } = computePriority(t)
  return {
    id: t.id,
    sourceSystem: sourceByDept[t.department],
    department: t.department,
    assetId: t.assetId,
    assetType: t.assetType,
    corridorId: t.corridorId,
    location: t.location,
    taskType: t.taskType,
    criticality: (['Low', 'Medium', 'High', 'Critical'].includes(t.criticality)
      ? t.criticality
      : 'Medium') as Criticality,
    defectSeverity: t.defectSeverity,
    dueDate: t.dueDate,
    overdueDays: t.overdueDays,
    estimatedDuration: t.estimatedDuration,
    requiredBlockType: t.requiredBlockType,
    crew: t.crew,
    dependencies: t.dependencies ?? [],
    status: t.status ?? 'Open',
    priority,
    priorityFactors: factors,
    scheduledDate: t.scheduledDate ?? (
      t.id === 'ENG-221' ? '2026-09-14' :
      t.id === 'SNT-221' ? '2026-09-08' :
      t.id === 'ENG-142' ? '2026-09-15' :
      t.id === 'TD-101' ? '2026-09-18' :
      t.id === 'ENG-118' ? '2026-09-12' :
      t.dueDate.startsWith('2026-09') ? t.dueDate : undefined
    ),
  }
})

export const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]))

export function getTask(id: string) {
  return taskMap[id]
}
