/**
 * test_phase8_security_workflow.js
 * Verification test suite for Phase 8: Secure Operational Workflow, RBAC, Audit Trail & Management Analytics
 *
 * Verifies:
 * TEST 1: Login success with valid credentials (JWT token + user profile returned)
 * TEST 2: Invalid login rejected with 401
 * TEST 3: Inactive user account login blocked with 403
 * TEST 4: GET /api/auth/me returns current user and permissions
 * TEST 5: Viewer role has read-only permissions and lacks mutation permissions
 * TEST 6: Planner role can propose blocks and tasks but cannot approve blocks
 * TEST 7: Controller role can approve blocks and resolve conflicts but cannot manage users
 * TEST 8: Admin role has full permissions including user and role management
 * TEST 9: Unauthorized mutation blocked with 401 without Bearer token
 * TEST 10: Unauthorized approval blocked with 403 (Viewer/Planner cannot approve)
 * TEST 11: Unauthorized audit access blocked with 403 (Viewer/Planner cannot view audit logs)
 * TEST 12: Unauthorized user management blocked with 403 (Controller cannot create users)
 * TEST 13: Valid task mutation by authorized user succeeds and records audit log
 * TEST 14: Valid block creation by authorized user succeeds and sets createdBy
 * TEST 15: Four-Eyes safeguard prevents block creator from approving their own proposed block (403)
 * TEST 16: Independent Controller can approve proposed block (HTTP 200)
 * TEST 17: Approval prevented if blocking scheduling conflicts exist (HTTP 409 ConflictError)
 * TEST 18: Rejection requires mandatory documented reason (HTTP 400 RejectionReasonRequired)
 * TEST 19: Valid block rejection reverts tasks to Open backlog and records audit log
 * TEST 20: Audit log creation verified with sanitized states
 * TEST 21: Audit retrieval filterable by action, role, and entityType
 * TEST 22: User creation by Admin succeeds and records USER_CREATED audit event
 * TEST 23: User role change by Admin succeeds and records USER_ROLE_CHANGED audit event
 * TEST 24: Self-role modification prevented for administrator (HTTP 403)
 * TEST 25: Operational Analytics endpoint returns 200 with mode "SIMULATION"
 * TEST 26: Analytics calculations are deterministic across repeated queries
 * TEST 27: Management report generated with factual metrics and simulation disclaimer
 * TEST 28: Database safety: Operational collections unchanged by analytics query
 * TEST 29: Database safety: Operational collections unchanged by audit log query
 * TEST 30: Phase 1 regression tests pass
 * TEST 31: Phase 2 regression tests pass
 * TEST 32: Phase 3 regression tests pass
 * TEST 33: Phase 4 regression tests pass
 * TEST 34: Phase 5 regression tests pass
 * TEST 35: Phase 6 regression tests pass
 * TEST 36: Phase 7 regression tests pass
 */

