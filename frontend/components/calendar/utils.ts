import { BookOpen, Calendar as CalendarIcon, TestTube, Briefcase, FileText } from 'lucide-react';
import type { UnifiedEvent } from './types';

// Modern color palette with gradients and enhanced contrast
// Optimized for both light and dark modes with WCAG AA compliance
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
        bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40',
        border: 'border-blue-400 dark:border-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
        accent: 'bg-blue-500 dark:bg-blue-400',
        gradient: 'from-blue-500 to-cyan-500',
        hover: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50'
      },
      exam: {
        bg: 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40',
        border: 'border-rose-400 dark:border-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        accent: 'bg-rose-500 dark:bg-rose-400',
        gradient: 'from-rose-500 to-red-500',
        hover: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50'
      },
      project: {
        bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/40 dark:to-fuchsia-950/40',
        border: 'border-purple-400 dark:border-purple-500',
        text: 'text-purple-700 dark:text-purple-300',
        accent: 'bg-purple-500 dark:bg-purple-400',
        gradient: 'from-purple-500 to-fuchsia-500',
        hover: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50'
      },
      quiz: {
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40',
        border: 'border-amber-400 dark:border-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        accent: 'bg-amber-500 dark:bg-amber-400',
        gradient: 'from-amber-500 to-yellow-500',
        hover: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50'
      },
      presentation: {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40',
        border: 'border-emerald-400 dark:border-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        accent: 'bg-emerald-500 dark:bg-emerald-400',
        gradient: 'from-emerald-500 to-green-500',
        hover: 'hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/50'
      },
      other: {
        bg: 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/40 dark:to-gray-900/40',
        border: 'border-slate-400 dark:border-slate-500',
        text: 'text-slate-700 dark:text-slate-300',
        accent: 'bg-slate-500 dark:bg-slate-400',
        gradient: 'from-slate-500 to-gray-500',
        hover: 'hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50'
      },
    };
    return colors[type] || colors.other;
  } else {
    return {
      bg: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40',
      border: 'border-indigo-400 dark:border-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-300',
      accent: 'bg-indigo-500 dark:bg-indigo-400',
      gradient: 'from-indigo-500 to-blue-500',
      hover: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50'
    };
  }
};

export const getEventIcon = (event: UnifiedEvent) => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    if (type === 'exam') return TestTube;
    if (type === 'project') return Briefcase;
    if (type === 'quiz') return FileText;
    return BookOpen;
  }
  return CalendarIcon;
};
