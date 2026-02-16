'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addDays, parseISO, addWeeks, subWeeks, startOfDay, endOfDay, getHours, getMinutes } from 'date-fns';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/frontend/lib/api';

// Import new components
import type { View, UnifiedEvent } from '@/frontend/components/calendar/types';
import { getEventColor, getEventIcon } from '@/frontend/components/calendar/utils';
import { CalendarHeader } from '@/frontend/components/calendar/CalendarHeader';
import { EventCard } from '@/frontend/components/calendar/EventCard';
import { CurrentTimeIndicator } from '@/frontend/components/calendar/CurrentTimeIndicator';
import { AgendaView } from '@/frontend/components/calendar/AgendaView';
import { EventDetailModal } from '@/frontend/components/calendar/EventDetailModal';
import { CalendarSkeleton } from '@/frontend/components/calendar/CalendarSkeleton';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ModernCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [expandedDate, setExpandedDate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if modal is open or typing in input
      if (selectedEvent || expandedDate || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          navigate('prev');
          break;
        case 'ArrowRight':
          navigate('next');
          break;
        case 't':
        case 'T':
          goToToday();
          break;
        case 'm':
        case 'M':
          setView('month');
          break;
        case 'w':
        case 'W':
          setView('week');
          break;
        case 'd':
        case 'D':
          setView('day');
          break;
        case 'Escape':
          setExpandedDate(null);
          setSelectedEvent(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEvent, expandedDate]);

  // Auto-scroll to current time in week/day views
  useEffect(() => {
    if ((view === 'week' || view === 'day') && scrollContainerRef.current) {
      const now = new Date();
      const hours = getHours(now);
      // Scroll to current hour, or 8am if outside work hours
      const targetHour = hours > 18 || hours < 6 ? 8 : hours;
      const scrollPosition = targetHour * 64 - 100;

      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [view, currentDate]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let timeMin: Date;
      let timeMax: Date;

      if (view === 'month') {
        timeMin = startOfMonth(currentDate);
        timeMax = endOfMonth(currentDate);
      } else if (view === 'week') {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        timeMin = weekStart;
        timeMax = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        timeMin = startOfDay(currentDate);
        timeMax = endOfDay(currentDate);
      }

      const response = await api.get('/calendar/events', {
        params: {
          start: format(timeMin, 'yyyy-MM-dd'),
          end: format(timeMax, 'yyyy-MM-dd'),
        },
      });

      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Map<string, UnifiedEvent[]> = new Map();

    events.forEach(event => {
      const eventDate = parseISO(event.start_time);
      const dateKey = format(eventDate, 'yyyy-MM-dd');

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    // Sort events within each day
    grouped.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        const timeA = parseISO(a.start_time).getTime();
        const timeB = parseISO(b.start_time).getTime();
        return timeA - timeB;
      });
    });

    return grouped;
  }, [events]);

  // Get calendar days for month view
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get week days for week view
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else if (view === 'week') {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setExpandedDate(null);
  };

  const getEventsForDate = (date: Date): UnifiedEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };

  const handleDateClick = (date: Date) => {
    if (expandedDate && isSameDay(date, expandedDate)) {
      setExpandedDate(null);
    } else {
      setExpandedDate(date);
    }
  };

  const handleEventClick = (event: UnifiedEvent) => {
    setSelectedEvent(event);
  };

  const getEventsForHour = (date: Date, hour: number): UnifiedEvent[] => {
    return getEventsForDate(date).filter(event => {
      const eventTime = parseISO(event.start_time);
      return getHours(eventTime) === hour;
    });
  };

  // Mobile agenda view
  if (isMobile) {
    return (
      <div className="w-full">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          weekDays={weekDays}
          onNavigate={navigate}
          onViewChange={setView}
          onToday={goToToday}
        />

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-gray-600 dark:text-gray-400">Loading calendar...</div>
          </div>
        ) : (
          <AgendaView
            currentDate={currentDate}
            events={eventsByDate}
            onEventClick={handleEventClick}
          />
        )}

        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    );
  }

  const renderMonthView = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {monthDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const dayEvents = getEventsForDate(day);
          const isExpanded = expandedDate && isSameDay(day, expandedDate);

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-[120px] border-r border-b border-gray-200 dark:border-gray-800
                ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950/50'}
                ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                ${isExpanded ? 'ring-2 ring-blue-500 dark:ring-blue-400 z-10 bg-blue-50/30 dark:bg-blue-950/30' : ''}
                hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer
                relative group
              `}
            >
              {/* Date Number */}
              <div className="p-2">
                <button
                  onClick={() => handleDateClick(day)}
                  className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                    transition-all min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0
                    ${isTodayDate
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : isCurrentMonth
                      ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                  aria-label={`Select date: ${format(day, 'MMMM d, yyyy')}`}
                >
                  {format(day, 'd')}
                </button>
              </div>

              {/* Events */}
              <div className="px-2 pb-2 space-y-1.5 max-h-[80px] overflow-y-auto">
                {dayEvents.slice(0, isExpanded ? 10 : 4).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    view="month"
                    onClick={handleEventClick}
                  />
                ))}
                {!isExpanded && dayEvents.length > 4 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateClick(day);
                    }}
                    className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer w-full text-left min-h-[44px] flex items-center"
                  >
                    +{dayEvents.length - 4} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800">
        <div className="p-3 border-r border-gray-200 dark:border-gray-800"></div>
        {weekDays.map((day) => {
          const isTodayDate = isToday(day);
          const dayEvents = getEventsForDate(day);
          const isExpanded = expandedDate && isSameDay(day, expandedDate);

          return (
            <div
              key={day.toISOString()}
              className={`
                p-3 text-center border-r border-gray-200 dark:border-gray-800
                ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-950/30 ring-2 ring-blue-500 dark:ring-blue-400' : ''}
              `}
            >
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {format(day, 'EEE')}
              </div>
              <button
                onClick={() => handleDateClick(day)}
                className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  transition-all
                  ${isTodayDate
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                aria-label={`Select date: ${format(day, 'MMMM d, yyyy')}`}
              >
                {format(day, 'd')}
              </button>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div ref={scrollContainerRef} className="grid grid-cols-8 max-h-[600px] overflow-y-auto calendar-scroll">
        {/* Time Column */}
        <div className="border-r border-gray-200 dark:border-gray-800">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b border-gray-200 dark:border-gray-800 p-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {weekDays.map((day) => {
          const dayEvents = getEventsForDate(day);
          const isExpanded = expandedDate && isSameDay(day, expandedDate);

          return (
            <div
              key={day.toISOString()}
              className={`
                border-r border-gray-200 dark:border-gray-800 relative
                ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''}
              `}
            >
              {HOURS.map((hour) => {
                const hourEvents = getEventsForHour(day, hour);

                return (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-200 dark:border-gray-800 p-1 relative"
                  >
                    {hourEvents.map((event) => {
                      const colors = getEventColor(event);
                      const Icon = getEventIcon(event);
                      const eventStart = parseISO(event.start_time);
                      const eventEnd = parseISO(event.end_time);
                      const startMinutes = getMinutes(eventStart);
                      const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                      const topOffset = (startMinutes / 60) * 64;
                      const height = Math.max((duration / 60) * 64, 20);

                      return (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleEventClick(event);
                            }
                          }}
                          className={`
                            ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                            border-l-[3px] rounded-md px-2 py-1.5 text-xs absolute left-1 right-1
                            shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer
                            flex items-center gap-1.5 backdrop-blur-sm
                            group/event
                          `}
                          style={{
                            top: `${topOffset}px`,
                            height: `${height}px`,
                            zIndex: 10,
                          }}
                          aria-label={`${event.title} at ${format(eventStart, 'h:mm a')}`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0 opacity-90" aria-hidden="true" />
                          <span className="truncate flex-1 font-semibold text-[10px] tracking-tight">{event.title}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Current Time Indicator */}
              {isSameDay(day, new Date()) && (
                <CurrentTimeIndicator hourHeight={64} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Day Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {format(currentDate, 'EEEE')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {format(currentDate, 'MMMM d, yyyy')}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div ref={scrollContainerRef} className="grid grid-cols-12 max-h-[600px] overflow-y-auto calendar-scroll">
          {/* Time Column */}
          <div className="col-span-2 border-r border-gray-200 dark:border-gray-800">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-gray-200 dark:border-gray-800 p-2 text-xs text-gray-500 dark:text-gray-400"
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Events Column */}
          <div className="col-span-10 relative">
            {HOURS.map((hour) => {
              const hourEvents = getEventsForHour(currentDate, hour);

              return (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-200 dark:border-gray-800 p-1 relative"
                >
                  {hourEvents.map((event) => {
                    const colors = getEventColor(event);
                    const Icon = getEventIcon(event);
                    const eventStart = parseISO(event.start_time);
                    const eventEnd = parseISO(event.end_time);
                    const startMinutes = getMinutes(eventStart);
                    const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                    const topOffset = (startMinutes / 60) * 64;
                    const height = Math.max((duration / 60) * 64, 40);

                    return (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleEventClick(event);
                          }
                        }}
                        className={`
                          ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                          border-l-[4px] rounded-lg px-3 py-2.5 absolute left-2 right-2
                          shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer
                          flex items-start gap-2.5 backdrop-blur-sm
                          group/event
                        `}
                        style={{
                          top: `${topOffset}px`,
                          height: `${height}px`,
                          zIndex: 10,
                        }}
                        aria-label={`${event.title} from ${format(eventStart, 'h:mm a')} to ${format(eventEnd, 'h:mm a')}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-90 group-hover/event:scale-110 transition-transform" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm mb-1.5 tracking-tight">{event.title}</div>
                          <div className="text-xs opacity-80 font-medium">
                            {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                          </div>
                          {event.course_name && (
                            <div className="text-xs opacity-70 mt-1.5 font-medium">
                              {event.course_name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Current Time Indicator */}
            {isSameDay(currentDate, new Date()) && (
              <CurrentTimeIndicator hourHeight={64} />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        weekDays={weekDays}
        onNavigate={navigate}
        onViewChange={setView}
        onToday={goToToday}
      />

      {/* Calendar View */}
      {loading ? (
        <CalendarSkeleton />
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </>
      )}

      {/* Expanded Date Panel */}
      {expandedDate && !isMobile && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-slide-in-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(expandedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => setExpandedDate(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close expanded date panel"
            >
              <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
          {getEventsForDate(expandedDate).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDate(expandedDate).map((event) => {
                const colors = getEventColor(event);
                const Icon = getEventIcon(event);
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedEvent(event);
                      }
                    }}
                    className={`
                      ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                      border-l-[4px] rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-lg
                      transition-all duration-200 backdrop-blur-sm
                      group/event
                    `}
                    aria-label={`${event.title} at ${format(parseISO(event.start_time), 'h:mm a')}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${colors.text} mt-0.5 flex-shrink-0 opacity-90 group-hover/event:scale-110 transition-transform`} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold mb-1.5 tracking-tight">{event.title}</div>
                        {event.course_name && (
                          <div className="text-sm opacity-80 mb-1.5 font-medium">
                            {event.course_name} {event.course_code && `(${event.course_code})`}
                          </div>
                        )}
                        <div className="text-xs opacity-70 font-medium">
                          {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>No events scheduled for this day</p>
            </div>
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
