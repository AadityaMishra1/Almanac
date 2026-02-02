'use client';

import { Calendar, Views, type View, type SlotInfo } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { localizer } from '@/lib/calendar/localizer';
import { CalendarToolbar } from './calendar-toolbar';
import { CalendarEventChip } from './calendar-event';
import { EventDetailModal } from './event-detail-modal';
import { CreateEventModal } from './create-event-modal';
import { getCourseColor } from '@/lib/calendar/event-colors';
import { getAcademicDatesForSemester } from '@/lib/calendar/ncsu-academic-calendar';
import { findConflicts, type TimeSlot } from '@/lib/calendar/conflict-detection';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { syncCalendar } from '@/app/server-actions/calendar';
import type { SyncStatus } from './sync-status-indicator';
import type { SyncResult } from '@/lib/sync/sync-engine';

/**
 * Hook to detect mobile screen size (<768px).
 * SSR-safe: defaults to false on server, updates on client.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

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
  googleEventId?: string | null;
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
    googleEventId: event.googleEventId || undefined,
  };
}

interface CalendarViewProps {
  events: any[]; // Prisma events with course relation
  courses: Course[]; // Available courses for event creation
  semester?: string; // e.g., "Spring 2026"
  hasGoogleAuth?: boolean; // Whether user is authenticated with Google
}

export function CalendarView({ events, courses, semester = 'Spring 2026', hasGoogleAuth = false }: CalendarViewProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitial, setCreateModalInitial] = useState<{
    date?: string;
    time?: string;
    allDay?: boolean;
  }>({});

  // Sync state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | undefined>();
  const lastSyncTimeRef = useRef<number>(0);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-switch to day view on mobile if currently in month view
  useEffect(() => {
    if (isMobile && view === 'month') {
      setView('day');
    }
  }, [isMobile]);

  // Handle sync operation
  const handleSync = useCallback(async () => {
    // Client-side rate limiting check
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    const THROTTLE_MS = 10_000; // 10 seconds

    if (timeSinceLastSync < THROTTLE_MS && lastSyncTimeRef.current > 0) {
      const secondsRemaining = Math.ceil((THROTTLE_MS - timeSinceLastSync) / 1000);
      setLastSyncResult({
        ok: false,
        fetched: 0,
        pushed: 0,
        skippedDuplicates: 0,
        errors: [`Synced recently. Try again in ${secondsRemaining} seconds.`],
      });
      setSyncStatus('error');

      // Auto-reset to idle after 3 seconds
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
      autoResetTimerRef.current = setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
      return;
    }

    // Update last sync time and set status
    lastSyncTimeRef.current = now;
    setSyncStatus('syncing');

    try {
      const result = await syncCalendar();
      setLastSyncResult(result);

      if (result.ok) {
        setSyncStatus('done');
        // Refresh page to show new events
        router.refresh();

        // Auto-reset to idle after 5 seconds
        if (autoResetTimerRef.current) {
          clearTimeout(autoResetTimerRef.current);
        }
        autoResetTimerRef.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 5000);
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      setSyncStatus('error');
      setLastSyncResult({
        ok: false,
        fetched: 0,
        pushed: 0,
        skippedDuplicates: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
      });
    }
  }, [router]);

  // Auto-sync on mount if user has Google auth
  useEffect(() => {
    if (hasGoogleAuth) {
      handleSync();
    }
  }, [hasGoogleAuth, handleSync]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, []);

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

  // Convert academic dates to calendar events (not backgroundEvents)
  // This ensures multi-day events span properly in month view
  const academicEvents = useMemo(() => {
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
      isAcademicDate: true, // Flag for special styling
    }));
  }, [semester]);

  // Combine user events with academic calendar events
  const allEvents = useMemo(
    () => [...calendarEvents, ...academicEvents],
    [calendarEvents, academicEvents]
  );

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
    // External (read-only) events get dashed border and reduced opacity
    const isExternal = !event.editable && event.courseCode === 'GCAL';

    return {
      style: {
        backgroundColor: event.courseColor,
        borderRadius: '4px',
        opacity: isExternal ? 0.7 : 0.9,
        color: 'white',
        border: isExternal ? '2px dashed rgba(255, 255, 255, 0.5)' : 'none',
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

  const onSelectEvent = useCallback((event: CalendarEvent & { isAcademicDate?: boolean }) => {
    // Don't open modal for academic calendar events
    if (event.isAcademicDate) {
      return;
    }
    setSelectedEvent(event);
  }, []);

  const handleEventUpdated = useCallback(
    (updatedEvent: CalendarEvent) => {
      // Optimistic update: update the event in local state
      // The page will refetch on next navigation, but this keeps UI responsive
      setSelectedEvent(null);
    },
    []
  );

  const handleEventDeleted = useCallback(() => {
    // Close modal after deletion
    setSelectedEvent(null);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const start = slotInfo.start;

    // Format date as YYYY-MM-DD
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Check if it's an all-day slot (month view) or timed slot (week/day view)
    const isAllDay = view === 'month' || slotInfo.action === 'click';

    if (isAllDay) {
      setCreateModalInitial({ date: dateStr, allDay: true });
    } else {
      // Format time as HH:MM
      const hour = String(start.getHours()).padStart(2, '0');
      const minute = String(start.getMinutes()).padStart(2, '0');
      const timeStr = `${hour}:${minute}`;
      setCreateModalInitial({ date: dateStr, time: timeStr, allDay: false });
    }

    setShowCreateModal(true);
  }, [view]);

  const handleCreateButtonClick = useCallback(() => {
    setCreateModalInitial({});
    setShowCreateModal(true);
  }, []);

  const components = useMemo(
    () => ({
      toolbar: (props: any) => (
        <CalendarToolbar
          {...props}
          isMobile={isMobile}
          onCreateEvent={handleCreateButtonClick}
          syncStatus={hasGoogleAuth ? syncStatus : undefined}
          lastSyncResult={lastSyncResult}
          onSync={hasGoogleAuth ? handleSync : undefined}
        />
      ),
      event: CalendarEventChip,
    }),
    [isMobile, handleCreateButtonClick, hasGoogleAuth, syncStatus, lastSyncResult, handleSync]
  );

  return (
    <div className={isMobile ? "h-[calc(100vh-80px)] w-full" : "h-[calc(100vh-120px)] w-full"}>
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={allEvents}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        onSelectEvent={onSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        views={['month', 'week', 'day']}
        components={components}
        eventPropGetter={eventPropGetter}
        dayLayoutAlgorithm="no-overlap"
        style={{ height: '100%' }}
        startAccessor="start"
        endAccessor="end"
        popup={true}
        scrollToTime={new Date(0, 0, 0, 8, 0)}
      />

      {/* Floating Action Button (Mobile only) */}
      {isMobile && (
        <Button
          onClick={handleCreateButtonClick}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg p-0"
          aria-label="Create event"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />

      <CreateEventModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        courses={courses}
        initialDate={createModalInitial.date}
        initialTime={createModalInitial.time}
        initialAllDay={createModalInitial.allDay}
      />
    </div>
  );
}
