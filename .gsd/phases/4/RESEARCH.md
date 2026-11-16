# Phase 4: Service Schedules & Preventive Maintenance — Research & Architecture

## Executive Summary

Phase 4 introduces the proactive maintenance and service lifecycle layer of SynCognia. While Phase 3 handled contractual expiration deadlines (warranties and return policies), Phase 4 tackles the ongoing operational health, regular maintenance, and service expenditure of physical assets.

This phase delivers:
1. **Preventive Maintenance Calculation & Recurrence Engine**: Deterministic calculation of calendar-based service intervals (e.g. every 6 months), mileage-based service intervals (e.g. every 5,000 miles), and combined multi-trigger schedules ("whichever comes first"). It computes time/distance remaining, assigns status classifications (`UPCOMING`, `DUE`, `OVERDUE`, `COMPLETED`), and handles automatic cycle advancement upon completion.
2. **Maintenance Server Actions & REST API Route Handlers**: Full CRUD capabilities for maintenance schedules, automated status synchronization with calendar time, summary metrics aggregation, and service completion logging.
3. **Historical Service Log Architecture (`MaintenanceLog`)**: Immutable chronological records capturing service date, odometer reading, actual cost, service technician/mechanic name, maintenance notes, and linked receipt/invoice attachments.
4. **Preventive Maintenance Hub UI (`/maintenance`)**: Dedicated management center featuring KPI summary cards (Upcoming Services, Due Soon, Overdue, Total Service Expenditure), category/asset profile filtering, dual-interval schedule cards with progress indicators, quick "Log Service Completion" modal, and an interactive History Timeline.
5. **Live Dashboard & System Integration**: Integration of pending maintenance alerts and service deadlines into the root dashboard (`/`), giving users an immediate overview of urgent vehicle or appliance service needs.
6. **Automated Verification Suite (`scripts/verify-phase-4.ts`)**: Comprehensive integration tests verifying interval math, threshold classification, recurrence advancement, DB CRUD, and API handlers.

---

## Technical Analysis & Mathematical Specifications

### 1. Interval Calculations & Dual Triggers

Assets such as vehicles, HVAC systems, power tools, and household appliances require regular servicing based on calendar time, usage/distance, or both:

- **Calendar Recurrence (`intervalMonths`)**:
  - `nextServiceDate = addMonths(lastServiceDate, intervalMonths)`
  - Edge cases: Month rollover handling where target month has fewer days than source date (e.g., January 31 + 1 month = February 28/29).
  - Time remaining: `remainingDays = Math.ceil((nextServiceDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))`

- **Mileage / Usage Recurrence (`intervalMileage`)**:
  - `nextServiceMileage = (lastServiceMileage ?? currentMileage ?? 0) + intervalMileage`
  - Mileage remaining: `remainingMileage = nextServiceMileage - currentMileage`

- **Dual-Trigger Schedule ("Whichever Comes First")**:
  - When both `intervalMonths` and `intervalMileage` are specified (e.g., "5,000 miles or 6 months"):
  - Both remaining values are calculated independently.
  - The status with higher urgency dictates the overall schedule status.

### 2. Status Classification Rules & Priority Matrix

| Status | Calendar Condition | Mileage Condition | Urgency Level |
|--------|-------------------|-------------------|---------------|
| `OVERDUE` | `remainingDays < 0` | `remainingMileage < 0` | 3 (Highest) |
| `DUE` | `0 <= remainingDays <= 14` | `0 <= remainingMileage <= 500` | 2 |
| `UPCOMING` | `remainingDays > 14` | `remainingMileage > 500` | 1 |
| `COMPLETED` | Explicitly marked (only for one-off / non-recurring schedules) | N/A | 0 |

**Precedence Resolution Logic**:
```ts
if (isOverdueByDate || isOverdueByMileage) {
  return "OVERDUE";
}
if (isDueByDate || isDueByMileage) {
  return "DUE";
}
return "UPCOMING";
```

