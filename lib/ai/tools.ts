import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { EventSource } from '@prisma/client';
import { ConfirmationPayload, EventSnapshot, ConflictWarning } from '@/types/chat';
import { parseUserDate, formatDateForDb, parseTimeFromInput } from './date-parser';
import { findConflicts } from '@/lib/calendar/conflict-detection';

/**
 * Convert Prisma Event (with course relation) to EventSnapshot for confirmations.
 */
function eventToSnapshot(event: {
  id: string;
  title: string;
  date: string;
  time: string | null;
  type: string;
  course: { name: string };
}): EventSnapshot {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    type: event.type,
    courseName: event.course.name,
  };
}

/**
 * Check for conflicts between an event and other events.
 * Returns array of conflict warnings.
 */
function checkConflictsForEvent(
  eventDate: string,
  eventTime: string | null,
  allEvents: Array<{
    id: string;
    title: string;
    date: string;
    time: string | null;
    course: { name: string };
  }>,
  excludeEventId?: string
): ConflictWarning[] {
  // Only check conflicts for timed events
  if (!eventTime) {
    return [];
  }

  // Parse time to get hour for duration estimation (assume 1-hour duration)
  const [hour, minute] = eventTime.split(':').map(Number);
  const startTime = new Date(`2000-01-01T${eventTime}:00`);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  const conflicts: ConflictWarning[] = [];

  for (const otherEvent of allEvents) {
    // Skip the event itself
    if (otherEvent.id === excludeEventId) continue;

    // Only check same-day timed events
    if (otherEvent.date !== eventDate || !otherEvent.time) continue;

    const [otherHour, otherMinute] = otherEvent.time.split(':').map(Number);
    const otherStartTime = new Date(`2000-01-01T${otherEvent.time}:00`);
    const otherEndTime = new Date(otherStartTime.getTime() + 60 * 60 * 1000);

    // Check for overlap
    if (startTime < otherEndTime && endTime > otherStartTime) {
      conflicts.push({
        eventId: otherEvent.id,
        eventTitle: otherEvent.title,
        message: `Overlaps with ${otherEvent.title} (${otherEvent.course.name}) at ${otherEvent.time}`,
      });
    }
  }

  return conflicts;
}

/**
 * Modify an existing Almanac event.
 */
const modifyEventSchema = z.object({
  eventId: z.string().describe('ID of the event to modify'),
  newTitle: z.string().optional().describe('New title for the event'),
  newDate: z
    .string()
    .optional()
    .describe('New date (natural language like "next Friday" or ISO format YYYY-MM-DD)'),
  newTime: z
    .string()
    .optional()
    .describe('New time (e.g., "2pm", "14:00") or "all-day" to remove time'),
  newType: z
    .string()
    .optional()
    .describe('New event type (exam, assignment, quiz, reading, etc.)'),
});

export const modifyEventTool = tool<z.infer<typeof modifyEventSchema>, ConfirmationPayload>({
  description:
    "Modify an existing Almanac event's title, date, time, or type. Use this when the user wants to change event details.",
  inputSchema: modifyEventSchema,
  execute: async (input) => {
    const { eventId, newTitle, newDate, newTime, newType } = input;
    // Look up the event with course relation
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { course: true },
    });

    if (!event) {
      throw new Error(`Event not found with ID: ${eventId}`);
    }

    // Check source - only allow modifications to Almanac events
    if (event.source !== EventSource.ALMANAC) {
      throw new Error(
        `Cannot modify external event "${event.title}". Only Almanac-created events can be modified.`
      );
    }

    const beforeSnapshot = eventToSnapshot(event);

    // Build the "after" state with modifications
    let parsedDate = event.date;
    let parsedTime = event.time;

    // Parse new date if provided
    if (newDate) {
      const dateResult = parseUserDate(newDate);
      if (!dateResult) {
        throw new Error(
          `Could not parse date: "${newDate}". Try formats like "next Friday", "March 15", or "2026-03-15".`
        );
      }
      parsedDate = formatDateForDb(dateResult.date);
    }

    // Parse new time if provided
    if (newTime) {
      if (newTime.toLowerCase() === 'all-day' || newTime.toLowerCase() === 'all day') {
        parsedTime = null;
      } else {
        const timeResult = parseTimeFromInput(newTime);
        if (!timeResult) {
          throw new Error(
            `Could not parse time: "${newTime}". Try formats like "2pm", "14:00", or "all-day".`
          );
        }
        parsedTime = timeResult;
      }
    }

    const afterSnapshot: EventSnapshot = {
      id: event.id,
      title: newTitle || event.title,
      date: parsedDate,
      time: parsedTime,
      type: newType || event.type,
      courseName: event.course.name,
    };

    // Check for conflicts if date or time changed
    const allEvents = await prisma.event.findMany({
      include: { course: true },
    });

    const conflicts = checkConflictsForEvent(
      afterSnapshot.date,
      afterSnapshot.time,
      allEvents,
      event.id
    );

    const confirmation: ConfirmationPayload = {
      type: 'modify',
      description: `Modify "${event.title}" (${event.course.name})`,
      changes: {
        before: beforeSnapshot,
        after: afterSnapshot,
      },
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };

    return confirmation;
  },
});

