---
phase: 01-data-foundation
plan: 03b
subsystem: ui
tags: [react, database, google-calendar, integration, server-actions]

requires:
  - phase: 01-data-foundation
    plan: 01
    what: Database schema with Course and Event models
  - phase: 01-data-foundation
    plan: 02
    what: Event CRUD operations and permission enforcement
  - phase: 01-data-foundation
    plan: 03a
    what: Database persistence in PDF parsing with course management

provides:
  - Complete end-to-end data foundation (upload → parse → persist → sync → verify)
  - UI loads events from database (no transient parse response)
  - Google Calendar sync populates googleEventId in database
  - Course input field for Phase 1 manual entry
  - Full integration tested (database → UI → Google Calendar)

affects:
  - phase: 03-calendar-ui
    plan: "*"
    how: Calendar UI will query database for events
  - phase: 04-bidirectional-sync
    plan: "*"
    how: Sync can use googleEventId for duplicate prevention and updates
  - phase: 02-smart-parsing
    plan: "*"
    how: Will replace manual course input with LLM extraction

tech-stack:
  added: []
  patterns:
    - UI loads events from database after parsing (not transient response)
    - Sync accepts event IDs and populates googleEventId
    - Course context embedded in Google Calendar description
    - Reload after sync to show updated metadata

key-files:
  created: []
  modified:
    - components/syllabus-to-calendar.tsx
    - app/server-actions/calendar.ts

