import type { Kpi } from '@/lib/types'

export const kpis: Kpi[] = [
  { id: 'availability', label: 'Asset Availability', value: '96.8', numeric: 96.8, unit: '%', delta: 1.4, trend: 'up', goodDirection: 'up', tone: 'success' },
  { id: 'utilization', label: 'Block Utilization', value: '88.2', numeric: 88.2, unit: '%', delta: 6.1, trend: 'up', goodDirection: 'up', tone: 'info' },
  { id: 'critical', label: 'Critical Pending', value: '12', numeric: 12, delta: -3, trend: 'down', goodDirection: 'down', tone: 'danger' },
  { id: 'overdue', label: 'Overdue Tasks', value: '37', numeric: 37, delta: -8, trend: 'down', goodDirection: 'down', tone: 'warning' },
  { id: 'planned', label: 'Planned Maint. Hours', value: '214', numeric: 214, unit: 'h', delta: 12, trend: 'up', goodDirection: 'up', tone: 'neutral' },
  { id: 'conflicts', label: 'Conflicts Detected', value: '8', numeric: 8, delta: -2, trend: 'down', goodDirection: 'down', tone: 'warning' },
  { id: 'bundled', label: 'Tasks Bundled', value: '24', numeric: 24, delta: 5, trend: 'up', goodDirection: 'up', tone: 'success' },
]

export const availabilityTrend = [
  { day: 'Mon', availability: 94.1, utilization: 78 },
  { day: 'Tue', availability: 94.8, utilization: 81 },
  { day: 'Wed', availability: 95.3, utilization: 83 },
  { day: 'Thu', availability: 95.0, utilization: 80 },
  { day: 'Fri', availability: 96.1, utilization: 86 },
  { day: 'Sat', availability: 96.5, utilization: 88 },
  { day: 'Sun', availability: 96.8, utilization: 88 },
]

export const departmentWorkload = [
  { department: 'Engineering', open: 14, scheduled: 4, bundled: 9 },
  { department: 'S&T', open: 11, scheduled: 3, bundled: 8 },
  { department: 'Traction', open: 9, scheduled: 2, bundled: 7 },
]

export const utilizationByCorridor = [
  { corridor: 'C01', utilization: 91 },
  { corridor: 'C02', utilization: 88 },
  { corridor: 'C03', utilization: 76 },
  { corridor: 'C04', utilization: 82 },
  { corridor: 'C05', utilization: 69 },
]

export const criticalityBreakdown = [
  { name: 'Critical', value: 12, key: 'critical' },
  { name: 'High', value: 21, key: 'high' },
  { name: 'Medium', value: 34, key: 'medium' },
  { name: 'Low', value: 18, key: 'low' },
]

// Weekly plan structure for the Auto Block Planner / weekly view
export interface WeeklyPlanDay {
  date: string
  label: string
  recIds: string[]
}

export const weeklyPlan: WeeklyPlanDay[] = [
  { date: '2026-09-14', label: 'Mon 14 Sep', recIds: ['REC-101', 'REC-102'] },
  { date: '2026-09-15', label: 'Tue 15 Sep', recIds: ['REC-103', 'REC-104'] },
  { date: '2026-09-16', label: 'Wed 16 Sep', recIds: ['REC-105'] },
  { date: '2026-09-17', label: 'Thu 17 Sep', recIds: [] },
  { date: '2026-09-18', label: 'Fri 18 Sep', recIds: [] },
]

// Monthly capacity view
export const monthlyCorridorCapacity = [
  { corridor: 'C01', demandHours: 62, capacityHours: 70, criticalOpen: 4 },
  { corridor: 'C02', demandHours: 58, capacityHours: 60, criticalOpen: 5 },
  { corridor: 'C03', demandHours: 34, capacityHours: 48, criticalOpen: 2 },
  { corridor: 'C04', demandHours: 28, capacityHours: 44, criticalOpen: 1 },
  { corridor: 'C05', demandHours: 22, capacityHours: 40, criticalOpen: 0 },
]

export const monthlyBacklogTrend = [
  { week: 'W1', backlog: 92, critical: 18 },
  { week: 'W2', backlog: 84, critical: 15 },
  { week: 'W3', backlog: 71, critical: 13 },
  { week: 'W4', backlog: 63, critical: 12 },
]
