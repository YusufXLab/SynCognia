---
phase: 4
plan: 2
wave: 2
depends_on: ["01"]
gap_closure: false
---

# Plan 4.2: Preventive Maintenance Hub UI, Modals & History Timeline

## Objective
Build the customer-facing Preventive Maintenance Hub (`/maintenance`) in SynCognia. This provides an asset owner with an interactive control center featuring KPI metric cards, filter tabs (`All`, `Upcoming`, `Due Soon`, `Overdue`, `History`), dual-interval schedule cards with progress tracking, a quick "Log Service Completion" modal, and a chronological service history timeline with receipt attachments.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/4/RESEARCH.md
- .gsd/phases/4/01-PLAN.md
- lib/types/maintenance.ts
- lib/actions/maintenance.ts
- lib/actions/assets.ts
- app/warranties/page.tsx
- components/layout/Sidebar.tsx

## Tasks

<task type="auto">
  <name>Build interactive MaintenanceCard, LogServiceModal, and MaintenanceModal components</name>
  <files>
    components/maintenance/MaintenanceCard.tsx
    components/maintenance/LogServiceModal.tsx
    components/maintenance/MaintenanceModal.tsx
  </files>
  <action>
    Create the reusable UI components for maintenance schedule presentation, service completion logging, and schedule creation/editing.

    Steps:
    1. Create `components/maintenance/MaintenanceCard.tsx`:
       - Props: `schedule: EnhancedMaintenanceSchedule`, `onLogService: (schedule: EnhancedMaintenanceSchedule) => void`, `onEdit: (schedule: EnhancedMaintenanceSchedule) => void`, `onDelete: (id: string) => void`.
       - Render:
         - Asset header: Asset name, category tag (Vehicles, Appliances, etc.), and brand/model info.
         - Schedule title: e.g. "Synthetic Oil Change & Filter Replacement".
         - Status badge:
           - `OVERDUE`: Rose badge with `AlertTriangle` ("Overdue by X days" or "Overdue by X miles").
           - `DUE`: Amber badge with `Clock` ("Due in X days" or "Due in X miles").
           - `UPCOMING`: Slate/Emerald badge with `CheckCircle` ("Due on [Formatted Date]").
           - `COMPLETED`: Slate badge with `CheckCheck` ("Completed").
         - Interval details pills:
           - Calendar interval (e.g. "Every 6 months") with `Calendar` icon.
           - Mileage interval (e.g. "Every 5,000 miles") with `Gauge` icon.
         - Mileage progress bar: if `intervalMileage` is set, render a visual progress bar indicating mileage accumulated towards the next service interval.
         - Historical metadata: "Last done: [Date] • Cost: $[Amount]".
         - Action buttons:
           - Primary: "Log Service" / "Mark Done" (`CheckCircle2` icon) opening the completion modal.
           - Secondary: "Edit" and "Delete" triggers.

    2. Create `components/maintenance/LogServiceModal.tsx`:
       - Props: `schedule: EnhancedMaintenanceSchedule | null`, `isOpen: boolean`, `onClose: () => void`, `onSuccess: () => void`.
       - Render modal dialog with:
         - Title: "Log Service Completion — {schedule.title}".
         - Asset info: "{asset.name} ({asset.category})".
         - Form fields:
           - Service Date (date input, default to current local date).
           - Odometer / Mileage (number input, prefilled with currentMileage or lastServiceMileage).
           - Actual Cost (number input with currency symbol, e.g. "89.95").
           - Service Provider / Mechanic / DIY (text input, placeholder "e.g., Valvoline, Dealer, Self").
           - Service Notes & Details (textarea for technician notes, replaced filters, etc.).
           - Receipt / Invoice Attachment Link (optional URL input for proof of service).
         - Buttons: Cancel and "Save & Advance Cycle" button.
         - Call `logServiceCompleted` server action on submit with loading spinner and error feedback.

    3. Create `components/maintenance/MaintenanceModal.tsx`:
       - Modal for creating a new schedule or editing an existing schedule.
       - Props: `schedule?: EnhancedMaintenanceSchedule | null`, `assets: Array<{ id: string; name: string; category: string }>`, `isOpen: boolean`, `onClose: () => void`, `onSuccess: () => void`.
       - Fields:
         - Asset selector (dropdown select of user assets).
         - Title (e.g. "Air Filter Cleaning", "Brake Pad Inspection").
         - Recurrence:
           - Interval Months (number input, optional).
           - Interval Mileage (number input, optional).
         - Baseline Dates:
           - Last Service Date (date input, optional).
           - Next Service Date (date input, optional, auto-calculated if intervalMonths provided).
           - Current Mileage (number input, optional).
         - Notes / Instructions (textarea).
       - Submits via `createMaintenanceSchedule` or `updateMaintenanceSchedule`.

    AVOID: Uncontrolled inputs or missing null-checks on `schedule` when modal closes.
    USE: Clean React state management with proper validation and accessible modal wrappers.
  </action>
  <verify>
    npx tsx -e "import('./components/maintenance/MaintenanceCard'); import('./components/maintenance/LogServiceModal'); import('./components/maintenance/MaintenanceModal'); console.log('Maintenance components imported successfully');"
  </verify>
  <done>
    MaintenanceCard, LogServiceModal, and MaintenanceModal are implemented and render proper interval badges, progress bars, and modal forms.
  </done>