### 3. Recurrence Advancement State Machine

When a user logs a completed service for a schedule:
1. A new immutable `MaintenanceLog` record is generated:
   - `scheduleId`: Linked `MaintenanceSchedule.id`
   - `assetId`: Target `Asset.id`
   - `title`: Schedule title or custom service description
   - `serviceDate`: Execution date
   - `mileage`: Service odometer reading
   - `cost`: Actual expenditure ($)
   - `serviceProvider`: Mechanic, dealership, contractor, or DIY
   - `notes`: Service observations, part numbers, warranties
   - `receiptUrl`: Linked invoice/receipt attachment
2. The `MaintenanceSchedule` advances to its next recurrence cycle:
   - `lastServiceDate = serviceDate`
   - If `intervalMonths > 0`: `nextServiceDate = addMonths(serviceDate, intervalMonths)`
   - If `intervalMileage > 0` and `mileage` is supplied:
     - `lastServiceMileage = mileage`
     - `currentMileage = Math.max(currentMileage ?? 0, mileage)`
   - `lastServiceCost = cost`
   - Recalculate status: Evaluates to `UPCOMING` for the newly scheduled cycle.
   - If non-recurring (neither `intervalMonths` nor `intervalMileage` set): status transitions to `COMPLETED`.

---

## Data Model Architecture

### Schema Enhancements in `prisma/schema.prisma`

```prisma
model MaintenanceSchedule {
  id                  String           @id @default(cuid())
  assetId             String
  asset               Asset            @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  title               String
  intervalMonths      Int?
  intervalMileage     Int?
  lastServiceDate     DateTime?
  nextServiceDate     DateTime?
  lastServiceMileage  Int?
  currentMileage      Int?
  lastServiceCost     Float?
  notes               String?
  status              String           @default("UPCOMING") // UPCOMING, DUE, OVERDUE, COMPLETED
  
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  serviceLogs         MaintenanceLog[]

  @@index([assetId])
  @@index([status])
}

model MaintenanceLog {
  id                    String               @id @default(cuid())
  maintenanceScheduleId String?
  maintenanceSchedule   MaintenanceSchedule? @relation(fields: [maintenanceScheduleId], references: [id], onDelete: SetNull)
  assetId               String
  asset                 Asset                @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  title                 String
  serviceDate           DateTime             @default(now())
  mileage               Int?
  cost                  Float?
  serviceProvider       String?              // mechanic, technician, DIY, dealer
  notes                 String?
  receiptUrl            String?
  
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@index([maintenanceScheduleId])
  @@index([assetId])
  @@index([serviceDate])
}
```

Updating `Asset` model with the back-relation:
```prisma
model Asset {
  // ... existing fields ...
  maintenanceSchedules MaintenanceSchedule[]
  maintenanceLogs      MaintenanceLog[]
}
```

---

## Server Actions & API Design

### `lib/actions/maintenance.ts`

- `getMaintenanceSchedules(filter?: { status?: string; assetId?: string; category?: string }): Promise<ActionResult<EnhancedMaintenanceSchedule[]>>`
- `getMaintenanceScheduleById(id: string): Promise<ActionResult<EnhancedMaintenanceSchedule>>`
- `createMaintenanceSchedule(input: CreateMaintenanceScheduleInput): Promise<ActionResult<MaintenanceSchedule>>`
- `updateMaintenanceSchedule(id: string, input: UpdateMaintenanceScheduleInput): Promise<ActionResult<MaintenanceSchedule>>`
- `deleteMaintenanceSchedule(id: string): Promise<ActionResult<void>>`
- `logServiceCompleted(input: LogServiceInput): Promise<ActionResult<{ schedule: MaintenanceSchedule; log: MaintenanceLog }>>`
- `getMaintenanceLogs(filter?: { assetId?: string; scheduleId?: string }): Promise<ActionResult<MaintenanceLogWithAsset[]>>`
- `syncAllMaintenanceStatuses(): Promise<MaintenanceSyncResult>`
- `getMaintenanceSummaryMetrics(): Promise<ActionResult<MaintenanceMetrics>>`

