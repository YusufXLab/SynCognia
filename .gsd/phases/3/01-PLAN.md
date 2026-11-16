---
phase: 3
plan: 1
wave: 1
depends_on: []
gap_closure: false
---

# Plan 3.1: Warranty & Return Policy Calculation Engine, Status Sync & Server Actions

## Objective
Deliver the real-time calculation engine and database synchronization service for warranties and return windows. This engine evaluates asset coverage timelines, computes remaining days, calculates percentage of warranty elapsed, manages status transitions (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `OPEN`, `RETURNED`), and provides Server Actions and API route handlers for return policies and warranty status refreshes.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/3/RESEARCH.md
- prisma/schema.prisma
- lib/prisma.ts
- lib/actions/warranties.ts
- lib/actions/assets.ts

## Tasks

<task type="auto">
  <name>Implement deadline calculation engine, domain types, and automated status synchronizer</name>
  <files>
    lib/types/deadline.ts
    lib/services/deadlines.ts
  </files>
  <action>
    Create the strongly typed timeline calculation service and database synchronization utility.

    Steps:
    1. Create `lib/types/deadline.ts`:
       - Type `WarrantyStatus`: `"ACTIVE" | "EXPIRING_SOON" | "EXPIRED"`.
       - Type `ReturnPolicyStatus`: `"OPEN" | "EXPIRING_SOON" | "EXPIRED" | "RETURNED"`.
       - Interface `CalculatedWarrantyFields`: `remainingDays: number`, `percentageElapsed: number`, `calculatedStatus: WarrantyStatus`, `isExpiringSoon: boolean`, `isExpired: boolean`.
       - Interface `CalculatedReturnPolicyFields`: `remainingDays: number`, `calculatedStatus: ReturnPolicyStatus`, `isExpiringSoon: boolean`, `isExpired: boolean`, `isOpen: boolean`.
       - Interface `DeadlineSyncResult`: `warrantiesChecked: number`, `warrantiesUpdated: number`, `returnsChecked: number`, `returnsUpdated: number`.
    2. Create `lib/services/deadlines.ts`:
       - `calculateRemainingDays(targetDate: Date | string | null, referenceDate = new Date()): number`:
         - Returns rounded ceiling difference in days: `Math.ceil((new Date(targetDate).getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))`.
         - Returns 0 or negative for elapsed dates, `Infinity` if no targetDate.
       - `calculatePercentageElapsed(startDate: Date | string | null, endDate: Date | string | null, warrantyType?: string, referenceDate = new Date()): number`:
         - If `warrantyType === "LIFETIME"` or `!endDate`: return 0.
         - If `!startDate`: assume 0 elapsed if `remainingDays > 0`, 100 if expired.
         - Calculate elapsed vs total duration clamped strictly between 0 and 100.
       - `calculateWarrantyStatus(endDate: Date | string | null, warrantyType?: string, referenceDate = new Date()): WarrantyStatus`:
         - If `warrantyType === "LIFETIME"` or `!endDate`: return `"ACTIVE"`.
         - If `remainingDays < 0`: return `"EXPIRED"`.
         - If `0 <= remainingDays <= 30`: return `"EXPIRING_SOON"`.
         - Otherwise: return `"ACTIVE"`.
       - `calculateReturnStatus(deadline: Date | string | null, currentStatus?: string, referenceDate = new Date()): ReturnPolicyStatus`:
         - If `currentStatus === "RETURNED"`: return `"RETURNED"`.
         - If `!deadline`: return `"OPEN"`.
         - If `remainingDays < 0`: return `"EXPIRED"`.
         - If `0 <= remainingDays <= 7`: return `"EXPIRING_SOON"`.
         - Otherwise: return `"OPEN"`.
       - `enhanceWarranty<T>(warranty: T, referenceDate?: Date)` and `enhanceReturnPolicy<T>(policy: T, referenceDate?: Date)` helper decorators.
       - `syncAllDeadlineStatuses(referenceDate = new Date()): Promise<DeadlineSyncResult>`:
         - Inspects all records in `prisma.warranty` and `prisma.returnPolicy`.
         - Identifies records where persisted `status` / `returnStatus` does not match calculated status (excluding explicit `RETURNED` records).
         - Applies updates inside a single batch or transaction.
         - Returns accurate counts of evaluated and modified records.

    AVOID: Re-calculating dates with timezone drift or mutating input Date objects.
    USE: Deterministic UTC/epoch timestamp arithmetic and clamp percentage calculations between 0 and 100.
  </action>
  <verify>
    npx tsx -e "import { calculateRemainingDays, calculateWarrantyStatus, calculatePercentageElapsed, calculateReturnStatus } from './lib/services/deadlines'; console.log('30d Status:', calculateWarrantyStatus(new Date(Date.now() + 20 * 86400000))); console.log('Return Status:', calculateReturnStatus(new Date(Date.now() + 4 * 86400000))); console.log('Elapsed %:', calculatePercentageElapsed(new Date(Date.now() - 100 * 86400000), new Date(Date.now() + 100 * 86400000)));"
  </verify>
  <done>
    All calculation helper functions export successfully, calculate remaining days accurately, and correctly classify 30-day warranty and 7-day return policy thresholds.
  </done>
