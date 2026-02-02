# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

**Current focus:** Phase 1 - Data Foundation

## Current Position

Phase: 1 of 5 (Data Foundation)
Plan: 2 of 4 (completed 01-02-PLAN.md)
Status: In progress
Last activity: 2026-02-02 — Completed 01-02-PLAN.md (CRUD Operations with Permission Enforcement)

Progress: [██░░░░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 12 minutes
- Total execution time: 0.40 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 2/4 | 23min | 12min |

**Recent Trend:**
- Last 5 plans: 01-01 (2min), 01-02 (21min)
- Trend: Steady progress

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

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- OCR hallucinations in date extraction (need validation against semester bounds)
- Calendar rendering performance with 200+ events (need virtual scrolling, memoization)
- Google Calendar sync conflict resolution (need idempotent sync, event ID mapping)
- Mobile responsiveness is critical (60% mobile traffic expected, must be mobile-first)

## Session Continuity

Last session: 2026-02-02T03:40:39Z — Completed 01-02-PLAN.md
Stopped at: CRUD operations with permission enforcement complete, ready for 01-03 (Course Management)
Resume file: None

---
*State initialized: 2026-02-01*
