# Phase 9: Constraint-Based Network Optimization & Intelligent Block Planning
## Rail-Sanket Platform — Kharagpur Division, South Eastern Railway

---

## 1. Executive Summary & Architectural Objective

**Phase 9** elevates Rail-Sanket from evaluating isolated maintenance block requests to an automated, **deterministic constraint-based optimization engine**. The platform systematically discovers, prunes, and presents feasible block scheduling combinations across connected railway corridors while upholding all operational invariants:

- **Strictly Deterministic**: Given identical inputs (corridors, tasks, date, horizons), the engine always produces the exact same ranked candidate windows. Zero stochastic variation, zero machine learning hallucination, zero heuristic drift.
- **Decision-Support Boundary**: The optimization engine **NEVER** auto-approves blocks or alters operational schedules directly. Human Section Controllers retain sole sanction authority. Applying an optimization candidate stages it strictly in **`Proposed`** status, awaiting independent Four-Eyes verification.
- **Read-Only Discovery**: Candidate discovery (`generate`), single-window checks (`validate`), and matrix comparisons (`compare`) are completely read-only and never mutate MongoDB collections.
- **Holistic Network Scope**: Connects multiple corridors (C01 Howrah–Kharagpur, C02 Kharagpur–Tatanagar, C03 Kharagpur–Bhadrak, C04 Kharagpur–Adra, C05 Panskura–Haldia) and manages junction interchange buffers (Kharagpur Jn, Panskura Jn, Mecheda).

---

## 2. Hard & Soft Constraints Formulation

The optimization engine models railway scheduling constraints in two distinct tiers:

### 2.1 Hard Constraints (Feasibility Boundaries)
Any violation immediately reclassifies a candidate window as **`INFEASIBLE`** and moves it to the Pruned Log with explicit failure details:

| # | Hard Constraint | Rejection Code | Description |
|---|---|---|---|
| 1 | **Timetable Passenger Collision** | `TIMETABLE_COLLISION` | Zero tolerance for express, superfast, or mail passenger train overlap. |
| 2 | **Track Section Exclusivity** | `BLOCK_COLLISION` | Overlapping with existing approved maintenance blocks on the same track section. |
| 3 | **Resource / Crew Double-Booking** | `RESOURCE_DOUBLE_BOOKED` | P-Way, S&T, or TRD crews/machinery cannot be scheduled in two locations at once. |
| 4 | **Task Dependency Precedence** | `DEPENDENCY_VIOLATION` | Uncompleted prerequisite tasks must precede dependent tasks unless bundled. |
| 5 | **Disruption Caution Zone** | `ACTIVE_DISRUPTION_ZONE` | Track sections under active unscheduled disruptions or speed restrictions cannot accept blocks. |
| 6 | **Safety Buffer Enforcement** | `SAFETY_BUFFER_FAILURE` | Minimum 15–20 minute buffer required between block clearance and train operations. |
| 7 | **Window Work Capacity** | `WINDOW_CAPACITY_EXCEEDED` | Cumulative duration of bundled tasks cannot exceed window duration minus safety buffer. |

### 2.2 Soft Metrics (Objective Multi-Dimensional Scoring)
Feasible candidates are scored across factual operational dimensions without subjective or automated "winner" labels:

- **Simulated Passenger Delay ($D$)**: Cumulative delay in minutes imposed on lower-priority freight trains.
- **Total Maintenance Work ($W$)**: Direct productive maintenance minutes accomplished by bundled crews.
- **Resource Utilization ($\eta$)**: $\eta = \frac{W}{\text{Window Duration}} \times 100\%$.
- **Network Capacity Delta ($\Delta C$)**: Percentage of divisional track capacity occupied during the window.
- **Tasks Accomplished**: Number of high-priority backlog tasks cleared within the single corridor block.
- **Connected Corridors Impacted**: Count of border interchange sections affected.

---

## 3. System Architecture & Components

