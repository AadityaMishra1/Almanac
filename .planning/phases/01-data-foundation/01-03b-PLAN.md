---
phase: 01-data-foundation
plan: 03b
type: execute
wave: 4
depends_on: ["01-03a"]
files_modified:
  - components/syllabus-to-calendar.tsx
  - app/server-actions/calendar.ts
autonomous: false

must_haves:
  truths:
    - "UI displays events from database after PDF parsing"
    - "Sync button works with database-backed events"
    - "Synced events have googleEventId populated in database"
    - "Full upload-parse-sync-verify flow completes successfully"
  artifacts:
    - path: "components/syllabus-to-calendar.tsx"
      provides: "Updated UI loading events from database"
      contains: "getEvents"
      min_lines: 100
    - path: "app/server-actions/calendar.ts"
      provides: "Updated sync action populating googleEventId"
      contains: "await updateEvent"
      min_lines: 80
  key_links:
    - from: "components/syllabus-to-calendar"
      to: "getEvents server action"
      via: "loads events from database after parse"
      pattern: "getEvents\\("
    - from: "syncEventsToCalendar"
      to: "updateEvent server action"
      via: "updates events with googleEventId after sync"
      pattern: "updateEvent.*googleEventId"
---

<objective>
Update UI to load events from database and modify Google Calendar sync to populate event IDs. Breaking changes to UI flow with full end-to-end testing.

**Purpose:** Complete data foundation by ensuring UI displays database-backed events and sync updates event metadata. Enable future features (calendar UI, bidirectional sync, AI chat).

**Output:** UI components and sync logic working with database. Full upload → parse → sync → verify flow functional.
</objective>

<execution_context>
@/Users/aadityamishra/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aadityamishra/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/aadityamishra/Projects/almanac/.planning/PROJECT.md
@/Users/aadityamishra/Projects/almanac/.planning/ROADMAP.md
@/Users/aadityamishra/Projects/almanac/.planning/codebase/ARCHITECTURE.md
@/Users/aadityamishra/Projects/almanac/components/syllabus-to-calendar.tsx
@/Users/aadityamishra/Projects/almanac/app/server-actions/calendar.ts
@/Users/aadityamishra/Projects/almanac/.planning/phases/01-data-foundation/01-01-PLAN.md
@/Users/aadityamishra/Projects/almanac/.planning/phases/01-data-foundation/01-02-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Update UI to add course input field and load events from database</name>
  <files>
    components/syllabus-to-calendar.tsx
  </files>
  <action>
Modify `components/syllabus-to-calendar.tsx` to:
1. Add course name input field
2. Load events from database after parsing (instead of using transient parse response)
3. Update sync button to work with database event IDs

**Add imports:**
```typescript
import { getEvents } from "@/app/server-actions/events";
import type { Event } from "@prisma/client";
import { prismaEventToSyllabus } from "@/lib/events";
```

**Update state:**
```typescript
// Add course ID state
const [courseId, setCourseId] = React.useState<string | null>(null);

// Add course name input state
const [courseName, setCourseName] = React.useState("");

// Change rows type to include database IDs
type Row = SyllabusEvent & { selected: boolean; id?: string };
```

**Update handlePdf function:**
```typescript
async function handlePdf(file: File) {
  setIsParsing(true);
  setError(null);

  // Validate course name before parsing
  if (!courseName.trim()) {
    setError("Please enter a course name before uploading.");
    setIsParsing(false);
    return;
  }

  try {
    const form = new FormData();
    form.set("file", file);
    form.set("courseName", courseName.trim());

    const res = await fetch("/api/parse", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Parse failed");

    // Parse response contains { success, courseId, courseName, eventIds, events }
    const { courseId: parsedCourseId, eventIds } = json;

    if (!parsedCourseId || !eventIds) {
      throw new Error("Invalid parse response: missing courseId or eventIds");
    }

    // Store course ID for sync
    setCourseId(parsedCourseId);

    // Load events from database by course ID (not using transient parse response)
    const eventsResult = await getEvents({ courseId: parsedCourseId });

    if (!eventsResult.ok) {
      throw new Error(eventsResult.error);
    }

    // Convert database events to UI format and add selection state
    const loadedRows = eventsResult.events.map((dbEvent) => ({
      ...prismaEventToSyllabus(dbEvent),
      selected: true,
      id: dbEvent.id, // Store database ID for sync
    }));

    setRows(loadedRows);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Something went wrong while parsing.");
  } finally {
    setIsParsing(false);
  }
}
```

