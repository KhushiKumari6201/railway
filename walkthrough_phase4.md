# Phase 4 — Network Intelligence & Railway Traffic Visualization

## 1. Phase 4 Objective
The objective of Phase 4 is to build a functional, railway control-room style "Network Intelligence" module for Rail-Sanket. It aggregates actual data from MongoDB collections (`RecommendedBlock`, `Conflict`, `Task`) and scheduled timetable simulation data (`timetableData.js`) into a centralized, live sectional traffic model.

> [!IMPORTANT]
> **Data Integrity & Simulation Disclaimer**:
> This module strictly uses scheduled timetable simulation data and MongoDB records. It does **not** claim live GPS or real-time train tracking. The UI prominently displays `Network Mode: Simulation / Timetable Data`.

---

## 2. Files Changed and Created

### Backend:
- `backend/src/services/networkService.js` *(NEW)*: Centralized network data model, section status evaluation logic, train mapping, and network utilization formula.
- `backend/src/routes/network.js` *(NEW)*: REST route exposing `GET /api/network/intelligence` and `GET /api/network/corridors`.
- `backend/src/server.js` *(MODIFIED)*: Mounted `/api/network` route guarded with `requireDatabase`.
- `backend/test_phase4_network.js` *(NEW)*: 16-test suite covering direct network intelligence capabilities and regression tests across Phases 1, 2, and 3.

### Frontend:
- `frontend/lib/types.ts` *(MODIFIED)*: Added types `NetworkSectionStatus`, `NetworkSection`, `NetworkCorridor`, `NetworkTrain`, `NetworkActiveBlockSummary`, `NetworkSummary`, and `NetworkIntelligenceResponse`.
- `frontend/lib/api.ts` *(MODIFIED)*: Added `api.getNetworkIntelligence(corridorId?: string)`.
- `frontend/app/(main)/network-intelligence/page.tsx` *(REPLACED)*: Full-featured railway control-room schematic visualization, summary KPI cards, sectional inspector drawer, train movement panel, maintenance block panel, network alerts panel, and multi-dimensional filters.

---

## 3. New Backend API

### `GET /api/network/intelligence`
- **Query Parameters**: `corridorId` (optional, filters by specific corridor such as `C01`, `C02`, etc.)
- **Response Schema**:
```json
{
  "success": true,
  "mode": "SIMULATION / TIMETABLE DATA",
  "generatedAt": "2026-09-22T16:32:46.000Z",
  "corridors": [
    {
      "corridorId": "C01",
      "name": "Howrah–Kharagpur",
      "route": "HWH – SRC – KGP",
      "sections": [
        {
          "corridorId": "C01",
          "section": "HWH–SRC",
          "from": "Howrah (HWH)",
          "to": "Santragachi (SRC)",
          "status": "MAINTENANCE_BLOCK",
          "occupancy": {
            "isOccupied": true,
            "trainCount": 2,
            "trains": ["12841", "18045"]
          },
          "activeBlock": {
            "id": "REC-101",
            "date": "2026-09-14",
            "start": "10:00",
            "end": "12:00",
            "durationMin": 120,
            "status": "Approved",
            "blockType": "Traffic Block",
            "taskCount": 3
          },
          "trains": [...],
          "tasksCount": 4,
          "conflictsCount": 1,
          "utilization": 24
        }
      ],
      "utilization": 20,
      "totalSections": 3
    }
  ],
  "trains": [...],
  "activeBlocks": [...],
  "conflicts": [...],
  "summary": {
    "totalCorridors": 5,
    "totalSections": 12,
    "occupiedSections": 5,
    "maintenanceBlocks": 3,
    "activeConflicts": 2,
    "trainsInNetwork": 10,
    "utilizationPercent": 18
  },
  "metrics": {
    "formula": "Utilization = (Booked Block & Train Path Minutes / Available Window Minutes) * 100",
    "operationalWindowMinutesPerSection": 1440
  }
}
```

---

## 4. Network Data Structure
Corridors and sections represent the actual Kharagpur Division railway layout:
1. `C01`: **Howrah–Kharagpur** (`HWH–SRC`, `SRC–PKU`, `PKU–KGP`)
2. `C02`: **Kharagpur–Bhubaneswar** (`KGP–BLS`, `BLS–CTC`, `CTC–BBS`)
3. `C03`: **Kharagpur–Tatanagar** (`KGP–GII`, `GII–TATA`)
4. `C04`: **Bhubaneswar–Puri** (`BBS–KUR`, `KUR–PURI`)
5. `C05`: **Santragachi–Kharagpur (Freight)** (`SRC–ULT`, `ULT–KGP`)

---

