import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import {
  modifyEventTool,
  deleteEventTool,
  createEventTool,
  queryEventsTool,
  bulkDeleteTool,
} from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { prisma } from '@/lib/db';
import { EventSnapshot } from '@/types/chat';

export async function POST(req: Request) {
  try {
    // Validate API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { messages } = await req.json();

    // Fetch current events and courses for context injection
    const [events, courses] = await Promise.all([
      prisma.event.findMany({
        include: { course: true },
        orderBy: { date: 'asc' },
      }),
      prisma.course.findMany(),
    ]);

    // Convert events to EventSnapshot format for system prompt
    const eventSnapshots: EventSnapshot[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      type: event.type,
      courseName: event.course.name,
    }));

    // Build system prompt with current context
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const systemPrompt = buildSystemPrompt({
      events: eventSnapshots,
      courses: courses.map((c) => ({ code: c.code, name: c.name })),
      currentDate,
    });

    // Create Anthropic client
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Stream text with tools
    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      messages,
      tools: {
        modifyEventTool,
        deleteEventTool,
        createEventTool,
        queryEventsTool,
        bulkDeleteTool,
      },
      toolChoice: 'auto',
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
