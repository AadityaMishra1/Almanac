# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

**Current focus:** Phase 1 - Data Foundation

## Current Position

Phase: 1 of 1 (Data Foundation)
Plan: 4 of 4 (completed 01-03b-PLAN.md)
Status: Phase complete
Last activity: 2026-02-02 — Completed 01-03b-PLAN.md (UI and Sync Integration with Database)

Progress: [████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8 minutes
- Total execution time: 0.53 hours (33 minutes)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 33min | 8min |

**Recent Trend:**
- Last 5 plans: 01-01 (2min), 01-02 (21min), 01-03a (2min), 01-03b (8min)
- Trend: Phase 1 complete with consistent execution speed

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

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- OCR hallucinations in date extraction (need validation against semester bounds)
- Calendar rendering performance with 200+ events (need virtual scrolling, memoization)
- Google Calendar sync conflict resolution (need idempotent sync, event ID mapping)
- Mobile responsiveness is critical (60% mobile traffic expected, must be mobile-first)

**From 01-03b End-to-End Testing:**
- **PDF parsing quality issues (Phase 2 scope):**
  - Image-based PDFs fail without OCR (Phase 2 PDF-01 will add Tesseract) - HIGH urgency
  - Groq invalid JSON errors on some PDFs (Phase 2 PDF-03/04 will improve accuracy) - HIGH urgency
  - Wrong dates extracted (open vs due dates - Phase 2 PDF-04 semantic understanding) - HIGH urgency
- **OAuth token expiry:** Sync fails with expired token despite user signed in (token refresh needed) - MEDIUM urgency
- **Manual course input:** User types name for each upload (Phase 2 will automate with LLM) - MEDIUM urgency
- **Hardcoded semester:** All courses default to "Spring 2026" (Phase 2 will extract from PDF) - LOW urgency
- **Derived course codes:** "DATA-STRUCTURES" instead of canonical "CSC 316" (Phase 2 will fix) - LOW urgency

## Session Continuity

Last session: 2026-02-02T04:10:22Z — Completed 01-03b-PLAN.md
Stopped at: Phase 1 Data Foundation complete, ready for Phase 2 (Smart Parsing)
Resume file: None

---
*State initialized: 2026-02-01*
