/**
 * Phase 5 What-If Scenario Simulation & Decision Support Test Suite
 * 
 * Verifies:
 * TEST 1: POST /api/what-if/simulate returns 200.
 * TEST 2: Simulation does not modify Task records (Data Integrity).
 * TEST 3: Simulation does not modify RecommendedBlock records (Data Integrity).
 * TEST 4: Simulation does not modify Conflict records (Data Integrity).
 * TEST 5: Simulation does not modify timetableData.
 * TEST 6: Baseline scenario calculates correct duration.
 * TEST 7: Alternative window is simulated correctly.
 * TEST 8: Train delay adjustment changes simulated train timing in-memory.
 * TEST 9: Train delay does not persist across requests.
 * TEST 10: Blocking train conflict is detected.
 * TEST 11: Conflict-free alternative window returns no blocking conflict.
 * TEST 12: Task duration respects 20-minute safety buffer (PASS when fitting).
 * TEST 13: Over-capacity scenario is detected (FAIL safetyBufferStatus).
 * TEST 14: Affected train count is deterministic.
 * TEST 15: Simulated delay minutes are calculated deterministically.
 * TEST 16: Operational impact classification is deterministic (CRITICAL/HIGH/MEDIUM/LOW).
 * TEST 17: Multiple scenarios can be compared via POST /api/what-if/compare.
 * TEST 18: Different corridors remain isolated.
 * TEST 19: Invalid scenario input returns validation error (400).
 * TEST 20: Phase 1 regression passes.
 * TEST 21: Phase 2 regression passes.
 * TEST 22: Phase 3 regression passes.
 * TEST 23: Phase 4 regression passes.
 */

const http = require('http')
const { execSync } = require('child_process')
const { trainMovements } = require('./src/data/timetableData')
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
          const parsed = body ? JSON.parse(body) : null
          resolve({ status: res.statusCode, body: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, body })
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

