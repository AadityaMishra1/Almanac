import { NextResponse } from "next/server";
import { extractPdfContent } from "@/lib/pdf/index";
import { extractEventsWithConfidence } from "@/lib/events/extract";
import type { EventWithConfidence } from "@/lib/events/types";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { createEvent } from "@/app/server-actions/events";
import { EventSource } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Bridge EventWithConfidence to CreateEventInput for database save
 */
function confidenceEventToCreateInput(event: EventWithConfidence, courseId: string) {
  return {
    title: event.title,
    date: event.date,
    time: null,
    type: event.type,
    description: event.description || "",
    courseId,
    source: EventSource.ALMANAC,
    googleEventId: null,
  };
}

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

    // Extract PDF content (text + tables) with unified pipeline
    const { text, tables, metadata } = await extractPdfContent(buffer);

    // Combine text and tables for LLM context
    const fullContent = tables ? `${text}\n\nTABLE DATA:\n${tables}` : text;

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

    // Use semester from form data or default to Spring 2026
    const semester = (formData.get("semester") as string) || "Spring 2026";

    // Extract events with confidence scoring (includes post-adjustment via adjustConfidence)
    const eventsWithConfidence = await extractEventsWithConfidence(fullContent, semester);

    if (eventsWithConfidence.length === 0) {
      return NextResponse.json(
        {
          error: "No events extracted from PDF. The document may be empty or have no recognizable dates.",
        },
        { status: 400 }
      );
    }

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

    for (const event of eventsWithConfidence) {
      const eventInput = confidenceEventToCreateInput(event, course.id);
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

    // Return enhanced response with confidence scores and extraction metadata
    return NextResponse.json({
      success: true,
      courseId: course.id,
      courseName: course.name,
      eventIds: savedEventIds,
      events: eventsWithConfidence, // Full events with confidence for preview UI
      metadata: {
        ...metadata,
        totalEvents: eventsWithConfidence.length,
        highConfidence: eventsWithConfidence.filter(e => e.confidence.overall >= 0.85).length,
        needsReview: eventsWithConfidence.filter(e => e.confidence.overall < 0.6).length,
      },
      partialErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse syllabus." },
      { status: 500 }
    );
  }
}
