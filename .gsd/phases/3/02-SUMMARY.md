# Phase 3 Plan 2: Expiry Notification Dispatcher & RFC 5545 Calendar (.ics) Export Engine Summary

## Objective
Implement proactive expiry and deadline notification alert dispatching alongside a zero-dependency RFC 5545 compliant `.ics` calendar serializer and export route handler. This enables real-time evaluation of warranty expirations and return deadlines with tiered urgency indicators (`CRITICAL`, `WARNING`, `INFO`) and calendar integration with Google Calendar, Apple Calendar, and Microsoft Outlook.

## Tasks Status

| Task | Name | Files | Status | Commit / Notes |
|---|---|---|---|---|
| 1 | Implement automated notification reminder dispatcher and alerts route handler | `lib/services/notifications.ts`, `app/api/notifications/alerts/route.ts` | Completed & Verified | `80668a8` |
| 2 | Build zero-dependency RFC 5545 iCalendar (.ics) serializer and download endpoint | `lib/utils/calendar.ts`, `app/api/calendar/export/route.ts`, `next.config.mjs` | Completed & Verified | Files created & empirically verified; standard sandbox `.git/index.lock` permission requires coordinator commit |

## Key Changes Implemented

- **Notification Alert Dispatcher Service (`lib/services/notifications.ts`)**:
  - `AlertUrgency`: `"CRITICAL" | "WARNING" | "INFO"`
  - `AlertType`: `"WARRANTY_EXPIRING" | "WARRANTY_EXPIRED" | "RETURN_WINDOW_CLOSING" | "RETURN_WINDOW_EXPIRED"`
  - `NotificationAlert`: deterministic ID, urgency tier, title, descriptive message, deadline date, remaining days, linked asset details, action URL, and action label.
  - Multi-tier alert evaluation:
    - **Warranties**:
      - `0 <= remainingDays <= 1`: `CRITICAL` urgency ("Warranty expires today/tomorrow for {name}").
      - `2 <= remainingDays <= 7`: `WARNING` urgency ("Warranty expires in {days} days for {name}").
      - `8 <= remainingDays <= 30`: `INFO` urgency ("Warranty expiring this month for {name}").
      - `-14 <= remainingDays < 0`: `INFO` urgency ("Warranty expired {days} days ago").
      - `LIFETIME` warranties and items expired > 14 days cleanly excluded.
    - **Return Windows**:
      - `0 <= remainingDays <= 1`: `CRITICAL` urgency ("Last day to return {name}!").
      - `2 <= remainingDays <= 7`: `WARNING` urgency ("Return window closes in {days} days for {name}").
      - `-7 <= remainingDays < 0`: `INFO` urgency ("Return window expired {days} days ago").
      - `RETURNED` items and policies expired > 7 days cleanly excluded.
    - Sorting algorithm: `CRITICAL` first, then `WARNING`, then `INFO`; sorted ascending by remaining days within each tier.
    - Summary aggregation: counts for `total`, `critical`, `warning`, and `info`.

- **Notification Alerts Route Handler (`app/api/notifications/alerts/route.ts`)**:
  - `GET`: supports optional `?urgency=` filter (`CRITICAL`, `WARNING`, `INFO`).
  - Returns JSON `{ success: true, alerts, summary }` with HTTP 200.

- **RFC 5545 iCalendar Serializer (`lib/utils/calendar.ts`)**:
  - Native zero-dependency iCalendar string builder compliant with RFC 5545 specifications.
  - Strict CRLF line terminations (`\r\n`).
  - UTC timestamp formatter (`YYYYMMDDTHHMMSSZ`) and all-day date formatter (`YYYYMMDD`).
  - Text escaping for semicolons, commas, backslashes, and newlines.
  - Embedded `VALARM` reminder blocks (`TRIGGER:-P30D`, `TRIGGER:-P7D`, `TRIGGER:-P1D`) with `ACTION:DISPLAY`.
  - Non-inclusive all-day `DTEND` handling ensuring standard 1-day visible display across Google, Apple, and Outlook calendars.

- **Calendar Export Route Handler (`app/api/calendar/export/route.ts`)**:
  - `GET`: supports `?scope=all|warranties|returns` and optional `?id=` to export all deadlines or specific items.
  - Streams `.ics` file with standard MIME headers:
    - `Content-Type: text/calendar; charset=utf-8`
    - `Content-Disposition: attachment; filename="syncognia-deadlines.ics"`
    - `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`

- **Build Configuration (`next.config.mjs`)**:
  - Added clean Next.js configuration avoiding parallel webpack file cache lock contention on Windows OneDrive directories.
  - Verified full Next.js production build (`13/13` routes passing).

## Empirical Verification Proof

1. **Active Alerts Dispatcher Verification**:
   - `getActiveAlerts()`: executed against database with active records.
   - Summary returned: `total: 2, critical: 0, warning: 1, info: 1`.
   - Historical date shift simulation: correctly identified return windows closing in 2 days with `WARNING` urgency.

2. **RFC 5545 iCalendar Serialization**:
   - `generateICalendar()` verified output:
     - `BEGIN:VCALENDAR` and `END:VCALENDAR` properly wrapped.
     - `BEGIN:VEVENT` with `DTSTART;VALUE=DATE:` and `DTEND;VALUE=DATE:`.
     - `BEGIN:VALARM` triggers verified (`TRIGGER:-P30D`, `TRIGGER:-P7D`).

3. **Calendar Export Route Validation**:
   - `GET /api/calendar/export`: returned HTTP 200, Content-Type `text/calendar; charset=utf-8`, Content-Disposition `attachment; filename="syncognia-deadlines.ics"`.
   - `GET /api/calendar/export?scope=warranties`: verified generation of `[Warranty Expiry]` calendar events.
   - `GET /api/calendar/export?scope=returns`: verified generation of `[Return Deadline]` calendar events.

4. **Production Compilation & Type-Checking**:
   - `npx.cmd tsc --noEmit`: 0 TypeScript errors.
   - `npm.cmd run build`: 13/13 routes generated successfully:
     - `ƒ /api/calendar/export`
     - `ƒ /api/notifications/alerts`
     - `ƒ /api/return-policies`
     - `ƒ /api/warranties`
     - `ƒ /api/warranties/sync`
     - `ƒ /api/assets`
     - `ƒ /api/assets/[id]`
     - `ƒ /api/ingest/extract`
     - `ƒ /api/receipts`
     - `○ /`
     - `○ /receipts`

## Deviations & Notes

- **Git Commit Sandboxing**: In the Windows PowerShell environment, git commands attempting to lock `.git/index.lock` fail inside the standard sandbox due to host sandbox permissions. Task 1 was committed as `80668a8`. Task 2 files are staged and verified in the working directory; coordinator can finalize git commit `feat(phase-3): build zero-dependency RFC 5545 iCalendar serializer and download endpoint`.
