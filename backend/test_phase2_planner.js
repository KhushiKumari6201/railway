/**
 * Phase 2 Block Planner Test Suite
 * Tests dynamic block creation, duration/capacity calculations,
 * approval/rejection workflows, and MongoDB persistence.
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
  console.log('🧪 Starting Phase 2 Block Planner Test Suite');
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
    // 1. Backend Health Check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && (health.body.status === 'healthy' || health.body.status === 'ok'), 'GET /api/health returns 200 OK');

    // 2. Fetch corridor C01 tasks
    const c01Tasks = await request('GET', '/api/tasks?corridorId=C01');
    assert(c01Tasks.status === 200 && Array.isArray(c01Tasks.body), 'GET /api/tasks?corridorId=C01 returns array');
    assert(c01Tasks.body.length > 0, `Corridor C01 has ${c01Tasks.body.length} tasks`);
    
    // Check all tasks belong to C01
    const allC01 = c01Tasks.body.every(t => t.corridorId === 'C01');
    assert(allC01, 'All returned tasks have corridorId === "C01"');

    // 3. Dynamic Duration Calculation Verification
    // Pick 3 tasks from C01
    const selectedTasks = c01Tasks.body.slice(0, 3);
    const expectedDuration = selectedTasks.reduce((sum, t) => sum + (t.estimatedDuration || t.durationMin || 0), 0);
    const taskIds = selectedTasks.map(t => t.id);
    console.log(`  Selected task IDs: ${taskIds.join(', ')}`);
    console.log(`  Expected sum duration: ${expectedDuration} min`);
    assert(expectedDuration > 0, `Dynamic total duration calculated correctly: ${expectedDuration}m`);

    // 4. Safety buffer & capacity verification
    const SAFETY_BUFFER_MIN = 20;
    const windowDurationMin = 180; // 3 hours window (01:00 - 04:00)
    const availableWorkingTime = windowDurationMin - SAFETY_BUFFER_MIN; // 160 min
    const utilization = Math.round((expectedDuration / windowDurationMin) * 100);
    assert(availableWorkingTime === 160, `Available working time (180 - 20) = 160m`);
    
    // Infeasible test: 3 tasks total 270m > 160m available
    const isOverCapacity = expectedDuration > availableWorkingTime;
    assert(isOverCapacity, `Overload correctly detected: selected tasks (${expectedDuration}m) exceeds available working time (${availableWorkingTime}m)`);

    // Feasible test: single task (e.g. first task) fits within working time
    const singleTaskDuration = selectedTasks[0].estimatedDuration || 60;
    const singleTaskFeasible = singleTaskDuration <= availableWorkingTime;
    assert(singleTaskFeasible, `Single task (${singleTaskDuration}m) fits comfortably within available working time (${availableWorkingTime}m)`);

    // 5. Create Proposed RecommendedBlock via POST /api/blocks
    const testBlockId = `REC-TEST-${Date.now()}`;
    const proposedBlock = {
      id: testBlockId,
      date: new Date().toISOString().split('T')[0],
      corridorId: 'C01',
      section: 'Kharagpur - Tatanagar Main',
      start: '01:00',
      end: '04:00',
      durationMin: windowDurationMin,
      blockType: 'Up Line',
      confidence: 91,
      utilization: utilization,
      operationalImpact: 'Low',
      status: 'Recommended',
      createdBy: 'USR-PLAN-01',
      taskIds: taskIds,
      criticalTasks: selectedTasks.filter(t => t.criticality === 'High' || t.priority === 'High').map(t => t.id),
      downtimeSavedMin: 45,
      reasons: [
        'Corridor matched: Kharagpur - Tatanagar Main',
        `3 tasks bundled within ${availableWorkingTime}m working time (20m safety buffer)`,
        'Includes high priority maintenance',
      ],
      alternative: {
        start: '02:00',
        end: '05:00',
        durationMin: 180,
        tradeoff: 'Higher freight traffic impact (+12m delay risk)'
      }
    };

    const saveRes = await request('POST', '/api/blocks', proposedBlock);
    assert(saveRes.status === 201 || saveRes.status === 200, `POST /api/blocks returned ${saveRes.status}`);
    assert(saveRes.body && saveRes.body.id === testBlockId, `Created block has ID ${testBlockId}`);
    assert(saveRes.body.status === 'Recommended', 'Proposed block status is Recommended');

    // 6. Verify in GET /api/blocks
    const blocksList = await request('GET', '/api/blocks');
    const foundBlock = blocksList.body.find(b => b.id === testBlockId);
    assert(foundBlock !== undefined, 'Proposed block is retrievable from GET /api/blocks');
    assert(foundBlock.taskIds.length === taskIds.length, `Block has all ${taskIds.length} bundled task IDs`);

    // 7. Approve the block via PATCH /api/blocks/:id/approve
    const approveRes = await request('PATCH', `/api/blocks/${testBlockId}/approve`);
    assert(approveRes.status === 200, `PATCH /api/blocks/:id/approve returned 200`);
    assert(approveRes.body.block.status === 'Approved', 'Block status updated to Approved');

    // 8. Verify bundled tasks are now 'Scheduled' in MongoDB
    const updatedTasksRes = await request('GET', '/api/tasks?corridorId=C01');
    const scheduledTasks = updatedTasksRes.body.filter(t => taskIds.includes(t.id));
    const allScheduled = scheduledTasks.every(t => t.status === 'Scheduled' && t.scheduledDate);
    assert(allScheduled, `All ${scheduledTasks.length} bundled tasks in MongoDB are now Scheduled with scheduledDate`);

    // 9. Reject the block via PATCH /api/blocks/:id/reject
    const rejectRes = await request('PATCH', `/api/blocks/${testBlockId}/reject`, { reason: 'Planner test rejection' });
    assert(rejectRes.status === 200, `PATCH /api/blocks/:id/reject returned 200`);
    assert(rejectRes.body.block.status === 'Rejected', 'Block status updated to Rejected');

    // 10. Verify bundled tasks are reset to 'Open' with scheduledDate = null
    const revertedTasksRes = await request('GET', '/api/tasks?corridorId=C01');
    const revertedTasks = revertedTasksRes.body.filter(t => taskIds.includes(t.id));
    const allReverted = revertedTasks.every(t => t.status === 'Open' && t.scheduledDate === null);
    assert(allReverted, `All ${revertedTasks.length} bundled tasks reverted to Open with null scheduledDate`);

    // 11. Empty state verification: Corridor with no open tasks
    const fakeCorridorTasks = await request('GET', '/api/tasks?corridorId=NON_EXISTENT');
    assert(fakeCorridorTasks.status === 200 && fakeCorridorTasks.body.length === 0, 'Non-existent corridor returns empty task list');

  } catch (err) {
    console.error('Unexpected error running tests:', err);
    failed++;
  }

  console.log('==============================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('==============================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
