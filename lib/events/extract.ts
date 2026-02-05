import { EventWithConfidence, EventWithConfidenceSchema } from './types';
import { adjustConfidence } from './categorize';
import type { CalendarProvider } from '../calendar/calendar-provider';

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
 * - Multi-calendar support via CalendarProvider
 * - Semester bounds validation
 * - Confidence scoring for each extracted event
 * - Type categorization (exam/quiz/assignment/reading/project/lab)
 * - Post-extraction confidence adjustment
 *
 * @param text - Syllabus text (from PDF or OCR)
 * @param semester - Semester name for date validation (e.g., "Spring 2026")
 * @param calendarProvider - Calendar provider for semester bounds and term parsing
 * @returns Array of events with confidence metadata
 */
export async function extractEventsWithConfidence(
  text: string,
  semester: string,
  calendarProvider: CalendarProvider
): Promise<EventWithConfidence[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY env var.');

  // Parse academic terms using calendar provider
  const transformedText = calendarProvider.parseAcademicTerms(text, semester);

  // Get semester bounds from calendar provider
  const bounds = calendarProvider.getSemesterBounds(semester);
  const boundsText = bounds
    ? `- ${semester}: ${bounds.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${bounds.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : `- Semester: ${semester} (bounds will be inferred from syllabus)`;

  // Enhanced prompt with confidence scoring and semester constraints
  const prompt = [
    'You are extracting calendar events from a university course syllabus.',
    'Return ONLY valid JSON array.',
    '',
    '## IMPORTANT CONSTRAINTS',
    '',
    `Semester: ${semester}`,
    'Semester bounds:',
    boundsText,
    '',
    'EXTRACTION POLICY:',
    '1. PRIMARY: Extract dates explicitly stated in text (high confidence)',
    '   - Example: "Midterm Exam: 3/15" → Extract as March 15',
    '2. SECONDARY: Infer dates from clear patterns (mark confidence.date_extracted: false)',
    '   - "Homework due every Friday" → Extract all Fridays in semester',
    '   - "Exam in Week 8" → Calculate date from semester start',
    '   - "Quiz every other Tuesday" → Extract pattern-based Tuesdays',
    '3. OMIT: Truly ambiguous cases with no context',
    '   - "Reading due soon" → Omit (no date)',
    '   - "TBD" → Omit (to be determined)',
    '',
    'DATE FORMAT DETECTION:',
    '- Analyze the syllabus to detect date format (US: MM/DD, EU: DD/MM, ISO: YYYY-MM-DD)',
    '- If dates with day > 12 appear in first position (e.g., "15/03"), use DD/MM format',
    '- If dates use dashes (e.g., "2026-03-15"), use ISO format',
    '- Default to US format (MM/DD) if ambiguous',
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
    'Example 1 - Explicit date (US format):',
    'Input: "Midterm Exam: 3/15"',
    'Output: { "title": "Midterm Exam", "date": "2026-03-15", "type": "exam", "description": "", "confidence": { "overall": 0.9, "date_extracted": true, "type_inferred": false, "reasoning": "Date and type explicitly stated" } }',
    '',
    'Example 2 - Pattern-based (weekly):',
    'Input: "Problem sets due every Friday at 11:59pm"',
    'Output: [',
    '  { "title": "Problem Set", "date": "2026-01-17", "type": "assignment", "confidence": { "overall": 0.75, "date_extracted": false, "type_inferred": false, "reasoning": "Weekly pattern inferred" } },',
    '  { "title": "Problem Set", "date": "2026-01-24", "type": "assignment", "confidence": { "overall": 0.75, "date_extracted": false, "type_inferred": false, "reasoning": "Weekly pattern inferred" } }',
    '  // ... continue for all Fridays in semester',
    ']',
    '',
    'Example 3 - ISO format:',
    'Input: "Final Project: 2026-05-08"',
    'Output: { "title": "Final Project", "date": "2026-05-08", "type": "project", "confidence": { "overall": 0.95, "date_extracted": true, "type_inferred": false, "reasoning": "ISO date format, explicit type" } }',
    '',
    'Example 4 - EU format (DD/MM):',
    'Input: "Quiz on 25/03"',
    'Output: { "title": "Quiz", "date": "2026-03-25", "type": "quiz", "confidence": { "overall": 0.85, "date_extracted": true, "type_inferred": false, "reasoning": "DD/MM format detected (day > 12)" } }',
    '',
    'Example 5 - Week-based inference:',
    'Input: "Exam in Week 8" (assuming semester starts Jan 12)',
    'Output: { "title": "Exam", "date": "2026-03-02", "type": "exam", "confidence": { "overall": 0.7, "date_extracted": false, "type_inferred": false, "reasoning": "Date calculated from week number" } }',
    '',
    'Example 6 - Bi-weekly pattern:',
    'Input: "Lab reports due every other Tuesday starting Feb 3"',
    'Output: [',
    '  { "title": "Lab Report", "date": "2026-02-03", "type": "lab", "confidence": { "overall": 0.8, "date_extracted": true, "type_inferred": false, "reasoning": "Start date explicit, pattern clear" } },',
    '  { "title": "Lab Report", "date": "2026-02-17", "type": "lab", "confidence": { "overall": 0.75, "date_extracted": false, "type_inferred": false, "reasoning": "Bi-weekly pattern inferred" } }',
    '  // ... continue bi-weekly',
    ']',
    '',
    'Example 7 - Multiple dates:',
    'Input: "Reading: Chapters 1-3 (due 1/20), Chapters 4-6 (due 2/3)"',
    'Output: [',
    '  { "title": "Reading: Chapters 1-3", "date": "2026-01-20", "type": "reading", "confidence": { "overall": 0.85, "date_extracted": true, "type_inferred": false } },',
    '  { "title": "Reading: Chapters 4-6", "date": "2026-02-03", "type": "reading", "confidence": { "overall": 0.85, "date_extracted": true, "type_inferred": false } }',
    ']',
    '',
    'Example 8 - Ambiguous (OMIT):',
    'Input: "Reading Response due Friday" (no specific date)',
    'Output: [] // Omit - cannot determine which Friday',
    '',
    'Example 9 - No due date (OMIT):',
    'Input: "Chapter 1-3" (no due date)',
    'Output: [] // Omit - this is reading content, not a due date',
    '',
    'Example 10 - TBD (OMIT):',
    'Input: "Final Exam: TBD"',
    'Output: [] // Omit - date to be determined',
    '',
    'Do not include:',
    '- Class meeting times (e.g., "Mon/Wed 10-11am")',
    '- Office hours',
    '- Reading content without due dates',
    '',
    '## SYLLABUS TEXT',
    '',
    transformedText,
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
