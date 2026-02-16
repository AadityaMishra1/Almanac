import {
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardList,
  Cloud,
  FlaskConical,
  FileText,
  FolderKanban,
  GraduationCap,
  Microscope,
  Presentation,
} from 'lucide-react';
import type { UnifiedEvent } from './types';

// ── Course Color Palette ──────────────────────────────────────────────
// 10 visually distinct, curated color schemes for auto-assigning to courses.
// Each course gets a deterministic color based on its ID.

export interface ColorScheme {
  bg: string;
  border: string;
  text: string;
  accent: string;
  gradient: string;
  hover: string;
}

const COURSE_COLORS: ColorScheme[] = [
  {
    bg: 'bg-blue-50/80 dark:bg-blue-950/30',
    border: 'border-blue-400 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    accent: 'bg-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    hover: 'hover:bg-blue-100/80 dark:hover:bg-blue-950/50',
  },
  {
    bg: 'bg-rose-50/80 dark:bg-rose-950/30',
    border: 'border-rose-400 dark:border-rose-700',
    text: 'text-rose-700 dark:text-rose-300',
    accent: 'bg-rose-500',
    gradient: 'from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/30',
    hover: 'hover:bg-rose-100/80 dark:hover:bg-rose-950/50',
  },
  {
    bg: 'bg-teal-50/80 dark:bg-teal-950/30',
    border: 'border-teal-400 dark:border-teal-700',
    text: 'text-teal-700 dark:text-teal-300',
    accent: 'bg-teal-500',
    gradient: 'from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/30',
    hover: 'hover:bg-teal-100/80 dark:hover:bg-teal-950/50',
  },
  {
    bg: 'bg-violet-50/80 dark:bg-violet-950/30',
    border: 'border-violet-400 dark:border-violet-700',
    text: 'text-violet-700 dark:text-violet-300',
    accent: 'bg-violet-500',
    gradient: 'from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30',
    hover: 'hover:bg-violet-100/80 dark:hover:bg-violet-950/50',
  },
  {
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    border: 'border-amber-400 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    accent: 'bg-amber-500',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30',
    hover: 'hover:bg-amber-100/80 dark:hover:bg-amber-950/50',
  },
  {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    border: 'border-emerald-400 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    accent: 'bg-emerald-500',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30',
    hover: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50',
  },
  {
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
    border: 'border-cyan-400 dark:border-cyan-700',
    text: 'text-cyan-700 dark:text-cyan-300',
    accent: 'bg-cyan-500',
    gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/30',
    hover: 'hover:bg-cyan-100/80 dark:hover:bg-cyan-950/50',
  },
  {
    bg: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30',
    border: 'border-fuchsia-400 dark:border-fuchsia-700',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    accent: 'bg-fuchsia-500',
    gradient: 'from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-950/30 dark:to-fuchsia-900/30',
    hover: 'hover:bg-fuchsia-100/80 dark:hover:bg-fuchsia-950/50',
  },
  {
    bg: 'bg-orange-50/80 dark:bg-orange-950/30',
    border: 'border-orange-400 dark:border-orange-700',
    text: 'text-orange-700 dark:text-orange-300',
    accent: 'bg-orange-500',
    gradient: 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30',
    hover: 'hover:bg-orange-100/80 dark:hover:bg-orange-950/50',
  },
  {
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    border: 'border-indigo-400 dark:border-indigo-700',
    text: 'text-indigo-700 dark:text-indigo-300',
    accent: 'bg-indigo-500',
    gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30',
    hover: 'hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50',
  },
];