**Update handleSync function:**
```typescript
async function handleSync() {
  setIsSyncing(true);
  setError(null);
  try {
    // Get selected event IDs (not event objects)
    const selectedEventIds = rows
      .filter((r) => r.selected && r.id)
      .map((r) => r.id!);

    if (selectedEventIds.length === 0) {
      throw new Error("No events selected for sync.");
    }

    // Call sync with event IDs
    const result = await syncEventsToCalendar(selectedEventIds);
    if (!result.ok) throw new Error(result.error);

    // Reload events from database to show updated googleEventId
    if (courseId) {
      const eventsResult = await getEvents({ courseId });
      if (eventsResult.ok) {
        const reloadedRows = eventsResult.events.map((dbEvent) => ({
          ...prismaEventToSyllabus(dbEvent),
          selected: rows.find((r) => r.id === dbEvent.id)?.selected ?? false,
          id: dbEvent.id,
        }));
        setRows(reloadedRows);
      }
    }
  } catch (e) {
    setError(e instanceof Error ? e.message : "Calendar sync failed.");
  } finally {
    setIsSyncing(false);
  }
}
```

**Update JSX to add course input field:**
```typescript
return (
  <section className="space-y-6">
    {/* Course name input field */}
    <div className="space-y-2">
      <label htmlFor="courseName" className="text-sm font-medium text-zinc-700">
        Course Name
      </label>
      <input
        id="courseName"
        type="text"
        placeholder="e.g., Data Structures"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
        disabled={isParsing}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <p className="text-xs text-zinc-500">
        Enter the course name before uploading your syllabus. Phase 2 will extract this automatically.
      </p>
    </div>

    <UploadDropzone onFile={handlePdf} isBusy={isParsing} />

    {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

    {rows.length ? (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600">
            {selectedCount} selected / {rows.length} extracted
          </div>
          <Button
            onClick={handleSync}
            disabled={!selectedCount || isSyncing || !session?.accessToken}
            variant="default"
          >
            {session?.accessToken ? (isSyncing ? "Syncing..." : "Sync to Google Calendar") : "Sign in to sync"}
          </Button>
        </div>
        <EventsTable rows={rows} onChange={setRows} />
        <div className="text-xs text-zinc-500">
          Tip: Edit titles/dates before syncing. Dates are treated as all-day events.
        </div>
      </div>
    ) : null}
  </section>
);
```

**Why these changes:**
- **Course input field**: Simple text input for Phase 1 (Phase 2 will auto-extract)
- **Database loading**: UI fetches events from database (not parse response)
- **Event IDs in state**: Store database IDs for sync operation
- **Reload after sync**: Shows updated googleEventId (future feature visibility)

**Breaking change:**
- UI no longer works with transient parse response
- Requires database persistence (established in Plan 01-03a)
- Full integration test needed (checkpoint task below)
  </action>
  <verify>
- [ ] `components/syllabus-to-calendar.tsx` imports `getEvents` and `prismaEventToSyllabus`
- [ ] Component has course name input field
- [ ] `handlePdf` validates course name before upload
- [ ] `handlePdf` calls `getEvents({ courseId })` after parsing
- [ ] `handleSync` passes event IDs (not event objects) to sync function
- [ ] `handleSync` reloads events from database after sync
- [ ] No TypeScript errors
  </verify>
  <done>
UI updated to add course input field, load events from database after parsing, and sync using database event IDs. Breaking change complete.
  </done>
</task>

<task type="auto">
  <name>Update Google Calendar sync to populate googleEventId</name>
  <files>
    app/server-actions/calendar.ts
  </files>
  <action>
Modify `syncEventsToCalendar()` in `app/server-actions/calendar.ts` to:
1. Accept event IDs instead of event objects
2. Fetch events from database
3. Update events with Google Calendar event IDs after sync

**Add imports:**
```typescript
import { prisma } from "@/lib/db";
import { updateEvent } from "@/app/server-actions/events";
```

**Replace current function signature and body:**

