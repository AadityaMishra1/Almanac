'use client';

import { ChevronLeft, ChevronRight, Grid3x3, Columns, Square } from 'lucide-react';
import { format } from 'date-fns';
import type { View } from './types';

interface CalendarHeaderProps {
  currentDate: Date;
  view: View;
  weekDays?: Date[];
  onNavigate: (direction: 'prev' | 'next') => void;
  onViewChange: (view: View) => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  weekDays = [],
  onNavigate,
  onViewChange,
  onToday,
}: CalendarHeaderProps) {
  const getTitle = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week' && weekDays[0]) return `Week of ${format(weekDays[0], 'MMM d')}`;
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hover:scale-110 active:scale-95"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onNavigate('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hover:scale-110 active:scale-95"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* View Switcher */}
        <div className="hidden sm:flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => onViewChange('month')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${view === 'month'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            aria-pressed={view === 'month'}
            aria-label="Month view"
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Month</span>
            </div>
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${view === 'week'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            aria-pressed={view === 'week'}
            aria-label="Week view"
          >
            <div className="flex items-center gap-2">
              <Columns className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Week</span>
            </div>
          </button>
          <button
            onClick={() => onViewChange('day')}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${view === 'day'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            aria-pressed={view === 'day'}
            aria-label="Day view"
          >
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Day</span>
            </div>
          </button>
        </div>

        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          Today
        </button>
      </div>
    </div>
  );
}
