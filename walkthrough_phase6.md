# Phase 6 Walkthrough — Multi-Corridor Network Coordination & Global Timetable Optimization

## 1. Phase 6 Objective
Extend Rail-Sanket from single-corridor planning into a centralized **Multi-Corridor Network Coordination & Global Timetable Optimization** decision-support module. It evaluates how a maintenance block on one corridor propagates operational effects to:
- Connected corridors through interchange junctions
- Downstream train timetable movements
- Shared maintenance resources (crew & task double-booking)
- Prerequisite task dependencies across sections
- Network-wide simulated capacity and utilization

---

## 2. Network Topology Model
Rail-Sanket models the Kharagpur Division railway topology as an **Operational Network Graph** consisting of 5 corridors connected via physical and logical interchange junctions:

```
             C02 (KGP–BBS)
                   |
                   |
C01 (HWH–KGP) ─── KGP ─── C03 (KGP–TATA)
                   |
                   |
             C05 (SRC–KGP Freight)

(SRC also connects C01 & C05)
(BBS connects C02 & C04 BBS–PURI)
(C04 is topologically isolated from C01 and C03)
```

### Corridors & Interchange Points
1. **C01 (Howrah–Kharagpur)**:
   - Sections: `HWH–SRC`, `SRC–PKU`, `PKU–KGP`
   - Interchanges: `KGP` (connecting C02, C03, C05), `SRC` (connecting C05)
2. **C02 (Kharagpur–Bhubaneswar)**:
   - Sections: `KGP–BLS`, `BLS–CTC`, `CTC–BBS`
   - Interchanges: `KGP` (connecting C01, C03, C05), `BBS` (connecting C04)
3. **C03 (Kharagpur–Tatanagar)**:
   - Sections: `KGP–GII`, `GII–TATA`
   - Interchanges: `KGP` (connecting C01, C02, C05)
4. **C04 (Bhubaneswar–Puri)**:
   - Sections: `BBS–KUR`, `KUR–PURI`
   - Interchanges: `BBS` (connecting C02)
   - *Topologically isolated from C01 and C03.*
5. **C05 (Santragachi–Kharagpur Freight)**:
   - Sections: `SRC–ULT`, `ULT–KGP`
   - Interchanges: `SRC` (connecting C01), `KGP` (connecting C01, C02, C03)

---

## 3. Connected Corridor Model
When a maintenance block is proposed on corridor $C_{prim}$ on section $S_{prim}$, the coordination engine inspects the interchange graph:
- If $S_{prim}$ borders an interchange junction (e.g. `PKU–KGP` borders `KGP`), all adjacent corridors connecting at that junction (`C02`, `C03`, `C05`) are classified as **Connected Corridors**.
- Unconnected corridors (e.g. `C04` when planning on `C01`) remain strictly isolated without generating false alerts.

---

## 4. Cross-Corridor Conflict Rules
- **Rule 1 (Direct Sectional Conflict)**: Same section + overlapping time window $\rightarrow$ Direct blocking conflict.
- **Rule 2 (Interchange Schedule Overlap)**: Maintenance block on an interchange border section + concurrent approved block on adjacent connected corridor at the same junction $\rightarrow$ Cross-Corridor Network Conflict (`Warning` or `Critical`).
- **Rule 3 (Isolation Guarantee)**: Corridors without shared junctions $\rightarrow$ No network conflict generated.
- **Rule 4 (Operational Propagation)**: Approved blocks and timetable train paths traveling through the junction are checked for downstream delays.
- **Rule 5 (Rejected Block Invariance)**: Rejected blocks are excluded from active network conflict evaluation.
- **Rule 6 (Resolved Conflict Invariance)**: Resolved conflicts are excluded from active alerts.

---

## 5. Resource Coordination
Validates cross-corridor resource constraints using existing MongoDB task fields (`crew`, `taskId`, `corridorId`):
1. **Crew Double-Booking**: If the same maintenance crew (e.g., `Engineering Gang 1`, `S&T Team Alpha`) is scheduled on overlapping dates/times across different corridors, a `Critical` Resource Conflict is raised.
2. **Task Double-Booking**: If a task is bundled into a scenario but is already allocated to an active approved block, a `Critical` Resource Conflict is raised.

---

## 6. Dependency Coordination
Validates prerequisite task orderings using the `dependencies` array on each task:
- If Task B depends on Task A, Task A must either be:
  1. Already marked `Completed` in MongoDB.
  2. Bundled into the same proposed block.
  3. Scheduled in an approved block ending prior to Task B's start window.
- If none of these conditions are met, a `Critical` Dependency Conflict is flagged with actionable advice.

