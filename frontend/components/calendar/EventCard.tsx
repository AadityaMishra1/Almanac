'use client';

import { CheckCircle2 } from 'lucide-react';
import type { UnifiedEvent, View } from './types';
import { getEventColor, getEventIcon } from './utils';

interface EventCardProps {
  event: UnifiedEvent;
  view: View;
  onClick: (event: UnifiedEvent) => void;
  className?: string;
}

export function EventCard({ event, view, onClick, className = '' }: EventCardProps) {
  const colors = getEventColor(event);
  const Icon = getEventIcon(event);

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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
        border-l-[3px] rounded-md px-2 py-1.5 text-xs
        shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200 cursor-pointer
        flex items-center gap-1.5 group/event
        backdrop-blur-sm min-h-[44px]
        ${className}
      `}
      aria-label={`${event.title} - ${event.assignment_type || 'event'}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0 opacity-90" aria-hidden="true" />
      <span className="truncate flex-1 font-semibold tracking-tight">{event.title}</span>
      {event.is_synced_to_calendar && (
        <CheckCircle2
          className="w-3 h-3 flex-shrink-0 opacity-70 group-hover/event:opacity-100 transition-opacity"
          aria-label="Synced to calendar"
        />
      )}
    </div>
  );
}
