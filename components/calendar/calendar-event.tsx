'use client';

import { AlertTriangle } from 'lucide-react';
import type { EventProps } from 'react-big-calendar';

/**
 * Calendar event type for react-big-calendar.
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: string;
  courseCode: string;
  courseColor: string;
  courseName: string;
  description?: string;
  editable: boolean;
  isConflicting?: boolean;
}

/**
 * Custom event chip component for react-big-calendar.
 * Shows event title with optional conflict indicator.
 */
export function CalendarEventChip({ event }: EventProps<CalendarEvent>) {
  return (
    <div className="flex items-center gap-1 h-full px-1">
      {event.isConflicting && (
        <div title="Time conflict detected">
          <AlertTriangle className="flex-shrink-0 text-amber-500" size={12} />
        </div>
      )}
      <span className="text-xs text-white truncate">{event.title}</span>
    </div>
  );
}
