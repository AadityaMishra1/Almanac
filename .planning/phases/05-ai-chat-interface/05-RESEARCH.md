# Phase 5: AI Chat Interface - Research

**Researched:** 2026-02-02
**Domain:** AI-powered conversational interface with natural language command processing
**Confidence:** HIGH

## Summary

Building an AI chat interface for event modification requires integrating multiple specialized technologies: Vercel AI SDK for chat UI and streaming, Anthropic Claude API for natural language understanding with tool calling, chrono-node for parsing relative dates, and a command pattern for undo/redo functionality. The standard approach uses Server Actions for API endpoints, tool calling with structured outputs for command interpretation, and React's useOptimistic hook for responsive UI updates during async operations.

The research reveals that AI chat interfaces in 2026 have matured significantly with battle-tested patterns for streaming responses, tool calling, and confirmation flows. However, critical pitfalls remain around hallucination prevention (Air Canada's chatbot inventing policies), context window management (conversation history truncation), and safety controls (missing human escalation paths).

**Primary recommendation:** Use Vercel AI SDK with Claude Sonnet 4.5 via Anthropic SDK, implement tool calling for event operations with strict schema validation, use chrono-node for date parsing, and follow command pattern for undo functionality with database persistence.

## Standard Stack

The established libraries/tools for AI chat interfaces with Next.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | 6.x | Chat UI hooks, streaming, tool calling | Industry standard for Next.js AI apps, 20M+ monthly downloads, unified API across providers |
| @anthropic-ai/sdk | latest | Claude API integration | Official Anthropic SDK, native TypeScript support, streaming helpers, tool use with Zod |
| chrono-node | 2.9.0 | Natural language date parsing | Most widely adopted (534+ projects), supports "next Friday", "in 2 weeks", 6 languages |
| zod | 3.25.x | Schema validation for tools | Already in project, TypeScript-first, AI SDK native support for tool schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.x | Confirmation dialogs, overlays | Already in project, accessible by default, Portal support for floating UI |
| react-diff-view | latest | Before/after diff preview | Git-style diff visualization for showing event changes |
| date-fns | 4.1.0 | Date manipulation | Already in project, complements chrono for formatting and validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | LangChain.js | LangChain is heavier, more agent-focused; AI SDK is lighter, React-optimized |
| chrono-node | Sherlock.js | Sherlock focuses on event extraction; chrono is more flexible for general date parsing |
| Anthropic SDK | OpenAI SDK | OpenAI GPT-4 has shorter context window (32K vs 200K), Claude Sonnet 4.5 better at tool use |
| Server Actions | API Routes | API Routes needed for public APIs/webhooks; Server Actions simpler for internal chat logic |

**Installation:**
```bash
npm install ai @anthropic-ai/sdk chrono-node react-diff-view
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts          # Server Action for chat endpoint
├── components/
│   ├── chat/
│   │   ├── ChatWidget.tsx        # Floating widget container
│   │   ├── ChatMessages.tsx      # Message list with streaming
│   │   ├── ChatInput.tsx         # User input field
│   │   └── CommandConfirmation.tsx  # Diff preview + approve/reject
│   └── ui/
│       └── diff-view.tsx         # Before/after comparison
├── lib/
│   ├── ai/
│   │   ├── tools.ts              # Tool definitions (modifyEvent, deleteEvent, etc.)
│   │   ├── prompts.ts            # System prompts for Claude
│   │   └── date-parser.ts        # Chrono wrapper with custom refiners
│   ├── chat/
│   │   ├── history.ts            # Chat persistence logic
│   │   └── commands.ts           # Command pattern for undo/redo
│   └── events/
│       └── operations.ts         # Event CRUD operations (from Phase 4)
└── types/
    └── chat.ts                   # Chat message types, tool schemas
```

### Pattern 1: Tool-Based Command Interpretation
**What:** Define event operations as structured tools with Zod schemas, let Claude decide which tool(s) to call based on natural language input.

**When to use:** For event modification commands like "move exam to Friday", "delete all readings", "add club meeting Wednesdays 5-7pm".

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
import { tool } from 'ai';
import { z } from 'zod';
import * as chrono from 'chrono-node';

export const modifyEventTool = tool({
  description: 'Modify an existing Almanac event (title, date, time, or duration). Only modifies Almanac-created events, not external Google Calendar events.',
  inputSchema: z.object({
    eventIdentifier: z.string().describe('The event title or unique identifier'),
    newDate: z.string().optional().describe('New date in natural language (e.g., "next Friday", "March 15")'),
    newTime: z.string().optional().describe('New time in natural language (e.g., "3pm", "14:00")'),
    newTitle: z.string().optional().describe('New event title'),
    newDuration: z.number().optional().describe('New duration in minutes'),
  }),
  execute: async ({ eventIdentifier, newDate, newTime, newTitle, newDuration }) => {
    // Parse natural language dates
    const parsedDate = newDate ? chrono.parseDate(newDate, new Date()) : undefined;
    const parsedTime = newTime ? chrono.parseDate(newTime) : undefined;

    // Find event (Almanac-created only)
    const event = await findAlmanacEvent(eventIdentifier);
    if (!event) return { ok: false, error: 'Event not found or not editable' };

    // Build changes object for confirmation
    const changes = {
      before: { ...event },
      after: {
        ...event,
        ...(newTitle && { title: newTitle }),
        ...(parsedDate && { date: parsedDate }),
        ...(parsedTime && { startTime: parsedTime }),
        ...(newDuration && { duration: newDuration }),
      },
    };

    // Return proposed changes for user confirmation (don't execute yet)
    return { ok: true, requiresConfirmation: true, changes };
  },
});
```

### Pattern 2: Streaming Chat with useChat Hook
**What:** Use Vercel AI SDK's useChat hook to manage conversation state, streaming responses, and tool calling workflow.

**When to use:** For the main chat interface component.

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
'use client';

import { useChat } from 'ai/react';

export function ChatWidget() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onToolCall: async ({ toolCall }) => {
      // Handle tool calls that require confirmation
      if (toolCall.requiresConfirmation) {
        // Show confirmation dialog
        const approved = await showConfirmationDialog(toolCall.changes);
        return { approved };
      }
    },
  });

  return (
    <div className="chat-widget">
      <ChatMessages messages={messages} />
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
```

### Pattern 3: Server Action Chat Endpoint with Anthropic SDK
**What:** Use Next.js 15 Server Actions with Anthropic SDK for the chat API endpoint, integrating with Vercel AI SDK's streamText.

**When to use:** For the /api/chat route handler.

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/introduction and Anthropic SDK docs
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { modifyEventTool, deleteEventTool, createEventTool } from '@/lib/ai/tools';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    messages,
    tools: {
      modifyEvent: modifyEventTool,
      deleteEvent: deleteEventTool,
      createEvent: createEventTool,
    },
    toolChoice: 'auto',
    maxSteps: 5, // Allow multi-step tool calling
    system: `You are a helpful AI assistant for managing academic events in Almanac.

You have read-only access to the user's full Google Calendar for context, but you can ONLY modify Almanac-created events (events with source='almanac').

When interpreting commands:
- Parse dates flexibly: "next Friday", "in 2 weeks", "day after exam", "finals week"
- Ask clarifying questions if ambiguous: "Which exam - CSC 316 Midterm or DATA 220 Final?"
- For bulk operations, list all matches for confirmation
- Before modifying events, check for time conflicts and warn the user

Your personality:
- Helpful and informative: explain context and offer insights
- Concise: don't over-explain
- Proactive about conflicts: warn about schedule overlaps
- Clear about source: distinguish Almanac events from Google Calendar events`,
  });

  return result.toDataStreamResponse();
}
```

### Pattern 4: Command Pattern for Undo/Redo
**What:** Store each AI-initiated operation as a command object with execute/undo methods, persist to database for cross-session undo.

**When to use:** For implementing the history panel and revert functionality.

**Example:**
```typescript
// Source: https://dev.to/mustafamilyas/creating-undo-redo-system-using-command-pattern-in-react-mmg
interface Command {
  id: string;
  type: 'modify' | 'delete' | 'create';
  timestamp: Date;
  description: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

class ModifyEventCommand implements Command {
  constructor(
    public id: string,
    public type: 'modify',
    public timestamp: Date,
    public description: string,
    private eventId: string,
    private beforeState: Event,
    private afterState: Event
  ) {}

