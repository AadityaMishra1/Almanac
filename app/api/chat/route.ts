import { createGroq } from '@ai-sdk/groq';
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
    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'GROQ_API_KEY is not configured. Please add it to your environment variables.',
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

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No valid messages found. Please send a message to the AI assistant.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Chat API] Processing request with', messages.length, 'messages');

    // Fetch current events and courses for context injection
    const [events, courses] = await Promise.all([
      prisma.event.findMany({
        include: { course: true },
        orderBy: { date: 'asc' },
      }),
      prisma.course.findMany(),
    ]);

    console.log('[Chat API] Context:', events.length, 'events,', courses.length, 'courses');

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

    // Create Groq client
    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Use model from env or default to llama-3.3-70b-versatile (best for tool calling)
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    console.log('[Chat API] Using Groq model:', modelName);

    // Stream text with tools - Groq configuration optimized for tool calling
    const result = streamText({
      model: groq(modelName),
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
      maxTokens: 4096, // Ensure enough tokens for tool calls
      temperature: 0.1, // Low temperature for more consistent tool calling
      // Add error handling for streaming errors
      onError: (error) => {
        console.error('[Chat API] Streaming error:', error);
      },
      onFinish: ({ usage }) => {
        console.log('[Chat API] Stream completed. Tokens:', usage);
      },
    });

    // Convert to UI message stream response (includes tool calls and results)
    return result.toUIMessageStreamResponse({
      headers: {
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

    // Extract meaningful error message
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common Groq API errors
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid API Key')) {
        errorMessage = 'Groq API key is invalid. Please check your GROQ_API_KEY in .env.local';
        statusCode = 401;
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('Rate Limit')) {
        errorMessage = 'Groq rate limit exceeded. Free tier: 1,000 requests/day. Please wait or upgrade your account.';
        statusCode = 429;
      } else if (errorMessage.includes('402') || errorMessage.includes('balance') || errorMessage.includes('Insufficient')) {
        errorMessage = 'Groq account has insufficient credits. Please top up your account.';
        statusCode = 402;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Groq API is not responding. Please check your internet connection or try again later.';
        statusCode = 504;
      } else if (errorMessage.includes('Failed to call a function') || errorMessage.includes('invalid_request_error')) {
        errorMessage = `Tool calling failed: ${errorMessage}. This might be a model issue. Try using a different Groq model or check if your GROQ_API_KEY is valid.`;
        statusCode = 500;
      }
    }

    console.error('[Chat API] Returning error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
