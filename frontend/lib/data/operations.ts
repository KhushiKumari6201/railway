import type { BlockWindow, TrainMovement } from '@/lib/types'

export const trainMovements: TrainMovement[] = [
  { id: 'TM-01', trainNo: '12841', name: 'Coromandel Express', corridorId: 'C01', section: 'HWH–SRC', arrival: '07:40', departure: '08:05', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-02', trainNo: '12073', name: 'Howrah Jan Shatabdi', corridorId: 'C01', section: 'SRC–PKU', arrival: '09:10', departure: '09:30', type: 'Express', priority: 'High', forecast: false },
  { id: 'TM-03', trainNo: 'GDS-4412', name: 'Freight (BOXN)', corridorId: 'C01', section: 'PKU–KGP', arrival: '10:15', departure: '10:55', type: 'Goods', priority: 'Medium', forecast: true, forecastConfidence: 72 },
  { id: 'TM-04', trainNo: '18045', name: 'East Coast Express', corridorId: 'C01', section: 'HWH–SRC', arrival: '13:15', departure: '13:35', type: 'Express', priority: 'Medium', forecast: false },
  { id: 'TM-05', trainNo: '22201', name: 'Duronto Express', corridorId: 'C01', section: 'SRC–PKU', arrival: '16:20', departure: '16:40', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-06', trainNo: '12277', name: 'Shatabdi Express', corridorId: 'C02', section: 'BLS–CTC', arrival: '08:30', departure: '08:50', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-07', trainNo: 'GDS-5521', name: 'Freight (BCN)', corridorId: 'C02', section: 'CTC–BBS', arrival: '11:00', departure: '11:45', type: 'Goods', priority: 'Low', forecast: true, forecastConfidence: 65 },
  { id: 'TM-08', trainNo: '12703', name: 'Falaknuma Express', corridorId: 'C02', section: 'KGP–BLS', arrival: '15:10', departure: '15:30', type: 'Superfast', priority: 'High', forecast: false },
  { id: 'TM-09', trainNo: '18409', name: 'Sri Jagannath Express', corridorId: 'C04', section: 'BBS–KUR', arrival: '09:45', departure: '10:05', type: 'Express', priority: 'Medium', forecast: false },
  { id: 'TM-10', trainNo: 'GDS-6610', name: 'Freight (BTAP)', corridorId: 'C05', section: 'SRC–ULT', arrival: '12:30', departure: '13:10', type: 'Goods', priority: 'Low', forecast: true, forecastConfidence: 58 },
]

// Timeline slots for the Auto Block Planner (per corridor / day)
export interface TimelineSlot {
  start: string
  end: string
  kind: 'train' | 'available' | 'block' | 'blackout'
  label: string
  meta?: string
}

export const timelineByCorridor: Record<string, TimelineSlot[]> = {
  C01: [
    { start: '06:00', end: '07:40', kind: 'available', label: 'Available window' },
    { start: '07:40', end: '08:05', kind: 'train', label: '12841 Coromandel Exp', meta: 'Superfast' },
    { start: '08:05', end: '09:10', kind: 'available', label: 'Available window' },
    { start: '09:10', end: '09:30', kind: 'train', label: '12073 Jan Shatabdi', meta: 'Express' },
    { start: '09:30', end: '10:15', kind: 'available', label: 'Available window' },
    { start: '10:15', end: '10:55', kind: 'train', label: 'GDS-4412 Freight', meta: 'Goods (forecast 72%)' },
    { start: '11:30', end: '13:15', kind: 'block', label: 'Recommended Block', meta: 'ENG-104 + SNT-087' },
    { start: '13:15', end: '13:35', kind: 'train', label: '18045 East Coast Exp', meta: 'Express' },
    { start: '13:35', end: '16:20', kind: 'available', label: 'Available window' },
    { start: '16:20', end: '16:40', kind: 'train', label: '22201 Duronto Exp', meta: 'Superfast' },
    { start: '16:40', end: '18:00', kind: 'available', label: 'Available window' },
  ],
  C02: [
    { start: '06:00', end: '08:30', kind: 'available', label: 'Available window' },
    { start: '08:30', end: '08:50', kind: 'train', label: '12277 Shatabdi Exp', meta: 'Superfast' },
    { start: '08:50', end: '11:00', kind: 'available', label: 'Available window' },
    { start: '11:00', end: '11:45', kind: 'train', label: 'GDS-5521 Freight', meta: 'Goods (forecast 65%)' },
    { start: '12:00', end: '15:00', kind: 'block', label: 'Recommended Block', meta: 'ENG-221 Corridor Block' },
    { start: '15:10', end: '15:30', kind: 'train', label: '12703 Falaknuma Exp', meta: 'Superfast' },
    { start: '15:30', end: '18:00', kind: 'available', label: 'Available window' },
  ],
  C03: [
    { start: '06:00', end: '09:00', kind: 'available', label: 'Available window' },
    { start: '09:00', end: '11:30', kind: 'block', label: 'Recommended Block', meta: 'ENG-142 Bridge inspection' },
    { start: '11:30', end: '14:00', kind: 'available', label: 'Available window' },
    { start: '14:00', end: '15:00', kind: 'blackout', label: 'Operational blackout', meta: 'CRS inspection' },
    { start: '15:00', end: '18:00', kind: 'available', label: 'Available window' },
  ],
  C04: [
    { start: '06:00', end: '09:45', kind: 'available', label: 'Available window' },
    { start: '09:45', end: '10:05', kind: 'train', label: '18409 Sri Jagannath Exp', meta: 'Express' },
    { start: '10:05', end: '14:00', kind: 'available', label: 'Available window' },
    { start: '14:00', end: '15:00', kind: 'block', label: 'Recommended Block', meta: 'TD-031 OHE inspection' },
    { start: '15:00', end: '18:00', kind: 'available', label: 'Available window' },
  ],
  C05: [
    { start: '06:00', end: '12:30', kind: 'available', label: 'Available window' },
    { start: '12:30', end: '13:10', kind: 'train', label: 'GDS-6610 Freight', meta: 'Goods (forecast 58%)' },
    { start: '13:10', end: '18:00', kind: 'available', label: 'Available window' },
  ],
}

export const blockWindows: BlockWindow[] = [
  { id: 'BW-01', date: '2026-09-14', corridorId: 'C01', section: 'HWH–SRC', start: '11:30', end: '13:30', durationMin: 120, blockType: 'Traffic Block', availability: 'Available', operationalRisk: 'Low' },
  { id: 'BW-02', date: '2026-09-14', corridorId: 'C02', section: 'BLS–CTC', start: '12:00', end: '15:00', durationMin: 180, blockType: 'Corridor Block', availability: 'Available', operationalRisk: 'Medium' },
  { id: 'BW-03', date: '2026-09-15', corridorId: 'C03', section: 'GII–TATA', start: '09:00', end: '11:30', durationMin: 150, blockType: 'Corridor Block', availability: 'Available', operationalRisk: 'Low' },
  { id: 'BW-04', date: '2026-09-15', corridorId: 'C04', section: 'BBS–KUR', start: '14:00', end: '15:00', durationMin: 60, blockType: 'Power Block', availability: 'Available', operationalRisk: 'Low' },
  { id: 'BW-05', date: '2026-09-16', corridorId: 'C01', section: 'SRC–PKU', start: '09:30', end: '10:15', durationMin: 45, blockType: 'Signalling Disconnection', availability: 'Restricted', operationalRisk: 'Medium' },
  { id: 'BW-06', date: '2026-09-16', corridorId: 'C05', section: 'SRC–ULT', start: '13:10', end: '16:00', durationMin: 170, blockType: 'Corridor Block', availability: 'Available', operationalRisk: 'Low' },
]
