"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfidenceBadge } from "@/components/confidence-badge";
import type { EventWithConfidence } from "@/lib/events/types";

type PreviewRow = EventWithConfidence & { selected: boolean; id?: string };

interface EventsPreviewTableProps {
  rows: PreviewRow[];
  onChange: (rows: PreviewRow[]) => void;
}

const EVENT_TYPES = ["exam", "quiz", "assignment", "reading", "project", "lab"] as const;

export function EventsPreviewTable({ rows, onChange }: EventsPreviewTableProps) {
  function updateRow(idx: number, patch: Partial<PreviewRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px]">Sync</TableHead>
          <TableHead className="w-[200px]">Title</TableHead>
          <TableHead className="w-[140px]">Date</TableHead>
          <TableHead className="w-[140px]">Type</TableHead>
          <TableHead className="w-[130px]">Confidence</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => {
          const isLowConfidence = row.confidence.overall < 0.6;

          return (
            <TableRow
              key={`${row.title}-${row.date}-${idx}`}
              className={isLowConfidence ? "border-l-4 border-l-red-400 bg-red-50/30" : ""}
            >
              <TableCell>
                <Checkbox
                  checked={row.selected}
                  onCheckedChange={(v) => updateRow(idx, { selected: Boolean(v) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.title}
                  onChange={(e) => updateRow(idx, { title: e.target.value })}
                  className="h-9 text-sm"
                />
              </TableCell>
              <TableCell>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(idx, { date: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
                />
              </TableCell>
              <TableCell>
                <select
                  value={row.type}
                  onChange={(e) => updateRow(idx, { type: e.target.value as typeof EVENT_TYPES[number] })}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <ConfidenceBadge
                  score={row.confidence.overall}
                  reasoning={row.confidence.reasoning}
                />
              </TableCell>
              <TableCell>
                <div
                  className="truncate text-sm text-zinc-600"
                  title={row.description}
                >
                  {row.description && row.description.length > 50
                    ? `${row.description.slice(0, 50)}...`
                    : row.description}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
