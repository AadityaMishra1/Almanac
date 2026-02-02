# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

**Current focus:** Phase 2 - Enhanced PDF Extraction

## Current Position

Phase: 2 of 5 (Enhanced PDF Extraction) - In Progress
Plan: 2 of 5 in phase (02-01, 02-02 complete)
Status: Phase 2 active - Confidence scoring system complete
Last activity: 2026-02-02 — Completed 02-02-PLAN.md (Confidence Scoring System)

Progress: [██░░░░░░░░] 24% (2/5 phase 2 plans complete, 1.4/5 phases overall)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 7 minutes
- Total execution time: 0.65 hours (41 minutes)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 33min | 8min |
| 02-enhanced-pdf-extraction | 2/5 | 8min | 4min |

**Recent Trend:**
- Last 5 plans: 01-03a (2min), 01-03b (8min), 02-01 (3min), 02-02 (5min)
- Trend: Phase 2 maintaining fast velocity with TDD approach

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
  - Image-based PDFs fail without OCR (✅ RESOLVED in 02-01 - Tesseract OCR pipeline now active)
  - Groq invalid JSON errors on some PDFs (⚠️ MITIGATED in 02-02 - graceful fallback, still needs 02-03 robustness) - HIGH urgency
  - Wrong dates extracted (⚠️ PARTIALLY RESOLVED in 02-02 - validation catches out-of-bounds, still needs 02-04 semantic) - HIGH urgency
  - Missing event categorization (✅ RESOLVED in 02-02 - type inference with confidence tracking)
- **OAuth token expiry:** Sync fails with expired token despite user signed in (token refresh needed) - MEDIUM urgency
- **Manual course input:** User types name for each upload (Phase 2 will automate with LLM) - MEDIUM urgency
- **Hardcoded semester:** All courses default to "Spring 2026" (Phase 2 will extract from PDF) - LOW urgency
- **Derived course codes:** "DATA-STRUCTURES" instead of canonical "CSC 316" (Phase 2 will fix) - LOW urgency

## Session Continuity

Last session: 2026-02-02T06:37:14Z — Completed 02-02-PLAN.md
Stopped at: Confidence scoring system complete, ready for 02-03 (LLM JSON Robustness)
Resume file: None

---
*State initialized: 2026-02-01*