decisions:
  - id: database-backed-ui
    decision: UI fetches events from database after parsing
    rationale: Enables persistence across page refresh, establishes database as source of truth
    alternatives: Continue using transient parse response (doesn't persist)
    impact: Breaking change requiring full integration test

  - id: sync-event-ids
    decision: syncEventsToCalendar accepts event IDs instead of event objects
    rationale: Ensures sync operates on database-backed events with full metadata
    alternatives: Pass event objects (loses database ID, can't update googleEventId)
    impact: Breaking change to sync signature, requires database fetch

  - id: course-context-in-description
    decision: Embed course info in Google Calendar event description
    rationale: Google Calendar has no course field, maintains context in external system
    alternatives: Separate calendar per course (too fragmented for students)
    impact: Students see "Course: Data Structures (DATA-STRUCTURES)" in Google Calendar

metrics:
  duration: 8min
  completed: 2026-02-02
---

# Phase 01 Plan 03b: UI and Sync Integration with Database Summary

**Complete data foundation with database-backed UI, Google Calendar sync with ID tracking, and end-to-end integration testing**

## Performance

- **Duration:** ~8 minutes (estimated based on testing checkpoint)
- **Started:** 2026-02-02T04:00:00Z (approximate)
- **Completed:** 2026-02-02T04:08:00Z (approximate)
- **Tasks:** 2 tasks + checkpoint verification
- **Files modified:** 2

## Accomplishments
- UI updated with course input field and database loading (replaces transient parse response)
- Google Calendar sync populates googleEventId in database for bidirectional sync readiness
- Full end-to-end flow validated (upload → parse → persist → sync → verify)
- Database integration works correctly with proper flags and ID tracking
- Phase 1 Data Foundation complete

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: UI and sync integration with database** - `5af4fc6` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- **components/syllabus-to-calendar.tsx** - Added course name input field, loads events from database via getEvents, sync button uses event IDs, reloads after sync to show googleEventId
- **app/server-actions/calendar.ts** - Updated syncEventsToCalendar to accept event IDs, fetch events from database with course relationships, populate googleEventId after sync

## Decisions Made

### Database-Backed UI
**Decision:** UI fetches events from database after parsing instead of using transient parse response

**Why:** Establishes database as single source of truth. Events persist across page refresh. Enables future features (calendar UI, AI chat) to query same data.

**Breaking change:** UI no longer works with transient data. Requires database persistence established in Plan 01-03a.

### Sync with Event IDs
**Decision:** `syncEventsToCalendar()` accepts event IDs (string[]) instead of event objects

**Why:** Ensures sync operates on database-backed events with full metadata. Enables updating googleEventId in database after sync completes.

**Breaking change:** Function signature changed. Callers must provide database IDs, not transient objects.

### Course Context in Google Calendar
**Decision:** Embed course information in Google Calendar event description

**Why:** Google Calendar doesn't have course field. Students see context when viewing event in Google Calendar mobile/web.

**Format:** `"Course: Data Structures (DATA-STRUCTURES)"` in description

## Technical Implementation

### UI Updates (components/syllabus-to-calendar.tsx)

**Added course input field:**
```typescript
<input
  id="courseName"
  type="text"
  placeholder="e.g., Data Structures"
  value={courseName}
  onChange={(e) => setCourseName(e.target.value)}
  disabled={isParsing}
/>
```

**Database loading after parse:**
```typescript
// Store course ID from parse response
setCourseId(parsedCourseId);

// Load events from database (not transient parse response)
const eventsResult = await getEvents({ courseId: parsedCourseId });

// Convert to UI format with database IDs
const loadedRows = eventsResult.events.map((dbEvent) => ({
  ...prismaEventToSyllabus(dbEvent),
  selected: true,
  id: dbEvent.id, // Store database ID for sync
}));
```

**Sync with event IDs:**
```typescript
// Get selected event IDs
const selectedEventIds = rows
  .filter((r) => r.selected && r.id)
  .map((r) => r.id!);

// Call sync with IDs
await syncEventsToCalendar(selectedEventIds);

// Reload from database to show updated googleEventId
const eventsResult = await getEvents({ courseId });
```

### Sync Updates (app/server-actions/calendar.ts)

**Signature change:**
```typescript
// Old: (events: SyllabusEvent[])
// New: (eventIds: string[])
export async function syncEventsToCalendar(eventIds: string[])
```

**Database fetch with course relationships:**
```typescript
const events = await prisma.event.findMany({
  where: { id: { in: eventIds } },
  include: { course: true },
});
```

**Populate googleEventId after sync:**
```typescript
const response = await calendar.events.insert({
  calendarId: "primary",
  requestBody: {
    summary: event.title,
    description: [
      event.type,
      event.description,
      `Course: ${event.course.name} (${event.course.code})`,
    ].filter(Boolean).join("\n\n"),
    start: { date: startDate },
    end: { date: endDate },
  },
});

const googleEventId = response.data.id;
if (googleEventId) {
  await updateEvent(event.id, { googleEventId });
}
```

## Verification Results

### End-to-End Testing

**What works (Phase 1 goals achieved):**
- ✅ Events persist to database with source: ALMANAC and editable: true
- ✅ UI loads events from database (not transient parse response)
- ✅ Sync fetches events by ID before calling Google Calendar API
- ✅ googleEventId populated in database after sync
- ✅ Course input field required and functional
- ✅ Course reuse works (getOrCreateCourse idempotent)
- ✅ Google Calendar shows events with course context in description

### Known Limitations (documented as expected)

These issues were found during testing but are outside Phase 1 scope:

**PDF Parsing Quality Issues (Phase 2 scope):**
1. **Image-based PDF with no OCR:**
   - Issue: PDF with image-only text couldn't extract content
   - Resolution: Phase 2 PDF-01 will add Tesseract OCR
   - Workaround: Use text-based PDFs for Phase 1

2. **Groq invalid JSON error (500):**
   - Issue: One PDF failed with Groq model returning invalid JSON
   - Resolution: Phase 2 PDF-03/04 will improve extraction accuracy
   - Workaround: Retry with different PDF

3. **Wrong dates extracted (open dates instead of due dates):**
   - Issue: PDF had multiple dates, extracted wrong ones
   - Resolution: Phase 2 PDF-04 will add semantic date understanding
   - Workaround: Manual date correction in UI

**OAuth Token Expiry (Pre-existing issue):**
- Issue: Sync failed with "expired token" despite user signed in
- Resolution: Token refresh mechanism needs fixing (not Phase 1 scope)
- Workaround: Sign out and sign in again

### Success Criteria Met

1. **UI integration complete** ✅
   - Course name input field visible and functional
   - Upload validation requires course name
   - handlePdf loads events from database via getEvents({ courseId })
   - handleSync passes event IDs to sync function
   - UI reloads events after sync to show updated metadata

2. **Google Calendar sync updated** ✅
   - syncEventsToCalendar() accepts event IDs (not event objects)
   - Fetches events from database before syncing
   - Updates events with googleEventId after successful sync
   - Google Calendar description includes course context

3. **Data foundation requirements met** ✅
   - DATA-01: System persists events locally with metadata (source, courseId, editable)
   - DATA-02: System distinguishes Almanac vs external events (source field)
   - DATA-03: System enforces read-only on external events (tested in Plan 01-02)
   - DATA-04: Schema includes all critical fields (title, date, time, type, course, source, editable)

4. **End-to-end flow functional** ✅
   - PDF upload with course name → database persistence → UI display → Google Calendar sync → ID tracking
   - No data loss (events survive page refresh because stored in database)
   - Course input captured from user (Phase 2 will enhance with LLM extraction)
   - Ready for Phase 3 (Calendar UI can query database)

5. **Breaking changes verified** ✅
   - UI no longer uses transient parse response
   - Sync no longer accepts event objects
   - Full integration test passed with checkpoint approval

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**End-to-end testing revealed PDF parsing quality issues:**
- Image-based PDFs fail (no OCR)
- Groq invalid JSON errors (500)
- Wrong dates extracted from PDFs

**Resolution:** These are expected limitations for Phase 1. Database integration (Phase 1 goal) works correctly. PDF parsing quality improvements are Phase 2 scope.

**OAuth token expiry issue found but not in Phase 1 scope:**
- Token refresh mechanism needs fixing
- User can work around by re-authenticating
- Not blocking Phase 1 completion

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

### What's Ready

**Phase 1 Data Foundation complete:**
- Database schema with Course and Event models
- CRUD operations with permission enforcement
- PDF parsing with database persistence
- UI integrated with database
- Google Calendar sync with ID tracking
- Full end-to-end flow validated

**Ready for Phase 2 (Smart Parsing):**
- Database stores all parsed events
- Course structure exists for LLM extraction
- googleEventId field ready for duplicate prevention
- Manual course input can be replaced with automation

**Ready for Phase 3 (Calendar UI):**
- Events queryable from database
- Source field distinguishes Almanac vs external
- editable field enforces permissions
- Course relationships established

**Ready for Phase 4 (Bidirectional Sync):**
- googleEventId links local events to Google Calendar
- Source field tracks event origin
- Update/delete operations respect permissions

### Blockers

None - Phase 1 complete.

### Concerns for Next Phase

**High Priority (Phase 2 must address):**
1. **OCR for image-based PDFs:**
   - Current: Text extraction fails on image PDFs
   - Impact: Students with scanned syllabi can't use system
   - Plan: Phase 2 PDF-01 adds Tesseract OCR

2. **PDF parsing accuracy:**
   - Current: Wrong dates extracted, Groq JSON errors
   - Impact: User must manually correct dates
   - Plan: Phase 2 PDF-03/04 improves extraction with validation

**Medium Priority (fix before production):**
3. **OAuth token refresh:**
   - Current: Expired tokens cause sync failure
   - Impact: User must re-authenticate frequently
   - Plan: Add token refresh flow in auth system

**Low Priority (Phase 1 acceptable, Phase 2 improves):**
4. **Manual course input:**
   - Current: User types course name for each upload
   - Impact: Adds friction to UX
   - Plan: Phase 2 LLM extracts course metadata from PDF

5. **Hardcoded semester:**
   - Current: All courses default to "Spring 2026"
   - Impact: Metadata inaccuracy (doesn't block functionality)
   - Plan: Phase 2 extracts semester from PDF

6. **Derived course codes:**
   - Current: Codes like "DATA-STRUCTURES" instead of "CSC 316"
   - Impact: Non-canonical codes (still unique and functional)
   - Plan: Phase 2 LLM extracts canonical course code

### Enhancements for Phase 2

**Smart Parsing focus areas:**
1. **OCR integration (PDF-01):**
   - Add Tesseract for image-based PDFs
   - Fallback to vision model (GPT-4V/Claude 3) if Tesseract fails

2. **LLM course extraction (PDF-02):**
   - Extract course code, name, semester from PDF
   - Remove manual course input field
   - Validate extracted metadata

3. **Date validation (PDF-03):**
   - Validate extracted dates against semester bounds
   - Reject impossible dates (before semester start, after end)
   - Semantic date understanding (due dates vs open dates)

4. **Extraction accuracy (PDF-04):**
   - Handle Groq JSON errors with retry/fallback
   - Improve prompt engineering for consistent output
   - Add confidence scores for extracted data

## Learnings

### Pattern: Database as Source of Truth

**Before (transient data):**
```typescript
// Parse returns events → UI renders → data lost on refresh
const json = await fetch("/api/parse");
setRows(json.events);
```

**After (database-backed):**
```typescript
// Parse saves to DB → UI fetches from DB → data persists
const { courseId } = await fetch("/api/parse");
const { events } = await getEvents({ courseId });
setRows(events);
```

**Benefits:**
- Events survive page refresh
- Multiple components can query same data
- Ready for calendar UI to query database
- Enables future features (AI chat, conflict resolution)

### Pattern: Sync with Database IDs

**Why event IDs instead of event objects:**
- Ensures sync operates on latest database state
- Enables updating googleEventId after sync
- Prevents stale data issues (UI state vs database state)
- Required for bidirectional sync (Phase 4)

**Implementation:**
```typescript
// UI passes IDs, sync fetches from DB
await syncEventsToCalendar(selectedEventIds);

// Not: syncEventsToCalendar(selectedEvents)
// Problem: Stale data, no way to update googleEventId
```

### Pattern: Reload After Mutation

**After sync completes, reload from database:**
```typescript
await syncEventsToCalendar(selectedEventIds);

// Reload to show updated googleEventId
const eventsResult = await getEvents({ courseId });
setRows(eventsResult.events);
```

**Benefits:**
- UI always reflects database state
- Shows googleEventId populated after sync
- User sees confirmation of successful sync
- Prevents UI/database desync

### Breaking Changes Done Right

**Strategy:** Complete integration stack in single plan
- Task 1: Update UI to use database
- Task 2: Update sync to use database
- Task 3: Test full end-to-end flow

**Result:** All breaking changes verified together, no partial migration state.

## Known Issues

**PDF Parsing Quality (Phase 2 scope):**
- Image-based PDFs fail without OCR
- Groq invalid JSON errors on some PDFs
- Wrong dates extracted (open vs due dates)

**OAuth Token Expiry (Pre-existing):**
- Token refresh mechanism needs fixing
- User must re-authenticate when token expires

**None blocking Phase 1 completion.**

## Testing Notes

### Manual Testing Performed

**Full end-to-end flow:**
1. Enter course name "Data Structures"
2. Upload PDF syllabus
3. Verified database persistence in Prisma Studio
4. Events displayed in UI with selection state
5. Clicked "Sync to Google Calendar"
6. Verified googleEventId populated in database
7. Checked Google Calendar for synced events

**Error handling:**
- Uploading without course name → proper error message
- Course reuse on re-upload → no duplicates

**Known limitations documented:**
- Image PDFs fail (OCR needed)
- Some PDFs extract wrong dates (accuracy improvements needed)
- OAuth token expiry (refresh needed)

### Database Inspection

```bash
npx prisma studio

# Courses table: name "Data Structures", code "DATA-STRUCTURES"
# Events table: source ALMANAC, editable true, courseId set, googleEventId populated after sync
```

---

**Status:** Complete
**Next:** Plan 01-04 (if exists) OR Phase 2 (Smart Parsing)
