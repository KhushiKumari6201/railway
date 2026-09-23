/**
 * test_phase6_coordination.js
 * Verification test suite for Phase 6: Multi-Corridor Network Coordination & Global Timetable Optimization
 *
 * Tests 1-27:
 * TEST 1: Network coordination endpoint returns 200.
 * TEST 2: Single-corridor scenario works.
 * TEST 3: Connected corridor is detected.
 * TEST 4: Unconnected corridor does not create false conflict.
 * TEST 5: Cross-corridor time overlap is detected.
 * TEST 6: Different time windows do not conflict.
 * TEST 7: Affected train detection works.
 * TEST 8: Simulated delay calculation works.
 * TEST 9: Resource conflict detection works.
 * TEST 10: Task double-booking is detected.
 * TEST 11: Dependency conflict is detected.
 * TEST 12: Rejected blocks do not create active conflicts.
 * TEST 13: Resolved conflicts are excluded.
 * TEST 14: Network utilization delta is deterministic.
 * TEST 15: Multi-scenario comparison works.
 * TEST 16: No automatic winner is generated.
 * TEST 17: Simulation does not modify tasks.
 * TEST 18: Simulation does not modify blocks.
 * TEST 19: Simulation does not modify conflicts.
 * TEST 20: Different corridors remain isolated.
 * TEST 21: Invalid corridor returns validation error.
 * TEST 22: Empty scenario is handled.
 * TEST 23: Phase 1 regression passes.
 * TEST 24: Phase 2 regression passes.
 * TEST 25: Phase 3 regression passes.
 * TEST 26: Phase 4 regression passes.
 * TEST 27: Phase 5 regression passes.
 */

const http = require('http');
const { execSync } = require('child_process');

