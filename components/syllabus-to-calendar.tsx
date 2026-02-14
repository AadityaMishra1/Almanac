"use client";

import * as React from "react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { EventsTable } from "@/components/events-table";
import type { SyllabusEvent } from "@/lib/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { useSession } from "next-auth/react";
import { getEvents } from "@/app/server-actions/events";
import { prismaEventToSyllabus } from "@/lib/events";
import { useNotificationStore } from "@/lib/store";
import { AlertCircle, Sparkles, Loader2 } from "lucide-react";

type Row = SyllabusEvent & { selected: boolean; id?: string };

export function SyllabusToCalendar() {
  const { data: session } = useSession();
  const { addNotification } = useNotificationStore();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [courseId, setCourseId] = React.useState<string | null>(null);
  const [courseName, setCourseName] = React.useState("");

  async function handlePdf(file: File) {
    setIsParsing(true);
    setError(null);

    if (!courseName.trim()) {
      setError("Please enter a course name before uploading.");
      setIsParsing(false);
      return;
    }

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("courseName", courseName.trim());

      const res = await fetch("/api/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Parse failed");

      const { courseId: parsedCourseId, eventIds } = json;

      if (!parsedCourseId || !eventIds) {
        throw new Error("Invalid parse response: missing courseId or eventIds");
      }

      setCourseId(parsedCourseId);

      const eventsResult = await getEvents({ courseId: parsedCourseId });

      if (!eventsResult.ok) {
        throw new Error(eventsResult.error);
      }

      const loadedRows = eventsResult.events.map((dbEvent) => ({
        ...prismaEventToSyllabus(dbEvent),
        selected: true,
        id: dbEvent.id,
      }));

      setRows(loadedRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while parsing.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    try {
      const selectedEventIds = rows
        .filter((r) => r.selected && r.id)
        .map((r) => r.id!);

      if (selectedEventIds.length === 0) {
        throw new Error("No events selected for sync.");
      }

      const result = await syncEventsToCalendar(selectedEventIds);
      if (!result.ok) throw new Error(result.error);

      addNotification({
        message: `Successfully synced ${selectedEventIds.length} event${selectedEventIds.length !== 1 ? 's' : ''} to Google Calendar!`,
        type: 'success',
      });

      if (courseId) {
        const eventsResult = await getEvents({ courseId });
        if (eventsResult.ok) {
          const reloadedRows = eventsResult.events.map((dbEvent) => ({
            ...prismaEventToSyllabus(dbEvent),
            selected: rows.find((r) => r.id === dbEvent.id)?.selected ?? false,
            id: dbEvent.id,
          }));
          setRows(reloadedRows);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Calendar sync failed.";
      setError(errorMessage);

      addNotification({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function handleToggleAll() {
    const allSelected = rows.every((r) => r.selected);
    setRows(rows.map((r) => ({ ...r, selected: !allSelected })));
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="courseName" className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
          Course name
        </label>
        <input
          id="courseName"
          type="text"
          placeholder="e.g., Data Structures"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          disabled={isParsing}
          className="w-full rounded-xl border border-[var(--border)] bg-surface px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors duration-150 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <UploadDropzone onFile={handlePdf} isBusy={isParsing} />

      {error && (
        <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="animate-fade-in-up space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {rows.length} {rows.length === 1 ? 'event' : 'events'} found
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAll}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors duration-150 cursor-pointer"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-xs text-[var(--text-tertiary)]">
                {selectedCount} of {rows.length} selected
              </span>
            </div>
          </div>

          <EventsTable rows={rows} onChange={setRows} />

          <div className="rounded-xl bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-[var(--text-tertiary)]">
                Edit titles or dates before syncing
              </span>
              <button
                onClick={handleSync}
                disabled={!selectedCount || isSyncing || !session?.accessToken}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
                {session?.accessToken ? (isSyncing ? "Syncing..." : "Sync to Google Calendar") : "Sign in to sync"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
