---
phase: 01-data-foundation
plan: 03a
type: execute
wave: 3
depends_on: ["01-02"]
files_modified:
  - app/server-actions/courses.ts
  - app/api/parse/route.ts
autonomous: true

must_haves:
  truths:
    - "PDF parsing saves events to database before returning"
    - "Course is created from user input (simple text field for Phase 1)"
    - "Parse endpoint returns event IDs, not transient event data"
  artifacts:
    - path: "app/server-actions/courses.ts"
      provides: "Course CRUD operations"
      exports: ["createCourse", "getCourses", "getOrCreateCourse"]
      min_lines: 50
    - path: "app/api/parse/route.ts"
      provides: "Modified parse endpoint saving to database"
      contains: "await createEvent"
      min_lines: 80
  key_links:
    - from: "/api/parse"
      to: "createEvent server action"
      via: "saves parsed events to database"
      pattern: "createEvent\\("
    - from: "/api/parse"
      to: "getOrCreateCourse"
      via: "creates course from user input"
      pattern: "getOrCreateCourse\\("
---

<objective>
Add database persistence to PDF parsing flow with simple course input field. Events are saved to database with course association before any UI rendering.

**Purpose:** Establish persistent event storage that survives page refresh and enables future features (calendar UI, AI chat, sync). Use simple course input field for Phase 1 (Phase 2 will enhance with LLM extraction).

**Output:** Non-breaking changes to parse endpoint that save events to database. Existing UI continues to work. Course is captured via simple text input field.
</objective>

<execution_context>
@/Users/aadityamishra/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aadityamishra/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/aadityamishra/Projects/almanac/.planning/PROJECT.md
@/Users/aadityamishra/Projects/almanac/.planning/ROADMAP.md
@/Users/aadityamishra/Projects/almanac/.planning/codebase/ARCHITECTURE.md
@/Users/aadityamishra/Projects/almanac/app/api/parse/route.ts
@/Users/aadityamishra/Projects/almanac/components/syllabus-to-calendar.tsx
@/Users/aadityamishra/Projects/almanac/.planning/phases/01-data-foundation/01-01-PLAN.md
@/Users/aadityamishra/Projects/almanac/.planning/phases/01-data-foundation/01-02-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Create course management server actions</name>
  <files>
    app/server-actions/courses.ts
  </files>
  <action>
Create `app/server-actions/courses.ts` with course CRUD operations:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Course } from "@prisma/client";

const CreateCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

/**
 * Create a new course.
 * Course code must be unique.
 */
