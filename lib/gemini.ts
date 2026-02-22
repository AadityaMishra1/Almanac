import { GoogleGenAI } from "@google/genai";
import { stripCodeFences, extractJsonCandidate } from "@/lib/json-utils";

/**
 * Extract syllabus events from a PDF using Gemini Vision.
 * Handles text-based, scanned, and image-based PDFs.
 * Returns null on any failure (caller should fall back to text pipeline).
 */
export async function extractEventsFromPdfWithVision(
  buffer: Buffer,
  filename?: string,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const base64 = buffer.toString("base64");

    const prompt = [
      "You are extracting calendar events from a university course syllabus PDF.",
      "Return ONLY a valid JSON array (no wrapping object, no markdown).",
      'Each element: {"title": string, "date": "YYYY-MM-DD", "type": string, "description": string}.',
      '"type" must be one of: exam, assignment, quiz, project, presentation, lab, deadline.',
      "Include assignments, quizzes, exams, projects, presentations, labs, and important deadlines.",
      "If a due date is ambiguous or missing, omit that event entirely.",
      "Do not include class meeting times or office hours.",
      filename ? `Filename: ${filename}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const geminiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0,
      },
    });

    // 60s timeout for Gemini vision calls
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out")), 60_000),
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    const content = response.text ?? "";
    if (!content) return null;

    const jsonCandidate = extractJsonCandidate(stripCodeFences(content));
    if (!jsonCandidate) return null;

    const parsed: unknown = JSON.parse(jsonCandidate);

    // Handle both array and {events: [...]} shapes — return unvalidated,
    // caller passes through normalizeAndValidateEvents() for Zod validation
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "object" && parsed && "events" in parsed) {
      return (parsed as Record<string, unknown>).events;
    }

    return null;
  } catch (err) {
    console.error("[gemini] Vision extraction failed:", err);
    return null;
  }
}
