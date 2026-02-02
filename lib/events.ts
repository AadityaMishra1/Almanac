import { z } from "zod";
import { Event, EventSource } from '@prisma/client';

export const SyllabusEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional().default("")
});

export type SyllabusEvent = z.infer<typeof SyllabusEventSchema>;

const SyllabusEventsResponseSchema = z.array(SyllabusEventSchema);

function coerceToIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const currentYear = new Date().getFullYear();
  const pad = (num: number) => String(num).padStart(2, "0");

  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    let year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (year < currentYear) year = currentYear;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const monthDayMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    return `${currentYear}-${pad(month)}-${pad(day)}`;
  }

  const hasYear = /\b(19|20)\d{2}\b/.test(trimmed);
  const candidate = hasYear ? trimmed : `${trimmed} ${currentYear}`;
  const maybeDate = new Date(candidate);
  if (Number.isNaN(maybeDate.getTime())) return trimmed;

  let year = hasYear ? maybeDate.getFullYear() : currentYear;
  if (year < currentYear) year = currentYear;
  const month = maybeDate.getMonth() + 1;
  const day = maybeDate.getDate();
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeAndValidateEvents(input: unknown): SyllabusEvent[] {
  const result = SyllabusEventsResponseSchema.safeParse(input);
  if (result.success) {
    return result.data.map((event) => ({ ...event, date: coerceToIsoDate(event.date) }));
  }

  if (typeof input === "object" && input && "events" in input) {
    const maybeEvents = (input as any).events;
    const nested = SyllabusEventsResponseSchema.safeParse(maybeEvents);
    if (nested.success) {
      return nested.data.map((event) => ({ ...event, date: coerceToIsoDate(event.date) }));
    }
  }

  throw new Error("AI response was not a valid events array.");
}

// Type for event creation (bridges to Prisma Event model)
export const CreateEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1), // ISO 8601 (YYYY-MM-DD)
  time: z.string().optional().nullable(), // ISO 8601 time (HH:MM) or null
  type: z.string().min(1), // exam, assignment, quiz, reading
  description: z.string().optional().default(""),
  courseId: z.string().uuid(), // Required for database
  source: z.nativeEnum(EventSource).optional().default(EventSource.ALMANAC),
  googleEventId: z.string().optional().nullable(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

/**
 * Convert SyllabusEvent (from PDF parsing) to CreateEventInput (for database).
 * Requires courseId to associate event with course.
 */
export function syllabusEventToCreateInput(
  event: SyllabusEvent,
  courseId: string
): CreateEventInput {
  return {
    title: event.title,
    date: coerceToIsoDate(event.date), // Reuse existing date normalization
    time: null, // SyllabusEvent doesn't have time field (all-day events)
    type: event.type,
    description: event.description || "",
    courseId,
    source: EventSource.ALMANAC, // PDF-extracted events are always ALMANAC
    googleEventId: null,
  };
}

/**
 * Convert Prisma Event (from database) to SyllabusEvent (for UI compatibility).
 * Used to maintain compatibility with existing EventsTable component.
 */
export function prismaEventToSyllabus(event: Event): SyllabusEvent {
  return {
    title: event.title,
    date: event.date, // Already in ISO 8601 format
    type: event.type,
    description: event.description || "",
  };
}

/**
 * Validate if event can be modified based on source.
 * External events (from Google Calendar) are read-only.
 */
export function canModifyEvent(event: Event): boolean {
  return event.source === EventSource.ALMANAC;
}
