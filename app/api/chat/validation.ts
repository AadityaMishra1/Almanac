import { parseISO, isValid, format } from "date-fns";
import { prisma } from "@/lib/db";
import type { Event, Course } from "@prisma/client";

export type EventWithCourse = Event & { course: Course | null };

/**
 * Validate a YYYY-MM-DD date string.
 * Checks regex format, parseISO validity, and round-trip correctness (catches Feb 30, etc.)
 */
export function validateDate(
  dateStr: string
): { ok: true; date: string } | { ok: false; error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: `Invalid date format "${dateStr}" — expected YYYY-MM-DD` };
  }

  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) {
    return { ok: false, error: `Invalid date "${dateStr}" — date does not exist` };
  }

  // Round-trip check: format back to YYYY-MM-DD and compare
  const roundTrip = format(parsed, "yyyy-MM-dd");
  if (roundTrip !== dateStr) {
    return {
      ok: false,
      error: `Invalid date "${dateStr}" — did you mean "${roundTrip}"?`,
    };
  }

  return { ok: true, date: dateStr };
}

/**
 * Validate an HH:MM time string.
 * Checks regex format and range (00-23 hours, 00-59 minutes).
 */
export function validateTime(
  timeStr: string
): { ok: true; time: string } | { ok: false; error: string } {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    return { ok: false, error: `Invalid time format "${timeStr}" — expected HH:MM` };
  }

  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { ok: false, error: `Invalid time "${timeStr}" — hours must be 00-23, minutes 00-59` };
  }

  return { ok: true, time: timeStr };
}

/**
 * Validate an event ID exists and belongs to the user.
 * Returns the full event record on success.
 */
export async function validateEventId(
  eventId: string,
  userId: string
): Promise<
  | { ok: true; event: EventWithCourse }
  | { ok: false; error: string }
> {
  // UUID format check
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      eventId
    )
  ) {
    return { ok: false, error: `Invalid event ID format "${eventId}" — not a valid UUID` };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    include: { course: true },
  });

  if (!event) {
    return { ok: false, error: `Event not found — no event with ID "${eventId}" exists in your calendar` };
  }

  return { ok: true, event };
}
