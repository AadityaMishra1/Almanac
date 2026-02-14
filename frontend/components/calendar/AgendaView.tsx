'use client';

import { format, addDays, isToday, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { UnifiedEvent } from './types';
import { getEventColor, getEventIcon } from './utils';

interface AgendaViewProps {
  currentDate: Date;
  events: Map<string, UnifiedEvent[]>;
  onEventClick: (event: UnifiedEvent) => void;
}

export function AgendaView({ currentDate, events, onEventClick }: AgendaViewProps) {
  // Show next 7 days starting from current date
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = events.get(dateKey) || [];
          const isTodayDate = isToday(day);

          return (
            <div key={dateKey} className="p-4">
              {/* Date Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      text-sm font-semibold
                      ${isTodayDate
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                      }
                    `}
                  >
                    {format(day, 'EEE, MMM d')}
                    {isTodayDate && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                </div>
                {dayEvents.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events List */}
              {dayEvents.length > 0 ? (
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const colors = getEventColor(event);
                    const Icon = getEventIcon(event);
                    const eventStart = parseISO(event.start_time);
                    const eventEnd = parseISO(event.end_time);

                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`
                          ${colors.bg} ${colors.border} ${colors.text}
                          border-l-[3px] rounded-lg px-3 py-3 w-full
                          shadow-sm hover:shadow-lg active:scale-[0.98]
                          transition-all duration-200
                          flex items-start gap-3
                          min-h-[48px] text-left
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-90" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1 tracking-tight">
                            {event.title}
                          </div>
                          <div className="text-xs opacity-80 font-medium">
                            {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                          </div>
                          {event.course_name && (
                            <div className="text-xs opacity-70 mt-1 font-medium">
                              {event.course_name}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                  No events
                </div>
              )}
            </div>
          );
        })}
      </div>

      {days.every(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return (events.get(dateKey) || []).length === 0;
      }) && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p>No events scheduled for the next 7 days</p>
        </div>
      )}
    </div>
  );
}
