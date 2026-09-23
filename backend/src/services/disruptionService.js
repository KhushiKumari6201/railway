/**
 * disruptionService.js
 * Manages deterministic simulated operational incidents for Phase 7
 * 
 * STRICT RULES:
 * - Decision-support simulation only. No live CRIS/NTES telemetry.
 * - In-memory store pre-seeded with deterministic railway operational incidents.
 * - Mode is always marked "SIMULATION".
 */

const VALID_INCIDENT_TYPES = [
  'OHE_FAILURE',
  'TRACK_FAILURE',
  'SIGNAL_FAILURE',
  'TRACK_OBSTRUCTION',
  'EQUIPMENT_FAILURE',
  'EMERGENCY_MAINTENANCE',
]

const VALID_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL']
const VALID_STATUSES = ['ACTIVE', 'RESOLVED', 'SIMULATED']

// Canonical deterministic operational incident seeds
const INITIAL_INCIDENTS = [
  {
    incidentId: 'INC-001',
    type: 'OHE_FAILURE',
    severity: 'CRITICAL',
    title: 'Traction Power Interruption (OHE Sagging)',
    corridorId: 'C01',
    sectionId: 'PKU–KGP',
    date: '2026-09-24',
    start: '10:00',
    end: '11:30',
    estimatedDuration: 90,
    description: 'Overhead traction feeder defect identified near Kharagpur outer signal. Power isolation required for emergency inspection.',
    affectedTrainIds: ['12841'],
    status: 'ACTIVE',
    reportedBy: 'Traction Substation Controller (TSS-KGP)',
    loggedAt: '2026-09-24T09:45:00.000Z',
  },
  {
    incidentId: 'INC-002',
    type: 'SIGNAL_FAILURE',
    severity: 'WARNING',
    title: 'Track Circuit Bobbing & Point Indication Loss',
    corridorId: 'C02',
    sectionId: 'KGP–BLS',
    date: '2026-09-24',
    start: '13:00',
    end: '14:15',
    estimatedDuration: 75,
    description: 'Intermittent fail-safe red signal drop at Balasore North crossover. Automatic signalling suspended; manual piloting.',
    affectedTrainIds: ['12841', '12842'],
    status: 'ACTIVE',
    reportedBy: 'Sectional Signalling Inspector (S&T-BLS)',
    loggedAt: '2026-09-24T12:30:00.000Z',
  },
  {
    incidentId: 'INC-003',
    type: 'TRACK_FAILURE',
    severity: 'CRITICAL',
    title: 'Weld Fracture on Up Main Line',
    corridorId: 'C03',
    sectionId: 'KGP–GII',
    date: '2026-09-24',
    start: '08:30',
    end: '10:00',
    estimatedDuration: 90,
    description: 'Ultrasonic flaw detection detected rail head fissure requiring emergency emergency clamp fitment and speed restriction.',
    affectedTrainIds: ['18001'],
    status: 'ACTIVE',
    reportedBy: 'Permanent Way Inspector (PWI-GII)',
    loggedAt: '2026-09-24T08:15:00.000Z',
  },
  {
    incidentId: 'INC-004',
    type: 'EMERGENCY_MAINTENANCE',
    severity: 'INFO',
    title: 'Pre-Monsoon Culvert Desilting',
    corridorId: 'C05',
    sectionId: 'SRC–ULT',
    date: '2026-09-24',
    start: '15:00',
    end: '16:30',
    estimatedDuration: 90,
    description: 'Urgent drainage clearing on Santragachi Freight chord line before forecasted heavy rainfall.',
    affectedTrainIds: [],
    status: 'RESOLVED',
    reportedBy: 'Works Foreman (ENG-SRC)',
    loggedAt: '2026-09-24T14:00:00.000Z',
  },
]

// In-memory store
let incidents = JSON.parse(JSON.stringify(INITIAL_INCIDENTS))

function getAllIncidents(filters = {}) {
  let list = [...incidents]

  if (filters.corridorId) {
    list = list.filter((i) => i.corridorId === filters.corridorId.toUpperCase())
  }
  if (filters.severity) {
    list = list.filter((i) => i.severity === filters.severity.toUpperCase())
  }
  if (filters.status) {
    list = list.filter((i) => i.status === filters.status.toUpperCase())
  }
  if (filters.type) {
    list = list.filter((i) => i.type === filters.type.toUpperCase())
  }

  return list
}

function getIncidentById(incidentId) {
  if (!incidentId) return null
  return incidents.find((i) => i.incidentId.toUpperCase() === incidentId.toUpperCase()) || null
}

function createSimulatedIncident(data) {
  const {
    type,
    severity = 'WARNING',
    corridorId,
    sectionId,
    date = '2026-09-24',
    start,
    end,
    estimatedDuration,
    description = 'Simulated operational event for decision-support rescheduling.',
    title,
    affectedTrainIds = [],
  } = data

  if (!type || !VALID_INCIDENT_TYPES.includes(type.toUpperCase())) {
    throw new Error(`Invalid incident type "${type}". Allowed types: ${VALID_INCIDENT_TYPES.join(', ')}`)
  }
  if (severity && !VALID_SEVERITIES.includes(severity.toUpperCase())) {
    throw new Error(`Invalid severity "${severity}". Allowed: ${VALID_SEVERITIES.join(', ')}`)
  }
  if (!corridorId || typeof corridorId !== 'string') {
    throw new Error('corridorId is required.')
  }
  if (!sectionId || typeof sectionId !== 'string') {
    throw new Error('sectionId is required.')
  }
  if (!start || !end) {
    throw new Error('start and end times are required (HH:MM format).')
  }

  // Generate deterministic ID
  const nextNum = incidents.length + 1
  const incidentId = `INC-${String(nextNum).padStart(3, '0')}`

  // Calculate duration if not provided
  let durationMin = estimatedDuration
  if (!durationMin) {
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    durationMin = (eH * 60 + eM) - (sH * 60 + sM)
    if (durationMin < 0) durationMin += 1440
  }

  const newIncident = {
    incidentId,
    type: type.toUpperCase(),
    severity: severity.toUpperCase(),
    title: title || `${type.replace(/_/g, ' ')} on ${corridorId} (${sectionId})`,
    corridorId: corridorId.toUpperCase(),
    sectionId,
    date,
    start,
    end,
    estimatedDuration: durationMin,
    description,
    affectedTrainIds: Array.isArray(affectedTrainIds) ? affectedTrainIds : [],
    status: 'ACTIVE',
    reportedBy: 'Simulated Controller Feed',
    loggedAt: new Date().toISOString(),
  }

  incidents.unshift(newIncident)
  return newIncident
}

function resolveIncident(incidentId) {
  const incident = getIncidentById(incidentId)
  if (!incident) {
    throw new Error(`Incident "${incidentId}" not found.`)
  }
  incident.status = 'RESOLVED'
  incident.resolvedAt = new Date().toISOString()
  return incident
}

function resetIncidents() {
  incidents = JSON.parse(JSON.stringify(INITIAL_INCIDENTS))
  return incidents
}

module.exports = {
  getAllIncidents,
  getDisruptions: getAllIncidents,
  getIncidentById,
  createSimulatedIncident,
  resolveIncident,
  resetIncidents,
  VALID_INCIDENT_TYPES,
  VALID_SEVERITIES,
  VALID_STATUSES,
}
