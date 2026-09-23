const fs = require('fs')

async function runAudit() {
  const report = []
  const BASE_API = 'http://localhost:5000/api'
  const BASE_FE = 'http://localhost:3000'

  function log(name, success, status, details = '') {
    report.push({ name, success, status, details })
    const icon = success ? '✅' : '❌'
    console.log(`${icon} [${status}] ${name} ${details ? '- ' + details : ''}`)
  }

  let authToken = ''

  // 1. Health
  try {
    const res = await fetch(`${BASE_API}/health`)
    const data = await res.json()
    log('GET /api/health', res.ok && data.database === 'connected', res.status, `DB: ${data.database}`)
  } catch (e) {
    log('GET /api/health', false, 0, e.message)
  }

  // 2. Auth Login
  try {
    const res = await fetch(`${BASE_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@railsanket.local', password: 'Admin@123' }),
    })
    const data = await res.json()
    if (res.ok && data.token) {
      authToken = data.token
      log('POST /api/auth/login', true, res.status, `Role: ${data.user?.role}`)
    } else {
      log('POST /api/auth/login', false, res.status, data.message || 'No token')
    }
  } catch (e) {
    log('POST /api/auth/login', false, 0, e.message)
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }

  // 3. Auth Me
  try {
    const res = await fetch(`${BASE_API}/auth/me`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/auth/me', res.ok, res.status, `User: ${data.user?.name}`)
  } catch (e) {
    log('GET /api/auth/me', false, 0, e.message)
  }

  // 4. Users
  try {
    const res = await fetch(`${BASE_API}/users`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/users', res.ok && Array.isArray(data.users), res.status, `Count: ${data.users?.length}`)
  } catch (e) {
    log('GET /api/users', false, 0, e.message)
  }

  // 5. Audit logs
  try {
    const res = await fetch(`${BASE_API}/audit`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/audit', res.ok, res.status, `Count: ${data.total || data.logs?.length || 0}`)
  } catch (e) {
    log('GET /api/audit', false, 0, e.message)
  }

  // 6. Analytics Overview
  try {
    const res = await fetch(`${BASE_API}/analytics/overview`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/analytics/overview', res.ok, res.status, `Success: ${data.success}`)
  } catch (e) {
    log('GET /api/analytics/overview', false, 0, e.message)
  }

  // 7. Tasks
  let firstTaskId = ''
  try {
    const res = await fetch(`${BASE_API}/tasks`, { headers: authHeaders })
    const data = await res.json()
    const tasks = Array.isArray(data) ? data : data.tasks || []
    firstTaskId = tasks[0]?.id || ''
    log('GET /api/tasks', res.ok && tasks.length > 0, res.status, `Total tasks: ${tasks.length}`)
  } catch (e) {
    log('GET /api/tasks', false, 0, e.message)
  }

  // 8. Task Detail
  if (firstTaskId) {
    try {
      const res = await fetch(`${BASE_API}/tasks/${firstTaskId}`, { headers: authHeaders })
      const data = await res.json()
      log(`GET /api/tasks/${firstTaskId}`, res.ok, res.status, `Task: ${data.id}`)
    } catch (e) {
      log(`GET /api/tasks/${firstTaskId}`, false, 0, e.message)
    }
  }

  // 9. Blocks
  let firstBlockId = ''
  try {
    const res = await fetch(`${BASE_API}/blocks`, { headers: authHeaders })
    const data = await res.json()
    const blocks = Array.isArray(data) ? data : data.blocks || []
    firstBlockId = blocks[0]?.id || ''
    log('GET /api/blocks', res.ok, res.status, `Total blocks: ${blocks.length}`)
  } catch (e) {
    log('GET /api/blocks', false, 0, e.message)
  }

  // 10. Conflicts
  try {
    const res = await fetch(`${BASE_API}/conflicts`, { headers: authHeaders })
    const data = await res.json()
    const conflicts = Array.isArray(data) ? data : data.conflicts || []
    log('GET /api/conflicts', res.ok, res.status, `Total conflicts: ${conflicts.length}`)
  } catch (e) {
    log('GET /api/conflicts', false, 0, e.message)
  }

  // 11. Network Intelligence
  try {
    const res = await fetch(`${BASE_API}/network/intelligence`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/network/intelligence', res.ok && !!data.corridors, res.status, `Corridors: ${data.corridors?.length}`)
  } catch (e) {
    log('GET /api/network/intelligence', false, 0, e.message)
  }

  // 12. Network Topology
  try {
    const res = await fetch(`${BASE_API}/network/topology`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/network/topology', res.ok && data.success, res.status, `Topology nodes: ${data.corridors?.length}`)
  } catch (e) {
    log('GET /api/network/topology', false, 0, e.message)
  }

  // 13. What-If Simulation
  try {
    const res = await fetch(`${BASE_API}/what-if/simulate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenario: {
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: '2026-09-24',
          start: '10:00',
          end: '12:00',
        },
      }),
    })
    const data = await res.json()
    log('POST /api/what-if/simulate', res.ok && data.success, res.status, `Impact score: ${data.impactScore}`)
  } catch (e) {
    log('POST /api/what-if/simulate', false, 0, e.message)
  }

  // 14. What-If Compare
  try {
    const res = await fetch(`${BASE_API}/what-if/compare`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        baseline: {
          corridorId: 'C01',
          section: 'PKU–KGP',
          date: '2026-09-24',
          start: '10:00',
          end: '12:00',
        },
        scenarios: [
          {
            corridorId: 'C01',
            section: 'PKU–KGP',
            date: '2026-09-24',
            start: '12:00',
            end: '14:00',
          },
        ],
      }),
    })
    const data = await res.json()
    log('POST /api/what-if/compare', res.ok && data.success, res.status, `Scenarios: ${data.comparisons?.length}`)
  } catch (e) {
    log('POST /api/what-if/compare', false, 0, e.message)
  }

  // 15. Network Coordination Check
  try {
    const res = await fetch(`${BASE_API}/network/coordination/check`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenario: {
          corridorId: 'C01',
          sectionId: 'PKU–KGP',
          date: '2026-09-24',
          start: '10:00',
          end: '12:00',
        },
      }),
    })
    const data = await res.json()
    log('POST /api/network/coordination/check', res.ok && data.success, res.status, `Cross impact: ${data.crossCorridorImpact?.hasCrossImpact}`)
  } catch (e) {
    log('POST /api/network/coordination/check', false, 0, e.message)
  }

  // 16. Disruptions list
  let firstDisruptionId = ''
  try {
    const res = await fetch(`${BASE_API}/disruptions`, { headers: authHeaders })
    const data = await res.json()
    firstDisruptionId = data.data?.[0]?.incidentId || ''
    log('GET /api/disruptions', res.ok && data.success, res.status, `Incidents count: ${data.count}`)
  } catch (e) {
    log('GET /api/disruptions', false, 0, e.message)
  }

  // 17. Disruption Report
  if (firstDisruptionId) {
    try {
      const res = await fetch(`${BASE_API}/disruptions/${firstDisruptionId}/report`, { headers: authHeaders })
      const data = await res.json()
      log(`GET /api/disruptions/${firstDisruptionId}/report`, res.ok && data.success, res.status, `Report: ${data.reportId}`)
    } catch (e) {
      log(`GET /api/disruptions/${firstDisruptionId}/report`, false, 0, e.message)
    }
  }

  // 18. Rescheduling Simulate
  try {
    const res = await fetch(`${BASE_API}/rescheduling/simulate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scenario: {
          corridorId: 'C01',
          sectionId: 'SRC–ADL',
          date: '2026-09-24',
          incidentStart: '14:00',
          incidentEnd: '16:00',
          start: '14:00',
          end: '16:00',
        },
      }),
    })
    const data = await res.json()
    log('POST /api/rescheduling/simulate', res.ok && data.success, res.status, `Candidates: ${data.reschedulingOptions?.length}`)
  } catch (e) {
    log('POST /api/rescheduling/simulate', false, 0, e.message)
  }

  // 19. Optimization Generate
  try {
    const res = await fetch(`${BASE_API}/optimization/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        taskIds: ['ENG-221', 'ENG-104'],
        corridorIds: ['C01'],
        date: '2026-09-24',
      }),
    })
    const data = await res.json()
    log('POST /api/optimization/generate', res.ok && data.success, res.status, `Candidates: ${data.candidates?.length}`)
  } catch (e) {
    log('POST /api/optimization/generate', false, 0, e.message)
  }

  // 20. Command Center Overview
  try {
    const res = await fetch(`${BASE_API}/command-center/overview`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/command-center/overview', res.ok && data.success, res.status, `TraceId: ${data.traceId}`)
  } catch (e) {
    log('GET /api/command-center/overview', false, 0, e.message)
  }

  // 21. Alerts List
  try {
    const res = await fetch(`${BASE_API}/alerts`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/alerts', res.ok && data.success, res.status, `Total alerts: ${data.total}`)
  } catch (e) {
    log('GET /api/alerts', false, 0, e.message)
  }

  // 22. Alerts Summary
  try {
    const res = await fetch(`${BASE_API}/alerts/summary`, { headers: authHeaders })
    const data = await res.json()
    log('GET /api/alerts/summary', res.ok && data.success, res.status, `Active: ${data.activeCount}`)
  } catch (e) {
    log('GET /api/alerts/summary', false, 0, e.message)
  }

  // 23. Alerts Evaluate
  try {
    const res = await fetch(`${BASE_API}/alerts/evaluate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ corridorId: 'C01' }),
    })
    const data = await res.json()
    log('POST /api/alerts/evaluate', res.ok && data.success, res.status, `Evaluated: ${data.evaluated}`)
  } catch (e) {
    log('POST /api/alerts/evaluate', false, 0, e.message)
  }

  // --- Frontend Pages ---
  const fePages = [
    '/',
    '/login',
    '/network-intelligence',
    '/planner',
    '/conflicts',
    '/what-if',
    '/network-coordination',
    '/disruptions',
    '/optimization',
    '/command-center',
    '/alerts',
    '/reports',
    '/settings',
    '/monthly',
    '/queue',
  ]

  for (const page of fePages) {
    try {
      const res = await fetch(`${BASE_FE}${page}`)
      log(`Frontend page ${page}`, res.ok, res.status, res.statusText)
    } catch (e) {
      log(`Frontend page ${page}`, false, 0, e.message)
    }
  }

  const passed = report.filter((r) => r.success).length
  const failed = report.filter((r) => !r.success).length

  console.log('\n========================================================')
  console.log(`📊 Audit Summary: ${passed} Passed, ${failed} Failed out of ${report.length} checked`)
  console.log('========================================================')

  fs.writeFileSync('audit_results.json', JSON.stringify({ timestamp: new Date().toISOString(), passed, failed, report }, null, 2))
}

runAudit().catch(console.error)
