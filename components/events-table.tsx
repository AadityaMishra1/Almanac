"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyllabusEvent } from "@/lib/events";

type Row = SyllabusEvent & { selected: boolean };

export function EventsTable({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  function updateRow(idx: number, patch: Partial<Row>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px]">Sync</TableHead>
          <TableHead className="w-[220px]">Title</TableHead>
          <TableHead className="w-[150px]">Date</TableHead>
          <TableHead className="w-[160px]">Type</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={`${row.title}-${row.date}-${idx}`}>
            <TableCell>
              <Checkbox checked={row.selected} onCheckedChange={(v) => updateRow(idx, { selected: Boolean(v) })} />
            </TableCell>
            <TableCell>
              <Input value={row.title} onChange={(e) => updateRow(idx, { title: e.target.value })} />
            </TableCell>
            <TableCell>
              <Input value={row.date} onChange={(e) => updateRow(idx, { date: e.target.value })} placeholder="YYYY-MM-DD" />
            </TableCell>
            <TableCell>
              <Input value={row.type} onChange={(e) => updateRow(idx, { type: e.target.value })} />
            </TableCell>
            <TableCell>
              <Textarea value={row.description ?? ""} onChange={(e) => updateRow(idx, { description: e.target.value })} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

