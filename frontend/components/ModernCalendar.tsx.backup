'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, getDay, addDays, parseISO, addWeeks, subWeeks, startOfDay, endOfDay, getHours, getMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, BookOpen, FileText, GraduationCap, TestTube, Briefcase, MapPin, CheckCircle2, Grid3x3, Columns, Square, X } from 'lucide-react';
import api from '@/lib/api';

type View = 'month' | 'week' | 'day';

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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Color palette inspired by Notion - soft, muted, elegant
const getEventColor = (event: UnifiedEvent): { bg: string; border: string; text: string } => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      homework: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
      exam: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300' },
      project: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' },
      quiz: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300' },
      presentation: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
      other: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-300 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    };
    return colors[type] || colors.other;
  } else {
    return { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300' };
  }
};

const getEventIcon = (event: UnifiedEvent) => {
  if (event.type === 'assignment') {
    const type = event.assignment_type?.toLowerCase() || 'homework';
    if (type === 'exam') return TestTube;
    if (type === 'project') return Briefcase;
    if (type === 'quiz') return FileText;
    return BookOpen;
  }
  return CalendarIcon;
};

export default function ModernCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [expandedDate, setExpandedDate] = useState<Date | null>(null);

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
        // day view
        timeMin = startOfDay(currentDate);
        timeMax = endOfDay(currentDate);
      }
      
      const response = await api.get('/calendar/unified-events', {
        params: {
          time_min: timeMin.toISOString(),
          time_max: timeMax.toISOString(),
        },
      });

      setEvents(response.data.events || []);
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

  const handleEventClick = (event: UnifiedEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const getEventsForHour = (date: Date, hour: number): UnifiedEvent[] => {
    return getEventsForDate(date).filter(event => {
      const eventTime = parseISO(event.start_time);
      return getHours(eventTime) === hour;
    });
  };

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
      <div className="grid grid-cols-7">
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
                    transition-all
                    ${isTodayDate
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : isCurrentMonth
                      ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              </div>

              {/* Events */}
              <div className="px-2 pb-2 space-y-1 max-h-[80px] overflow-y-auto">
                {dayEvents.slice(0, isExpanded ? 10 : 4).map((event) => {
                  const colors = getEventColor(event);
                  const Icon = getEventIcon(event);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={`
                        ${colors.bg} ${colors.border} ${colors.text}
                        border-l-2 rounded-r px-2 py-1 text-xs
                        hover:shadow-md transition-all cursor-pointer
                        flex items-center gap-1.5 group/event
                      `}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate flex-1 font-medium">{event.title}</span>
                      {event.is_synced_to_calendar && (
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0 opacity-60" />
                      )}
                    </div>
                  );
                })}
                {!isExpanded && dayEvents.length > 4 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateClick(day);
                    }}
                    className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer w-full text-left"
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
      <div className="grid grid-cols-8 max-h-[600px] overflow-y-auto">
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
                      const topOffset = (startMinutes / 60) * 64; // 64px per hour
                      const height = Math.max((duration / 60) * 64, 20);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          className={`
                            ${colors.bg} ${colors.border} ${colors.text}
                            border-l-2 rounded-r px-2 py-1 text-xs absolute left-1 right-1
                            hover:shadow-md transition-all cursor-pointer
                            flex items-center gap-1
                          `}
                          style={{
                            top: `${topOffset}px`,
                            height: `${height}px`,
                            zIndex: 10,
                          }}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate flex-1 font-medium text-[10px]">{event.title}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const isExpanded = expandedDate && isSameDay(currentDate, expandedDate);
    
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
        <div className="grid grid-cols-12 max-h-[600px] overflow-y-auto">
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
                        onClick={(e) => handleEventClick(event, e)}
                        className={`
                          ${colors.bg} ${colors.border} ${colors.text}
                          border-l-2 rounded-r px-3 py-2 absolute left-2 right-2
                          hover:shadow-md transition-all cursor-pointer
                          flex items-start gap-2
                        `}
                        style={{
                          top: `${topOffset}px`,
                          height: `${height}px`,
                          zIndex: 10,
                        }}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1">{event.title}</div>
                          <div className="text-xs opacity-75">
                            {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                          </div>
                          {event.course_name && (
                            <div className="text-xs opacity-60 mt-1">
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `Week of ${format(weekDays[0], 'MMM d')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={() => setView('month')}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${view === 'month'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                <span>Month</span>
              </div>
            </button>
            <button
              onClick={() => setView('week')}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${view === 'week'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4" />
                <span>Week</span>
              </div>
            </button>
            <button
              onClick={() => setView('day')}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${view === 'day'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                <span>Day</span>
              </div>
            </button>
          </div>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-gray-600 dark:text-gray-400">Loading calendar...</div>
        </div>
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </>
      )}

      {/* Expanded Date Panel */}
      {expandedDate && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-slide-in-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(expandedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => setExpandedDate(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
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
                    className={`
                      ${colors.bg} ${colors.border} ${colors.text}
                      border-l-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${colors.text} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1">{event.title}</div>
                        {event.course_name && (
                          <div className="text-sm opacity-75 mb-1">
                            {event.course_name} {event.course_code && `(${event.course_code})`}
                          </div>
                        )}
                        <div className="text-xs opacity-60">
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
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events scheduled for this day</p>
            </div>
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color accent bar */}
            {(() => {
              const colors = getEventColor(selectedEvent);
              const borderColor = colors.border.includes('blue') ? '#3b82f6' :
                                 colors.border.includes('red') ? '#ef4444' :
                                 colors.border.includes('purple') ? '#a855f7' :
                                 colors.border.includes('yellow') ? '#eab308' :
                                 colors.border.includes('green') ? '#22c55e' :
                                 '#6b7280';
              return <div className="h-1" style={{ backgroundColor: borderColor }} />;
            })()}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {(() => {
                      const colors = getEventColor(selectedEvent);
                      const Icon = getEventIcon(selectedEvent);
                      return (
                        <div className={`${colors.bg} ${colors.border} border-l-2 rounded px-3 py-1.5 flex items-center gap-2`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                          <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                            {selectedEvent.assignment_type || 'Event'}
                          </span>
                        </div>
                      );
                    })()}
                    {selectedEvent.is_synced_to_calendar && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Synced</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedEvent.title}
                  </h3>
                  {selectedEvent.course_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <GraduationCap className="w-4 h-4" />
                      <span className="font-medium">{selectedEvent.course_name}</span>
                      {selectedEvent.course_code && (
                        <span className="text-gray-400 dark:text-gray-500">({selectedEvent.course_code})</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedEvent.description && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format(parseISO(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {format(parseISO(selectedEvent.start_time), 'h:mm a')} - {format(parseISO(selectedEvent.end_time), 'h:mm a')}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                        <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Location</div>
                        <div className="font-medium text-gray-900 dark:text-white">{selectedEvent.location}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