/**
 * Delete an existing Almanac event.
 */
const deleteEventSchema = z.object({
  eventId: z.string().describe('ID of the event to delete'),
  reason: z.string().optional().describe('Optional reason for deletion (for context)'),
});

export const deleteEventTool = tool<z.infer<typeof deleteEventSchema>, ConfirmationPayload>({
  description:
    'Delete an Almanac event. Use this when the user wants to remove an event from their calendar.',
  inputSchema: deleteEventSchema,
  execute: async (input) => {
    const { eventId, reason } = input;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { course: true },
    });

    if (!event) {
      throw new Error(`Event not found with ID: ${eventId}`);
    }

    // Check source - only allow deletion of Almanac events
    if (event.source !== EventSource.ALMANAC) {
      throw new Error(
        `Cannot delete external event "${event.title}". Only Almanac-created events can be deleted.`
      );
    }

    const snapshot = eventToSnapshot(event);

    const confirmation: ConfirmationPayload = {
      type: 'delete',
      description: `Delete "${event.title}" (${event.course.name})${reason ? ` - ${reason}` : ''}`,
      items: [snapshot],
    };

    return confirmation;
  },
});

/**
 * Create a new Almanac event.
 */
const createEventSchema = z.object({
  title: z.string().describe('Event title'),
  date: z
    .string()
    .describe('Event date (natural language like "next Friday" or ISO format YYYY-MM-DD)'),
  time: z
    .string()
    .optional()
    .describe('Event time (e.g., "2pm", "14:00") or omit for all-day event'),
  type: z
    .string()
    .describe('Event type (exam, assignment, quiz, reading, lecture, lab, etc.)'),
  courseCode: z.string().describe('Course code (e.g., "CSC 316")'),
});

export const createEventTool = tool<z.infer<typeof createEventSchema>, ConfirmationPayload>({
  description:
    'Create a new Almanac event. Use this when the user wants to add an event to their calendar.',
  inputSchema: createEventSchema,
  execute: async (input) => {
    const { title, date, time, type, courseCode } = input;
    // Validate course exists
    const course = await prisma.course.findUnique({
      where: { code: courseCode },
    });

    if (!course) {
      const availableCourses = (await prisma.course.findMany()).map((c) => c.code).join(', ');
      throw new Error(`Course not found: "${courseCode}". Available courses: ${availableCourses}`);
    }

    // Parse date
    const dateResult = parseUserDate(date);
    if (!dateResult) {
      throw new Error(
        `Could not parse date: "${date}". Try formats like "next Friday", "March 15", or "2026-03-15".`
      );
    }

    const parsedDate = formatDateForDb(dateResult.date);

    // Parse time if provided
    let parsedTime: string | null = null;
    if (time) {
      const timeResult = parseTimeFromInput(time);
      if (!timeResult) {
        throw new Error(
          `Could not parse time: "${time}". Try formats like "2pm", "14:00", or omit for all-day event.`
        );
      }
      parsedTime = timeResult;
    }

    // Check for conflicts
    const allEvents = await prisma.event.findMany({
      include: { course: true },
    });

    const conflicts = checkConflictsForEvent(parsedDate, parsedTime, allEvents);

    const snapshot: EventSnapshot = {
      id: '', // Will be generated on actual creation
      title,
      date: parsedDate,
      time: parsedTime,
      type,
      courseName: course.name,
    };

    const confirmation: ConfirmationPayload = {
      type: 'create',
      description: `Create "${title}" (${course.name}) on ${dateResult.formatted}${parsedTime ? ` at ${parsedTime}` : ' (all-day)'}`,
      items: [snapshot],
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };

    return confirmation;
  },
});

/**
 * Query/search events by title, date range, course, or type.
 * Read-only operation - no confirmation needed.
 */
