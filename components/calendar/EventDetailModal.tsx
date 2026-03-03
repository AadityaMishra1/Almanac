"use client";

import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  X,
  Clock,
  MapPin,
  GraduationCap,
  CheckCircle2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { UnifiedEvent } from "./types";
import { getEventColor, getEventIcon, isEventPastDue } from "./utils";
import { cn } from "@/lib/utils";

interface EventDetailModalProps {
  event: UnifiedEvent;
  onClose: () => void;
  onDelete?: (eventId: string) => void;
}

export function EventDetailModal({
  event,
  onClose,
  onDelete,
}: EventDetailModalProps) {
  const colors = getEventColor(event);
  const Icon = getEventIcon(event);

  const getAccentColor = (): string => {
    if (colors.border.includes("red")) return "#f87171";
    if (colors.border.includes("brand")) return "#ee7a12";
    if (colors.border.includes("blue")) return "#60a5fa";
    if (colors.border.includes("teal")) return "#5eead4";
    if (colors.border.includes("violet")) return "#a78bfa";
    if (colors.border.includes("emerald")) return "#6ee7b7";
    if (colors.border.includes("rose")) return "#fb7185";
    if (colors.border.includes("amber")) return "#fbbf24";
    if (colors.border.includes("cyan")) return "#22d3ee";
    if (colors.border.includes("fuchsia")) return "#e879f9";
    if (colors.border.includes("orange")) return "#fb923c";
    if (colors.border.includes("indigo")) return "#818cf8";
    return "#9c998f";
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.getElementById("modal-close-button")?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          "bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden",
          "transform transition-all",
          "animate-slide-in-bottom sm:animate-scale-in",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-surface-tertiary rounded-full" />
        </div>

        {/* Accent strip */}
        <div className="h-1" style={{ backgroundColor: getAccentColor() }} />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className={cn(
                    "rounded-lg px-3 py-1.5 flex items-center gap-2 border-l-[3px]",
                    colors.bg,
                    colors.border,
                  )}
                >
                  <Icon
                    className={cn("w-3.5 h-3.5", colors.text)}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      colors.text,
                    )}
                  >
                    {event.assignment_type || "Event"}
                  </span>
                </div>
                {event.is_synced_to_calendar && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <CheckCircle2
                      className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Synced to Google Calendar
                    </span>
                  </div>
                )}
                {isEventPastDue(event) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <AlertCircle
                      className="w-3 h-3 text-red-600 dark:text-red-400"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">
                      Past Due
                    </span>
                  </div>
                )}
              </div>

              <h3
                id="modal-title"
                className="text-xl font-semibold text-[var(--text-primary)] leading-tight"
              >
                {event.title}
              </h3>

              {event.course_name && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{event.course_name}</span>
                  {event.course_code && (
                    <span className="text-[var(--text-tertiary)]">
                      ({event.course_code})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {event.source === "database" && onDelete && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150 min-h-[40px] min-w-[40px] flex items-center justify-center group/trash"
                  aria-label="Delete event"
                >
                  <Trash2
                    className="w-4 h-4 text-[var(--text-tertiary)] group-hover/trash:text-red-500 transition-colors duration-150"
                    aria-hidden="true"
                  />
                </button>
              )}
              <button
                id="modal-close-button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-secondary transition-colors duration-150 min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X
                  className="w-5 h-5 text-[var(--text-tertiary)]"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div className="border-t border-border-subtle" />

          {/* Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-surface-secondary rounded-lg">
              <Clock
                className="w-4 h-4 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="font-medium text-[var(--text-primary)] text-sm">
                {format(parseISO(event.start_time), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-0.5">
                {format(parseISO(event.start_time), "h:mm a")} -{" "}
                {format(parseISO(event.end_time), "h:mm a")}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-surface-secondary rounded-lg">
                <MapPin
                  className="w-4 h-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Location
                </div>
                <div className="font-medium text-[var(--text-primary)] text-sm">
                  {event.location}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <div className="border-t border-border-subtle" />
              <div className="bg-surface-secondary rounded-lg p-4">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
