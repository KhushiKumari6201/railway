# Phase 8 Walkthrough — Secure Operational Workflow, RBAC, Audit Trail & Management Analytics

## 1. Phase 8 Objective
Elevate Rail-Sanket from an engineering planning prototype into an **enterprise-grade, secure, and auditable operational system** adhering to Indian Railways divisional governance standards. It implements:
- Role-Based Access Control (RBAC) across 5 railway designations.
- The **Four-Eyes Principle** to prevent self-sanctioning of maintenance blocks.
- Safety invariants preventing approval of blocks with unresolved traffic conflicts.
- Mandatory documented justification for block rejections with automatic task reversion.
- A tamper-evident, immutable **Divisional Audit Trail**.
- Divisional **Management Analytics & Executive Dossier Generator** for Sr. DOM review.

---

## 2. Role Hierarchy & Granular Permissions Matrix
Rail-Sanket defines a centralized, immutable permissions configuration in `backend/src/config/permissions.js`:

| Role | Target Railway Cadre | Permissions | Key Operational Boundary |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Divisional Railway Manager / Senior IT | Full administrative privileges (`USERS_MANAGE`, `AUDIT_VIEW`, `BLOCKS_APPROVE`, etc.) | Can manage users and assign cadre roles |
| **CONTROLLER** | Sr. DOM / Chief Traffic Controller (IRTS) | `BLOCKS_APPROVE`, `BLOCKS_REJECT`, `CONFLICTS_RESOLVE`, `AUDIT_VIEW`, `REPORTS_GENERATE` | Sanctions blocks, overrides conflicts, signs off reports |
| **PLANNER** | Sr. DEN (Civil), Sr. DEE (TRD), Sr. DSTE (S&T) | `TASKS_CREATE`, `TASKS_UPDATE`, `BLOCKS_CREATE`, `SIMULATION_RUN`, `REPORTS_GENERATE` | Can propose blocks and tasks; **cannot approve blocks** |
| **MAINTENANCE_OFFICER** | Section Engineers / Gang In-charge | `TASKS_STATUS_UPDATE`, `SIMULATION_RUN`, `DATA_VIEW_ALL` | Can update task progress in the field |
| **VIEWER** | Safety Inspectors / Auditors / Observers | `DATA_VIEW_ALL` | Strictly read-only; zero mutation permissions |

---

## 3. Four-Eyes Principle & Safety Safeguards
Human-in-the-loop safety rules are strictly enforced at the API route and database layers:

```
[Planner: Proposes Block] ──> Status: Recommended (createdBy: "USR-PLAN-01")
                                      │
                                      ▼
                        [Self-Approval Attempt?] ──YES──> HTTP 403 (SelfApprovalProhibited)
                                      │ NO
                                      ▼
                      [Active Blocking Conflicts?] ──YES──> HTTP 409 (ConflictError)
                                      │ NO
                                      ▼
                 [Independent Controller Sanction] ──> Status: Approved (approvedBy: "USR-CTRL-01")
```

1. **Self-Approval Prohibition (`SelfApprovalProhibited`)**:
   - The user who creates/proposes a block (`createdBy`) cannot approve it.
   - An independent officer with `CONTROLLER` or `ADMIN` authority must review and approve.
2. **Conflict Invariance Guard (`ConflictError`)**:
   - `PATCH /api/blocks/:id/approve` automatically queries `conflictService.checkConflicts()`.
   - If an active passenger train or sectional conflict exists, approval is blocked with HTTP 409.
3. **Documented Rejection Mandate (`RejectionReasonRequired`)**:
   - `PATCH /api/blocks/:id/reject` requires a documented `reason` in the request body.
   - All bundled tasks are automatically reverted to `Open` status and scheduled dates are wiped.

---

