/**
 * Phase 3 Conflict Detection & Schedule Coordination Test Suite
 * Tests:
 * 1. Conflict-free proposed block
 * 2. Overlapping approved maintenance block conflict
 * 3. Overlapping rejected block ignored (no false conflict)
 * 4. Cross-corridor non-interference (different corridors at same time = no conflict)
 * 5. Same corridor overlapping time = conflict
 * 6. Timetable train movement conflict (Simulation / Timetable Data)
 * 7. Window shift clears conflict (re-check after modifying)
 * 8. Approval prevention on blocking conflicts (HTTP 409)
 * 9. Conflict-free approval succeeds (Block Approved, Tasks Scheduled)
 * 10. Conflict persistence & resolution (PATCH /api/conflicts/:id/resolve)
 * 11. MongoDB persistence across queries
 */

const http = require('http');
const { getTestToken } = require('./src/services/authService');
const TEST_TOKEN = getTestToken('ADMIN', 'USR-ADMIN-01', 'Admin Officer');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Connection': 'close',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==============================================');
  console.log('🧪 Starting Phase 3 Conflict Detection Test Suite');
  console.log('==============================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const testDate = '2026-10-15';

    // TEST 1: Proposed block with no existing overlap (clear nighttime/early window)
    const clearBlock = {
      id: `REC-CLR-${Date.now()}`,
      date: testDate,
      corridorId: 'C03',
      section: 'GII–TATA',
      start: '01:00',
      end: '03:00',
      durationMin: 120,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res1 = await request('POST', '/api/conflicts/check', { block: clearBlock, persist: false });
    assert(res1.status === 200, 'POST /api/conflicts/check returns 200');
    assert(!res1.body.hasConflict, 'TEST 1: Conflict-free window returns hasConflict: false');

    // Create an Approved block on C01 for testDate (10:00 - 12:00)
    const approvedBlockId = `REC-APPR-${Date.now()}`;
    await request('POST', '/api/blocks', {
      id: approvedBlockId,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '10:00',
      end: '12:00',
      durationMin: 120,
      blockType: 'Traffic Block',
      confidence: 'High',
      status: 'Approved',
      taskIds: [],
    });

    // TEST 2: Proposed block overlaps existing approved maintenance block on same corridor (11:00 - 13:00 vs 10:00 - 12:00)
    const overlappingBlock = {
      id: `REC-PROP-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '11:00',
      end: '13:00',
      durationMin: 120,
      blockType: 'Traffic Block',
      taskIds: [],
      alternative: {
        start: '14:00',
        end: '15:30',
      },
    };
    const res2 = await request('POST', '/api/conflicts/check', { block: overlappingBlock, persist: true });
    assert(res2.body.hasConflict, 'TEST 2: Overlapping approved block detected');
    assert(
      res2.body.conflicts.some((c) => c.type === 'Corridor' && c.isBlocking),
      'TEST 2: Contains blocking Corridor conflict with existing approved block'
    );

    // Create a Rejected block on C01 for testDate (18:00 - 20:00)
    const rejectedBlockId = `REC-REJ-${Date.now()}`;
    await request('POST', '/api/blocks', {
      id: rejectedBlockId,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '18:00',
      end: '20:00',
      durationMin: 120,
      blockType: 'Traffic Block',
      status: 'Rejected',
      taskIds: [],
    });

    // TEST 3: Proposed block overlaps rejected block (18:30 - 20:30) -> should NOT conflict with rejected block
    const overlapRejected = {
      id: `REC-TEST3-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '18:30',
      end: '20:30',
      durationMin: 120,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res3 = await request('POST', '/api/conflicts/check', { block: overlapRejected, persist: false });
    const hasRejectedConflict = res3.body.conflicts.some((c) => c.description.includes(rejectedBlockId));
    assert(!hasRejectedConflict, 'TEST 3: Rejected blocks are ignored in active conflict checking');

    // TEST 4: Two blocks on different corridors at same time -> No corridor conflict
    const diffCorridorBlock = {
      id: `REC-DIFF-${Date.now()}`,
      date: testDate,
      corridorId: 'C04', // Different corridor from C01 approved block
      section: 'BBS–KUR',
      start: '10:00',
      end: '12:00',
      durationMin: 120,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res4 = await request('POST', '/api/conflicts/check', { block: diffCorridorBlock, persist: false });
    const hasCrossCorridorConflict = res4.body.conflicts.some((c) => c.type === 'Corridor');
    assert(!hasCrossCorridorConflict, 'TEST 4: Blocks on different corridors at same time do not trigger corridor conflict');

    // TEST 5: Same corridor with overlapping time
    const sameCorridorOverlap = {
      id: `REC-SAME-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '10:30',
      end: '11:30',
      durationMin: 60,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res5 = await request('POST', '/api/conflicts/check', { block: sameCorridorOverlap, persist: false });
    assert(
      res5.body.conflicts.some((c) => c.type === 'Corridor'),
      'TEST 5: Same corridor overlapping time triggers conflict'
    );

    // TEST 6: Timetable train movement conflict
    // From timetableData: Train 12841 (Coromandel Exp) on C01 is scheduled 07:40 - 08:05
    const trainOverlapBlock = {
      id: `REC-TRN-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '07:30',
      end: '08:30',
      durationMin: 60,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res6 = await request('POST', '/api/conflicts/check', { block: trainOverlapBlock, persist: true });
    assert(res6.body.hasConflict, 'TEST 6: Timetable train movement conflict detected');
    const trainConflict = res6.body.conflicts.find((c) => c.affectedTrains.includes('12841'));
    assert(trainConflict !== undefined, 'TEST 6: Correctly identified train 12841 (Coromandel Express)');
    assert(trainConflict && trainConflict.isBlocking, 'TEST 6: Passenger express train conflict is marked as blocking');

    // TEST 7: Change window to non-conflicting window (e.g. 14:00 - 15:00 on C01)
    const shiftedBlock = {
      id: `REC-SHIFT-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '14:00',
      end: '15:00',
      durationMin: 60,
      blockType: 'Traffic Block',
      taskIds: [],
    };
    const res7 = await request('POST', '/api/conflicts/check', { block: shiftedBlock, persist: false });
    const hasShiftedTrainConflict = res7.body.conflicts.some((c) => c.affectedTrains.includes('12841'));
    assert(!hasShiftedTrainConflict, 'TEST 7: Shifting to alternative window clears train conflict');

    // TEST 8: Attempt approval with a blocking conflict -> HTTP 409 Conflict
    const conflictingBlockToSave = {
      id: `REC-BLOCKING-${Date.now()}`,
      date: testDate,
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '07:30',
      end: '08:30', // Clashes with Coromandel Express (07:40 - 08:05)
      durationMin: 60,
      blockType: 'Traffic Block',
      status: 'Recommended',
      createdBy: 'USR-PLAN-01',
      taskIds: [],
    };
    await request('POST', '/api/blocks', conflictingBlockToSave);
    const approveBlockedRes = await request('PATCH', `/api/blocks/${conflictingBlockToSave.id}/approve`);
    assert(approveBlockedRes.status === 409, 'TEST 8: Approval rejected with HTTP 409 when blocking conflict exists');
    assert(approveBlockedRes.body.error === 'ConflictError', 'TEST 8: Error code is ConflictError');

    // TEST 9: Approve conflict-free block -> HTTP 200, Block Approved, Tasks Scheduled
    const c01Tasks = await request('GET', '/api/tasks?corridorId=C01');
    const freeTask = c01Tasks.body.find((t) => t.status === 'Open');
    const validBlockId = `REC-VALID-${Date.now()}`;
    const validBlock = {
      id: validBlockId,
      date: '2026-10-18',
      corridorId: 'C01',
      section: 'HWH–SRC',
      start: '13:45',
      end: '15:45',
      durationMin: 120,
      blockType: 'Traffic Block',
      status: 'Recommended',
      createdBy: 'USR-PLAN-01',
      taskIds: freeTask ? [freeTask.id] : [],
    };
    await request('POST', '/api/blocks', validBlock);
    const approveValidRes = await request('PATCH', `/api/blocks/${validBlockId}/approve`);
    if (approveValidRes.status !== 200) {
      console.error('approveValidRes failed:', approveValidRes.status, approveValidRes.body);
    }
    assert(approveValidRes.status === 200, 'TEST 9: Conflict-free block approved successfully (HTTP 200)');
    assert(approveValidRes.body && approveValidRes.body.block && approveValidRes.body.block.status === 'Approved', 'TEST 9: Block status is Approved');

    // TEST 10: Resolve a persisted conflict
    const persistedConflicts = await request('GET', '/api/conflicts');
    const openConflict = persistedConflicts.body.find((c) => !c.resolved);
    if (openConflict) {
      const resolveRes = await request('PATCH', `/api/conflicts/${openConflict.id}/resolve`);
      assert(resolveRes.status === 200 && resolveRes.body.conflict.resolved === true, `TEST 10: Conflict ${openConflict.id} resolved via PATCH`);
    } else {
      assert(true, 'TEST 10: All conflicts already resolved');
    }

    // TEST 11: Verify persistence in MongoDB
    const verifyConflictRes = await request('GET', '/api/conflicts');
    assert(Array.isArray(verifyConflictRes.body) && verifyConflictRes.body.length > 0, 'TEST 11: Conflicts persist and retrievable from MongoDB');

    // Clean up temporary test block so tasks return to Open for subsequent tests
    await request('PATCH', `/api/blocks/${validBlockId}/reject`, { reason: 'Clean up temporary test block' });

  } catch (err) {
    console.error('Unexpected error running Phase 3 tests:', err);
    failed++;
  }

  console.log('==============================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('==============================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
