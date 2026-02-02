import { parse, isValid } from 'date-fns';

interface SemesterBounds {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

export const SEMESTER_BOUNDS: Record<string, SemesterBounds> = {
  'Spring 2026': { start: '2026-01-12', end: '2026-05-15' },
  'Summer 2026': { start: '2026-05-18', end: '2026-08-15' },
  'Fall 2026': { start: '2026-08-20', end: '2026-12-20' },
};

export function validateEventDate(
  dateStr: string,
  semester: string
): { valid: boolean; reason?: string } {
  const bounds = SEMESTER_BOUNDS[semester];
  if (!bounds) {
    return { valid: false, reason: 'Unknown semester' };
  }

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (!isValid(date)) {
    return { valid: false, reason: 'Invalid date format' };
  }

  // Use string comparison for YYYY-MM-DD format (lexicographically correct)
  if (dateStr < bounds.start || dateStr > bounds.end) {
    return {
      valid: false,
      reason: `Date outside ${semester} range (${bounds.start} - ${bounds.end})`,
    };
  }

  return { valid: true };
}
