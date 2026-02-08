/**
 * Academic calendar date type.
 */
export interface AcademicDate {
  title: string;
  start: Date;
  end: Date;
  type: 'break' | 'finals' | 'holiday' | 'semester-start' | 'semester-end';
}

/**
 * NCSU Spring 2026 academic calendar dates.
 * Verified from official NCSU academic calendar.
 */
export const SPRING_2026: AcademicDate[] = [
  {
    title: 'Spring Semester Begins',
    start: new Date(2026, 0, 12), // Jan 12
    end: new Date(2026, 0, 13),
    type: 'semester-start',
  },
  {
    title: 'MLK Day',
    start: new Date(2026, 0, 19), // Jan 19
    end: new Date(2026, 0, 20),
    type: 'holiday',
  },
  {
    title: 'Wellness Day',
    start: new Date(2026, 1, 17), // Feb 17
    end: new Date(2026, 1, 18),
    type: 'holiday',
  },
  {
    title: 'Spring Break',
    start: new Date(2026, 2, 16, 0, 0, 0), // Mar 16 at midnight
    end: new Date(2026, 2, 22, 0, 0, 0), // Mar 22 at midnight (end of Mar 21)
    type: 'break',
  },
  {
    title: 'Last Day of Classes',
    start: new Date(2026, 3, 28), // Apr 28
    end: new Date(2026, 3, 29),
    type: 'semester-end',
  },
  {
    title: 'Reading Day',
    start: new Date(2026, 3, 29), // Apr 29
    end: new Date(2026, 3, 30),
    type: 'break',
  },
  {
    title: 'Final Examinations',
    start: new Date(2026, 3, 30), // Apr 30
    end: new Date(2026, 4, 8), // May 7 end (exclusive end = May 8)
    type: 'finals',
  },
];

/**
 * NCSU Fall 2025 academic calendar dates.
 */
export const FALL_2025: AcademicDate[] = [
  {
    title: 'Fall Semester Begins',
    start: new Date(2025, 7, 18), // Aug 18
    end: new Date(2025, 7, 19),
    type: 'semester-start',
  },
  {
    title: 'Labor Day',
    start: new Date(2025, 8, 1), // Sep 1
    end: new Date(2025, 8, 2),
    type: 'holiday',
  },
  {
    title: 'Thanksgiving Break',
    start: new Date(2025, 10, 26), // Nov 26
    end: new Date(2025, 10, 30), // Nov 29 end (exclusive end = 30)
    type: 'break',
  },
  {
    title: 'Last Day of Classes',
    start: new Date(2025, 11, 4), // Dec 4
    end: new Date(2025, 11, 5),
    type: 'semester-end',
  },
  {
    title: 'Reading Day',
    start: new Date(2025, 11, 5), // Dec 5
    end: new Date(2025, 11, 6),
    type: 'break',
  },
  {
    title: 'Final Examinations',
    start: new Date(2025, 11, 6), // Dec 6
    end: new Date(2025, 11, 13), // Dec 12 end (exclusive end = 13)
    type: 'finals',
  },
];

/**
 * Get academic dates for a given semester.
 */
export function getAcademicDatesForSemester(semester: string): AcademicDate[] {
  const normalized = semester.toLowerCase().trim();

  if (normalized.includes('spring') && normalized.includes('2026')) {
    return SPRING_2026;
  }

  if (normalized.includes('fall') && normalized.includes('2025')) {
    return FALL_2025;
  }

  return [];
}
