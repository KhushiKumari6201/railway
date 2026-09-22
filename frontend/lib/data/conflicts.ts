import type { Conflict, Exception } from '@/lib/types'

export const conflicts: Conflict[] = [
  {
    id: 'CF-01',
    type: 'Operational',
    severity: 'Critical',
    title: 'Block overlaps scheduled passenger movement',
    description:
      'Proposed block on C01 SRC–PKU (16:10–16:55) overlaps 22201 Duronto Express arriving 16:20.',
    corridorId: 'C01',
    affectedTasks: ['SNT-177'],
    affectedTrains: ['22201'],
    time: '16:10–16:55',
    suggestedAction:
      'Shift block to 13:35–14:20 available window or reduce scope to fit before 16:20.',
    resolved: false,
  },
  {
    id: 'CF-02',
    type: 'Resource',
    severity: 'Warning',
    title: 'Same S&T crew assigned to overlapping tasks',
    description:
      'S&T Gang B is assigned to SNT-221 (09:00–10:30) and SNT-087 (11:30–13:15) on the same day with insufficient transit buffer.',
    corridorId: 'C01',
    affectedTasks: ['SNT-221', 'SNT-087'],
    affectedTrains: [],
    time: '09:00 / 11:30',
    suggestedAction:
      'Reassign SNT-087 to S&T Gang A or add a 45-minute transit buffer.',
    resolved: false,
  },
  {
    id: 'CF-03',
    type: 'Corridor',
    severity: 'Critical',
    title: 'Two incompatible activities request the same section',
    description:
      'ENG-118 (Traffic Block) and TD-055 (Power Block) both request CTC Yard within the same window — incompatible block conditions.',
    corridorId: 'C02',
    affectedTasks: ['ENG-118', 'TD-055'],
    affectedTrains: [],
    time: '12:00–14:00',
    suggestedAction:
      'Sequence the two blocks or move TD-055 to the next feasible power-block window.',
    resolved: false,
  },
  {
    id: 'CF-04',
    type: 'Capacity',
    severity: 'Warning',
    title: 'Requested work exceeds available window',
    description:
      'Bundled request on C01 is 165 minutes but the available block window is only 120 minutes.',
    corridorId: 'C01',
    affectedTasks: ['ENG-104', 'SNT-087', 'SNT-193'],
    affectedTrains: [],
    time: '11:30–13:30',
    suggestedAction:
      'Drop SNT-193 to a later window; bundle only ENG-104 + SNT-087 (105 min).',
    resolved: false,
  },
  {
    id: 'CF-05',
    type: 'Dependency',
    severity: 'Info',
    title: 'Task dependency not yet scheduled',
    description:
      'ENG-233 depends on ENG-188 (level-crossing resurfacing), which is not scheduled before it.',
    corridorId: 'C05',
    affectedTasks: ['ENG-233', 'ENG-188'],
    affectedTrains: [],
    time: '—',
    suggestedAction:
      'Schedule ENG-188 first, or bundle both into the C05 corridor block on 16 Sep.',
    resolved: false,
  },
  {
    id: 'CF-06',
    type: 'Operational',
    severity: 'Warning',
    title: 'Freight forecast reduces window confidence',
    description:
      'Proposed C02 block partially overlaps GDS-5521 freight forecast (confidence 65%).',
    corridorId: 'C02',
    affectedTasks: ['TD-088'],
    affectedTrains: ['GDS-5521'],
    time: '11:00–11:45',
    suggestedAction:
      'Start block at 12:00 to clear the freight forecast window.',
    resolved: true,
  },
  {
    id: 'CF-07',
    type: 'Operational',
    severity: 'Info',
    title: 'Block ends close to blackout period',
    description:
      'C03 block ends 11:30, 2.5h before the 14:00 CRS inspection blackout — within buffer tolerance.',
    corridorId: 'C03',
    affectedTasks: ['ENG-142'],
    affectedTrains: [],
    time: '09:00–11:30',
    suggestedAction: 'No action required — buffer satisfied.',
    resolved: true,
  },
  {
    id: 'CF-08',
    type: 'Resource',
    severity: 'Warning',
    title: 'Bridge unit double-booked across corridors',
    description:
      'Bridge Unit 1 is required for ENG-142 (C03) and ENG-286 (C05) on adjacent days with tight turnaround.',
    corridorId: 'C03',
    affectedTasks: ['ENG-142', 'ENG-286'],
    affectedTrains: [],
    time: '15 Sep / 16 Sep',
    suggestedAction:
      'Confirm crew transit feasibility or assign Bridge Unit 2 to ENG-286.',
    resolved: false,
  },
]

export const exceptions: Exception[] = [
  {
    id: 'EX-01',
    taskId: 'ENG-221',
    priority: 96,
    reason:
      'No feasible corridor-block window of 300 minutes on C02 within the next 7 days.',
    suggestedAction:
      'Request an extended engineering block or a night corridor block with operations.',
  },
  {
    id: 'EX-02',
    taskId: 'TD-101',
    priority: 88,
    reason:
      'Critical circuit-breaker maintenance needs a power block, but C01 power windows conflict with OHE tasks.',
    suggestedAction:
      'Coordinate with Traction to release a dedicated 120-minute power block.',
  },
  {
    id: 'EX-03',
    taskId: 'SNT-221',
    priority: 91,
    reason:
      'Signalling disconnection window blocked by resource conflict (S&T Gang B).',
    suggestedAction: 'Reassign crew or defer SNT-087 to free Gang B.',
  },
  {
    id: 'EX-04',
    taskId: 'ENG-142',
    priority: 84,
    reason:
      'Feasible window found but crew (Bridge Unit 1) may be double-booked with ENG-286.',
    suggestedAction: 'Confirm crew availability before approving.',
  },
]
