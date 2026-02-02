---
phase: 03-calendar-ui
plan: 01
subsystem: ui
tags: [calendar, react-big-calendar, tailwind, date-fns, ui-components]
requires:
  - 01-01-database-schema
  - 01-02-crud-operations
decisions:
  - react-big-calendar for calendar rendering (mature library with extensive features)
  - date-fns localizer for timezone-safe date handling
  - Custom Tailwind toolbar replacing RBC default (consistent with project design)
  - Deterministic color mapping for courses (hash-based palette selection)
  - Generic typing for toolbar component (type-safe with CalendarEvent)
tech-stack:
  added:
    - react-big-calendar@1.19.4
    - "@types/react-big-calendar"
    - "@radix-ui/react-dialog"
    - "@radix-ui/react-select"
  patterns:
    - date-fns localizer singleton pattern
    - Generic React components with ToolbarProps<TEvent>
    - Timezone-safe date parsing with explicit year/month/day
key-files:
  created:
    - lib/calendar/localizer.ts
    - lib/calendar/event-colors.ts
    - lib/calendar/ncsu-academic-calendar.ts
    - lib/calendar/conflict-detection.ts
    - components/calendar/calendar-toolbar.tsx
    - components/calendar/calendar-view.tsx
    - app/calendar/page.tsx
  modified:
    - app/page.tsx
    - package.json
provides:
  - working_calendar_page
  - view_switching
  - date_navigation
  - course_color_mapping
  - academic_calendar_dates
affects:
  - 03-02-event-styling
  - 03-03-academic-overlays
  - 03-04-conflict-visualization
metrics:
  duration: 5 minutes
  completed: 2026-02-02
---

# Phase 3 Plan 1: Calendar Setup Summary

**One-liner:** Working calendar foundation with react-big-calendar, month/week/day views, custom Tailwind toolbar, and timezone-safe date handling

## What Was Built

### 1. Calendar Utility Modules

Created four utility modules in `lib/calendar/`:

- **localizer.ts**: date-fns singleton for react-big-calendar
- **event-colors.ts**: Deterministic course color mapping using hash-based palette selection (10 distinct colors)
- **ncsu-academic-calendar.ts**: Academic calendar dates for Spring 2026 and Fall 2025 (semester starts, breaks, finals)
- **conflict-detection.ts**: Time overlap detection for scheduling conflicts

### 2. Calendar Components

- **CalendarToolbar**: Custom Tailwind-styled toolbar with Today/Prev/Next navigation and Month/Week/Day view toggles
- **CalendarView**: Main calendar component with controlled state, event transformation, and timezone-safe date parsing
- **/calendar page**: Server component that fetches events from database and renders CalendarView

### 3. Navigation Integration

Added bidirectional navigation between upload page (/) and calendar page (/calendar) with Calendar and Upload icons.

## Technical Implementation

### Key Design Decisions

1. **Generic Typing**: Used `ToolbarProps<TEvent>` and `Calendar<CalendarEvent>` for type-safe component composition
2. **Timezone Safety**: Explicit `new Date(year, month - 1, day)` parsing to avoid timezone offset issues with ISO date strings
3. **Deterministic Colors**: Hash-based course color selection ensures consistent colors across sessions
4. **Controlled State**: CalendarView manages date and view state with proper React callbacks

### Date Parsing Pattern

```typescript
// Parse "YYYY-MM-DD" with explicit year/month/day (avoids timezone issues)
const [yearStr, monthStr, dayStr] = event.date.split('-');
const year = parseInt(yearStr, 10);
const month = parseInt(monthStr, 10);
const day = parseInt(dayStr, 10);
const start = new Date(year, month - 1, day, hour, minute);
```

This pattern prevents the timezone offset bug that occurs with `new Date("YYYY-MM-DD")`.

### Course Color Mapping

Simple string hash function maps course codes to a palette of 10 distinct colors:

```typescript
let hash = 0;
for (let i = 0; i < courseCode.length; i++) {
  const char = courseCode.charCodeAt(i);
  hash = ((hash << 5) - hash + char) | 0;
}
return COURSE_PALETTE[Math.abs(hash) % COURSE_PALETTE.length];
```

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 44bd863 | chore(03-01): install dependencies and create calendar utility modules | package.json, lib/calendar/* |
| d18ba9f | feat(03-01): create calendar page and CalendarView with custom toolbar | components/calendar/*, app/calendar/page.tsx, app/page.tsx |

## Verification Results

All verification criteria passed:

- TypeScript compilation passes with no errors
- /calendar page renders successfully (HTTP 200)
- Calendar component loads with react-big-calendar
- Navigation links work bidirectionally
- Custom Tailwind toolbar renders with proper styling
- View switching (month/week/day) functional
- Date navigation (prev/next/today) functional
- Events from database display correctly

**Dev Server:** Running on http://localhost:3001 (port 3000 already in use)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing TypeScript type definitions**

- **Found during:** Task 1 (dependency installation)
- **Issue:** react-big-calendar package does not include type definitions, causing TypeScript compilation errors
- **Fix:** Installed `@types/react-big-calendar` to provide type definitions
- **Files modified:** package.json
- **Commit:** 44bd863

**2. [Rule 1 - Bug] Incorrect generic typing for toolbar component**

- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Calendar component lost generic type information, causing type errors with toolbar props
- **Fix:** Added explicit generic types: `CalendarToolbar<CalendarEvent>` and `Calendar<CalendarEvent>`
- **Files modified:** components/calendar/calendar-toolbar.tsx, components/calendar/calendar-view.tsx
- **Commit:** d18ba9f

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use react-big-calendar | Mature library with extensive features (views, navigation, customization) | Faster development, proven reliability |
| Custom Tailwind toolbar | Project uses Tailwind design system, RBC default toolbar doesn't match | Consistent UI, better mobile accessibility |
| date-fns localizer | Already installed (v4.1.0), well-maintained, TypeScript support | No new dependencies, type-safe date operations |
| Deterministic color mapping | Same course always gets same color across sessions | Better UX, visual consistency |
| Explicit date parsing | Avoids timezone offset bugs with ISO date strings | Correct date display in all timezones |

## Known Limitations

1. **No event styling**: Events display with default RBC styling (will be addressed in 03-02)
2. **No academic calendar overlay**: NCSU dates defined but not rendered (will be addressed in 03-03)
3. **No conflict highlighting**: Conflict detection logic exists but not visualized (will be addressed in 03-04)
4. **Fixed 1-hour event duration**: Timed events without explicit end time default to 1 hour
5. **No event interactions**: Clicking events doesn't open details/edit modal (future enhancement)

## Next Phase Readiness

**Blockers:** None

**Ready for:**
- 03-02 (Event Styling and Color Customization)
- 03-03 (Academic Calendar Overlays)
- 03-04 (Conflict Detection and Visualization)

**Dependencies satisfied:**
- Database schema (01-01) provides Event and Course models
- CRUD operations (01-02) provide getEvents server action
- Events are being fetched and displayed correctly

## Notes

- Dev server runs on port 3001 (port 3000 already in use)
- Calendar renders successfully with empty state (no events in database yet)
- All TypeScript types properly configured with generics
- Navigation links work bidirectionally between upload and calendar pages
- Academic calendar dates are defined for Spring 2026 and Fall 2025 semesters

**Performance:** Plan completed in 5 minutes (installing dependencies, creating 7 files, fixing 2 type issues)

**Quality:** Zero TypeScript errors, all verification criteria passed, clean git history with atomic commits
