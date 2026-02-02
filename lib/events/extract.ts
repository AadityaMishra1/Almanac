import { EventWithConfidence, EventWithConfidenceSchema } from './types';
import { adjustConfidence } from './categorize';

type GroqChatCompletionResponse = {
  choices: Array<{
    message: { content?: string | null };
  }>;
};

function stripCodeFences(text: string) {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function extractJsonCandidate(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  const objStart = trimmed.indexOf('{');
  const objEnd = trimmed.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    return trimmed.slice(objStart, objEnd + 1);
  }

  return trimmed;
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = stripCodeFences(text);
    if (cleaned !== text) {
      return JSON.parse(cleaned);
    }
    throw new Error('Groq returned invalid JSON.');
  }
}

/**
 * Extract events with confidence scoring from syllabus text using Groq LLM.
 *
 * Enhanced extraction with:
 * - Semester bounds validation
 * - Confidence scoring for each extracted event
 * - Type categorization (exam/quiz/assignment/reading/project/lab)
 * - Post-extraction confidence adjustment
 *
 * @param text - Syllabus text (from PDF or OCR)
 * @param semester - Semester name for date validation (e.g., "Spring 2026")
 * @returns Array of events with confidence metadata
 */
export async function extractEventsWithConfidence(
  text: string,
  semester: string
): Promise<EventWithConfidence[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY env var.');

  // Enhanced prompt with confidence scoring and semester constraints
  const prompt = [
    'You are extracting calendar events from a university course syllabus.',
    'Return ONLY valid JSON array.',
    '',
    '## IMPORTANT CONSTRAINTS',
    '',
    `Semester: ${semester}`,
    'Semester bounds:',
    '- Spring 2026: January 12 - May 15',
    '- Summer 2026: May 18 - August 15',
    '- Fall 2026: August 20 - December 20',
    '',
    'CRITICAL: Do not infer dates - only extract dates explicitly mentioned in the syllabus.',
    'If a due date is ambiguous or not stated, omit that event entirely.',
    'Assume US date format (MM/DD) unless YYYY-MM-DD format is used.',
    '',
    '## OUTPUT FORMAT',
    '',
    'Return a JSON array of events. Each event must have:',
    '{',
    '  "title": string,           // Event name',
    '  "date": "YYYY-MM-DD",      // ISO format',
    '  "type": string,            // Must be one of: exam, quiz, assignment, reading, project, lab',
    '  "description": string,     // Optional details',
    '  "confidence": {',
    '    "overall": number,       // 0-1 scale (0.85-1.0 = high, 0.6-0.84 = medium, 0-0.59 = low)',
    '    "date_extracted": boolean,  // true if date explicitly in text, false if inferred',
    '    "type_inferred": boolean,   // true if type guessed from context',
    '    "reasoning": string         // Why this confidence level?',
    '  }',
    '}',
    '',
    '## TYPE CATEGORIZATION',
    '',
    'Map event types as follows:',
    '- "exam", "test", "midterm", "final" → type: "exam"',
    '- "quiz", "pop quiz" → type: "quiz"',
    '- "assignment", "homework", "problem set", "reading response", "essay" → type: "assignment"',
    '- "reading", "read chapter", "textbook" → type: "reading"',
    '- "project", "final project", "group project" → type: "project"',
    '- "lab", "lab report", "lab work" → type: "lab"',
    '',
    '## CONFIDENCE SCORING GUIDELINES',
    '',
    'High confidence (0.85-1.0):',
    '- Date explicitly stated in syllabus',
    '- Event type clearly indicated',
    '- Date falls on weekday within semester bounds',
    '',
    'Medium confidence (0.6-0.84):',
    '- Date mentioned but format unclear',
    '- Event type inferred from context',
    '- Date on boundary of semester',
    '',
    'Low confidence (0-0.59):',
    '- Date inferred from context',
    '- Date falls on weekend',
    '- Date outside semester bounds',
    '',
    '## EXAMPLES',
    '',
    'Input: "Midterm Exam: March 15"',
    'Output: { "title": "Midterm Exam", "date": "2026-03-15", "type": "exam", "description": "", "confidence": { "overall": 0.9, "date_extracted": true, "type_inferred": false, "reasoning": "Date and type explicitly stated" } }',
    '',
    'Input: "Reading Response due Friday" (no date given)',
    'Output: [] // Omit - date ambiguous',
    '',
    'Input: "Chapter 1-3" (no due date)',
    'Output: [] // Omit - this is reading content, not a due date',
    '',
    'Do not include:',
    '- Class meeting times (e.g., "Mon/Wed 10-11am")',
    '- Office hours',
    '- Reading content without due dates',
    '',
    '## SYLLABUS TEXT',
    '',
    text,
  ].join('\n');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are a careful information extractor that outputs valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      // Note: Groq may not support strict JSON schema on all models, relying on prompt instructions
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as GroqChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? '';
  const jsonCandidate = extractJsonCandidate(content);
  if (!jsonCandidate) {
    throw new Error('Groq returned empty content.');
  }

  let parsedEvents;
  try {
    parsedEvents = safeParseJson(jsonCandidate);
  } catch (error) {
    // Fallback: If parsing fails, return empty array rather than crash
    console.error('Failed to parse Groq response:', error);
    return [];
  }

  // Handle both array and { events: [...] } formats
  const eventsArray = Array.isArray(parsedEvents)
    ? parsedEvents
    : parsedEvents?.events ?? [];

  // Validate with Zod schema
  const validationResult = EventWithConfidenceSchema.array().safeParse(eventsArray);
  if (!validationResult.success) {
    console.error('Zod validation failed:', validationResult.error);
    // Fallback: Return empty array if validation fails
    return [];
  }

  const validatedEvents = validationResult.data;

  // Post-extraction: Apply confidence adjustment rules
  const adjustedEvents = validatedEvents.map((event) =>
    adjustConfidence(event, semester)
  );

  return adjustedEvents;
}
