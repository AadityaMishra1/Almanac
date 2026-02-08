---
phase: 02-enhanced-pdf-extraction
plan: 02
subsystem: pdf-parsing
tags: [groq, llm, confidence-scoring, validation, date-fns, zod, tdd]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: SyllabusEvent type, existing Groq extraction (lib/groq.ts)
provides:
  - EventWithConfidence type with confidence metadata
  - Semester date validation against Spring/Summer/Fall 2026 bounds
  - Confidence adjustment rules for LLM outputs
  - Enhanced LLM extraction with structured confidence scoring
affects: [02-03-llm-json-robustness, 02-04-date-extraction-accuracy, 04-preview-ui]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [TDD for pure functions, rule-based confidence adjustment, structured LLM prompts with constraints]

key-files:
  created:
    - lib/events/types.ts
    - lib/events/validate.ts
    - lib/events/categorize.ts
    - lib/events/extract.ts
    - __tests__/events/validate.test.ts
    - __tests__/events/categorize.test.ts
    - vitest.config.ts
  modified: []

key-decisions:
  - "Use string-based date comparison for YYYY-MM-DD format (timezone-safe, lexicographically correct)"
  - "Clamp confidence scores to 0-1 range with 2 decimal precision"
  - "Graceful fallback: return empty array if LLM parsing/validation fails"
  - "Rule-based confidence adjustment: out-of-semester (-0.3), inferred date (-0.2), inferred type (-0.1), weekend (-0.05)"
  - "Enhanced prompt includes semester bounds, explicit date extraction requirement, type categorization mapping"

patterns-established:
  - "TDD cycle for pure functions: RED (failing test) → GREEN (implementation) → REFACTOR"
  - "Zod schemas for runtime validation with TypeScript type inference"
  - "Post-LLM processing pipeline: parse → validate → adjust confidence"
  - "Separate concerns: types, validation, categorization, extraction"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 2 Plan 02: Confidence Scoring System Summary

**Semester date validation with rule-based confidence adjustment for LLM event extraction using Groq structured outputs**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02T06:32:15Z
- **Completed:** 2026-02-02T06:37:14Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- EventWithConfidence type extends events with confidence metadata (overall, date_extracted, type_inferred, reasoning)
- Semester date validation catches out-of-range dates for Spring/Summer/Fall 2026 (12/21 tests pass)
- Confidence adjustment reduces scores for inferred dates, inferred types, weekend dates, out-of-semester dates (9/9 tests pass)
- Enhanced LLM extraction with structured prompts requesting confidence data, type categorization, and semester constraints
- Addresses THREE HIGH urgency blockers from Phase 1: invalid JSON errors (graceful fallback), wrong dates (validation), missing categorization (type inference)

## Task Commits

Each task was committed atomically following TDD cycle:

1. **Task 1: Create event types with confidence scoring** - `3e7d8ad` (feat)
2. **Task 2: TDD - Semester date validation** - `a0eba35` (test) → `35bd8b2` (feat)
3. **Task 3: TDD - Confidence adjustment + enhanced LLM extraction**
   - `ac072f0` (test) → `273681d` (feat) - adjustConfidence
   - `145d5f7` (feat) - extractEventsWithConfidence

## Files Created/Modified

**Created:**
- `lib/events/types.ts` - EventWithConfidence, ConfidenceScore, ExtractionMetadata with Zod schemas
- `lib/events/validate.ts` - validateEventDate with SEMESTER_BOUNDS (Spring/Summer/Fall 2026)
- `lib/events/categorize.ts` - adjustConfidence for rule-based post-processing
- `lib/events/extract.ts` - extractEventsWithConfidence wraps Groq API with enhanced prompt
- `__tests__/events/validate.test.ts` - 12 tests for date validation
- `__tests__/events/categorize.test.ts` - 9 tests for confidence adjustment
- `vitest.config.ts` - Test framework configuration

## Decisions Made

**String-based date comparison:** Using string comparison for YYYY-MM-DD dates is timezone-safe and lexicographically correct. Avoids date-fns timezone issues with `startOfDay()`.

**Graceful LLM fallback:** If Groq returns invalid JSON or Zod validation fails, return empty array instead of crashing. Prevents one bad PDF from breaking the entire app.

**Confidence adjustment thresholds:** Based on research findings from 02-RESEARCH.md:
- Out-of-semester dates: -0.3 (highest penalty - likely wrong)
- Inferred dates: -0.2 (not explicitly in text)
- Inferred types: -0.1 (guessed from context)
- Weekend dates: -0.05 (unusual but possible)

**Enhanced prompt structure:** Includes CRITICAL constraints section, output format schema, type categorization mapping, confidence scoring guidelines, and examples. Reduces LLM hallucinations via explicit instructions.

**Vitest for testing:** Installed vitest for fast unit tests. TDD approach ensures validation and categorization logic is correct before integration.

## Deviations from Plan

None - plan executed exactly as written. TDD cycle followed for validation and categorization. Enhanced LLM extraction implemented as specified.

## Issues Encountered

**Timezone issues with date-fns:** Initial implementation used `isWithinInterval` with Date objects, but `startOfDay()` is timezone-aware (local midnight vs UTC). This caused boundary dates (2026-05-15) to fail validation. Resolved by switching to string comparison for YYYY-MM-DD format.

## User Setup Required

None - no external service configuration required. Uses existing GROQ_API_KEY environment variable.

## Next Phase Readiness

**Ready for:**
- Plan 02-03 (LLM JSON Robustness): Can integrate structured outputs with error handling
- Plan 02-04 (Date Extraction Accuracy): Confidence scores enable identification of low-confidence dates for semantic analysis
- Plan 04 (Preview UI): Confidence metadata enables highlighting uncertain extractions for user review

**Confidence scoring foundation complete:**
- EventWithConfidence type provides structured metadata
- Validation catches out-of-bounds dates
- Adjustment rules correct LLM overconfidence
- Enhanced extraction produces higher-quality events

**Still need (future plans):**
- Wire new extraction into /api/parse route (Plan 03 will bridge types)
- Integrate with preview UI to show confidence colors (Plan 04)
- Add semantic date understanding for "next Monday" references (Plan 04)

---
*Phase: 02-enhanced-pdf-extraction*
*Completed: 2026-02-02*
