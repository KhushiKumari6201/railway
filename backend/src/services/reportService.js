/**
 * reportService.js
 * Generates structured "Prototype Operational Block Requisition Report" data for Phase 7
 * 
 * STRICT COMPLIANCE:
 * - Decision-support prototype report only.
 * - Does NOT claim official Indian Railways / CRIS compliance.
 * - Includes simulation mode disclaimer and controller sign-off blocks.
 */

const { evaluateDisruptionImpact } = require('./disruptionImpactService')
const { generateReschedulingOptions } = require('./reschedulingService')

/**
 * Builds a comprehensive operational requisition report object
 */
async function generateOperationalReport(incident) {
  if (!incident) {
    throw new Error('Incident data is required to generate report.')
  }

  const [impactData, reschedulingData] = await Promise.all([
    evaluateDisruptionImpact(incident),
    generateReschedulingOptions({
      corridorId: incident.corridorId,
      sectionId: incident.sectionId,
      date: incident.date,
      incidentStart: incident.start,
      incidentEnd: incident.end,
      estimatedDuration: incident.estimatedDuration,
      taskIds: incident.taskIds || [],
    }),
  ])

  const reportId = `REQ-${incident.incidentId || 'SIM'}-${Date.now().toString().slice(-4)}`

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    reportMetadata: {
      reportId,
      projectName: 'Rail-Sanket (AI-Powered Automatic Block Planning)',
      documentTitle: 'Prototype Operational Block Requisition & Disruption Rescheduling Report',
      division: 'Kharagpur Division (SER)',
      disclaimer: 'This document is a decision-support simulation estimate based on the Rail-Sanket operational network model and timetable simulation data. It does not represent an official CRIS/COA railway authorization form.',
      controllerSignOffRequired: true,
    },
    incidentSummary: {
      incidentId: incident.incidentId || 'INC-SIM',
      type: incident.type,
      severity: incident.severity,
      title: incident.title,
      corridorId: incident.corridorId,
      sectionId: incident.sectionId,
      date: incident.date,
      timeWindow: `${incident.start}–${incident.end}`,
      durationMin: incident.estimatedDuration,
      reportedBy: incident.reportedBy || 'Sectional Controller',
      status: incident.status || 'ACTIVE',
    },
    networkImpactSummary: {
      primaryCorridor: incident.corridorId,
      connectedCorridors: impactData.connectedCorridors,
      affectedSections: impactData.affectedSections,
      affectedTrainCount: impactData.affectedTrains.length,
      affectedTrains: impactData.affectedTrains,
      impactedBlocks: impactData.impactedBlocks,
      impactedTasks: impactData.impactedTasks,
      trackCrossoverStatus: impactData.trackCrossoverStatus,
      totalSimulatedDelayMinutes: impactData.impact.totalSimulatedDelayMinutes,
      networkUtilizationDelta: impactData.impact.utilizationDelta,
      operationalImpact: impactData.impact.operationalImpact,
    },
    reschedulingAlternatives: reschedulingData.reschedulingOptions,
    decisionSignOff: {
      controllerAction: 'PENDING_CONTROLLER_DECISION',
      selectedOptionId: null,
      controllerNotes: '',
      verifiedSafetyBuffer: impactData.trackCrossoverStatus ? 'VERIFIED' : 'PENDING',
      authorizedBy: null,
      authorizationTimestamp: null,
    },
  }
}

module.exports = {
  generateOperationalReport,
}