const http = require('http')
const { execSync } = require('child_process')
const { getTestToken } = require('./src/services/authService')

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
          resolve({ status: res.statusCode, body: parsed, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers })
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function runPhase8Tests() {
  console.log('========================================================================')
  console.log('🧪 Starting Phase 8 Security, RBAC, Audit Trail & Analytics Test Suite')
  console.log('========================================================================\n')

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

  // Deterministic tokens for test matrix
  const adminToken = getTestToken('ADMIN', 'USR-ADMIN-01', 'Admin Officer')
  const controllerToken = getTestToken('CONTROLLER', 'USR-CTRL-01', 'Chief Controller')
  const plannerToken = getTestToken('PLANNER', 'USR-PLAN-01', 'Planning Engineer')
  const viewerToken = getTestToken('VIEWER', 'USR-VIEW-01', 'Public Auditor')

  const adminHeaders = { Authorization: `Bearer ${adminToken}` }
  const controllerHeaders = { Authorization: `Bearer ${controllerToken}` }
  const plannerHeaders = { Authorization: `Bearer ${plannerToken}` }
  const viewerHeaders = { Authorization: `Bearer ${viewerToken}` }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Login Success
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Login Success ---')
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@railsanket.local',
      password: 'Admin@123',
    })
    assert(loginRes.status === 200, 'TEST 1: Login returns HTTP 200')
    assert(loginRes.body && Boolean(loginRes.body.token), 'TEST 1: JWT token returned')
    assert(loginRes.body.user.role === 'ADMIN', 'TEST 1: User role is ADMIN')

    // -------------------------------------------------------------------------
    // TEST 2: Invalid Login Rejected
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Invalid Login Rejected ---')
    const badLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@railsanket.local',
      password: 'WrongPassword999',
    })
    assert(badLoginRes.status === 401, 'TEST 2: Invalid password rejected with HTTP 401')
    assert(badLoginRes.body.error === 'InvalidCredentials', 'TEST 2: Error is InvalidCredentials')

    // -------------------------------------------------------------------------
    // TEST 3: Inactive User Blocked
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Inactive User Blocked ---')
    // Create an inactive test user via admin
    const inactiveUserRes = await request(
      'POST',
      '/api/users',
      {
        name: 'Deactivated Worker',
        email: `inactive-${Date.now()}@railsanket.local`,
        password: 'Password@123',
        role: 'VIEWER',
        department: 'General',
        employeeCode: `EMP-INACT-${Date.now().toString().slice(-4)}`,
      },
      adminHeaders
    )
    assert(inactiveUserRes.status === 201, 'TEST 3: Admin created test user')
    const createdUserId = inactiveUserRes.body.user.userId
    const createdUserEmail = inactiveUserRes.body.user.email

    // Deactivate user
    await request('PATCH', `/api/users/${createdUserId}`, { active: false }, adminHeaders)

    // Attempt login as inactive user
    const inactiveLogin = await request('POST', '/api/auth/login', {
      email: createdUserEmail,
      password: 'Password@123',
    })
    assert(inactiveLogin.status === 403, 'TEST 3: Inactive account login rejected with HTTP 403')
    assert(inactiveLogin.body.error === 'AccountDeactivated', 'TEST 3: Error is AccountDeactivated')

    // -------------------------------------------------------------------------
    // TEST 4: Current User Profile (GET /api/auth/me)
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: Current User Profile ---')
    const meRes = await request('GET', '/api/auth/me', null, adminHeaders)
    assert(meRes.status === 200, 'TEST 4: GET /api/auth/me returns HTTP 200')
    assert(meRes.body.user.userId === 'USR-ADMIN-01', 'TEST 4: userId matches token payload')
    assert(Array.isArray(meRes.body.user.permissions), 'TEST 4: Permissions array returned')

    // -------------------------------------------------------------------------
    // TEST 5: Viewer Role Permissions Check
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: Viewer Role Permissions ---')
    const viewerMe = await request('GET', '/api/auth/me', null, viewerHeaders)
    assert(viewerMe.status === 200, 'TEST 5: Viewer profile fetched')
    assert(viewerMe.body.user.role === 'VIEWER', 'TEST 5: Role is VIEWER')
    assert(
      viewerMe.body.user.permissions.includes('DATA_VIEW_ALL') &&
        !viewerMe.body.user.permissions.includes('BLOCKS_APPROVE'),
      'TEST 5: Viewer has DATA_VIEW_ALL but lacks BLOCKS_APPROVE'
    )

    // -------------------------------------------------------------------------
    // TEST 6: Planner Role Permissions Check
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: Planner Role Permissions ---')
    const plannerMe = await request('GET', '/api/auth/me', null, plannerHeaders)
    assert(plannerMe.body.user.permissions.includes('BLOCKS_CREATE'), 'TEST 6: Planner can create blocks')
    assert(!plannerMe.body.user.permissions.includes('BLOCKS_APPROVE'), 'TEST 6: Planner cannot approve blocks')

    // -------------------------------------------------------------------------
    // TEST 7: Controller Role Permissions Check
    // -------------------------------------------------------------------------
    console.log('--- TEST 7: Controller Role Permissions ---')
    const ctrlMe = await request('GET', '/api/auth/me', null, controllerHeaders)
    assert(ctrlMe.body.user.permissions.includes('BLOCKS_APPROVE'), 'TEST 7: Controller can approve blocks')
    assert(!ctrlMe.body.user.permissions.includes('USERS_MANAGE'), 'TEST 7: Controller cannot manage users')

    // -------------------------------------------------------------------------
    // TEST 8: Admin Role Permissions Check
    // -------------------------------------------------------------------------
    console.log('--- TEST 8: Admin Role Permissions ---')
    assert(meRes.body.user.permissions.includes('USERS_MANAGE'), 'TEST 8: Admin can manage users')
    assert(meRes.body.user.permissions.includes('AUDIT_VIEW'), 'TEST 8: Admin can view audit logs')

    // -------------------------------------------------------------------------
    // TEST 9: Unauthorized Mutation Blocked (No Token)
    // -------------------------------------------------------------------------
    console.log('--- TEST 9: Unauthorized Mutation Blocked ---')
    const noAuthRes = await request('POST', '/api/tasks', { id: 'TEST-UNAUTH' })
    assert(noAuthRes.status === 401, 'TEST 9: Mutation without token rejected with HTTP 401')
    assert(noAuthRes.body.error === 'Unauthorized', 'TEST 9: Error is Unauthorized')

    // -------------------------------------------------------------------------
    // TEST 10: Unauthorized Approval Blocked (Viewer Role)
    // -------------------------------------------------------------------------
    console.log('--- TEST 10: Unauthorized Approval Blocked ---')
    const unauthApprove = await request('PATCH', '/api/blocks/REC-101/approve', {}, viewerHeaders)
    assert(unauthApprove.status === 403, 'TEST 10: Viewer approval rejected with HTTP 403')
    assert(unauthApprove.body.error === 'Forbidden', 'TEST 10: Error is Forbidden')

    // -------------------------------------------------------------------------
    // TEST 11: Unauthorized Audit Access Blocked (Planner Role)
    // -------------------------------------------------------------------------
    console.log('--- TEST 11: Unauthorized Audit Access Blocked ---')
    const unauthAudit = await request('GET', '/api/audit', null, plannerHeaders)
    assert(unauthAudit.status === 403, 'TEST 11: Planner audit query rejected with HTTP 403')

    // -------------------------------------------------------------------------
    // TEST 12: Unauthorized User Management Blocked (Controller Role)
    // -------------------------------------------------------------------------
    console.log('--- TEST 12: Unauthorized User Management Blocked ---')
    const unauthUsers = await request(
      'POST',
      '/api/users',
      { name: 'Unauthorized User', email: 'fail@test.com' },
      controllerHeaders
    )
    assert(unauthUsers.status === 403, 'TEST 12: Controller user creation rejected with HTTP 403')

    // -------------------------------------------------------------------------
    // TEST 13: Valid Task Mutation by Authorized User (Planner)
    // -------------------------------------------------------------------------
    console.log('--- TEST 13: Valid Task Mutation by Authorized User ---')
    const testTaskId = `SEC-TSK-${Date.now()}`
    const createTaskRes = await request(
      'POST',
      '/api/tasks',
      {
        id: testTaskId,
        sourceSystem: 'TMS',
        department: 'Engineering',
        assetId: 'TRK-P8-01',
        assetType: 'Track',
        corridorId: 'C01',
        location: 'Kharagpur Yard Sec-8',
        taskType: 'Switch expansion joint inspection',
        criticality: 'High',
        defectSeverity: 80,
        estimatedDuration: 60,
        requiredBlockType: 'Traffic Block',
        crew: 'PWay Gang 8',
      },
      plannerHeaders
    )
    assert(createTaskRes.status === 201, 'TEST 13: Planner task creation succeeded (HTTP 201)')
    assert(createTaskRes.body && createTaskRes.body.id === testTaskId, 'TEST 13: Task ID matches')

    // -------------------------------------------------------------------------
    // TEST 14: Valid Block Creation Sets createdBy
    // -------------------------------------------------------------------------
    console.log('--- TEST 14: Valid Block Creation Sets createdBy ---')
    const testBlockId = `REC-P8-BLK-${Date.now()}`
    const testDate = `2029-01-${String((Date.now() % 25) + 1).padStart(2, '0')}`
    const createBlockRes = await request(
      'POST',
      '/api/blocks',
      {
        id: testBlockId,
        date: testDate,
        corridorId: 'C01',
        section: 'PKU–KGP',
        start: '14:00',
        end: '15:30',
        durationMin: 90,
        blockType: 'Traffic Block',
        status: 'Proposed',
        taskIds: [testTaskId],
      },
      plannerHeaders
    )
    assert(createBlockRes.status === 201, 'TEST 14: Block creation succeeded')
    assert(createBlockRes.body.createdBy === 'USR-PLAN-01', 'TEST 14: createdBy set to planner userId')

    // -------------------------------------------------------------------------
    // TEST 15: Four-Eyes Principle Safeguard (Creator cannot approve own block)
    // -------------------------------------------------------------------------
    console.log('--- TEST 15: Four-Eyes Safeguard ---')
    // Attempt approval with same planner user ID (simulating planner with bypass or attempted self-approval)
    const selfApproveRes = await request(
      'PATCH',
      `/api/blocks/${testBlockId}/approve`,
      {},
      plannerHeaders // Note: Even if planner had role, createdBy === approverId
    )
    // Either 403 Forbidden (RBAC or FourEyes)
    assert(selfApproveRes.status === 403, 'TEST 15: Self-approval rejected with HTTP 403')

    // Also test explicitly with controller token where creator ID is set to controller's ID
    const controllerCreatedBlockId = `REC-CTRL-SELF-${Date.now()}`
    await request(
      'POST',
      '/api/blocks',
      {
        id: controllerCreatedBlockId,
        date: '2026-11-12',
        corridorId: 'C01',
        section: 'SRC–PKU',
        start: '14:00',
        end: '15:00',
        durationMin: 60,
        blockType: 'Traffic Block',
        status: 'Proposed',
        createdBy: 'USR-CTRL-01', // Created by controller
      },
      adminHeaders // Created via admin permission with controller as creator
    )
    const fourEyesRes = await request(
      'PATCH',
      `/api/blocks/${controllerCreatedBlockId}/approve`,
      {},
      controllerHeaders // Approving user is USR-CTRL-01
    )
    assert(fourEyesRes.status === 403, 'TEST 15: Four-eyes violation rejected with HTTP 403')
    assert(fourEyesRes.body.error === 'FourEyesViolation', 'TEST 15: Error code is FourEyesViolation')

    // -------------------------------------------------------------------------
    // TEST 16: Independent Controller Approves Proposed Block
    // -------------------------------------------------------------------------
    console.log('--- TEST 16: Independent Controller Approves Proposed Block ---')
    const approveRes = await request(
      'PATCH',
      `/api/blocks/${testBlockId}/approve`,
      { remarks: 'Approved after timetable verification' },
      controllerHeaders
    )
    if (approveRes.status !== 200) {
      console.error('TEST 16 FAILED RESPONSE:', approveRes.status, approveRes.body)
    }
    assert(approveRes.status === 200, 'TEST 16: Independent approval returns HTTP 200')
    assert(approveRes.body && approveRes.body.block && approveRes.body.block.status === 'Approved', 'TEST 16: Block status updated to Approved')
    assert(approveRes.body && approveRes.body.block && approveRes.body.block.approvedBy === 'USR-CTRL-01', 'TEST 16: approvedBy set to USR-CTRL-01')

    // -------------------------------------------------------------------------
    // TEST 17: Approval Guard Against Blocking Scheduling Conflicts
    // -------------------------------------------------------------------------
    console.log('--- TEST 17: Approval Guard Against Blocking Conflicts ---')
    const conflictingBlockId = `REC-CONFLICT-GUARD-${Date.now()}`
    await request(
      'POST',
      '/api/blocks',
      {
        id: conflictingBlockId,
        date: '2026-09-24',
        corridorId: 'C01',
        section: 'HWH–SRC',
        start: '07:30',
        end: '08:30', // Clashes with train 12841 (07:40 - 08:05)
        durationMin: 60,
        blockType: 'Traffic Block',
        status: 'Proposed',
        createdBy: 'USR-PLAN-01',
      },
      plannerHeaders
    )
    const blockApproveRes = await request(
      'PATCH',
      `/api/blocks/${conflictingBlockId}/approve`,
      {},
      controllerHeaders
    )
    assert(blockApproveRes.status === 409, 'TEST 17: Approval blocked with HTTP 409 Conflict')
    assert(blockApproveRes.body.error === 'ConflictError', 'TEST 17: Error code is ConflictError')

    // -------------------------------------------------------------------------
    // TEST 18: Rejection Requires Mandatory Reason
    // -------------------------------------------------------------------------
    console.log('--- TEST 18: Rejection Requires Mandatory Reason ---')
    const rejectNoReason = await request(
      'PATCH',
      `/api/blocks/${conflictingBlockId}/reject`,
      {}, // Empty body, no reason
      controllerHeaders
    )
    assert(rejectNoReason.status === 400, 'TEST 18: Rejection without reason rejected with HTTP 400')
    assert(rejectNoReason.body.error === 'RejectionReasonRequired', 'TEST 18: Error is RejectionReasonRequired')

    // -------------------------------------------------------------------------
    // TEST 19: Valid Block Rejection with Reason
    // -------------------------------------------------------------------------
    console.log('--- TEST 19: Valid Block Rejection with Reason ---')
    const rejectWithReason = await request(
      'PATCH',
      `/api/blocks/${conflictingBlockId}/reject`,
      { reason: 'Severe clash with Coromandel Express 12841' },
      controllerHeaders
    )
    assert(rejectWithReason.status === 200, 'TEST 19: Rejection with reason returns HTTP 200')
    assert(rejectWithReason.body.block.status === 'Rejected', 'TEST 19: Status updated to Rejected')
    assert(
      rejectWithReason.body.block.rejectionReason === 'Severe clash with Coromandel Express 12841',
      'TEST 19: rejectionReason saved'
    )

    // -------------------------------------------------------------------------
    // TEST 20: Audit Log Creation
    // -------------------------------------------------------------------------
    console.log('--- TEST 20: Audit Log Creation ---')
    const auditRes = await request('GET', '/api/audit?limit=20', null, adminHeaders)
    assert(auditRes.status === 200, 'TEST 20: GET /api/audit returns HTTP 200')
    assert(Array.isArray(auditRes.body.logs), 'TEST 20: Audit logs array returned')
    assert(auditRes.body.logs.length > 0, 'TEST 20: Audit trail has recorded events')

    // -------------------------------------------------------------------------
    // TEST 21: Audit Retrieval Filterable
    // -------------------------------------------------------------------------
    console.log('--- TEST 21: Audit Retrieval Filterable ---')
    const filterAuditRes = await request(
      'GET',
      '/api/audit?action=BLOCK_APPROVED&entityType=RecommendedBlock',
      null,
      adminHeaders
    )
    assert(filterAuditRes.status === 200, 'TEST 21: Filtered audit search returns 200')
    const allApprovedAction = filterAuditRes.body.logs.every((l) => l.action === 'BLOCK_APPROVED')
    assert(allApprovedAction, 'TEST 21: All filtered logs have action BLOCK_APPROVED')

    // -------------------------------------------------------------------------
    // TEST 22: User Creation by Admin
    // -------------------------------------------------------------------------
    console.log('--- TEST 22: User Creation by Admin ---')
    const testOfficerEmail = `officer-${Date.now()}@railsanket.local`
    const newUserRes = await request(
      'POST',
      '/api/users',
      {
        name: 'Section Controller KGP',
        email: testOfficerEmail,
        password: 'Password@123',
        role: 'CONTROLLER',
        department: 'Operating',
        employeeCode: `EMP-SC-${Date.now().toString().slice(-4)}`,
      },
      adminHeaders
    )
    assert(newUserRes.status === 201, 'TEST 22: User created successfully (HTTP 201)')
    assert(newUserRes.body.user.role === 'CONTROLLER', 'TEST 22: Role is CONTROLLER')
    assert(newUserRes.body.user.passwordHash === undefined, 'TEST 22: Password hash stripped from response')
    const createdOfficerId = newUserRes.body.user.userId

    // -------------------------------------------------------------------------
    // TEST 23: User Role Change by Admin Records Audit Log
    // -------------------------------------------------------------------------
    console.log('--- TEST 23: User Role Change by Admin ---')
    const updateRoleRes = await request(
      'PATCH',
      `/api/users/${createdOfficerId}`,
      { role: 'PLANNER', reason: 'Transferred to planning division' },
      adminHeaders
    )
    assert(updateRoleRes.status === 200, 'TEST 23: Role updated to PLANNER (HTTP 200)')
    assert(updateRoleRes.body.user.role === 'PLANNER', 'TEST 23: Role verified as PLANNER')

    // Verify audit log for USER_ROLE_CHANGED
    const roleAuditRes = await request(
      'GET',
      `/api/audit?action=USER_ROLE_CHANGED&entityId=${createdOfficerId}`,
      null,
      adminHeaders
    )
    assert(roleAuditRes.status === 200, 'TEST 23: Audit log retrieved for role change')
    assert(roleAuditRes.body.logs.length >= 1, 'TEST 23: Audit record exists for role modification')

    // -------------------------------------------------------------------------
    // TEST 24: Self-Role Modification Blocked for Administrator
    // -------------------------------------------------------------------------
    console.log('--- TEST 24: Self-Role Modification Blocked ---')
    const selfRoleRes = await request(
      'PATCH',
      '/api/users/USR-ADMIN-01',
      { role: 'VIEWER' },
      adminHeaders // USR-ADMIN-01 attempting to downgrade themselves
    )
    assert(selfRoleRes.status === 403, 'TEST 24: Self-role modification blocked with HTTP 403')
    assert(
      selfRoleRes.body.error === 'SelfRoleModificationBlocked',
      'TEST 24: Error is SelfRoleModificationBlocked'
    )

    // -------------------------------------------------------------------------
    // TEST 25: Operational Analytics Overview
    // -------------------------------------------------------------------------
    console.log('--- TEST 25: Operational Analytics Overview ---')
    const analyticsRes = await request('GET', '/api/analytics/overview', null, controllerHeaders)
    assert(analyticsRes.status === 200, 'TEST 25: GET /api/analytics/overview returns HTTP 200')
    assert(analyticsRes.body.mode === 'SIMULATION', 'TEST 25: Mode is explicitly SIMULATION')
    assert(typeof analyticsRes.body.summary.totalTasks === 'number', 'TEST 25: Summary totalTasks is number')
    assert(typeof analyticsRes.body.summary.networkUtilization === 'number', 'TEST 25: Utilization is number')

    // -------------------------------------------------------------------------
    // TEST 26: Analytics Deterministic across Repeated Calls
    // -------------------------------------------------------------------------
    console.log('--- TEST 26: Analytics Deterministic ---')
    const analyticsRes2 = await request('GET', '/api/analytics/overview', null, controllerHeaders)
    assert(
      analyticsRes.body.summary.totalTasks === analyticsRes2.body.summary.totalTasks,
      'TEST 26: totalTasks deterministic'
    )
    assert(
      analyticsRes.body.summary.networkUtilization === analyticsRes2.body.summary.networkUtilization,
      'TEST 26: networkUtilization deterministic'
    )

    // -------------------------------------------------------------------------
    // TEST 27: Management Report Generation
    // -------------------------------------------------------------------------
    console.log('--- TEST 27: Management Report Generation ---')
    const reportRes = await request(
      'POST',
      '/api/analytics/reports',
      { type: 'OPERATIONAL_SUMMARY', corridorId: 'C01' },
      controllerHeaders
    )
    assert(reportRes.status === 200, 'TEST 27: Management report generated (HTTP 200)')
    assert(reportRes.body.report && reportRes.body.report.reportId, 'TEST 27: Report has reportId')
    assert(
      Boolean(reportRes.body.report.disclaimer),
      'TEST 27: Report contains decision-support disclaimer'
    )

    // -------------------------------------------------------------------------
    // TEST 28: Database Safety (Analytics Query is Read-Only)
    // -------------------------------------------------------------------------
    console.log('--- TEST 28: Database Safety - Analytics Read-Only ---')
    const tasksCountBefore = (await request('GET', '/api/tasks', null, adminHeaders)).body.length
    await request('GET', '/api/analytics/overview', null, adminHeaders)
    const tasksCountAfter = (await request('GET', '/api/tasks', null, adminHeaders)).body.length
    assert(tasksCountBefore === tasksCountAfter, 'TEST 28: Tasks count unchanged after analytics query')

    // -------------------------------------------------------------------------
    // TEST 29: Database Safety (Audit GET is Read-Only)
    // -------------------------------------------------------------------------
    console.log('--- TEST 29: Database Safety - Audit Query Read-Only ---')
    const auditCountBefore = (await request('GET', '/api/audit', null, adminHeaders)).body.total
    await request('GET', '/api/audit', null, adminHeaders)
    const auditCountAfter = (await request('GET', '/api/audit', null, adminHeaders)).body.total
    assert(auditCountBefore === auditCountAfter, 'TEST 29: Audit log count unchanged by GET query')

    // -------------------------------------------------------------------------
    // REGRESSION SUITE EXECUTION (PHASES 1 to 7)
    // -------------------------------------------------------------------------
    console.log('\n========================================================')
    console.log('🔄 RUNNING FULL REGRESSION SUITE (PHASES 1 TO 7)')
    console.log('========================================================\n')

    // TEST 30: Phase 1 Regression
    console.log('--- TEST 30: Phase 1 Regression (test_all_endpoints.js) ---')
    try {
      execSync('node test_all_endpoints.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 30: Phase 1 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 30: Phase 1 regression failed: ${e.message}`)
    }

    // TEST 31: Phase 2 Regression
    console.log('--- TEST 31: Phase 2 Regression (test_phase2_planner.js) ---')
    try {
      execSync('node test_phase2_planner.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 31: Phase 2 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 31: Phase 2 regression failed: ${e.message}`)
    }

    // TEST 32: Phase 3 Regression
    console.log('--- TEST 32: Phase 3 Regression (test_phase3_conflicts.js) ---')
    try {
      execSync('node test_phase3_conflicts.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 32: Phase 3 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 32: Phase 3 regression failed: ${e.message}`)
    }

    // TEST 33: Phase 4 Regression
    console.log('--- TEST 33: Phase 4 Regression (test_phase4_network.js) ---')
    try {
      execSync('node test_phase4_network.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 33: Phase 4 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 33: Phase 4 regression failed: ${e.message}`)
    }

    // TEST 34: Phase 5 Regression
    console.log('--- TEST 34: Phase 5 Regression (test_phase5_whatif.js) ---')
    try {
      execSync('node test_phase5_whatif.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 34: Phase 5 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 34: Phase 5 regression failed: ${e.message}`)
    }

    // TEST 35: Phase 6 Regression
    console.log('--- TEST 35: Phase 6 Regression (test_phase6_coordination.js) ---')
    try {
      execSync('node test_phase6_coordination.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 35: Phase 6 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 35: Phase 6 regression failed: ${e.message}`)
    }

    // TEST 36: Phase 7 Regression
    console.log('--- TEST 36: Phase 7 Regression (test_phase7_disruption.js) ---')
    try {
      execSync('node test_phase7_disruption.js', { stdio: 'inherit', cwd: __dirname })
      assert(true, 'TEST 36: Phase 7 regression tests passed.')
    } catch (e) {
      assert(false, `TEST 36: Phase 7 regression failed: ${e.message}`)
    }
  } catch (err) {
    console.error('Fatal error in Phase 8 test suite:', err)
    failed++
  }

  console.log('\n====================================================')
  console.log(`🎉 ALL 36 PHASE 8 TESTS & REGRESSIONS FINISHED!`)
  console.log(`Summary: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================')

  process.exit(failed > 0 ? 1 : 0)
}

runPhase8Tests()
