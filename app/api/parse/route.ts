import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseSyllabusPdfToText } from "@/lib/pdf";
import { extractEventsFromSyllabusText } from "@/lib/groq";
import { extractEventsFromPdfWithVision } from "@/lib/gemini";
import {
  normalizeAndValidateEvents,
  SyllabusEvent,
  syllabusEventToCreateInput,
} from "@/lib/events";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { createEvent } from "@/app/server-actions/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 req/min for PDF uploads (expensive LLM calls)
    const rateLimited = await checkRateLimit("parse", session.user.id);
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing PDF file field "file".' },
        { status: 400 },
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "File must be a PDF." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Batch 2: File size limit (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 413 },
      );
    }

    // Batch 2: PDF magic byte validation
    const header = buffer.toString("latin1", 0, 5);
    if (!header.startsWith("%PDF-")) {
      return NextResponse.json({ error: "Invalid PDF file." }, { status: 400 });
    }

    // PRIMARY: Gemini Vision (handles text, scanned, and image-based PDFs)
    let events: SyllabusEvent[] | null = null;
    let usedPipeline = "none";
    try {
      const geminiResult = await extractEventsFromPdfWithVision(
        buffer,
        file.name,
      );
      if (geminiResult != null) {
        events = normalizeAndValidateEvents(geminiResult);
        usedPipeline = "gemini";
      }
    } catch (geminiErr) {
      console.error("[parse] Gemini pipeline failed, falling back:", geminiErr);
      events = null;
    }

    // FALLBACK: pdf-parse text extraction -> Groq LLM (text-based PDFs only)
    if (!events || events.length === 0) {
      const text = await parseSyllabusPdfToText(buffer);
      const aiEvents = await extractEventsFromSyllabusText(text);
      events = normalizeAndValidateEvents(aiEvents);
      usedPipeline = "groq-fallback";
    }

    // Get course name from form data (user provided simple text input)
    const courseName = formData.get("courseName") as string | null;

    if (!courseName || courseName.trim().length === 0) {
      return NextResponse.json(
        { error: "Course name is required. Please provide a course name." },
        { status: 400 },
      );
    }

    // Create course code from course name (simple approach for Phase 1)
    // Phase 2 will extract course code from PDF with LLM
    const courseCode = courseName.trim().toUpperCase().replace(/\s+/g, "-");
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
        { error: "Failed to create course. Please try again." },
        { status: 500 },
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
        { status: 500 },
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
    console.error("[parse] Unhandled error:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to parse syllabus. Please try again.",
      },
      { status: 500 },
    );
  }
}
