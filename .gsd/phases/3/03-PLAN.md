---
phase: 3
plan: 3
wave: 3
depends_on: ["01", "02"]
gap_closure: false
---

# Plan 3.3: Warranties Hub UI, Live Dashboard Integration & Comprehensive Verification

## Objective
Deliver the customer-facing user interface for warranty management and return tracking, wire dynamic database metrics into the main dashboard overview, and validate the complete Phase 3 feature set with an automated verification suite covering calculation accuracy, status transitions, notifications, calendar exports, and UI components.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/3/RESEARCH.md
- .gsd/phases/3/01-PLAN.md
- .gsd/phases/3/02-PLAN.md
- app/page.tsx
- components/dashboard/MetricCards.tsx
- lib/actions/warranties.ts
- lib/actions/returnPolicies.ts
- lib/services/deadlines.ts
- lib/services/notifications.ts
- lib/utils/calendar.ts

## Tasks

<task type="auto">
  <name>Build dedicated Warranties & Expirations Hub UI with filterable cards and timeline bars</name>
  <files>
    components/warranties/WarrantyCard.tsx
    components/warranties/ReturnPolicyCard.tsx
    app/warranties/page.tsx
  </files>
  <action>
    Create the Warranties & Expirations Hub (`/warranties`) with interactive card components, visual progress bars, and calendar download triggers.

    Steps:
    1. Create `components/warranties/WarrantyCard.tsx`:
       - Accepts enhanced warranty prop (asset details, provider, warrantyType, startDate, endDate, policyNumber, supportContact, claimUrl, remainingDays, percentageElapsed, calculatedStatus).
       - Visual progress bar:
         - Width based on `percentageElapsed` (0% to 100%).
         - Color coded: emerald for healthy (`ACTIVE`), amber for expiring soon (`EXPIRING_SOON`), rose/gray for `EXPIRED`.
       - Status badge: "Active" (emerald), "Expiring in X days" (amber), "Expired" (rose).
       - Policy number & support contact info (with clickable `mailto:` or `tel:` link).
       - "Start Claim" / "Claim URL" button linking to `claimUrl` with external link icon.
       - "Add to Calendar" icon button that downloads single event from `/api/calendar/export?id=${warranty.id}&scope=warranties`.
    2. Create `components/warranties/ReturnPolicyCard.tsx`:
       - Accepts enhanced return policy prop (asset details, returnWindowDays, returnDeadline, policyDetails, calculatedStatus, remainingDays).
       - Countdown badge: "X days left to return" (urgent amber/rose if <= 7 days, emerald if > 7 days, slate if expired).
       - Action button: "Mark as Returned" (calls `updateReturnPolicyStatus` Server Action, transitions state, shows toast/success state).
       - "Add to Calendar" button downloading single event from `/api/calendar/export?id=${policy.id}&scope=returns`.
    3. Create `app/warranties/page.tsx` ('use client'):
       - Header with title: "Warranties & Expirations Hub" and subtitle.
       - Header Action: "Export All Deadlines (.ics)" button downloading `/api/calendar/export`.
       - Metric summary row:
         - Active Warranties count
         - Expiring Soon (30d) count
         - Open Return Windows count
         - Expired Items count
       - Interactive filter tabs:
         - "All"
         - "Active Warranties"
         - "Expiring Soon (30d)"
         - "Return Windows"
         - "Expired"
       - Real-time search bar (filters by asset name, provider, brand, or policy number).
       - Synchronize button: "Refresh Statuses" calling `/api/warranties/sync` with loading spinner.
       - Responsive cards grid rendering `WarrantyCard` and `ReturnPolicyCard`.
       - Empty state for search/filter misses with reset button.

    AVOID: Unresponsive desktop-only table layouts or unhandled null support contacts and claim URLs.
    USE: Mobile-first responsive grid cards with fallback UI when contacts or claim links are not specified.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `/warranties` route compiles and renders cleanly, filter tabs switch views dynamically, progress bars render percentage accurately, and calendar export links trigger downloads.
  </done>
</task>

