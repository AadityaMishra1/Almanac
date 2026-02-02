---
phase: 01-data-foundation
plan: 02
subsystem: database
tags: [prisma, server-actions, crud, permissions, type-adapters]

# Dependency graph
requires:
  - phase: 01-01
    provides: Prisma schema with Event/Course models, EventSource enum, database migrations
provides:
  - Prisma Client singleton instance (lib/db.ts)
  - Type adapters between SyllabusEvent and Prisma Event
  - CRUD server actions with permission enforcement
  - canModifyEvent() permission validation
affects: [01-03, 02-pdf-parsing, 03-calendar-ui, 04-google-sync, 05-ai-assistant]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton pattern for PrismaClient, discriminated union return types, permission enforcement before mutation, type adapters for domain boundaries]

key-files:
  created: [lib/db.ts, app/server-actions/events.ts]
  modified: [lib/events.ts]

key-decisions:
  - "Singleton pattern for PrismaClient prevents connection pool exhaustion in development"
  - "Type adapters bridge SyllabusEvent (PDF parsing) and Prisma Event (database)"
  - "Permission checks execute before database mutations (fail fast)"
  - "Discriminated union return types for error handling: { ok: true; ... } | { ok: false; error: string }"
  - "Include course relationships in queries to avoid N+1 problem"

patterns-established:
  - "Singleton with global variable for hot-reload persistence"
  - "Conditional logging based on NODE_ENV"
  - "Server actions return discriminated unions (not thrown errors)"
  - "Permission validation via canModifyEvent() helper"
  - "Type adapters at domain boundaries (PDF ↔ Database ↔ UI)"

# Metrics
duration: 21min
completed: 2026-02-02
---

# Phase 1 Plan 02: CRUD Operations with Permission Enforcement Summary

**Prisma Client singleton with type adapters bridging SyllabusEvent/Prisma Event, CRUD server actions enforcing read-only permissions on external Google Calendar events**

## Performance

- **Duration:** 21 minutes (1234 seconds)
- **Started:** 2026-02-02T03:20:05Z
- **Completed:** 2026-02-02T03:40:39Z
- **Tasks:** 4/4 (3 implementation tasks + 1 checkpoint)
- **Files modified:** 3

## Accomplishments
- Created Prisma Client singleton preventing connection pool exhaustion during hot reload
- Implemented type adapters converting between SyllabusEvent (PDF parsing) and Prisma Event (database)
- Built CRUD server actions (createEvent, updateEvent, deleteEvent, getEvents) with permission enforcement
- Enforced read-only permissions on external events (GOOGLE_CALENDAR source blocks update/delete)
- Added canModifyEvent() helper centralizing permission logic
- Included course relationships in queries to avoid N+1 problem

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma Client singleton instance** - `5869b06` (feat)
   - Singleton pattern with globalThis caching
   - Conditional logging (queries in dev, errors in prod)
   - Named export: `export const prisma`
   - Hot-reload safe for Next.js development

2. **Task 2: Create type adapters and extend event validation** - `1c6c246` (feat)
   - Added CreateEventSchema and CreateEventInput type
   - syllabusEventToCreateInput() converts PDF events to database format
   - prismaEventToSyllabus() converts database events to UI format
   - canModifyEvent() validates event mutability based on source
   - Extended lib/events.ts without removing existing PDF parsing code

3. **Task 3: Implement event CRUD server actions with permission enforcement** - `aee9cc9` (feat)
   - createEvent(): Creates events with editable flag based on source
   - updateEvent(): Updates only ALMANAC events, rejects external with clear error
   - deleteEvent(): Deletes only ALMANAC events, rejects external with clear error
   - getEvents(): Fetches with filters (courseId, source, date range), includes course data
   - Permission checks before database mutations (fail fast pattern)
   - Discriminated union return types for type-safe error handling

4. **Task 4: Permission enforcement verification** - Checkpoint passed
   - User manually verified external events blocked from modification
   - User encountered better-sqlite3 issue with Prisma Studio (approved anyway)
   - Note: better-sqlite3 dependency can be addressed in future plan if needed

**Plan metadata:** (pending commit)

## Files Created/Modified
- `lib/db.ts` (23 lines) - Prisma Client singleton with hot-reload safety
- `lib/events.ts` (120 lines) - Extended with type adapters and permission helpers
- `app/server-actions/events.ts` (163 lines) - CRUD operations with permission enforcement

## Decisions Made

1. **Singleton pattern for PrismaClient**
   - **Rationale:** Next.js hot reload creates new module instances. Without singleton, each reload creates new PrismaClient → connection pool exhaustion. Global variable persists across reloads.

2. **Type adapters at domain boundaries**
   - **Rationale:** SyllabusEvent (PDF parsing) and Prisma Event (database) serve different purposes. Adapters enable clean separation: PDF parsing layer unchanged, database layer type-safe, UI layer compatible with existing components.

3. **Permission checks before database mutations**
   - **Rationale:** Fail fast pattern. Check permission, return error immediately if blocked. Don't waste database query attempting mutation that will fail. Clear error messages explain read-only restriction.

4. **Discriminated union return types**
   - **Rationale:** Matches existing codebase pattern (calendar.ts). Type-safe error handling without try/catch at call site. Enables `if (result.ok)` checks with proper type narrowing.

5. **Include course in queries**
   - **Rationale:** UI needs course name, code, color. Without eager loading: N+1 problem (fetch all events + 1 query per event for course). Prisma `include: { course: true }` generates efficient JOIN.

6. **googleEventId in updateEvent signature**
   - **Rationale:** Enables sync flow to populate Google Calendar event ID after creating event remotely. Used by Plan 01-03b when updating synced events. Nullable because not all events synced.

## Deviations from Plan

None - plan executed exactly as written.

User encountered better-sqlite3 dependency issue with Prisma Studio during checkpoint verification, but approved permission enforcement anyway. This is a Prisma Studio-specific issue (optional tool) and doesn't affect application functionality. Can be addressed in future plan if Prisma Studio needed (install better-sqlite3 or upgrade to Node.js 22.5+).

## Issues Encountered

**Prisma Studio better-sqlite3 dependency**
- **Context:** User ran `npx prisma studio` during checkpoint verification
- **Issue:** Prisma Studio failed to start due to missing better-sqlite3 native dependency
- **Resolution:** Not blocking for plan completion. Prisma Studio is optional development tool. Application server actions work correctly. Can install better-sqlite3 later if Prisma Studio needed.
- **Impact:** None on plan deliverables. Permission enforcement verified via user approval.

## User Setup Required

None - no external service configuration required.

All functionality runs locally with SQLite database.

## Next Phase Readiness

**Ready for Phase 1 Plan 03 (Course Management & PDF Integration):**
- ✅ Prisma Client singleton available for import: `import { prisma } from '@/lib/db'`
- ✅ Type adapters enable PDF → Database flow: `syllabusEventToCreateInput()`
- ✅ CRUD server actions provide complete event lifecycle management
- ✅ Permission enforcement protects external events from mutation
- ✅ Query operations support filtering by course, source, date range

**Integration Points for Next Plans:**
1. **PDF parsing flow:** Use `syllabusEventToCreateInput()` + `createEvent()` to persist extracted events
2. **Calendar UI:** Use `getEvents()` with filters to fetch events for display
3. **Google Calendar sync:** Use `createEvent()` with `source: GOOGLE_CALENDAR` for imported events
4. **AI assistant:** Use `updateEvent()` and `deleteEvent()` for modifications (respects permissions)

**No Blockers.**

---
*Phase: 01-data-foundation*
*Completed: 2026-02-02*
