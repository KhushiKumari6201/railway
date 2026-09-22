# 🚆 Rail-Sanket — Complete Railway Block Planning Project & Demo Guide
> **Intelligent Automatic Block Planning & Maintenance Bundling Decision-Support System for Indian Railways**  
> *Target Division: Kharagpur Division, South Eastern Railway (SER)*

---

## 📌 Table of Contents
1. [Project Overview (Railway Problem & Our Solution)](#1-project-overview)
2. [Route Architecture Overview](#2-route-architecture-overview)
3. [Authentication & Demo Officer System (`/auth`)](#3-authentication--demo-officer-system)
4. [Public Showcase Website (`/`)](#4-public-showcase-website)
5. [Global Shell: Topbar & Sidebar Navigation](#5-global-shell-topbar--sidebar-navigation)
6. [Section 1: Operations Dashboard (`/dashboard`)](#6-section-1-operations-dashboard)
7. [Section 2: Maintenance Queue / Unified Backlog (`/queue`)](#7-section-2-maintenance-queue)
8. [Section 3: Automatic Block Planner (`/planner`)](#8-section-3-automatic-block-planner)
9. [Section 4: Smart Recommendations (`/recommendations`)](#9-section-4-smart-recommendations)
10. [Section 5: Monthly Plan (`/monthly`)](#10-section-5-monthly-plan)
11. [Section 6: Conflicts Resolution (`/conflicts`)](#11-section-6-conflicts-resolution)
12. [Judges & Video Presentation Script (Hindi + English)](#12-judges--video-presentation-script)

---

## 1. Project Overview

### ❓ Indian Railways Ki Asli Problem Kya Hai?
Indian Railways me tracks, signals aur overhead electric wires (OHE) ko regular maintenance chahiye hoti hai.
Lekin train tracks par kaam karne ke liye **Traffic Block** (train rokna) ya **Power Block** (electricity kaatna) lena padta hai.
- **Problem 1 (Siloed Systems):** Track department (*TMS*), Signal department (*SMMS*), aur Traction department (*TDMS*) sab apna-apna block alag-alag maangte hain. Isse ek hi track par bar-bar trains roki jaati hain aur heavy delay hota hai.
- **Problem 2 (Capacity Conflict):** Passenger trains (jaise Vande Bharat, Rajdhani, Coromandel Express) ki punctuality kharab hoti hai agar galat time par block le liya jaye.
- **Problem 3 (Manual Spreadsheets):** Divisional Officers manual diary aur phone calls par blocks coordinate karte hain, jisme human error aur miscommunication ka bohot bada risk hota hai.

### 💡 Rail-Sanket Ka Solution
Rail-Sanket ek **Intelligent Decision-Support System** hai jo:
1. Teeno departments (Civil, S&T, Electrical) ke pending tasks ko ek **Unified Backlog** me laata hai.
2. Un tasks ko geographic corridor aur available time gap ke basis par **Bundle (Group)** karta hai.
3. Live train timetable ke saath **Conflict Check** karta hai taaki express trains delay na ho.
4. Officer ko **Explainable Recommendation** deta hai ("Kyu ye block recommend kiya gaya?").
5. **Planner-in-the-loop**: Final decision hamesha railway officer ke haath me hota hai (Approve / Modify / Reject).

---

## 2. Route Architecture Overview

* **`/` (Public Website / Landing Page):** Public showcase website for Indian Railways, detailing the vision, challenge, human-in-the-loop AI, and benefits.
* **`/auth` (Officer Login Portal):** Secure login page with 1-click access for 4 core railway engineering cadres.
* **`/dashboard` (Operations Command Center):** Full railway planning dashboard with KPIs, corridor availability, and active schedules.
* **`/queue` (Unified Maintenance Backlog):** Cross-departmental task aggregation (TMS, SMMS, TDMS).
* **`/planner` (Automatic Block Planner):** 4-step block discovery and bundling engine.
* **`/recommendations` (Smart AI Recommendations):** Bundled multi-department blocks with explainability.
* **`/monthly` (Monthly Plan):** 30-day capacity and bottleneck analysis.
* **`/conflicts` (Train Path Protection):** Passenger train overlap detection and 1-click resolution.

---

## 3. Authentication & Demo Officer System

### 📍 Route: `/auth` (Redirects automatically from `/login`)

### Login Page Ke Components & Buttons:
1. **Official Officer Login Form:**
   - **Email Input:** Official Indian Railways Railnet ID (jaise `srdom.kgp@ser.railnet.gov.in`).
   - **Password Input:** Secure officer credentials.
   - **"Sign In" Button:** Credentials validate karke local session generate karta hai aur user ko Dashboard (`/dashboard`) par bhejta hai.
2. **Demo Officer Quick Access Selector:**
   - **Purpose:** Live evaluation aur demo ke liye banaya gaya hai taaki bina email type kiye 1 click me different departments ke perspective se login karke dikhaya ja sake.
   - Isme **4 Core Railway Categories (Cadres)** hain:
     | Cadre | Name | Role / Designation | Department | Asli Kaam (Responsibility) |
     | :--- | :--- | :--- | :--- | :--- |
     | **IRTS** | S. K. Mukherjee | Sr. DOM (Divisional Operations Manager) | Operating (Traffic) | Train punctuality, line capacity, final block sanction |
     | **IRSE** | Rajesh Verma | Sr. DEN / Planning | Civil Engineering (Track) | Rail fractures, tamping, deep screening, bridge repair (TMS) |
     | **IRSEE** | Amit Sen | Sr. DEE / TRD | Electrical Traction | OHE wire height, pantograph inspection, power substations (TDMS) |
     | **IRSSE** | Priya Nair | Sr. DSTE | Signalling & Telecom | Point machines, track circuits, electronic interlocking (SMMS) |
   - **"Continue as Demo Officer" Button:** Click karte hi selected officer ka role activate ho jaata hai aur seedha Dashboard (`/dashboard`) khul jaata hai.
3. **Already Signed In State:**
   - Agar user already logged in hai aur `/auth` page par jaata hai, toh use clear message milta hai: *"You're already signed in as [Name]"* sath me **"Open Dashboard"** (`/dashboard`), **"Sign Out"**, aur **"Return to Public Website"** (`/`).

---

## 4. Public Showcase Website (`/`)

### 🎯 Purpose
Indian Railways authority, general public, aur evaluators ke liye ek high-impact showcase page jo Rail-Sanket system ke benefits aur working model ko visualise karta hai.
- **Header Navigation:** Brand logo + Direct links to Overview, Challenge, Workflow, Features, aur **"Officer Portal Login"** button.
- **Interactive Sections:**
  1. **Hero Section:** Value proposition + direct CTA to access the portal.
  2. **Trust Strip:** Key metrics (`96.8%` asset availability, `375 min` downtime saved).
  3. **Challenge Breakdown:** Visual comparison of legacy manual scheduling vs Rail-Sanket automated bundling.
  4. **5-Step Execution Workflow:** Data Ingestion ➔ Window Identification ➔ Conflict Detection ➔ AI Bundling ➔ Officer Approval.
  5. **Human-in-the-Loop AI:** Explains why the human planner always retains 100% final override authority.

---

## 5. Global Shell: Topbar & Sidebar Navigation

### 🧭 Sidebar Navigation (Left Panel)
- **Brand Header:** `RAILWAY BLOCK PLANNER` + `Kharagpur Division` subtitle.
- **Section: PLANNING**
  - **Dashboard (`/dashboard`):** Complete operational overview.
  - **Maintenance Queue (`/queue`):** Unified cross-department backlog.
  - **Block Planner (`/planner`):** Corridor & date-based block scheduling wizard.
  - **Monthly Plan (`/monthly`):** 30-day capacity planning & exceptions.
- **Section: INTELLIGENCE**
  - **Smart Recommendations (`/recommendations`):** Bundled block suggestions with AI explainability (Badge: 4).
  - **Conflicts (`/conflicts`):** Real-time train path and resource clash detector (Badge: 6).
- **Navigation Utilities:**
  - **"Public Home Page" Button:** Direct 1-click link back to `/`.
- **Sidebar Footer:** Active officer summary card + **Logout Button** + **Sidebar Collapse Button** (`«`).

### 🔝 Topbar (Top Header)
1. **Active Route Title & Division:**
   - Current page ka naam: `Operations & Block Planning` + `Kharagpur Division` badge.
2. **Officer Name & Department Display:**
   - Real-time display: `S. K. Mukherjee · Operating Control`.
3. **Officer Profile Dropdown:**
   - Officer Avatar + "Profile" trigger button.
   - Click karne par executive card khulta hai:
     - Officer details, cadre, and department.
     - **1-Click Demo Officer Switcher:** Instant switch between S. K. Mukherjee (IRTS), Rajesh Verma (IRSE), Amit Sen (IRSEE), and Priya Nair (IRSSE) without logout!
     - **"Return to Public Website" Link:** Seedha landing page par jaane ke liye.
     - **"Logout" Button:** Active duty session terminate karke `/auth` par redirect karta hai.

---

## 6. Section 1: Operations Dashboard (`/dashboard`)

### 🎯 Purpose
Operations controller aur Planning officer ka command center. Ek glance me pata chalta hai ki division me maintenance ka kya status hai.

### Key Elements & Buttons:
1. **Hero Banner:**
   - Indian Railways division badge (`Kharagpur Division · SER`).
   - Rail-Sanket Logo aur system description.
   - **Quick Action Buttons:**
     - `"Block Planner"` -> Seedha schedule karne ke liye le jaata hai.
     - `"Smart Recommendations"` -> AI recommendations par jump karta hai.
     - `"Maintenance Queue (85)"` -> Complete backlog table kholta hai.
2. **6 Core KPI Cards:**
   - **Pending Tasks (85):** Across all 5 corridors total open maintenance items.
   - **Critical Tasks (12):** Urgent safety items jinhe turant block chahiye.
   - **Available Block Hours (18.5 h):** Total line capacity permitted without canceling trains.
   - **Planned Block Hours (16.2 h):** Is hafte kitne hours block finalize ho chuke hain.
   - **Asset Availability (96.8%):** Track aur signal line availability score (↑ 1.4% improvement).
   - **Conflicts (6):** Passenger train overlaps jinhe resolve karna zaroori hai.
3. **Interactive Visualizations & Feeds:**
   - **Asset Availability & Utilization Chart:** Corridor-wise bar/line comparison.
   - **Priority Tasks Card:** Top high-priority work items (ENG-221, SNT-221, TD-101) with urgency score.
   - **Recommended Blocks Preview:** Instant "Approve" button available right on the dashboard.
   - **Active Conflicts Warning Card:** Alert box highlighting urgent clashes.

---

## 7. Section 2: Maintenance Queue (`/queue`)

### 🎯 Purpose
Indian Railways ke 3 alag-alag legacy software systems:
- **TMS (Track Management System)** - Civil Engineering
- **SMMS (Signal Maintenance Management System)** - S&T
- **TDMS (Traction Distribution Management System)** - Electrical TRD  
In sabhi ke maintenance work orders ko ek single normalized database me aggregate karta hai.

### Key Elements & Buttons:
1. **Top Metrics Strip:**
   - `Open Tasks: 35`
   - `Critical Priority: 5`
   - `Overdue Items: 27` (jo scheduled date se late chal rahe hain)
   - `Total Normalized: 40`
2. **Action Buttons:**
   - **"Sync feeds" Button:** Live API call simulate karta hai aur latest TMS, SMMS, TDMS records pull karke toast notification dikhata hai.
   - **"Export CSV" Button:** Pura normalized work backlog instant `.csv` file format me download karta hai (real spreadsheet download).
3. **Search & Multi-level Filter Bar:**
   - **Search Input:** Task ID (jaise `ENG-221`), asset code, ya station location (`SRC Yard`, `BLS-CTC`) se instant search.
   - **Department Filter:** All, Engineering, S&T, Traction.
   - **Corridor Filter:** All, C01 (Howrah–Kharagpur), C02 (Kharagpur–Bhadrak), C03 (Kharagpur–Tatanagar), etc.
   - **Criticality Filter:** All, Critical, High, Medium, Low.
4. **Interactive Backlog Table:**
   - **Priority Score (0–100):** AI multi-factor algorithm se calculated score (safety risk, overdue days, train density). Critical items red badge me highlight hote hain.
   - **Columns:** Priority, Task Name & Location, Dept, Corridor, Criticality, Required Block Type (Corridor Block, Power Block, Signal Disconnection), Due Date & Overdue Tag, Estimated Duration, Status.
   - **Click on any Row:** Row par click karte hi **Task Detail Drawer** khulta hai jisme complete technical history, safety requirements, aur **"Add to Block Planner"** button milta hai.

---

## 8. Section 3: Automatic Block Planner (`/planner`)

### 🎯 Purpose
Ye system ka **Core Scheduling Engine** hai. Ye check karta hai ki selected corridor aur date par train traffic me kab free time gap (window) hai, aur usme pending tasks ko kaise schedule kiya jaye.

### Step-by-Step Workflow (4-Step Stepper):
```
[1] Available Window ➔ [2] Candidate Tasks ➔ [3] Smart Recommendation ➔ [4] Planner Approval
```

### Controls & Interactive Features:
1. **Selection Bar:**
   - **Date Picker:** Date select karein (e.g., `2026-09-24`).
   - **Corridor Dropdown:** 5 major corridors me se select karein (e.g., `C03 — Kharagpur–Tatanagar`).
   - **"Find Best Block" Button:** Search algorithm run karta hai aur optimal non-conflicting time slots dhoondhta hai.
2. **Primary Recommended Window (10:00 AM – 12:00 PM, 2 Hours):**
   - **Sparkles Badge: Recommended**
   - Availability: `Good` · Lines: `Up & Down Lines`.
   - **Candidate Tasks List (Bundled):**
     - `ENG-221`: Rail inspection & weld check (45m - Engineering)
     - `SNT-221`: Signal point machine verification (35m - S&T)
     - `TD-101`: OHE contact wire height inspection (40m - Traction)
   - **Live Metrics Counter:**
     - Total Duration: `2h 00m (120 min)`
     - Window Capacity: `120 min (2.0h)`
     - Window Utilization: `100%` (Perfect bundling)
3. **"Modify" Button (Interactive What-If):**
   - Click karne par tasks ke aage checkboxes active ho jaate hain.
   - Kisi task ko uncheck karte hi Live Metrics turant update hoti hain (duration kam hoti hai, utilization drop hota hai).
   - "Done Modifying" click karke modification lock ho jaata hai.
4. **"Why recommended?" Explainable AI Card:**
   - Clear bullet points me logic explain karta hai:
     - Sabhi tasks ek hi physical corridor section par hain.
     - 2 ghante ke window me smoothly fit ho rahe hain.
     - Passenger train timetable ke saath 0 conflict hai.
5. **"Approve Plan" Button:**
   - Click karte hi status green badge me change ho jaata hai: `Plan Approved`.
   - System alert toast dispatch karta hai: *"Block Plan Approved. Notice dispatched to Divisional Operating Control."*
6. **Secondary Window Card (2:00 PM – 3:30 PM, 1.5 Hours):**
   - Lower suitability window (freight train BCN/321 ke sath minor overlap) ko backup option ke roop me dikhata hai.
   - **"View Window" Button:** Primary aur secondary window ke beech toggle karta hai.

---

## 9. Section 4: Smart Recommendations (`/recommendations`)

### 🎯 Purpose
Cross-departmental **AI Bundling Engine**. Ye automatic machine learning bundling logic apply karke multi-department tasks ko single block me club karta hai taaki bar-bar line block lene ki zaroorat na pade.

### Metrics Strip:
- **Recommended Blocks:** `4`
- **Approved by Planner:** `0` (User approval track karta hai)
- **Total Tasks Bundled:** `12` (Across 3 departments)
- **Avg. Window Utilization:** `81.5%` (`375 minutes` of railway downtime saved!)

### Top Action:
- **"Approve All Pending" Button:** Ek click me sabhi pending recommendations ko approve karke weekly operational schedule me lock kar deta hai.

### Recommendation Cards (REC-01 to REC-04):
Har card me detailed breakdown hota hai:
1. **Header:** Recommendation ID (e.g. `REC-01`), Corridor (`KGP–TATA`), Priority Score (`92`).
2. **Key Parameters Grid:**
   - Corridor: `KGP–TATA`
   - Window: `10:00 – 12:00`
   - Tasks Count: `4 tasks`
   - Utilization: `83%`
3. **Bundled Tasks Badges:**
   - `ENG-221 (Track)`, `SNT-221 (Signal)`, `TD-101 (OHE)`, `ENG-268 (Alignment)`
4. **"Why recommended?" Checklist (Explainability):**
   - High priority track safety tasks included.
   - Zero passenger train regulation needed.
   - Both power block and traffic block synchronized.
5. **Card Action Buttons:**
   - **"Approve Block" Button:** Specific block ko approve karta hai, status toggle karta hai, aur count update karta hai.
   - **"Reject" Button:** Infeasible hone par block cancel ya revise karta hai.
   - **"View in Planner" Button:** Detailed 4-step planner me jump karta hai.

---

## 10. Section 5: Monthly Plan (`/monthly`)

### 🎯 Purpose
Divisional Chief Planning Officer ke liye **Macro-Level (30 Days) Capacity Planning**. Ye dikhata hai ki pure mahine me corridors par kitna maintenance quota hai aur kitni capacity bachi hai.

### Key Sections:
1. **Corridor Monthly Capacity Bars:**
   - Har corridor (Howrah–KGP, KGP–Bhadrak, KGP–Tatanagar) ke liye:
     - **Demand Hours** (Kitne hours maintenance chahiye)
     - **Permitted Capacity** (Traffic kitne hours allow kar sakta hai)
     - Visual progress bar showing saturation level.
2. **4 Weekly Plan Summaries:**
   - **Week 1:** Completed (14.5 h)
   - **Week 2:** Completed (16.0 h)
   - **Week 3 (Current):** Active Planning (16.2 h)
   - **Week 4:** Scheduled (15.5 h)
3. **Unscheduled Exceptions & Bottlenecks Card:**
   - Aise critical tasks jo heavy passenger traffic ki wajah se weekday me schedule nahi ho sakte (jaise Howrah Yard point machine repair during peak local EMU hours).
   - System unke liye **Actionable Workarounds** suggest karta hai: *"Carry forward to Sunday night power block window"*.
4. **30-Day Calendar Grid:**
   - September 2026 ke har din ka status dikhata hai (Planned Block days vs Clear traffic days).

---

## 11. Section 6: Conflicts Resolution (`/conflicts`)

### 🎯 Purpose
**Train Path Protection Engine**. Indian Railways me punctuality sabse badi priority hoti hai. Agar koi proposed maintenance block kisi premium train (Rajdhani, Vande Bharat, Express) ke schedule ke saath takraye, toh ye system instant alert raise karta hai.

### Key Elements & Actions:
1. **Severity Filters:**
   - Buttons: `All (6)`, `Critical (2)`, `High (3)`, `Medium (1)`, `Resolved (0)`.
2. **Conflict Cards (e.g. CF-01, CF-02, CF-03):**
   - **CF-02 (Critical):** Proposed 11:30 AM block on Howrah–KGP overlaps with **12841 Coromandel Express**.
   - **CF-01 (High):** Track tamping and OHE inspection simultaneously demanding the same track without synchronization.
3. **"Resolve Conflict" Button & Modal:**
   - Har conflict card par "Resolve Conflict" button hota hai.
   - Ispe click karte hi interactive **Resolution Dialog** khulta hai:
     - **Impact Analysis:** Punctuality loss risk, train detention minutes, safety assessment.
     - **Recommended Fix:** System suggestion (e.g., *"Shift block start by 25 minutes to 11:55 AM after Coromandel Express clears the section"*).
     - **"Apply Resolution" Button:** Fix accept karta hai, conflict ko `Resolved` mark karta hai, aur status green ho jaata hai.

---

## 12. Video & Technical Presentation Script (Hindi + English)

Agar aapko 3 se 5 minute ke video me ya evaluators ke samne live demo dena ho, toh is flow aur script ko follow karein:

### Step 1: Introduction (30 seconds)
> *"Namaste, hum present kar rahe hain **Rail-Sanket**, Indian Railways ke liye ek Automatic Block Planning aur Multi-Departmental Maintenance Bundling Decision-Support System.*  
> *Indian Railways me sabse badi problem ye hai ki Track, Signal aur Electrical departments alag-alag block maangte hain, jisse train delays hote hain. Hamara system teeno departments ke work ko intelligent algorithms se club karta hai aur train timetable ke sath conflict detect karke zero-detention maintenance schedule banata hai."*

### Step 2: Login & 4 Engineering Roles Demo (45 seconds)
> *(Navigate to `/auth`)*  
> *"Ye hamara official Railway Officer Login Portal hai. System demo ke liye humne Indian Railways ke 4 core engineering cadres integrate kiye hain:*  
> 1. **IRTS - Operations:** S. K. Mukherjee, jo traffic flow aur final block clearance dekhte hain.  
> 2. **IRSE - Civil:** Track maintenance aur rail fractures ke liye.  
> 3. **IRSEE - Traction:** OHE electric wire repair ke liye.  
> 4. **IRSSE - S&T:** Signal aur point machine repair ke liye.  
> *Hum 1-click se 'Operations Planner' ke roop me enter karte hain."*

### Step 3: Unified Maintenance Backlog (45 seconds)
> *(Navigate to `/queue`)*  
> *"Ye hai hamara Unified Maintenance Backlog. Yaha TMS, SMMS aur TDMS ke pending orders normalized hain. Har task ka AI priority score calculated hai based on safety, delay aur location. Officer yaha se directly live feeds sync kar sakta hai ya pura data CSV me export kar sakta hai."*

### Step 4: Automatic Block Planner & Interactive Modifying (60 seconds)
> *(Navigate to `/planner`)*  
> *"Ye hamare system ka Core Engine hai — Automatic Block Planner.*  
> *Jab hum date aur corridor (jaise Kharagpur–Tatanagar) select karke 'Find Best Block' par click karte hain, toh system optimal 2-hour window (10:00 AM to 12:00 PM) dhoondh nikalta hai.*  
> *Aap dekh sakte hain ki isne teeno departments ke tasks ko ek hi window me bundle kar diya hai, jisse 100% window utilization achieve hui hai.*  
> *Agar planner chahe, toh 'Modify' button daba kar tasks add ya remove kar sakta hai aur live metrics instant update hoti hain. Sab check karne ke baad 'Approve Plan' dabate hi notification Divisional Control ko dispatch ho jaati hai."*

### Step 5: Smart Recommendations & Conflicts (45 seconds)
> *(Navigate to `/recommendations` then `/conflicts`)*  
> *"Smart Recommendations page par AI bundling engine ne 4 major blocks create kiye hain jisse 375 minutes ka railway downtime save ho raha hai. Sabse important feature hai 'Why recommended?' jaha officer ko explainable reasons milte hain — koi black box nahi hai.*  
> *Aur Conflicts section me agar koi block Coromandel Express ya kisi passenger train ke raste me aata hai, toh system pehle hi alert de deta hai aur 1-click me block shift karke train ko delay hone se bacha leta hai."*

### Step 6: Conclusion (15 seconds)
> *"Is tarah Rail-Sanket Indian Railways me Safety, Punctuality aur Inter-Departmental Coordination ko automate aur streamline karta hai. Thank you!"*

---

## 🛠️ Quick Start & Running Locally
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser:
- Public Landing Page: `http://localhost:3000/`
- Officer Login: `http://localhost:3000/auth`
- Operations Dashboard: `http://localhost:3000/dashboard`
