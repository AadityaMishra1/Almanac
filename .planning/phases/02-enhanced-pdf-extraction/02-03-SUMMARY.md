---
phase: 02-enhanced-pdf-extraction
plan: 03
subsystem: pdf-extraction
tags: [pdf-parse, groq, llm, table-extraction, confidence-scoring]

# Dependency graph
requires:
  - phase: 02-01
    provides: OCR extraction pipeline with unified PDF content extraction
  - phase: 02-02
    provides: Confidence scoring system with LLM event extraction
provides:
  - Integrated parse API route with unified extraction and confidence scoring
  - Table extraction module for spreadsheet-based PDFs
  - Enhanced response with extraction metadata and confidence statistics
affects: [02-04, 02-05, user-interface-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Heuristic table detection using tabs, pipes, and multi-space alignment"
    - "Bridge functions for type conversion between extraction and database models"
    - "Combined text and table data for LLM context enhancement"

key-files:
  created:
    - lib/pdf/extract-tables.ts
  modified:
    - lib/pdf/index.ts
    - app/api/parse/route.ts

key-decisions:
  - "Use heuristic table detection (tabs, pipes, multi-spaces) instead of complex PDF table parsing libraries"
  - "Combine text and table data in LLM prompt for better spreadsheet PDF handling"
  - "Return events with confidence scores in API response for UI preview"

patterns-established:
  - "confidenceEventToCreateInput bridge function pattern for type conversion"
  - "Table formatting as pipe-separated rows for LLM readability"
  - "Metadata response includes extraction method and confidence statistics"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 02 Plan 03: Parse API Integration Summary

**Unified PDF extraction pipeline (text + OCR + tables) integrated with confidence-scored event extraction, feeding enhanced metadata to parse API response**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T06:38:58Z
- **Completed:** 2026-02-02T06:42:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Integrated OCR pipeline and confidence scoring into production parse endpoint
- Added table extraction for spreadsheet-based syllabi (addresses PDF-02 requirement)
- Enhanced API response with extraction metadata and confidence statistics for UI
- Maintained full backward compatibility with database persistence layer

## Task Commits

Each task was committed atomically:

1. **Task 1: Add table extraction module** - `c4396e2` (feat)
2. **Task 2: Rewire parse route to use enhanced extraction pipeline** - `1e7db7a` (feat)

## Files Created/Modified
- `lib/pdf/extract-tables.ts` - Heuristic table detection and formatting for LLM
- `lib/pdf/index.ts` - Added tables field to ExtractionResult, integrated extractTables
- `app/api/parse/route.ts` - Integrated unified extraction, confidence scoring, and table data

## Decisions Made

**1. Heuristic table detection approach**
- **Rationale:** Simple heuristics (tabs, pipes, multi-spaces) sufficient for Phase 2. More sophisticated libraries (tabula-js, pdf-parse getTable) add complexity without proven benefit for syllabus PDFs. Research showed LLMs handle pipe-formatted text well.
- **Impact:** Fast implementation, good enough for 80% of table-based syllabi. Can enhance in Phase 3 if needed.

**2. Combined text and table data in single prompt**
- **Rationale:** Providing tables as separate context ("TABLE DATA:\n...") gives LLM explicit signal about structured data, improving extraction accuracy for spreadsheet PDFs.
- **Impact:** Addresses PDF-02 requirement without changing LLM prompt structure significantly.

**3. Return events with confidence in API response**
- **Rationale:** UI needs confidence scores to show badges and highlight low-confidence events. Database doesn't store confidence (it's extraction metadata, not persistent data), so must be in parse response.
- **Impact:** Enables confidence-aware UI in Phase 3 without database schema changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all integrations worked as expected. Type checks and build passed on first attempt after completing both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Plan 02-04 (Semantic date validation): Parse route now returns confidence scores, ready for semantic validation to adjust them
- Plan 02-05 (Contextual event type inference): Parse route extracts event types, ready for contextual enhancement
- Phase 3 UI enhancements: API response includes full metadata for confidence badges and extraction method display

**Addresses blockers:**
- Image-based PDFs: OCR pipeline active (resolved in 02-01)
- Spreadsheet PDFs: Table extraction active (resolved in this plan)
- Event categorization: Type inference with confidence (resolved in 02-02)
- Invalid JSON errors: Graceful fallback (mitigated in 02-02, further robustness in 02-03)

**Outstanding concerns from STATE.md:**
- Wrong dates extracted: Partially resolved with validation in 02-02, semantic validation coming in 02-04 (HIGH urgency - next plan)
- OAuth token expiry: Not in Phase 2 scope, remains MEDIUM urgency
- Manual course input: Not in Phase 2 scope, will be automated with LLM in later phase
- Hardcoded semester: Parse route now accepts semester from form data (fixed in this plan), UI update in Phase 3
- Derived course codes: Not in Phase 2 scope, will fix with LLM extraction in later phase

---
*Phase: 02-enhanced-pdf-extraction*
*Completed: 2026-02-02*
