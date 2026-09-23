# Phase 5 — What-If Scenario Simulation & Decision Support

## 1. Phase 5 Objective
The objective of Phase 5 is to build a functional, railway controller decision-support module: **"What-If Scenario Simulation & Decision Support"** (`/what-if`). 

It allows railway controllers and maintenance planners to test hypothetical changes to block windows, task bundles, and timetable train delays in-memory before committing any actual maintenance blocks.

> [!IMPORTANT]
> **Data Safety & Simulation Disclaimer**:
> What-If simulations are **100% read-only** and executed entirely in memory. Simulations do **not** approve blocks, schedule tasks, modify conflicts, or mutate MongoDB collections or `timetableData.js`. The UI prominently displays `SIMULATION MODE`.

---

## 2. What-If Architecture
```
┌───────────────────────────────────────────────────────────┐
│                      BLOCK PLANNER                        │
│   (Select Corridor, Date, Candidate Tasks, Window)        │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ "Run What-If"
┌───────────────────────────────────────────────────────────┐
│                    WHAT-IF MODULE                         │
│  - Baseline Plan (Loaded from active plan or database)     │
│  - Parameter Sandbox (Window, Tasks, Train Delay +Xm)     │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ POST /api/what-if/simulate
┌───────────────────────────────────────────────────────────┐
│              IN-MEMORY SIMULATION ENGINE                  │
│  - In-Memory Train Delay Shift (timetableData cloned)     │
│  - Reuses conflictService.js (persist: false)             │
│  - Evaluates Window Capacity & 20m Safety Buffer          │
│  - Calculates Simulated Delay Impact & Utilization        │
│  - Classifies Operational Impact (LOW/MEDIUM/HIGH/CRIT)   │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ Factual Decision Support
┌───────────────────────────────────────────────────────────┐
│             SIDE-BY-SIDE COMPARISON TABLE                 │
│  (Baseline vs Scenario A vs Scenario B — Controller picks)│
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼ "Apply Scenario to Planner"
┌───────────────────────────────────────────────────────────┐
│                      BLOCK PLANNER                        │
│  (Parameters updated without approval; Controller clicks   │
│   "Approve Plan" to commit actual block to MongoDB)       │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Scenario Data Structure
The scenario object represents a hypothetical maintenance block:
```typescript
interface WhatIfScenario {
  scenarioId?: string
  scenarioName?: string
  baseBlockId?: string | null
  corridorId: string
  section?: string
  date: string
  start: string
  end: string
  durationMin?: number
  taskIds: string[]
  trainDelayAdjustments?: { trainNumber: string; delayMinutes: number }[]
  blockType?: string
  mode?: 'SIMULATION'
}
```

---

## 4. Simulation API Endpoints

### 1. `POST /api/what-if/simulate`
- **Request Body**:
  ```json
  {
    "baseBlockId": "REC-C01-20260924",
    "scenario": {
      "corridorId": "C01",
      "section": "HWH–SRC",
      "date": "2026-09-24",
      "start": "14:00",
      "end": "15:30",
      "durationMin": 90,
      "taskIds": ["SNT-221"],
      "trainDelayAdjustments": [{ "trainNumber": "12841", "delayMinutes": 15 }]
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "mode": "SIMULATION",
    "scenario": { ... },
    "conflicts": {
      "hasConflict": false,
      "hasBlockingConflict": false,
      "conflicts": []
    },
    "impact": {
      "taskCount": 1,
      "durationMin": 90,
      "totalTaskWorkMin": 90,
      "availableWorkingMin": 70,
      "safetyBufferStatus": "FAIL",
      "criticalConflicts": 0,
      "warningConflicts": 0,
      "affectedTrains": 0,
      "simulatedDelayMinutes": 0,
      "utilizationPercent": 100,
      "operationalImpact": "MEDIUM"
    }
  }
  ```

### 2. `POST /api/what-if/compare`
- Evaluates a baseline scenario alongside multiple alternative scenarios and returns side-by-side impact metrics for comparative decision making.

---

## 5. Train Delay Simulation (In-Memory Only)
- User selects any scheduled train from `timetableData.js` (e.g. `12841 Coromandel Express`).
- Selects delay: `+0m`, `+5m`, `+10m`, `+15m`, `+30m`, `+60m`.
- `applyTrainDelayAdjustments()` creates a temporary in-memory clone with shifted arrival and departure times.
- `timetableData.js` and MongoDB are never modified.
- Subsequent requests without delays automatically evaluate clean schedules.

---

## 6. Conflict Detection & Safety Buffer Integration
- Reuses `checkBlockConflicts(hypotheticalBlock, { persist: false, customTrainMovements })`.
- Calculates task duration vs available working time:
  $$\text{Available Working Time} = \text{Window Duration} - 20\text{ minutes}$$
- If task work duration $\le$ available working time: `safetyBufferStatus = 'PASS'`.
- If task work duration $>$ available working time: `safetyBufferStatus = 'FAIL'`.

---

## 7. Deterministic Impact Calculations
1. **Simulated Delay Impact**:
   $$\text{Simulated Delay} = \sum_{\text{overlapping trains}} (\min(\text{blockEnd}, \text{trainEnd}) - \max(\text{blockStart}, \text{trainStart}))$$
2. **Window Utilization**:
   $$\text{Utilization} = \min\left(100, \text{round}\left(\frac{\text{Total Task Duration}}{\text{Window Duration}} \times 100\right)\right)\%$$
3. **Operational Impact Classification**:
   - `CRITICAL`: Blocking conflicts $> 0$ or critical conflicts $> 0$.
   - `HIGH`: Multiple affected trains ($> 1$) or simulated delay $> 30$ min.
   - `MEDIUM`: Warning conflicts $> 0$, simulated delay $> 0$, or buffer status `'FAIL'`.
   - `LOW`: Zero conflicts and sufficient buffer capacity.

---

## 8. UI & Decision Support Rules
- **Controller Decision Authority**: The UI displays factual side-by-side metrics and explicitly avoids declaring any scenario as the "winner" or "best choice".
- **Planner Integration**:
  - In `PlannerView`, clicking **"Run What-If"** pre-fills the sandbox with active corridor, date, window, and tasks.
  - In `/what-if`, clicking **"Apply Scenario to Planner"** redirects back to `/planner` with the hypothetical window and tasks pre-selected.
  - The block is **not** approved until the controller clicks "Approve Plan" inside the Block Planner.

---

## 9. Automated Test Verification Results

### Test Execution: `node test_phase5_whatif.js`
- **Phase 5 Direct Tests**: 23/23 PASSED
- **Phase 1 Regression** (`test_all_endpoints.js`): 13/13 PASSED
- **Phase 2 Regression** (`test_phase2_planner.js`): 20/20 PASSED
- **Phase 3 Regression** (`test_phase3_conflicts.js`): 17/17 PASSED
- **Phase 4 Regression** (`test_phase4_network.js`): 37/37 PASSED
- **Total Automated Tests**: **110/110 PASSED (0 failures)**

### TypeScript Check:
```bash
npx tsc --noEmit
# Exit code: 0 (0 errors)
```

### Production Build:
```bash
npm run build
# Exit code: 0 (0 errors)
# All 15 routes compiled and pre-rendered successfully
```

---

## 10. Known Limitations & Recommended Phase 6
- **Current Limitation**: Scenarios are client-side / in-memory; historical scenarios reset on page refresh unless added to the local comparison table.
- **Recommended Phase 6**:
  - **Multi-Corridor Coordination & Global Schedule Optimization**: Simultaneous cross-division corridor scheduling, loco/crew roster constraints, and automated timetable conflict negotiation.
