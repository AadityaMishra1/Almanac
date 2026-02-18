"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarSync, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createEvent } from "@/app/server-actions/events";
import { getCourses } from "@/app/server-actions/courses";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { useNotificationStore } from "@/lib/store";

interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
}

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialDate?: string;
}

const EVENT_TYPES = [
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "lab", label: "Lab" },
  { value: "deadline", label: "Deadline" },
];

export function CreateEventModal({
  open,
  onOpenChange,
  onCreated,
  initialDate,
}: CreateEventModalProps) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("");
  const [courseId, setCourseId] = useState("");
  const [description, setDescription] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill date when opened with initialDate
  useEffect(() => {
    if (open && initialDate) {
      setDate(initialDate);
    }
  }, [open, initialDate]);

  useEffect(() => {
    if (!open) return;
    setLoadingCourses(true);
    getCourses()
      .then((res) => {
        if (res.ok) setCourses(res.courses as Course[]);
      })
      .finally(() => setLoadingCourses(false));
  }, [open]);

  function resetForm() {
    setTitle("");
    setDate("");
    setTime("");
    setType("");
    setCourseId("");
    setDescription("");
    setError("");
  }

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!date) return "Date is required.";
    if (!type) return "Event type is required.";
    if (!courseId) return "Course is required.";
    return null;
  }

  async function handleSubmit(andSync: boolean) {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    if (andSync) {
      setSyncing(true);
    } else {
      setSubmitting(true);
    }

    try {
      const result = await createEvent({
        title: title.trim(),
        date,
        time: time || null,
        type,
        description: description.trim(),
        courseId,
        source: "ALMANAC",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (andSync) {
        const syncResult = await syncEventsToCalendar([result.event.id]);
        if (!syncResult.ok) {
          addNotification({
            message: "Event created, but calendar sync failed: " + syncResult.error,
            type: "warning",
          });
        } else {
          addNotification({
            message: "Event created and synced to Google Calendar.",
            type: "success",
          });
        }
      } else {
        addNotification({
          message: "Event created successfully.",
          type: "success",
        });
      }

      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setSyncing(false);
    }
  }

  const isLoading = submitting || syncing;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isLoading) {
          if (!next) resetForm();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent
        className={cn(
          "bg-surface border-border rounded-2xl shadow-2xl p-0 overflow-hidden",
          "sm:max-w-[480px]"
        )}
      >
        {/* Accent strip */}
        <div className="h-1 bg-brand-500" />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
              New Event
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-tertiary)]">
              Add a deadline, exam, or assignment to your calendar.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="event-title"
                className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Title
              </Label>
              <input
                id="event-title"
                type="text"
                placeholder="Midterm Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-[var(--text-primary)]",
                  "placeholder:text-[var(--text-tertiary)]",
                  "focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                  "transition-colors duration-150",
                  "disabled:opacity-50"
                )}
              />
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="event-date"
                  className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                >
                  Date
                </Label>
                <input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-[var(--text-primary)]",
                    "focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                    "transition-colors duration-150",
                    "disabled:opacity-50"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="event-time"
                  className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
                >
                  Time <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </Label>
                <input
                  id="event-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-[var(--text-primary)]",
                    "focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                    "transition-colors duration-150",
                    "disabled:opacity-50"
                  )}
                />
              </div>
            </div>

            {/* Type + Course row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Type
                </Label>
                <Select value={type} onValueChange={setType} disabled={isLoading}>
                  <SelectTrigger
                    className={cn(
                      "rounded-xl border border-border bg-surface px-4 py-3 h-auto text-sm",
                      "focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                      "transition-colors duration-150",
                      !type && "text-[var(--text-tertiary)]"
                    )}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-surface border-border">
                    {EVENT_TYPES.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className="rounded-lg text-sm"
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Course
                </Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-[var(--text-tertiary)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </div>
                ) : courses.length === 0 ? (
                  <div className="rounded-xl border border-border bg-surface-secondary px-4 py-3 text-sm text-[var(--text-tertiary)]">
                    No courses yet
                  </div>
                ) : (
                  <Select value={courseId} onValueChange={setCourseId} disabled={isLoading}>
                    <SelectTrigger
                      className={cn(
                        "rounded-xl border border-border bg-surface px-4 py-3 h-auto text-sm",
                        "focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                        "transition-colors duration-150",
                        !courseId && "text-[var(--text-tertiary)]"
                      )}
                    >
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-surface border-border">
                      {courses.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="rounded-lg text-sm"
                        >
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="event-description"
                className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
              </Label>
              <textarea
                id="event-description"
                placeholder="Add notes..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                className={cn(
                  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-[var(--text-primary)]",
                  "placeholder:text-[var(--text-tertiary)] resize-none",
                  "focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400",
                  "transition-colors duration-150",
                  "disabled:opacity-50"
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
                "border border-border text-[var(--text-primary)] bg-surface",
                "hover:bg-surface-secondary active:bg-surface-tertiary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                "transition-colors duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarSync className="w-4 h-4" />
              )}
              Save & Sync
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
                "bg-brand-500 text-white",
                "hover:bg-brand-600 active:bg-brand-700",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                "transition-colors duration-150",
                "shadow-sm hover:shadow-md",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Event
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
