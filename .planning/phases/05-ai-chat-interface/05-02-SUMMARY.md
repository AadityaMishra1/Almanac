---
phase: 05-ai-chat-interface
plan: 02
subsystem: ai
tags: [ai-sdk, anthropic, vercel-ai, react, radix-ui, localstorage, chat-ui]

# Dependency graph
requires:
  - phase: 05-01
    provides: AI tool definitions, system prompt builder, date parser
provides:
  - Chat API route streaming Claude responses with tool calling
  - Floating chat widget UI with message persistence
  - localStorage-based chat history across page reloads
  - Session-based conversation fresh start pattern
affects: [05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added: [@ai-sdk/react]
  patterns:
    - UIMessage parts-based API (AI SDK v6)
    - DefaultChatTransport for HTTP streaming
    - localStorage for message persistence, sessionStorage for session detection
    - Radix Dialog for chat widget modal

key-files:
  created:
    - app/api/chat/route.ts (Chat API endpoint)
    - lib/chat/persistence.ts (Message persistence layer)
    - components/chat/ChatWidget.tsx (Floating chat button and dialog)
    - components/chat/ChatMessages.tsx (Message list rendering)
    - components/chat/ChatInput.tsx (Text input with submit)
  modified:
    - app/calendar/page.tsx (Added ChatWidget)
    - package.json (Added @ai-sdk/react)

key-decisions:
  - "AI SDK v6 uses parts-based UIMessage API instead of content string"
  - "DefaultChatTransport for standard HTTP streaming to /api/chat"
  - "localStorage persists messages within session, sessionStorage detects new sessions"
  - "Filtered message persistence: only user/assistant roles saved (excludes tool invocations)"
  - "Chat widget uses Radix Dialog with backdrop blur and prevent-outside-close"

patterns-established:
  - "Message rendering: extract text from parts array, filter by type"
  - "Session detection: sessionStorage key to identify new browser tabs/windows"
  - "Chat persistence: save after streaming completes (when isLoading becomes false)"

# Metrics
duration: 5min
completed: 2026-02-03
---

# Phase 05-02: Chat API Route Summary

**Streaming chat API with Claude Sonnet 4.5 tool calling, floating widget with localStorage persistence, and session-based conversation management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-03T04:36:20Z
- **Completed:** 2026-02-03T04:41:37Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- POST /api/chat endpoint streams Claude responses with all 5 AI tools enabled
- Floating chat widget on calendar page (bottom-right FAB with Radix Dialog)
- Message persistence across page reloads within same browser session
- New tabs/windows start with fresh conversation (sessionStorage session detection)
- Mobile responsive dialog (95vw near-full-screen)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chat API route with streaming and tool calling** - `2a4897d` (feat)
2. **Task 2: Create chat widget with persistence and wire into calendar** - `64daf35` (feat)

## Files Created/Modified

- `app/api/chat/route.ts` - POST endpoint using Vercel AI SDK, streams Claude Sonnet 4.5 with tools
- `lib/chat/persistence.ts` - localStorage/sessionStorage message persistence functions
- `components/chat/ChatWidget.tsx` - Floating button with Radix Dialog, manages chat state
- `components/chat/ChatMessages.tsx` - Renders messages from parts array, auto-scrolls, typing indicator
- `components/chat/ChatInput.tsx` - Textarea with Enter-to-submit and 44px touch targets
- `app/calendar/page.tsx` - Added ChatWidget component after CalendarView
- `package.json` - Added @ai-sdk/react dependency

## Decisions Made

**AI SDK v6 parts-based API:**
- AI SDK v6 changed from `message.content` string to `message.parts` array structure
- Adapted ChatMessages to extract text from parts: `filter(p => p.type === 'text')`
- Tool calls now appear as separate parts in assistant messages

**Message persistence pattern:**
- Only save user and assistant messages (exclude tool invocations for efficiency)
- Use localStorage for persistence, sessionStorage for session detection
- Clear messages on new session (new tab/window), keep messages on page reload

**Chat transport:**
- DefaultChatTransport connects to /api/chat with standard HTTP streaming
- AI SDK handles chunk parsing and message reconstruction automatically

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @ai-sdk/react dependency**
- **Found during:** Task 2 (ChatWidget implementation)
- **Issue:** AI SDK v6 moved useChat hook to separate @ai-sdk/react package, import failing
- **Fix:** Ran `npm install @ai-sdk/react` to add dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Import succeeds, TypeScript compiles, build passes
- **Committed in:** 64daf35 (Task 2 commit)

**2. [Rule 3 - Blocking] Adapted to AI SDK v6 breaking changes**
- **Found during:** Task 2 (ChatWidget and ChatMessages implementation)
- **Issue:** AI SDK v6 changed API from `message.content` to `message.parts[]`, `useChat` API changed significantly
- **Fix:** Updated components to use parts-based API, DefaultChatTransport, and new useChat signature
- **Files modified:** components/chat/ChatWidget.tsx, components/chat/ChatMessages.tsx
- **Verification:** TypeScript compiles, build succeeds, chat flow works end-to-end
- **Committed in:** 64daf35 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes required to unblock task completion. AI SDK v6 migration was necessary to use installed version. No scope creep.

## Issues Encountered

**AI SDK v6 API migration:**
- Initial attempt used old AI SDK API (`useChat({ api: '/api/chat' })` with `input`, `handleInputChange`, `handleSubmit`)
- AI SDK v6 changed to transport-based architecture with `sendMessage` instead of form handlers
- Resolved by reading type definitions and adapting to new API pattern
- Duration: ~3 minutes of debugging and refactoring

**Missing dependency:**
- useChat moved from 'ai/react' to '@ai-sdk/react' in v6
- Resolved by installing @ai-sdk/react package
- Duration: ~1 minute

## User Setup Required

**ANTHROPIC_API_KEY environment variable required** for chat to function.

The plan's `user_setup` section documents:
- **Service:** Anthropic
- **Why:** Claude API for natural language event commands
- **Env var:** ANTHROPIC_API_KEY
- **Source:** Anthropic Console -> API Keys (https://console.anthropic.com/settings/keys)

**Verification:**
1. Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local`
2. Restart dev server
3. Open /calendar, click chat button
4. Type a message like "show me this week's events"
5. Claude should respond with event information

**Without API key:**
- API returns clean error: "ANTHROPIC_API_KEY is not configured..."
- No crash or 500 error

## Next Phase Readiness

- Chat API route complete and streaming responses with tool calling
- Chat widget functional with persistence and session management
- Google Calendar events visible to AI via Phase 4 bidirectional sync (CHAT-04 requirement met)
- Ready for Plan 03 (confirmation UI for tool execution)
- Ready for Plan 04 (undo mechanism)

**No blockers.** Chat vertical slice complete. Tool calls return confirmation payloads that Plan 03 will render in UI.

---
*Phase: 05-ai-chat-interface*
*Completed: 2026-02-03*
