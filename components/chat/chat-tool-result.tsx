"use client";

import {
  CalendarPlus,
  Repeat,
  ArrowRightLeft,
  Trash2,
  Check,
  AlertCircle,
  Search,
  Clock,
  BookOpen,
  FlaskConical,
  FileText,
  FolderKanban,
  Presentation,
  GraduationCap,
  Beaker,
  Cloud,
  CalendarDays,
  AlertTriangle,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, parse } from "date-fns";

interface ToolResultProps {
  toolName: string;
  output: Record<string, unknown>;
}

/** Format YYYY-MM-DD to "Wed, Feb 25" */
function fmtDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

/** Format HH:mm to "2:30 PM" */
function fmtTime(timeStr: string): string {
  try {
    return format(parse(timeStr, "HH:mm", new Date()), "h:mm a");
  } catch {
    return timeStr;
  }
}

/** Dot color for event type */
function getTypeDotColor(type: string): string {
  switch (type) {
    case "exam":
      return "bg-amber-500";
    case "assignment":
      return "bg-blue-500";
    case "quiz":
      return "bg-violet-500";
    case "project":
      return "bg-teal-500";
    case "lecture":
      return "bg-emerald-500";
    case "lab":
      return "bg-cyan-500";
    case "reading":
      return "bg-indigo-400";
    case "study":
      return "bg-green-500";
    default:
      return "bg-[var(--text-tertiary)]";
  }
}

/** Icon for event type */
function getTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "exam":
      return FlaskConical;
    case "assignment":
      return BookOpen;
    case "quiz":
      return FileText;
    case "project":
      return FolderKanban;
    case "lecture":
      return Presentation;
    case "lab":
      return Beaker;
    case "reading":
      return BookOpen;
    case "study":
      return GraduationCap;
    default:
      return BookOpen;
  }
}

/** Icon color for event type */
function getTypeIconColor(type: string): string {
  switch (type) {
    case "exam":
      return "text-amber-500";
    case "assignment":
      return "text-blue-500";
    case "quiz":
      return "text-violet-500";
    case "project":
      return "text-teal-500";
    case "lecture":
      return "text-emerald-500";
    case "lab":
      return "text-cyan-500";
    case "reading":
      return "text-indigo-400";
    case "study":
      return "text-green-500";
    default:
      return "text-[var(--text-tertiary)]";
  }
}

function CourseBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
      {name}
    </span>
  );
}

