import { getCalendarClient } from "@/lib/google";
import { prisma } from "@/lib/db";
import type { Event } from "@prisma/client";

export interface PushResult {
  pushed: number;
  errors: string[];
}

/**
 * Push un-synced Almanac events to Google Calendar.
 * Only pushes ALMANAC source events without googleEventId.
 * Updates local database with returned googleEventId.
 */
export async function pushEventsToGoogle(
  accessToken: string,
  events: Event[]
): Promise<PushResult> {
  const calendar = getCalendarClient(accessToken);
  let pushed = 0;
  const errors: string[] = [];

  // Filter to only ALMANAC events without googleEventId
  const unsyncedEvents = events.filter(
    (e) => e.source === "ALMANAC" && !e.googleEventId
  );

  for (const event of unsyncedEvents) {
    try {
      // Build Google Calendar event
      const startDate = event.date;
      const endDate = addDays(event.date, 1);

      // Fetch course for description context
      const course = await prisma.course.findUnique({
        where: { id: event.courseId },
      });

      const description = [
        event.type,
        event.description,
        course ? `Course: ${course.name} (${course.code})` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Insert to Google Calendar
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description,
          start: event.time
            ? { dateTime: buildDateTime(event.date, event.time) }
            : { date: startDate },
          end: event.time
            ? { dateTime: buildDateTime(event.date, event.time, 1) } // +1 hour
            : { date: endDate },
        },
      });

      const googleEventId = response.data.id;

      if (googleEventId) {
        // Update local database with Google Calendar ID
        await prisma.event.update({
          where: { id: event.id },
          data: { googleEventId },
        });

        pushed++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Event ${event.id} (${event.title}): ${message}`);
      console.warn(`Failed to push event ${event.id}:`, error);
    }
  }

  return { pushed, errors };
}

/**
 * Add days to ISO date string.
 * Returns YYYY-MM-DD format.
 */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Build ISO 8601 dateTime string from date and time.
 * Adds optional hourOffset for end time calculation.
 */
function buildDateTime(date: string, time: string, hourOffset = 0): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const dt = new Date(year, month - 1, day, hour + hourOffset, minute);
  return dt.toISOString();
}
