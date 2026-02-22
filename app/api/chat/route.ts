import {
  createUIMessageStreamResponse,
  createUIMessageStream,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteEvent } from "@/app/server-actions/events";
import { canModifyEvent } from "@/lib/events";
import { validateEventId } from "./validation";
import { processToolCalls } from "./utils";
import { createTools } from "./tools";
import { logCommand } from "./command-logger";
import type { HumanInTheLoopUIMessage } from "./types";
import { format, addDays, addMonths, parseISO, isAfter } from "date-fns";

export const maxDuration = 30;

/**
 * Parse a semester string (e.g. "Spring 2026", "Fall 2025") into a structured
 * term + year + approximate end date. Returns null if unrecognizable.
 */
interface SemesterInfo {
  term: "spring" | "summer" | "fall" | "winter";
  year: number;
  endDate: string;
}

function parseSemester(semester: string): SemesterInfo | null {
  const lower = semester.toLowerCase();
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  if (lower.includes("spring"))
    return { term: "spring", year, endDate: `${year}-05-15` };
  if (lower.includes("summer"))
    return { term: "summer", year, endDate: `${year}-08-15` };
  if (lower.includes("fall") || lower.includes("autumn"))
    return { term: "fall", year, endDate: `${year}-12-15` };
  if (lower.includes("winter"))
    return { term: "winter", year, endDate: `${year + 1}-01-31` };
  return null;
}

/**
 * Determine the semester end date from a list of course semester strings.
 * Picks the latest end date across all courses. Falls back to 3 months from now.
 */
function computeSemesterEndDate(semesters: string[]): string {
  const now = new Date();
  let latest: Date | null = null;

  for (const s of semesters) {
    const info = parseSemester(s);
    if (!info) continue;
    const end = parseISO(info.endDate);
    if (!latest || isAfter(end, latest)) {
      latest = end;
    }
  }

  if (!latest || !isAfter(latest, now)) {
    return format(addMonths(now, 3), "yyyy-MM-dd");
  }

  // Cap at 6 months from now to keep prompt reasonable
  const sixMonthsOut = addMonths(now, 6);
  if (isAfter(latest, sixMonthsOut)) {
    return format(sixMonthsOut, "yyyy-MM-dd");
  }

  return format(latest, "yyyy-MM-dd");
}

/**
 * Build a date lookup table from today through the semester end.
 * Injected into the system prompt so the LLM never has to calculate dates.
 */