export function ChatToolResult({ toolName, output }: ToolResultProps) {
  const success = output?.success === true;

  if (!success) {
    const error = (output?.error as string) ?? "Something went wrong";
    return (
      <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              Action failed
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/80">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  switch (toolName) {
    case "create_event": {
      const event = output.event as Record<string, unknown> | undefined;
      const eventType = (event?.type as string) || "other";
      const TypeIcon = getTypeIcon(eventType);
      return (
        <ResultCard
          borderColor="border-l-green-500"
          icon={CalendarPlus}
          iconColor="text-green-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Event created
          </p>
          {event && (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <TypeIcon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    getTypeIconColor(eventType),
                  )}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {event.title as string}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-tertiary)]">
                <span>{fmtDate(event.date as string)}</span>
                {typeof event.time === "string" && event.time && (
                  <span>{fmtTime(event.time)}</span>
                )}
                {typeof event.courseName === "string" && event.courseName && (
                  <CourseBadge name={event.courseName} />
                )}
              </div>
            </div>
          )}
        </ResultCard>
      );
    }

    case "create_recurring_events": {
      const count = output.count as number;
      const dates = output.dates as string[] | undefined;
      const title = output.title as string;
      const daysOfWeek = output.daysOfWeek as string[] | undefined;
      const dayLabel = daysOfWeek
        ? daysOfWeek
            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(", ")
        : "";
      return (
        <ResultCard
          borderColor="border-l-green-500"
          icon={Repeat}
          iconColor="text-green-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {count} events created
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-[var(--text-secondary)]">
              {title} &mdash; every {dayLabel}
            </p>
            {dates && dates.length > 0 && (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {fmtDate(dates[0])} &rarr; {fmtDate(dates[dates.length - 1])}
              </p>
            )}
          </div>
        </ResultCard>
      );
    }

    case "edit_event": {
      const event = output.event as Record<string, unknown> | undefined;
      return (
        <ResultCard
          borderColor="border-l-amber-500"
          icon={ArrowRightLeft}
          iconColor="text-amber-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Event updated
          </p>
          {event && (
            <div className="mt-1.5 space-y-1">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {event.newTitle as string}
              </p>
              {(event.oldDate !== event.newDate ||
                event.oldTime !== event.newTime) && (
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {fmtDate(event.oldDate as string)}
                  {event.oldTime
                    ? ` ${fmtTime(event.oldTime as string)}`
                    : ""}{" "}
                  &rarr; {fmtDate(event.newDate as string)}
                  {event.newTime ? ` ${fmtTime(event.newTime as string)}` : ""}
                </p>
              )}
              {event.oldTitle !== event.newTitle && (
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Renamed from &ldquo;{String(event.oldTitle)}&rdquo;
                </p>
              )}
              {typeof event.courseName === "string" && event.courseName && (
                <CourseBadge name={event.courseName} />
              )}
            </div>
          )}
        </ResultCard>
      );
    }

    case "delete_event": {
      const deletedTitle = output.deletedTitle as string | undefined;
      const deletedDate = output.deletedDate as string | undefined;
      return (
        <ResultCard
          borderColor="border-l-red-500"
          icon={Trash2}
          iconColor="text-red-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Event deleted
          </p>
          {deletedTitle && (
            <div className="mt-1">
              <p className="text-xs text-[var(--text-secondary)]">
                {deletedTitle}
                {deletedDate ? ` · ${fmtDate(deletedDate)}` : ""}
              </p>
            </div>
          )}
        </ResultCard>
      );
    }

    case "bulk_delete_events": {
      const deletedCount = output.deletedCount as number;
      const reason = output.reason as string | undefined;
      return (
        <ResultCard
          borderColor="border-l-red-500"
          icon={Trash2}
          iconColor="text-red-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {deletedCount} event{deletedCount !== 1 ? "s" : ""} deleted
          </p>
          {reason && (
            <div className="mt-1">
              <p className="text-xs text-[var(--text-secondary)]">{reason}</p>
            </div>
          )}
        </ResultCard>
      );
    }

    case "query_events": {
      const count = output.count as number;
      const events = output.events as
        | Array<Record<string, unknown>>
        | undefined;
      return (
        <ResultCard
          borderColor="border-l-blue-500"
          icon={Search}
          iconColor="text-blue-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Found {count} event{count !== 1 ? "s" : ""}
          </p>
          {events && events.length > 0 && (
            <div className="mt-2 space-y-1">
              {events.slice(0, 8).map((evt, i) => {
                const evtType = (evt.type as string) || "other";
                const EvtIcon = getTypeIcon(evtType);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        getTypeDotColor(evtType),
                      )}
                    />
                    <EvtIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        getTypeIconColor(evtType),
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-secondary)]">
                      {evt.title as string}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
                      {fmtDate(evt.date as string)}
                    </span>
                    {typeof evt.time === "string" && evt.time && (
                      <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
                        {fmtTime(evt.time)}
                      </span>
                    )}
                    {evt.source === "GOOGLE_CALENDAR" && (
                      <Cloud className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
                    )}
                    {typeof evt.courseName === "string" && evt.courseName && (
                      <CourseBadge name={evt.courseName} />
                    )}
                  </div>
                );
              })}
              {events.length > 8 && (
                <p className="pl-2 text-[11px] text-[var(--text-tertiary)]">
                  +{events.length - 8} more
                </p>
              )}
            </div>
          )}
        </ResultCard>
      );
    }

    case "suggest_study_time": {
      const date = output.date as string;
      const freeSlots = output.freeSlots as
        | Array<{ start: string; end: string }>
        | undefined;
      const existingCount = output.existingEventCount as number;
      return (
        <ResultCard
          borderColor="border-l-green-500"
          icon={Clock}
          iconColor="text-green-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Free time on {fmtDate(date)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {existingCount} existing event{existingCount !== 1 ? "s" : ""}
          </p>
          {freeSlots && freeSlots.length > 0 ? (
            <div className="mt-2 space-y-1">
              {freeSlots.slice(0, 6).map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 text-[11px] text-[var(--text-secondary)]"
                >
                  <Clock className="h-3 w-3 shrink-0 text-green-500" />
                  {fmtTime(slot.start)} &ndash; {fmtTime(slot.end)}
                </div>
              ))}
              {freeSlots.length > 6 && (
                <p className="pl-2 text-[11px] text-[var(--text-tertiary)]">
                  +{freeSlots.length - 6} more slots
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              No available slots found
            </p>
          )}
        </ResultCard>
      );
    }

    case "sync_to_google_calendar": {
      const count = output.count as number;
      return (
        <ResultCard
          borderColor="border-l-blue-500"
          icon={Check}
          iconColor="text-blue-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {count} event{count !== 1 ? "s" : ""} synced to Google Calendar
          </p>
        </ResultCard>
      );
    }

    case "sync_all_to_google": {
      const count = output.count as number;
      const message = output.message as string | undefined;
      return (
        <ResultCard
          borderColor="border-l-blue-500"
          icon={Cloud}
          iconColor="text-blue-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {count === 0
              ? "All events already synced"
              : `${count} event${count !== 1 ? "s" : ""} synced to Google Calendar`}
          </p>
          {message && (
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              {message}
            </p>
          )}
        </ResultCard>
      );
    }

    case "get_schedule_summary": {
      const totalEvents = output.totalEvents as number;
      const days = output.days as
        | Array<{
            date: string;
            events: Array<{
              id: string;
              title: string;
              time: string | null;
              type: string;
              courseName: string | null;
            }>;
          }>
        | undefined;
      const upcomingDeadlines = output.upcomingDeadlines as
        | Array<{
            title: string;
            date: string;
            type: string;
            courseName: string | null;
          }>
        | undefined;

      return (
        <ResultCard
          borderColor="border-l-indigo-500"
          icon={CalendarDays}
          iconColor="text-indigo-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Schedule summary &mdash; {totalEvents} event
            {totalEvents !== 1 ? "s" : ""}
          </p>
          {days && days.length > 0 && (
            <div className="mt-2 space-y-2">
              {days.slice(0, 5).map((day) => (
                <div key={day.date}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                    {fmtDate(day.date)}
                  </p>
                  <div className="mt-0.5 space-y-0.5">
                    {day.events.map((evt) => {
                      const EvtIcon = getTypeIcon(evt.type);
                      return (
                        <div
                          key={evt.id}
                          className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1"
                        >
                          <EvtIcon
                            className={cn(
                              "h-3 w-3 shrink-0",
                              getTypeIconColor(evt.type),
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">
                            {evt.title}
                          </span>
                          {evt.time && (
                            <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
                              {fmtTime(evt.time)}
                            </span>
                          )}
                          {evt.courseName && (
                            <CourseBadge name={evt.courseName} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {days.length > 5 && (
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  +{days.length - 5} more days
                </p>
              )}
            </div>
          )}
          {upcomingDeadlines && upcomingDeadlines.length > 0 && (
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Upcoming deadlines
              </p>
              <div className="mt-0.5 space-y-0.5">
                {upcomingDeadlines.slice(0, 4).map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        getTypeDotColor(d.type),
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{d.title}</span>
                    <span className="shrink-0">{fmtDate(d.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {totalEvents === 0 && (!days || days.length === 0) && (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Nothing scheduled
            </p>
          )}
        </ResultCard>
      );
    }

    case "check_conflicts": {
      const hasConflict = output.hasConflict as boolean;
      const conflicts = output.conflicts as
        | Array<{
            id: string;
            title: string;
            time: string | null;
            type: string;
            courseName: string | null;
          }>
        | undefined;
      const proposedSlot = output.proposedSlot as
        | { date: string; time: string; durationMinutes: number }
        | undefined;

      if (!hasConflict) {
        return (
          <ResultCard
            borderColor="border-l-green-500"
            icon={Check}
            iconColor="text-green-600"
          >
            <p className="text-xs font-medium text-[var(--text-primary)]">
              No conflicts
            </p>
            {proposedSlot && (
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                {fmtDate(proposedSlot.date)} at {fmtTime(proposedSlot.time)} is
                free
              </p>
            )}
          </ResultCard>
        );
      }

      return (
        <ResultCard
          borderColor="border-l-amber-500"
          icon={AlertTriangle}
          iconColor="text-amber-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {conflicts?.length || 1} conflict
            {(conflicts?.length || 1) !== 1 ? "s" : ""} found
          </p>
          {conflicts && conflicts.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      getTypeDotColor(c.type),
                    )}
                  />
                  <span className="truncate">{c.title}</span>
                  {c.time && (
                    <span className="shrink-0 text-[var(--text-tertiary)]">
                      {fmtTime(c.time)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ResultCard>
      );
    }

    case "undo_last_action": {
      const undoneAction = output.undoneAction as string;
      const description = output.description as string;
      const actionLabel =
        undoneAction === "create"
          ? "Creation undone"
          : undoneAction === "modify"
            ? "Edit reverted"
            : undoneAction === "delete"
              ? "Deletion undone"
              : "Action undone";
      return (
        <ResultCard
          borderColor="border-l-blue-500"
          icon={Undo2}
          iconColor="text-blue-600"
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {actionLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {description}
          </p>
        </ResultCard>
      );
    }

    default:
      return null;
  }
}

function ResultCard({
  borderColor,
  icon: Icon,
  iconColor,
  children,
}: {
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border border-[var(--border-subtle)] border-l-[3px] bg-surface-secondary p-3 shadow-sm",
        borderColor,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
