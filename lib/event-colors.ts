// Universal type-based colors for events
export const EVENT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Assignments - Yellow/Orange
  'Assignment': { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' },
  'Homework': { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' },
  'HW': { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' },
  'Project': { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' },

  // Tests/Exams - Red
  'Test': { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
  'Exam': { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
  'Midterm': { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
  'Final': { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },

  // Quizzes - Purple
  'Quiz': { bg: '#a855f7', border: '#9333ea', text: '#ffffff' },

  // Lectures/Classes - Use course color (handled separately)
  'Lecture': { bg: '', border: '', text: '' }, // Will use course color
  'Class': { bg: '', border: '', text: '' }, // Will use course color
  'Lab': { bg: '', border: '', text: '' }, // Will use course color

  // Due dates - Pink
  'Due': { bg: '#ec4899', border: '#db2777', text: '#ffffff' },
  'Deadline': { bg: '#ec4899', border: '#db2777', text: '#ffffff' },

  // Other - Gray
  'Other': { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
}

export function getEventColor(type: string, courseColor: string): { bg: string; border: string; text: string } {
  // Normalize type (case-insensitive, trim)
  const normalizedType = type.trim()

  // Check for exact match first
  if (EVENT_TYPE_COLORS[normalizedType]) {
    const colors = EVENT_TYPE_COLORS[normalizedType]
    // If it's a lecture/class type, use course color
    if (!colors.bg && !colors.border) {
      return { bg: courseColor, border: courseColor, text: '#ffffff' }
    }
    return colors
  }

  // Check for partial matches (case-insensitive)
  const lowerType = normalizedType.toLowerCase()
  for (const [key, value] of Object.entries(EVENT_TYPE_COLORS)) {
    if (lowerType.includes(key.toLowerCase())) {
      if (!value.bg && !value.border) {
        return { bg: courseColor, border: courseColor, text: '#ffffff' }
      }
      return value
    }
  }

  // Default to "Other" color
  return EVENT_TYPE_COLORS['Other']
}
