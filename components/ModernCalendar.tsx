'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  format,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
  startOfWeek, endOfWeek,
  addDays, parseISO,
  addWeeks, subWeeks,
  startOfDay, endOfDay,
  getHours, getMinutes,
} from 'date-fns';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/lib/api';

import type { View, UnifiedEvent } from './calendar/types';
import { getEventColor, getEventIcon } from './calendar/utils';
import { CalendarHeader } from './calendar/CalendarHeader';
import { EventCard } from './calendar/EventCard';
import { CurrentTimeIndicator } from './calendar/CurrentTimeIndicator';
import { AgendaView } from './calendar/AgendaView';
import { EventDetailModal } from './calendar/EventDetailModal';
import { CalendarSkeleton } from './calendar/CalendarSkeleton';

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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedEvent || expandedDate || e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowLeft': navigate('prev'); break;
        case 'ArrowRight': navigate('next'); break;
        case 't': case 'T': goToToday(); break;
        case 'm': case 'M': setView('month'); break;
        case 'w': case 'W': setView('week'); break;
        case 'd': case 'D': setView('day'); break;
        case 'Escape': setExpandedDate(null); setSelectedEvent(null); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEvent, expandedDate]);

  // Auto-scroll to current time in week/day views
  useEffect(() => {
    if ((view === 'week' || view === 'day') && scrollContainerRef.current) {
      const hours = getHours(new Date());
      const targetHour = hours > 18 || hours < 6 ? 8 : hours;
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: Math.max(0, targetHour * 64 - 100),
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
        timeMin = startOfWeek(currentDate, { weekStartsOn: 0 });
        timeMax = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        timeMin = startOfDay(currentDate);
        timeMax = endOfDay(currentDate);
      }
      const response = await api.get('/calendar/events', {
        params: { start: format(timeMin, 'yyyy-MM-dd'), end: format(timeMax, 'yyyy-MM-dd') },
      });
      setEvents(response.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, UnifiedEvent[]>();
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(event);
    });
    grouped.forEach((dayEvents) => {
      dayEvents.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
    });
    return grouped;
  }, [events]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'month') setCurrentDate((prev) => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    else if (view === 'week') setCurrentDate((prev) => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    else setCurrentDate((prev) => direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1));
  };

  const goToToday = () => { setCurrentDate(new Date()); setExpandedDate(null); };
  const getEventsForDate = (date: Date) => eventsByDate.get(format(date, 'yyyy-MM-dd')) || [];
  const handleDateClick = (date: Date) => setExpandedDate(expandedDate && isSameDay(date, expandedDate) ? null : date);
  const handleEventClick = (event: UnifiedEvent) => setSelectedEvent(event);

  const getEventsForHour = (date: Date, hour: number) =>
    getEventsForDate(date).filter((event) => getHours(parseISO(event.start_time)) === hour);

  // Mobile agenda view
  if (isMobile) {
    return (
      <div className="w-full">
        <CalendarHeader
          currentDate={currentDate} view={view} weekDays={weekDays}
          onNavigate={navigate} onViewChange={setView} onToday={goToToday}
        />
        {loading ? <CalendarSkeleton /> : (
          <AgendaView currentDate={currentDate} events={eventsByDate} onEventClick={handleEventClick} />
        )}
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </div>
    );
  }

  // --- Month View ---
  const renderMonthView = () => (
    <div className="bg-surface rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {WEEKDAYS.map((day) => (
          <div key={day} className="p-3 text-center text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest border-r border-border-subtle last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const dayEvents = getEventsForDate(day);
          const isExpanded = expandedDate && isSameDay(day, expandedDate);
          const maxVisible = 3;

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-[100px] border-r border-b border-border-subtle bg-surface
                hover:bg-surface-secondary transition-colors duration-150 cursor-pointer relative group
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isExpanded ? 'ring-2 ring-brand-500 ring-inset z-10' : ''}
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className="p-2">
                <div
                  className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors duration-150
                    ${isTodayDate
                      ? 'bg-brand-500 text-white'
                      : 'text-[var(--text-primary)] group-hover:bg-surface-tertiary'
                    }
                  `}
                >
                  {format(day, 'd')}
                </div>
              </div>

              <div className="px-1.5 pb-1.5 space-y-0.5">
                {dayEvents.slice(0, isExpanded ? 10 : maxVisible).map((event) => (
                  <EventCard key={event.id} event={event} view="month" onClick={handleEventClick} />
                ))}
                {!isExpanded && dayEvents.length > maxVisible && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDateClick(day); }}
                    className="text-[11px] text-[var(--text-tertiary)] px-1.5 py-0.5 font-medium hover:text-[var(--text-secondary)] transition-colors duration-150 w-full text-left"
                  >
                    +{dayEvents.length - maxVisible} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- Week View ---
  const renderWeekView = () => (
    <div className="bg-surface rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border-subtle">
        <div className="p-3 border-r border-border-subtle" />
        {weekDays.map((day) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r border-border-subtle last:border-r-0 ${isTodayDate ? 'bg-brand-50' : ''}`}
            >
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">
                {format(day, 'EEE')}
              </div>
              <button
                onClick={() => handleDateClick(day)}
                className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors duration-150
                  ${isTodayDate ? 'bg-brand-500 text-white' : 'text-[var(--text-primary)] hover:bg-surface-secondary'}
                `}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollContainerRef} className="grid grid-cols-8 max-h-[calc(100vh-220px)] overflow-y-auto calendar-scroll">
        <div className="border-r border-border-subtle">
          {HOURS.map((hour) => (
            <div key={hour} className="h-16 border-b border-border-subtle p-2 text-[11px] text-[var(--text-tertiary)] font-medium">
              {format(new Date(2000, 0, 1, hour), 'h a')}
            </div>
          ))}
        </div>

        {weekDays.map((day) => (
          <div key={day.toISOString()} className="border-r border-border-subtle last:border-r-0 relative">
            {HOURS.map((hour) => {
              const hourEvents = getEventsForHour(day, hour);
              return (
                <div key={hour} className="h-16 border-b border-border-subtle p-0.5 relative">
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
                        role="button"
                        tabIndex={0}
                        onClick={() => handleEventClick(event)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEventClick(event); } }}
                        className={`
                          ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                          border-l-2 rounded-md px-1.5 py-1 text-xs absolute left-0.5 right-0.5
                          transition-all duration-150 cursor-pointer
                          flex items-center gap-1 hover:z-20
                          focus-visible:ring-2 focus-visible:ring-brand-500
                        `}
                        style={{ top: `${topOffset}px`, height: `${height}px`, zIndex: 10 }}
                        aria-label={`${event.title} at ${format(eventStart, 'h:mm a')}`}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate flex-1 font-medium text-[10px]">{event.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {isSameDay(day, new Date()) && <CurrentTimeIndicator hourHeight={64} />}
          </div>
        ))}
      </div>
    </div>
  );

  // --- Day View ---
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden animate-fade-in">
        {/* Day header */}
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">
                {format(currentDate, 'EEEE')}
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {format(currentDate, 'MMMM d, yyyy')}
              </div>
            </div>
            <div className="text-sm text-[var(--text-tertiary)] font-medium">
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div ref={scrollContainerRef} className="grid grid-cols-12 max-h-[calc(100vh-280px)] overflow-y-auto calendar-scroll">
          <div className="col-span-2 border-r border-border-subtle">
            {HOURS.map((hour) => (
              <div key={hour} className="h-16 border-b border-border-subtle p-2 text-[11px] text-[var(--text-tertiary)] font-medium">
                {format(new Date(2000, 0, 1, hour), 'h a')}
              </div>
            ))}
          </div>

          <div className="col-span-10 relative">
            {HOURS.map((hour) => {
              const hourEvents = getEventsForHour(currentDate, hour);
              return (
                <div key={hour} className="h-16 border-b border-border-subtle p-1 relative">
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
                        role="button"
                        tabIndex={0}
                        onClick={() => handleEventClick(event)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEventClick(event); } }}
                        className={`
                          ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                          border-l-[3px] rounded-lg px-3 py-2 absolute left-2 right-2
                          transition-all duration-150 cursor-pointer
                          flex items-start gap-2.5
                          focus-visible:ring-2 focus-visible:ring-brand-500
                        `}
                        style={{ top: `${topOffset}px`, height: `${height}px`, zIndex: 10 }}
                        aria-label={`${event.title} from ${format(eventStart, 'h:mm a')} to ${format(eventEnd, 'h:mm a')}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{event.title}</div>
                          <div className="text-xs opacity-75 mt-0.5 font-medium">
                            {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                          </div>
                          {event.course_name && (
                            <div className="text-xs opacity-60 mt-1 font-medium">{event.course_name}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {isSameDay(currentDate, new Date()) && <CurrentTimeIndicator hourHeight={64} />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <CalendarHeader
        currentDate={currentDate} view={view} weekDays={weekDays}
        onNavigate={navigate} onViewChange={setView} onToday={goToToday}
      />

      {loading ? <CalendarSkeleton /> : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </>
      )}

      {/* Expanded date panel */}
      {expandedDate && !isMobile && (
        <div className="mt-6 bg-surface rounded-xl border border-border p-6 animate-slide-in-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {format(expandedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => setExpandedDate(null)}
              className="p-2 hover:bg-surface-secondary rounded-lg transition-colors duration-150 min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Close expanded date panel"
            >
              <X className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEvent(event)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEvent(event); } }}
                    className={`
                      ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}
                      border-l-[3px] rounded-xl p-4 cursor-pointer transition-all duration-150
                      focus-visible:ring-2 focus-visible:ring-brand-500
                    `}
                    aria-label={`${event.title} at ${format(parseISO(event.start_time), 'h:mm a')}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1">{event.title}</div>
                        {event.course_name && (
                          <div className="text-sm opacity-80 mb-1 font-medium">
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
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)] opacity-50" aria-hidden="true" />
              <p className="text-[var(--text-secondary)]">No events scheduled for this day</p>
            </div>
          )}
        </div>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
