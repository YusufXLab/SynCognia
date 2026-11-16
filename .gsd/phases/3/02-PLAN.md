---
phase: 3
plan: 2
wave: 2
depends_on: ["01"]
gap_closure: false
---

# Plan 3.2: Expiry Notification Dispatcher & RFC 5545 Calendar (.ics) Export Engine

## Objective
Build the proactive alert dispatcher and calendar synchronization pipeline for asset expirations. This delivers a multi-tiered notification evaluation service (generating `CRITICAL`, `WARNING`, and `INFO` alerts at 24h, 7d, and 30d thresholds) and an RFC 5545 compliant `.ics` calendar serializer allowing users to download or sync warranty expirations and return deadlines with Google Calendar, Apple Calendar, and Outlook.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/3/RESEARCH.md
- .gsd/phases/3/01-PLAN.md
- prisma/schema.prisma
- lib/types/deadline.ts
- lib/services/deadlines.ts

## Tasks

<task type="auto">
  <name>Implement automated notification reminder dispatcher and alerts route handler</name>
  <files>
    lib/services/notifications.ts
    app/api/notifications/alerts/route.ts
  </files>
  <action>
    Create the notification alert dispatcher service to compute proactive reminders across warranty expirations and return deadlines.

    Steps:
    1. Create `lib/services/notifications.ts`:
       - Define types:
         - `AlertUrgency`: `"CRITICAL" | "WARNING" | "INFO"`.
         - `AlertType`: `"WARRANTY_EXPIRING" | "WARRANTY_EXPIRED" | "RETURN_WINDOW_CLOSING" | "RETURN_WINDOW_EXPIRED"`.
         - `NotificationAlert`: `id: string`, `type: AlertType`, `urgency: AlertUrgency`, `title: string`, `message: string`, `deadlineDate: Date`, `remainingDays: number`, `assetId: string`, `assetName: string`, `actionUrl: string`, `actionLabel: string`, `createdAt: Date`.
         - `AlertSummary`: `total: number`, `critical: number`, `warning: number`, `info: number`.
       - Implement `getActiveAlerts(options?: { userId?: string; referenceDate?: Date }): Promise<{ alerts: NotificationAlert[]; summary: AlertSummary }>`:
         - Fetch all warranties and return policies with linked asset details.
         - For warranties:
           - If `remainingDays < 0` (expired within last 14 days): generate `"WARRANTY_EXPIRED"` alert with `INFO` urgency.
           - If `0 <= remainingDays <= 1`: generate `"WARRANTY_EXPIRING"` with `CRITICAL` urgency ("Warranty expires tomorrow for {name}").
           - If `2 <= remainingDays <= 7`: generate `"WARRANTY_EXPIRING"` with `WARNING` urgency ("Warranty expires in {days} days for {name}").
           - If `8 <= remainingDays <= 30`: generate `"WARRANTY_EXPIRING"` with `INFO` urgency ("Warranty expiring this month for {name}").
         - For return policies (where `returnStatus !== "RETURNED"`):
           - If `0 <= remainingDays <= 1`: generate `"RETURN_WINDOW_CLOSING"` with `CRITICAL` urgency ("Last day to return {name}!").
           - If `2 <= remainingDays <= 7`: generate `"RETURN_WINDOW_CLOSING"` with `WARNING` urgency ("Return window closes in {days} days for {name}").
         - Sort alerts by remainingDays ascending (`CRITICAL` first).
         - Calculate summary counts for each urgency tier.
    2. Create `app/api/notifications/alerts/route.ts`:
       - `GET`: parses optional `?urgency=` filter, executes `getActiveAlerts()`, returns JSON `{ alerts, summary }`.

    AVOID: Spamming duplicate alerts or displaying expired items from months ago.
    USE: Strict time-window filtering and prioritize urgency tiers to make alerts immediately actionable.
  </action>
  <verify>
    npx tsx -e "import { getActiveAlerts } from './lib/services/notifications'; getActiveAlerts().then(res => { console.log('Total alerts:', res.summary.total); console.log('Critical:', res.summary.critical); console.log('Warning:', res.summary.warning); process.exit(0); });"
  </verify>
  <done>
    `getActiveAlerts` runs cleanly, returning structured alerts categorized by urgency and remaining days, and `/api/notifications/alerts` responds with HTTP 200.
  </done>
</task>

