# Phase 3: Warranty Tracking & Return/Expiry Intelligence Engine — Research & Architecture

## Executive Summary

Phase 3 establishes the intelligence layer of SynCognia: transitioning the application from passive record storage into an active deadline and protection engine. It delivers:
1. **Real-time Deadline & Coverage Calculator**: Deterministic date math computing active coverage, expiration countdowns, percentage of warranty elapsed, and threshold status transitions (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `OPEN`, `RETURNED`).
2. **Dynamic Server Actions & Synchronizer**: Automatic status sync to ensure persistent database states stay strictly aligned with physical calendar time.
3. **Notification Reminder Dispatcher**: Alert computation system producing multi-tier alerts (`30_DAYS`, `7_DAYS`, `24_HOURS` / `CRITICAL`, `WARNING`, `INFO`).
4. **Zero-Dependency RFC 5545 iCalendar (.ics) Sync**: Standard calendar export enabling instant subscription or import into Google Calendar, Apple Calendar, and Outlook with embedded alarm reminders (`VALARM`).
5. **Warranties & Expirations Hub UI**: Dedicated `/warranties` route with filter tabs, progress bars, contact links, and claim triggers.
6. **Live Dashboard Overview Integration**: Dynamic metric cards and live upcoming deadline feeds replacing hardcoded mock values.

---

## Technical Analysis & Date Calculation Specification

### 1. Warranty Status & Timeline Engine

| Status | Condition | Meaning | UI Presentation |
|--------|-----------|---------|-----------------|
| `ACTIVE` | `remainingDays > 30` (or `LIFETIME`) | Coverage healthy | Emerald badge, standard progress bar |
| `EXPIRING_SOON` | `0 <= remainingDays <= 30` | Action required within 30 days | Amber/Orange badge, pulsing indicator |
| `EXPIRED` | `remainingDays < 0` | Warranty expired | Rose/Slate badge, 100% elapsed bar |

#### Computation Formulas:
- **Remaining Days**:
  ```ts
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  ```
- **Percentage Elapsed**:
  ```ts
  if (warrantyType === "LIFETIME") return 0;
  if (!startDate || !endDate) return 0;
  const total = endDate.getTime() - startDate.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - startDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  ```

### 2. Return Policy Status & Countdown Engine

| Status | Condition | Meaning | UI Presentation |
|--------|-----------|---------|-----------------|
| `OPEN` | `remainingDays > 7` | Return window comfortably open | Indigo/Emerald badge |
| `EXPIRING_SOON` | `0 <= remainingDays <= 7` | Critical return window (<= 7 days) | Amber/Rose badge, urgent banner |
| `EXPIRED` | `remainingDays < 0` | Return window passed | Slate badge, disabled action |
| `RETURNED` | Explicit flag | Item returned to merchant | Emerald badge with checkmark |

#### Computation Formulas:
- **Return Deadline Days Left**:
  ```ts
  const diffTime = returnDeadline.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  ```

---

## Calendar (.ics) Generation Architecture (RFC 5545)

Rather than introducing heavy external dependencies that may conflict with React 19 / Next.js 15, we implement a dedicated, RFC 5545 compliant `.ics` serializer:
- **MIME Type**: `text/calendar; charset=utf-8`
- **Headers**:
  - `Content-Disposition: attachment; filename="syncognia-deadlines.ics"`
  - `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
- **VCalendar Header**:
  ```text
  BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//SynCognia//Asset Intelligence Hub//EN
  CALSCALE:GREGORIAN
  METHOD:PUBLISH
  ```
- **VEvent Payload Structure**:
  - `UID`: Deterministic UUID (`warranty-${id}@syncognia.local` or `return-${id}@syncognia.local`)
  - `DTSTAMP`: Current ISO UTC string formatted as `YYYYMMDDTHHMMSSZ`
  - `DTSTART` / `DTEND`: Target deadline date (all-day or specific timestamp)
  - `SUMMARY`: e.g., `[Warranty Expiry] MacBook Pro 16" M3 Max (AppleCare+)`
  - `DESCRIPTION`: Policy details, serial number, support contact, and direct claim link
  - `VALARM`: Standard sound/display alarm blocks:
    - `-P30D` (30 days prior notification)
    - `-P7D` (7 days prior notification)
    - `-P1D` (24 hours prior notification)
  - `END:VEVENT`
  - `END:VCALENDAR`

