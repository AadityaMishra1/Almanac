# Phase 3: Calendar UI - Research

**Researched:** 2026-02-02
**Domain:** React calendar rendering, event visualization, responsive calendar UX
**Confidence:** HIGH

## Summary

Phase 3 requires building a calendar UI with month/week/day views that displays events from the existing Prisma database, supports inline editing, color-codes by course, detects time conflicts, overlays NCSU academic dates, and works on mobile. The project already uses Next.js 15 (App Router), React 19, Tailwind CSS 3, date-fns 4, Radix UI primitives, and lucide-react.

Two calendar libraries were thoroughly evaluated: **react-big-calendar** (v1.19.4, ~520K weekly npm downloads, MIT license) and **Schedule X** (v4.1.0, ~3.3K weekly downloads, open-source core + premium plugins). Both support React 19 in their peer dependencies.

**Primary recommendation:** Use **react-big-calendar** with the date-fns localizer. It is the most mature React calendar library, has the largest community, is fully MIT-licensed (no premium upsell), already supports date-fns (which the project uses), provides built-in month/week/day/agenda views, background events for the academic overlay, custom event rendering via component slots, and `eventPropGetter` for color-coding. Its controlled component pattern (managing `date` and `view` state externally) is required for Next.js App Router compatibility and is well-documented.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-big-calendar | 1.19.4 | Month/week/day calendar views with event rendering | ~520K weekly downloads, MIT, built for React, date-fns localizer, Google Calendar-style UI |
| date-fns | 4.1.0 | Date manipulation + RBC localizer | Already in project, tree-shakable, immutable, provides RBC localizer |
| lucide-react | 0.542.0 | Icons (chevrons, calendar, clock, etc.) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | latest | Event detail modal/sidebar | Click-to-view-details modal (CAL-02) |
| @radix-ui/react-popover | latest | Date picker popover | Navigation date picker (CAL-08) |
| @radix-ui/react-select | latest | View selector dropdown (mobile) | Mobile view switching |
| react-day-picker | latest | Date picker for navigation | Optional: mini calendar for date jumping (CAL-08) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-big-calendar | Schedule X (v4.1.0) | Modern API, built-in dark mode, responsive auto-switch, but: only ~3.3K npm downloads, requires temporal-polyfill (+20KB gzipped), premium plugins needed for interactive event modal, less community support, younger project with less battle-testing |
| react-big-calendar | FullCalendar | More features out-of-box (drag & drop), but: JavaScript wrapper (not React-native), premium features require license, heavier bundle (~82KB), more complex setup with plugins |
| react-big-calendar | Custom from scratch | Full control, but: estimated 40-60 hours vs 4-8 hours with library, must handle all edge cases (overlap rendering, all-day positioning, responsive layout, keyboard nav, ARIA) manually |
| react-day-picker | Native date input | Simpler, but: less consistent cross-browser, no mini-calendar visual |

**Installation:**
```bash
npm install react-big-calendar
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-select
```

Note: date-fns is already installed (v4.1.0). react-big-calendar's CSS must be imported.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── page.tsx                           # Existing: upload flow
├── calendar/
│   └── page.tsx                       # New: calendar view page
components/
├── calendar/
│   ├── calendar-view.tsx              # Main calendar component (month/week/day)
│   ├── calendar-toolbar.tsx           # Custom toolbar (view switch, nav, Today button)
│   ├── calendar-event.tsx             # Custom event rendering (color-coded chip)
│   ├── event-detail-modal.tsx         # Event detail modal (CAL-02, CAL-03)
│   ├── conflict-indicator.tsx         # Overlap/conflict warning badge
│   ├── academic-overlay.tsx           # NCSU academic calendar data + helpers
│   └── date-navigator.tsx             # Date picker for navigation (CAL-08)
├── ui/
│   ├── dialog.tsx                     # Radix Dialog wrapper (new)
│   ├── popover.tsx                    # Radix Popover wrapper (new)
│   └── select.tsx                     # Radix Select wrapper (new)
lib/
├── calendar/
│   ├── localizer.ts                   # date-fns localizer singleton
│   ├── ncsu-academic-calendar.ts      # NCSU dates data + helpers
│   ├── event-colors.ts                # Course/type color mapping
│   └── conflict-detection.ts          # Time overlap detection logic
app/
├── server-actions/
│   └── events.ts                      # Existing: getEvents (add date range filter)
```

### Pattern 1: Controlled Calendar Component (Required for Next.js App Router)
**What:** Manage `date` and `view` state externally via React useState, pass to Calendar as props
**When to use:** Always in Next.js App Router (react-big-calendar buttons break without this)
**Example:**
```tsx
// Source: Context7 /jquense/react-big-calendar + Next.js community fix
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<keyof typeof Views>('month');

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const onView = useCallback((newView: keyof typeof Views) => setView(newView), []);

  return (
    <Calendar
      localizer={localizer}
      events={events}
      date={date}
      view={view}
      onNavigate={onNavigate}
      onView={onView}
      views={['month', 'week', 'day']}
      style={{ height: '100%' }}
    />
  );
}
```

### Pattern 2: Event Color-Coding via eventPropGetter
**What:** Dynamically style events based on course color or event type
**When to use:** CAL-04 (color-coded by course or event type)
**Example:**
```tsx
// Source: Context7 /jquense/react-big-calendar - Custom Event Styling
const eventPropGetter = useCallback((event: CalendarEvent) => {
  const courseColor = event.courseColor || '#3b82f6'; // fallback blue
  return {
    style: {
      backgroundColor: courseColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
    },
  };
}, []);

