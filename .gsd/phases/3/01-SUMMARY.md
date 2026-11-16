# Phase 3 Plan 1: Warranty & Return Policy Calculation Engine, Status Sync & Server Actions Summary

## Objective
Deliver the real-time calculation engine and database synchronization service for warranties and return windows. This engine evaluates asset coverage timelines, computes remaining days, calculates percentage of warranty elapsed, manages status transitions (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `OPEN`, `RETURNED`), and provides Server Actions and API route handlers for return policies and warranty status refreshes.

## Tasks Status

| Task | Name | Files | Status | Commit / Notes |
|---|---|---|---|---|
| 1 | Implement deadline calculation engine, domain types, and status synchronizer | `lib/types/deadline.ts`, `lib/services/deadlines.ts` | Completed & Verified | `e4f8e58` |
| 2 | Build Return Policy Server Actions, Warranties expansion, and sync API routes | `lib/actions/returnPolicies.ts`, `lib/actions/warranties.ts`, `app/api/return-policies/route.ts`, `app/api/warranties/sync/route.ts` | Completed & Verified | Staged/Working Tree; sandbox git lock requires coordinator commit approval |

## Key Changes Implemented

- **Timeline Domain Types (`lib/types/deadline.ts`)**:
  - `WarrantyStatus`: `"ACTIVE" | "EXPIRING_SOON" | "EXPIRED"`
  - `ReturnPolicyStatus`: `"OPEN" | "EXPIRING_SOON" | "EXPIRED" | "RETURNED"`
  - `CalculatedWarrantyFields` & `CalculatedReturnPolicyFields`: unified interfaces for remaining days, percentage elapsed, computed statuses, and status booleans.
  - `DeadlineSyncResult`: telemetry type for database sync operations.

- **Calculation Engine & Synchronizer (`lib/services/deadlines.ts`)**:
  - `calculateRemainingDays`: deterministic ceiling day count using UTC epoch time, returning `Infinity` for null dates.
  - `calculatePercentageElapsed`: accurately clamped between `0` and `100`, handling lifetime warranties and missing start dates gracefully.
  - `calculateWarrantyStatus`: classifies `ACTIVE`, `EXPIRING_SOON` (<= 30 days), and `EXPIRED` (< 0 days).
  - `calculateReturnStatus`: classifies `OPEN`, `EXPIRING_SOON` (<= 7 days), `EXPIRED` (< 0 days), and `RETURNED`.
  - `enhanceWarranty` & `enhanceReturnPolicy`: non-mutating decorators enhancing raw records.
  - `syncAllDeadlineStatuses`: transactional synchronizer updating mismatched statuses in SQLite.

- **Return Policy Server Actions (`lib/actions/returnPolicies.ts`)**:
  - `getReturnPolicies`: fetches policies joined with asset details, attaches calculated fields, and supports status filtering.
  - `createReturnPolicy`: creates records with automated fallback return deadlines (`purchaseDate + windowDays`).
  - `updateReturnPolicyStatus`: updates return status and triggers safe revalidations.

- **Warranties Server Action Extensions (`lib/actions/warranties.ts`)**:
  - `getWarranties`: updated to decorate all results with `enhanceWarranty` and filter by calculated status.
  - `syncWarrantiesAndReturns`: Server Action calling `syncAllDeadlineStatuses` and revalidating `/warranties` and `/`.

- **API Routes**:
  - `app/api/return-policies/route.ts`: `GET`, `POST`, and `PATCH` endpoints for policy retrieval and mutations.
  - `app/api/warranties/sync/route.ts`: `POST` and `GET` endpoints executing synchronized database updates.

## Empirical Verification Proof

1. **Calculations & Thresholds**:
   - `20d warranty status`: `EXPIRING_SOON`
   - `4d return status`: `EXPIRING_SOON`
   - `Expired warranty status`: `EXPIRED`
   - `Expired return status`: `EXPIRED`
   - `Returned status`: `RETURNED`
   - `50% elapsed`: `50`
   - `Clamped bounds`: verified 0% to 100% clamping across out-of-range dates.

2. **Database Queries & Synchronization**:
   - `syncWarrantiesAndReturns()` executed cleanly: checked 6 warranties, 3 return policies.
   - `getWarranties()`: returned 6 enhanced records with `remainingDays`, `percentageElapsed`, and `calculatedStatus`.
   - `getReturnPolicies()`: returned 3 enhanced records with `remainingDays` and `isOpen`.

3. **Production Next.js Build**:
   - `npm.cmd run build`: compiled successfully with 0 errors.
   - All routes generated including `ƒ /api/return-policies`, `ƒ /api/warranties/sync`, and `ƒ /api/warranties`.
