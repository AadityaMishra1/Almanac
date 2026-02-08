---
phase: 02-enhanced-pdf-extraction
plan: 04
subsystem: ui-preview
tags: [react, confidence-ui, inline-editing, preview-table, radix-ui, tailwind]

# Dependency graph
requires:
  - phase: 02-enhanced-pdf-extraction
    plan: 02
    provides: EventWithConfidence type, ExtractionMetadata, confidence scoring
  - phase: 01-data-foundation
    provides: EventsTable component, Radix UI primitives (Table, Checkbox, Input)
provides:
  - ConfidenceBadge component (color-coded confidence visualization)
  - EventsPreviewTable component (inline editing with confidence display)
  - Enhanced SyllabusToCalendar with extraction metadata banner
affects: [02-05-manual-event-correction, 03-ui-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [color-coded confidence indicators, inline table editing, confidence-based pre-selection]

key-files:
  created:
    - components/confidence-badge.tsx
    - components/events-preview-table.tsx
  modified:
    - components/syllabus-to-calendar.tsx

key-decisions:
  - "Color thresholds: High (>=0.85 green), Medium (>=0.6 amber), Low (<0.6 red)"
  - "Pre-select events with confidence >= 0.6, deselect low-confidence for user review"
  - "Native date input (type='date') and select dropdown for simplicity over custom components"
  - "Low-confidence rows highlighted with red left border and tinted background"
  - "Extraction metadata banner shows OCR detection, page count, confidence stats"

patterns-established:
  - "Confidence-driven UI feedback: colors guide user attention to uncertain extractions"
  - "Inline editing pattern: table cells contain form controls (input, select, date picker)"
  - "Metadata transparency: show extraction method (text vs OCR) to set user expectations"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 2 Plan 04: Extraction Preview UI with Confidence Visualization Summary

**Color-coded confidence badges, inline editing table, and extraction metadata banner for reviewing PDF extraction quality**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T06:38:59Z
- **Completed:** 2026-02-02T06:43:32Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- ConfidenceBadge renders color-coded pills (green/amber/red) with percentage and reasoning tooltip
- EventsPreviewTable provides inline editing: title (text input), date (date picker), type (dropdown)
- Low-confidence rows (<0.6) visually highlighted with red left border and light background tint
- Extraction metadata banner shows method (text vs OCR), page count, confidence distribution
- Events pre-selected based on confidence threshold (>=0.6 selected, <0.6 deselected for review)
- OCR detection surfaced to user with warning message to review dates carefully
- Addresses PDF-04 (extraction preview with confidence scores) and PDF-05 (manual correction in preview) requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConfidenceBadge and EventsPreviewTable components** - `c60510e` (feat)
2. **Task 2: Update SyllabusToCalendar to use preview table with confidence data** - `477c30d` (feat)

## Files Created/Modified

**Created:**
- `components/confidence-badge.tsx` - Color-coded confidence indicator with hover tooltip
- `components/events-preview-table.tsx` - Enhanced preview table with inline editing and confidence display

**Modified:**
- `components/syllabus-to-calendar.tsx` - Integrated EventsPreviewTable, added extraction metadata banner, confidence-based pre-selection

## Decisions Made

**Color-coded confidence thresholds:** High (>=0.85) = green, Medium (>=0.6) = amber, Low (<0.6) = red. These thresholds align with 02-02 confidence scoring system and provide clear visual hierarchy for user attention.

**Pre-selection based on confidence:** Events with confidence >= 0.6 are pre-selected for sync, while low-confidence events (<0.6) are deselected. This guides users to review uncertain extractions before syncing.

**Native HTML controls over custom components:** Used native `<input type="date">` and `<select>` instead of Radix Select or custom date pickers. Simpler, more accessible, and consistent with existing codebase patterns. Styled with Tailwind to match existing UI.

**Low-confidence row highlighting:** Red left border (4px) + light red background tint (`bg-red-50/30`) makes low-confidence rows stand out without being overwhelming. User can quickly scan for items needing review.

**Extraction metadata transparency:** Banner shows method (text vs OCR), page count, and confidence distribution. For OCR extractions, displays warning: "OCR was used - please review dates carefully." This sets user expectations about extraction quality.

**Confidence data merge strategy:** Parse API returns events with confidence, database stores events without confidence. UI merges by matching title+date to attach confidence metadata to database events. This preserves separation of concerns (database doesn't need confidence schema).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Parse API already updated with confidence extraction**

- **Found during:** Task 2 - Reading parse route to understand response format
- **Issue:** Plan assumed parse route needed updating, but route.ts already uses extractEventsWithConfidence and returns metadata
- **Fix:** No changes needed - API already returns EventWithConfidence[] and ExtractionMetadata
- **Files checked:** app/api/parse/route.ts (already updated in prior work)
- **Commit:** None (no changes required)
- **Note:** Plan 02-03 likely completed API bridge work but wasn't documented

## Issues Encountered

**Transient build error:** Initial `npm run build` failed with "Unexpected end of JSON input" error. Second build succeeded without changes. Likely Next.js cache issue during incremental compilation. Build verification passed on retry.

## User Setup Required

None - UI components render in browser with existing infrastructure.

## Next Phase Readiness

**Ready for:**
- Plan 02-05 (Manual Event Correction): Preview table provides foundation for editing workflow
- Phase 03 (UI Polish): Confidence indicators are in place for design refinement
- Phase 04 (Advanced Parsing): Preview UI can display results from improved extraction algorithms

**Preview UI foundation complete:**
- Confidence scores visible to user via color-coded badges
- Inline editing enables quick corrections before sync
- Extraction metadata provides transparency about PDF processing method
- Low-confidence events highlighted for user attention

**Still need (future plans):**
- Bulk edit operations (select all, clear all, filter by confidence)
- Export preview to CSV/JSON for backup
- Confidence score explanations (why was this score assigned?)
- Undo/redo for inline edits

---
*Phase: 02-enhanced-pdf-extraction*
*Completed: 2026-02-02*