// Deterministic hash for course ID → palette index
function hashCourseId(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = ((hash << 5) - hash + courseId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % COURSE_COLORS.length;
}

// Get color scheme for a course, deterministically assigned
function getCourseColor(courseId: string | null | undefined): ColorScheme | null {
  if (!courseId) return null;
  return COURSE_COLORS[hashCourseId(courseId)];
}

// ── Type-Based Fallback Colors ────────────────────────────────────────
// Used for events without a course (standalone / chat-created events).

const TYPE_COLORS: Record<string, ColorScheme> = {
  homework: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    accent: 'bg-blue-400 dark:bg-blue-600',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    hover: 'hover:shadow-md',
  },
  assignment: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    accent: 'bg-blue-400 dark:bg-blue-600',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    hover: 'hover:shadow-md',
  },
  exam: {
    bg: 'bg-brand-50 dark:bg-brand-50',
    border: 'border-brand-400 dark:border-brand-600',
    text: 'text-brand-800 dark:text-brand-200',
    accent: 'bg-brand-500 dark:bg-brand-600',
    gradient: 'from-brand-50 to-brand-100 dark:from-brand-50 dark:to-brand-100',
    hover: 'hover:shadow-md',
  },
  project: {
    bg: 'bg-teal-50/80 dark:bg-teal-950/30',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-800 dark:text-teal-200',
    accent: 'bg-teal-400 dark:bg-teal-600',
    gradient: 'from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/30',
    hover: 'hover:shadow-md',
  },
  quiz: {
    bg: 'bg-violet-50/80 dark:bg-violet-950/30',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-800 dark:text-violet-200',
    accent: 'bg-violet-400 dark:bg-violet-600',
    gradient: 'from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30',
    hover: 'hover:shadow-md',
  },
  presentation: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    accent: 'bg-emerald-400 dark:bg-emerald-600',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30',
    hover: 'hover:shadow-md',
  },
  reading: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    accent: 'bg-amber-400 dark:bg-amber-600',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30',
    hover: 'hover:shadow-md',
  },
  lecture: {
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-200',
    accent: 'bg-indigo-400 dark:bg-indigo-600',
    gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30',
    hover: 'hover:shadow-md',
  },
  lab: {
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-800 dark:text-cyan-200',
    accent: 'bg-cyan-400 dark:bg-cyan-600',
    gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/30',
    hover: 'hover:shadow-md',
  },
  study: {
    bg: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30',
    border: 'border-fuchsia-300 dark:border-fuchsia-700',
    text: 'text-fuchsia-800 dark:text-fuchsia-200',
    accent: 'bg-fuchsia-400 dark:bg-fuchsia-600',
    gradient: 'from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-950/30 dark:to-fuchsia-900/30',
    hover: 'hover:shadow-md',
  },
  other: {
    bg: 'bg-surface-secondary',
    border: 'border-border',
    text: 'text-[var(--text-secondary)]',
    accent: 'bg-[var(--text-tertiary)]',
    gradient: 'from-surface-secondary to-surface-tertiary',
    hover: 'hover:shadow-md',
  },
};

const NEUTRAL_COLOR: ColorScheme = {
  bg: 'bg-surface-secondary',
  border: 'border-border',
  text: 'text-[var(--text-secondary)]',
  accent: 'bg-[var(--text-tertiary)]',
  gradient: 'from-surface-secondary to-surface-tertiary',
  hover: 'hover:shadow-md',
};

// ── Public API ────────────────────────────────────────────────────────

/**
 * Get the color scheme for an event.
 * Priority: course-based color (if event has course_id) > type-based fallback.
 */
export const getEventColor = (event: UnifiedEvent): ColorScheme => {
  // Course-based coloring: all events from the same course share a color
  if (event.type === 'assignment' && event.course_id) {
    const courseColor = getCourseColor(event.course_id);
    if (courseColor) return courseColor;
  }

  // Type-based fallback for events without a course
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    return TYPE_COLORS[type] || TYPE_COLORS.other;
  }

  // Calendar events (Google Calendar imports) — neutral styling
  return NEUTRAL_COLOR;
};

/**
 * Complete icon mapping for all event types.
 * Covers: exam, assignment/homework, quiz, reading, lecture, lab,
 * project, study, presentation, calendar_event, other.
 */
export const getEventIcon = (event: UnifiedEvent) => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    switch (type) {
      case 'exam': return FlaskConical;
      case 'assignment':
      case 'homework': return ClipboardList;
      case 'quiz': return FileText;
      case 'reading': return BookOpen;
      case 'lecture': return GraduationCap;
      case 'lab': return Microscope;
      case 'project': return FolderKanban;
      case 'study': return Brain;
      case 'presentation': return Presentation;
      case 'other': return CalendarDays;
      default: return ClipboardList;
    }
  }

  // calendar_event (Google Calendar imports) — cloud icon to distinguish synced events
  return Cloud;
};