```
                          [ Section Controller / Planner ]
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │      Next.js Frontend: /optimization      │
                  │  - Horizon & Corridor Scope Selectors    │
                  │  - Task Bundling & Constraint Toggles    │
                  │  - Feasible Windows & Infeasible Log     │
                  │  - Side-by-Side Comparison Matrix        │
                  │  - Staging to Proposed (Stage Block)     │
                  └─────────────────────┬─────────────────────┘
                                        │ HTTP / Bearer JWT
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │       Backend Router: /api/optimization   │
                  │  - RBAC: OPTIMIZATION_RUN, _APPLY         │
                  │  - Audit Logging: OPTIMIZATION_GENERATED  │
                  └─────────────────────┬─────────────────────┘
                                        │
               ┌────────────────────────┴────────────────────────┐
               ▼                                                 ▼
┌─────────────────────────────┐                   ┌─────────────────────────────┐
│    optimizationService.js   │                   │ optimizationComparison.js   │
│ - Task Bundling Engine      │                   │ - Factual Dimension Matrix  │
│ - Timetable Gap Generator   │                   │ - Neutral Comparative Rows  │
│ - Hard Constraint Validator │                   │ - Zero Automated "Winners"  │
│ - Soft Metrics Calculator   │                   └─────────────────────────────┘
└──────────────┬──────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ Database Safety & Persistence:                                                │
│ - Task collection: Read-only backlog inspection                               │
│ - RecommendedBlock collection: Read-only inspection; Proposed staging on apply│
│ - AuditLog collection: Immutable governance recording                         │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints Reference

### `POST /api/optimization/generate`
Discovers feasible maintenance windows across specified corridors and planning horizons.
- **Permission**: `OPTIMIZATION_RUN`
- **Payload**:
  ```json
  {
    "corridorIds": ["C01", "C02"],
    "date": "2026-09-24",
    "taskIds": ["SNT-221", "ENG-104"],
    "planningHorizon": { "start": "00:00", "end": "24:00" },
    "safetyBufferMinutes": 20,
    "maxBlocksPerSection": 3
  }
  ```
- **Response**: Returns `feasibleCandidates`, `infeasibleCandidates` (with explicit failure reasons), `summary`, and `disclaimer`.

### `POST /api/optimization/validate`
Validates an arbitrary proposed schedule against hard and soft network constraints.
- **Permission**: `OPTIMIZATION_RUN`
- **Response**: `{ isValid: boolean, isFeasible: boolean, violations: string[], candidate: object }`

### `POST /api/optimization/compare`
Renders an objective side-by-side comparison matrix for two or more candidate schedules.
- **Permission**: `OPTIMIZATION_RUN`
- **Response**: Comparison matrix comparing duration, train delay, tasks accomplished, resource utilization, and cross-corridor impact. Omits subjective labels.

### `POST /api/optimization/apply`
Stages a validated feasible candidate into the active database.
- **Permission**: `OPTIMIZATION_APPLY` (Restricted to `PLANNER`, `CONTROLLER`, `ADMIN`)
- **Safety Invariant**: Strictly creates block in **`Proposed`** status with `approvedBy: null`. Emits `OPTIMIZATION_APPLIED` audit log.

---

## 5. Frontend Control Room Dashboard (`/optimization`)

1. **Parameter Panel**:
   - Corridor multiselect (C01–C05).
   - Target operational date picker.
   - Planning horizon presets (24h Full Day, 00:00–06:00 Night Shift, 10:00–16:00 Afternoon Window).
   - Hard constraint toggles (Timetable Collision, Approved Block Clashes, Resource Exclusivity, Dependency Precedence, Disruption Avoidance).
   - Minimum block duration and safety buffer slider (15 to 45 min).
2. **Feasible Candidates Board**:
   - Visual cards showing corridor, section, start–end time, and total duration.
   - Soft metrics badges: Delay (min), Maintenance (min), Utilization (%), Network Delta (%).
   - One-click selection for side-by-side comparison.
   - **`[Stage as Proposed Block]`** action trigger.
3. **Pruned & Infeasible Candidates Log**:
   - Displays all candidate windows rejected by hard constraints.
   - Explicit failure badges (`TIMETABLE_COLLISION`, `ACTIVE_DISRUPTION_ZONE`, `RESOURCE_DOUBLE_BOOKED`).
   - Detailed failure explanation explaining why the window cannot be safely executed.
4. **Side-by-Side Comparison Drawer**:
   - Comparative table comparing up to 3 candidate schedules simultaneously.
   - Clear, color-neutral delta metrics allowing human Section Controllers to balance trade-offs.
5. **Cross-Module Navigation**:
   - Planner View: Direct link `[⚡ Optimize Block Plan]` from `/planner`.
   - What-If Simulator: Direct link `[⚡ Optimize Scenario]` from `/what-if`.
   - Network Coordination: Direct link `[⚡ Optimize Network Plan]` from `/network-coordination`.
   - Disruption Manager: Direct link `[⚡ Find Feasible Rescheduling]` from `/disruptions`.

---

## 6. Verification & Test Suite Execution

Comprehensive verification suite (`backend/test_phase9_optimization.js`) covers 41 test categories and 66 individual assertions:

```
===============================================================
  RAIL-SANKET PHASE 9: CONSTRAINT OPTIMIZATION VERIFICATION
  ✓ TEST 1.1: POST /generate returns HTTP 200
  ✓ TEST 1.2: Contains mandatory decision-support disclaimer banner
  ✓ TEST 1.3: Mode is strictly SIMULATION
  ✓ TEST 1.4: Feasible candidates array returned
  ✓ TEST 1.5: Infeasible candidates array returned
  ✓ TEST 2.1: Deterministic feasible count between identical runs
  ✓ TEST 2.2: Deterministic infeasible count between identical runs
  ✓ TEST 2.3: Deterministic candidate IDs across runs
  ✓ TEST 3: No feasible candidate violates timetable train separation constraint
  ✓ TEST 4: Feasible candidates have zero collision with existing approved blocks
  ✓ TEST 5: Feasible candidates never double-book crew or machinery
  ✓ TEST 6: Feasible candidates strictly uphold task dependency order
  ✓ TEST 7: Disruption caution zones strictly avoided in feasible candidate windows
  ✓ TEST 8: 20-minute safety buffer accepted and processed
  ✓ TEST 9.1: Infeasible candidate records specific failure reasons
  ✓ TEST 9.2: Infeasible candidate contains start/end time of rejected window
  ✓ TEST 10.1: Multi-task bundling accepted
  ✓ TEST 10.2: Bundled tasks count computed in candidate metrics
  ✓ TEST 11.1: estimatedTrainDelayMinutes metric is numeric
  ✓ TEST 11.2: totalMaintenanceMinutes metric is numeric
  ✓ TEST 11.3: resourceUtilizationPct metric is numeric
  ✓ TEST 12.1: POST /validate returns HTTP 200
  ✓ TEST 12.2: Returns boolean isValid flag
  ✓ TEST 12.3: Returns violations array
  ✓ TEST 13.1: Colliding window evaluated with HTTP 200
  ✓ TEST 13.2: Violations list explains rejection reason
  ✓ TEST 14.1: POST /compare returns HTTP 200
  ✓ TEST 14.2: Returns comparisonMatrix
  ✓ TEST 14.3: Matrix includes all evaluated candidates
  ✓ TEST 14.4: Factual comparison omits automated "winner" labels
  ✓ TEST 15: Operational blocks collection count strictly unchanged by generate/validate
  ✓ TEST 16.1: POST /apply returns HTTP 201/200
  ✓ TEST 16.2: Staged block status is strictly Proposed (NEVER Approved)
  ✓ TEST 17.1: Staged block can be retrieved by ID
  ✓ TEST 17.2: Retrieved block maintains Proposed status
  ✓ TEST 18: Non-existent candidate ID rejected with HTTP 404
  ✓ TEST 19: Unauthenticated request to /apply rejected with HTTP 401
  ✓ TEST 20: Viewer role lacking OPTIMIZATION_APPLY rejected with HTTP 403
  ✓ TEST 21: Planner role has OPTIMIZATION_APPLY permission
  ✓ TEST 22.1: Audit query for OPTIMIZATION_GENERATED returns 200
  ✓ TEST 22.2: Audit log record action matches OPTIMIZATION_GENERATED
  ✓ TEST 23: Audit query for OPTIMIZATION_APPLIED returns 200
  ✓ TEST 24.1: POST /api/analytics/reports with OPTIMIZATION returns HTTP 200
  ✓ TEST 24.2: Report includes simulation disclaimer
  ✓ TEST 25: maxBlocksPerSection constraint parameter accepted and processed
  ✓ TEST 26: Invalid date format rejected with HTTP 400
  ✓ TEST 27: Empty corridorIds rejected with HTTP 400
  ✓ TEST 28: Negative safetyBuffer rejected with HTTP 400
  ✓ TEST 29.1: Multi-corridor optimization (C01, C02) returns HTTP 200
  ✓ TEST 29.2: Scope covers both corridors
  ✓ TEST 30: Cross-corridor boundary transit evaluated cleanly
  ✓ TEST 31.1: Optimization execution completed successfully
  ✓ TEST 31.2: Execution time within benchmark (55ms < 2000ms)
  ✓ TEST 32: Phase 1 Regression - Tasks retrieval intact
  ✓ TEST 33: Phase 2 Regression - Planner tasks endpoint intact
  ✓ TEST 34: Phase 3 Regression - Conflict detection endpoint intact
  ✓ TEST 35: Phase 4 Regression - Network intelligence intact
  ✓ TEST 36: Phase 5 Regression - What-If simulation intact
  ✓ TEST 37: Phase 6 Regression - Multi-corridor network coordination intact
  ✓ TEST 38: Phase 7 Regression - Disruption incidents feed intact
  ✓ TEST 39: Phase 8 Regression - Auth & RBAC intact
  ✓ TEST 40: Phase 8 Regression - Audit trail intact
  ✓ TEST 41.1: E2E - Optimization candidates generated
  ✓ TEST 41.2: E2E - Comparison matrix rendered
  ✓ TEST 41.3: E2E - Candidate staged as Proposed Block
  ✓ TEST 41.4: E2E - Block status verified as Proposed

===============================================================
  PHASE 9 VERIFICATION SUMMARY:
  PASSED: 66
  FAILED: 0
===============================================================
```

---

## 7. Operational Compliance & Safety Verification

1. **Non-Destructive Guarantee**: `POST /generate`, `POST /validate`, and `POST /compare` do not execute MongoDB write operations.
2. **Four-Eyes Governance**: Applying an optimization candidate creates a block in `Proposed` status with `approvedBy: null`. The independent Chief Controller retains ultimate authority to approve or reject the block after conflict verification.
3. **Mandatory Disclaimers**: Every response, report, and frontend view displays:
   > *SIMULATION / DECISION-SUPPORT ONLY: Optimization results are generated from the Rail-Sanket operational network model, timetable simulation data, task data, and simulated disruption data. They do not represent live railway control instructions.*
