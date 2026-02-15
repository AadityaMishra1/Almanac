"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyllabusEvent } from "@/lib/events";

type Row = SyllabusEvent & { selected: boolean };

function getTypeBadgeColors(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "exam") {
    return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
  }
  if (normalized === "assignment") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
  }
  if (normalized === "quiz") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
  }
  return "bg-surface-tertiary text-[var(--text-secondary)]";
}

export function EventsTable({ rows, onChange, onDeleteRow }: { rows: Row[]; onChange: (rows: Row[]) => void; onDeleteRow?: (idx: number, id?: string) => void }) {
  function updateRow(idx: number, patch: Partial<Row>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div
          key={`${row.title}-${row.date}-${idx}`}
          className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <div className={cn(
            "group rounded-xl border border-[var(--border-subtle)] bg-surface p-4 transition-all duration-150 hover:border-[var(--border)] hover:shadow-sm",
            row.selected ? "ring-1 ring-brand-200/50" : "opacity-60"
          )}>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex items-start pt-1">
              <Checkbox
                checked={row.selected}
                onCheckedChange={(v) => updateRow(idx, { selected: Boolean(v) })}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "text-[11px] font-medium uppercase tracking-wider rounded-md px-2 py-0.5",
                  getTypeBadgeColors(row.type)
                )}>
                  {row.type}
                </span>
                <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                  <Calendar className="h-3 w-3" />
                  <span>{row.date}</span>
                </div>
              </div>

              <input
                type="text"
                value={row.title}
                onChange={(e) => updateRow(idx, { title: e.target.value })}
                className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                placeholder="Event title"
              />

              <input
                type="text"
                value={row.description ?? ""}
                onChange={(e) => updateRow(idx, { description: e.target.value })}
                className="w-full bg-transparent text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]"
                placeholder="Add description"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(idx, { date: e.target.value })}
                className="w-full sm:w-28 rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-2.5 py-1.5 text-xs text-[var(--text-primary)] text-center transition-colors duration-150 focus:border-brand-400 focus:outline-none"
              />
              {onDeleteRow && (
                <button
                  onClick={() => onDeleteRow(idx, (row as Row & { id?: string }).id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label={`Delete ${row.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] hover:text-red-500 transition-colors duration-150" />
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      ))}
    </div>
  );
}