```typescript
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarClient } from "@/lib/google";
import { prisma } from "@/lib/db";
import { updateEvent } from "@/app/server-actions/events";

function addDays(isoDate: string, days: number) {
  // Keep existing implementation
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function syncEventsToCalendar(
  eventIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return { ok: false, error: "Not signed in (or missing Google access token)." };
    }

    // Fetch events from database by IDs
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
      },
      include: {
        course: true,
      },
    });

    if (events.length === 0) {
      return { ok: false, error: "No events found to sync." };
    }

    const calendar = getCalendarClient(accessToken);

    // Insert each event to Google Calendar and update database with googleEventId
    for (const event of events) {
      const startDate = event.date;
      const endDate = addDays(event.date, 1);

      // Insert to Google Calendar
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
        // Update database event with Google Calendar ID
        await updateEvent(event.id, {
          googleEventId,
        });
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Calendar sync failed." };
  }
}
```

**Why update googleEventId:**
- Enables duplicate prevention (Phase 4 bidirectional sync)
- Links local event to Google Calendar event (can update/delete remotely)
- Prerequisite for sync conflict resolution

**Why include course in description:**
- Google Calendar doesn't have course field
- Embeds course context in description for mobile/web calendar view
- User sees "Course: Data Structures (DATA-STRUCTURES)" in Google Calendar

**Breaking change:**
- Function signature changed from `(events: SyllabusEvent[])` to `(eventIds: string[])`
- Requires database persistence (established in Plan 01-03a)
- Requires `updateEvent` signature with `googleEventId` (established in Plan 01-02)
  </action>
  <verify>
- [ ] `app/server-actions/calendar.ts` imports `prisma` and `updateEvent`
- [ ] `syncEventsToCalendar()` signature is `(eventIds: string[])`
- [ ] Function fetches events from database using `prisma.event.findMany`
- [ ] Function includes course data via `include: { course: true }`
- [ ] Function updates each event with `googleEventId` after sync
- [ ] No TypeScript errors
  </verify>
  <done>
Google Calendar sync updated to accept event IDs, fetch from database, and populate googleEventId in database. Breaking change complete.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Complete end-to-end data foundation: UI with course input → database persistence → Google Calendar sync with ID tracking.
  </what-built>
  <how-to-verify>
**End-to-end flow test:**

1. **Setup:**
   - Start development server: `npm run dev`
   - Open Prisma Studio in separate terminal: `npx prisma studio`
   - Leave Prisma Studio open to watch database changes in real-time

2. **Test PDF upload with course input:**
   - Navigate to http://localhost:3000
   - Sign in with Google (if not already authenticated)
   - In "Course Name" field, type: **"Data Structures"**
   - Upload a sample PDF syllabus with events
   - Wait for parsing to complete

3. **Verify database persistence:**
   - In Prisma Studio, refresh `courses` table
   - Should see 1 course: `name: "Data Structures"`, `code: "DATA-STRUCTURES"`
   - Refresh `events` table
   - Should see parsed events with:
     - `source: ALMANAC`
     - `editable: true`
     - `courseId` matching created course
     - `googleEventId: null` (not yet synced)

4. **Verify UI displays database-backed events:**
   - Events should appear in table below upload area
   - All events selected by default
   - Event count shows "{N} selected / {N} extracted"

5. **Test sync to Google Calendar:**
   - Click "Sync to Google Calendar" button
   - Wait for success (button changes from "Syncing..." back to "Sync to Google Calendar")
   - No error message should appear

6. **Verify Google Calendar ID population:**
   - In Prisma Studio, refresh `events` table
   - `googleEventId` field should now be populated (not null) for synced events
   - Copy one `googleEventId` value for verification

7. **Verify Google Calendar integration:**
   - Open Google Calendar: https://calendar.google.com
   - Navigate to date of synced event
   - Should see event with title from PDF
   - Click event → description should include:
     - Event type (e.g., "exam", "assignment")
     - Course context: "Course: Data Structures (DATA-STRUCTURES)"

8. **Test error handling:**
   - Try uploading PDF **without entering course name**
   - Should see error: "Please enter a course name before uploading."
   - Enter course name, then upload → should work

9. **Test course reuse (idempotent):**
   - Upload another PDF with same course name "Data Structures"
   - Should reuse existing course (check Prisma Studio - still only 1 course)
   - New events should be added to same course