  async execute() {
    await updateEvent(this.eventId, this.afterState);
    await syncToGoogleCalendar(this.eventId);
  }

  async undo() {
    await updateEvent(this.eventId, this.beforeState);
    await syncToGoogleCalendar(this.eventId);
  }
}

// Store in database for persistence
async function executeCommand(command: Command) {
  await command.execute();
  await db.chatCommand.create({
    data: {
      id: command.id,
      type: command.type,
      description: command.description,
      beforeState: JSON.stringify(command.beforeState),
      afterState: JSON.stringify(command.afterState),
      timestamp: command.timestamp,
    },
  });
}
```

### Pattern 5: Optimistic Updates with useOptimistic
**What:** Use React 19's useOptimistic hook to show AI operations immediately in UI while async execution happens in background.

**When to use:** For responsive UX when user confirms event modifications.

**Example:**
```typescript
// Source: https://react.dev/reference/react/useOptimistic
'use client';

import { useOptimistic } from 'react';

export function EventList({ events }: { events: Event[] }) {
  const [optimisticEvents, addOptimisticEvent] = useOptimistic(
    events,
    (state, newEvent: Event) => [...state, newEvent]
  );

  async function handleAICommand(command: Command) {
    // Immediately show the change
    addOptimisticEvent(command.afterState);

    // Execute in background
    try {
      await executeCommand(command);
    } catch (error) {
      // UI automatically rolls back on error
      showError('Failed to execute command');
    }
  }

  return (
    <div>
      {optimisticEvents.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Naive context truncation:** Don't simply drop oldest messages when reaching token limits. Use summarization or priority-based truncation to preserve critical context.
- **Unvalidated tool execution:** Never execute AI tool calls without schema validation. Use Zod and Claude's `strict: true` mode to guarantee schema conformance.
- **Missing human escalation:** Don't let AI handle all errors autonomously. For safety-critical operations (bulk delete) or failed operations, escalate to user.
- **Storing messages as JSONB:** Don't use flexible JSONB columns for message persistence. Use dedicated typed columns for better data integrity and migrations.
- **Chatbot as gatekeeper:** Don't use chat as a barrier to functionality. Keep manual event editing available; chat is an alternative, not a replacement.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Natural language date parsing | Custom regex for "next Friday", "in 2 weeks" | chrono-node (2.9.0) | Handles 100+ date formats, timezones, locales, ambiguity resolution, and edge cases like "day after exam" with custom refiners |
| Chat UI state management | useState for messages, loading, errors | Vercel AI SDK useChat hook | Manages streaming, tool calling, optimistic updates, error recovery, abort controllers automatically |
| Tool schema validation | Manual parameter checking | Zod schemas with AI SDK tool() helper | Type-safe, runtime validated, auto-generates TypeScript types, integrates with Claude's strict mode |
| Diff visualization | Custom before/after table | react-diff-view or git-diff-view | Git-style diffs with syntax highlighting, split/unified views, handles complex nested changes |
| Conversation history truncation | Drop oldest N messages | Priority-based truncation with summarization | Preserves system prompts, recent context, and critical information while compressing old messages |
| Streaming responses | Manual SSE handling | Vercel AI SDK streamText + Anthropic SDK | Handles reconnection, backpressure, token counting, error recovery, and provider abstraction |
| Undo/redo | Array of state snapshots | Command pattern with database persistence | Scales better, enables cross-session undo, supports partial undo, clearer operation semantics |

**Key insight:** AI chat interfaces have complex state management (streaming, tool calling, confirmation flows, undo), mature libraries handle edge cases you won't anticipate (timezone ambiguity, context window overflow, stream interruption recovery).

## Common Pitfalls

### Pitfall 1: Hallucination and Policy Invention
**What goes wrong:** AI invents non-existent features, policies, or data. Air Canada's chatbot invented a bereavement refund policy, court ruled airline had to honor it.

**Why it happens:** LLMs generate plausible text based on training data patterns, not factual knowledge. Without strict tool calling and validation, they'll "make up" event details or capabilities.

**How to avoid:**
- Use structured outputs with `strict: true` for all tool calls to guarantee schema conformance
- Validate all tool inputs against actual database state before execution
- Return explicit error messages when events don't exist: "Event 'CSC 400 Exam' not found" not hallucinated details
- Use system prompts that explicitly state: "Only modify events that exist in the database. If an event is not found, say so clearly."

**Warning signs:** AI responses include specific details (times, dates, titles) not in database; AI confirms operations that failed; AI describes features not implemented.

### Pitfall 2: Context Window Overflow
**What goes wrong:** Long conversations exceed Claude's 200K token limit (1M beta for tier 4+), causing truncation errors or excessive costs (2x input pricing over 200K).

**Why it happens:** Each tool call adds tokens (tool definitions, tool_use blocks, tool_result blocks), and conversation history grows with each message. A 50-message conversation with tool calls can easily exceed 100K tokens.

**How to avoid:**
- Implement conversation summarization: periodically compress older messages while keeping last N turns intact
- Use priority-based truncation: preserve system prompt, current user message, and recent tool results; compress or drop older history
- Monitor token usage with Anthropic SDK's usage metrics: `message.usage.input_tokens + message.usage.output_tokens`
- Start fresh sessions strategically: "Each session starts with fresh conversation" (per user requirements)

**Warning signs:** Increasing latency as conversation grows; API errors about context length; token costs growing quadratically with conversation length.

### Pitfall 3: Missing Confirmation for Destructive Actions
**What goes wrong:** AI executes bulk deletions or irreversible changes without user review. Example: "delete all readings" removes 50 events without showing which ones.

**Why it happens:** Developers optimize for speed and implement direct tool execution without confirmation flows.

**How to avoid:**
- Implement `requiresConfirmation: true` flag in tool responses for any destructive operation
- Show detailed diff preview with checkboxes for bulk operations (per user requirements)
- Detect potential conflicts before execution: "Moving this creates a conflict with CSC 400 Lecture. Continue?"
- Use command pattern to make all operations undoable

**Warning signs:** Users can't preview changes before they happen; no way to cancel in-progress operations; complaints about unexpected modifications.

### Pitfall 4: Ambiguous Command Interpretation
**What goes wrong:** User says "move exam to Friday" but has 3 exams this week. AI either guesses wrong or moves the wrong event.

**Why it happens:** AI models prefer to act rather than ask clarifying questions, especially with Sonnet models (Opus is better at asking).

**How to avoid:**
- Use chain-of-thought prompting: "Before calling a tool, determine if all required parameters are provided or can be inferred. If not, ask the user."
- Implement fuzzy matching with confirmation: when multiple events match, return list for user selection
- Design tools to return multiple matches: `{ matches: [...], requiresSelection: true }`
- Follow user requirement: "Ask clarifying questions when command is unclear"

**Warning signs:** Users complain about wrong events being modified; AI modifies events without confirming which specific event; lack of clarifying questions in chat logs.

### Pitfall 5: No Human Escalation Path
**What goes wrong:** AI handles errors or edge cases autonomously without offering user control. Example: bulk operation fails halfway, AI retries automatically causing duplicate operations.

**Why it happens:** Overemphasis on automation, underestimating edge cases.

**How to avoid:**
- For safety-critical operations (bulk delete, exam rescheduling), always require human confirmation
- Implement stop() function to abort streaming responses: useChat provides this automatically
- Show error states with retry/cancel options, not automatic retry
- Escalate to manual editing for complex scenarios: "This operation is complex, would you like to edit manually?"

**Warning signs:** Users can't stop in-progress AI actions; error loops without user intervention; missing "cancel" buttons in confirmation flows.

### Pitfall 6: Inadequate Date Parsing Validation
**What goes wrong:** AI interprets "next Friday" as different date than user intended due to timezone issues or ambiguous reference dates.

**Why it happens:** Natural language date parsing is context-dependent. "Next Friday" at 11pm on Thursday night vs 1am on Friday morning gives different results.

**How to avoid:**
- Always show parsed date in confirmation: "Moving to Friday, March 15, 2026. Correct?"
- Use user's timezone (from Google Calendar settings) as reference for chrono parsing
- Validate parsed dates against academic calendar: flag dates during breaks or outside semester
- Add custom chrono refiners for domain-specific dates: "finals week" maps to defined date range

**Warning signs:** Users report wrong dates despite correct natural language input; timezone-related bugs; dates landing on weekends when user meant weekdays.

## Code Examples

Verified patterns from official sources:

### Chat Route with Tool Calling
```typescript
// Source: Anthropic SDK docs + Vercel AI SDK docs
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    messages,
    tools: {
      modifyEvent: tool({
        description: 'Modify an Almanac event',
        inputSchema: z.object({
          eventId: z.string(),
          changes: z.object({
            title: z.string().optional(),
            date: z.string().optional(),
          }),
        }),
        execute: async ({ eventId, changes }) => {
          // Check if event is editable (Almanac-created only)
          const event = await db.event.findUnique({
            where: { id: eventId },
          });

          if (!event || event.source !== 'almanac') {
            return { ok: false, error: 'Event not found or not editable' };
          }

          return { ok: true, requiresConfirmation: true, changes };
        },
      }),
    },
    maxSteps: 5, // Allow multi-step reasoning
  });

  return result.toDataStreamResponse();
}
```

### Natural Language Date Parsing with Chrono
```typescript
// Source: https://github.com/wanasit/chrono
import * as chrono from 'chrono-node';

export function parseUserDate(input: string, referenceDate: Date = new Date()): Date | null {
  // Use casual mode for flexible parsing
  const parsed = chrono.casual.parseDate(input, referenceDate);

  if (!parsed) return null;

  // Validate against academic calendar
  const semester = getCurrentSemester();
  if (parsed < semester.startDate || parsed > semester.endDate) {
    throw new Error(`Date falls outside current semester (${formatDate(semester.startDate)} - ${formatDate(semester.endDate)})`);
  }

  return parsed;
}

// Custom refiner for academic terms
export const academicDateRefiner = new chrono.Refiner({
  refine: (context, results) => {
    results.forEach((result) => {
      // Handle "finals week"
      if (context.text.toLowerCase().includes('finals week')) {
        const semester = getCurrentSemester();
        result.start.assign('day', semester.finalsWeek.start.getDate());
        result.start.assign('month', semester.finalsWeek.start.getMonth() + 1);
      }

      // Handle "day after [event]"
      const dayAfterMatch = context.text.match(/day after (.+)/i);
      if (dayAfterMatch) {
        const eventName = dayAfterMatch[1];
        const event = findEventByTitle(eventName);
        if (event) {
          const dayAfter = new Date(event.date);
          dayAfter.setDate(dayAfter.getDate() + 1);
          result.start.assign('day', dayAfter.getDate());
          result.start.assign('month', dayAfter.getMonth() + 1);
        }
      }
    });
    return results;
  },
});

const customChrono = chrono.casual.clone();
customChrono.refiners.push(academicDateRefiner);
```

### Confirmation Dialog with Diff Preview
```typescript
// Source: User requirements + Radix UI Dialog docs
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface ConfirmationDialogProps {
  operation: 'modify' | 'delete' | 'create';
  changes: {
    before?: Event;
    after?: Event;
    items?: Event[]; // For bulk operations
  };
  onConfirm: (selectedItems?: string[]) => void;
  onCancel: () => void;
}

export function CommandConfirmationDialog({ operation, changes, onConfirm, onCancel }: ConfirmationDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>(
    changes.items?.map(e => e.id) ?? [] // Pre-select all for bulk ops
  );

  // Detect conflicts
  const conflicts = detectTimeConflicts(changes.after ?? changes.items ?? []);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm {operation}</DialogTitle>
        </DialogHeader>

        {/* Single event: show diff */}
        {changes.before && changes.after && (
          <div className="diff-view">
            {Object.keys(changes.after).map(key => {
              const oldValue = changes.before[key];
              const newValue = changes.after[key];

              if (oldValue === newValue) return null;

              return (
                <div key={key} className="diff-row">
                  <span className="field-name">{key}:</span>
                  <span className="old-value">{formatValue(oldValue)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatValue(newValue)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk operation: show checkboxes */}
        {changes.items && (
          <div className="bulk-items">
            {changes.items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => {
                    setSelectedItems(prev =>
                      checked
                        ? [...prev, item.id]
                        : prev.filter(id => id !== item.id)
                    );
                  }}
                />
                <span>{item.title} - {formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conflict warnings */}
        {conflicts.length > 0 && (
          <div className="warning">
            <AlertIcon />
            <div>
              <p className="font-semibold">Conflicts detected:</p>
              {conflicts.map(c => (
                <p key={c.eventId}>
                  {c.message} (conflicts with {c.conflictingEvent.title})
                </p>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => onConfirm(changes.items ? selectedItems : undefined)}
            disabled={changes.items && selectedItems.length === 0}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Floating Chat Widget with Radix Dialog
```typescript
// Source: Radix UI Dialog docs + user requirements
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle } from 'lucide-react';

export function FloatingChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Collapsed state: floating button bottom-right */}
      <DialogTrigger asChild>
        <button
          className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
          aria-label="Open AI chat"
        >
          <MessageCircle className="w-6 h-6 mx-auto" />
        </button>
      </DialogTrigger>

      {/* Expanded state: ~80% screen space with backdrop blur */}
      <DialogContent
        className="max-w-2xl h-[80vh] p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()} // Prevent accidental close
      >
        <ChatInterface onClose={() => setOpen(false)} />
      </DialogContent>

      {/* Backdrop blur for calendar behind */}
      <style jsx global>{`
        [data-radix-dialog-overlay] {
          backdrop-filter: blur(4px);
        }
      `}</style>
    </Dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Routes for chat | Server Actions with streamText | Next.js 15 (2024) | Simpler code, no manual SSE handling, better streaming integration |
| OpenAI GPT-4 | Claude Sonnet 4.5 | Jan 2026 | 200K context (vs 32K), better tool use, lower cost per token |
| JSON mode for structured output | Strict tool use with Zod | Claude API 2025 | Guaranteed schema conformance, no more type mismatches |
| Client-side date parsing | chrono-node with custom refiners | Stable since 2020 | Handles 100+ formats, timezone-aware, extensible |
| Redux for undo/redo | Command pattern + useOptimistic | React 19 (2024) | Simpler state, optimistic UI, cross-session persistence |
| Snapshot-based undo | Command objects with execute/undo | Design pattern shift | Better memory usage, partial undo, clearer semantics |
| JSONB message storage | Typed columns with prefixes | Best practice 2025-2026 | Better data integrity, easier migrations, type safety |

**Deprecated/outdated:**
- **LangChain for simple chat:** Overly complex for single-agent chat interfaces, Vercel AI SDK is lighter and React-optimized
- **Manual SSE streaming:** Vercel AI SDK and Anthropic SDK handle this automatically with better error recovery
- **Context-free date parsing:** Must use reference dates and user timezone for accurate "next Friday" interpretation
- **Auto-retry on tool errors:** 2026 best practice is human confirmation for failed operations, not automatic retry

## Open Questions

Things that couldn't be fully resolved:

1. **Command chaining complexity**
   - What we know: User requirements mark this as "Claude's discretion"
   - What's unclear: Whether Claude Sonnet 4.5 reliably chains commands ("move exam to Friday and add 30 minutes") or if we should decompose to single operations
   - Recommendation: Start with single operations per confirmation, add chaining in iteration if Claude handles it reliably in testing

2. **Optimal context window management strategy**
   - What we know: Claude Sonnet 4.5 has 200K token limit (1M beta for tier 4+), conversations can overflow, summarization is recommended
   - What's unclear: Exact token budget allocation between system prompt, tools, conversation history, and tool results
   - Recommendation: Monitor token usage in production, implement summarization when conversation exceeds 150K tokens to stay under 200K limit and avoid 2x pricing

3. **"Finals week" and academic calendar date parsing**
   - What we know: Chrono supports custom refiners for domain-specific dates
   - What's unclear: How to make "finals week", "spring break", etc. work without hardcoding dates (academic calendar varies by semester)
   - Recommendation: Store academic calendar metadata in database (from STATE.md: "Academic calendar dates defined for Spring 2026 and Fall 2025"), create chrono refiner that queries this data

4. **Conflict detection scope**
   - What we know: Phase 4 implements conflict detection for Almanac events, user wants AI to warn about conflicts
   - What's unclear: Should AI check conflicts against all Google Calendar events or only Almanac events?
   - Recommendation: Check against all events (including Google Calendar) for warnings, but only prevent modifications to Almanac events (per read-only requirement for external events)

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - Core features, useChat hook, tool calling
- [Vercel AI SDK Chatbot Guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - useChat implementation patterns
- [Vercel AI SDK Tools and Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) - Tool definition with Zod, execute patterns
- [Anthropic TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - Installation, streaming, tool use
- [Claude API Tool Use Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) - Tool workflow, best practices, pricing
- [Chrono GitHub Repository](https://github.com/wanasit/chrono) - Natural language date parsing, examples, customization
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) - Official React 19 documentation
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) - Accessible dialog component

### Secondary (MEDIUM confidence)
- [Vercel AI SDK Complete Guide (DEV, Jan 2026)](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6) - Production patterns verified with official docs
- [Next.js Server Actions Complete Guide (DEV, 2026)](https://dev.to/marufrahmanlive/nextjs-server-actions-complete-guide-with-examples-for-2026-2do0) - Server Actions vs API Routes
- [AI SDK UI Error Handling](https://ai-sdk.dev/docs/ai-sdk-ui/error-handling) - Error states and retry patterns
- [Creating Undo-Redo System Using Command Pattern in React (DEV)](https://dev.to/mustafamilyas/creating-undo-redo-system-using-command-pattern-in-react-mmg) - Command pattern implementation
- [Context Window Management Strategies (Maxim AI, 2026)](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots) - Truncation and summarization
- [Claude API Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) - Token limits by model
- [Mastering Chat History & State in Next.js (DEV, 2026)](https://dev.to/programmingcentral/mastering-chat-history-state-in-nextjs-the-ultimate-guide-to-building-persistent-ai-apps-maf) - Persistence patterns

### Tertiary (LOW confidence - flagged for validation)
- [10+ Epic LLM Chatbot Failures (AIM Multiple, 2026)](https://research.aimultiple.com/chatbot-fail/) - Real-world failure cases (Air Canada, Chevy dealer)
- [7 Chatbot Error Handling Strategies (Quidget)](https://quidget.ai/blog/ai-automation/7-chatbot-error-handling-strategies-for-better-ux/) - UX patterns for errors
- [Patterns for Accessible Webchats (UK Gov, 2016)](https://accessibility.blog.gov.uk/2016/12/09/patterns-for-accessible-webchats/) - ARIA patterns for chat
- [React diff-view npm](https://www.npmjs.com/package/react-diff-view) - Diff visualization library

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs and npm registry, versions confirmed, widespread adoption
- Architecture: HIGH - Patterns from official Vercel AI SDK and Anthropic docs, tested examples in repositories
- Pitfalls: MEDIUM - Real-world failures documented (Air Canada case verified), but some UX patterns from blog posts not official sources
- Date parsing: HIGH - Chrono extensively documented, version confirmed, API verified
- Tool calling: HIGH - Official Anthropic and Vercel AI SDK documentation
- Context management: MEDIUM - Strategies from blog posts, need production validation

**Research date:** 2026-02-02
**Valid until:** 30 days (AI SDK and Claude API are stable; revalidate before implementation for API changes)