const queryEventsSchema = z.object({
  query: z.string().optional().describe('Text to search in event titles'),
  courseCode: z.string().optional().describe('Filter by course code (e.g., "CSC 316")'),
  dateRange: z
    .object({
      start: z.string().describe('Start date (ISO format YYYY-MM-DD or natural language)'),
      end: z.string().describe('End date (ISO format YYYY-MM-DD or natural language)'),
    })
    .optional()
    .describe('Filter by date range'),
  type: z
    .string()
    .optional()
    .describe('Filter by event type (exam, assignment, quiz, reading, etc.)'),
});

export const queryEventsTool = tool<
  z.infer<typeof queryEventsSchema>,
  { count: number; events: EventSnapshot[] }
>({
  description:
    'Search events by title, date range, course, or type. Use this to find events before modifying them or to answer questions about the calendar.',
  inputSchema: queryEventsSchema,
  execute: async (input) => {
    const { query, courseCode, dateRange, type } = input;
    // Build where clause
    const where: any = {
      AND: [],
    };

    if (query) {
      where.AND.push({
        title: {
          contains: query,
        },
      });
    }

    if (courseCode) {
      const course = await prisma.course.findUnique({ where: { code: courseCode } });
      if (course) {
        where.AND.push({ courseId: course.id });
      } else {
        throw new Error(`Course not found: "${courseCode}"`);
      }
    }

    if (dateRange) {
      const startResult = parseUserDate(dateRange.start);
      const endResult = parseUserDate(dateRange.end);

      if (!startResult || !endResult) {
        throw new Error(
          'Could not parse date range. Use ISO format (YYYY-MM-DD) or natural language.'
        );
      }

      where.AND.push({
        date: {
          gte: formatDateForDb(startResult.date),
          lte: formatDateForDb(endResult.date),
        },
      });
    }

    if (type) {
      where.AND.push({
        type: {
          equals: type,
        },
      });
    }

    const events = await prisma.event.findMany({
      where: where.AND.length > 0 ? where : undefined,
      include: { course: true },
      orderBy: { date: 'asc' },
    });

    const snapshots = events.map(eventToSnapshot);

    return {
      count: snapshots.length,
      events: snapshots,
    };
  },
});

/**
 * Delete multiple Almanac events matching criteria.
 * Always requires confirmation with full list of affected events.
 */
const bulkDeleteSchema = z.object({
  courseCode: z.string().optional().describe('Filter by course code'),
  type: z.string().optional().describe('Filter by event type'),
  dateRange: z
    .object({
      start: z.string().optional().describe('Start date (ISO or natural language)'),
      end: z.string().optional().describe('End date (ISO or natural language)'),
    })
    .optional()
    .describe('Filter by date range'),
});

export const bulkDeleteTool = tool<z.infer<typeof bulkDeleteSchema>, ConfirmationPayload>({
  description:
    'Delete multiple Almanac events matching criteria. Use this for bulk operations like "delete all assignments after spring break".',
  inputSchema: bulkDeleteSchema,
  execute: async (input) => {
    const { courseCode, type, dateRange } = input;
    // Build where clause (same as queryEventsTool)
    const where: any = {
      AND: [{ source: EventSource.ALMANAC }], // Only delete Almanac events
    };

    if (courseCode) {
      const course = await prisma.course.findUnique({ where: { code: courseCode } });
      if (course) {
        where.AND.push({ courseId: course.id });
      } else {
        throw new Error(`Course not found: "${courseCode}"`);
      }
    }

    if (type) {
      where.AND.push({
        type: {
          equals: type,
        },
      });
    }

    if (dateRange) {
      if (dateRange.start) {
        const startResult = parseUserDate(dateRange.start);
        if (!startResult) {
          throw new Error(`Could not parse start date: "${dateRange.start}"`);
        }
        where.AND.push({ date: { gte: formatDateForDb(startResult.date) } });
      }

      if (dateRange.end) {
        const endResult = parseUserDate(dateRange.end);
        if (!endResult) {
          throw new Error(`Could not parse end date: "${dateRange.end}"`);
        }
        where.AND.push({ date: { lte: formatDateForDb(endResult.date) } });
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: { course: true },
      orderBy: { date: 'asc' },
    });

    if (events.length === 0) {
      throw new Error('No matching events found to delete.');
    }

    const snapshots = events.map(eventToSnapshot);

    const confirmation: ConfirmationPayload = {
      type: 'bulk-delete',
      description: `Delete ${events.length} event${events.length === 1 ? '' : 's'}`,
      items: snapshots,
    };

    return confirmation;
  },
});
