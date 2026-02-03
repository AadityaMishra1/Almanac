'use client';

import { ConfirmationPayload } from '@/types/chat';
import { Pencil, Trash2, Plus, AlertTriangle, Loader2 } from 'lucide-react';

interface CommandConfirmationProps {
  type: 'modify' | 'delete' | 'create';
  confirmation: ConfirmationPayload;
  onApprove: () => void;
  onReject: () => void;
  isExecuting: boolean;
}

/**
 * Single-event confirmation dialog with before/after diff view.
 * Rendered inline in chat messages when AI proposes an event change.
 */
export function CommandConfirmation({
  type,
  confirmation,
  onApprove,
  onReject,
  isExecuting,
}: CommandConfirmationProps) {
  // Determine icon and header based on type
  const Icon = type === 'modify' ? Pencil : type === 'delete' ? Trash2 : Plus;
  const headerText = type === 'modify' ? 'Modify Event' : type === 'delete' ? 'Delete Event' : 'Create Event';
  const approveText = type === 'delete' ? 'Delete' : 'Approve';
  const approveColor = type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-900 hover:bg-zinc-800';

  // Format date nicely (YYYY-MM-DD -> Month DD, YYYY)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Get event details based on type
  const eventDetails =
    type === 'delete' ? confirmation.items?.[0] : confirmation.changes?.before || confirmation.items?.[0];

  return (
    <div className="max-w-[80%] overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <Icon className="h-4 w-4 text-zinc-700" />
        <span className="text-sm font-semibold text-zinc-900">{headerText}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Modify - show diff view */}
        {type === 'modify' && confirmation.changes && (
          <div className="space-y-2">
            {/* Show diff for each changed field */}
            {confirmation.changes.before.title !== confirmation.changes.after.title && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Title</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 line-through">
                    {confirmation.changes.before.title}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="text-sm text-green-600 font-medium">
                    {confirmation.changes.after.title}
                  </span>
                </div>
              </div>
            )}

            {confirmation.changes.before.date !== confirmation.changes.after.date && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Date</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 line-through">
                    {formatDate(confirmation.changes.before.date)}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="text-sm text-green-600 font-medium">
                    {formatDate(confirmation.changes.after.date)}
                  </span>
                </div>
              </div>
            )}

            {confirmation.changes.before.time !== confirmation.changes.after.time && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Time</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 line-through">
                    {confirmation.changes.before.time || 'All-day'}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="text-sm text-green-600 font-medium">
                    {confirmation.changes.after.time || 'All-day'}
                  </span>
                </div>
              </div>
            )}

            {confirmation.changes.before.type !== confirmation.changes.after.type && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Type</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 line-through">
                    {confirmation.changes.before.type}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span className="text-sm text-green-600 font-medium">
                    {confirmation.changes.after.type}
                  </span>
                </div>
              </div>
            )}

            {/* Show course name (unchanged) */}
            <div className="text-xs text-zinc-500 pt-1">
              Course: {confirmation.changes.before.courseName}
            </div>
          </div>
        )}

        {/* Delete - show event details */}
        {type === 'delete' && eventDetails && (
          <div className="space-y-2">
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-medium text-zinc-900">{eventDetails.title}</div>
              <div className="text-xs text-zinc-600 mt-1">
                {formatDate(eventDetails.date)}
                {eventDetails.time && ` at ${eventDetails.time}`}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {eventDetails.type} • {eventDetails.courseName}
              </div>
            </div>
            <div className="text-sm text-red-700 font-medium">
              This action will permanently delete this event.
            </div>
          </div>
        )}

        {/* Create - show proposed event */}
        {type === 'create' && eventDetails && (
          <div className="space-y-2">
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <div className="text-sm font-medium text-zinc-900">{eventDetails.title}</div>
              <div className="text-xs text-zinc-600 mt-1">
                {formatDate(eventDetails.date)}
                {eventDetails.time && ` at ${eventDetails.time}`}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {eventDetails.type} • {eventDetails.courseName}
              </div>
            </div>
            <div className="text-sm text-green-700 font-medium">New event will be created</div>
          </div>
        )}

        {/* Conflict warnings */}
        {confirmation.conflicts && confirmation.conflicts.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-amber-900">Scheduling Conflict</div>
                <div className="text-xs text-amber-800">
                  Proceeding will create a scheduling conflict:
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
          onClick={onApprove}
          disabled={isExecuting}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${approveColor}`}
        >
          {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
          {approveText}
        </button>
      </div>
    </div>
  );
}
