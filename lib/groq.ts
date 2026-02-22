import { SyllabusEvent } from "@/lib/events";
import { stripCodeFences, extractJsonCandidate } from "@/lib/json-utils";

type GroqChatCompletionResponse = {
  choices: Array<{
    message: { content?: string | null };
  }>;
};

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = stripCodeFences(text);
    if (cleaned !== text) {
      return JSON.parse(cleaned);
    }
    throw new Error("Groq returned invalid JSON.");
  }
}

export async function extractEventsFromSyllabusText(
  text: string,
): Promise<SyllabusEvent[] | unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY env var.");

  const prompt = [
    "You are extracting calendar events from a university course syllabus.",
    "Return ONLY valid JSON.",
    'Output must be either: {"events":[...]} OR a JSON array.',
    'Each event: {"title": string, "date": "YYYY-MM-DD", "type": string, "description": string}.',
    "Include assignments, quizzes, exams, projects, presentations, labs, and important deadlines.",
    "If a due date is ambiguous, omit that event.",
    "Do not include class meeting times.",
    "",
    "SYLLABUS TEXT:",
    text,
  ].join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a careful information extractor that outputs JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as GroqChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const jsonCandidate = extractJsonCandidate(content);
  if (!jsonCandidate) throw new Error("Groq returned empty content.");

  return safeParseJson(jsonCandidate);
}
