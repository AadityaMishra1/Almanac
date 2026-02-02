import { EventWithConfidence } from './types';
import { validateEventDate } from './validate';
import { parse, isWeekend, isValid } from 'date-fns';

export function adjustConfidence(
  event: EventWithConfidence,
  semester: string
): EventWithConfidence {
  let { overall } = event.confidence;
  const reasons: string[] = [];

  // Check date validity against semester
  const dateValidation = validateEventDate(event.date, semester);
  if (!dateValidation.valid) {
    overall -= 0.3;
    reasons.push(dateValidation.reason || 'Invalid date');
  }

  // Check if date was inferred (not explicitly in text)
  if (!event.confidence.date_extracted) {
    overall -= 0.2;
    reasons.push('Date was inferred, not found in text');
  }

  // Check if type was inferred
  if (event.confidence.type_inferred) {
    overall -= 0.1;
    reasons.push('Event type was inferred from context');
  }

  // Weekend check
  const parsedDate = parse(event.date, 'yyyy-MM-dd', new Date());
  if (isValid(parsedDate) && isWeekend(parsedDate)) {
    overall -= 0.05;
    reasons.push('Date falls on weekend');
  }

  // Clamp to 0-1
  overall = Math.max(0, Math.min(1, overall));

  return {
    ...event,
    confidence: {
      ...event.confidence,
      overall: Math.round(overall * 100) / 100, // Round to 2 decimal places
      reasoning: [event.confidence.reasoning, ...reasons]
        .filter(Boolean)
        .join('; '),
    },
  };
}
