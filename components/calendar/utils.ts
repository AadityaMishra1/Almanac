import {
  BookOpen,
  Calendar as CalendarIcon,
  FlaskConical,
  FolderKanban,
  FileText,
  Presentation,
} from 'lucide-react';
import type { UnifiedEvent } from './types';

// Muted, cohesive color palette inspired by Cal.com and Notion.
// Brand amber is the dominant accent for high-priority items (exams).
// All other colors are desaturated and complementary.
export const getEventColor = (event: UnifiedEvent): {
  bg: string;
  border: string;
  text: string;
  accent: string;
  gradient: string;
  hover: string;
} => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    const colors: Record<string, {
      bg: string;
      border: string;
      text: string;
      accent: string;
      gradient: string;
      hover: string;
    }> = {
      homework: {
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
      other: {
        bg: 'bg-surface-secondary',
        border: 'border-border',
        text: 'text-[var(--text-secondary)]',
        accent: 'bg-[var(--text-tertiary)]',
        gradient: 'from-surface-secondary to-surface-tertiary',
        hover: 'hover:shadow-md',
      },
    };
    return colors[type] || colors.other;
  }

  // Calendar events — neutral styling
  return {
    bg: 'bg-surface-secondary',
    border: 'border-border',
    text: 'text-[var(--text-secondary)]',
    accent: 'bg-[var(--text-tertiary)]',
    gradient: 'from-surface-secondary to-surface-tertiary',
    hover: 'hover:shadow-md',
  };
};

export const getEventIcon = (event: UnifiedEvent) => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    if (type === 'exam') return FlaskConical;
    if (type === 'project') return FolderKanban;
    if (type === 'quiz') return FileText;
    if (type === 'presentation') return Presentation;
    return BookOpen;
  }
  return CalendarIcon;
};
