'use client';

import { useState } from 'react';
import { ConfirmationPayload } from '@/types/chat';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface BulkConfirmationProps {
  type: 'bulk-delete';
  confirmation: ConfirmationPayload;
  onApprove: (selectedIds: string[]) => void;
  onReject: () => void;
  isExecuting: boolean;
}

/**
 * Multi-event confirmation with per-item checkboxes.
 * Pre-selects all items with ability to uncheck before confirming.
 */
export function BulkConfirmation({
  type,
  confirmation,
  onApprove,
  onReject,
  isExecuting,
}: BulkConfirmationProps) {
  // Initialize with all items selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(confirmation.items?.map((item) => item.id) || [])
  );

  const items = confirmation.items || [];
  const selectedCount = selectedIds.size;
  const totalCount = items.length;

  // Format date nicely (YYYY-MM-DD -> Month DD, YYYY)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Toggle single item selection
  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all items
  const toggleAll = () => {
    if (selectedIds.size === totalCount) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  // Handle approve
  const handleApprove = () => {
    onApprove(Array.from(selectedIds));
  };

  return (
    <div className="max-w-[80%] overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-zinc-700" />
          <span className="text-sm font-semibold text-zinc-900">Delete {totalCount} Events</span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
        >
          {selectedIds.size === totalCount ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Scrollable item list */}
        <div className="max-h-64 overflow-y-auto space-y-2 border border-zinc-200 rounded-md">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                  isSelected ? 'bg-white' : 'bg-zinc-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">{item.title}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {formatDate(item.date)}
                    {item.time && ` at ${item.time}`}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{item.courseName}</div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        <div className="text-sm text-zinc-700">
          <span className="font-medium">{selectedCount}</span> of {totalCount} events selected
        </div>

        {/* Conflict warnings */}
        {confirmation.conflicts && confirmation.conflicts.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-amber-900">Scheduling Conflict</div>
                <div className="text-xs text-amber-800">
                  Some deletions may affect scheduling conflicts:
                </div>
                <ul className="text-xs text-amber-700 space-y-0.5 mt-1">
                  {confirmation.conflicts.map((conflict, idx) => (
                    <li key={idx}>• {conflict.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
        <button
          onClick={onReject}
          disabled={isExecuting}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={isExecuting || selectedCount === 0}
          className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
          Delete Selected ({selectedCount})
        </button>
      </div>
    </div>
  );
}