function buildDateLookupTable(semesterEndDate: string): string {
  const today = new Date();
  const end = parseISO(semesterEndDate);
  const lines: string[] = [];
  let current = today;
  let i = 0;

  while (!isAfter(current, end)) {
    const label = i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : "";
    lines.push(
      `  ${format(current, "EEE")} ${format(current, "yyyy-MM-dd")}${label}`,
    );
    current = addDays(current, 1);
    i++;
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { messages }: { messages: HumanInTheLoopUIMessage[] } =
    await req.json();

  const userId = session.user.id;

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const fourteenDaysOut = format(addDays(now, 14), "yyyy-MM-dd");

  // Fetch user context: courses first (needed for semester computation)
  const courses = await prisma.course.findMany({
    where: { userId },
  });

  // Compute semester end date from course metadata
  const semesterEndDate = computeSemesterEndDate(
    courses.map((c) => c.semester),
  );

  // Fetch events in tiers: today (all), next 14 days (all), count beyond
  const [todayEvents, upcomingEvents, futureCount] = await Promise.all([
    prisma.event.findMany({
      where: { userId, date: todayStr },
      include: { course: true },
      orderBy: { time: "asc" },
    }),
    prisma.event.findMany({
      where: {
        userId,
        date: { gt: todayStr, lte: fourteenDaysOut },
      },
      include: { course: true },
      orderBy: { date: "asc" },
    }),
    prisma.event.count({
      where: {
        userId,
        date: { gt: fourteenDaysOut },
      },
    }),
  ]);

  const allNearEvents = [...todayEvents, ...upcomingEvents];

  const formatEventLine = (e: (typeof allNearEvents)[0]) => {
    const dateObj = new Date(e.date + "T00:00:00");
    const dow = format(dateObj, "EEE");
    return `- [id:${e.id}] "${e.title}" (${e.type}) on ${dow} ${e.date}${e.time ? " at " + e.time : ""}${e.course ? ` for ${e.course.name} (${e.course.code})` : ""}${e.source === "GOOGLE_CALENDAR" ? " [read-only, synced from Google]" : ""}`;
  };

  const scheduleContext =
    allNearEvents.length > 0
      ? allNearEvents.map(formatEventLine).join("\n")
      : "No events in the next 14 days.";

  const futureNote =
    futureCount > 0
      ? `\n\nBeyond the next 14 days, the user has ${futureCount} more events. Use query_events to look them up.`
      : "";

  const coursesContext = courses
    .map((c) => `- [id:${c.id}] ${c.code} - ${c.name} (${c.semester})`)
    .join("\n");

  const dateLookup = buildDateLookupTable(semesterEndDate);

  // Compute context-aware insights
  const sevenDaysOut = format(addDays(now, 7), "yyyy-MM-dd");
  const upcomingDeadlines = allNearEvents.filter(
    (e) =>
      e.date >= todayStr &&
      e.date <= sevenDaysOut &&
      ["exam", "assignment", "quiz", "project"].includes(e.type),
  );
  const unsyncedCount = allNearEvents.filter(
    (e) => e.source === "ALMANAC" && !e.googleEventId,
  ).length;

  // Find heaviest day in the next 7 days
  const dayEventCounts = new Map<string, number>();
  for (const e of allNearEvents) {
    if (e.date >= todayStr && e.date <= sevenDaysOut) {
      dayEventCounts.set(e.date, (dayEventCounts.get(e.date) || 0) + 1);
    }
  }
  let heaviestDay = "";
  let heaviestCount = 0;
  for (const [date, count] of dayEventCounts) {
    if (count > heaviestCount) {
      heaviestDay = date;
      heaviestCount = count;
    }
  }

  const insightsLines: string[] = [];
  if (upcomingDeadlines.length > 0) {
    insightsLines.push(
      `- ${upcomingDeadlines.length} deadline${upcomingDeadlines.length > 1 ? "s" : ""} in the next 7 days`,
    );
  }
  if (heaviestDay && heaviestCount > 1) {
    insightsLines.push(
      `- Heaviest day: ${format(parseISO(heaviestDay), "EEE, MMM d")} with ${heaviestCount} events`,
    );
  }
  if (unsyncedCount > 0) {
    insightsLines.push(
      `- ${unsyncedCount} event${unsyncedCount > 1 ? "s" : ""} not yet synced to Google Calendar`,
    );
  }
  const insightsBlock =
    insightsLines.length > 0
      ? `\n\nINSIGHTS:\n${insightsLines.join("\n")}`
      : "";

  const systemPrompt = `You are Greg, a sharp and proactive AI executive assistant for a college student's academic calendar. You manage their schedule like a real secretary — anticipate needs, handle logistics, and never make them repeat themselves.

DATE REFERENCE (today through semester end):
${dateLookup}

SEMESTER: Ends approximately ${semesterEndDate}.

Their courses:
${coursesContext || "No courses yet."}

Their upcoming events (today + next 14 days):
${scheduleContext}${futureNote}

Today is ${format(now, "EEEE")}, ${format(now, "yyyy-MM-dd")}.${insightsBlock}

RULES:
1. SINGLE-EVENT DATES: Use the date lookup table above to resolve relative dates ("next Tuesday", "tomorrow", "March 20"). Match day-of-week to the correct YYYY-MM-DD. The table covers the entire semester — always look up dates from it instead of calculating.
2. RECURRING EVENTS: For ANY request involving repeated days — "block out Tuesdays", "every MWF", "weekly research time", "reserve Thursdays" — ALWAYS use create_recurring_events with the daysOfWeek array. Use today as startDate. If no end date is given, use the semester end date (${semesterEndDate}). NEVER create individual events one by one for recurring patterns.
3. BLOCKING TIME: When the user says "block out", "reserve", "set aside", or "keep free" certain days/times, treat this as a recurring event request. Ask for the time range if not specified (e.g. "What hours should I block — all day, or a specific window like 9 AM – 12 PM?").
4. EVENT IDs: Only use event IDs from the "upcoming events" list above, or from query_events results. NEVER fabricate or guess an event ID. If the user references an event by name, find the matching ID from the list or use query_events. If no match exists, tell the user.
5. READ-ONLY EVENTS: Events marked [read-only, synced from Google] cannot be modified or deleted.
6. COURSES: When the user mentions a course, match it to the closest course name/code and use its courseId. If no course matches or it's a generic event, omit courseId.
7. QUERIES: For questions like "what's due this week?" or "show my exams", use query_events. Do NOT answer from the context list alone — use the tool for accurate, filtered results.
8. BULK DELETES: For "delete all CSC 316 assignments", first use query_events to find matching event IDs, then use bulk_delete_events.
9. CONFLICT AWARENESS: When creating or moving an event to a specific time, check the events list for that date/time. If create_event or edit_event returns a conflictWarning, inform the user about the overlap and offer alternatives.
10. DAILY BRIEFING: When the user asks about their day/week/schedule overview, use get_schedule_summary. Use query_events for specific filtered searches.
11. SYNC: When the user says "sync everything" or "sync all," use sync_all_to_google. Use sync_to_google_calendar only when syncing specific events by ID.
12. UNDO: When the user says "undo", "revert", "put it back", or "never mind", use undo_last_action. It reverses the most recent change.
13. PROACTIVE: If the INSIGHTS section shows 3+ deadlines in the next 7 days, proactively mention this and offer to schedule study sessions. Mention unsynced events when relevant.
14. Be concise. Summarize actions clearly after they succeed. State the count, days, and date range.
15. FORMAT: Use markdown in responses. **Bold event titles**. Use bullet lists for multiple items. Format dates as "Day, Mon DD" (e.g. "Wed, Feb 25"). Format times as "H:MM AM/PM".`;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Chat service not configured" }),
      { status: 500 },
    );
  }

  const groqProvider = createGroq({ apiKey });
  const tools = createTools(userId);

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // Process any pending HITL confirmations
      const processedMessages = await processToolCalls(
        { messages, writer, tools },
        {
          delete_event: async ({ eventId, eventTitle, eventDate }) => {
            // Validate event exists and belongs to user
            const check = await validateEventId(eventId, userId);
            if (!check.ok) return { success: false, error: check.error };
            if (!canModifyEvent(check.event)) {
              return {
                success: false,
                error: "Cannot delete read-only Google Calendar events.",
              };
            }

            // Capture before state for undo
            const beforeState = {
              title: check.event.title,
              date: check.event.date,
              time: check.event.time,
              type: check.event.type,
              courseId: check.event.courseId,
              description: check.event.description,
            };

            const result = await deleteEvent(eventId);
            if (!result.ok) return { success: false, error: result.error };

            // Log for undo (fire-and-forget)
            logCommand({
              userId,
              type: "delete",
              description: `Deleted "${eventTitle}" on ${eventDate}`,
              eventId,
              beforeState,
              afterState: null,
            }).catch(() => {});

            return {
              success: true,
              affectedEventIds: [eventId],
              deletedTitle: eventTitle,
              deletedDate: eventDate,
            };
          },

          bulk_delete_events: async ({ eventIds, reason }) => {
            // Validate all event IDs
            const validations = await Promise.all(
              eventIds.map((id) => validateEventId(id, userId)),
            );

            const invalid = validations.filter((v) => !v.ok);
            if (invalid.length > 0) {
              return {
                success: false,
                error: `${invalid.length} event(s) not found or inaccessible`,
              };
            }

            // Check for read-only events
            const readOnly = validations.filter(
              (v) => v.ok && !canModifyEvent(v.event),
            );
            if (readOnly.length > 0) {
              return {
                success: false,
                error: `${readOnly.length} event(s) are read-only Google Calendar events and cannot be deleted`,
              };
            }

            // Capture before states for undo
            const validEvents = validations
              .filter((v): v is Extract<typeof v, { ok: true }> => v.ok)
              .map((v) => v.event);

            // Delete all events
            const results = await Promise.all(
              eventIds.map((id) => deleteEvent(id)),
            );
            const deleted = results.filter((r) => r.ok).length;
            const failed = results.filter((r) => !r.ok).length;

            if (deleted === 0) {
              return { success: false, error: "Failed to delete any events" };
            }

            // Log first event for undo (fire-and-forget)
            if (validEvents.length > 0) {
              const first = validEvents[0];
              logCommand({
                userId,
                type: "delete",
                description: `Bulk deleted ${deleted} events: ${reason}`,
                eventId: first.id,
                beforeState: {
                  title: first.title,
                  date: first.date,
                  time: first.time,
                  type: first.type,
                  courseId: first.courseId,
                  description: first.description,
                },
                afterState: null,
              }).catch(() => {});
            }

            return {
              success: true,
              affectedEventIds: eventIds,
              deletedCount: deleted,
              reason,
              ...(failed > 0 && { failedCount: failed }),
            };
          },
        },
      );

      const modelMessages = await convertToModelMessages(processedMessages);

      const result = streamText({
        model: groqProvider("llama-3.3-70b-versatile"),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(7),
        temperature: 0.3,
        maxOutputTokens: 4096,
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: processedMessages }),
      );

      // Suppress NoOutputGeneratedError — errors already propagate through the stream
      void Promise.resolve(result.response).catch(() => {});
    },
  });

  return createUIMessageStreamResponse({ stream });
}
