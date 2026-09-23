/**
 * optimizationComparisonService.js
 * Factual Side-by-Side Candidate Schedule Comparison Service
 * 
 * STRICT COMPLIANCE:
 * - 100% READ-ONLY and fact-based.
 * - NO "best", "winner", "optimal", or "guaranteed" labels.
 * - Presents objective metrics for human-in-the-loop Controller evaluation.
 */

function determineOperationalImpact(criticalCount, delayMin, trainCount) {
  if (criticalCount > 0 || delayMin > 60 || trainCount >= 3) return 'CRITICAL'
  if (delayMin > 30 || trainCount >= 2) return 'HIGH'
  if (delayMin > 0 || trainCount >= 1) return 'MEDIUM'
  return 'LOW'
}

/**
 * Compares candidate optimization schedules side-by-side
 * @param {Array} candidates - Array of candidate objects returned by optimizationService
 * @returns {Object} Factual comparison breakdown
 */
function compareOptimizationCandidates(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const err = new Error('At least one candidate schedule is required for comparison.')
    err.statusCode = 400
    throw err
  }

  const comparisons = candidates.map((c, index) => {
    const opImpact = determineOperationalImpact(
      c.criticalConflictCount || 0,
      c.simulatedDelayMinutes || 0,
      c.affectedTrainCount || 0
    )

    return {
      candidateId: c.candidateId || `CAND-${index + 1}`,
      label: c.label || `Schedule ${String.fromCharCode(65 + index)}`,
      status: c.status || 'FEASIBLE',
      corridorId: c.corridorId,
      section: c.section,
      date: c.date,
      window: c.window || `${c.start}–${c.end}`,
      durationMin: c.durationMin,
      totalTaskWorkMin: c.totalTaskWorkMin,
      availableWorkingMin: c.availableWorkingMin,
      safetyBufferStatus: c.safetyBufferStatus || 'PASS',
      tasksCoveredCount: (c.taskIds || []).length,
      taskIds: c.taskIds || [],
      affectedTrainCount: c.affectedTrainCount || 0,
      simulatedDelayMinutes: c.simulatedDelayMinutes || 0,
      criticalConflictCount: c.criticalConflictCount || 0,
      warningConflictCount: c.warningConflictCount || 0,
      networkUtilizationDelta: c.networkUtilizationDelta || 0,
      connectedCorridorsImpacted: c.connectedCorridorsImpacted || 0,
      resourceFragmentation: c.resourceFragmentation || 1,
      idleTimeMin: c.idleTimeMin || 0,
      operationalImpact: opImpact,
      infeasibleReasons: c.infeasibleReasons || [],
    }
  })

  // Summary factual deltas across candidates
  const delaySpread = {
    min: Math.min(...comparisons.map((c) => c.simulatedDelayMinutes)),
    max: Math.max(...comparisons.map((c) => c.simulatedDelayMinutes)),
  }

  const durationSpread = {
    min: Math.min(...comparisons.map((c) => c.durationMin)),
    max: Math.max(...comparisons.map((c) => c.durationMin)),
  }

  return {
    success: true,
    mode: 'SIMULATION',
    generatedAt: new Date().toISOString(),
    candidateCount: comparisons.length,
    comparisons,
    comparisonMatrix: comparisons,
    factualSummary: {
      delayRangeMinutes: `${delaySpread.min}m – ${delaySpread.max}m`,
      durationRangeMinutes: `${durationSpread.min}m – ${durationSpread.max}m`,
      feasibleCandidatesCount: comparisons.filter((c) => c.status === 'FEASIBLE').length,
      infeasibleCandidatesCount: comparisons.filter((c) => c.status !== 'FEASIBLE').length,
    },
    governanceDisclaimer:
      'FACTUAL COMPARISON ONLY: This comparison presents objective operational metrics to support controller decision-making. No candidate is automatically selected or endorsed by the system.',
  }
}

module.exports = {
  compareOptimizationCandidates,
  determineOperationalImpact,
}
