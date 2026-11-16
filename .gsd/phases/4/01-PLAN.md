---
phase: 4
plan: 1
wave: 1
depends_on: []
gap_closure: false
---

# Plan 4.1: Preventive Maintenance Engine, Schema Migrations, Server Actions & API Handlers

## Objective
Deliver the core data models, calculation and recurrence engine, server actions, and REST API handlers for preventive maintenance. This provides the mathematical backbone for calendar and mileage interval tracking, automatic status classification (`UPCOMING`, `DUE`, `OVERDUE`, `COMPLETED`), immutable service history logging (`MaintenanceLog`), and recurrence cycle advancement.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/4/RESEARCH.md
- prisma/schema.prisma
- lib/prisma.ts
- lib/services/deadlines.ts
- lib/actions/assets.ts

## Tasks

<task type="auto">
  <name>Prisma schema migration, maintenance domain types, and preventive maintenance calculation engine</name>
  <files>
    prisma/schema.prisma
    lib/types/maintenance.ts
    lib/services/maintenanceEngine.ts
  </files>
  <action>
    Define the maintenance data architecture, TypeScript types, and calculation engine.

    Steps:
    1. Update `prisma/schema.prisma`:
       - In `MaintenanceSchedule`:
         - Add `lastServiceMileage Int?` to track baseline mileage for interval triggers.
         - Add `serviceLogs MaintenanceLog[]` relation.
       - Define `MaintenanceLog` model:
         ```prisma
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
           serviceProvider       String?              // mechanic, shop, technician, DIY
           notes                 String?
           receiptUrl            String?
           
           createdAt             DateTime             @default(now())
           updatedAt             DateTime             @updatedAt

           @@index([maintenanceScheduleId])
           @@index([assetId])
           @@index([serviceDate])
         }
         ```
       - In `Asset`:
         - Add `maintenanceLogs MaintenanceLog[]` relation.
       - Execute `npx prisma db push` to synchronize SQLite database schema and generate Prisma client.

    2. Create `lib/types/maintenance.ts`:
       - `MaintenanceStatus`: `"UPCOMING" | "DUE" | "OVERDUE" | "COMPLETED"`.
       - `CalculatedMaintenanceFields`:
         - `remainingDays: number | null`
         - `remainingMileage: number | null`
         - `calculatedStatus: MaintenanceStatus`
         - `isDueSoon: boolean`
         - `isOverdue: boolean`
         - `isCompleted: boolean`
         - `progressPercentage: number | null`
       - `EnhancedMaintenanceSchedule`: extends raw schedule with `CalculatedMaintenanceFields` and included `asset` and `serviceLogs`.
       - `CreateMaintenanceScheduleInput`: assetId, title, intervalMonths, intervalMileage, lastServiceDate, nextServiceDate, lastServiceMileage, currentMileage, lastServiceCost, notes.
       - `UpdateMaintenanceScheduleInput`: partial of create input plus status.
       - `LogServiceInput`: scheduleId (optional), assetId, title (optional), serviceDate (Date | string), mileage (optional number), cost (optional number), serviceProvider (optional string), notes (optional string), receiptUrl (optional string).
       - `MaintenanceMetrics`: `totalSchedules: number`, `upcomingCount: number`, `dueSoonCount: number`, `overdueCount: number`, `totalExpenditure: number`.
       - `MaintenanceSyncResult`: `schedulesChecked: number`, `schedulesUpdated: number`.

    3. Create `lib/services/maintenanceEngine.ts`:
       - `addMonthsSafely(date: Date | string, months: number): Date`:
         - Safely adds months while correctly clamping end-of-month dates (e.g., Jan 31 + 1 month -> Feb 28/29).
       - `calculateRemainingDays(nextServiceDate: Date | string | null | undefined, referenceDate = new Date()): number | null`:
         - Ceiling rounded day difference, or null if no nextServiceDate.
       - `calculateRemainingMileage(lastServiceMileage: number | null | undefined, intervalMileage: number | null | undefined, currentMileage: number | null | undefined): number | null`:
         - Returns `((lastServiceMileage ?? currentMileage ?? 0) + intervalMileage) - currentMileage`.
         - Returns null if intervalMileage or currentMileage is not provided.
       - `calculateMaintenanceStatus(params: { nextServiceDate?: Date | string | null; remainingDays?: number | null; remainingMileage?: number | null; isExplicitlyCompleted?: boolean }): MaintenanceStatus`:
         - If `isExplicitlyCompleted`, return `"COMPLETED"`.
         - If `(remainingDays !== null && remainingDays < 0)` OR `(remainingMileage !== null && remainingMileage < 0)`, return `"OVERDUE"`.
         - If `(remainingDays !== null && remainingDays >= 0 && remainingDays <= 14)` OR `(remainingMileage !== null && remainingMileage >= 0 && remainingMileage <= 500)`, return `"DUE"`.
         - Otherwise return `"UPCOMING"`.
       - `enhanceMaintenanceSchedule(schedule: any, referenceDate = new Date()): EnhancedMaintenanceSchedule`:
         - Merges raw schedule with calculated remaining days, remaining mileage, and calculated status.
       - `advanceRecurrenceCycle(schedule: any, serviceData: { serviceDate: Date; mileage?: number; cost?: number }): RecurrenceAdvancementResult`:
         - Computes new `lastServiceDate = serviceData.serviceDate`, new `nextServiceDate = addMonthsSafely(serviceDate, intervalMonths)` if intervalMonths exists.
         - Updates `lastServiceMileage = serviceData.mileage`, `currentMileage = Math.max(currentMileage ?? 0, serviceData.mileage)`.
         - If non-recurring (no intervalMonths and no intervalMileage), returns `status: "COMPLETED"`, otherwise returns recalculated `status: "UPCOMING"`.
       - `syncAllMaintenanceStatuses(): Promise<MaintenanceSyncResult>`:
         - Iterates through active schedules and synchronizes physical status with DB if stale.

    AVOID: Naive `d.setMonth(d.getMonth() + n)` which overflows short months (Jan 31 + 1 becomes March 3 instead of Feb 28).
    USE: Safe month addition that clamps to the target month's maximum days.
  </action>
  <verify>
    npx prisma validate && npx tsx -e "import { addMonthsSafely, calculateMaintenanceStatus } from './lib/services/maintenanceEngine'; console.log('Engine loaded successfully');"
  </verify>
  <done>
    Prisma schema contains MaintenanceLog and lastServiceMileage, db push executes cleanly, and maintenanceEngine correctly calculates intervals, statuses, and cycle advancements.
  </done>