<task type="auto">
  <name>Build zero-dependency RFC 5545 iCalendar (.ics) serializer and download endpoint</name>
  <files>
    lib/utils/calendar.ts
    app/api/calendar/export/route.ts
  </files>
  <action>
    Construct the RFC 5545 compliant `.ics` calendar generator utility with alarm reminder triggers (`VALARM`) and download route handler.

    Steps:
    1. Create `lib/utils/calendar.ts`:
       - Define `CalendarEventInput`:
         - `id`: string
         - `title`: string
         - `description`: string
         - `startDate`: Date
         - `endDate`: Date
         - `url?: string`
         - `alarms?: number[]` (array of reminder offsets in days, e.g. `[30, 7, 1]`)
       - Implement date formatters for RFC 5545:
         - UTC format: `YYYYMMDDTHHMMSSZ`.
         - All-day date format: `YYYYMMDD`.
       - Implement text escaping: escape backslashes `\\`, semicolons `\;`, commas `\,`, and newlines `\n`.
       - Implement `generateICalendar(events: CalendarEventInput[], options?: { calName?: string }): string`:
         - Wrapper:
           ```text
           BEGIN:VCALENDAR\r\n
           VERSION:2.0\r\n
           PRODID:-//SynCognia//Asset Intelligence Hub//EN\r\n
           CALSCALE:GREGORIAN\r\n
           METHOD:PUBLISH\r\n
           X-WR-CALNAME:SynCognia Expirations & Deadlines\r\n
           ```
         - For each event:
           - `BEGIN:VEVENT`
           - `UID:${id}@syncognia.local`
           - `DTSTAMP:${nowUtc}`
           - `DTSTART;VALUE=DATE:${startDateStr}`
           - `DTEND;VALUE=DATE:${endDateStr}`
           - `SUMMARY:${escapedTitle}`
           - `DESCRIPTION:${escapedDesc}`
           - `URL:${url}` (if provided)
           - For each alarm offset (e.g., 30d, 7d, 1d):
             ```text
             BEGIN:VALARM\r\n
             ACTION:DISPLAY\r\n
             DESCRIPTION:Reminder: ${escapedTitle}\r\n
             TRIGGER:-P${days}D\r\n
             END:VALARM\r\n
             ```
           - `END:VEVENT`
         - `END:VCALENDAR\r\n`
    2. Create `app/api/calendar/export/route.ts`:
       - `GET` route handler supporting query parameters:
         - `scope`: `"all"` (default) | `"warranties"` | `"returns"`
         - `id`: optional specific ID to download a single calendar event (e.g. for a single asset)
       - Loads relevant warranties and return policies from Prisma.
       - Maps records into `CalendarEventInput`:
         - Warranties: alarms at 30 days and 7 days.
         - Returns: alarms at 7 days and 1 day.
       - Generates `.ics` content string.
       - Returns `NextResponse` with headers:
         - `Content-Type: text/calendar; charset=utf-8`
         - `Content-Disposition: attachment; filename="syncognia-deadlines.ics"`
         - `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`

    AVOID: CRLF vs LF formatting bugs that prevent calendar apps (like Apple Calendar or Google Calendar) from importing `.ics` files.
    USE: Explicit `\r\n` line delimiters and strict RFC 5545 timestamp formats.
  </action>
  <verify>
    npx tsx -e "import { generateICalendar } from './lib/utils/calendar'; const ics = generateICalendar([{ id: 'test', title: 'Test Expiry', description: 'Test note', startDate: new Date(), endDate: new Date(), alarms: [30, 7] }]); console.log('Valid ICS:', ics.includes('BEGIN:VCALENDAR') && ics.includes('TRIGGER:-P30D'));"
  </verify>
  <done>
    `generateICalendar` produces valid RFC 5545 content with embedded VALARM reminders, and `/api/calendar/export` streams the `.ics` file with proper MIME headers.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] `getActiveAlerts` evaluates active deadlines and generates prioritized notification alerts at 30d, 7d, and 24h triggers.
- [ ] Notification alerts include actionable details (asset name, urgency, deadline date, action URL).
- [ ] `generateICalendar` outputs valid RFC 5545 `.ics` strings with `BEGIN:VCALENDAR`, `VEVENT`, and `VALARM` triggers.
- [ ] `/api/calendar/export` supports exporting all deadlines or filtering by scope (`warranties`, `returns`, or individual item ID).
- [ ] Calendar export responds with `Content-Type: text/calendar; charset=utf-8` and attachment download headers.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
