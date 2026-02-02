---
phase: 04-event-management-sync
plan: 02
subsystem: sync
tags: [google-calendar, bidirectional-sync, sync-engine, react, server-actions]

# Dependency graph
requires:
  - phase: 04-event-management-sync
    plan: 01
    provides: Event CRUD operations, deleteGoogleCalendarEvent server action, googleEventId tracking
  - phase: 01-data-foundation
    provides: Database schema with EventSource enum, googleEventId field, editable flag
  - phase: 01-data-foundation
    provides: getOrCreateCourse for catch-all GCAL course
provides:
  - Bidirectional Google Calendar synchronization engine
  - fetchGoogleEvents module for importing external events
  - pushEventsToGoogle module for exporting Almanac events
  - runSync orchestrator with deduplication via googleEventId
  - syncCalendar server action with smart throttling
  - SyncStatusIndicator component with expandable details
  - Auto-sync on calendar page load
  - Manual sync trigger via toolbar button
  - External event styling (dashed border, reduced opacity)
affects: [04-03-event-edit, 05-ai-chatbot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level throttling (in-memory lastSyncTime for rate limiting)"
    - "Client-side + server-side rate limiting (10-second window)"
    - "Pagination handling for Google Calendar API (nextPageToken)"
    - "Auto-reset timer pattern for status transitions (done → idle after 5s)"
    - "Expandable popover details on status indicator click"

key-files:
  created:
    - lib/sync/fetch-google-events.ts
    - lib/sync/push-events.ts
    - lib/sync/sync-engine.ts
    - components/calendar/sync-status-indicator.tsx
  modified:
    - app/server-actions/calendar.ts
    - components/calendar/calendar-toolbar.tsx
    - components/calendar/calendar-view.tsx
    - app/calendar/page.tsx

key-decisions:
  - "Modular sync architecture: separate fetch/push/orchestration concerns for maintainability"
  - "GCAL catch-all course for external events (code: GCAL, semester: External)"
  - "Duplicate prevention via googleEventId unique constraint (skip if exists)"
  - "Try-catch per event: single failure doesn't block entire sync"
  - "External events default to 'other' type (no automatic categorization)"
  - "6-month time window for fetch (past and future) balances scope and performance"
  - "Smart throttling on both client and server (10-second window prevents spam)"
  - "Auto-sync on page load when hasGoogleAuth is true"
  - "Dashed border + 0.7 opacity for external events (visual distinction)"

patterns-established:
  - "SyncResult discriminated union for success/error handling"
  - "SyncStatus state machine: idle → syncing → done/error → idle"
  - "hasGoogleAuth prop controls whether sync features are enabled"
  - "router.refresh() after sync to fetch newly imported events"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 04 Plan 02: Bidirectional Google Calendar Sync Summary

**Full bidirectional sync with duplicate prevention, external event imports, and real-time status feedback enabling EVENT-05 and EVENT-06 requirements**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-02T18:38:15Z
- **Completed:** 2026-02-02T18:42:13Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Bidirectional sync engine fetches events from Google Calendar and pushes Almanac events
- External Google Calendar events imported as read-only with GOOGLE_CALENDAR source
- Duplicate prevention via googleEventId mapping (no double-push, no double-import)
- Sync status indicator shows real-time sync state with animations
- Auto-sync on calendar page load for authenticated users
- Manual sync button in toolbar for immediate refresh
- Smart throttling prevents excessive sync calls (10-second window)
- External events styled with dashed border and reduced opacity for visual distinction

## Task Commits

Each task was committed atomically:

1. **Task 1: Bidirectional Sync Engine** - `faa85e2` (feat)
   - fetchGoogleEvents: fetch from Google Calendar API with pagination
   - pushEventsToGoogle: push un-synced Almanac events to Google
   - runSync: orchestrate fetch + dedupe + push with error handling
   - syncCalendar server action with 10-second throttling

2. **Task 2: Sync Status Indicator and UI Integration** - `4e9e15b` (feat)
   - SyncStatusIndicator component with idle/syncing/done/error states
   - Expandable details popover showing fetched/pushed/skipped counts
   - CalendarToolbar integration (desktop and mobile)
   - CalendarView sync state management with handleSync function
   - Auto-sync on page load when user has Google auth
   - External events styled with dashed border and 0.7 opacity

## Files Created/Modified

- `lib/sync/fetch-google-events.ts` - Fetch events from Google Calendar API, handle all-day vs timed, pagination
- `lib/sync/push-events.ts` - Push un-synced ALMANAC events to Google Calendar, update local DB with googleEventId
- `lib/sync/sync-engine.ts` - Orchestrate full bidirectional sync: fetch → dedupe → import → push
- `components/calendar/sync-status-indicator.tsx` - Status badge with idle/syncing/done/error states, expandable details
- `app/server-actions/calendar.ts` - Added syncCalendar server action with module-level throttling
- `components/calendar/calendar-toolbar.tsx` - Added sync indicator to desktop and mobile layouts
- `components/calendar/calendar-view.tsx` - Sync state management, auto-sync on mount, handleSync function, external event styling
- `app/calendar/page.tsx` - Check session for hasGoogleAuth, pass to CalendarView

## Decisions Made

**Modular sync architecture (separate fetch/push/engine files):**
- Easier to test individual operations
- Clear separation of concerns
- Each module can be enhanced independently
- Push and fetch modules reusable in other contexts

**GCAL catch-all course for external events:**
- Avoids creating hundreds of courses for external calendars
- Single course (code: GCAL, name: Google Calendar, semester: External)
- Easy to filter/identify external events
- Can be enhanced later to parse course info from event descriptions

**Try-catch per event (not per batch):**
- One failing event doesn't block entire sync
- Errors collected in array for user feedback
- Console warnings for debugging
- Graceful degradation pattern

**6-month time window (past and future):**
- Balances comprehensive sync with API quota limits
- Covers typical semester duration (4-5 months)
- Reduces unnecessary historical data
- Can be adjusted via FetchOptions if needed

**Smart throttling on both client and server:**
- Client: prevents spam-clicking before request sent
- Server: prevents concurrent syncs from different tabs
- 10-second window is short enough for manual triggers
- Shows countdown message for better UX

**Auto-sync on page load (not background interval):**
- Simpler implementation for v1
- User controls when sync happens (page visit)
- Avoids battery drain on mobile
- Can add background sync in Phase 5 if needed

**Dashed border + reduced opacity for external events:**
- Clear visual distinction from Almanac events
- Maintains color palette consistency
- Doesn't rely on text labels (accessible)
- Aligns with common UI patterns for "external" content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Minor TypeScript inference issue in fetchGoogleEvents:**
- Google Calendar API response type caused implicit 'any' error
- Fixed by adding explicit `any` type annotation to response variable
- Does not affect functionality, just TypeScript strictness

## User Setup Required

**Google Calendar authentication:**
- User must sign in with Google OAuth to enable sync
- Sync indicator only appears when hasGoogleAuth is true
- Manual sync button triggers sync action
- No additional configuration needed

## Next Phase Readiness

**Ready for 04-03 (Event Edit & Validation):**
- External events are properly flagged as read-only (editable: false)
- EventDetailModal already checks editable flag before showing edit button
- Conflict detection logic can leverage existing TimeSlot interface
- All sync operations working end-to-end

**Blockers/Concerns:**
- None - all bidirectional sync requirements satisfied

**What's working:**
- EVENT-05: Bidirectional Google Calendar sync ✓
- EVENT-06: Duplicate prevention via googleEventId mapping ✓
- Sync status indicator with real-time feedback ✓
- Auto-sync on page load ✓
- Manual sync via toolbar button ✓
- External events styled distinctly ✓
- Smart throttling prevents excessive calls ✓

---
*Phase: 04-event-management-sync*
*Completed: 2026-02-02*
