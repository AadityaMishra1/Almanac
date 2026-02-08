---
phase: 05-ai-chat-interface
plan: 01
subsystem: ai
tags: [ai-sdk, anthropic, zod, chrono-node, date-parsing, tool-definitions]

# Dependency graph
requires:
  - phase: 04-event-management-sync
    provides: Event CRUD operations, conflict detection, database schema with EventSource
provides:
  - AI tool definitions for event CRUD with Zod validation
  - System prompt builder with personality and safety rules
  - Natural language date parser with academic calendar support
  - Shared TypeScript types for chat system (ChatMessage, ConfirmationPayload, etc.)
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: [ai (Vercel AI SDK), @ai-sdk/anthropic, chrono-node]
  patterns:
    - Tool definitions return confirmation payloads (not direct mutations)
    - Errors thrown (not returned) for AI SDK error handling
    - Source-based permission checks (ALMANAC vs GOOGLE_CALENDAR)

key-files:
  created:
    - types/chat.ts (Chat type system)
    - lib/ai/tools.ts (AI tool definitions)
    - lib/ai/prompts.ts (System prompt builder)
    - lib/ai/date-parser.ts (Natural language date parsing)

key-decisions:
  - "Tools return ConfirmationPayload for destructive operations, requiring UI confirmation before execution"
  - "Tools use prisma directly (not server actions) since they run in API route context"
  - "Errors thrown instead of discriminated unions for AI SDK compatibility"
  - "Date parser preprocesses academic terms (finals week, spring break) before chrono parsing"
  - "Conflict detection integrated into tools (not delegated to UI)"

patterns-established:
  - "Tool pattern: validate → build snapshot → check conflicts → return payload"
  - "Source permission check: throw if event.source !== EventSource.ALMANAC"
  - "Date parsing: mapAcademicTerms → chrono.parse → validate"

# Metrics
duration: 11min
completed: 2026-02-03
---

# Phase 05-01: AI Foundation Layer Summary

**AI tool definitions with Zod schemas wrapping event CRUD, system prompt encoding personality and safety rules, and chrono-node date parser with academic calendar refiners**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-03T04:20:54Z
- **Completed:** 2026-02-03T04:31:54Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Five AI tools (modify, delete, create, query, bulk-delete) with Zod validation
- System prompt builder dynamically injecting events, courses, and date context
- Natural language date parser supporting "next Friday", "finals week", "spring break"
- Shared TypeScript types for chat messages, confirmations, and command history

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create chat types** - `92ebd50` (feat)
2. **Task 2: Create AI tool definitions, system prompt, and date parser** - `c56f534` (feat)

## Files Created/Modified

- `package.json` - Added ai, @ai-sdk/anthropic, chrono-node dependencies
- `types/chat.ts` - ChatMessage, ToolResult, ConfirmationPayload, EventSnapshot, ConflictWarning, CommandRecord types
- `lib/ai/tools.ts` - Five tool definitions with Zod schemas, conflict detection, source permission checks
- `lib/ai/prompts.ts` - System prompt builder with personality, safety rules, and dynamic context
- `lib/ai/date-parser.ts` - Chrono-node wrapper with academic calendar term mapping (finals week, spring break)

## Decisions Made

**Tool return type pattern:**
- Tools return confirmation payloads directly (not wrapped in `{ ok, data }` objects)
- Errors are thrown (not returned) for AI SDK compatibility
- Rationale: AI SDK `tool()` function expects OUTPUT type directly, handles errors via exceptions

**Database access pattern:**
- Tools import `prisma` from `@/lib/db` directly (not server actions)
- Rationale: Server actions have `"use server"` directive and can't be called from API routes

**Academic term handling:**
- Preprocess "finals week" and "spring break" to concrete dates before chrono parsing
- Rationale: Simpler than custom chrono refiners, more maintainable

**Conflict detection location:**
- Tools check for conflicts and include warnings in confirmation payload
- Rationale: Centralizes conflict logic, ensures AI has context for explanations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript compilation errors with tool() function:**
- **Issue:** Initial approach used `parameters` instead of `inputSchema`, and destructured input parameters lost type inference
- **Resolution:** Changed to `inputSchema` property, added explicit generic type parameters to `tool<INPUT, OUTPUT>()`, removed parameter destructuring
- **Duration:** ~5 minutes of debugging and fixing across all 5 tools

## Next Phase Readiness

- Tool foundation complete and type-safe
- System prompt ready for dynamic context injection
- Date parser tested with academic calendar dates
- Ready for Plan 02 (chat API route implementation)

**No blockers.** All tools compile, return correct types, and enforce safety rules.

---
*Phase: 05-ai-chat-interface*
*Completed: 2026-02-03*
