import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, CoreMessage } from 'ai';
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

/**
 * Transform UI messages (with parts array) to CoreMessages (with content string)
 * that the AI SDK expects.
 */
function transformMessages(messages: any[]): CoreMessage[] {
  return messages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => {
      // Extract text content from parts array if present
      let content = '';
      if (msg.parts && Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('');
      } else if (typeof msg.content === 'string') {
        content = msg.content;
      }

      return {
        role: msg.role as 'user' | 'assistant',
        content,
      };
    })
    .filter((msg) => msg.content.trim() !== '');
}

export async function POST(req: Request) {
  try {
    // Validate API key exists
    if (!process.env.DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'DEEPSEEK_API_KEY is not configured. Please add it to your environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { messages: rawMessages } = await req.json();

    // Transform messages from UI format (parts array) to CoreMessage format (content string)
    const messages = transformMessages(rawMessages);

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

    // Create DeepSeek client
    const deepseek = createOpenAICompatible({
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });

    // Stream text with tools
    const result = streamText({
      model: deepseek('deepseek-chat'),
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
