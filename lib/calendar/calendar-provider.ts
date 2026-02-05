/**
 * Calendar provider interface for multi-university support.
 */
export interface CalendarProvider {
  id: string;
  name: string;
  getSemesterBounds(semester: string): { start: Date; end: Date } | null;
  parseAcademicTerms(input: string, semester: string): string;
}

/**
 * Generic calendar provider using heuristics for unknown universities.
 * Falls back to standard semester patterns when no specific calendar is available.
 */
export class GenericCalendarProvider implements CalendarProvider {
  id = 'generic';
  name = 'Generic University Calendar';

  getSemesterBounds(semester: string): { start: Date; end: Date } | null {
    // Extract year from semester string
    const yearMatch = semester.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    const lowerSemester = semester.toLowerCase();

    // Standard US semester patterns
    if (lowerSemester.includes('spring')) {
      return {
        start: new Date(year, 0, 10), // January 10
        end: new Date(year, 4, 15), // May 15
      };
    } else if (lowerSemester.includes('fall')) {
      return {
        start: new Date(year, 7, 20), // August 20
        end: new Date(year, 11, 15), // December 15
      };
    } else if (lowerSemester.includes('summer')) {
      return {
        start: new Date(year, 4, 20), // May 20
        end: new Date(year, 7, 10), // August 10
      };
    }

    return null;
  }

  parseAcademicTerms(input: string, semester: string): string {
    // Generic provider doesn't transform academic terms
    // Can be enhanced with LLM call if needed
    return input;
  }
}

/**
 * NC State University calendar provider.
 * Uses hardcoded dates from official NCSU academic calendar.
 */
export class NCSUCalendarProvider implements CalendarProvider {
  id = 'ncsu';
  name = 'NC State University';

  getSemesterBounds(semester: string): { start: Date; end: Date } | null {
    const normalized = semester.toLowerCase().trim();

    if (normalized.includes('spring') && normalized.includes('2026')) {
      return {
        start: new Date(2026, 0, 12), // Jan 12, 2026
        end: new Date(2026, 4, 8), // May 8, 2026 (after finals)
      };
    }

    if (normalized.includes('fall') && normalized.includes('2025')) {
      return {
        start: new Date(2025, 7, 18), // Aug 18, 2025
        end: new Date(2025, 11, 13), // Dec 13, 2025 (after finals)
      };
    }

    return null;
  }

  parseAcademicTerms(input: string, semester: string): string {
    // Map academic terms to specific dates for NCSU
    let transformed = input;

    const normalized = semester.toLowerCase().trim();

    if (normalized.includes('spring') && normalized.includes('2026')) {
      transformed = transformed.replace(
        /finals?\s+week/gi,
        'April 30 - May 7, 2026'
      );
      transformed = transformed.replace(
        /spring\s+break/gi,
        'March 16-21, 2026'
      );
    } else if (normalized.includes('fall') && normalized.includes('2025')) {
      transformed = transformed.replace(
        /finals?\s+week/gi,
        'December 6-12, 2025'
      );
      transformed = transformed.replace(
        /thanksgiving\s+break/gi,
        'November 26-29, 2025'
      );
    }

    return transformed;
  }
}

/**
 * Detect which calendar provider to use based on syllabus content.
 * Checks for university-specific mentions and returns appropriate provider.
 */
export function detectCalendarProvider(syllabusText: string): CalendarProvider {
  const lowerText = syllabusText.toLowerCase();

  // Check for NCSU indicators
  if (
    lowerText.includes('nc state') ||
    lowerText.includes('ncsu') ||
    lowerText.includes('north carolina state university')
  ) {
    return new NCSUCalendarProvider();
  }

  // Add more university-specific detectors here as needed
  // Example:
  // if (lowerText.includes('unc') || lowerText.includes('university of north carolina')) {
  //   return new UNCCalendarProvider();
  // }

  // Default to generic calendar
  return new GenericCalendarProvider();
}
