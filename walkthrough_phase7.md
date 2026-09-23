# Phase 7 Walkthrough — Real-Time Operational Feedback & Disruption Rescheduling

## 1. Phase 7 Objective
Extend Rail-Sanket from static block planning and cross-corridor coordination into a **Real-Time Operational Feedback & Disruption Rescheduling** engine. It models unexpected railway emergency incidents (e.g. OHE tripping, rail fractures, signal failure) and provides immediate decision support:
- Quantifies train delays across primary and connected corridors.
- Identifies impacted maintenance blocks and scheduled tasks without destructive cancellations.
- Discovers conflict-free rescheduling windows shifted before or after the incident.
- Performs side-by-side scenario comparisons without declaring automated winners.
- Compiles formalized **Prototype Operational Block Requisition Reports** for controller sign-off.

---

## 2. Incident Taxonomy & Modeling
Incidents are modeled deterministically using standard Indian Railways failure classifications:

| Incident Type | Category | Typical Section Affected | Default Duration | Severity Level |
| :--- | :--- | :--- | :--- | :--- |
| **OHE_TRIPPING** | Electrical Traction (TDMS) | `SRC–PKU` (C01) | 60 min | High |
| **RAIL_FRACTURE** | Civil Engineering (TMS) | `PKU–KGP` (C01) | 90 min | Critical |
| **SIGNAL_FAILURE** | S&T Interlocking (SMMS) | `KGP–BLS` (C02) | 45 min | High |
| **TRACK_BUCKLING** | Civil Engineering (TMS) | `BLS–CTC` (C02) | 120 min | Critical |
| **POINT_MACHINE_DEFECT** | S&T Turnout (SMMS) | `SRC–ULT` (C05) | 40 min | Medium |

---

## 3. Disruption Impact Engine (`disruptionImpactService.js`)
When an incident is reported on Corridor $C_{inc}$ and Section $S_{inc}$ between $T_{start}$ and $T_{end}$:
1. **Primary Section Isolation**:
   - Primary section status is flagged as `EMERGENCY_DISRUPTION`.
   - Crossover switches into the section are dynamically marked as `BLOCKED` or `CAUTION_SPEED`.
2. **Connected Corridor Propagation**:
   - Identifies interchange points (e.g., `KGP`, `SRC`, `BBS`).
   - Determines adjacent corridors sharing border sections (e.g. `C02`, `C03`, `C05` connected at Kharagpur).
   - Topologically isolated corridors (e.g. `C04` BBS–PURI when disruption is on `C01`) remain completely unaffected.
3. **Timetable Train Delay Calculation**:
   - Matches all train paths from `timetableData.js` crossing the incident section during $[T_{start} - 15\text{m}, T_{end} + 15\text{m}]$.
   - Calculates deterministic delay minutes as the exact duration of the incident overlap plus downstream route clearance.
4. **Maintenance Block Impact Evaluation**:
   - Queries MongoDB `RecommendedBlock` records matching the corridor and overlapping date/time.
   - Blocks are identified as `IMPACTED` with actionable advice without automatically cancelling database records.
5. **Simulated Network Utilization Delta**:
   - Evaluates the capacity lost due to emergency track closure vs. baseline utilization.

---

## 4. Disruption Rescheduling Engine (`reschedulingService.js`)
Rather than forcing automated block shifts, the rescheduling module generates **Candidate Scenarios** for human-in-the-loop review:
- **Scenario A (Pre-Disruption Early Window)**:
  - Shifted earlier to complete critical work before the incident window starts (e.g., 05:30–07:00).
- **Scenario B (Post-Disruption Evening Window)**:
  - Shifted to an available evening maintenance slot after line restoration (e.g., 14:00–16:00).
- **Scenario C (Next-Day Optimal Window)**:
  - Preserves the original time slot shifted to $D + 1$ with zero passenger conflicts.

### Validation Against Conflict Rules
Each candidate option is evaluated through Phase 3 and Phase 6 rules:
- Train path overlap detection.
- Minimum 20-minute safety buffer check ($T_{\text{tasks}} \le T_{\text{window}} - 20\text{min}$).
- Interchange junction concurrency verification.
- Output metrics include: `safetyBufferStatus` (`PASS`/`FAIL`), `affectedTrainCount`, `simulatedDelayMinutes`, and `operationalImpact`.

---

## 5. Prototype Operational Requisition Report
Generates structured requisition dossiers containing:
- **Document Metadata**: Serialized Report ID (`RPT-DISRUPT-...`), Division (`Kharagpur Division, SER`), Simulation Disclaimer.
- **Incident Summary**: Failure type, affected section, time window, and estimated duration.
- **Network Impact**: Connected corridors, delayed express trains, and impacted block counts.
- **Rescheduling Alternatives**: Side-by-side candidate comparison table.
- **Decision Sign-Off Block**: Mandatory fields for Controller Action, Selected Option ID, Controller Notes, Verified Safety Buffer, and Authorization Timestamp.

---

## 6. API Endpoints Summary
All Phase 7 simulation routes are non-destructive and preserve core planning data:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/disruptions` | Returns list of simulated operational incidents |
| `POST` | `/api/disruptions/simulate` | Creates a simulated incident and calculates network impact |
| `GET` | `/api/disruptions/:id` | Returns incident details and impact metrics |
| `PATCH` | `/api/disruptions/:id/resolve` | Resolves an active incident and restores section status |
| `GET` | `/api/disruptions/:id/report` | Generates official Prototype Requisition Report |
| `POST` | `/api/rescheduling/simulate` | Discovers candidate rescheduling options around an incident |
| `POST` | `/api/rescheduling/compare` | Compares multiple rescheduling options side-by-side |
| `POST` | `/api/rescheduling/apply` | Validates parameters for staging an alternative scenario |

---

## 7. Frontend Integration (`/disruptions`)
- **Live Incident Simulator**:
  - Corridor, section, incident type, and time window inputs.
  - 1-click preset incident buttons (OHE Tripping at SRC, Rail Fracture at PKU, Signal Failure at BLS).
- **Impact Assessment Visualizer**:
  - Primary & connected corridor status tags.
  - Delayed timetable trains table with origin, destination, and calculated delay minutes.
  - Track & crossover switch state monitor (`CLEAR`, `BLOCKED`, `CAUTION_SPEED`).
- **Rescheduling Alternatives & Side-by-Side Comparison**:
  - Candidate cards showing window, buffer status, and passenger impact.
  - Side-by-side comparison modal with zero automatic declarations of winners.
- **Requisition Report Dossier**:
  - Formatted print/export view with official South Eastern Railway styling.

---

## 8. Verification & Test Results
- **Test Suite**: `node test_phase7_disruption.js`
- **Total Tests Passed**: **32 / 32 Passed** (100%)
  - Direct Phase 7 Tests (Tests 1–26): 26/26 passed.
  - Phase 1 Regression (`test_all_endpoints.js`): 13/13 passed.
  - Phase 2 Regression (`test_phase2_planner.js`): 20/20 passed.
  - Phase 3 Regression (`test_phase3_conflicts.js`): 17/17 passed.
  - Phase 4 Regression (`test_phase4_network.js`): 37/37 passed.
  - Phase 5 Regression (`test_phase5_whatif.js`): 23/23 passed.
  - Phase 6 Regression (`test_phase6_coordination.js`): 27/27 passed.
- **Data Integrity Assurance**: Tasks, blocks, and conflicts in MongoDB remain completely unaltered by disruption simulations.