---

## Notification Alert Dispatcher Architecture

The notification alert engine evaluates assets, warranties, and return policies against reminder trigger windows:
1. **Urgent Tier (`CRITICAL`)**: Deadlines in `<= 24 hours` (or `<= 1 day`). High visual priority, requires immediate user attention.
2. **Warning Tier (`WARNING`)**: Return deadlines `<= 7 days` or warranties `<= 7 days`.
3. **Info Tier (`INFO`)**: Warranties `<= 30 days`.

The service provides:
- `getActiveAlerts()`: Returns strongly typed alerts with actionable metadata (`assetId`, `assetName`, `deadlineDate`, `remainingDays`, `urgency`, `actionUrl`).
- `GET /api/notifications/alerts`: Route handler delivering alerts for client consumption.

---

## Database Status Synchronization Strategy

Because calendar time moves forward continuously while SQLite records remain static until updated, SynCognia employs a dual strategy:
1. **Computed-on-Read**: All read endpoints and Server Actions compute dynamic properties (`remainingDays`, `percentageElapsed`, `calculatedStatus`) in real time.
2. **Persistent Batch Sync**: `syncAllDeadlineStatuses()` runs a lightweight transaction updating records whose stored `status` or `returnStatus` diverges from the current date calculation. This guarantees database indexes and background queries stay accurate.

---

## UI/UX Design & Dashboard Integration

1. **/warranties Page**:
   - Filter pills: `All`, `Active`, `Expiring Soon (30d)`, `Return Windows`, `Expired`.
   - Metrics summary strip showing real counts.
   - Calendar export button (`Download .ics`).
   - Cards with asset thumbnail/icon, brand, model, serial number.
   - Visual progress bar color-coded by expiration status.
   - Quick action: "Contact Support", "Claim URL", "Mark Returned".
2. **Dashboard Overview (`/`)**:
   - `MetricCards.tsx`: dynamically populated with Total Assets, Active Warranties, Expiring Soon, and Return Windows.
   - `Upcoming Deadlines`: real upcoming warranties and return deadlines sorted by urgency.
   - `Recently Added Assets`: live recently added assets from database.

---

## Plan Decomposition Overview

- **Plan 3.1: Warranty & Return Calculation Engine, Status Sync & Server Actions** (Wave 1)
  - Task 1: Core calculation engine & types (`lib/types/deadline.ts`, `lib/services/deadlines.ts`).
  - Task 2: Return Policy Server Actions, Warranty expansion & API routes (`lib/actions/returnPolicies.ts`, `lib/actions/warranties.ts`, `app/api/return-policies/route.ts`, `app/api/warranties/sync/route.ts`).
- **Plan 3.2: Expiry Notification Dispatcher & RFC 5545 Calendar (.ics) Export Engine** (Wave 2)
  - Task 1: Notification alert dispatcher service & API route (`lib/services/notifications.ts`, `app/api/notifications/alerts/route.ts`).
  - Task 2: RFC 5545 iCalendar (.ics) serializer utility & export route (`lib/utils/calendar.ts`, `app/api/calendar/export/route.ts`).
- **Plan 3.3: Warranties Hub UI, Live Dashboard Integration & Comprehensive Verification** (Wave 3)
  - Task 1: Dedicated `/warranties` hub page & interactive cards (`app/warranties/page.tsx`, `components/warranties/WarrantyCard.tsx`, `components/warranties/ReturnPolicyCard.tsx`).
  - Task 2: Live Dashboard integration (`lib/actions/dashboard.ts`, `components/dashboard/MetricCards.tsx`, `app/page.tsx`).
  - Task 3: Comprehensive automated verification test suite (`scripts/verify-phase-3.ts`).
