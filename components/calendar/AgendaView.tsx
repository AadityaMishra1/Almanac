"use client";

import { format, addDays, isToday, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { UnifiedEvent } from "./types";
import { getEventColor, getEventIcon, isEventPastDue } from "./utils";
import { cn } from "@/lib/utils";

interface AgendaViewProps {
  currentDate: Date;
  events: Map<string, UnifiedEvent[]>;
  onEventClick: (event: UnifiedEvent) => void;
}

export function AgendaView({
  currentDate,
  events,
  onEventClick,
}: AgendaViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

  const hasAnyEvents = days.some((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    return (events.get(dateKey) || []).length > 0;
  });

  if (!hasAnyEvents) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="text-center py-16 px-4">
          <CalendarIcon
            className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)] opacity-50"
            aria-hidden="true"
          />
          <p className="text-[var(--text-secondary)] font-medium">
            Your week is clear
          </p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            No events scheduled for the next 7 days
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="divide-y divide-border-subtle">
        {days.map((day, dayIndex) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = events.get(dateKey) || [];
          const isTodayDate = isToday(day);

          if (dayEvents.length === 0) return null;

          return (
            <div
              key={dateKey}
              className="p-4 animate-fade-in-up"
              style={{ animationDelay: `${dayIndex * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {format(day, "EEE, MMM d")}
                  </h3>
                  {isTodayDate && (
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-700 dark:bg-brand-50 dark:text-brand-800 text-xs font-semibold rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-tertiary)] px-2 py-1 bg-surface-secondary rounded-full font-medium">
                  {dayEvents.length}
                </span>
              </div>

              <div className="space-y-2">
                {dayEvents.map((event, eventIndex) => {
                  const colors = getEventColor(event);
                  const Icon = getEventIcon(event);
                  const eventStart = parseISO(event.start_time);
                  const eventEnd = parseISO(event.end_time);

                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-3",
                        "border-l-2 transition-all duration-150",
                        "flex items-start gap-3 min-h-[48px]",
                        colors.bg,
                        colors.border,
                        colors.text,
                        colors.hover,
                        "hover:scale-[1.01] active:scale-[0.98]",
                        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
                      )}
                      style={{
                        animationDelay: `${dayIndex * 50 + eventIndex * 30}ms`,
                      }}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1 leading-snug">
                          {event.title}
                        </div>
                        <div className="text-xs opacity-75 font-medium">
                          {format(eventStart, "h:mm a")} -{" "}
                          {format(eventEnd, "h:mm a")}
                        </div>
                        {event.course_name && (
                          <div className="text-xs opacity-70 mt-1.5 font-medium">
                            {event.course_name}
                          </div>
                        )}
                        {isEventPastDue(event) && (
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mt-1">
                            Past due
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
