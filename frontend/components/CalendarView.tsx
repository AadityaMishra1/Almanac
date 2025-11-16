'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, isToday, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, BookOpen, MapPin, Clock, X, Grid3x3, Columns, Square, List } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface UnifiedEvent {
  id: string;
  type: 'assignment' | 'calendar_event';
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  course_name?: string;
  course_code?: string;
  assignment_type?: string;
  is_synced_to_calendar?: boolean;
  google_event_id?: string;
  location?: string;
  source: 'database' | 'google_calendar';
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: UnifiedEvent;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate time range based on current view
      let timeMin: Date;
      let timeMax: Date;

      if (view === 'month') {
        timeMin = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        timeMax = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      } else if (view === 'week') {
        const weekStart = startOfWeek(currentDate);
        timeMin = weekStart;
        timeMax = new Date(weekStart);
        timeMax.setDate(timeMax.getDate() + 7);
      } else {
        // day or agenda view
        timeMin = new Date(currentDate);
        timeMin.setHours(0, 0, 0, 0);
        timeMax = new Date(currentDate);
        timeMax.setHours(23, 59, 59, 999);
      }

      const response = await api.get('/calendar/unified-events', {
        params: {
          time_min: timeMin.toISOString(),
          time_max: timeMax.toISOString(),
        },
      });

      const unifiedEvents: UnifiedEvent[] = response.data.events || [];

      // Transform to Calendar events
      const calendarEvents: CalendarEvent[] = unifiedEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        resource: event,
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Generate abstract color from string (for consistent coloring by course/source)
  const getColorFromString = useCallback((str: string) => {
    // Abstract color palette - vibrant and distinct
    const colors = [
      { bg: '#8b5cf6', border: '#7c3aed' }, // Purple
      { bg: '#06b6d4', border: '#0891b2' }, // Cyan
      { bg: '#f59e0b', border: '#d97706' }, // Amber
      { bg: '#ec4899', border: '#db2777' }, // Pink
      { bg: '#10b981', border: '#059669' }, // Emerald
      { bg: '#3b82f6', border: '#2563eb' }, // Blue
      { bg: '#ef4444', border: '#dc2626' }, // Red
      { bg: '#6366f1', border: '#4f46e5' }, // Indigo
      { bg: '#14b8a6', border: '#0d9488' }, // Teal
      { bg: '#f97316', border: '#ea580c' }, // Orange
      { bg: '#a855f7', border: '#9333ea' }, // Violet
      { bg: '#84cc16', border: '#65a30d' }, // Lime
    ];
    
    // Simple hash function to get consistent color
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Custom event style getter with modern design
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const resource = event.resource;
    let backgroundColor = '#6366f1'; // Default indigo
    let borderColor = '#4f46e5';

    if (resource.type === 'assignment') {
      // Try to get color by course code/name for consistency
      const identifier = resource.course_code || resource.course_name || resource.title || 'assignment';
      const colors = getColorFromString(identifier.toLowerCase());
      backgroundColor = colors.bg;
      borderColor = colors.border;
    } else if (resource.source === 'google_calendar') {
      // Google Calendar events - use abstract color based on title
      const colors = getColorFromString(resource.title.toLowerCase());
      backgroundColor = colors.bg;
      borderColor = colors.border;
    } else {
      // Fallback
      backgroundColor = '#6366f1';
      borderColor = '#4f46e5';
    }

    return {
      style: {
        backgroundColor,
        borderLeft: `3px solid ${borderColor}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderRadius: '5px',
        opacity: 0.96,
        color: 'white',
        display: 'block',
        fontSize: '0.8125rem',
        fontWeight: '600',
        padding: '6px 10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
    };
  }, [getColorFromString]);

  // Custom toolbar with modern design
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView }: any) => {
    const viewIcons: Record<string, any> = {
      month: Grid3x3,
      week: Columns,
      day: Square,
      agenda: List,
    };

    return (
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Date Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onNavigate('PREV')}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-l-xl transition-all duration-200 group"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </button>
              <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
              <button
                onClick={() => onNavigate('TODAY')}
                className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Today
              </button>
              <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
              <button
                onClick={() => onNavigate('NEXT')}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-xl transition-all duration-200 group"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {label}
              </h2>
            </div>
          </div>

          {/* Right: View Switcher */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5">
            {['month', 'week', 'day', 'agenda'].map((viewName) => {
              const Icon = viewIcons[viewName];
              return (
                <button
                  key={viewName}
                  onClick={() => onView(viewName)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200
                    ${currentView === viewName
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="capitalize hidden sm:inline">{viewName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Custom event component with enhanced styling
  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const resource = event.resource;
    const startTime = format(event.start, 'h:mm a');
    const isShortEvent = (event.end.getTime() - event.start.getTime()) < 3600000; // Less than 1 hour

    return (
      <div className="group h-full flex flex-col justify-between overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            {resource.is_synced_to_calendar && (
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-90" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs sm:text-sm truncate leading-tight">
                {event.title}
              </div>
              {!isShortEvent && resource.course_code && (
                <div className="text-xs opacity-90 truncate mt-0.5">
                  {resource.course_code}
                </div>
              )}
            </div>
          </div>
        </div>
        {!isShortEvent && (
          <div className="text-xs opacity-75 font-medium mt-1">
            {startTime}
          </div>
        )}
      </div>
    );
  };

  // Custom agenda event component
  const CustomAgendaEvent = ({ event }: { event: CalendarEvent }) => {
    const resource = event.resource;

    return (
      <div className="flex items-center space-x-2">
        {resource.is_synced_to_calendar && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
        <span className="font-medium">{event.title}</span>
        {resource.course_name && (
          <span className="text-sm text-gray-500">- {resource.course_name}</span>
        )}
      </div>
    );
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        /* Modern Calendar Styling - Google Calendar Inspired */
        .rbc-calendar {
          font-family: inherit;
          background: transparent;
        }

        /* Header Styling */
        .rbc-header {
          padding: 16px 8px;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.075em;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(to bottom, #fafafa, #f9fafb);
        }

        .dark .rbc-header {
          color: #9ca3af;
          border-bottom-color: #374151;
          background: linear-gradient(to bottom, #1f2937, #111827);
        }

        /* Today Cell Highlighting - Subtle and Modern */
        .rbc-today {
          background-color: #f0f9ff;
        }

        .dark .rbc-today {
          background-color: #1e293b;
        }

        /* Off-range dates (previous/next month) */
        .rbc-off-range-bg {
          background-color: #f9fafb;
          opacity: 0.5;
        }

        .dark .rbc-off-range-bg {
          background-color: #1f2937;
          opacity: 0.3;
        }

        .rbc-off-range {
          color: #d1d5db !important;
        }

        .dark .rbc-off-range {
          color: #4b5563 !important;
        }

        /* Date Numbers - Modern Typography */
        .rbc-date-cell {
          padding: 8px !important;
          text-align: left !important;
          position: absolute !important;
          top: 6px !important;
          left: 6px !important;
          right: auto !important;
          bottom: auto !important;
          z-index: 10 !important;
          min-height: auto !important;
          height: auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .rbc-day-bg {
          min-height: 120px;
          transition: background-color 0.2s ease;
        }

        .rbc-day-bg:hover {
          background-color: rgba(99, 102, 241, 0.02);
        }

        .dark .rbc-day-bg:hover {
          background-color: rgba(99, 102, 241, 0.05);
        }

        .rbc-month-row {
          min-height: 120px;
        }

        .rbc-date-cell > a,
        .rbc-date-cell {
          color: #1f2937 !important;
          font-weight: 600 !important;
          font-size: 0.9375rem !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          transition: all 0.2s ease !important;
        }

        .dark .rbc-date-cell > a,
        .dark .rbc-date-cell {
          color: #f3f4f6 !important;
        }

        /* Today's date - Circular highlight like Google Calendar */
        .rbc-date-cell.rbc-now > a,
        .rbc-date-cell.rbc-current > a,
        .rbc-date-cell.rbc-now,
        .rbc-date-cell.rbc-current {
          background-color: #4f46e5 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3) !important;
        }

        .dark .rbc-date-cell.rbc-now > a,
        .dark .rbc-date-cell.rbc-current > a,
        .dark .rbc-date-cell.rbc-now,
        .dark .rbc-date-cell.rbc-current {
          background-color: #6366f1 !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4) !important;
        }

        .rbc-date-cell > a:hover {
          background-color: #e5e7eb !important;
          color: #1f2937 !important;
        }

        .dark .rbc-date-cell > a:hover {
          background-color: #374151 !important;
          color: #f3f4f6 !important;
        }

        /* Modern Event Styling - Google Calendar Style */
        .rbc-event {
          padding: 6px 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: none !important;
          margin: 1px 0 !important;
        }

        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 5;
        }

        .rbc-event:active {
          transform: translateY(0);
        }

        /* Month View Event Containers */
        .rbc-month-view .rbc-day-slot {
          position: relative;
          min-height: 120px;
          display: flex;
          flex-direction: column;
        }

        .rbc-month-view .rbc-events-container {
          position: absolute !important;
          top: 44px !important;
          left: 4px !important;
          right: 4px !important;
          bottom: 4px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          padding-right: 2px !important;
        }

        .rbc-month-view .rbc-event {
          position: relative !important;
          width: 100% !important;
          flex-shrink: 0 !important;
          height: auto !important;
          min-height: 26px !important;
          max-height: 80px !important;
        }

        /* Custom Scrollbar - Modern and Minimal */
        .rbc-month-view .rbc-events-container::-webkit-scrollbar {
          width: 6px;
        }

        .rbc-month-view .rbc-events-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .rbc-month-view .rbc-events-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 3px;
        }

        .rbc-month-view .rbc-events-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }

        .dark .rbc-month-view .rbc-events-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
        }

        .dark .rbc-month-view .rbc-events-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* Hide default show more */
        .rbc-show-more {
          display: none !important;
        }

        /* Week and Day View Events */
        .rbc-time-slot {
          min-height: 40px;
        }

        .rbc-timeslot-group {
          min-height: 80px;
          border-left: 1px solid #e5e7eb;
        }

        .dark .rbc-timeslot-group {
          border-left-color: #374151;
        }

        /* Event labels and content */
        .rbc-event-label {
          font-size: 0.6875rem;
          font-weight: 600;
          opacity: 0.9;
        }

        .rbc-event-content {
          font-size: 0.8125rem;
          font-weight: 500;
        }


        /* Calendar Container - Clean Modern Look */
        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-month-view,
        .dark .rbc-time-view,
        .dark .rbc-agenda-view {
          background-color: #1f2937;
          border-color: #374151;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        /* Grid Lines - Subtle */
        .rbc-month-row,
        .rbc-day-bg,
        .rbc-time-content,
        .rbc-agenda-content {
          border-color: #e5e7eb;
        }

        .dark .rbc-month-row,
        .dark .rbc-day-bg,
        .dark .rbc-time-content,
        .dark .rbc-agenda-content {
          border-color: #374151;
        }

        /* Time Slots - Week/Day View */
        .rbc-time-slot {
          color: #9ca3af;
          font-size: 0.75rem;
          font-weight: 500;
          border-color: #f3f4f6;
        }

        .dark .rbc-time-slot {
          color: #6b7280;
          border-color: #1f2937;
        }

        /* Current Time Indicator - Red Line */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
          position: relative;
        }

        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -6px;
          top: -4px;
          width: 10px;
          height: 10px;
          background-color: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        .rbc-agenda-view table {
          border-color: #e5e7eb;
        }

        .dark .rbc-agenda-view table {
          border-color: #374151;
        }

        .rbc-agenda-table tbody > tr > td {
          padding: 12px;
          border-color: #e5e7eb;
        }

        .dark .rbc-agenda-table tbody > tr > td {
          border-color: #374151;
          color: #e5e7eb;
        }

        .rbc-agenda-table tbody > tr:hover {
          background-color: #f9fafb;
        }

        .dark .rbc-agenda-table tbody > tr:hover {
          background-color: #1f2937;
        }

        .rbc-agenda-date-cell {
          font-weight: 600;
          color: #111827;
        }

        .dark .rbc-agenda-date-cell {
          color: #f3f4f6;
        }

        .rbc-agenda-time-cell {
          white-space: nowrap;
          color: #6b7280;
        }

        .dark .rbc-agenda-time-cell {
          color: #9ca3af;
        }

        /* Time Header - Week/Day Views */
        .rbc-time-header-content {
          border-color: #e5e7eb;
        }

        .dark .rbc-time-header-content {
          border-color: #374151;
        }

        .rbc-time-content > * + * > * {
          border-color: #e5e7eb;
        }

        .dark .rbc-time-content > * + * > * {
          border-color: #374151;
        }

        .rbc-day-slot .rbc-time-slot {
          border-top-color: #f3f4f6;
        }

        .dark .rbc-day-slot .rbc-time-slot {
          border-top-color: #374151;
        }

        /* Time Gutter - Modern Styling */
        .rbc-time-gutter {
          background: #fafafa;
        }

        .dark .rbc-time-gutter {
          background: #111827;
        }

        .rbc-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #6b7280;
          padding-right: 8px;
        }

        .dark .rbc-label {
          color: #9ca3af;
        }

        /* Week View - Header Days */
        .rbc-header.rbc-today {
          background: linear-gradient(to bottom, #eef2ff, #e0e7ff);
          color: #4f46e5;
          font-weight: 700;
        }

        .dark .rbc-header.rbc-today {
          background: linear-gradient(to bottom, #312e81, #1e1b4b);
          color: #818cf8;
        }

        /* All Day Row */
        .rbc-allday-cell {
          background: #fafafa;
        }

        .dark .rbc-allday-cell {
          background: #111827;
        }

        /* Overlapping Events - Better Stacking */
        .rbc-addons-dnd .rbc-addons-dnd-resize-ns-anchor,
        .rbc-addons-dnd .rbc-addons-dnd-resize-ew-anchor {
          display: none;
        }

        /* Time View Column Hover */
        .rbc-day-slot .rbc-events-container {
          margin-right: 2px;
        }

        /* Selection Area */
        .rbc-slot-selection {
          background-color: rgba(79, 70, 229, 0.15);
          border: 2px solid #6366f1;
          border-radius: 4px;
        }

        /* Improve visual hierarchy */
        .rbc-time-column {
          position: relative;
        }

        .rbc-time-column::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          background: linear-gradient(to bottom, transparent 0%, transparent 100%);
        }

        /* Business hours highlighting (9 AM - 5 PM) */
        .rbc-time-slot:nth-child(n+5):nth-child(-n+18) {
          background-color: rgba(255, 255, 255, 0.5);
        }

        .dark .rbc-time-slot:nth-child(n+5):nth-child(-n+18) {
          background-color: rgba(31, 41, 55, 0.5);
        }

        /* Responsive Typography */
        @media (max-width: 640px) {
          .rbc-header {
            font-size: 0.75rem;
            padding: 12px 4px;
          }

          .rbc-event {
            padding: 4px 6px;
            font-size: 0.75rem;
          }

          .rbc-date-cell > a,
          .rbc-date-cell {
            font-size: 0.875rem !important;
            width: 28px !important;
            height: 28px !important;
          }
        }

        /* Loading and Animation States */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .rbc-calendar {
          animation: fadeIn 0.3s ease-in-out;
        }

        /* Enhanced Focus States */
        .rbc-event:focus,
        .rbc-day-slot:focus {
          outline: 2px solid #6366f1;
          outline-offset: 2px;
        }

        /* Prevent text selection during drag */
        .rbc-calendar * {
          user-select: none;
        }

        .rbc-event-content {
          user-select: text;
        }
      `}</style>

      <div className="w-full">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{
            height: view === 'month' ? '750px' : view === 'week' ? '700px' : view === 'day' ? '700px' : '600px',
            minHeight: '500px'
          }}
          view={view}
          onView={handleViewChange}
          date={currentDate}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent,
            agenda: {
              event: CustomAgendaEvent,
            },
          }}
          popup
          popupOffset={{ x: 10, y: 10 }}
          selectable
          views={['month', 'week', 'day', 'agenda']}
          step={30}
          timeslots={2}
          min={new Date(2024, 0, 1, 7, 0, 0)}
          max={new Date(2024, 0, 1, 22, 0, 0)}
          showMultiDayTimes
        />
      </div>

      {/* Event Detail Modal - Modern Design */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color Bar */}
            <div
              className="h-2"
              style={{
                backgroundColor: eventStyleGetter(selectedEvent).style.backgroundColor
              }}
            />

            <div className="p-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {selectedEvent.resource.type === 'assignment' ? (
                      <span
                        className={`px-4 py-1.5 text-xs font-bold rounded-full text-white uppercase tracking-wide ${
                          {
                            homework: 'bg-gradient-to-r from-blue-500 to-blue-600',
                            exam: 'bg-gradient-to-r from-red-500 to-red-600',
                            project: 'bg-gradient-to-r from-purple-500 to-purple-600',
                            quiz: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                            presentation: 'bg-gradient-to-r from-green-500 to-green-600',
                            other: 'bg-gradient-to-r from-gray-500 to-gray-600',
                          }[selectedEvent.resource.assignment_type?.toLowerCase() || 'other']
                        }`}
                      >
                        {selectedEvent.resource.assignment_type || 'Assignment'}
                      </span>
                    ) : (
                      <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white uppercase tracking-wide">
                        Event
                      </span>
                    )}
                    {selectedEvent.resource.is_synced_to_calendar && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                          Synced to Calendar
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedEvent.title}
                  </h2>
                  {selectedEvent.resource.course_name && (
                    <div className="flex items-center gap-2 mt-3 text-indigo-600 dark:text-indigo-400">
                      <BookOpen className="w-5 h-5" />
                      <span className="text-base font-semibold">
                        {selectedEvent.resource.course_name}
                        {selectedEvent.resource.course_code && (
                          <span className="ml-2 text-sm opacity-75">
                            ({selectedEvent.resource.course_code})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 group flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>
              </div>

              {/* Event Details */}
              <div className="space-y-6">
                {selectedEvent.resource.description && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedEvent.resource.description}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Date & Time
                    </div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                    </div>
                  </div>
                </div>

                {selectedEvent.resource.location && (
                  <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                    <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                      <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Location
                      </div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {selectedEvent.resource.location}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Metadata */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Source:</span>
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-semibold text-gray-700 dark:text-gray-300">
                        {selectedEvent.resource.source === 'database' ? 'Database' : 'Google Calendar'}
                      </span>
                    </div>
                    {selectedEvent.resource.google_event_id && (
                      <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        ID: {selectedEvent.resource.google_event_id.slice(0, 12)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
