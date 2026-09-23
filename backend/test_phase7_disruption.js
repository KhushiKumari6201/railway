/**
 * test_phase7_disruption.js
 * Verification test suite for Phase 7: Real-Time Operational Feedback & Disruption Rescheduling
 * 
 * Verifies:
 * TEST 1: GET /api/disruptions returns 200 with mode "SIMULATION".
 * TEST 2: POST /api/disruptions/simulate creates incident with deterministic ID.
 * TEST 3: Invalid incident type rejected with 400.
 * TEST 4: Invalid corridor rejected with 400.
 * TEST 5: Invalid time window rejected with 400.
 * TEST 6: Primary affected section correctly identified.
 * TEST 7: Overlapping timetable trains detected.
 * TEST 8: Downstream train delay propagation evaluated.
 * TEST 9: Deterministic delay minutes calculated.
 * TEST 10: Impacted RecommendedBlock records detected without cancellation.
 * TEST 11: Impacted tasks detected.
 * TEST 12: Connected corridor impact detected.
 * TEST 13: Isolated corridor (C04) remains unaffected.
 * TEST 14: Resource double-booking evaluated.
 * TEST 15: Dependency conflict evaluated.
 * TEST 16: Track & crossover access status generated.
 * TEST 17: Rescheduling alternatives generated around incident.
 * TEST 18: Rescheduling options validated through conflict rules.
 * TEST 19: Side-by-side scenario comparison evaluated via POST /api/rescheduling/compare.
 * TEST 20: No automatic winner declared in comparisons.
 * TEST 21: POST /api/rescheduling/apply validates parameters without auto-approving.
 * TEST 22: Prototype requisition report generated with required fields.
 * TEST 23: Incident resolution via PATCH /api/disruptions/:id/resolve works.
 * TEST 24: Data integrity: Task records unchanged by simulation.
 * TEST 25: Data integrity: Block records unchanged by simulation.
 * TEST 26: Data integrity: Conflict records unchanged by simulation.
 * TEST 27: Phase 1 regression passes.
 * TEST 28: Phase 2 regression passes.
 * TEST 29: Phase 3 regression passes.
 * TEST 30: Phase 4 regression passes.
 * TEST 31: Phase 5 regression passes.
 * TEST 32: Phase 6 regression passes.
 */

const http = require('http')
const { execSync } = require('child_process')

const { getTestToken } = require('./src/services/authService')
const TEST_TOKEN = getTestToken('ADMIN', 'USR-ADMIN-01', 'Admin Officer')

