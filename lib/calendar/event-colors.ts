/**
 * Color palette for course events.
 * 10 distinct colors for visual differentiation.
 */
export const COURSE_PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

/**
 * Get a deterministic color for a course.
 * If an explicit color is provided, use it.
 * Otherwise, compute a hash from the course code and select from palette.
 */
export function getCourseColor(
  courseCode: string,
  explicitColor?: string | null
): string {
  if (explicitColor) {
    return explicitColor;
  }

  // Simple string hash function
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    const char = courseCode.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  return COURSE_PALETTE[Math.abs(hash) % COURSE_PALETTE.length];
}
