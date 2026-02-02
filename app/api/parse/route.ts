import { NextResponse } from "next/server";
import { parseSyllabusPdfToText } from "@/lib/pdf";
import { extractEventsFromSyllabusText } from "@/lib/groq";
import { normalizeAndValidateEvents, syllabusEventToCreateInput } from "@/lib/events";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { createEvent } from "@/app/server-actions/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing PDF file field "file".' }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "File must be a PDF." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseSyllabusPdfToText(buffer);
    const aiEvents = await extractEventsFromSyllabusText(text);
    const events = normalizeAndValidateEvents(aiEvents);

    // Get course name from form data (user provided simple text input)
    const courseName = formData.get("courseName") as string | null;

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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse syllabus." },
      { status: 500 }
    );
  }
}
