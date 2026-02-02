"use client";

import * as React from "react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { EventsPreviewTable } from "@/components/events-preview-table";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { getEvents, updateEvent } from "@/app/server-actions/events";
import type { EventWithConfidence, ExtractionMetadata } from "@/lib/events/types";

type PreviewRow = EventWithConfidence & { selected: boolean; id?: string };

export function SyllabusToCalendar() {
  const { data: session } = useSession();
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [courseId, setCourseId] = React.useState<string | null>(null);
  const [courseName, setCourseName] = React.useState("");
  const [extractionMeta, setExtractionMeta] = React.useState<ExtractionMetadata | null>(null);

  // Track original data to detect user edits before sync
  const originalDataRef = React.useRef<PreviewRow[]>([]);

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

      // Parse response contains { success, courseId, courseName, eventIds, events, metadata }
      const { courseId: parsedCourseId, events: eventsWithConfidence, metadata } = json;

      if (!parsedCourseId || !eventsWithConfidence || !metadata) {
        throw new Error("Invalid parse response: missing required fields");
      }

      // Store course ID for sync
      setCourseId(parsedCourseId);

      // Store extraction metadata
      setExtractionMeta(metadata);

      // Load events from database by course ID
      const eventsResult = await getEvents({ courseId: parsedCourseId });

      if (!eventsResult.ok) {
        throw new Error(eventsResult.error);
      }

      // Merge database events with confidence data from parse response
      // Match by title + date, attach confidence from response
      const loadedRows: PreviewRow[] = eventsResult.events.map((dbEvent) => {
        // Find matching event with confidence from parse response
        const confidenceEvent = eventsWithConfidence.find(
          (e: EventWithConfidence) => e.title === dbEvent.title && e.date === dbEvent.date
        );

        return {
          title: dbEvent.title,
          date: dbEvent.date,
          type: dbEvent.type as EventWithConfidence["type"],
          description: dbEvent.description || "",
          confidence: confidenceEvent?.confidence || {
            overall: 0.5,
            date_extracted: false,
            type_inferred: true,
            reasoning: "No confidence data available",
          },
          selected: confidenceEvent ? confidenceEvent.confidence.overall >= 0.6 : true,
          id: dbEvent.id,
        };
      });

      setRows(loadedRows);
      // Store original data for comparison during sync
      originalDataRef.current = loadedRows;
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
      // STEP 1: Persist user edits to database before syncing to Google Calendar
      // Compare current rows with original data to detect modifications
      const modifiedRows = rows.filter((currentRow) => {
        if (!currentRow.id) return false; // Skip rows without database ID

        const originalRow = originalDataRef.current.find((r) => r.id === currentRow.id);
        if (!originalRow) return false;

        // Check if any editable fields changed
        return (
          currentRow.title !== originalRow.title ||
          currentRow.date !== originalRow.date ||
          currentRow.type !== originalRow.type ||
          currentRow.description !== originalRow.description
        );
      });

      // Update modified events in database
      for (const row of modifiedRows) {
        const updateResult = await updateEvent(row.id!, {
          title: row.title,
          date: row.date,
          type: row.type,
          description: row.description,
        });

        if (!updateResult.ok) {
          console.error(`Failed to update event ${row.id}:`, updateResult.error);
          // Continue with other updates even if one fails
        }
      }

      // STEP 2: Get selected event IDs for Google Calendar sync
      const selectedEventIds = rows
        .filter((r) => r.selected && r.id)
        .map((r) => r.id!);

      if (selectedEventIds.length === 0) {
        throw new Error("No events selected for sync.");
      }

      // STEP 3: Sync to Google Calendar with database IDs
      const result = await syncEventsToCalendar(selectedEventIds);
      if (!result.ok) throw new Error(result.error);

      // Reload events from database to show updated googleEventId
      if (courseId) {
        const eventsResult = await getEvents({ courseId });
        if (eventsResult.ok) {
          const reloadedRows: PreviewRow[] = eventsResult.events.map((dbEvent) => {
            // Preserve confidence data and selection state from current rows
            const existingRow = rows.find((r) => r.id === dbEvent.id);
            return {
              title: dbEvent.title,
              date: dbEvent.date,
              type: dbEvent.type as EventWithConfidence["type"],
              description: dbEvent.description || "",
              confidence: existingRow?.confidence || {
                overall: 0.5,
                date_extracted: false,
                type_inferred: true,
                reasoning: "No confidence data available",
              },
              selected: existingRow?.selected ?? false,
              id: dbEvent.id,
            };
          });
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
          {/* Extraction metadata banner */}
          {extractionMeta ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <div className="font-medium">
                Extracted {extractionMeta.totalEvents} event{extractionMeta.totalEvents !== 1 ? "s" : ""} via{" "}
                {extractionMeta.method === "ocr" ? "OCR (scanned PDF)" : "text extraction"} from{" "}
                {extractionMeta.pageCount} page{extractionMeta.pageCount !== 1 ? "s" : ""}.
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                {extractionMeta.highConfidence} high confidence | {extractionMeta.needsReview} need review
                {extractionMeta.method === "ocr" ? " • OCR was used - please review dates carefully" : ""}
              </div>
            </div>
          ) : null}

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
          <EventsPreviewTable rows={rows} onChange={setRows} />
          <div className="text-xs text-zinc-500">
            Tip: Edit titles/dates/types before syncing. Low-confidence events are highlighted for review.
          </div>
        </div>
      ) : null}
    </section>
  );
}
