import { parse as chronoParse } from 'chrono-node';
import { format } from 'date-fns';
import {
  SPRING_2026,
  FALL_2025,
  getAcademicDatesForSemester,
} from '@/lib/calendar/ncsu-academic-calendar';

/**
 * Map academic calendar terms to specific dates.
 * Preprocessing step before chrono parsing.
 */
function mapAcademicTerms(input: string): string {
  const text = input.toLowerCase();

  // Handle "finals week" - map to start of finals period
  if (text.includes('finals week') || text.includes('finals')) {
    const finalsWeek = SPRING_2026.find((d) => d.type === 'finals');
    if (finalsWeek) {
      return input.replace(/finals week|finals/gi, formatDateForDisplay(finalsWeek.start));
    }
  }

  // Handle "spring break" - map to start of spring break
  if (text.includes('spring break')) {
    const springBreak = SPRING_2026.find((d) => d.type === 'break' && d.title === 'Spring Break');
    if (springBreak) {
      return input.replace(/spring break/gi, formatDateForDisplay(springBreak.start));
    }
  }

  return input;
}

/**
 * Parse user date input with academic calendar support.
 * Returns parsed date and human-readable formatted string.
 * Returns null if unparseable.
 */
export function parseUserDate(
  input: string,
  referenceDate?: Date
): { date: Date; formatted: string } | null {
  // Preprocess academic terms
  const processedInput = mapAcademicTerms(input);

  // Parse with chrono
  const parsed = chronoParse(processedInput, referenceDate || new Date(), {
    forwardDate: true, // Prefer future dates for relative terms
  });

  if (parsed.length === 0 || !parsed[0].start) {
    return null;
  }

  const result = parsed[0].start;
  const date = result.date();

  if (!date || isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    formatted: formatDateForDisplay(date),
  };
}

/**
 * Format date for display (e.g., "Friday, March 15, 2026").
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Format date for database storage (ISO 8601: YYYY-MM-DD).
 */
export function formatDateForDb(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse time from natural language input.
 * Returns HH:MM format or null if unparseable.
 * Examples: "2pm" -> "14:00", "9:30am" -> "09:30", "noon" -> "12:00"
 */
export function parseTimeFromInput(input: string): string | null {
  const text = input.toLowerCase().trim();

  // Handle "noon" and "midnight" explicitly
  if (text === 'noon' || text === '12pm' || text === '12:00pm') {
    return '12:00';
  }
  if (text === 'midnight' || text === '12am' || text === '12:00am') {
    return '00:00';
  }

  // Try parsing with chrono
  const parsed = chronoParse(input, new Date(), { forwardDate: false });

  if (parsed.length > 0 && parsed[0].start) {
    const result = parsed[0].start;
    const hour = result.get('hour');
    const minute = result.get('minute') || 0;

    if (hour !== null) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  // Fallback: parse HH:MM format directly
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);

    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Validate if date is within semester bounds.
 * Returns warning message if date is outside semester, null otherwise.
 */
export function validateDateInSemester(
  date: Date,
  semester: string
): string | null {
  const academicDates = getAcademicDatesForSemester(semester);

  if (academicDates.length === 0) {
    return null; // Unknown semester, skip validation
  }

  const semesterStart = academicDates.find((d) => d.type === 'semester-start');
  const semesterEnd = academicDates.find((d) => d.type === 'semester-end');

  if (!semesterStart || !semesterEnd) {
    return null;
  }

  if (date < semesterStart.start) {
    return `Warning: Date is before semester start (${formatDateForDisplay(semesterStart.start)})`;
  }

  if (date > semesterEnd.end) {
    return `Warning: Date is after semester end (${formatDateForDisplay(semesterEnd.end)})`;
  }

  return null;
}
