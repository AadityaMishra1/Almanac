# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

**Current focus:** Phase 1 - Data Foundation

## Current Position

Phase: 1 of 5 (Data Foundation)
Plan: 3 of 4 (completed 01-03a-PLAN.md)
Status: In progress
Last activity: 2026-02-02 — Completed 01-03a-PLAN.md (Database Persistence for PDF Parsing)

Progress: [███░░░░░░░] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 8 minutes
- Total execution time: 0.42 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 3/4 | 25min | 8min |

**Recent Trend:**
- Last 5 plans: 01-01 (2min), 01-02 (21min), 01-03a (2min)
- Trend: Accelerating with autonomous execution

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

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- OCR hallucinations in date extraction (need validation against semester bounds)
- Calendar rendering performance with 200+ events (need virtual scrolling, memoization)
- Google Calendar sync conflict resolution (need idempotent sync, event ID mapping)
- Mobile responsiveness is critical (60% mobile traffic expected, must be mobile-first)

**From 01-03a:**
- Hardcoded semester: All courses default to "Spring 2026" (Phase 2 will extract from PDF) - LOW urgency
- Derived course codes: "DATA-STRUCTURES" instead of canonical "CSC 316" (Phase 2 will fix) - LOW urgency
- Manual course input: User types name for each upload (Phase 2 will automate) - MEDIUM urgency

## Session Continuity

Last session: 2026-02-02T03:47:07Z — Completed 01-03a-PLAN.md
Stopped at: Database persistence added to PDF parsing, ready for 01-03b (UI update)
Resume file: None

---
*State initialized: 2026-02-01*
