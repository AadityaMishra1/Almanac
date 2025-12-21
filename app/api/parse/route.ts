import { NextResponse } from "next/server";
import { parseSyllabusPdfToText } from "@/lib/pdf";
import { extractEventsFromSyllabusText } from "@/lib/groq";
import { normalizeAndValidateEvents } from "@/lib/events";

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

    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse syllabus." },
      { status: 500 }
    );
  }
}
