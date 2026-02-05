import { EventWithConfidence } from './types';
import { validateEventDate } from './validate';
import { parse, isWeekend, isValid } from 'date-fns';

// Confidence adjustment penalties (recalibrated for better accuracy)
const CONFIDENCE_ADJUSTMENTS = {
  WEEKEND_DATE: -0.02,        // was -0.05 (many courses have weekend work)
  INFERRED_TYPE: -0.05,       // was -0.1 (types usually clear from context)
  INFERRED_DATE: -0.1,        // was -0.2 (pattern-based inference is reliable)
  OUT_OF_BOUNDS: -0.2,        // was -0.3 (still serious but not disqualifying)
};

export function adjustConfidence(
  event: EventWithConfidence,
  semester: string
): EventWithConfidence {
  let { overall } = event.confidence;
  const reasons: string[] = [];

  // Check date validity against semester
  const dateValidation = validateEventDate(event.date, semester);
  if (!dateValidation.valid) {
    overall += CONFIDENCE_ADJUSTMENTS.OUT_OF_BOUNDS;
    reasons.push(dateValidation.reason || 'Invalid date');
  }

  // Check if date was inferred (not explicitly in text)
  if (!event.confidence.date_extracted) {
    overall += CONFIDENCE_ADJUSTMENTS.INFERRED_DATE;
    reasons.push('Date was inferred, not found in text');
  }

  // Check if type was inferred
  if (event.confidence.type_inferred) {
    overall += CONFIDENCE_ADJUSTMENTS.INFERRED_TYPE;
    reasons.push('Event type was inferred from context');
  }

  // Weekend check
  const parsedDate = parse(event.date, 'yyyy-MM-dd', new Date());
  if (isValid(parsedDate) && isWeekend(parsedDate)) {
    overall += CONFIDENCE_ADJUSTMENTS.WEEKEND_DATE;
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
