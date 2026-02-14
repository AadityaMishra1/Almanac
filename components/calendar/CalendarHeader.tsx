'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { View } from './types';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  currentDate: Date;
  view: View;
  weekDays?: Date[];
  onNavigate: (direction: 'prev' | 'next') => void;
  onViewChange: (view: View) => void;
  onToday: () => void;
  className?: string;
}

export function CalendarHeader({
  currentDate,
  view,
  weekDays = [],
  onNavigate,
  onViewChange,
  onToday,
  className,
}: CalendarHeaderProps) {
  const getTitle = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week' && weekDays[0]) return `Week of ${format(weekDays[0], 'MMM d')}`;
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className={cn(
      'mb-6 flex items-center justify-between border-b border-border-subtle py-3 px-1',
      className
    )}>
      {/* Left: Navigation + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors duration-150 active:scale-95"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors duration-150 active:scale-95"
            aria-label="Next period"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {getTitle()}
        </h2>
      </div>

      {/* Right: View Switcher + Today */}
      <div className="flex items-center gap-3">
        {/* Segmented control */}
        <div className="hidden sm:flex items-center bg-surface-secondary rounded-lg p-1 gap-0.5">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150',
                view === v
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-surface-tertiary'
              )}
              aria-pressed={view === v}
              aria-label={`${v.charAt(0).toUpperCase() + v.slice(1)} view`}
            >
              <span className="hidden md:inline">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
              <span className="md:hidden">{v.charAt(0).toUpperCase()}</span>
              <kbd className="hidden lg:inline ml-2 text-[10px] opacity-60">{v.charAt(0).toUpperCase()}</kbd>
            </button>
          ))}
        </div>

        {/* Today button */}
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium bg-surface-tertiary hover:bg-brand-50 text-[var(--text-primary)] rounded-lg transition-colors duration-150 active:scale-95"
          aria-label="Go to today"
        >
          Today
          <kbd className="hidden md:inline ml-2 text-[10px] opacity-60">T</kbd>
        </button>
      </div>
    </div>
  );
}