export async function createCourse(
  input: unknown
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
    const parsed = CreateCourseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid course data: " + parsed.error.message };
    }

    const course = await prisma.course.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        color: parsed.data.color || null,
      },
    });

    return { ok: true, course };
  } catch (e) {
    // Handle unique constraint violation (duplicate course code)
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { ok: false, error: `Course ${parsed.data?.code} already exists.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create course." };
  }
}

/**
 * Fetch all courses, optionally filtered by semester.
 */
export async function getCourses(filters?: {
  semester?: string;
}): Promise<{ ok: true; courses: Course[] } | { ok: false; error: string }> {
  try {
    const courses = await prisma.course.findMany({
      where: {
        semester: filters?.semester,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return { ok: true, courses };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch courses." };
  }
}

/**
 * Get existing course by code or create if doesn't exist.
 * Useful for PDF parsing flow where course may or may not exist.
 */
export async function getOrCreateCourse(
  input: CreateCourseInput
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
    const parsed = CreateCourseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid course data: " + parsed.error.message };
    }

    // Check if course exists
    const existing = await prisma.course.findUnique({
      where: { code: parsed.data.code },
    });

    if (existing) {
      return { ok: true, course: existing };
    }

    // Create new course
    const course = await prisma.course.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        color: parsed.data.color || null,
      },
    });

    return { ok: true, course };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to get or create course." };
  }
}
```

**Why getOrCreateCourse:**
- PDF parsing doesn't know if course exists in database
- Idempotent operation: safe to call multiple times (doesn't create duplicates)
- Simplifies parsing flow: no need to check existence separately

**Course uniqueness:**
- `code` field has unique constraint in schema (e.g., "CSC 316")
- Prevents duplicate courses in database
- Error handling for constraint violations

**Follow existing patterns:**
- Same discriminated union return type as event actions
- Zod validation for input
- Try-catch with error message extraction
  </action>
  <verify>
- [ ] `app/server-actions/courses.ts` file exists with "use server" pragma
- [ ] File exports: `createCourse`, `getCourses`, `getOrCreateCourse`
- [ ] Each function returns `{ ok: true; ... } | { ok: false; error: string }`
- [ ] No TypeScript errors
- [ ] Test: Call `getOrCreateCourse` twice with same code → returns same course (no duplicate)
  </verify>
  <done>
Course management server actions created with get-or-create pattern for PDF parsing integration.
  </done>
</task>

<task type="auto">
  <name>Update PDF parsing to persist events in database with course input</name>
  <files>
    app/api/parse/route.ts
  </files>
  <action>
Modify `app/api/parse/route.ts` to accept course name, save parsed events to database, and return event IDs.

**Current flow:** Upload PDF → extract text → parse with Groq → return JSON → UI displays
**New flow:** Upload PDF + course name → extract text → parse with Groq → save to database → return event IDs + course ID

**Add imports:**
```typescript
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { createEvent } from "@/app/server-actions/events";
import { syllabusEventToCreateInput } from "@/lib/events";
```

**Update POST handler to accept course name:**

The parse endpoint now expects a FormData with two fields:
- `file`: PDF file (existing)
- `courseName`: String (new - simple text input from user)

**After parsing events, before returning, add:**

```typescript
// After: const events = normalizeAndValidateEvents(extracted);

// Get course name from form data (user provided simple text input)
const courseName = form.get("courseName") as string | null;

if (!courseName || courseName.trim().length === 0) {
  return NextResponse.json(
    { error: "Course name is required. Please provide a course name." },
    { status: 400 }
  );
}

// Create course code from course name (simple approach for Phase 1)
// Phase 2 will extract course code from PDF with LLM
const courseCode = courseName.trim().toUpperCase().replace(/\s+/g, '-');
const semester = "Spring 2026"; // TODO Phase 2: Extract from PDF or add to UI input

// Get or create course
const courseResult = await getOrCreateCourse({
  code: courseCode,
  name: courseName.trim(),
  semester: semester,
  color: null, // Default color, user can change later in Phase 3
});

if (!courseResult.ok) {
  return NextResponse.json(
    { error: "Failed to create course: " + courseResult.error },
    { status: 500 }
  );
}

const course = courseResult.course;

// Save each event to database
const savedEventIds: string[] = [];
const errors: string[] = [];

for (const event of events) {
  const eventInput = syllabusEventToCreateInput(event, course.id);
  const result = await createEvent(eventInput);

  if (result.ok) {
    savedEventIds.push(result.event.id);
  } else {
    errors.push(`Failed to save "${event.title}": ${result.error}`);
  }
}

if (errors.length > 0 && savedEventIds.length === 0) {
  // All events failed to save
  return NextResponse.json(
    { error: "Failed to save events: " + errors.join(", ") },
    { status: 500 }
  );
}

// Return event IDs and course ID (not event data - UI will load from database in 01-03b)
// BUT also return events for backward compatibility with existing UI (01-03b will remove this)
return NextResponse.json({
  success: true,
  courseId: course.id,
  courseName: course.name,
  eventIds: savedEventIds,
  events, // Keep for backward compat with current UI (removed in 01-03b)
  partialErrors: errors.length > 0 ? errors : undefined,
});
```

**Why this approach:**
- **Simple course input for Phase 1**: User types course name in text field (e.g., "Data Structures")
- **Course code derived from name**: Simple transformation for now (Phase 2 will use LLM)
- **Events persist immediately**: Not lost if user closes tab
- **Returns both IDs and events**: Backward compatible with current UI (01-03b will update UI to use IDs)
- **Handles partial failures**: Some events save, some fail

**Phase 2 enhancement:**
- LLM will extract course code and name from syllabus PDF text
- User won't need to type course name manually
- This is a pragmatic Phase 1 approach that unblocks database persistence

**Follow existing error handling:**
- Same try-catch pattern as existing parse route
- Returns NextResponse with error message and appropriate status code
  </action>
  <verify>
- [ ] `app/api/parse/route.ts` imports course and event server actions
- [ ] POST handler reads `courseName` from FormData
- [ ] POST handler returns 400 if courseName missing or empty
- [ ] POST handler calls `getOrCreateCourse()` with course code derived from name
- [ ] POST handler calls `createEvent()` for each parsed event
- [ ] Returns `{ success: true, courseId: string, courseName: string, eventIds: string[], events: SyllabusEvent[] }` on success
- [ ] No TypeScript errors
- [ ] Existing UI continues to work (backward compatible)
  </verify>
  <done>
PDF parsing endpoint now accepts course name input, persists events to database with course association. Returns event IDs and backward-compatible event data. Events no longer transient.
  </done>
</task>

</tasks>

<verification>

## Type Safety Check

```typescript
import { getOrCreateCourse, getCourses } from '@/app/server-actions/courses';

async function test() {
  const courseResult = await getOrCreateCourse({
    code: "CSC-316",
    name: "Data Structures",
    semester: "Spring 2026",
  });

  if (courseResult.ok) {
    console.log("Course:", courseResult.course);
  }
}
```

## Parse Endpoint Test

**Test with missing course name (should fail):**
```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@sample.pdf"
# Expected: 400 error "Course name is required"
```

**Test with course name (should succeed):**
```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@sample.pdf" \
  -F "courseName=Data Structures"
# Expected: { success: true, courseId: "...", eventIds: [...], events: [...] }
```

## Database Verification

```bash
npx prisma studio
```

1. Upload PDF with course name → `courses` table has 1 entry
2. Course `code` is derived from name (e.g., "DATA-STRUCTURES")
3. Course `name` matches user input
4. `events` table has entries linked to course via `courseId`
5. Events have `source: ALMANAC` and `editable: true`

## Backward Compatibility

Existing UI (`components/syllabus-to-calendar.tsx`) continues to work because:
- Parse endpoint still returns `events` array
- Response format extended, not replaced
- UI will be updated in Plan 01-03b to use database-backed events

</verification>

<success_criteria>

1. **Course management operational:**
   - `app/server-actions/courses.ts` exports course CRUD functions
   - `getOrCreateCourse()` prevents duplicate courses (idempotent)
   - Course uniqueness enforced by database constraint

2. **PDF parsing accepts course input:**
   - Parse endpoint requires `courseName` in FormData
   - Returns 400 if courseName missing or empty
   - Creates course code from name (simple transformation for Phase 1)

3. **PDF parsing persists to database:**
   - `/api/parse` creates course from user input (not filename)
   - `/api/parse` saves events with `source: ALMANAC`
   - Returns `{ success: true, courseId, courseName, eventIds, events }` (backward compatible)
   - Events visible in Prisma Studio after parsing

4. **Non-breaking change:**
   - Existing UI continues to work (still receives `events` array)
   - Response format extended, not replaced
   - Ready for UI update in Plan 01-03b

5. **Data foundation progress:**
   - ✅ DATA-01: System persists events locally with metadata
   - ✅ DATA-02: System distinguishes Almanac vs external events (source field)
   - Events saved before UI rendering (not transient)
   - Course captured via simple user input (Phase 2 will enhance with LLM)

</success_criteria>

<output>
After completion, create `.planning/phases/01-data-foundation/01-03a-SUMMARY.md` documenting:
- Course management pattern (get-or-create for PDF parsing)
- Updated parse endpoint signature (requires courseName)
- Course code derivation approach (simple for Phase 1, LLM in Phase 2)
- Database persistence behavior
- Backward compatibility with existing UI
- Next step: Plan 01-03b will update UI to use database-backed events
</output>
