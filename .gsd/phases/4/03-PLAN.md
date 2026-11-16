---
phase: 4
plan: 3
wave: 3
depends_on: ["01", "02"]
gap_closure: false
---

# Plan 4.3: Live Dashboard Maintenance Integration & Comprehensive Automated Verification Suite

## Objective
Wire preventive maintenance schedules and service alerts directly into the live root dashboard (`/`), giving users a unified operational view across warranties, returns, and maintenance. Deliver the comprehensive automated verification test suite (`scripts/verify-phase-4.ts`) validating interval calculations, priority status classifications, recurrence cycle advancements, CRUD server actions, REST API routes, and metric rollups.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/4/RESEARCH.md
- .gsd/phases/4/01-PLAN.md
- .gsd/phases/4/02-PLAN.md
- lib/actions/dashboard.ts
- components/dashboard/MetricCards.tsx
- app/page.tsx
- package.json
- scripts/verify-phase-3.ts

## Tasks

<task type="auto">
  <name>Wire maintenance alerts and upcoming service deadlines into root dashboard</name>
  <files>
    lib/actions/dashboard.ts
    components/dashboard/MetricCards.tsx
    app/page.tsx
  </files>
  <action>
    Integrate maintenance schedules and service alerts into the unified dashboard aggregation engine.

    Steps:
    1. Update `lib/actions/dashboard.ts`:
       - Query maintenance schedules in `prisma.maintenanceSchedule.findMany` with asset details.
       - Enhance each schedule using `enhanceMaintenanceSchedule` from `lib/services/maintenanceEngine.ts`.
       - In `DashboardMetrics`:
         - Add `pendingMaintenanceCount: number` (count of schedules with status `DUE` or `OVERDUE`).
         - Add `totalMaintenanceSpent: number` (sum of all recorded `MaintenanceLog.cost`).
       - In `UpcomingDeadlineItem`:
         - For schedules that are `OVERDUE`, `DUE`, or upcoming within 30 days:
           - `id`: `m-${schedule.id}`
           - `name`: `${schedule.asset?.name || "Asset"} — ${schedule.title}`
           - `category`: schedule.asset?.category || "Maintenance"
           - `type`: "Service Schedule"
           - `daysLeft`: schedule.remainingDays ?? 0
           - `date`: schedule.nextServiceDate ? new Date(schedule.nextServiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (schedule.remainingMileage ? `${schedule.remainingMileage} mi left` : "Pending")
           - `status`: schedule.calculatedStatus === "OVERDUE" ? "urgent" : schedule.calculatedStatus === "DUE" ? "expiring" : "normal"
           - `link`: "/maintenance"
         - Merge maintenance deadlines into `deadlineCandidates`.
       - Sort unified `deadlineCandidates` by `daysLeft` ascending so that the most pressing deadlines (warranties, returns, or maintenance) appear at the top.

    2. Update `components/dashboard/MetricCards.tsx` and `app/page.tsx`:
       - Surface maintenance health in the dashboard:
         - Display pending maintenance services alert or metric card indicating services requiring attention.
         - Ensure upcoming deadline list displays wrench icon / service schedule badges clearly differentiating maintenance items from warranty expirations.

    AVOID: Breaking existing dashboard metrics or types.
    USE: Additive metrics properties and unified deadline sorting.
  </action>
  <verify>
    npx tsx -e "import { getDashboardData } from './lib/actions/dashboard'; getDashboardData().then(d => { if (!d.success) throw new Error(d.error); console.log('Dashboard data verified:', d.data?.metrics); });"
  </verify>
  <done>
    Root dashboard reflects maintenance schedules in upcoming deadlines and displays service alert metrics.
  </done>
</task>

<task type="auto">
  <name>Implement comprehensive automated verification test suite for Phase 4</name>
  <files>
    scripts/verify-phase-4.ts
    package.json
  </files>
  <action>
    Create the automated verification script `scripts/verify-phase-4.ts` and add `"test:phase4"` to `package.json`.

    Steps:
    1. Create `scripts/verify-phase-4.ts`:
       - Define test runner framework patterned after `scripts/verify-phase-3.ts` with timing, pass/fail counts, and assertions.
       - Section 1: Date & Interval Math:
         - Test `addMonthsSafely`:
           - Standard 3-month addition.
           - Month-end clamping (e.g., Jan 31 + 1 month = Feb 28 or 29).
           - Year rollover (e.g., Nov 15 + 3 months = Feb 15 of next year).
         - Test `calculateRemainingDays`:
           - Future date gives positive days.
           - Past date gives negative days.
           - Null date gives null.
       - Section 2: Mileage Tracking & Distance Remaining:
         - Test `calculateRemainingMileage`:
           - `lastServiceMileage` 20,000 + `intervalMileage` 5,000 vs `currentMileage` 24,000 -> 1,000 miles remaining.
           - Exceeded mileage gives negative remaining mileage.
       - Section 3: Status Classification Rules:
         - Calendar status: > 14d -> `UPCOMING`, <= 14d -> `DUE`, < 0d -> `OVERDUE`.
         - Mileage status: > 500mi -> `UPCOMING`, <= 500mi -> `DUE`, < 0mi -> `OVERDUE`.
         - Priority precedence:
           - Overdue mileage + upcoming date -> `OVERDUE`.
           - Overdue date + upcoming mileage -> `OVERDUE`.
           - Due date + upcoming mileage -> `DUE`.
           - One-off completed -> `COMPLETED`.
       - Section 4: Recurrence Advancement Cycle:
         - Advancing a schedule with `intervalMonths: 6` and `intervalMileage: 5000`:
           - Verify `lastServiceDate` equals logged date.
           - Verify `nextServiceDate` equals logged date + 6 months.
           - Verify `lastServiceMileage` updated.
           - Verify status transitions back to `UPCOMING`.
       - Section 5: End-to-End Database Operations & Server Actions:
         - Seed temporary test asset (e.g., "Verification Test Vehicle").
         - Call `createMaintenanceSchedule`.
         - Query `getMaintenanceSchedules` and verify enhanced fields.
         - Call `logServiceCompleted`:
           - Verify `MaintenanceLog` record created with actual cost and notes.
           - Verify `MaintenanceSchedule` advanced to next cycle.
         - Call `getMaintenanceLogs` and verify log retrieval.
         - Call `getMaintenanceSummaryMetrics` and verify totals and expenditure sum.
         - Clean up test asset and associated records.
       - Section 6: REST API Handlers:
         - Verify API route handlers export GET, POST, PATCH, DELETE.

    2. Update `package.json`:
       - Add `"test:phase4": "tsx scripts/verify-phase-4.ts"` under `"scripts"`.

    3. Execute `npm run test:phase4` and ensure all checks pass with 0 failures.
  </action>
  <verify>
    npm run test:phase4
  </verify>
  <done>
    `npm run test:phase4` executes completely and all assertion checks pass with zero failures.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Root dashboard surfaces maintenance alerts and upcoming service deadlines.
- [ ] `scripts/verify-phase-4.ts` comprehensively validates date math, mileage math, status priorities, cycle advancements, and DB operations.
- [ ] `npm run test:phase4` runs with 100% pass rate.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