</task>

<task type="auto">
  <name>Build dedicated Preventive Maintenance Hub page and Chronological History Timeline</name>
  <files>
    components/maintenance/MaintenanceHistoryTimeline.tsx
    app/maintenance/page.tsx
  </files>
  <action>
    Assemble the complete Preventive Maintenance Hub page and history timeline view.

    Steps:
    1. Create `components/maintenance/MaintenanceHistoryTimeline.tsx`:
       - Props: `logs: any[]`, `onRefresh?: () => void`.
       - Render chronological timeline of past maintenance completions:
         - Date node with calendar icon and human-formatted date.
         - Service card:
           - Service title and linked asset badge (`Asset Name` • `Category`).
           - Performed by badge (mechanic / dealer / DIY).
           - Odometer / Mileage reading pill (e.g. `28,450 mi`).
           - Cost pill (e.g. `$89.95`).
           - Notes / description block.
           - Receipt attachment link: if `receiptUrl` exists, render clickable "View Receipt" button with `FileText` icon.
       - If no logs exist, render empty state: "No service history logged yet. Complete scheduled tasks to build your service timeline."

    2. Create `app/maintenance/page.tsx`:
       - Client component with data fetching from `getMaintenanceSchedules`, `getMaintenanceSummaryMetrics`, `getMaintenanceLogs`, and `getAssets`.
       - Summary Metrics Header:
         - 4 metric cards:
           - `Upcoming Services`: Count of schedules in UPCOMING status (Wrench icon).
           - `Due Soon`: Count of schedules due within 14 days or 500 miles (Clock icon, amber badge).
           - `Overdue`: Count of overdue schedules (AlertTriangle icon, rose badge).
           - `Total Spent`: Cumulative sum of service costs from history logs (DollarSign icon).
       - Control Bar:
         - Search input (filter by title or asset name).
         - Category Filter buttons: `All`, `Vehicles`, `Appliances`, `Electronics`, `Tools`.
         - Status Filter Tabs:
           - `All Schedules`
           - `Upcoming`
           - `Due Soon`
           - `Overdue`
           - `Completed History`
         - Action buttons:
           - `+ New Schedule` button (opens `MaintenanceModal`).
           - `Sync Status` button with transition indicator (calls `syncAllMaintenanceStatuses`).
       - Main View Area:
         - If `activeTab === "History"`:
           - Renders `MaintenanceHistoryTimeline` with filtered logs.
         - If `activeTab !== "History"`:
           - Renders grid of `MaintenanceCard`s matching search, category, and status filter.
           - Empty state if no schedules match the filters.
       - Wire modals:
         - `LogServiceModal` opens when "Log Service" is clicked on any card.
         - `MaintenanceModal` opens when "+ New Schedule" or card "Edit" is clicked.
         - Deletion handler with confirmation.

    AVOID: Hardcoding mock maintenance records.
    USE: Real data loaded from `lib/actions/maintenance.ts` and `lib/actions/assets.ts`.
  </action>
  <verify>
    npx tsx -e "import('./app/maintenance/page'); console.log('Maintenance hub page imported successfully');"
  </verify>
  <done>
    `/maintenance` route is fully operational with live KPI metrics, status/category filter tabs, card grid with quick service completion modals, and chronological history timeline.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Dedicated `/maintenance` route renders summary metrics (Upcoming, Due Soon, Overdue, Total Spent).
- [ ] Users can filter schedules by status (`All`, `Upcoming`, `Due Soon`, `Overdue`, `Completed History`) and asset category.
- [ ] Schedule cards show calendar and mileage interval badges, due countdowns, and "Mark Done" triggers.
- [ ] "Log Service Completion" modal captures date, mileage, cost, provider, notes, and receipt attachment, and advances recurrence.
- [ ] "Completed History" tab renders a chronological timeline of past maintenance completions.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