## 5. Train Data Source
Reuses `backend/src/data/timetableData.js`. 10 train movements are represented across Superfast, Express, and Goods classes:
- `12841`: Coromandel Express (Howrah → Chennai Central)
- `12073`: Howrah Jan Shatabdi (Howrah → Barbil)
- `GDS-4412`: Freight BOXN (Panskura → Kharagpur Yard)
- `18045`: East Coast Express (Howrah → Hyderabad)
- `22201`: Duronto Express (Howrah → Puri)
- `12277`: Shatabdi Express (Howrah → Puri)
- `GDS-5521`: Freight BCN (Baleshwar → Bhubaneswar Yard)
- `12703`: Falaknuma Express (Howrah → Secunderabad)
- `18409`: Sri Jagannath Express (Howrah → Puri)
- `GDS-6610`: Freight BTAP (Santragachi → Kharagpur Yard)

Status is derived deterministically: `IN SECTION`, `APPROACHING`, `ON TIME`.

---

## 6. Block & Conflict Integration
- **Approved Blocks**: Blocks marked `Approved` in MongoDB appear in `activeBlocks` and turn the affected section status to `MAINTENANCE_BLOCK`.
- **Rejected Blocks**: Blocks marked `Rejected` in MongoDB are excluded from active maintenance blocks, resetting the section status.
- **Active Conflicts**: Unresolved conflicts (`resolved: false`) appear in `conflicts` and can escalate section status to `CONFLICT`.
- **Resolved Conflicts**: When marked `resolved: true`, conflicts disappear from active alerts.

---

## 7. Deterministic Section Status Priority Logic
1. `CLOSED` (if infrastructure track segment is closed)
2. `CONFLICT` (if an active unresolved critical/warning conflict affects the section)
3. `MAINTENANCE_BLOCK` (if an `Approved` maintenance block is active on the section)
4. `OCCUPIED` (if a timetable train path is currently traversing the section)
5. `RESERVED` (if a `Recommended` proposed block is pending approval)
6. `FREE` (no trains, active blocks, or conflicts)
7. `UNKNOWN`

---

## 8. Network Utilization Formula
Network utilization is computed dynamically from booked section minutes vs total available section minutes:

$$\text{Booked Section Minutes} = \sum \text{Maintenance Block Duration (min)} + \sum \text{Train Path Duration (min)}$$

$$\text{Section Utilization} = \min\left(100, \text{round}\left(\frac{\text{Booked Section Minutes}}{1440} \times 100\right)\right)\%$$

$$\text{Network Utilization} = \min\left(100, \text{round}\left(\frac{\sum_{\text{all sections}} \text{Booked Minutes}}{\text{Total Sections} \times 1440} \times 100\right)\right)\%$$

---

## 9. UI Features Implemented
- **Control-Room Schematic Layout**: Station nodes (`[HWH]`, `[SRC]`, `[KGP]`, `[TATA]`) connected by sectional track segments with real-time status badges.
- **KPI Summary Cards**: Total Corridors, Occupied Sections, Maintenance Blocks, Active Conflicts, Train Paths, Network Utilization %.
- **Multi-Dimensional Filters**: Corridor filter (`C01`–`C05`), Section Status filter (`FREE`, `OCCUPIED`, `MAINTENANCE_BLOCK`, `CONFLICT`, `RESERVED`), Train Type filter (`Superfast`, `Express`, `Goods`), Conflict Severity filter (`Critical`, `Warning`, `Info`).
- **Section Inspector**: Shows deep details for the clicked section (active block, trains present, task backlog, conflict alerts, utilization bar).
- **Train Movement Panel**: Complete timetable simulation path viewer.
- **Maintenance Block Panel**: Approved/Recommended blocks with direct links to the Block Planner.
- **Network Alerts Panel**: Unresolved conflicts with direct links to Conflict Management.
- **Refresh Control**: Non-polling manual refresh with "Simulation data refresh" indicator.

---

## 10. Verification & Test Results

### Phase 4 Automated Test Suite (`node test_phase4_network.js`):
- Direct Phase 4 Tests: **37/37 PASSED**
- Phase 1 Regression (`test_all_endpoints.js`): **13/13 PASSED**
- Phase 2 Regression (`test_phase2_planner.js`): **20/20 PASSED**
- Phase 3 Regression (`test_phase3_conflicts.js`): **17/17 PASSED**
- **Total Automated Tests**: **87 Passed, 0 Failed**

### TypeScript Check:
```bash
npx tsc --noEmit
# Exit Code: 0 (0 errors)
```

### Production Build:
```bash
npm run build
# Exit Code: 0 (0 errors)
# /network-intelligence statically pre-rendered successfully
```

---

## 11. Data Limitations & Transition to Real Feeds
- **Current Mode**: Timetable simulation dataset (`timetableData.js`).
- **How Real Feeds Replace Timetable Simulation in the Future**:
  1. Replace `timetableData.js` with an ingestion service consuming Indian Railways COA (Control Office Application) / FOIS (Freight Operations Information System) APIs or GTFS-RT feeds.
  2. The `networkService.js` architecture is decoupled: changing the data provider from `timetableData.js` to a real-time message queue (e.g. MQTT / Kafka or Redis stream) requires zero frontend code changes.

---

## 12. Recommended Phase 5
- **Phase 5**: What-If Scenario Simulation & AI/ML Window Optimization (enabling train controllers to simulate speed restrictions, late-running trains, and alternative diversion routes before locking blocks).