</task>

<task type="auto">
  <name>Implement maintenance Server Actions and REST API route handlers</name>
  <files>
    lib/actions/maintenance.ts
    app/api/maintenance/route.ts
    app/api/maintenance/[id]/route.ts
    app/api/maintenance/[id]/complete/route.ts
    app/api/maintenance/logs/route.ts
  </files>
  <action>
    Create server actions and REST API route handlers for maintenance schedules and service logs.

    Steps:
    1. Create `lib/actions/maintenance.ts`:
       - `getMaintenanceSchedules(filter?: { status?: string; assetId?: string; category?: string })`:
         - Queries `prisma.maintenanceSchedule.findMany` including asset and latest serviceLogs.
         - Enhances with `enhanceMaintenanceSchedule`.
         - Filters by calculatedStatus, assetId, or asset category if requested.
         - Returns `ActionResult<EnhancedMaintenanceSchedule[]>`.
       - `getMaintenanceScheduleById(id: string)`:
         - Retrieves single schedule with asset and full serviceLogs history.
         - Returns `ActionResult<EnhancedMaintenanceSchedule>`.
       - `createMaintenanceSchedule(input: CreateMaintenanceScheduleInput)`:
         - If `intervalMonths` is given and `!nextServiceDate`, calculates initial `nextServiceDate` from `lastServiceDate` (or today).
         - Calculates initial status using engine.
         - Creates record in Prisma.
         - Safely revalidates `["/maintenance", "/", "/assets"]`.
       - `updateMaintenanceSchedule(id: string, input: UpdateMaintenanceScheduleInput)`:
         - Updates schedule fields and recalculates status.
         - Safely revalidates paths.
       - `deleteMaintenanceSchedule(id: string)`:
         - Deletes schedule from Prisma.
         - Safely revalidates paths.
       - `logServiceCompleted(input: LogServiceInput)`:
         - Creates a new `MaintenanceLog` record with serviceDate, mileage, cost, serviceProvider, notes, and receiptUrl.
         - If `scheduleId` is provided:
           - Fetches schedule and calls `advanceRecurrenceCycle`.
           - Updates schedule in DB with advanced dates, mileage, cost, and refreshed status.
         - Safely revalidates paths.
         - Returns `ActionResult<{ schedule?: MaintenanceSchedule; log: MaintenanceLog }>`.
       - `getMaintenanceLogs(filter?: { assetId?: string; scheduleId?: string })`:
         - Queries `prisma.maintenanceLog.findMany` ordered by `serviceDate desc` including asset and schedule.
         - Returns `ActionResult<MaintenanceLog[]>`.
       - `getMaintenanceSummaryMetrics()`:
         - Aggregates all schedules: counts `totalSchedules`, `upcomingCount`, `dueSoonCount`, `overdueCount`.
         - Aggregates all `MaintenanceLog` records: sums `cost` to compute `totalExpenditure`.
         - Returns `ActionResult<MaintenanceMetrics>`.

    2. Create REST API route handlers:
       - `app/api/maintenance/route.ts`:
         - GET: handles query params `status`, `assetId`, `category`. Returns 200 `{ schedules }`.
         - POST: parses body, calls `createMaintenanceSchedule`, returns 201 `{ schedule }` or 400 on error.
       - `app/api/maintenance/[id]/route.ts`:
         - GET: calls `getMaintenanceScheduleById(id)`, returns 200 `{ schedule }` or 404/500.
         - PATCH: parses body, calls `updateMaintenanceSchedule(id, body)`, returns 200 `{ schedule }`.
         - DELETE: calls `deleteMaintenanceSchedule(id)`, returns 200 `{ success: true }`.
       - `app/api/maintenance/[id]/complete/route.ts`:
         - POST: parses body, injects `scheduleId: params.id`, calls `logServiceCompleted`, returns 200 `{ log, schedule }`.
       - `app/api/maintenance/logs/route.ts`:
         - GET: handles query params `assetId`, `scheduleId`, returns 200 `{ logs }`.

    AVOID: Unhandled date parsing errors in API handlers when client sends ISO strings.
    USE: Safe Date coercion and validation matching the established pattern in `lib/actions/assets.ts`.
  </action>
  <verify>
    npx tsx -e "import { getMaintenanceSchedules, getMaintenanceSummaryMetrics, logServiceCompleted } from './lib/actions/maintenance'; console.log('Maintenance actions imported successfully');"
  </verify>
  <done>
    Server actions for maintenance schedule CRUD, service logging, metrics, and REST API route handlers exist and respond correctly.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Prisma schema includes `MaintenanceLog` model and `lastServiceMileage` on `MaintenanceSchedule`.
- [ ] Safe date math and mileage calculation accurately detect `UPCOMING`, `DUE` (within 14d / 500mi), and `OVERDUE`.
- [ ] Recurrence engine advances to the next cycle when a service completion is logged.
- [ ] Server actions and REST API route handlers for maintenance schedules and logs are functioning.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