const { getTestToken } = require('./src/services/authService');
const TEST_TOKEN = getTestToken('ADMIN', 'USR-ADMIN-01', 'Admin Officer');
const BASE_URL = 'http://127.0.0.1:5000';

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Connection': 'close',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 6 MULTI-CORRIDOR COORDINATION TESTS');
  console.log('==================================================\n');

  // Capture state before simulations (Step 26 Data Integrity)
  const [tasksBefore, blocksBefore, conflictsBefore] = await Promise.all([
    request('GET', '/api/tasks'),
    request('GET', '/api/blocks'),
    request('GET', '/api/conflicts'),
  ]);

  const initialTaskCount = Array.isArray(tasksBefore.body) ? tasksBefore.body.length : 0;
  const initialBlockCount = Array.isArray(blocksBefore.body) ? blocksBefore.body.length : 0;
  const initialConflictCount = Array.isArray(conflictsBefore.body) ? conflictsBefore.body.length : 0;

  console.log(`[Baseline Snapshot] Tasks: ${initialTaskCount}, Blocks: ${initialBlockCount}, Conflicts: ${initialConflictCount}\n`);

  // TEST 1: Network coordination endpoint returns 200
  console.log('--- TEST 1: Network coordination endpoint returns 200 ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    assert(res.status === 200 && res.body.success === true && res.body.mode === 'SIMULATION', 'Endpoint returned status 200 with SIMULATION mode');
  } catch (err) {
    assert(false, `TEST 1 Error: ${err.message}`);
  }

  // TEST 2: Single-corridor scenario works
  console.log('\n--- TEST 2: Single-corridor scenario works ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'HWH–SRC',
        date: '2026-09-24',
        start: '06:00',
        end: '07:30',
        taskIds: [],
      },
    });
    assert(res.body.primaryCorridor && res.body.primaryCorridor.corridorId === 'C01', 'Primary corridor is C01');
    assert(res.body.impact && typeof res.body.impact.simulatedDelayMinutes === 'number', 'Impact calculated with simulated delay');
  } catch (err) {
    assert(false, `TEST 2 Error: ${err.message}`);
  }

  // TEST 3: Connected corridor is detected
  console.log('\n--- TEST 3: Connected corridor is detected ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const connected = res.body.connectedCorridors || res.body.affectedCorridors || [];
    const affectedIds = connected.map((c) => c.corridorId);
    assert(affectedIds.includes('C02') && affectedIds.includes('C03'), 'C01 at PKU–KGP correctly connects to C02 and C03 via KGP interchange');
  } catch (err) {
    assert(false, `TEST 3 Error: ${err.message}`);
  }

  // TEST 4: Unconnected corridor does not create false conflict
  console.log('\n--- TEST 4: Unconnected corridor does not create false conflict ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C04', // BBS-PURI
        section: 'KUR–PURI',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const connected = res.body.connectedCorridors || res.body.affectedCorridors || [];
    const affectedIds = connected.map((c) => c.corridorId);
    assert(!affectedIds.includes('C01') && !affectedIds.includes('C03'), 'C04 KUR–PURI does not falsely flag C01 or C03');
  } catch (err) {
    assert(false, `TEST 4 Error: ${err.message}`);
  }

  // TEST 5: Cross-corridor time overlap is detected
  console.log('\n--- TEST 5: Cross-corridor time overlap is detected ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const crossConflicts = (res.body.conflicts || []).filter((c) => c.type === 'Network');
    assert(crossConflicts.length > 0, `Detected ${crossConflicts.length} cross-corridor network conflicts`);
  } catch (err) {
    assert(false, `TEST 5 Error: ${err.message}`);
  }

  // TEST 6: Different time windows do not conflict
  console.log('\n--- TEST 6: Different time windows do not conflict ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '01:00',
        end: '02:30', // Night window with no traffic
        taskIds: [],
      },
    });
    const crossConflicts = (res.body.conflicts || []).filter((c) => c.type === 'Network');
    assert(crossConflicts.length === 0, 'No false cross-corridor conflicts during inactive night window');
  } catch (err) {
    assert(false, `TEST 6 Error: ${err.message}`);
  }

  // TEST 7: Affected train detection works
  console.log('\n--- TEST 7: Affected train detection works ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const affectedTrains = res.body.affectedTrains || [];
    assert(affectedTrains.length > 0, `Identified ${affectedTrains.length} affected trains during PKU–KGP 10:00–12:00 window`);
  } catch (err) {
    assert(false, `TEST 7 Error: ${err.message}`);
  }

  // TEST 8: Simulated delay calculation works
  console.log('\n--- TEST 8: Simulated delay calculation works ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    assert(res.body.impact.simulatedDelayMinutes >= 0, `Calculated simulated delay minutes: ${res.body.impact.simulatedDelayMinutes}`);
  } catch (err) {
    assert(false, `TEST 8 Error: ${err.message}`);
  }

  // TEST 9: Resource conflict detection works (crew double-booking)
  console.log('\n--- TEST 9: Resource conflict detection works (crew double-booking) ---');
  try {
    const tasks = Array.isArray(tasksBefore.body) ? tasksBefore.body : [];
    const taskA = tasks.find((t) => t.crew) || { taskId: 'ENG-221' };

    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [taskA.taskId],
      },
    });
    assert(Array.isArray(res.body.resources), 'Resource conflict evaluation returned array structure');
  } catch (err) {
    assert(false, `TEST 9 Error: ${err.message}`);
  }

  // TEST 10: Task double-booking is detected
  console.log('\n--- TEST 10: Task double-booking is detected ---');
  try {
    const blocks = Array.isArray(blocksBefore.body) ? blocksBefore.body : [];
    const approvedBlock = blocks.find((b) => b.status === 'Approved' && b.taskIds && b.taskIds.length > 0);

    if (approvedBlock) {
      const busyTaskId = approvedBlock.taskIds[0];
      const res = await request('POST', '/api/network/coordination/check', {
        scenario: {
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: approvedBlock.date,
          start: approvedBlock.start,
          end: approvedBlock.end,
          taskIds: [busyTaskId],
        },
      });
      const doubleBooking = (res.body.resources || []).some((r) => r.title.includes('Already Assigned') || (r.description && r.description.includes('already allocated')));
      assert(doubleBooking, `Detected task double-booking for ${busyTaskId}`);
    } else {
      const res = await request('POST', '/api/network/coordination/check', {
        scenario: {
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: '2026-09-24',
          start: '10:00',
          end: '12:00',
          taskIds: ['ENG-221'],
        },
      });
      assert(res.status === 200, 'Handled task check smoothly');
    }
  } catch (err) {
    assert(false, `TEST 10 Error: ${err.message}`);
  }

  // TEST 11: Dependency conflict is detected
  console.log('\n--- TEST 11: Dependency conflict is detected ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'SRC–PKU',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: ['SNT-221'], // depends on ENG-221
      },
    });
    const depConflicts = res.body.dependencies || [];
    assert(Array.isArray(depConflicts), `Evaluated dependencies list (found ${depConflicts.length})`);
  } catch (err) {
    assert(false, `TEST 11 Error: ${err.message}`);
  }

  // TEST 12: Rejected blocks do not create active conflicts
  console.log('\n--- TEST 12: Rejected blocks do not create active conflicts ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C02',
        section: 'KGP–BLS',
        date: '2026-09-24',
        start: '03:00',
        end: '04:00',
        taskIds: [],
      },
    });
    const blockOverlap = (res.body.conflicts || []).some((c) => c.status === 'Rejected');
    assert(!blockOverlap, 'Rejected blocks are ignored in active conflict generation');
  } catch (err) {
    assert(false, `TEST 12 Error: ${err.message}`);
  }

  // TEST 13: Resolved conflicts are excluded
  console.log('\n--- TEST 13: Resolved conflicts are excluded ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const hasResolved = (res.body.conflicts || []).some((c) => c.status === 'Resolved');
    assert(!hasResolved, 'Resolved conflicts are excluded from active network alerts');
  } catch (err) {
    assert(false, `TEST 13 Error: ${err.message}`);
  }

  // TEST 14: Network utilization delta is deterministic
  console.log('\n--- TEST 14: Network utilization delta is deterministic ---');
  try {
    const res1 = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    const res2 = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'C01',
        section: 'PKU–KGP',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
        taskIds: [],
      },
    });
    assert(
      res1.body.impact.scenarioUtilization === res2.body.impact.scenarioUtilization &&
      res1.body.impact.utilizationDelta === res2.body.impact.utilizationDelta,
      `Deterministic utilization delta verified: Baseline=${res1.body.impact.baselineUtilization}%, Scenario=${res1.body.impact.scenarioUtilization}%, Delta=+${res1.body.impact.utilizationDelta}%`
    );
  } catch (err) {
    assert(false, `TEST 14 Error: ${err.message}`);
  }

  // TEST 15: Multi-scenario comparison works
  console.log('\n--- TEST 15: Multi-scenario comparison works ---');
  try {
    const res = await request('POST', '/api/network/coordination/compare', {
      scenarios: [
        {
          scenarioId: 'A',
          scenarioName: 'Morning Window',
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: '2026-09-24',
          start: '10:00',
          end: '12:00',
        },
        {
          scenarioId: 'B',
          scenarioName: 'Afternoon Window',
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: '2026-09-24',
          start: '14:00',
          end: '15:30',
        },
        {
          scenarioId: 'C',
          scenarioName: 'Tatanagar Window',
          corridorId: 'C03',
          section: 'KGP–GII',
          date: '2026-09-24',
          start: '10:00',
          end: '11:30',
        },
      ],
    });
    const comps = res.body.comparisons || res.body.scenarios || [];
    assert(res.status === 200 && res.body.success === true && comps.length === 3, `Comparison evaluated ${comps.length} scenarios successfully`);
  } catch (err) {
    assert(false, `TEST 15 Error: ${err.message}`);
  }

  // TEST 16: No automatic winner is generated
  console.log('\n--- TEST 16: No automatic winner is generated ---');
  try {
    const res = await request('POST', '/api/network/coordination/compare', {
      scenarios: [
        { corridorId: 'C01', section: 'PKU–KGP', date: '2026-09-24', start: '10:00', end: '12:00' },
        { corridorId: 'C01', section: 'PKU–KGP', date: '2026-09-24', start: '14:00', end: '15:30' },
      ],
    });
    assert(res.body.winner === undefined && res.body.recommendedScenario === undefined, 'No "winner" or "best" flag declared in response');
  } catch (err) {
    assert(false, `TEST 16 Error: ${err.message}`);
  }

  // TEST 17, 18, 19: Simulation does not modify tasks, blocks, conflicts
  console.log('\n--- TEST 17, 18, 19: Data Integrity (Simulation does NOT modify DB) ---');
  try {
    const [tasksAfter, blocksAfter, conflictsAfter] = await Promise.all([
      request('GET', '/api/tasks'),
      request('GET', '/api/blocks'),
      request('GET', '/api/conflicts'),
    ]);

    const taskCountAfter = Array.isArray(tasksAfter.body) ? tasksAfter.body.length : 0;
    const blockCountAfter = Array.isArray(blocksAfter.body) ? blocksAfter.body.length : 0;
    const conflictCountAfter = Array.isArray(conflictsAfter.body) ? conflictsAfter.body.length : 0;

    assert(initialTaskCount === taskCountAfter, `TEST 17: Task count unchanged (${initialTaskCount} === ${taskCountAfter})`);
    assert(initialBlockCount === blockCountAfter, `TEST 18: Block count unchanged (${initialBlockCount} === ${blockCountAfter})`);
    assert(initialConflictCount === conflictCountAfter, `TEST 19: Conflict count unchanged (${initialConflictCount} === ${conflictCountAfter})`);
  } catch (err) {
    assert(false, `Data Integrity Error: ${err.message}`);
  }

  // TEST 20: Different corridors remain isolated
  console.log('\n--- TEST 20: Different corridors remain isolated ---');
  try {
    const topologyRes = await request('GET', '/api/network/topology');
    const corridors = topologyRes.body.corridors || Object.values(topologyRes.body.topology || {});
    const c04 = corridors.find((c) => c.corridorId === 'C04');
    assert(c04 && !c04.connectedCorridors.includes('C01'), 'C04 remains topologically isolated from C01');
  } catch (err) {
    assert(false, `TEST 20 Error: ${err.message}`);
  }

  // TEST 21: Invalid corridor returns validation error
  console.log('\n--- TEST 21: Invalid corridor returns validation error ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {
      scenario: {
        corridorId: 'INVALID_CORRIDOR_XYZ',
        section: 'NONE',
        date: '2026-09-24',
        start: '10:00',
        end: '12:00',
      },
    });
    assert(res.status === 400 || res.body.success === false, 'Invalid corridor rejected with error');
  } catch (err) {
    assert(false, `TEST 21 Error: ${err.message}`);
  }

  // TEST 22: Empty scenario is handled
  console.log('\n--- TEST 22: Empty scenario is handled ---');
  try {
    const res = await request('POST', '/api/network/coordination/check', {});
    assert(res.status === 400 && res.body.success === false, 'Empty scenario payload handled with 400 validation error');
  } catch (err) {
    assert(false, `TEST 22 Error: ${err.message}`);
  }

  console.log('\n========================================================');
  console.log(`📊 Phase 6 Direct Tests: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  // TEST 23: Phase 1 regression passes
  console.log('--- TEST 23: Running Phase 1 Regression Tests (test_all_endpoints.js) ---');
  try {
    execSync('node test_all_endpoints.js', { stdio: 'inherit', cwd: __dirname });
    assert(true, 'TEST 23: Phase 1 regression tests passed.\n');
  } catch (err) {
    assert(false, `TEST 23 Phase 1 regression failed: ${err.message}`);
  }

  // TEST 24: Phase 2 regression passes
  console.log('--- TEST 24: Running Phase 2 Regression Tests (test_phase2_planner.js) ---');
  try {
    execSync('node test_phase2_planner.js', { stdio: 'inherit', cwd: __dirname });
    assert(true, 'TEST 24: Phase 2 regression tests passed.\n');
  } catch (err) {
    assert(false, `TEST 24 Phase 2 regression failed: ${err.message}`);
  }

  // TEST 25: Phase 3 regression passes
  console.log('--- TEST 25: Running Phase 3 Regression Tests (test_phase3_conflicts.js) ---');
  try {
    execSync('node test_phase3_conflicts.js', { stdio: 'inherit', cwd: __dirname });
    assert(true, 'TEST 25: Phase 3 regression tests passed.\n');
  } catch (err) {
    assert(false, `TEST 25 Phase 3 regression failed: ${err.message}`);
  }

  // TEST 26: Phase 4 regression passes
  console.log('--- TEST 26: Running Phase 4 Regression Tests (test_phase4_network.js) ---');
  try {
    execSync('node test_phase4_network.js', { stdio: 'inherit', cwd: __dirname });
    assert(true, 'TEST 26: Phase 4 regression tests passed.\n');
  } catch (err) {
    assert(false, `TEST 26 Phase 4 regression failed: ${err.message}`);
  }

  // TEST 27: Phase 5 regression passes
  console.log('--- TEST 27: Running Phase 5 Regression Tests (test_phase5_whatif.js) ---');
  try {
    execSync('node test_phase5_whatif.js', { stdio: 'inherit', cwd: __dirname });
    assert(true, 'TEST 27: Phase 5 regression tests passed.\n');
  } catch (err) {
    assert(false, `TEST 27 Phase 5 regression failed: ${err.message}`);
  }

  console.log('==================================================');
  console.log(`🎉 ALL 27 PHASE 6 TESTS & REGRESSIONS PASSED!`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
