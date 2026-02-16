import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createEvent, updateEvent, deleteEvent } from "@/app/server-actions/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { validateDate, validateTime, validateEventId } from "./validation";
import {
  parseISO,
  addDays,
  isAfter,
  format,
  getDay,
} from "date-fns";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Factory function that creates the tool set, closing over userId
 * so every tool can validate ownership without passing userId through the LLM.
 *
 * NOTE: Zod constraints like .regex(), .uuid(), .min(), .max() are intentionally
 * omitted from inputSchema because LLM function calling APIs have limited
 * JSON Schema support — properties like `pattern`, `format`, `minimum`, `minItems`
 * can cause empty responses. All validation happens server-side in execute functions.
 */
export function createTools(userId: string) {
  const tools = {
    create_event: tool({
      description:
        "Create a single calendar event. Use when the user asks to add, create, or schedule an event. courseId is optional — omit for events not tied to a specific course.",
      inputSchema: z.object({
        title: z.string().describe("The title/name of the event"),
        date: z
          .string()
          .describe("The date in YYYY-MM-DD format (e.g. 2026-02-16)"),
        time: z
          .string()
          .optional()
          .describe("Optional time in HH:MM 24-hour format (e.g. 14:30)"),
        type: z
          .enum([
            "exam",
            "assignment",
            "quiz",
            "reading",
            "lecture",
            "lab",
            "project",
            "study",
            "other",
          ])
          .describe("The type of event"),
        courseId: z
          .string()
          .optional()
          .describe("The UUID of the course this event belongs to. Omit for generic events."),
        description: z
          .string()
          .optional()
          .describe("Optional description or notes"),
      }),
      execute: async ({ title, date, time, type, courseId, description }) => {
        // Validate date
        const dateCheck = validateDate(date);
        if (!dateCheck.ok) return { success: false, error: dateCheck.error };

        // Validate time if provided
        if (time) {
          const timeCheck = validateTime(time);
          if (!timeCheck.ok) return { success: false, error: timeCheck.error };
        }

        const result = await createEvent({
          title,
          date,
          time: time || null,
          type,
          courseId: courseId || null,
          description: description || "",
          source: "ALMANAC",
          googleEventId: null,
        });

        if (!result.ok) return { success: false, error: result.error };

        // Look up course name if courseId was provided
        let courseName: string | null = null;
        if (courseId) {
          const course = await prisma.course.findUnique({ where: { id: courseId } });
          courseName = course?.name ?? null;
        }

        return {
          success: true,
          affectedEventIds: [result.event.id],
          event: {
            id: result.event.id,
            title: result.event.title,
            date: result.event.date,
            time: result.event.time,
            type: result.event.type,
            courseName,
          },
        };
      },
    }),

    create_recurring_events: tool({
      description:
        "Create recurring events on specific days of the week within a date range. Use for: weekly lectures/labs, blocking time, reserving days for study/research, or any repeated schedule pattern. Accepts multiple days (e.g. MWF = ['monday','wednesday','friday']). The server calculates all correct dates automatically — do NOT create individual events one by one.",
      inputSchema: z.object({
        title: z.string().describe("The title for each recurring event"),
        daysOfWeek: z
          .array(
            z.enum([
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ])
          )
          .describe("Days of the week for the recurring event. Must have at least one day (e.g. ['monday', 'wednesday', 'friday'])"),
        startDate: z
          .string()
          .describe("Start of the date range in YYYY-MM-DD format (e.g. 2026-02-16)"),
        endDate: z
          .string()
          .describe("End of the date range in YYYY-MM-DD format (e.g. 2026-04-30)"),
        time: z
          .string()
          .optional()
          .describe("Optional time in HH:MM 24-hour format"),
        type: z
          .enum([
            "exam",
            "assignment",
            "quiz",
            "reading",
            "lecture",
            "lab",
            "project",
            "study",
            "other",
          ])
          .describe("The type of event"),
        courseId: z
          .string()
          .optional()
          .describe("The UUID of the course these events belong to"),
        description: z.string().optional().describe("Optional description"),
      }),
      execute: async ({
        title,
        daysOfWeek,
        startDate,
        endDate,
        time,
        type,
        courseId,
        description,
      }) => {
        // Validate dates
        const startCheck = validateDate(startDate);
        if (!startCheck.ok) return { success: false, error: startCheck.error };
        const endCheck = validateDate(endDate);
        if (!endCheck.ok) return { success: false, error: endCheck.error };
        if (time) {
          const timeCheck = validateTime(time);
          if (!timeCheck.ok) return { success: false, error: timeCheck.error };
        }

        const targetDayIndices = daysOfWeek.map((d) => DAY_INDEX[d]);
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        // Calculate all matching dates
        const dates: string[] = [];
        let current = start;
        while (!isAfter(current, end)) {
          if (targetDayIndices.includes(getDay(current))) {
            dates.push(format(current, "yyyy-MM-dd"));
          }
          current = addDays(current, 1);
        }

        if (dates.length === 0) {
          return {
            success: false,
            error: `No matching days found between ${startDate} and ${endDate}`,
          };
        }

        // Deduplicate: skip dates that already have an event with the same title
        const existingEvents = await prisma.event.findMany({
          where: {
            userId,
            title,
            date: { in: dates },
          },
          select: { date: true },
        });
        const existingDates = new Set(existingEvents.map((e) => e.date));
        const newDates = dates.filter((d) => !existingDates.has(d));

        if (newDates.length === 0) {
          return {
            success: true,
            affectedEventIds: [],
            count: 0,
            skippedCount: dates.length,
            message: `All ${dates.length} dates already have "${title}" events — no duplicates created.`,
            daysOfWeek,
            title,
          };
        }

        // Create events only for new dates
        const results = await Promise.all(
          newDates.map(async (date) => {
            const res = await createEvent({
              title,
              date,
              time: time || null,
              type,
              courseId: courseId || null,
              description: description || "",
              source: "ALMANAC",
              googleEventId: null,
            });
            return { date, result: res };
          })
        );

        const succeeded = results.filter((r) => r.result.ok);
        const failed = results.filter((r) => !r.result.ok);
        const createdIds = succeeded
          .map((r) => (r.result.ok ? r.result.event.id : null))
          .filter(Boolean) as string[];

        if (succeeded.length === 0) {
          return {
            success: false,
            error: "Failed to create any events",
            failedDates: failed.map((r) => r.date),
          };
        }

        // Post-creation audit: verify every target date now has exactly one matching event
        const verifyEvents = await prisma.event.findMany({
          where: {
            userId,
            title,
            date: { in: dates },
          },
          select: { date: true, id: true },
        });
        const verifiedDates = new Set(verifyEvents.map((e) => e.date));
        const missingDates = dates.filter((d) => !verifiedDates.has(d));

        // Check for duplicates (more than one event per date)
        const dateCounts = new Map<string, number>();
        for (const e of verifyEvents) {
          dateCounts.set(e.date, (dateCounts.get(e.date) || 0) + 1);
        }
        const duplicateDates = [...dateCounts.entries()]
          .filter(([, count]) => count > 1)
          .map(([date]) => date);

        return {
          success: true,
          affectedEventIds: createdIds,
          count: succeeded.length,
          totalExpected: dates.length,
          ...(existingDates.size > 0 && { skippedDuplicates: existingDates.size }),
          ...(failed.length > 0 && { failedDates: failed.map((r) => r.date) }),
          ...(missingDates.length > 0 && { missingDates }),
          ...(duplicateDates.length > 0 && { duplicateDates }),
          verified: missingDates.length === 0 && duplicateDates.length === 0,
          dates: succeeded.map((r) => r.date),
          daysOfWeek,
          title,
        };
      },
    }),

    edit_event: tool({
      description:
        "Edit an existing event. Can change any field: title, date, time, type, description. Use when the user wants to reschedule, rename, or modify an event. Cannot modify read-only Google Calendar events.",
      inputSchema: z.object({
        eventId: z
          .string()
          .describe("The UUID of the event to edit"),
        title: z.string().optional().describe("New title"),
        date: z
          .string()
          .optional()
          .describe("New date in YYYY-MM-DD format (e.g. 2026-02-16)"),
        time: z
          .string()
          .optional()
          .describe("New time in HH:MM 24-hour format"),
        type: z
          .enum([
            "exam",
            "assignment",
            "quiz",
            "reading",
            "lecture",
            "lab",
            "project",
            "study",
            "other",
          ])
          .optional()
          .describe("New event type"),
        description: z.string().optional().describe("New description"),
      }),
      execute: async ({ eventId, title, date, time, type, description }) => {
        // Validate event exists and belongs to user
        const eventCheck = await validateEventId(eventId, userId);
        if (!eventCheck.ok) return { success: false, error: eventCheck.error };

        const before = eventCheck.event;

        // Validate new date if provided
        if (date) {
          const dateCheck = validateDate(date);
          if (!dateCheck.ok) return { success: false, error: dateCheck.error };
        }
        if (time) {
          const timeCheck = validateTime(time);
          if (!timeCheck.ok) return { success: false, error: timeCheck.error };
        }

        const updates: Record<string, string | null> = {};
        if (title !== undefined) updates.title = title;
        if (date !== undefined) updates.date = date;
        if (time !== undefined) updates.time = time;
        if (type !== undefined) updates.type = type;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length === 0) {
          return { success: false, error: "No changes specified" };
        }

        const result = await updateEvent(eventId, updates);
        if (!result.ok) return { success: false, error: result.error };

        return {
          success: true,
          affectedEventIds: [eventId],
          event: {
            id: eventId,
            title: result.event.title,
            oldDate: before.date,
            newDate: result.event.date,
            oldTime: before.time,
            newTime: result.event.time,
            oldTitle: before.title,
            newTitle: result.event.title,
            courseName: before.course?.name ?? null,
          },
        };
      },
    }),

    query_events: tool({
      description:
        "Search and list events from the user's calendar. Use for questions like 'what's due this week?', 'show my exams', 'what do I have on Friday?'. This is read-only — it does NOT modify anything.",
      inputSchema: z.object({
        startDate: z
          .string()
          .optional()
          .describe("Start of date range to search in YYYY-MM-DD format"),
        endDate: z
          .string()
          .optional()
          .describe("End of date range to search in YYYY-MM-DD format"),
        courseId: z
          .string()
          .optional()
          .describe("Filter by course UUID"),
        type: z
          .enum([
            "exam",
            "assignment",
            "quiz",
            "reading",
            "lecture",
            "lab",
            "project",
            "study",
            "other",
          ])
          .optional()
          .describe("Filter by event type"),
        titleSearch: z
          .string()
          .optional()
          .describe("Search events by title (case-insensitive partial match)"),
      }),
      execute: async ({ startDate, endDate, courseId, type, titleSearch }) => {
        if (startDate) {
          const check = validateDate(startDate);
          if (!check.ok) return { success: false, error: check.error };
        }
        if (endDate) {
          const check = validateDate(endDate);
          if (!check.ok) return { success: false, error: check.error };
        }

        const events = await prisma.event.findMany({
          where: {
            userId,
            ...(startDate && { date: { gte: startDate } }),
            ...(endDate && { date: { lte: endDate } }),
            ...(courseId && { courseId }),
            ...(type && { type }),
            ...(titleSearch && {
              title: { contains: titleSearch, mode: "insensitive" as const },
            }),
          },
          include: { course: true },
          orderBy: { date: "asc" },
          take: 25,
        });

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            time: e.time,
            type: e.type,
            courseName: e.course?.name ?? null,
            courseCode: e.course?.code ?? null,
            source: e.source,
          })),
        };
      },
    }),

    suggest_study_time: tool({
      description:
        "Find free time slots on a specific date by analyzing existing events. Use when the user asks 'when should I study?', 'am I free on Tuesday?', or 'find time to work on X'.",
      inputSchema: z.object({
        date: z
          .string()
          .describe("The date to check for free time in YYYY-MM-DD format (e.g. 2026-02-16)"),
        durationMinutes: z
          .number()
          .optional()
          .describe("Desired study duration in minutes, between 15 and 480 (default 60)"),
      }),
      execute: async ({ date, durationMinutes = 60 }) => {
        const dateCheck = validateDate(date);
        if (!dateCheck.ok) return { success: false, error: dateCheck.error };

        const events = await prisma.event.findMany({
          where: { userId, date },
          orderBy: { time: "asc" },
        });

        // Collect busy slots (events with times)
        const busySlots: { start: number; end: number }[] = [];
        for (const evt of events) {
          if (evt.time) {
            const [h, m] = evt.time.split(":").map(Number);
            const startMin = h * 60 + m;
            busySlots.push({ start: startMin, end: startMin + 60 }); // Assume 1hr events
          }
        }

        // Sort by start time
        busySlots.sort((a, b) => a.start - b.start);

        // Find free slots between 8am (480) and 10pm (1320)
        const dayStart = 480; // 8:00 AM
        const dayEnd = 1320; // 10:00 PM
        const freeSlots: { start: string; end: string }[] = [];
        let cursor = dayStart;

        for (const slot of busySlots) {
          if (slot.start < dayStart) continue;
          if (cursor + durationMinutes <= slot.start) {
            freeSlots.push({
              start: `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`,
              end: `${String(Math.floor(slot.start / 60)).padStart(2, "0")}:${String(slot.start % 60).padStart(2, "0")}`,
            });
          }
          cursor = Math.max(cursor, slot.end);
        }

        // Check remaining time after last event
        if (cursor + durationMinutes <= dayEnd) {
          freeSlots.push({
            start: `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`,
            end: `${String(Math.floor(dayEnd / 60)).padStart(2, "0")}:${String(dayEnd % 60).padStart(2, "0")}`,
          });
        }

        return {
          success: true,
          date,
          existingEventCount: events.length,
          freeSlots,
          suggestedDuration: durationMinutes,
        };
      },
    }),

    sync_to_google_calendar: tool({
      description:
        "Sync events to the user's Google Calendar. Use when the user asks to sync, export, or push events to Google Calendar.",
      inputSchema: z.object({
        eventIds: z
          .array(z.string())
          .describe("Array of event UUIDs to sync to Google Calendar"),
      }),
      execute: async ({ eventIds }) => {
        const result = await syncEventsToCalendar(eventIds);
        if (!result.ok) return { success: false, error: result.error };

        return {
          success: true,
          affectedEventIds: eventIds,
          count: eventIds.length,
        };
      },
    }),

    // HITL tool — no execute, requires user confirmation
    delete_event: tool({
      description:
        "Delete a single calendar event. This is destructive and requires user confirmation. Cannot delete read-only Google Calendar events.",
      inputSchema: z.object({
        eventId: z.string().describe("The UUID of the event to delete"),
        eventTitle: z.string().describe("The title of the event (shown in confirmation card)"),
        eventDate: z
          .string()
          .describe("The date of the event in YYYY-MM-DD format (shown in confirmation card)"),
      }),
      // No execute — pauses for user confirmation
      // No outputSchema — complex union schemas can break LLM function calling
    }),

    // HITL tool — no execute, requires user confirmation
    bulk_delete_events: tool({
      description:
        "Delete multiple calendar events at once. Requires user confirmation. Use when the user asks to delete all events for a course, type, or date range.",
      inputSchema: z.object({
        eventIds: z
          .array(z.string())
          .describe("Array of event UUIDs to delete. Must have at least one ID."),
        reason: z
          .string()
          .describe("Brief description of what is being deleted (shown in confirmation card)"),
      }),
      // No execute — pauses for user confirmation
      // No outputSchema — complex union schemas can break LLM function calling
    }),
  } satisfies ToolSet;

  return tools;
}

export type ChatTools = ReturnType<typeof createTools>;