async function runTests() {
  console.log('========================================================')
  console.log('🧪 Starting Phase 5 What-If Simulation Test Suite')
  console.log('========================================================')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // Capture state before simulations (Step 26 Data Integrity)
    const [tasksBefore, blocksBefore, conflictsBefore] = await Promise.all([
      request('GET', '/api/tasks'),
      request('GET', '/api/blocks'),
      request('GET', '/api/conflicts'),
    ])

    const initialTrainArrivals = trainMovements.map((t) => ({ no: t.trainNo, arr: t.arrival, dep: t.departure }))

    // TEST 1: POST /api/what-if/simulate returns 200
    const testDate = '2026-10-25'
    const basicSim = await request('POST', '/api/what-if/simulate', {
      baseBlockId: 'REC-TEST-BASE',
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '14:00',
        end: '15:30',
        durationMin: 90,
        taskIds: ['SNT-221'],
      },
    })

    assert(basicSim.status === 200, 'TEST 1: POST /api/what-if/simulate returns 200 OK')
    assert(basicSim.body.success === true, 'TEST 1: Response contains success: true')
    assert(basicSim.body.mode === 'SIMULATION', 'TEST 1: Mode is explicitly SIMULATION')
    assert(basicSim.body.impact !== undefined, 'TEST 1: Response contains impact metrics object')

    // TEST 2, 3, 4: Data Integrity Verification (Simulation does NOT modify DB)
    const [tasksAfter, blocksAfter, conflictsAfter] = await Promise.all([
      request('GET', '/api/tasks'),
      request('GET', '/api/blocks'),
      request('GET', '/api/conflicts'),
    ])

    assert(
      tasksBefore.body.length === tasksAfter.body.length,
      `TEST 2: Task count unchanged (${tasksBefore.body.length} === ${tasksAfter.body.length})`
    )
    assert(
      blocksBefore.body.length === blocksAfter.body.length,
      `TEST 3: Block count unchanged (${blocksBefore.body.length} === ${blocksAfter.body.length})`
    )
    assert(
      conflictsBefore.body.length === conflictsAfter.body.length,
      `TEST 4: Conflict count unchanged (${conflictsBefore.body.length} === ${conflictsAfter.body.length})`
    )

    // TEST 5: Timetable Data Unmodified
    const currentTrainArrivals = trainMovements.map((t) => ({ no: t.trainNo, arr: t.arrival, dep: t.departure }))
    assert(
      JSON.stringify(initialTrainArrivals) === JSON.stringify(currentTrainArrivals),
      'TEST 5: trainMovements in timetableData.js strictly unmodified'
    )

    // TEST 6: Baseline scenario calculates correct duration
    const baselineSim = await request('POST', '/api/what-if/simulate', {
      baseBlockId: 'REC-TEST-BASE',
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '10:00',
        end: '12:00',
        durationMin: 120,
        taskIds: ['SNT-221', 'ENG-104'],
      },
    })
    assert(baselineSim.body.impact.durationMin === 120, 'TEST 6: Baseline duration is 120m')
    assert(baselineSim.body.impact.taskCount === 2, 'TEST 6: Baseline task count is 2')
    assert(baselineSim.body.impact.availableWorkingMin === 100, 'TEST 6: Available working time is 100m (120 - 20 buffer)')

    // TEST 7: Alternative window is simulated correctly
    const altWindowSim = await request('POST', '/api/what-if/simulate', {
      baseBlockId: 'REC-TEST-BASE',
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '14:00',
        end: '15:30',
        durationMin: 90,
        taskIds: ['SNT-221', 'ENG-104'],
      },
    })
    assert(altWindowSim.body.impact.durationMin === 90, 'TEST 7: Alternative window duration is 90m')
    assert(altWindowSim.body.scenario.start === '14:00', 'TEST 7: Alternative window starts at 14:00')

    // TEST 8: Train delay adjustment changes simulated train timing in-memory
    // Train 12841 is scheduled at 07:40 - 08:05 on C01 HWH–SRC.
    // If block is 08:10 - 09:10, normally NO conflict with 12841.
    const noDelaySim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '08:10',
        end: '09:10',
        durationMin: 60,
        taskIds: [],
        trainDelayAdjustments: [],
      },
    })
    const hasConflictBeforeDelay = noDelaySim.body.conflicts.conflicts.some((c) =>
      (c.affectedTrains || []).includes('12841')
    )
    assert(!hasConflictBeforeDelay, 'TEST 8: Without delay, block 08:10–09:10 does not clash with 12841 (07:40–08:05)')

    // Now simulate 12841 delayed by 20 minutes (new schedule: 08:00 - 08:25) -> clashing with 08:10 - 09:10!
    const delaySim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '08:10',
        end: '09:10',
        durationMin: 60,
        taskIds: [],
        trainDelayAdjustments: [{ trainNumber: '12841', delayMinutes: 20 }],
      },
    })
    const hasConflictAfterDelay = delaySim.body.conflicts.conflicts.some((c) =>
      (c.affectedTrains || []).includes('12841')
    )
    assert(hasConflictAfterDelay, 'TEST 8: With +20m delay, train 12841 overlaps block 08:10–09:10 and triggers conflict')

    // TEST 9: Train delay does NOT persist across subsequent requests
    const subsequentSim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '08:10',
        end: '09:10',
        durationMin: 60,
        taskIds: [],
        trainDelayAdjustments: [], // No delay
      },
    })
    const hasConflictSubsequent = subsequentSim.body.conflicts.conflicts.some((c) =>
      (c.affectedTrains || []).includes('12841')
    )
    assert(!hasConflictSubsequent, 'TEST 9: Train delay was strictly in-memory and did not persist')

    // TEST 10: Blocking train conflict detected
    // Direct overlap with Coromandel Express (07:40 - 08:05) on C01 HWH–SRC
    const directTrainOverlap = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '07:30',
        end: '08:30',
        durationMin: 60,
        taskIds: [],
      },
    })
    assert(directTrainOverlap.body.conflicts.hasBlockingConflict === true, 'TEST 10: Blocking conflict detected for Superfast train')
    assert(directTrainOverlap.body.impact.criticalConflicts >= 1, 'TEST 10: Critical conflict count is at least 1')

    // TEST 11: Conflict-free alternative window returns no blocking conflict
    const clearAltWindow = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C03',
        section: 'GII–TATA',
        date: testDate,
        start: '01:00',
        end: '03:00',
        durationMin: 120,
        taskIds: [],
      },
    })
    assert(clearAltWindow.body.conflicts.hasBlockingConflict === false, 'TEST 11: Clear night window has no blocking conflict')

    // TEST 12: Task duration respects 20-minute safety buffer (PASS when fitting)
    // SNT-221 is 90m duration. Window is 120m -> Available working time: 100m. 90m <= 100m -> PASS.
    const bufferPassSim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '01:00',
        end: '03:00',
        durationMin: 120,
        taskIds: ['SNT-221'],
      },
    })
    assert(bufferPassSim.body.impact.safetyBufferStatus === 'PASS', 'TEST 12: 90m task in 120m window leaves >=20m buffer (PASS)')

    // TEST 13: Over-capacity scenario is detected (FAIL safetyBufferStatus)
    // SNT-221 is 90m. Window is 90m -> Available working time: 70m. 90m > 70m -> FAIL.
    const bufferFailSim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '01:00',
        end: '02:30',
        durationMin: 90,
        taskIds: ['SNT-221'],
      },
    })
    assert(bufferFailSim.body.impact.safetyBufferStatus === 'FAIL', 'TEST 13: 90m task in 90m window exceeds capacity after buffer (FAIL)')

    // TEST 14: Affected train count is deterministic
    const trnCount1 = directTrainOverlap.body.impact.affectedTrains
    const trnCount2 = (await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '07:30',
        end: '08:30',
        durationMin: 60,
        taskIds: [],
      },
    })).body.impact.affectedTrains
    assert(trnCount1 === trnCount2 && trnCount1 >= 1, 'TEST 14: Affected train count is deterministic and >= 1')

    // TEST 15: Simulated delay minutes are calculated deterministically
    // Window: 07:30 - 08:30, Train 12841: 07:40 - 08:05. Overlap = 25 minutes.
    assert(directTrainOverlap.body.impact.simulatedDelayMinutes === 25, 'TEST 15: Simulated delay is exactly 25 minutes (overlap 07:40 to 08:05)')

    // TEST 16: Operational impact classification is deterministic
    assert(directTrainOverlap.body.impact.operationalImpact === 'CRITICAL', 'TEST 16: Blocking conflict classified as CRITICAL')
    assert(clearAltWindow.body.impact.operationalImpact === 'LOW', 'TEST 16: Conflict-free window classified as LOW')

    // TEST 17: Multiple scenarios can be compared via POST /api/what-if/compare
    const compareRes = await request('POST', '/api/what-if/compare', {
      baseline: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: testDate,
        start: '07:30',
        end: '08:30',
        durationMin: 60,
        taskIds: [],
      },
      scenarios: [
        {
          scenarioName: 'Scenario A (Midday)',
          corridorId: 'C01',
          section: 'HWH–SRC',
          date: testDate,
          start: '14:00',
          end: '15:30',
          durationMin: 90,
          taskIds: [],
        },
        {
          scenarioName: 'Scenario B (Night)',
          corridorId: 'C01',
          section: 'HWH–SRC',
          date: testDate,
          start: '01:00',
          end: '03:00',
          durationMin: 120,
          taskIds: [],
        },
      ],
    })
    assert(compareRes.status === 200, 'TEST 17: POST /api/what-if/compare returns 200 OK')
    assert(compareRes.body.baseline !== undefined, 'TEST 17: Comparison contains baseline')
    assert(compareRes.body.scenarios.length === 2, 'TEST 17: Comparison contains both alternative scenarios')
    assert(compareRes.body.scenarios[0].scenario.scenarioName === 'Scenario A (Midday)', 'TEST 17: Scenario A correctly labeled')

    // TEST 18: Different corridors remain isolated
    const c02Sim = await request('POST', '/api/what-if/simulate', {
      scenario: {
        corridorId: 'C02',
        section: 'BLS–CTC',
        date: testDate,
        start: '01:00',
        end: '03:00',
        durationMin: 120,
        taskIds: [],
      },
    })
    assert(c02Sim.body.scenario.corridorId === 'C02', 'TEST 18: Corridor C02 simulation isolated from C01')

    // TEST 19: Invalid scenario input returns validation error (400)
    const invalidRes1 = await request('POST', '/api/what-if/simulate', {})
    assert(invalidRes1.status === 400, 'TEST 19: Missing scenario returns 400')
    const invalidRes2 = await request('POST', '/api/what-if/simulate', {
      scenario: { corridorId: 'C01' }, // Missing start/end
    })
    assert(invalidRes2.status === 400, 'TEST 19: Missing start/end times returns 400')

    console.log('\n========================================================')
    console.log(`📊 Phase 5 Direct Tests: ${passed} Passed, ${failed} Failed`)
    console.log('========================================================\n')

    if (failed > 0) {
      process.exit(1)
    }

    // Regressions: Phase 1, Phase 2, Phase 3, Phase 4
    console.log('--- Running Phase 1 Regression Tests (test_all_endpoints.js) ---')
    execSync('node test_all_endpoints.js', { stdio: 'inherit', cwd: __dirname })
    console.log('  ✅ PASS: TEST 20: Phase 1 regression tests passed.\n')

    console.log('--- Running Phase 2 Regression Tests (test_phase2_planner.js) ---')
    execSync('node test_phase2_planner.js', { stdio: 'inherit', cwd: __dirname })
    console.log('  ✅ PASS: TEST 21: Phase 2 regression tests passed.\n')

    console.log('--- Running Phase 3 Regression Tests (test_phase3_conflicts.js) ---')
    execSync('node test_phase3_conflicts.js', { stdio: 'inherit', cwd: __dirname })
    console.log('  ✅ PASS: TEST 22: Phase 3 regression tests passed.\n')

    console.log('--- Running Phase 4 Regression Tests (test_phase4_network.js) ---')
    execSync('node test_phase4_network.js', { stdio: 'inherit', cwd: __dirname })
    console.log('  ✅ PASS: TEST 23: Phase 4 regression tests passed.\n')

    console.log('========================================================')
    console.log('🎉 ALL 23 PHASE 5 TESTS & REGRESSIONS PASSED!')
    console.log('========================================================')
  } catch (err) {
    console.error('Unhandled error in Phase 5 tests:', err)
    process.exit(1)
  }
}

runTests()