<task type="auto">
  <name>Integrate dynamic database metrics and live deadline feed into dashboard overview</name>
  <files>
    lib/actions/dashboard.ts
    components/dashboard/MetricCards.tsx
    app/page.tsx
  </files>
  <action>
    Wire live database metrics and calculated upcoming deadlines into the main application dashboard.

    Steps:
    1. Create `lib/actions/dashboard.ts`:
       - `getDashboardData()`:
         - Fetches total asset count from Prisma.
         - Fetches physical vs digital asset breakdown.
         - Fetches all warranties enhanced with calculation fields.
         - Fetches all return policies enhanced with calculation fields.
         - Computes live counts:
           - `totalAssets`: count
           - `activeWarranties`: count of warranties where `calculatedStatus === "ACTIVE"`
           - `expiringSoonCount`: count of warranties expiring in <= 30 days + return windows expiring in <= 7 days
           - `activeReturnWindows`: count of return policies with `calculatedStatus === "OPEN"` or `"EXPIRING_SOON"`
         - Computes `upcomingDeadlines`:
           - Combines upcoming warranties (expiring in <= 60 days) and open return windows.
           - Maps to unified display objects: `{ id, name, category, type: "Warranty" | "Return Window", daysLeft, dateStr, status: "urgent" | "expiring" | "normal", link: "/warranties" }`.
           - Sorts ascending by `daysLeft` (urgent first).
           - Takes top 5.
         - Computes `recentAssets`:
           - Queries 5 most recent assets from Prisma with merchant and purchase price.
           - Includes warranty status badge for each asset.
         - Returns `{ success: true, data: { metrics, upcomingDeadlines, recentAssets } }`.
    2. Update `components/dashboard/MetricCards.tsx`:
       - Accept optional `metrics` prop with `{ totalAssets, activeWarranties, expiringSoonCount, activeReturnWindows, physicalCount, digitalCount }`.
       - If no prop provided, fetch automatically from `getDashboardData()`.
       - Display dynamic live values and descriptive subtitles:
         - "Total Registered Assets": count with "{physical} physical • {digital} digital".
         - "Active Warranties": count with "% of current assets covered".
         - "Expiring Soon (30d)": count with "Action required".
         - "Return Windows": count with "Pending decisions".
    3. Update `app/page.tsx`:
       - Load live dashboard metrics and feeds via `getDashboardData()`.
       - Replace hardcoded `expiringItems` array with dynamic `upcomingDeadlines`.
       - Replace hardcoded `recentAssets` array with live `recentAssets`.
       - Render empty state if user has no assets or no upcoming deadlines.
       - Ensure "View all" links point directly to `/warranties` and "View catalog" to `/assets`.

    AVOID: Hardcoded static mock numbers on the home dashboard.
    USE: Unified `getDashboardData()` action providing real-time computed statistics and sorted deadline feeds.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    Dashboard (`/`) displays live database counts, calculated upcoming deadlines replace hardcoded values, and `npm run build` succeeds without type errors.
  </done>
</task>

<task type="auto">
  <name>Build and execute comprehensive Phase 3 automated verification test suite</name>
  <files>
    scripts/verify-phase-3.ts
    package.json
  </files>
  <action>
    Create and execute the end-to-end integration and unit verification test suite for Phase 3.

    Steps:
    1. Create `scripts/verify-phase-3.ts` covering 6 verification sections:
       - **Section 1: Timeline & Calculation Math**:
         - Test `calculateRemainingDays` for future, past, today, and leap year dates.
         - Test `calculatePercentageElapsed` for mid-cycle (e.g. 50%), just started (0%), expired (100%), and lifetime warranties (0%).
         - Test `calculateWarrantyStatus` for >30d (`ACTIVE`), 30d/15d/1d (`EXPIRING_SOON`), and past (`EXPIRED`).
         - Test `calculateReturnStatus` for >7d (`OPEN`), 7d/3d/0d (`EXPIRING_SOON`), past (`EXPIRED`), and returned flag (`RETURNED`).
       - **Section 2: Database Status Synchronization**:
         - Create temporary test asset with an expired warranty currently labeled "ACTIVE" and a return policy past deadline labeled "OPEN".
         - Invoke `syncAllDeadlineStatuses()`.
         - Verify records in Prisma now have `status: "EXPIRED"` and `returnStatus: "EXPIRED"`.
         - Clean up test records.
       - **Section 3: Server Actions & Returns Handling**:
         - Verify `getWarranties()` returns enhanced objects with `remainingDays` and `percentageElapsed`.
         - Verify `getReturnPolicies()` returns enhanced objects.
         - Test `updateReturnPolicyStatus(id, "RETURNED")` transitions status accurately.
       - **Section 4: Notification Reminder Dispatcher**:
         - Verify `getActiveAlerts()` generates structured alerts.
         - Validate urgency classification (`CRITICAL` for <= 24h, `WARNING` for <= 7d, `INFO` for <= 30d).
         - Validate alert summary counts (`total`, `critical`, `warning`, `info`).
       - **Section 5: RFC 5545 Calendar (.ics) Generation**:
         - Verify `generateICalendar()` produces valid syntax with `BEGIN:VCALENDAR`, `VERSION:2.0`, `BEGIN:VEVENT`, `UID:`, `DTSTART:`, `VALARM:`, `TRIGGER:-P30D`, `TRIGGER:-P7D`, `END:VEVENT`, `END:VCALENDAR`.
         - Verify proper escaping of commas and special characters.
       - **Section 6: Dashboard Dynamic State**:
         - Verify `getDashboardData()` returns live metrics consistent with database counts.
    2. Add `"test:phase3": "tsx scripts/verify-phase-3.ts"` to `scripts` in `package.json`.
    3. Run `npm run test:phase3` and ensure 100% of checks pass.

    AVOID: Leaving leftover test assets or dummy rows in the development database.
    USE: Clean setup and teardown blocks ensuring idempotent repeatable test execution.
  </action>
  <verify>
    npm run test:phase3
  </verify>
  <done>
    All Phase 3 verification checks pass with 0 failures, confirmed by running `npm run test:phase3`.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Dedicated `/warranties` page is fully responsive, filterable, and renders progress bars and claim links.
- [ ] "Export All Deadlines (.ics)" allows downloading standard calendar events for all active deadlines.
- [ ] Main dashboard overview (`/`) and `MetricCards.tsx` reflect dynamic live database counts and real upcoming deadlines.
- [ ] Users can mark return policies as "Returned" directly from the UI.
- [ ] Automated verification script `scripts/verify-phase-3.ts` executes and passes all test checks cleanly.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