---

## 7. Train Path Propagation
Tracks train movements from `timetableData.js` crossing corridor boundaries:
- Example: **12841 (Coromandel Express)** departs Howrah on `C01` (`PKU–KGP` 10:20–10:45) and propagates across `KGP` into `C02` (`KGP–BLS` 10:45–11:15).
- If a maintenance block on `C01` (`PKU–KGP`) is scheduled 10:00–12:00, the engine determines:
  - Direct delay on `C01`: 25 minutes.
  - Downstream delay propagating into `C02` (`KGP–BLS`): 25 minutes.
  - Total simulated delay across the network.

---

## 8. Network Impact Calculation
Factual metrics calculated per scenario without arbitrary scores:
1. `primaryCorridor`: Identifier, route, section, window, task count
2. `affectedCorridorCount`: Number of connected corridors affected
3. `affectedSectionCount`: Number of track sections affected
4. `affectedTrainCount`: Number of timetable train movements delayed
5. `criticalConflicts`: Number of critical blocking alerts
6. `warningConflicts`: Number of non-blocking warning alerts
7. `simulatedDelayMinutes`: Sum of overlapping train path delay minutes
8. `safetyBufferStatus`: `PASS` if task duration $\le$ window $- 20$ min, else `FAIL`
9. `operationalImpact`: Categorized deterministically as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`

---

## 9. Network Utilization Delta
Calculated using the total network section capacity formula:
$$\text{Total Network Capacity} = 12 \text{ sections} \times 1440 \text{ min/day} = 17,280 \text{ minutes}$$
$$\text{Baseline Utilization} = \min\left(100, \text{round}\left(\frac{\text{Baseline Booked Minutes}}{17,280} \times 100\right)\right)$$
$$\text{Scenario Utilization} = \min\left(100, \text{round}\left(\frac{\text{Baseline Booked Minutes} + \text{Duration}}{17,280} \times 100\right)\right)$$
$$\text{Utilization Delta} = \text{Scenario Utilization} - \text{Baseline Utilization}$$

*Clearly labeled as "Simulated Network Utilization" to indicate deterministic decision-support modeling.*

---

## 10. API Endpoints
All endpoints are strictly **READ-ONLY** and do not alter MongoDB state:
- `GET /api/network/topology`: Returns the 5-corridor network graph and interchange connections.
- `POST /api/network/coordination/check`: Evaluates primary scenario, affected network, cross-corridor conflicts, resources, dependencies, and utilization delta.
- `POST /api/network/coordination/compare`: Evaluates multiple scenarios side-by-side for factual comparison without declaring an automated winner.

---

## 11. Frontend Integration
- **Page `/network-coordination`**:
  - Interactive schematic diagram showing `C01 ── KGP ── C03`, `C02 ── KGP ── C05`, and `C02 ── BBS ── C04`.
  - Primary block configuration with dynamic corridor, section, date, time, and task selectors.
  - KPI metric cards (Affected Corridors, Affected Trains, Simulated Delay, Network Utilization).
  - Train propagation table detailing cross-corridor routes.
  - Multi-category conflict tabs (All, Network, Resource, Dependency).
  - Multi-scenario side-by-side comparison table.
- **Planner Integration (`/planner`)**:
  - Added `[Check Network Impact]` button next to `[Run What-If]` in `planner-view.tsx`.
- **What-If Integration (`/what-if`)**:
  - Added `[Check Network Impact]` button in header and `[Check Cross-Corridor Impact]` in scenario card.
- **Network Intelligence Integration (`/network-intelligence`)**:
  - Added "Multi-Corridor Network Coordination" summary banner and header entry button.
- **Navigation (`/lib/nav.ts`)**:
  - Added `Network Coordination` item under `Intelligence` section in sidebar.

---

## 12. Verification & Test Results
### Automated Test Suites
- **Phase 6 Suite (`test_phase6_coordination.js`)**: 27/27 tests passed.
  - Direct tests: 22/22 passed.
  - Phase 1 regression (`test_all_endpoints.js`): 13/13 passed.
  - Phase 2 regression (`test_phase2_planner.js`): 20/20 passed.
  - Phase 3 regression (`test_phase3_conflicts.js`): 17/17 passed.
  - Phase 4 regression (`test_phase4_network.js`): 37/37 passed.
  - Phase 5 regression (`test_phase5_whatif.js`): 23/23 passed.
  - **Total Tests Passed**: 137 / 137 tests passing (100%).
- **TypeScript**: 0 errors.
- **Next.js Production Build**: `npm run build` completed successfully (16/16 routes generated).