<Calendar eventPropGetter={eventPropGetter} /* ...other props */ />
```

### Pattern 3: Background Events for Academic Calendar Overlay
**What:** Use react-big-calendar's `backgroundEvents` prop for non-interactive overlay
**When to use:** CAL-06 (NCSU academic calendar overlay)
**Example:**
```tsx
// Source: Context7 /jquense/react-big-calendar - Background Events
const academicEvents = [
  { title: 'Spring Break', start: new Date(2026, 2, 16), end: new Date(2026, 2, 21), allDay: true },
  { title: 'Finals Week', start: new Date(2026, 3, 30), end: new Date(2026, 4, 7), allDay: true },
];

const backgroundEventPropGetter = () => ({
  style: { backgroundColor: '#fef3c7', borderLeft: '3px solid #f59e0b', opacity: 0.4 },
});

<Calendar
  events={userEvents}
  backgroundEvents={academicEvents}
  backgroundEventPropGetter={backgroundEventPropGetter}
/>
```

### Pattern 4: Custom Toolbar with Tailwind Styling
**What:** Replace default RBC toolbar with custom component matching project design
**When to use:** Always (CAL-08, CAL-11 for Today button, view switches, date navigation)
**Example:**
```tsx
// Source: Context7 /jquense/react-big-calendar - Custom Components
const components = useMemo(() => ({
  toolbar: CustomToolbar,
  event: CustomEventChip,
}), []);

