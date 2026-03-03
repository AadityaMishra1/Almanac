import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      GROQ_API_KEY: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.slice(0, 8)}...` : "MISSING",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 8)}...` : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "SET" : "MISSING",
    },
  };

  // Test Groq
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say 'ok' and nothing else." }],
        max_tokens: 5,
      }),
    });
    const groqBody = await groqRes.text();
    results.groq = {
      status: groqRes.status,
      ok: groqRes.ok,
      body: groqBody.slice(0, 300),
    };
  } catch (e) {
    results.groq = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test Gemini
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

  // Test pdf-parse (the fallback path requires this)
  try {
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
    const pdfParse = (pdfParseModule as Record<string, unknown>).default ?? pdfParseModule;
    results.pdfParse = {
      ok: typeof pdfParse === "function",
      type: typeof pdfParse,
    };
  } catch (e) {
    results.pdfParse = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test AI SDK Groq (used by chat route)
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

  return NextResponse.json(results, { status: 200 });
}
