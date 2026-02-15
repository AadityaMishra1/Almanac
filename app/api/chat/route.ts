import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEvent, deleteEvent, updateEvent } from "@/app/server-actions/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface GroqChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
}

const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "create_event",
      description:
        "Create a new calendar event (assignment, exam, quiz, reading, etc.) for a course. Use when the user asks to add, create, or schedule an event.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title/name of the event",
          },
          date: {
            type: "string",
            description: "The date of the event in YYYY-MM-DD format",
          },
          time: {
            type: "string",
            description:
              "Optional time in HH:MM 24-hour format (e.g. 14:30). Omit for all-day events.",
          },
          type: {
            type: "string",
            description: "The type of event",
            enum: ["exam", "assignment", "quiz", "reading", "lecture", "lab", "project", "other"],
          },
          courseId: {
            type: "string",
            description: "The UUID of the course this event belongs to",
          },
          description: {
            type: "string",
            description: "Optional description or notes for the event",
          },
        },
        required: ["title", "date", "type", "courseId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_event",
      description:
        "Delete a calendar event. Only use after the user has confirmed they want to delete. Cannot delete read-only Google Calendar events.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The UUID of the event to delete",
          },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_event",
      description:
        "Reschedule an existing event to a new date and/or time. Cannot modify read-only Google Calendar events.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The UUID of the event to reschedule",
          },
          newDate: {
            type: "string",
            description: "The new date in YYYY-MM-DD format",
          },
          newTime: {
            type: "string",
            description:
              "Optional new time in HH:MM 24-hour format. Omit to keep existing time or leave as all-day.",
          },
        },
        required: ["eventId", "newDate"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sync_to_google_calendar",
      description:
        "Sync one or more events to the user's Google Calendar. Use when the user asks to sync, export, or push events to Google Calendar.",
      parameters: {
        type: "object",
        properties: {
          eventIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of event UUIDs to sync to Google Calendar",
          },
        },
        required: ["eventIds"],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: unknown }> {
  switch (toolName) {
    case "create_event": {
      const result = await createEvent({
        title: args.title as string,
        date: args.date as string,
        time: (args.time as string) || null,
        type: args.type as string,
        courseId: args.courseId as string,
        description: (args.description as string) || "",
        source: "ALMANAC",
        googleEventId: null,
      });
      return { success: result.ok, result };
    }

    case "delete_event": {
      const result = await deleteEvent(args.eventId as string);
      return { success: result.ok, result };
    }

    case "reschedule_event": {
      const updates: { date: string; time?: string | null } = {
        date: args.newDate as string,
      };
      if (args.newTime !== undefined) {
        updates.time = args.newTime as string;
      }
      const result = await updateEvent(args.eventId as string, updates);
      return { success: result.ok, result };
    }

    case "sync_to_google_calendar": {
      const result = await syncEventsToCalendar(args.eventIds as string[]);
      return { success: result.ok, result };
    }

    default:
      return { success: false, result: { error: `Unknown tool: ${toolName}` } };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const messages: ChatMessage[] = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const [events, courses] = await Promise.all([
    prisma.event.findMany({
      where: { userId: session.user.id },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 50,
    }),
    prisma.course.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  const scheduleContext = events
    .map(
      (e) =>
        `- [id:${e.id}] "${e.title}" (${e.type}) on ${e.date}${e.time ? " at " + e.time : ""} for ${e.course.name} (${e.course.code})${e.source === "GOOGLE_CALENDAR" ? " [read-only, synced from Google]" : ""}`
    )
    .join("\n");

  const coursesContext = courses
    .map((c) => `- [id:${c.id}] ${c.code} - ${c.name} (${c.semester})`)
    .join("\n");

  const systemPrompt = `You are Almanac, a helpful AI assistant for a college student's academic calendar. You can view and manage their schedule using tools.

Their courses:
${coursesContext || "No courses yet."}

Their upcoming events:
${scheduleContext || "No events yet."}

Today's date is ${new Date().toISOString().split("T")[0]}.

INSTRUCTIONS:
- When the user wants to create, delete, reschedule, or sync events, use the appropriate tool.
- For creating events, resolve relative dates (e.g. "tomorrow", "next Monday") to YYYY-MM-DD format based on today's date.
- For creating events, you MUST use one of the course IDs listed above. If the user mentions a course, match it to the closest course name/code. If ambiguous, ask which course.
- For deleting events, ask the user to confirm BEFORE calling the delete tool. Only call delete_event after they confirm.
- For rescheduling, use the event ID from the list above. If the user references an event by name, match it to the correct ID.
- Events marked [read-only, synced from Google] cannot be modified or deleted.
- Be concise and friendly. Reference their actual schedule data when answering questions.
- When you successfully perform an action, summarize what was done clearly.`;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat service not configured" },
      { status: 500 }
    );
  }

  const model = process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile";

  // First Groq call with tool definitions
  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20),
        ],
        tools: toolDefinitions,
        tool_choice: "auto",
      }),
    }
  );

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Chat failed: ${text}` },
      { status: 500 }
    );
  }

  const data = await groqRes.json();
  const choice: GroqChoice = data.choices?.[0];

  if (!choice) {
    return NextResponse.json(
      { message: "I'm sorry, I couldn't generate a response.", actionsPerformed: false }
    );
  }

  const assistantMessage = choice.message;
  const toolCalls = assistantMessage.tool_calls;

  // No tool calls — return the plain text response
  if (!toolCalls || toolCalls.length === 0) {
    return NextResponse.json({
      message: assistantMessage.content ?? "I'm sorry, I couldn't generate a response.",
      actionsPerformed: false,
    });
  }

  // Execute tool calls and collect results
  const toolResults: ChatMessage[] = [];
  let anyToolExecuted = false;

  for (const toolCall of toolCalls) {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: "Invalid tool arguments" }),
      });
      continue;
    }

    const { success, result } = await executeToolCall(toolCall.function.name, args);
    anyToolExecuted = anyToolExecuted || success;

    toolResults.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  // Second Groq call with tool results to get the final summary
  const followUpMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20),
    {
      role: "assistant" as const,
      content: assistantMessage.content ?? "",
      tool_calls: toolCalls,
    },
    ...toolResults,
  ];

  const summaryRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1024,
        messages: followUpMessages,
      }),
    }
  );

  if (!summaryRes.ok) {
    // Tool calls were executed but summary failed — still report success
    const toolNames = toolCalls.map((tc) => tc.function.name).join(", ");
    return NextResponse.json({
      message: `I performed the requested action(s) (${toolNames}), but had trouble generating a summary. Please check your calendar for the changes.`,
      actionsPerformed: anyToolExecuted,
    });
  }

  const summaryData = await summaryRes.json();
  const summaryMessage =
    summaryData.choices?.[0]?.message?.content ??
    "The action was completed, but I couldn't generate a summary.";

  return NextResponse.json({
    message: summaryMessage,
    actionsPerformed: anyToolExecuted,
  });
}
