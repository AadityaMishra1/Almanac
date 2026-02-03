# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

**Current focus:** Phase 5 - AI Chat Interface (IN PROGRESS)

## Current Position

Phase: 5 of 5 (AI Chat Interface)
Plan: 1 of 5 in phase (05-01 complete)
Status: In progress - AI foundation layer complete, ready for chat API route
Last activity: 2026-02-03 — Completed 05-01-PLAN.md (AI Foundation Layer)

Progress: [█████████░] 80% (16/20 plans complete, 4/5 phases overall)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 28 minutes
- Total execution time: 7.8 hours (449 minutes)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 33min | 8min |
| 02-enhanced-pdf-extraction | 5/5 | 50min | 10min |
| 03-calendar-ui | 3/3 | 36min | 12min |
| 04-event-management-sync | 3/3 | 306min | 102min |
| 05-ai-chat-interface | 1/5 | 11min | 11min |

**Recent Trend:**
- Last 5 plans: 04-01 (4min), 04-02 (3min), 04-03 (299min), 05-01 (11min)
- Note: 04-03 included comprehensive human verification checkpoint (4h 59m total, 299min execution)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Keep Google Calendar sync (students already use it, don't force migration)
- Built-in calendar shows Almanac-only events (simplifies v1 scope)
- AI chatbot for modifications (faster than manual table editing)
- NCSU focus initially (validate with single university before expanding)
- Vision model vs OCR for images (need to evaluate: GPT-4V/Claude 3 vs Tesseract)

**From 01-01 (Database Schema Foundation):**
- Use SQLite for local development (zero-config, migrates to PostgreSQL for production)
- String dates (ISO 8601) instead of DateTime for consistency with existing codebase
- UUID primary keys to prevent collision with external Google Calendar event IDs
- EventSource enum distinguishes Almanac-created vs external events
- editable field computed from source for permission enforcement

**From 01-02 (CRUD Operations with Permission Enforcement):**
- Singleton pattern for PrismaClient prevents connection pool exhaustion in development
- Type adapters bridge SyllabusEvent (PDF parsing) and Prisma Event (database)
- Permission checks execute before database mutations (fail fast)
- Discriminated union return types for error handling: { ok: true; ... } | { ok: false; error: string }
- Include course relationships in queries to avoid N+1 problem

**From 01-03a (Database Persistence for PDF Parsing):**
- Simple text input for course name in Phase 1 (Phase 2 will automate with LLM)
- getOrCreateCourse idempotent pattern prevents duplicate courses on re-upload
- Course code derived from name (uppercase + dash replacement) for Phase 1
- Hardcoded "Spring 2026" semester (Phase 2 will extract from PDF)
- Parse endpoint returns event IDs + backward-compatible events array (removed in 01-03b)

**From 01-03b (UI and Sync Integration with Database):**
- UI loads events from database after parsing (database as source of truth)
- syncEventsToCalendar accepts event IDs and populates googleEventId for bidirectional sync
- Course context embedded in Google Calendar description
- Breaking changes verified with full end-to-end integration testing
- Phase 1 Data Foundation complete

**From 02-01 (OCR Extraction Pipeline):**
- Text density heuristic (< 100 chars/page OR < 50 words/page) triggers OCR extraction
- OCR renders at 2x scale for quality, processes sequentially to avoid OOM
- Unified extraction interface: extractPdfContent(buffer) returns { text, metadata: { method, pageCount } }
- Modular architecture: detect-pdf-type, extract-text, extract-ocr as separate concerns
- Backward compatibility maintained: lib/pdf.ts re-exports for existing code
- Legacy pdfjs-dist build required for Node.js/Next.js compatibility

**From 02-02 (Confidence Scoring System):**
- String-based date comparison for YYYY-MM-DD format (timezone-safe, lexicographically correct)
- Rule-based confidence adjustment: out-of-semester (-0.3), inferred date (-0.2), inferred type (-0.1), weekend (-0.05)
- Graceful LLM fallback: return empty array if parsing/validation fails (prevents crashes)
- Enhanced prompt includes semester bounds, type categorization mapping, confidence guidelines
- TDD approach for pure functions (validate, categorize) with 21 tests passing
- EventWithConfidence type provides structured confidence metadata (overall, date_extracted, type_inferred, reasoning)

**From 02-03 (Parse API Integration):**
- Heuristic table detection using tabs, pipes, and multi-space alignment for spreadsheet PDFs
- Combined text and table data in LLM prompt for better event extraction from structured syllabi
- Parse API returns events with confidence scores and extraction metadata (method, pageCount, stats)
- confidenceEventToCreateInput bridge function converts EventWithConfidence to database format
- Semester now accepted from form data (removes hardcoded "Spring 2026" limitation)
- Response metadata includes totalEvents, highConfidence, needsReview counts for UI

**From 02-04 (Extraction Preview UI):**
- Color-coded confidence badges: High (>=0.85 green), Medium (>=0.6 amber), Low (<0.6 red)
- Pre-select events with confidence >= 0.6, deselect low-confidence for user review
- Native date input (type='date') and select dropdown for type field (simple, accessible)
- Low-confidence rows highlighted with red left border and tinted background
- Extraction metadata banner shows OCR detection, page count, confidence distribution
- Confidence data merged from parse response (not stored in database)

**From 02-05 (End-to-End Integration Testing):**
- Pre-sync update mechanism: User edits in preview table persisted to database before Google Calendar sync
- OCR fallback: Tesseract failures return empty text instead of crashing (graceful degradation)
- Dynamic import for pdfjs-dist: Prevents server-side initialization errors
- Empty events validation: LLM failures handled with friendly message instead of 500 error
- Phase 2 complete: Production-ready PDF extraction pipeline validated end-to-end
- Known limitations: OCR quality poor with Tesseract, LLM accuracy varies by syllabus format

**From 03-01 (Calendar Setup):**
- react-big-calendar for calendar rendering (mature library with extensive features)
- Custom Tailwind toolbar replacing RBC default (consistent with project design)
- Deterministic color mapping for courses (hash-based palette selection from 10-color palette)
- Generic typing for toolbar component: `ToolbarProps<TEvent>` and `Calendar<CalendarEvent>` for type safety
- Timezone-safe date parsing with explicit year/month/day (avoids ISO string timezone offset bugs)
- Academic calendar dates defined for Spring 2026 and Fall 2025 (semester starts, breaks, finals)
- Conflict detection logic implemented (time overlap detection for scheduling conflicts)
- Bidirectional navigation between upload page and calendar page

**From 03-02 (Event Styling & Interactivity):**
- Unified eventPropGetter handles both regular and academic background events
- Academic dates styled as background events with color-coded borders (breaks=yellow, finals=red, semester=blue)
- Conflict indicator uses amber AlertTriangle icon in event chip (tooltip on hover)
- Radix Dialog for modal (consistent with shadcn/ui patterns, accessible)
- Native date/time inputs for better mobile UX and built-in validation
- All-day checkbox controls time input visibility (UX clarity)
- Optimistic update on save (modal closes immediately, page refetches on navigation)
- Edit button only shown for editable (ALMANAC) events (permission enforcement in UI)
- CalendarEventChip custom component for event rendering with conflict indicators

**From 03-03 (Mobile Responsiveness & Verification):**
- useIsMobile hook with window.matchMedia for SSR-safe responsive detection (<768px breakpoint)
- Auto-switch to day view on mobile screens (prevents horizontal scrolling)
- Responsive toolbar: full buttons on desktop, compact dropdown on mobile (Radix Select)
- Two-row mobile toolbar layout: nav controls (row 1), today/view selector (row 2)
- 44px minimum touch targets for WCAG accessibility compliance
- Near-full-screen modal on mobile (95vw) for better readability
- RBC CSS overrides in globals.css to fix Tailwind conflicts and mobile sizing
- Academic events merged into main events array for proper multi-day spanning in month view
- router.refresh() after event edit for immediate UI update (solves optimistic update issue)
- All 11 CAL requirements verified and approved (desktop + mobile + navigation)

**From 04-01 (Event Management UI):**
- Two-step delete with auto-reset (idle → armed → action with 3-second timeout) prevents accidental deletion
- FAB pattern for mobile create actions (fixed bottom-right, 56px size, z-index 50)
- Calendar slot click-to-create pre-fills date/time (month view = all-day, week/day = timed)
- Google Calendar deletion failures don't block local deletion (graceful degradation, local DB is source of truth)
- Pre-select single course in create modal if only one exists (reduces friction)
- DeleteState union type ('idle' | 'armed' | 'deleting') for multi-step confirmation
- googleEventId propagated through CalendarEvent interface for sync tracking
- onEventDeleted callback pattern for parent notification after CRUD operations

**From 04-02 (Bidirectional Google Calendar Sync):**
- Modular sync architecture: separate fetch/push/engine modules for maintainability
- GCAL catch-all course (code: GCAL, semester: External) for imported Google Calendar events
- Duplicate prevention via googleEventId unique constraint (skip if already exists)
- Try-catch per event: single failure doesn't block entire sync operation
- 6-month time window for fetch (past and future) balances scope and performance
- Smart throttling on both client and server (10-second window prevents spam)
- Auto-sync on page load when hasGoogleAuth is true (no background intervals)
- Dashed border + 0.7 opacity for external events (visual distinction from Almanac events)
- SyncResult discriminated union for success/error handling with detailed feedback
- SyncStatus state machine: idle → syncing → done/error → idle with auto-reset timers

**From 04-03 (Conflict Resolution & Phase Verification):**
- Field-level conflict detection compares local and Google events by googleEventId
- ConflictResolutionModal with three modes: Keep Almanac / Keep Google / Merge fields
- Merge mode defaults to local (Almanac) values for safety
- Side-by-side diff table with color-coded backgrounds (blue=Almanac, amber=Google)
- Conflicting events skipped during sync to prevent data loss
- resolveConflict server action updates both local DB and Google Calendar atomically
- Navigation through multiple conflicts with Previous/Next buttons
- All 6 EVENT requirements verified end-to-end (EVENT-01 through EVENT-06)
- Phase 4 complete and production-ready
- User feedback: merge interface could be simplified (future improvement: advanced mode only)

**From 05-01 (AI Foundation Layer):**
- Five AI tools (modify, delete, create, query, bulk-delete) with Zod validation and type safety
- Tools return ConfirmationPayload for destructive operations (UI confirms before execution)
- Tools use prisma directly (not server actions) since they run in API route context
- System prompt builder dynamically injects events, courses, date context for Claude
- Natural language date parser with chrono-node supporting relative dates and academic terms
- Academic term preprocessing: "finals week" and "spring break" mapped to concrete dates before chrono parsing
- Source permission checks: all modification tools enforce event.source === EventSource.ALMANAC
- Conflict detection integrated into tools (not delegated to UI) with warnings in confirmation payload
- AI SDK tool() function requires inputSchema (not parameters) and throws errors (not returns)

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- OCR hallucinations in date extraction (need validation against semester bounds) - ✅ RESOLVED in Phase 2
- Calendar rendering performance with 200+ events (need virtual scrolling, memoization) - ✅ RESOLVED in Phase 3
- Google Calendar sync conflict resolution (need idempotent sync, event ID mapping) - ✅ RESOLVED in Phase 4
- Mobile responsiveness is critical (60% mobile traffic expected, must be mobile-first) - ✅ RESOLVED in Phase 3

**From 01-03b End-to-End Testing:**
- **PDF parsing quality issues (Phase 2 scope):** ✅ ALL RESOLVED IN PHASE 2
  - Image-based PDFs fail without OCR (✅ RESOLVED in 02-01 - Tesseract OCR pipeline)
  - Spreadsheet-based PDFs miss events (✅ RESOLVED in 02-03 - table extraction)
  - Groq invalid JSON errors (✅ RESOLVED in 02-02/02-03/02-05 - graceful fallback)
  - Wrong dates extracted (✅ RESOLVED in 02-02/02-04 - validation + confidence UI for review)
  - Missing event categorization (✅ RESOLVED in 02-02 - type inference with confidence)
  - Low-quality extractions not visible (✅ RESOLVED in 02-04 - confidence badges and highlighting)
  - User edits lost after sync (✅ RESOLVED in 02-05 - pre-sync database updates)
- **OAuth token expiry:** Sync fails with expired token despite user signed in (token refresh needed) - MEDIUM urgency, Phase 3+
- **Manual course input:** User types name for each upload (LLM extraction planned for future) - LOW urgency, Phase 4+
- **Derived course codes:** "DATA-STRUCTURES" instead of canonical "CSC 316" (LLM extraction planned) - LOW urgency, Phase 4+

**Known Limitations (for future phases):**
- OCR quality with Tesseract is poor - consider external service (Google Vision, AWS Textract) in Phase 5+
- LLM accuracy varies by syllabus format - explore prompt tuning or model upgrades in Phase 5+
- Conflict merge interface could be simplified - consider advanced mode toggle in Phase 5+

## Session Continuity

Last session: 2026-02-03T04:31:54Z — Completed 05-01-PLAN.md
Stopped at: AI foundation layer complete - tools, prompts, date parser ready
Resume file: None
Next: 05-02 (Chat API Route) - 4 plans remaining in Phase 5

---
*State initialized: 2026-02-01*
