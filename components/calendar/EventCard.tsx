'use client';

import { format, parseISO } from 'date-fns';
import type { UnifiedEvent, View } from './types';
import { getEventColor, getEventIcon } from './utils';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/lib/store';

interface EventCardProps {
  event: UnifiedEvent;
  view: View;
  onClick: (event: UnifiedEvent) => void;
  className?: string;
}

export function EventCard({ event, view, onClick, className }: EventCardProps) {
  const colors = getEventColor(event);
  const Icon = getEventIcon(event);
  const isHighlighted = useChatStore((s) => s.highlightedEventIds.has(event.id));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(event);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(event);
    }
  };

  const isCompact = view === 'month';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group/event relative rounded-md cursor-pointer',
        'border-l-2 transition-all duration-150',
        colors.bg,
        colors.border,
        colors.text,
        colors.hover,
        'hover:scale-[1.01] active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        isCompact ? 'h-6 px-1.5 py-0.5' : 'px-2 py-2',
        isHighlighted && 'animate-pulse-highlight ring-2 ring-brand-500/50',
        className
      )}
      aria-label={`${event.title} - ${event.assignment_type || 'event'}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon
          className={cn('flex-shrink-0', isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5')}
          aria-hidden="true"
        />
        <span className={cn('truncate font-medium', isCompact ? 'text-xs' : 'text-sm')}>
          {event.title}
        </span>
        {event.is_synced_to_calendar && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 opacity-0 group-hover/event:opacity-100 transition-opacity"
            aria-label="Synced to Google Calendar"
          />
        )}
      </div>
      {!isCompact && (
        <div className="text-xs opacity-75 mt-0.5 font-medium">
          {format(parseISO(event.start_time), 'h:mm a')}
        </div>
      )}
    </div>
  );
}
