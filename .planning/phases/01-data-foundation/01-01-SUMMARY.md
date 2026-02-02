---
phase: 01-data-foundation
plan: 01
subsystem: database
tags: [prisma, sqlite, orm, schema, migrations]

# Dependency graph
requires:
  - phase: none
    provides: greenfield setup
provides:
  - Prisma ORM with SQLite configured
  - Event and Course models with source authority tracking
  - EventSource enum (ALMANAC | GOOGLE_CALENDAR)
  - Permission enforcement foundation via editable field
  - Database migrations and type-safe client
affects: [01-02, 01-03, 02-pdf-parsing, 03-calendar-ui, 04-google-sync, 05-ai-assistant]

# Tech tracking
tech-stack:
  added: [prisma, @prisma/client, sqlite]
  patterns: [uuid primary keys, string dates (ISO 8601), enum-based source tracking, cascade deletes]

key-files:
  created: [prisma/schema.prisma, prisma.config.ts, prisma/migrations/20260202031410_init/migration.sql, .env.example (DATABASE_URL)]
  modified: [package.json, .gitignore]

key-decisions:
  - "Use SQLite for local development (zero-config, migrates to PostgreSQL for production)"
  - "String dates (ISO 8601 YYYY-MM-DD) instead of DateTime for consistency with existing codebase"
  - "UUID primary keys to prevent collision with external Google Calendar event IDs"
  - "EventSource enum distinguishes Almanac-created vs external events"
  - "editable field computed from source for permission enforcement"

patterns-established:
  - "Cascade delete: Course deletion removes all associated Events"
  - "Indexes on foreign keys (courseId), dates (date), and enums (source)"
  - "Unique constraint on googleEventId for idempotent sync"
  - "Audit fields: createdAt, updatedAt timestamps on all models"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 1 Plan 01: Database Schema Foundation Summary

**Prisma ORM with Event/Course models, EventSource enum for authority tracking, and SQLite database with migrations applied**

## Performance

- **Duration:** 2 minutes (142 seconds)
- **Started:** 2026-02-02T03:12:30Z
- **Completed:** 2026-02-02T03:14:52Z
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments
- Installed and configured Prisma ORM with SQLite provider
- Defined Event model with source authority tracking (ALMANAC vs GOOGLE_CALENDAR)
- Defined Course model with relationship to Events (one-to-many)
- Created EventSource enum for distinguishing event origins
- Applied initial migration creating courses and events tables with indexes
- Generated type-safe Prisma Client for TypeScript integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Prisma and initialize schema** - `df65dba` (chore)
   - Install @prisma/client and prisma packages
   - Initialize Prisma with SQLite provider
   - Configure DATABASE_URL in .env.example
   - Add database files to .gitignore

2. **Task 2: Define Event and Course models with source authority** - `60b2c18` (feat)
   - Add EventSource enum (ALMANAC | GOOGLE_CALENDAR)
   - Define Course model (code, name, color, semester)
   - Define Event model with source tracking and permissions
   - Add indexes on courseId, date, source
   - Configure cascade delete for Course → Event

3. **Task 3: Generate Prisma Client and run initial migration** - `196ff32` (chore)
   - Generate Prisma Client types
   - Create migration 20260202031410_init
   - Apply migration to dev.db (SQLite database)
   - Create tables: courses, events
   - Create indexes and unique constraints

## Files Created/Modified
- `prisma/schema.prisma` - Event and Course models with EventSource enum
- `prisma.config.ts` - Prisma configuration with DATABASE_URL from env
- `prisma/migrations/20260202031410_init/migration.sql` - Initial migration DDL
- `prisma/migrations/migration_lock.toml` - Migration lock file for SQLite
- `.env.example` - Added DATABASE_URL template
- `.gitignore` - Added *.db and *.db-journal exclusions
- `package.json` - Added @prisma/client and prisma dependencies
- `dev.db` - SQLite database file (gitignored)

## Decisions Made

1. **SQLite for local development, PostgreSQL-ready for production**
   - **Rationale:** Zero-config local development (no Docker, no cloud setup) matches solo developer workflow. Prisma schema identical between SQLite and PostgreSQL—just change provider for production.

2. **String dates (ISO 8601) instead of DateTime**
   - **Rationale:** Consistent with existing codebase (lib/events.ts uses string dates). Avoids SQLite DateTime timezone quirks. Simple format: YYYY-MM-DD for dates, HH:MM for times.

3. **UUID primary keys instead of auto-increment**
   - **Rationale:** Prevents collision with external Google Calendar event IDs during sync. UUIDs are standard, widely recognized, compatible with distributed systems.

4. **EventSource enum for authority tracking**
   - **Rationale:** Explicit distinction between Almanac-created events (editable) and Google Calendar imports (read-only). Enables permission enforcement at database level.

5. **editable field defaults to true**
   - **Rationale:** Most events created by Almanac are editable. Server actions will set editable=false for GOOGLE_CALENDAR source. This field enables client-side UI hints (disable edit buttons for external events).

6. **Cascade delete for Course → Event relationship**
   - **Rationale:** Deleting a course should delete all associated events (prevents orphaned events). Students expect course deletion to be complete cleanup operation.

## Deviations from Plan

**1. [Rule 3 - Blocking] Removed datasource url from schema.prisma**
- **Found during:** Task 2 (Schema validation)
- **Issue:** Prisma 7.x moved connection URL configuration from schema.prisma to prisma.config.ts. Schema validation failed with: "The datasource property `url` is no longer supported in schema files"
- **Fix:** Removed `url = env("DATABASE_URL")` line from datasource block. URL now configured in prisma.config.ts
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma validate` and `npx prisma format` both passed
- **Committed in:** 60b2c18 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Breaking change in Prisma 7.x configuration. Fix was necessary to proceed with schema validation and migration. No functional impact—URL still configured, just different file location.

## Issues Encountered
- Prisma 7.x configuration change required schema adjustment (handled via Rule 3 auto-fix)
- TypeScript compilation test required ES2020 target to avoid private identifier errors in Prisma types (expected, not a blocker)

## User Setup Required

None - no external service configuration required.

Database runs locally with zero configuration. SQLite file created automatically at `dev.db` on first migration.

## Next Phase Readiness

**Ready for Phase 1 Plan 02 (Server Actions Integration):**
- ✅ Prisma Client available for import: `import { PrismaClient, EventSource } from '@prisma/client'`
- ✅ Event model includes all fields needed for CRUD operations
- ✅ Course model ready for course management
- ✅ EventSource enum enables authority tracking
- ✅ Database migrations applied and verified
- ✅ Type-safe TypeScript types generated

**Next Steps:**
1. Create server actions for Event CRUD (createEvent, updateEvent, deleteEvent, listEvents)
2. Add permission checks in update/delete operations (reject if source === GOOGLE_CALENDAR)
3. Integrate Prisma Client into existing lib/events.ts logic
4. Replace in-memory event storage with database persistence

**No Blockers.**

---
*Phase: 01-data-foundation*
*Completed: 2026-02-02*
