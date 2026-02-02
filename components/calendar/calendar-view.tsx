'use client';

import { Calendar, Views, type View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { localizer } from '@/lib/calendar/localizer';
import { CalendarToolbar } from './calendar-toolbar';
import { CalendarEventChip } from './calendar-event';
import { getCourseColor } from '@/lib/calendar/event-colors';
import { getAcademicDatesForSemester } from '@/lib/calendar/ncsu-academic-calendar';
import { findConflicts, type TimeSlot } from '@/lib/calendar/conflict-detection';
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
  isConflicting?: boolean;
}

/**
 * Convert Prisma event to calendar event.
 * CRITICAL: Use explicit year/month/day parsing to avoid timezone issues.
 */
function prismaEventToCalendarEvent(
  event: any,
  conflictingIds: Set<string>
): CalendarEvent {
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
    isConflicting: conflictingIds.has(event.id),
  };
}

interface CalendarViewProps {
  events: any[]; // Prisma events with course relation
  semester?: string; // e.g., "Spring 2026"
}

export function CalendarView({ events, semester = 'Spring 2026' }: CalendarViewProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Detect conflicts among timed events
  const conflictingIds = useMemo(() => {
    const timedEvents: TimeSlot[] = events
      .filter((e) => e.time) // Only timed events
      .map((e) => {
        const [yearStr, monthStr, dayStr] = e.date.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);

        const [hourStr, minuteStr] = e.time.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(year, month - 1, day, hour + 1, minute);

        return { eventId: e.id, start, end };
      });

    return findConflicts(timedEvents);
  }, [events]);

  // Transform Prisma events to calendar events with conflict detection
  const calendarEvents = useMemo(
    () => events.map((e) => prismaEventToCalendarEvent(e, conflictingIds)),
    [events, conflictingIds]
  );

  // Convert academic dates to background events
  // Type them as CalendarEvent to satisfy Calendar component typing
  const backgroundEvents = useMemo(() => {
    const academicDates = getAcademicDatesForSemester(semester);
    return academicDates.map((date) => ({
      id: `academic-${date.title}`,
      title: date.title,
      start: date.start,
      end: date.end,
      allDay: true,
      type: date.type,
      courseCode: '',
      courseColor: '',
      courseName: '',
      editable: false,
      isAcademicDate: true, // Flag to distinguish academic dates
    }));
  }, [semester]);

  // Event color-coding via eventPropGetter
  // Also styles academic background events
  const eventPropGetter = useCallback((event: CalendarEvent & { isAcademicDate?: boolean }) => {
    // Style academic background events
    if (event.isAcademicDate) {
      const type = event.type;

      if (type === 'break' || type === 'holiday') {
        return {
          style: {
            backgroundColor: '#fef3c7',
            borderLeft: '3px solid #f59e0b',
            opacity: 0.4,
            color: '#92400e',
          },
        };
      }

      if (type === 'finals') {
        return {
          style: {
            backgroundColor: '#fee2e2',
            borderLeft: '3px solid #ef4444',
            opacity: 0.4,
            color: '#991b1b',
          },
        };
      }

      if (type === 'semester-start' || type === 'semester-end') {
        return {
          style: {
            backgroundColor: '#dbeafe',
            borderLeft: '3px solid #3b82f6',
            opacity: 0.3,
            color: '#1e40af',
          },
        };
      }
    }

    // Style regular events with course color
    return {
      style: {
        backgroundColor: event.courseColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '0.75rem',
      },
    };
  }, []);

  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const onView = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const onSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const components = useMemo(
    () => ({
      toolbar: CalendarToolbar<CalendarEvent>,
      event: CalendarEventChip,
    }),
    []
  );

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={calendarEvents}
        backgroundEvents={backgroundEvents}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        onSelectEvent={onSelectEvent}
        views={['month', 'week', 'day']}
        components={components}
        eventPropGetter={eventPropGetter}
        style={{ height: '100%' }}
        startAccessor="start"
        endAccessor="end"
        popup={true}
        scrollToTime={new Date(0, 0, 0, 8, 0)}
      />
    </div>
  );
}