</task>

<task type="auto">
  <name>Build Return Policy Server Actions, Warranties expansion, and sync API routes</name>
  <files>
    lib/actions/returnPolicies.ts
    lib/actions/warranties.ts
    app/api/return-policies/route.ts
    app/api/warranties/sync/route.ts
  </files>
  <action>
    Implement Server Actions and API endpoints for Return Policy management and automated status sync.

    Steps:
    1. Create `lib/actions/returnPolicies.ts` with `'use server'`:
       - `getReturnPolicies(statusFilter?: string)`:
         - Fetches return policies with linked `asset` details (id, name, category, brand, modelNumber, serialNumber, purchaseDate).
         - Enhances each policy with `CalculatedReturnPolicyFields`.
         - If `statusFilter` is specified, filters against `calculatedStatus`.
         - Returns `ActionResult<EnhancedReturnPolicy[]>`.
       - `createReturnPolicy(input: { assetId: string; returnWindowDays: number; returnDeadline?: Date | string; policyDetails?: string })`:
         - Validates input, calculates `returnDeadline` if omitted (`purchaseDate + returnWindowDays`), creates record in Prisma, revalidates `/warranties` and `/`.
       - `updateReturnPolicyStatus(id: string, status: string)`:
         - Updates `returnStatus` (e.g., `"RETURNED"`, `"OPEN"`, `"EXPIRED"`).
         - Revalidates `/warranties`, `/assets`, `/`.
    2. Update `lib/actions/warranties.ts`:
       - Enhance `getWarranties(statusFilter?: string)`:
         - Map results through `enhanceWarranty`.
         - Support filtering by `calculatedStatus`.
       - Add `syncWarrantiesAndReturns()` Server Action that calls `syncAllDeadlineStatuses()` and calls `revalidatePath` on `/warranties` and `/`.
    3. Create `app/api/return-policies/route.ts`:
       - `GET`: parses optional `?status=` query parameter, invokes `getReturnPolicies`, returns JSON `{ returnPolicies: [...] }`.
       - `POST`: creates new return policy, returns 201 JSON.
       - `PATCH`: accepts `{ id, status }`, updates policy status (e.g. marked as `RETURNED`), returns updated record.
    4. Create `app/api/warranties/sync/route.ts`:
       - `POST`: executes `syncAllDeadlineStatuses()`, returns JSON `{ success: true, syncResult: { ... } }`.

    AVOID: Returning raw database records where `status` is outdated without running computed enhancements.
    USE: Unified calculated fields on all query returns so UI and API consumers always receive accurate live data.
  </action>
  <verify>
    npx tsx -e "import { getReturnPolicies } from './lib/actions/returnPolicies'; import { getWarranties } from './lib/actions/warranties'; Promise.all([getReturnPolicies(), getWarranties()]).then(([returns, warranties]) => { console.log('Returns count:', returns.data?.length); console.log('Warranties count:', warranties.data?.length); process.exit(0); });"
  </verify>
  <done>
    `getReturnPolicies` and `getWarranties` return enhanced calculated records, `updateReturnPolicyStatus` correctly updates status in database, and `/api/return-policies` responds with HTTP 200.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] `calculateWarrantyStatus` correctly evaluates `ACTIVE`, `EXPIRING_SOON` (<= 30 days), and `EXPIRED` (< 0 days).
- [ ] `calculateReturnStatus` correctly evaluates `OPEN`, `EXPIRING_SOON` (<= 7 days), `EXPIRED` (< 0 days), and `RETURNED`.
- [ ] `calculatePercentageElapsed` clamps accurately between 0% and 100% across arbitrary date spans.
- [ ] `syncAllDeadlineStatuses` scans database records and syncs persisted statuses with real-time calendar calculations.
- [ ] Server Actions and API endpoints for Return Policies support query, creation, status mutation, and calculated fields.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
