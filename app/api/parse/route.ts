import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractEventsFromSyllabusText } from "@/lib/groq";
import { extractEventsFromPdfWithVision } from "@/lib/gemini";
import {
  normalizeAndValidateEvents,
  SyllabusEvent,
  syllabusEventToCreateInput,
} from "@/lib/events";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { createEvent } from "@/app/server-actions/events";
import {
  detectFileType,
  validateMagicBytes,
  extractTextFromDocument,
} from "@/lib/document";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 req/min burst + 30 req/day for uploads (expensive LLM calls)
    const rateLimited = await checkRateLimit("parse", session.user.id);
    if (rateLimited) return rateLimited;
    const dailyLimited = await checkRateLimit("parseDaily", session.user.id);
    if (dailyLimited) return dailyLimited;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file field "file".' },
        { status: 400 },
      );
    }

    // Detect file type from MIME or extension
    const fileType = detectFileType(file.type, file.name);
    if (!fileType) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // File size limit (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 413 },
      );
    }

    // Magic byte validation
    if (!validateMagicBytes(buffer, fileType)) {
      return NextResponse.json(
        {
          error: `Invalid ${fileType.toUpperCase()} file. The file content doesn't match the expected format.`,
        },
        { status: 400 },
      );
    }

    // PDF-specific: page count limit (prevent token abuse with huge documents)
    if (fileType === "pdf") {
      const MAX_PDF_PAGES = 50;
      try {
        const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
        const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
        const pdfInfo = await pdfParse(buffer, { max: 0 }); // metadata only
        if (pdfInfo.numpages > MAX_PDF_PAGES) {
          return NextResponse.json(
            {
              error: `PDF too long (${pdfInfo.numpages} pages). Maximum is ${MAX_PDF_PAGES} pages.`,
            },
            { status: 400 },
          );
        }
      } catch {
        // If page count extraction fails, proceed — downstream validation still applies
      }
    }

    // Validate courseName early — before expensive LLM calls
    const courseName = formData.get("courseName") as string | null;

    if (!courseName || courseName.trim().length === 0) {
      return NextResponse.json(
        { error: "Course name is required. Please provide a course name." },
        { status: 400 },
      );
    }

    if (courseName.trim().length > 200) {
      return NextResponse.json(
        { error: "Course name too long. Maximum 200 characters." },
        { status: 400 },
      );
    }

    // Sanitize filename before passing to LLM prompt (strip path traversal, limit length)
    const safeFilename = (file.name || "syllabus")
      .replace(/[^\w.\-\s]/g, "")
      .slice(0, 100);

    const MAX_EVENTS_PER_UPLOAD = 100;
    let events: SyllabusEvent[] | null = null;
    let usedPipeline = "none";

    if (fileType === "pdf") {
      // PDF pipeline: Gemini Vision (primary) + Groq text fallback
      try {
        const geminiResult = await extractEventsFromPdfWithVision(
          buffer,
          safeFilename,
        );
        if (geminiResult != null) {
          events = normalizeAndValidateEvents(geminiResult).slice(
            0,
            MAX_EVENTS_PER_UPLOAD,
          );
          usedPipeline = "gemini";
        }
      } catch (geminiErr) {
        console.error(
          "[parse] Gemini pipeline failed, falling back:",
          geminiErr,
        );
        events = null;
      }

      // Groq text fallback for PDFs (text-based PDFs only)
      if (!events || events.length === 0) {
        const text = await extractTextFromDocument(buffer, "pdf");
        const aiEvents = await extractEventsFromSyllabusText(text);
        events = normalizeAndValidateEvents(aiEvents).slice(
          0,
          MAX_EVENTS_PER_UPLOAD,
        );
        usedPipeline = "groq-fallback";
      }
    } else {
      // DOCX / TXT pipeline: extract text → Groq LLM
      const text = await extractTextFromDocument(buffer, fileType);
      const aiEvents = await extractEventsFromSyllabusText(text);
      events = normalizeAndValidateEvents(aiEvents).slice(
        0,
        MAX_EVENTS_PER_UPLOAD,
      );
      usedPipeline = `groq-${fileType}`;
    }

    // Guard against empty extraction results
    if (!events || events.length === 0) {
      return NextResponse.json(
        {
          error:
            "No events could be extracted from this document. Make sure it contains dates and deadlines.",
        },
        { status: 422 },
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
