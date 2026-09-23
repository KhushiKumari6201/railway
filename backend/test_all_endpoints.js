const http = require('http')
const { getTestToken } = require('./src/services/authService')

const BASE_URL = 'http://127.0.0.1:5000'
const TEST_TOKEN = getTestToken('ADMIN', 'USR-ADMIN-01', 'Admin Officer')

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
        ...headers,
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, headers: res.headers, body: json })
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data })
        }
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function run() {
  console.log('========================================================')
  console.log('🧪 Starting RailSanket Phase 1 Comprehensive Test Suite')
  console.log('========================================================\n')

  let passed = 0
  let failed = 0

  async function assertTest(name, fn) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name} -> ${err.message}`)
      failed++
    }
  }

  // 1. Health Check
  await assertTest('GET /api/health returns 200 and database connected', async () => {
    const res = await request('GET', '/api/health')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (res.body.database !== 'connected') throw new Error(`Database not connected: ${res.body.database}`)
  })

  // 2. Security Check on Force Seed
  await assertTest('POST /api/seed?force=true rejected without confirmation', async () => {
    const res = await request('POST', '/api/seed?force=true')
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`)
    if (res.body.error !== 'ConfirmationRequired') throw new Error(`Expected ConfirmationRequired error`)
  })

  // 3. GET /api/tasks
  await assertTest('GET /api/tasks returns all tasks with correct schema', async () => {
    const res = await request('GET', '/api/tasks')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (!Array.isArray(res.body) || res.body.length === 0) throw new Error('Tasks array empty or invalid')
  })

  // 4. GET /api/tasks/:id
  await assertTest('GET /api/tasks/ENG-221 returns specific task', async () => {
    const res = await request('GET', '/api/tasks/ENG-221')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (res.body.id !== 'ENG-221') throw new Error(`Expected task ENG-221, got ${res.body.id}`)
  })

  // 5. POST /api/tasks (Create test task)
  const testTaskId = `TST-${Date.now()}`
  const testTask = {
    id: testTaskId,
    sourceSystem: 'TMS',
    department: 'Engineering',
    assetId: 'TRK-9999',
    assetType: 'Track',
    corridorId: 'C01',
    location: 'HWH Yard Test',
    taskType: 'Track fastener ultrasonic test',
    criticality: 'Medium',
    defectSeverity: 60,
    dueDate: '2026-09-30',
    overdueDays: 0,
    estimatedDuration: 90,
    requiredBlockType: 'Traffic Block',
    crew: 'PWay Test Gang',
    dependencies: [],
    priority: 65,
  }

  await assertTest('POST /api/tasks creates task successfully', async () => {
    const res = await request('POST', '/api/tasks', testTask)
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`)
    if (res.body.id !== testTaskId) throw new Error(`Expected ID ${testTaskId}`)
  })

  // 6. Duplicate task ID check (STEP 2: 409 Conflict)
  await assertTest('POST /api/tasks rejects duplicate task ID with 409 Conflict', async () => {
    const res = await request('POST', '/api/tasks', testTask)
    if (res.status !== 409) throw new Error(`Expected status 409 for duplicate ID, got ${res.status}`)
  })

  // 7. PATCH /api/tasks/:id (STEP 3: Validate updates and strip prohibited fields)
  await assertTest(`PATCH /api/tasks/${testTaskId} updates allowed fields and strips _id`, async () => {
    const res = await request('PATCH', `/api/tasks/${testTaskId}`, {
      defectSeverity: 75,
      _id: 'prohibited_mongo_id',
      id: 'prohibited_override_id',
    })
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`)
    if (res.body.defectSeverity !== 75) throw new Error('Field not updated')
    if (res.body.id !== testTaskId) throw new Error('ID field was improperly modified')
  })

  // 8. GET /api/blocks
  await assertTest('GET /api/blocks returns block list', async () => {
    const res = await request('GET', '/api/blocks')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (!Array.isArray(res.body) || res.body.length === 0) throw new Error('Blocks array empty')
  })

  // 9. PATCH /api/blocks/:id/approve
  await assertTest('PATCH /api/blocks/REC-101/approve sets status Approved and schedules bundled tasks', async () => {
    const res = await request('PATCH', '/api/blocks/REC-101/approve')
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`)
    if (res.body.block.status !== 'Approved') throw new Error('Block status not Approved')

    // Verify bundled task ENG-104 became Scheduled with block date
    const taskRes = await request('GET', '/api/tasks/ENG-104')
    if (taskRes.body.status !== 'Scheduled') throw new Error(`Task ENG-104 status should be Scheduled, got ${taskRes.body.status}`)
    if (taskRes.body.scheduledDate !== '2026-09-14') throw new Error(`Task ENG-104 scheduledDate should be 2026-09-14, got ${taskRes.body.scheduledDate}`)
  })

  // 10. PATCH /api/blocks/:id/reject (STEP 7 REVERSION TEST)
  await assertTest('PATCH /api/blocks/REC-101/reject reverts bundled tasks to Open and clears scheduledDate', async () => {
    const res = await request('PATCH', '/api/blocks/REC-101/reject', { reason: 'Operational scheduling rejection test' })
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`)
    if (res.body.block.status !== 'Rejected') throw new Error('Block status not Rejected')

    // Verify bundled task ENG-104 reverted to Open with null scheduledDate
    const taskRes = await request('GET', '/api/tasks/ENG-104')
    if (taskRes.body.status !== 'Open') throw new Error(`Task ENG-104 should be Open, got ${taskRes.body.status}`)
    if (taskRes.body.scheduledDate !== null) throw new Error(`Task ENG-104 scheduledDate should be null, got ${taskRes.body.scheduledDate}`)
  })

  // 11. GET /api/conflicts
  await assertTest('GET /api/conflicts returns conflict list', async () => {
    const res = await request('GET', '/api/conflicts')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (!Array.isArray(res.body) || res.body.length === 0) throw new Error('Conflicts array empty')
  })

  // 12. PATCH /api/conflicts/:id/resolve
  await assertTest('PATCH /api/conflicts/CF-01/resolve marks conflict as resolved', async () => {
    const res = await request('PATCH', '/api/conflicts/CF-01/resolve')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (res.body.conflict.resolved !== true) throw new Error('Conflict CF-01 was not marked resolved')
  })

  // 13. PATCH /api/conflicts/resolve-all
  await assertTest('PATCH /api/conflicts/resolve-all resolves all conflicts atomically', async () => {
    const res = await request('PATCH', '/api/conflicts/resolve-all')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (res.body.success !== true) throw new Error('Response success is not true')
    const anyUnresolved = res.body.conflicts.some((c) => !c.resolved)
    if (anyUnresolved) throw new Error('Some conflicts remain unresolved after resolve-all')
  })

  console.log('\n========================================================')
  console.log(`📊 Final Results: ${passed} Passed, ${failed} Failed`)
  console.log('========================================================')

  process.exit(failed > 0 ? 1 : 0)
}

run()
