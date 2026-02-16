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
import type { HumanInTheLoopUIMessage } from "./types";
import { format, addDays, addMonths } from "date-fns";

export const maxDuration = 30;

/**
 * Build a 14-day lookup table mapping dates to day-of-week names.
 * Injected into the system prompt so the LLM doesn't have to calculate dates.
 */
function buildDateLookupTable(): string {
  const today = new Date();
  const lines: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    const label = i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : "";
    lines.push(
      `  ${format(d, "EEE")} ${format(d, "yyyy-MM-dd")}${label}`
    );
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

  // Fetch user context
  const [events, courses] = await Promise.all([
    prisma.event.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 50,
    }),
    prisma.course.findMany({
      where: { userId },
    }),
  ]);

  const scheduleContext = events
    .map((e) => {
      const dateObj = new Date(e.date + "T00:00:00");
      const dow = format(dateObj, "EEE");
      return `- [id:${e.id}] "${e.title}" (${e.type}) on ${dow} ${e.date}${e.time ? " at " + e.time : ""}${e.course ? ` for ${e.course.name} (${e.course.code})` : ""}${e.source === "GOOGLE_CALENDAR" ? " [read-only, synced from Google]" : ""}`;
    })
    .join("\n");

  const coursesContext = courses
    .map((c) => `- [id:${c.id}] ${c.code} - ${c.name} (${c.semester})`)
    .join("\n");

  const now = new Date();
  const dateLookup = buildDateLookupTable();

  // Derive semester end date from courses or use a sensible default
  const semesters = courses.map((c) => c.semester.toLowerCase());
  let semesterEndDate: string;
  const year = now.getFullYear();
  if (semesters.some((s) => s.includes("spring"))) {
    semesterEndDate = `${year}-05-15`;
  } else if (semesters.some((s) => s.includes("fall"))) {
    semesterEndDate = `${year}-12-15`;
  } else if (semesters.some((s) => s.includes("summer"))) {
    semesterEndDate = `${year}-08-15`;
  } else {
    // Default: 3 months from now
    semesterEndDate = format(addMonths(now, 3), "yyyy-MM-dd");
  }

  const systemPrompt = `You are Greg, a sharp and proactive AI executive assistant for a college student's academic calendar. You manage their schedule like a real secretary — anticipate needs, handle logistics, and never make them repeat themselves.

DATE REFERENCE (next 14 days):
${dateLookup}

SEMESTER: Ends approximately ${semesterEndDate}.

Their courses:
${coursesContext || "No courses yet."}

Their upcoming events:
${scheduleContext || "No events yet."}

Today is ${format(now, "EEEE")}, ${format(now, "yyyy-MM-dd")}.

RULES:
1. SINGLE-EVENT DATES: Use the 14-day lookup table to resolve relative dates ("next Tuesday", "tomorrow"). Match day-of-week to the correct YYYY-MM-DD. For dates beyond 14 days, you may calculate them (today's date is given above).
2. RECURRING EVENTS: For ANY request involving repeated days — "block out Tuesdays", "every MWF", "weekly research time", "reserve Thursdays" — ALWAYS use create_recurring_events with the daysOfWeek array. Use today as startDate. If no end date is given, use the semester end date (${semesterEndDate}). NEVER create individual events one by one for recurring patterns.
3. BLOCKING TIME: When the user says "block out", "reserve", "set aside", or "keep free" certain days/times, treat this as a recurring event request. Ask for the time range if not specified (e.g. "What hours should I block — all day, or a specific window like 9 AM – 12 PM?").
4. EVENT IDs: Only use event IDs from the "upcoming events" list above. NEVER fabricate or guess an event ID. If the user references an event by name, find the matching ID from the list. If no match exists, tell the user.
5. READ-ONLY EVENTS: Events marked [read-only, synced from Google] cannot be modified or deleted.
6. COURSES: When the user mentions a course, match it to the closest course name/code and use its courseId. If no course matches or it's a generic event, omit courseId.
7. QUERIES: For questions like "what's due this week?" or "show my exams", use query_events. Do NOT answer from the context list alone — use the tool for accurate, filtered results.
8. BULK DELETES: For "delete all CSC 316 assignments", first use query_events to find matching event IDs, then use bulk_delete_events.
9. Be concise. Summarize actions clearly after they succeed. State the count, days, and date range.
10. FORMAT: Use markdown in responses. **Bold event titles**. Use bullet lists for multiple items. Format dates as "Day, Mon DD" (e.g. "Wed, Feb 25"). Format times as "H:MM AM/PM".`;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Chat service not configured" }),
      { status: 500 }
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

            const result = await deleteEvent(eventId);
            if (!result.ok) return { success: false, error: result.error };

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
              eventIds.map((id) => validateEventId(id, userId))
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
              (v) => v.ok && !canModifyEvent(v.event)
            );
            if (readOnly.length > 0) {
              return {
                success: false,
                error: `${readOnly.length} event(s) are read-only Google Calendar events and cannot be deleted`,
              };
            }

            // Delete all events
            const results = await Promise.all(
              eventIds.map((id) => deleteEvent(id))
            );
            const deleted = results.filter((r) => r.ok).length;
            const failed = results.filter((r) => !r.ok).length;

            if (deleted === 0) {
              return { success: false, error: "Failed to delete any events" };
            }

            return {
              success: true,
              affectedEventIds: eventIds,
              deletedCount: deleted,
              reason,
              ...(failed > 0 && { failedCount: failed }),
            };
          },
        }
      );

      const modelMessages = await convertToModelMessages(processedMessages);

      const result = streamText({
        model: groqProvider("llama-3.3-70b-versatile"),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(5),
        temperature: 0.3,
        maxOutputTokens: 4096,
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: processedMessages })
      );

      // Suppress NoOutputGeneratedError — errors already propagate through the stream
      void Promise.resolve(result.response).catch(() => {});
    },
  });

  return createUIMessageStreamResponse({ stream });
}