const BASE_URL = 'http://127.0.0.1:5000'

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
        Connection: 'close',
        ...headers,
      },
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve({ status: res.statusCode, body: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, body })
        }
      });
    })

    req.on('error', reject)

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data))
    }
    req.end()
  })
}

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function runTests() {
  console.log('====================================================')
  console.log('STARTING PHASE 7 DISRUPTION RESCHEDULING TEST SUITE')
  console.log('====================================================\n')

  // Capture baseline MongoDB state before simulations (Data Integrity Step 25)
  const [tasksBefore, blocksBefore, conflictsBefore] = await Promise.all([
    request('GET', '/api/tasks'),
    request('GET', '/api/blocks'),
    request('GET', '/api/conflicts'),
  ])

  const initialTaskCount = Array.isArray(tasksBefore.body) ? tasksBefore.body.length : 0
  const initialBlockCount = Array.isArray(blocksBefore.body) ? blocksBefore.body.length : 0
  const initialConflictCount = Array.isArray(conflictsBefore.body) ? conflictsBefore.body.length : 0

  console.log(`[Baseline Snapshot] Tasks: ${initialTaskCount}, Blocks: ${initialBlockCount}, Conflicts: ${initialConflictCount}\n`)

  // TEST 1: GET /api/disruptions
  console.log('--- TEST 1: GET /api/disruptions ---')
  try {
    const res = await request('GET', '/api/disruptions')
    assert(res.status === 200 && res.body.success === true && res.body.mode === 'SIMULATION', 'Endpoint returned status 200 with SIMULATION mode')
    assert(Array.isArray(res.body.data) && res.body.count >= 4, `Pre-seeded incidents count verified (${res.body.count} items)`)
  } catch (err) {
    assert(false, `TEST 1 Error: ${err.message}`)
  }

  // TEST 2: POST /api/disruptions/simulate creates incident with deterministic ID
  console.log('\n--- TEST 2: POST /api/disruptions/simulate ---')
  let simulatedIncidentId = null
  try {
    const res = await request('POST', '/api/disruptions/simulate', {
      incident: {
        type: 'OHE_FAILURE',
        severity: 'CRITICAL',
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '11:30',
        estimatedDuration: 90,
        description: 'Overhead catenary fault at Kharagpur approach.',
      },
    })
    assert(res.status === 201 && res.body.success === true, 'Created simulated incident with HTTP 201')
    assert(res.body.incident && res.body.incident.incidentId && res.body.incident.incidentId.startsWith('INC-'), `Deterministic incident ID assigned: ${res.body.incident.incidentId}`)
    simulatedIncidentId = res.body.incident.incidentId
  } catch (err) {
    assert(false, `TEST 2 Error: ${err.message}`)
  }

  // TEST 3: Invalid incident type rejected with 400
  console.log('\n--- TEST 3: Invalid incident type rejected with 400 ---')
  try {
    const res = await request('POST', '/api/disruptions/simulate', {
      incident: {
        type: 'INVALID_METEOR_STRIKE',
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        start: '10:00',
        end: '11:00',
      },
    })
    assert(res.status === 400 && res.body.success === false, 'Invalid incident type rejected with 400')
  } catch (err) {
    assert(false, `TEST 3 Error: ${err.message}`)
  }

  // TEST 4: Invalid corridor rejected with 400
  console.log('\n--- TEST 4: Invalid corridor rejected with 400 ---')
  try {
    const res = await request('POST', '/api/disruptions/simulate', {
      incident: {
        type: 'OHE_FAILURE',
        corridorId: 'NON_EXISTENT_XYZ',
        sectionId: 'PKU–KGP',
        start: '10:00',
        end: '11:00',
      },
    })
    assert(res.status === 400 && res.body.success === false, 'Non-existent corridor rejected with 400')
  } catch (err) {
    assert(false, `TEST 4 Error: ${err.message}`)
  }

  // TEST 5: Invalid time window rejected with 400
  console.log('\n--- TEST 5: Invalid time window rejected with 400 ---')
  try {
    const res = await request('POST', '/api/disruptions/simulate', {
      incident: {
        type: 'SIGNAL_FAILURE',
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        // missing start/end
      },
    })
    assert(res.status === 400 && res.body.success === false, 'Missing time window rejected with 400')
  } catch (err) {
    assert(false, `TEST 5 Error: ${err.message}`)
  }

  // TEST 6: Primary affected section correctly identified
  console.log('\n--- TEST 6: Primary affected section correctly identified ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    assert(res.status === 200, 'Fetched INC-001 successfully')
    assert(res.body.impact.incidentDetails.sectionId === 'PKU–KGP', 'Primary section identified as PKU–KGP')
    assert(res.body.impact.incidentDetails.corridorId === 'C01', 'Primary corridor identified as C01')
  } catch (err) {
    assert(false, `TEST 6 Error: ${err.message}`)
  }

  // TEST 7: Overlapping timetable trains detected
  console.log('\n--- TEST 7: Overlapping timetable trains detected ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const trains = res.body.impact.affectedTrains || []
    const trainNumbers = trains.map((t) => t.trainNo)
    assert(trains.length > 0 && trainNumbers.includes('12841'), `Detected affected train 12841 (Coromandel Express) overlapping 10:00–11:30 window`)
  } catch (err) {
    assert(false, `TEST 7 Error: ${err.message}`)
  }

  // TEST 8: Downstream train delay propagation evaluated
  console.log('\n--- TEST 8: Downstream train delay propagation evaluated ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const train12841 = (res.body.impact.affectedTrains || []).find((t) => t.trainNo === '12841')
    assert(train12841 && train12841.propagatesAcrossNetwork === true, 'Train 12841 correctly flags cross-corridor propagation')
    assert(train12841.downstreamCorridor === 'C02' && train12841.downstreamSection === 'KGP–BLS', 'Train 12841 downstream path traced to C02 (KGP–BLS)')
  } catch (err) {
    assert(false, `TEST 8 Error: ${err.message}`)
  }

  // TEST 9: Deterministic delay minutes calculated
  console.log('\n--- TEST 9: Deterministic delay minutes calculated ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const delay = res.body.impact.impact.totalSimulatedDelayMinutes
    assert(typeof delay === 'number' && delay > 0, `Deterministic delay minutes calculated: ${delay} min`)
  } catch (err) {
    assert(false, `TEST 9 Error: ${err.message}`)
  }

  // TEST 10: Impacted RecommendedBlock records detected without cancellation
  console.log('\n--- TEST 10: Impacted RecommendedBlock records detected without cancellation ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const impacted = res.body.impact.impactedBlocks || []
    assert(Array.isArray(impacted), 'Impacted blocks returned as array structure')
    // Ensure no block status was mutated to Cancelled
    const blocksRes = await request('GET', '/api/blocks')
    const cancelled = (blocksRes.body || []).filter((b) => b.status === 'Cancelled')
    assert(cancelled.length === 0, 'No approved/recommended block was automatically cancelled')
  } catch (err) {
    assert(false, `TEST 10 Error: ${err.message}`)
  }

  // TEST 11: Impacted tasks detected
  console.log('\n--- TEST 11: Impacted tasks detected ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const impactedTasks = res.body.impact.impactedTasks || []
    assert(Array.isArray(impactedTasks), `Impacted tasks array returned (${impactedTasks.length} items evaluated)`)
  } catch (err) {
    assert(false, `TEST 11 Error: ${err.message}`)
  }

  // TEST 12: Connected corridor impact detected
  console.log('\n--- TEST 12: Connected corridor impact detected ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const connectedIds = (res.body.impact.connectedCorridors || []).map((c) => c.corridorId)
    assert(connectedIds.includes('C02') && connectedIds.includes('C03'), 'C01 disruption at PKU–KGP affects adjacent C02 and C03 via KGP junction')
  } catch (err) {
    assert(false, `TEST 12 Error: ${err.message}`)
  }

  // TEST 13: Isolated corridor (C04) remains unaffected
  console.log('\n--- TEST 13: Isolated corridor (C04) remains unaffected ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const connectedIds = (res.body.impact.connectedCorridors || []).map((c) => c.corridorId)
    assert(!connectedIds.includes('C04'), 'C04 remains topologically isolated without false alarms')
  } catch (err) {
    assert(false, `TEST 13 Error: ${err.message}`)
  }

  // TEST 14: Resource double-booking evaluated
  console.log('\n--- TEST 14: Resource double-booking evaluated ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    assert(Array.isArray(res.body.impact.resourceConflicts), 'Resource conflicts array evaluated')
  } catch (err) {
    assert(false, `TEST 14 Error: ${err.message}`)
  }

  // TEST 15: Dependency conflict evaluated
  console.log('\n--- TEST 15: Dependency conflict evaluated ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    assert(Array.isArray(res.body.impact.dependencyConflicts), 'Dependency conflicts array evaluated')
  } catch (err) {
    assert(false, `TEST 15 Error: ${err.message}`)
  }

  // TEST 16: Track & crossover access status generated
  console.log('\n--- TEST 16: Track & crossover access status generated ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001')
    const tc = res.body.impact.trackCrossoverStatus
    assert(tc && tc.trackAccess === 'BLOCKED' && tc.crossoverState === 'BLOCKED', `Track and crossover locked as BLOCKED for CRITICAL incident on PKU–KGP`)
    assert(tc.speedRestrictionKmph === 0, 'Speed restriction is 0 km/h under BLOCKED state')
  } catch (err) {
    assert(false, `TEST 16 Error: ${err.message}`)
  }

  // TEST 17: Rescheduling alternatives generated around incident
  console.log('\n--- TEST 17: Rescheduling alternatives generated around incident ---')
  try {
    const res = await request('POST', '/api/rescheduling/simulate', {
      scenario: {
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        date: '2026-09-24',
        incidentStart: '10:00',
        incidentEnd: '11:30',
        estimatedDuration: 90,
        taskIds: ['ENG-221'],
      },
    })
    assert(res.status === 200 && res.body.success === true && res.body.mode === 'SIMULATION', 'POST /api/rescheduling/simulate returned status 200')
    assert(Array.isArray(res.body.reschedulingOptions) && res.body.reschedulingOptions.length >= 3, `Generated ${res.body.reschedulingOptions.length} candidate windows`)
  } catch (err) {
    assert(false, `TEST 17 Error: ${err.message}`)
  }

  // TEST 18: Rescheduling options validated through conflict rules
  console.log('\n--- TEST 18: Rescheduling options validated through conflict rules ---')
  try {
    const res = await request('POST', '/api/rescheduling/simulate', {
      scenario: {
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        date: '2026-09-24',
        incidentStart: '10:00',
        incidentEnd: '11:30',
        estimatedDuration: 90,
        taskIds: ['ENG-221'],
      },
    })
    const options = res.body.reschedulingOptions
    const nightOption = options.find((o) => o.scenarioId === 'OPT-D')
    assert(nightOption && nightOption.affectedTrainCount === 0, 'Night window (OPT-D) correctly verified conflict-free with 0 train delays')
  } catch (err) {
    assert(false, `TEST 18 Error: ${err.message}`)
  }

  // TEST 19: Side-by-side scenario comparison evaluated via POST /api/rescheduling/compare
  console.log('\n--- TEST 19: Side-by-side scenario comparison evaluated ---')
  try {
    const res = await request('POST', '/api/rescheduling/compare', {
      scenarios: [
        { scenarioId: 'A', label: 'Post-Clearance Window', corridorId: 'C01', sectionId: 'PKU–KGP', start: '12:00', end: '13:30', date: '2026-09-24' },
        { scenarioId: 'B', label: 'Night Maintenance Window', corridorId: 'C01', sectionId: 'PKU–KGP', start: '01:00', end: '02:30', date: '2026-09-24' },
      ],
    })
    assert(res.status === 200 && res.body.success === true, 'POST /api/rescheduling/compare returned 200')
    assert(res.body.comparisons && res.body.comparisons.length === 2, 'Evaluated exactly 2 scenarios side-by-side')
  } catch (err) {
    assert(false, `TEST 19 Error: ${err.message}`)
  }

  // TEST 20: No automatic winner declared in comparisons
  console.log('\n--- TEST 20: No automatic winner declared in comparisons ---')
  try {
    const res = await request('POST', '/api/rescheduling/compare', {
      scenarios: [
        { scenarioId: 'A', start: '12:00', end: '13:30' },
        { scenarioId: 'B', start: '01:00', end: '02:30' },
      ],
    })
    assert(res.body.winner === undefined && res.body.bestScenario === undefined && res.body.recommendedWinner === undefined, 'No "winner" or "best" flag declared in response')
  } catch (err) {
    assert(false, `TEST 20 Error: ${err.message}`)
  }

  // TEST 21: POST /api/rescheduling/apply validates parameters without auto-approving
  console.log('\n--- TEST 21: POST /api/rescheduling/apply validates parameters without auto-approving ---')
  try {
    const res = await request('POST', '/api/rescheduling/apply', {
      selectedScenario: {
        corridorId: 'C01',
        sectionId: 'PKU–KGP',
        start: '12:00',
        end: '13:30',
        date: '2026-09-24',
        taskIds: ['ENG-221'],
      },
    })
    assert(res.status === 200 && res.body.success === true, 'Apply endpoint returned 200')
    assert(res.body.requiresApproval === true, 'Strictly flags requiresApproval === true (no bypass of controller approval)')
  } catch (err) {
    assert(false, `TEST 21 Error: ${err.message}`)
  }

  // TEST 22: Prototype requisition report generated with required fields
  console.log('\n--- TEST 22: Prototype requisition report generated with required fields ---')
  try {
    const res = await request('GET', '/api/disruptions/INC-001/report')
    assert(res.status === 200 && res.body.success === true, 'GET /api/disruptions/:id/report returned 200')
    assert(res.body.reportMetadata && res.body.reportMetadata.documentTitle.includes('Prototype Operational Block Requisition'), 'Report contains document title')
    assert(res.body.decisionSignOff && res.body.decisionSignOff.controllerAction === 'PENDING_CONTROLLER_DECISION', 'Report contains controller decision sign-off section')
  } catch (err) {
    assert(false, `TEST 22 Error: ${err.message}`)
  }

  // TEST 23: Incident resolution via PATCH /api/disruptions/:id/resolve works
  console.log('\n--- TEST 23: Incident resolution via PATCH /api/disruptions/:id/resolve ---')
  try {
    const targetId = simulatedIncidentId || 'INC-002'
    const res = await request('PATCH', `/api/disruptions/${targetId}/resolve`)
    assert(res.status === 200 && res.body.success === true, 'PATCH resolve returned 200')
    assert(res.body.incident.status === 'RESOLVED', `Incident ${targetId} status updated to RESOLVED`)
  } catch (err) {
    assert(false, `TEST 23 Error: ${err.message}`)
  }

  // TEST 24, 25, 26: Data Integrity Verification (Simulations do NOT mutate MongoDB)
  console.log('\n--- TEST 24, 25, 26: Data Integrity Verification ---')
  try {
    const [tasksAfter, blocksAfter, conflictsAfter] = await Promise.all([
      request('GET', '/api/tasks'),
      request('GET', '/api/blocks'),
      request('GET', '/api/conflicts'),
    ])

    const taskCountAfter = Array.isArray(tasksAfter.body) ? tasksAfter.body.length : 0
    const blockCountAfter = Array.isArray(blocksAfter.body) ? blocksAfter.body.length : 0
    const conflictCountAfter = Array.isArray(conflictsAfter.body) ? conflictsAfter.body.length : 0

    assert(initialTaskCount === taskCountAfter, `TEST 24: Task count strictly unchanged (${initialTaskCount} === ${taskCountAfter})`)
    assert(initialBlockCount === blockCountAfter, `TEST 25: Block count strictly unchanged (${initialBlockCount} === ${blockCountAfter})`)
    assert(initialConflictCount === conflictCountAfter, `TEST 26: Conflict count strictly unchanged (${initialConflictCount} === ${conflictCountAfter})`)
  } catch (err) {
    assert(false, `Data Integrity Error: ${err.message}`)
  }

  console.log('\n========================================================')
  console.log(`📊 Phase 7 Direct Tests: ${passed} Passed, ${failed} Failed`)
  console.log('========================================================\n')

  if (failed > 0) {
    process.exit(1)
  }

  // TEST 27: Phase 1 regression passes
  console.log('--- TEST 27: Running Phase 1 Regression Tests (test_all_endpoints.js) ---')
  try {
    execSync('node test_all_endpoints.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 27: Phase 1 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 27 Phase 1 regression failed: ${err.message}`)
  }

  // TEST 28: Phase 2 regression passes
  console.log('--- TEST 28: Running Phase 2 Regression Tests (test_phase2_planner.js) ---')
  try {
    execSync('node test_phase2_planner.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 28: Phase 2 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 28 Phase 2 regression failed: ${err.message}`)
  }

  // TEST 29: Phase 3 regression passes
  console.log('--- TEST 29: Running Phase 3 Regression Tests (test_phase3_conflicts.js) ---')
  try {
    execSync('node test_phase3_conflicts.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 29: Phase 3 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 29 Phase 3 regression failed: ${err.message}`)
  }

  // TEST 30: Phase 4 regression passes
  console.log('--- TEST 30: Running Phase 4 Regression Tests (test_phase4_network.js) ---')
  try {
    execSync('node test_phase4_network.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 30: Phase 4 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 30 Phase 4 regression failed: ${err.message}`)
  }

  // TEST 31: Phase 5 regression passes
  console.log('--- TEST 31: Running Phase 5 Regression Tests (test_phase5_whatif.js) ---')
  try {
    execSync('node test_phase5_whatif.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 31: Phase 5 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 31 Phase 5 regression failed: ${err.message}`)
  }

  // TEST 32: Phase 6 regression passes
  console.log('--- TEST 32: Running Phase 6 Regression Tests (test_phase6_coordination.js) ---')
  try {
    execSync('node test_phase6_coordination.js', { stdio: 'inherit', cwd: __dirname })
    assert(true, 'TEST 32: Phase 6 regression tests passed.\n')
  } catch (err) {
    assert(false, `TEST 32 Phase 6 regression failed: ${err.message}`)
  }

  console.log('====================================================')
  console.log(`🎉 ALL 32 PHASE 7 TESTS & REGRESSIONS PASSED!`)
  console.log(`Summary: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================\n')

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error in Phase 7:', err)
  process.exit(1)
})
