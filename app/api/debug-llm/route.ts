import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      GROQ_API_KEY: process.env.GROQ_API_KEY
        ? `${process.env.GROQ_API_KEY.slice(0, 8)}...`
        : "MISSING",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
        ? `${process.env.GEMINI_API_KEY.slice(0, 8)}...`
        : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL
        ? "SET"
        : "MISSING",
    },
  };

  // 1. Test database
  try {
    const count = await prisma.user.count();
    results.database = { ok: true, userCount: count };
  } catch (e) {
    results.database = { error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Test Groq (raw fetch — used by syllabus fallback)
  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "user", content: "Say 'ok' and nothing else." },
          ],
          max_tokens: 5,
        }),
      },
    );
    const groqBody = await groqRes.text();
    results.groq = {
      status: groqRes.status,
      ok: groqRes.ok,
      body: groqBody.slice(0, 300),
    };
  } catch (e) {
    results.groq = { error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Test Gemini
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say 'ok' and nothing else." }] }],
        }),
      },
    );
    const geminiBody = await geminiRes.text();
    results.gemini = {
      status: geminiRes.status,
      ok: geminiRes.ok,
      body: geminiBody.slice(0, 300),
    };
  } catch (e) {
    results.gemini = { error: e instanceof Error ? e.message : String(e) };
  }

  // 4. Test pdf-parse with a minimal real PDF
  try {
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
    const pdfParse =
      (pdfParseModule as Record<string, unknown>).default ?? pdfParseModule;

    // Minimal valid PDF with text "Hello"
    const minimalPdf = Buffer.from(
      "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Hello) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000360 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n434\n%%EOF",
    );

    const data = await (pdfParse as CallableFunction)(minimalPdf);
    results.pdfParse = {
      ok: true,
      extractedText: String(data.text ?? "").trim().slice(0, 100),
      pages: data.numpages,
    };
  } catch (e) {
    results.pdfParse = {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.slice(0, 300) : undefined,
    };
  }

  // 5. Test AI SDK Groq streaming (used by chat route)
  try {
    const { createGroq } = await import("@ai-sdk/groq");
    const { generateText } = await import("ai");
    const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
    const { text } = await generateText({
      model: groqProvider("llama-3.3-70b-versatile"),
      prompt: "Say 'ok' and nothing else.",
      maxOutputTokens: 5,
    });
    results.aiSdkGroq = { ok: true, text };
  } catch (e) {
    results.aiSdkGroq = { error: e instanceof Error ? e.message : String(e) };
  }

  // 6. Test the full Groq syllabus extraction (simulates fallback path)
  try {
    const { extractEventsFromSyllabusText } = await import("@/lib/groq");
    const testText =
      "CSC 316 Data Structures\nExam 1: March 15, 2026\nHomework 3 due: March 20, 2026";
    const events = await extractEventsFromSyllabusText(testText);
    results.groqSyllabus = {
      ok: true,
      eventsReturned: Array.isArray(events) ? events.length : typeof events,
      sample: JSON.stringify(events).slice(0, 300),
    };
  } catch (e) {
    results.groqSyllabus = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