## 4. Immutable Divisional Audit Trail (`AuditLog.js` & `auditService.js`)
Every significant operational change writes an unalterable log record capturing:
- **Audit ID**: Deterministic unique identifier (`AUD-179...`).
- **Officer Identity**: `userId`, `userName`, `role`, and client `ipAddress`.
- **Action Category**: One of 17 defined operational actions (`BLOCK_APPROVED`, `BLOCK_REJECTED`, `CONFLICT_RESOLVED`, `DISRUPTION_CREATED`, `USER_ROLE_CHANGED`, etc.).
- **Entity Reference**: `entityType` (`Task`, `RecommendedBlock`, `Conflict`, `Disruption`, `User`) and `entityId`.
- **State Diff**: Sanitized `previousState` and `newState` snapshots for point-in-time reconstruction.
- **Operational Justification**: Documented reason for sanctions or rejections.

*Access Control: Audit logs are strictly restricted to `CONTROLLER` and `ADMIN` roles via `requirePermission(PERMISSIONS.AUDIT_VIEW)`.*

---

## 5. Management Analytics & Requisition Generator
The analytics service (`analyticsService.js`) provides aggregate operational visibility across Kharagpur corridors:
- **Sanctioned Maintenance Hours**: Total hours of approved maintenance vs. planned backlog.
- **Backlog Fulfillment Rate**: Percentage of TMS, SMMS, and TDMS defects scheduled or completed.
- **Corridor Workload Balance**: Comparative distribution across C01 to C05.
- **Punctuality Protection Metric**: Unresolved timetable bottlenecks and simulated passenger delay.

### 5 Operational Report Categories (`/reports`):
1. **OPERATIONAL_SUMMARY**: Complete health indicators, backlog distribution, and network load.
2. **BLOCK_PLANNING**: Itemized maintenance block schedule with bundled task counts and sanctioning officers.
3. **CONFLICT**: Active train path overlaps and suggested operational actions.
4. **DISRUPTION**: Emergency incident log, simulated delay minutes, and candidate rescheduling options.
5. **AUDIT**: Chronological accountability log of all divisional decisions.

---

## 6. Frontend Integration
1. **Management Reports & Analytics (`/reports`)**:
   - Executive KPI ribbon (Sanctioned Hours, Fulfillment Rate, Active Conflicts, Network Utilization).
   - Department workload distribution bars (TMS Civil, SMMS S&T, TDMS Traction).
   - Corridor block allocation progress charts.
   - Interactive report generator with print/export view and Four-Eyes sign-off block.
2. **Governance, RBAC & Audit Trail (`/settings`)**:
   - **Cadre Directory Tab**: View registered officers, update role authorities, toggle active status.
   - **Divisional Audit Trail Tab**: Search and filter live audit events by action, role, and date range; expandable before/after state diff inspector.
   - **Four-Eyes Safeguards Tab**: Comprehensive visual overview of active governance policies.
3. **Navigation Updates (`/lib/nav.ts`)**:
   - Added `Management Reports` with `LIVE` badge under Planning.
   - Added `Governance & Audit` under Planning.

---

## 7. Verification & Test Results
- **Test Suite**: `node test_phase8_security_workflow.js`
- **Total Tests Passed**: **36 / 36 Test Groups Passed** (75 / 75 individual assertions, 100%)
  - Login & Authentication verification (Tests 1–4): Passed.
  - Role-Based Permissions boundaries (Tests 5–8): Passed.
  - Unauthorized access blocking (Tests 9–12): Passed (401 / 403).
  - Four-Eyes Principle enforcement (Tests 14–16): Passed (403 on self-approval, 200 on independent controller).
  - Conflict blocking invariance (Test 17): Passed (409 ConflictError).
  - Mandatory rejection reasons (Tests 18–19): Passed (400 RejectionReasonRequired, task reversion verified).
  - Immutable audit trail creation & retrieval (Tests 20–21): Passed.
  - User and role management (Tests 22–24): Passed.
  - Operational Analytics & Management Reporting (Tests 25–27): Passed.
  - Database safety & read-only guarantee (Tests 28–29): Passed.
  - Complete Regressions across Phases 1 through 7 (Tests 30–36): **All Passed**.
- **Frontend Production Build**: `npm run build` completed successfully (17/17 static and dynamic pages generated with 0 errors).