<Calendar components={components} /* ...other props */ />
```

### Pattern 5: Event Data Adapter (Prisma Event to RBC Event)
**What:** Transform Prisma Event model to react-big-calendar event format
**When to use:** Always (RBC requires `start: Date` and `end: Date`, not ISO strings)
**Example:**
```tsx
// Prisma Event has: date (string "YYYY-MM-DD"), time (string "HH:MM" | null)
// RBC needs: start (Date), end (Date), allDay (boolean)
function prismaEventToCalendarEvent(event: Event & { course: Course }): CalendarEvent {
  const [year, month, day] = event.date.split('-').map(Number);
  if (event.time) {
    const [hours, minutes] = event.time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour
    return { ...event, start, end, allDay: false, courseColor: event.course.color };
  }
  // All-day event
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { ...event, start, end, allDay: true, courseColor: event.course.color };
}
```

### Anti-Patterns to Avoid
- **Uncontrolled RBC in Next.js App Router:** Never use react-big-calendar without externally managed `date` and `view` state. The navigation buttons silently fail in Next.js dev mode.
- **Fetching all events upfront:** Use date-range queries via `getEvents({ startDate, endDate })` tied to the visible calendar range, not a global fetch.
- **Inline CSS for event colors:** Use `eventPropGetter` callback, not inline styles on custom event components. The callback has access to event data and selection state.
- **Building custom month/week/day grid layout:** Never hand-roll calendar grid calculations. The overlap algorithm for week/day views (positioning concurrent events side-by-side) is extremely complex.
- **Storing Date objects in state:** Keep ISO string dates in the database and server actions. Only convert to Date objects at the calendar component boundary.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month/week/day grid layout | CSS Grid calendar from scratch | react-big-calendar views | Overlap positioning, all-day row, responsive sizing are deeply complex (~40-60 hours to build) |
| Event overlap rendering | Custom overlap detection + positioning | RBC's built-in overlap algorithm | Concurrent events side-by-side in week/day view requires rectangle-packing algorithm |
| Date navigation (prev/next/today) | Custom month arithmetic | RBC's `Navigate` enum + `onNavigate` | Handles month boundaries, leap years, DST transitions correctly |
| All-day event row | Custom top-bar rendering | RBC's `allDay` prop on events | Proper overflow, "+N more" badge, correct positioning above timeline |
| Current time indicator | setInterval + scroll position | RBC's `scrollToTime` prop + CSS `::after` pseudo-element on current time slot | Auto-scrolls to relevant time, updates correctly across DST |
| Modal/dialog component | Custom div with backdrop | @radix-ui/react-dialog | Focus trap, escape handling, scroll lock, ARIA attributes, animation |
| Conflict detection | Complex interval tree | Simple O(n^2) sort + compare for student-scale data (< 500 events) | Student calendars are small; simple approach is sufficient and readable |

**Key insight:** Calendar UI is one of the most deceptively complex UI problems. The layout algorithm for positioning overlapping timed events in week/day view, the all-day event row with overflow, responsive behavior, keyboard navigation, and ARIA compliance represent months of work. react-big-calendar solves all of these.

## Common Pitfalls

### Pitfall 1: RBC Navigation Buttons Break in Next.js App Router
**What goes wrong:** Today/Back/Next/Month/Week/Day buttons stop responding to clicks
**Why it happens:** Next.js App Router components are server components by default. RBC manages internal state that conflicts with React Server Components.
**How to avoid:** Always use `'use client'` directive AND manage `date` and `view` state externally via `useState`. Pass `onNavigate` and `onView` callbacks.
**Warning signs:** Buttons render but clicking them does nothing in dev mode (`npm run dev`)

### Pitfall 2: ISO String to Date Object Conversion Errors
**What goes wrong:** Events appear on wrong dates or don't render at all
**Why it happens:** `new Date("2026-03-15")` is parsed as UTC midnight, which may display as the previous day in local timezone. The existing codebase uses ISO 8601 string dates (YYYY-MM-DD).
**How to avoid:** Parse date strings with explicit year/month/day components: `new Date(2026, 2, 15)` (month is 0-indexed). Use the adapter function pattern shown in Architecture Patterns.
**Warning signs:** Events shifted by one day, especially noticeable around midnight

### Pitfall 3: CSS Import Order and Tailwind Conflicts
**What goes wrong:** RBC calendar looks broken or unstyled; Tailwind resets override RBC styles
**Why it happens:** Tailwind's base reset (`@tailwind base`) strips default styles that RBC's CSS depends on. RBC's CSS must load in the correct order.
**How to avoid:** Import RBC CSS in the calendar component file (not in globals.css). If conflicts arise, use Tailwind's `@layer` to scope RBC styles. Override specific RBC classes with Tailwind utility classes.
**Warning signs:** Calendar grid has no borders, events are invisible, or layout is collapsed

### Pitfall 4: Fetching All Events on Every Navigation
**What goes wrong:** Calendar becomes slow as more events are added
**Why it happens:** Navigating to a new month triggers a re-render; if all events are fetched globally, re-rendering with a large dataset is wasteful.
**How to avoid:** Use `getEvents({ startDate, endDate })` filtered to the visible date range. The existing `getEvents` server action already supports `startDate` and `endDate` filters. Bind this to RBC's `onRangeChange` callback.
**Warning signs:** Increasing load times as semesters accumulate events

### Pitfall 5: Mobile Calendar Unusable Without Custom Toolbar
**What goes wrong:** Default RBC toolbar buttons are too small on mobile, view switching is cramped
**Why it happens:** RBC's default toolbar is designed for desktop and doesn't adapt to small screens
**How to avoid:** Build a custom toolbar component with Tailwind responsive classes. Use a dropdown/select for view switching on mobile. Make navigation buttons touch-friendly (min 44x44px tap targets).
**Warning signs:** Users can't reliably tap buttons on phones, toolbar wraps awkwardly

### Pitfall 6: Course Color Not Set in Database
**What goes wrong:** All events render with the same default color, no visual distinction
**Why it happens:** The `Course.color` field is nullable (`color String?`). Courses created during PDF upload in Phase 1 may not have colors assigned.
**How to avoid:** Implement a default color palette that auto-assigns colors to courses missing explicit colors. Generate colors deterministically from course code (hash-based) so colors are consistent.
**Warning signs:** All events appear as the same blue/gray color

## Code Examples

### date-fns Localizer Setup (Singleton)
```tsx
// lib/calendar/localizer.ts
// Source: Context7 /jquense/react-big-calendar - date-fns localizer setup
import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';

