"use client";

import * as React from "react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { EventsTable } from "@/components/events-table";
import type { SyllabusEvent } from "@/lib/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { getEvents } from "@/app/server-actions/events";
import type { Event } from "@prisma/client";
import { prismaEventToSyllabus } from "@/lib/events";

type Row = SyllabusEvent & { selected: boolean; id?: string };

export function SyllabusToCalendar() {
  const { data: session } = useSession();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [courseId, setCourseId] = React.useState<string | null>(null);
  const [courseName, setCourseName] = React.useState("");

  async function handlePdf(file: File) {
    setIsParsing(true);
    setError(null);

    // Validate course name before parsing
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

      // Parse response contains { success, courseId, courseName, eventIds, events }
      const { courseId: parsedCourseId, eventIds } = json;

      if (!parsedCourseId || !eventIds) {
        throw new Error("Invalid parse response: missing courseId or eventIds");
      }

      // Store course ID for sync
      setCourseId(parsedCourseId);

      // Load events from database by course ID (not using transient parse response)
      const eventsResult = await getEvents({ courseId: parsedCourseId });

      if (!eventsResult.ok) {
        throw new Error(eventsResult.error);
      }

      // Convert database events to UI format and add selection state
      const loadedRows = eventsResult.events.map((dbEvent) => ({
        ...prismaEventToSyllabus(dbEvent),
        selected: true,
        id: dbEvent.id, // Store database ID for sync
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
      // Get selected event IDs (not event objects)
      const selectedEventIds = rows
        .filter((r) => r.selected && r.id)
        .map((r) => r.id!);

      if (selectedEventIds.length === 0) {
        throw new Error("No events selected for sync.");
      }

      // Call sync with event IDs
      const result = await syncEventsToCalendar(selectedEventIds);
      if (!result.ok) throw new Error(result.error);

      // Reload events from database to show updated googleEventId
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
      setError(e instanceof Error ? e.message : "Calendar sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <section className="space-y-6">
      {/* Course name input field */}
      <div className="space-y-2">
        <label htmlFor="courseName" className="text-sm font-medium text-zinc-700">
          Course Name
        </label>
        <input
          id="courseName"
          type="text"
          placeholder="e.g., Data Structures"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          disabled={isParsing}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
        <p className="text-xs text-zinc-500">
          Enter the course name before uploading your syllabus. Phase 2 will extract this automatically.
        </p>
      </div>

      <UploadDropzone onFile={handlePdf} isBusy={isParsing} />

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {rows.length ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-600">
              {selectedCount} selected / {rows.length} extracted
            </div>
            <Button
              onClick={handleSync}
              disabled={!selectedCount || isSyncing || !session?.accessToken}
              variant="default"
            >
              {session?.accessToken ? (isSyncing ? "Syncing..." : "Sync to Google Calendar") : "Sign in to sync"}
            </Button>
          </div>
          <EventsTable rows={rows} onChange={setRows} />
          <div className="text-xs text-zinc-500">
            Tip: Edit titles/dates before syncing. Dates are treated as all-day events.
          </div>
        </div>
      ) : null}
    </section>
  );
}