**Expected outcomes:**
- ✅ Course input field visible and required
- ✅ PDF upload creates course from user input (not filename)
- ✅ Events persist to database with `source: ALMANAC`, `editable: true`
- ✅ UI loads events from database (not transient parse response)
- ✅ Sync populates `googleEventId` field in database
- ✅ Google Calendar shows synced events with course context in description
- ✅ Error if course name missing
- ✅ Course reuse works (getOrCreateCourse idempotent)

**Common issues and fixes:**

**"Course name is required" error:**
- Make sure to enter course name in input field before uploading PDF

**Events not appearing in UI after parsing:**
- Check browser console for errors
- Verify `getEvents({ courseId })` call in Network tab
- Check Prisma Studio - events should be in database

**Sync fails with "Not signed in":**
- Re-authenticate with Google OAuth
- Check session access token in browser DevTools

**Events not appearing in Google Calendar:**
- Verify Google Calendar API scope in `lib/auth.ts` includes calendar write access
- Check Google Calendar API is enabled in Google Cloud Console
- Try refreshing Google Calendar page

**TypeScript errors:**
- Run `npx prisma generate` to regenerate Prisma Client types
- Restart Next.js dev server

**Database schema mismatch:**
- Run `npx prisma migrate dev` to apply latest migrations
  </how-to-verify>
  <resume-signal>
Type "approved" if full flow works (upload → database → UI → sync → Google Calendar), or describe failures.
  </resume-signal>
</task>

</tasks>

<verification>

## Database State Verification

```bash
npx prisma studio
```

After full flow test:
- [ ] `courses` table has entry with `code` derived from course name
- [ ] `events` table has entries with:
  - `source: ALMANAC` for parsed events
  - `editable: true` for ALMANAC events
  - `googleEventId` populated after sync (not null)
  - `courseId` foreign key links to `courses` table

## Type Safety Check

```typescript
import { syncEventsToCalendar } from '@/app/server-actions/calendar';

async function test() {
  const eventIds = ["event-id-1", "event-id-2"];
  const result = await syncEventsToCalendar(eventIds);

  if (result.ok) {
    console.log("Sync succeeded");
  }
}
```

## Integration Flow Test

End-to-end verification:
1. Enter course name → upload PDF → database populated
2. UI loads events from database (not parse response)
3. Sync to Google Calendar → googleEventId updated in database
4. View in Google Calendar → events visible with course context in description
5. Upload another PDF with same course name → reuses existing course

</verification>

<success_criteria>

1. **UI integration complete:**
   - Course name input field visible and functional
   - Upload validation requires course name
   - `handlePdf` loads events from database via `getEvents({ courseId })`
   - `handleSync` passes event IDs to sync function
   - UI reloads events after sync to show updated metadata

2. **Google Calendar sync updated:**
   - `syncEventsToCalendar()` accepts event IDs (not event objects)
   - Fetches events from database before syncing
   - Updates events with `googleEventId` after successful sync
   - Google Calendar description includes course context

3. **Data foundation requirements met:**
   - ✅ DATA-01: System persists events locally with metadata (source, courseId, editable)
   - ✅ DATA-02: System distinguishes Almanac vs external events (source field)
   - ✅ DATA-03: System enforces read-only on external events (tested in Plan 01-02)
   - ✅ DATA-04: Schema includes all critical fields (title, date, time, type, course, source, editable)

4. **End-to-end flow functional:**
   - PDF upload with course name → database persistence → UI display → Google Calendar sync → ID tracking
   - No data loss (events survive page refresh because stored in database)
   - Course input captured from user (Phase 2 will enhance with LLM extraction)
   - Ready for Phase 3 (Calendar UI can query database)

5. **Breaking changes verified:**
   - UI no longer uses transient parse response
   - Sync no longer accepts event objects
   - Full integration test passed (checkpoint approved)

</success_criteria>

<output>
After completion, create `.planning/phases/01-data-foundation/01-03b-SUMMARY.md` documenting:
- UI changes (course input field, database loading)
- Updated sync flow (event IDs → database fetch → googleEventId update)
- End-to-end data flow (upload → parse → persist → sync → verify)
- Known limitations (manual course input for Phase 1)
- Integration points for Phase 2 (LLM course extraction) and Phase 3 (calendar UI queries)
- Testing procedure for full flow verification
</output>