const locales = { 'en-US': enUS };

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
```

### NCSU Academic Calendar Data (Spring 2026)
```tsx
// lib/calendar/ncsu-academic-calendar.ts
// Source: NCSU Academic Calendar (https://studentservices.ncsu.edu/calendars/)
// Verified from official NCSU catalog PDF for 2025-2026

export interface AcademicDate {
  title: string;
  start: Date;
  end: Date;
  type: 'break' | 'finals' | 'holiday' | 'semester-start' | 'semester-end';
}

export const SPRING_2026: AcademicDate[] = [
  { title: 'Spring Semester Begins', start: new Date(2026, 0, 12), end: new Date(2026, 0, 13), type: 'semester-start' },
  { title: 'MLK Day - No Classes', start: new Date(2026, 0, 19), end: new Date(2026, 0, 20), type: 'holiday' },
  { title: 'Wellness Day', start: new Date(2026, 1, 17), end: new Date(2026, 1, 18), type: 'holiday' },
  { title: 'Spring Break', start: new Date(2026, 2, 16), end: new Date(2026, 2, 21), type: 'break' },
  { title: 'Last Day of Classes', start: new Date(2026, 3, 28), end: new Date(2026, 3, 29), type: 'semester-end' },
  { title: 'Reading Day', start: new Date(2026, 3, 29), end: new Date(2026, 3, 30), type: 'finals' },
  { title: 'Final Examinations', start: new Date(2026, 3, 30), end: new Date(2026, 4, 7), type: 'finals' },
];

export const FALL_2025: AcademicDate[] = [
  { title: 'Fall Semester Begins', start: new Date(2025, 7, 18), end: new Date(2025, 7, 19), type: 'semester-start' },
  { title: 'Labor Day', start: new Date(2025, 8, 1), end: new Date(2025, 8, 2), type: 'holiday' },
  { title: 'Wellness Day', start: new Date(2025, 8, 16), end: new Date(2025, 8, 17), type: 'holiday' },
  { title: 'Fall Break', start: new Date(2025, 9, 13), end: new Date(2025, 9, 15), type: 'break' },
  { title: 'Thanksgiving Break', start: new Date(2025, 10, 26), end: new Date(2025, 10, 29), type: 'break' },
  { title: 'Last Day of Classes', start: new Date(2025, 11, 2), end: new Date(2025, 11, 3), type: 'semester-end' },
  { title: 'Final Examinations', start: new Date(2025, 11, 4), end: new Date(2025, 11, 11), type: 'finals' },
];
```

### Conflict Detection (Simple Sort-Based)
```tsx
// lib/calendar/conflict-detection.ts
export interface TimeSlot {
  eventId: string;
  start: Date;
  end: Date;
}

export function findConflicts(events: TimeSlot[]): Set<string> {
  const conflicting = new Set<string>();
  // Sort by start time
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // If next event starts before current ends, they overlap
      if (sorted[j].start < sorted[i].end) {
        conflicting.add(sorted[i].eventId);
        conflicting.add(sorted[j].eventId);
      } else {
        break; // No more overlaps possible (sorted by start)
      }
    }
  }
  return conflicting;
}
```

### Default Course Color Palette
```tsx
// lib/calendar/event-colors.ts
// Deterministic color assignment for courses without explicit colors
const COURSE_PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export function getCourseColor(courseCode: string, explicitColor?: string | null): string {
  if (explicitColor) return explicitColor;
  // Deterministic hash so same course always gets same color
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = ((hash << 5) - hash + courseCode.charCodeAt(i)) | 0;
  }
  return COURSE_PALETTE[Math.abs(hash) % COURSE_PALETTE.length];
}
```

### Custom Event Component (Color-Coded Chip)
```tsx
// components/calendar/calendar-event.tsx
// Source: Context7 /jquense/react-big-calendar - Custom Event Rendering
interface CalendarEventProps {
  event: {
    title: string;
    type: string;
    courseCode: string;
    isConflicting: boolean;
  };
}

