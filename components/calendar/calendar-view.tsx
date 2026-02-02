'use client';

import { Calendar, Views, type View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { localizer } from '@/lib/calendar/localizer';
import { CalendarToolbar } from './calendar-toolbar';
import { getCourseColor } from '@/lib/calendar/event-colors';
import { useState, useMemo, useCallback } from 'react';

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
}

/**
 * Convert Prisma event to calendar event.
 * CRITICAL: Use explicit year/month/day parsing to avoid timezone issues.
 */
function prismaEventToCalendarEvent(event: any): CalendarEvent {
  // Parse date: "YYYY-MM-DD" format
  const [yearStr, monthStr, dayStr] = event.date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  let start: Date;
  let end: Date;
  let allDay: boolean;

  if (event.time) {
    // Timed event: parse "HH:MM" format
    const [hourStr, minuteStr] = event.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    start = new Date(year, month - 1, day, hour, minute);
    // Default 1 hour duration
    end = new Date(year, month - 1, day, hour + 1, minute);
    allDay = false;
  } else {
    // All-day event
    start = new Date(year, month - 1, day, 0, 0, 0);
    // End at midnight of next day (exclusive)
    end = new Date(year, month - 1, day + 1, 0, 0, 0);
    allDay = true;
  }

  const courseColor = getCourseColor(event.course.code, event.course.color);

  return {
    id: event.id,
    title: event.title,
    start,
    end,
    allDay,
    type: event.type,
    courseCode: event.course.code,
    courseColor,
    courseName: event.course.name,
    description: event.description || undefined,
    editable: event.editable,
  };
}

interface CalendarViewProps {
  events: any[]; // Prisma events with course relation
}

export function CalendarView({ events }: CalendarViewProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>('month');

  // Transform Prisma events to calendar events
  const calendarEvents = useMemo(
    () => events.map(prismaEventToCalendarEvent),
    [events]
  );

  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const onView = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const components = useMemo(
    () => ({
      toolbar: CalendarToolbar<CalendarEvent>,
    }),
    []
  );

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={calendarEvents}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        views={['month', 'week', 'day']}
        components={components}
        style={{ height: '100%' }}
        startAccessor="start"
        endAccessor="end"
        popup={true}
        scrollToTime={new Date(0, 0, 0, 8, 0)}
      />
    </div>
  );
}