### REST API Route Handlers

- `GET /api/maintenance` - List schedules with optional filters (`status`, `assetId`, `category`)
- `POST /api/maintenance` - Create a new maintenance schedule
- `GET /api/maintenance/[id]` - Retrieve a single maintenance schedule with historical logs
- `PATCH /api/maintenance/[id]` - Update maintenance schedule properties or current mileage
- `DELETE /api/maintenance/[id]` - Delete a maintenance schedule
- `POST /api/maintenance/[id]/complete` - Record service completion and advance recurrence cycle
- `GET /api/maintenance/logs` - List historical completed maintenance logs

---

## User Interface & Experience Design

### 1. `/maintenance` Hub Page Layout

- **Header & Metric Cards**:
  - `Upcoming Services`: Count of schedules in healthy upcoming status.
  - `Due Soon`: Highlighted count of schedules due within 14 days or 500 miles.
  - `Overdue`: Red alert count of overdue schedules requiring immediate attention.
  - `Total Spent`: Cumulative sum of all completed service costs (`MaintenanceLog.cost`).
- **Control Bar**:
  - Search input for maintenance title or asset name.
  - Category filter dropdown / buttons (All, Vehicles, Appliances, Electronics, Tools, Home).
  - Status tabs: `All`, `Upcoming`, `Due Soon`, `Overdue`, `History`.
  - Primary button: `+ Add Maintenance Schedule`.
- **Card Grid / Timeline View**:
  - When in status tabs (`All`, `Upcoming`, `Due Soon`, `Overdue`): Displays responsive grid of `MaintenanceCard`s.
  - When in `History` tab: Displays `MaintenanceHistoryTimeline` rendering chronological stream of completed services with mechanic notes, costs, and receipts.

### 2. Interactive Components

- **`MaintenanceCard`**:
  - Asset tag with brand and category badge.
  - Service title with interval details (e.g., "Every 6 mos / 5,000 mi").
  - Due status pill with countdown:
    - Overdue: `Overdue by 8 days` (Rose badge)
    - Due Soon: `Due in 4 days` or `Due in 150 miles` (Amber badge)
    - Upcoming: `Due on Nov 25, 2026` (Slate/Emerald badge)
  - Mileage tracking progress bar (if mileage interval configured).
  - Last service cost and date metadata.
  - Quick actions: "Mark Done" / "Log Service" modal trigger, "Edit", "Delete".
- **`LogServiceModal`**:
  - Modal with form:
    - Service Date (default today)
    - Service Odometer / Mileage (prefilled with current)
    - Actual Cost ($)
    - Service Provider / Mechanic / DIY
    - Notes / Observations
    - Receipt Link / File URL
  - Submit button: Updates schedule, records history log, advances recurrence cycle.
- **`MaintenanceModal`**:
  - Modal to create or edit a maintenance schedule.
  - Asset selector, title, interval months, interval mileage, initial service date, notes.

---

## Verification Strategy

An end-to-end test suite (`scripts/verify-phase-4.ts`) will validate:
1. Date math: `addMonths` accurately advancing across months of varying lengths and leap years.
2. Mileage calculations: distance delta and remaining mileage calculations.
3. Status evaluation: accurate threshold classifications for `UPCOMING`, `DUE`, `OVERDUE`.
4. Multi-trigger priority: verifying that overdue mileage overrides upcoming date and vice versa.
5. Recurrence cycle advancement: verifying that logging a service advances `nextServiceDate` and `lastServiceMileage` while resetting status to `UPCOMING`.
6. Database operations: schedule CRUD, service logging, and status synchronization.
7. API endpoints: `/api/maintenance` GET, POST, PATCH, DELETE, and completion endpoints.
8. Dashboard integration: metrics and upcoming deadline rollups.