export function CalendarEventChip({ event }: CalendarEventProps) {
  return (
    <div className="flex items-center gap-1 truncate px-1 text-xs">
      <span className="truncate font-medium">{event.title}</span>
      {event.isConflicting && (
        <span className="shrink-0 text-[10px]" title="Time conflict">!</span>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment.js localizer | date-fns localizer | 2023+ | date-fns is tree-shakable, Moment is deprecated for new projects |
| Uncontrolled RBC state | Controlled component (external state) | Next.js 13.4+ | Required for App Router compatibility |
| CSS-in-JS event styling | eventPropGetter callback | Always available | Clean separation of styling logic from rendering |
| Full event fetch | Range-based fetching via onRangeChange | Best practice | Performance at scale |
| FullCalendar dominance | react-big-calendar growth | 2024-2025 | RBC surpassed FullCalendar in weekly npm downloads (~520K vs ~176K) |
| Custom date handling | Temporal API (TC39 Stage 3) | 2025+ | Future standard; Schedule X adopted it. Not yet in browsers. date-fns remains practical today |

**Deprecated/outdated:**
- Moment.js: Maintenance mode since 2020, replaced by date-fns/Day.js for new projects
- Globalize.js localizer: Rarely used, date-fns is the modern default
- FullCalendar React wrapper approach: Less idiomatic than RBC for React-only projects

## Open Questions

1. **Event Duration Defaults**
   - What we know: Current events have `time` (HH:MM) but no `endTime` field. react-big-calendar requires both `start` and `end` Date objects.
   - What's unclear: What default duration to use for timed events (1 hour? event-type dependent?)
   - Recommendation: Default to 1 hour for all timed events in Phase 3. Consider adding `endTime` to schema in a future phase if user feedback warrants it.

2. **Calendar Page Routing**
   - What we know: Currently single page at `/` with upload flow. Calendar needs its own route.
   - What's unclear: Should calendar be at `/calendar`, or should `/` become a dashboard with both upload and calendar?
   - Recommendation: Add `/calendar` route for dedicated calendar view. Keep `/` as-is for upload flow. Add navigation between them. Future phases can consolidate into a dashboard.

3. **Real-time Event Updates**
   - What we know: Events are fetched via server actions. After editing in calendar, database must be updated.
   - What's unclear: Whether to optimistically update the UI or wait for server confirmation.
   - Recommendation: Optimistic updates with rollback on error, using the existing `updateEvent` server action's discriminated union return type for error handling.

4. **Mobile View Default**
   - What we know: Month view can be cramped on mobile. Day view is most usable.
   - What's unclear: Whether to auto-switch to day view on mobile or let user choose.
   - Recommendation: Default to day view on screens < 768px via a responsive hook. User can override. This matches Google Calendar's mobile behavior.

## Sources

### Primary (HIGH confidence)
- Context7 `/jquense/react-big-calendar` - Setup, date-fns localizer, views config, custom components, event styling, background events, programmatic navigation, onSelectEvent
- Context7 `/schedule-x/schedule-x` - React/Next.js setup, views, events, callbacks, current-time plugin, event modal, calendars configuration, background events
- Context7 `/date-fns/date-fns` - Formatting, locale configuration, date comparison
- npm registry (direct `npm view`) - react-big-calendar 1.19.4 peer deps (React ^19), @schedule-x/react 4.1.0 peer deps (React ^19)

### Secondary (MEDIUM confidence)
- [NCSU Academic Calendar 2025-2026](https://studentservices.ncsu.edu/calendars/) - Semester dates, breaks, finals verified via official catalog PDF
- [Schedule X official docs](https://schedule-x.dev/docs/) - Event modal plugin (free), current time plugin (free), background events, responsive behavior, calendars configuration
- [react-big-calendar GitHub Issue #2701](https://github.com/jquense/react-big-calendar/issues/2701) - React 19 support confirmed (peer deps include ^19)
- [Next.js App Router RBC button fix](https://medium.com/@oktaykopcak/fix-react-big-calendar-buttons-in-next-js-2ad92601d55d) - Controlled component pattern required

### Tertiary (LOW confidence)
- [Builder.io React Calendar comparison 2025](https://www.builder.io/blog/best-react-calendar-component-ai) - Library comparison (editorial)
- [Bryntum FullCalendar vs Big Calendar](https://bryntum.com/blog/react-fullcalendar-vs-big-calendar/) - Feature comparison (vendor blog)
- [npm-compare statistics](https://npm-compare.com/calendar,fullcalendar,react-big-calendar) - Download trends

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-big-calendar verified via Context7 docs, npm registry (version, peer deps), extensive community usage (~520K weekly downloads), date-fns already in project
- Architecture: HIGH - Controlled component pattern verified across multiple sources; eventPropGetter, backgroundEvents, custom components all verified via Context7; Prisma schema analyzed directly
- Pitfalls: HIGH - Next.js App Router button bug confirmed via GitHub issues and community workarounds; ISO string date parsing trap is well-documented; CSS conflict is standard RBC + Tailwind issue

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable library, no major changes expected)
