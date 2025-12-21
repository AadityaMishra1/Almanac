"use client";

import * as React from "react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { EventsTable } from "@/components/events-table";
import type { SyllabusEvent } from "@/lib/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

type Row = SyllabusEvent & { selected: boolean };

export function SyllabusToCalendar() {
  const { data: session } = useSession();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handlePdf(file: File) {
    setIsParsing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch("/api/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Parse failed");

      const events = (json.events ?? []) as SyllabusEvent[];
      setRows(events.map((e) => ({ ...e, selected: true })));
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
      const selected = rows.filter((r) => r.selected).map(({ selected: _selected, ...event }) => event);
      const result = await syncEventsToCalendar(selected);
      if (!result.ok) throw new Error(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <section className="space-y-6">
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
