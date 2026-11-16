export interface CalendarEventInput {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  url?: string;
  alarms?: number[]; // Offset in days before the event (e.g., [30, 7, 1])
}

export interface GenerateICalendarOptions {
  calName?: string;
}

const CRLF = "\r\n";

/**
 * Formats a JavaScript Date into RFC 5545 UTC timestamp format: YYYYMMDDTHHMMSSZ
 */
export function formatUtcDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Formats a JavaScript Date into RFC 5545 all-day format: YYYYMMDD
 */
export function formatAllDayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

/**
 * Escapes characters for RFC 5545 text values:
 * backslashes, semicolons, commas, and newlines.
 */
export function escapeIcsText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string with optional VALARM triggers.
 */
export function generateICalendar(
  events: CalendarEventInput[],
  options?: GenerateICalendarOptions
): string {
  const calName = options?.calName || "SynCognia Expirations & Deadlines";
  const nowUtc = formatUtcDateTime(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SynCognia//Asset Intelligence Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
  ];

  for (const event of events) {
    const escapedTitle = escapeIcsText(event.title);
    const escapedDesc = escapeIcsText(event.description);
    const startDateStr = formatAllDayDate(event.startDate);
    
    // In RFC 5545, all-day DTEND is non-inclusive. If endDate is on or before startDate,
    // advance DTEND by 1 day to ensure a minimum 1-day visible event span.
    const startObj = new Date(event.startDate);
    const endObj = new Date(event.endDate);
    if (endObj.getTime() <= startObj.getTime()) {
      endObj.setDate(endObj.getDate() + 1);
    }
    const endDateStr = formatAllDayDate(endObj);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@syncognia.local`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;VALUE=DATE:${startDateStr}`);
    lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
    lines.push(`SUMMARY:${escapedTitle}`);
    lines.push(`DESCRIPTION:${escapedDesc}`);

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    if (event.alarms && event.alarms.length > 0) {
      for (const days of event.alarms) {
        if (days >= 0) {
          lines.push("BEGIN:VALARM");
          lines.push("ACTION:DISPLAY");
          lines.push(`DESCRIPTION:Reminder: ${escapedTitle}`);
          lines.push(`TRIGGER:-P${days}D`);
          lines.push("END:VALARM");
        }
      }
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Join lines strictly with CRLF and append final CRLF per RFC 5545
  return lines.join(CRLF) + CRLF;
}
