'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash, Plus, Clock } from 'lucide-react';
import type { ChatCommand } from '@prisma/client';

interface ChatHistoryProps {
  onOperationComplete?: () => void;
}

export function ChatHistory({ onOperationComplete }: ChatHistoryProps) {
  const [commands, setCommands] = useState<ChatCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch command history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chat/history?limit=20');
      const data = await res.json();

      if (data.ok) {
        setCommands(data.commands);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (err) {
      setError('Failed to load history');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle undo operation
  const handleUndo = async (commandId: string) => {
    // Reset confirmation state
    setConfirmingId(null);

    try {
      setUndoingId(commandId);
      setError(null);

      const res = await fetch('/api/chat/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId }),
      });

      const data = await res.json();

      if (data.ok) {
        // Mark command as undone locally
        setCommands((prev) =>
          prev.map((cmd) => (cmd.id === commandId ? { ...cmd, undone: true } : cmd))
        );

        // Trigger calendar refresh
        if (onOperationComplete) {
          onOperationComplete();
        }
      } else {
        setError(data.error || 'Failed to undo operation');
      }
    } catch (err) {
      setError('Failed to undo operation');
      console.error('Error undoing command:', err);
    } finally {
      setUndoingId(null);
    }
  };

  // Get icon for command type
  const getIcon = (type: string) => {
    switch (type) {
      case 'modify':
        return <Pencil className="h-4 w-4" />;
      case 'delete':
        return <Trash className="h-4 w-4" />;
      case 'create':
        return <Plus className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get color for command type
  const getColor = (type: string) => {
    switch (type) {
      case 'modify':
        return 'border-blue-500';
      case 'delete':
        return 'border-red-500';
      case 'create':
        return 'border-green-500';
      default:
        return 'border-zinc-300';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-500">Loading history...</p>
        </div>
      </div>
    );
  }

  if (commands.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-sm text-zinc-600">No recent operations.</p>
          <p className="mt-1 text-xs text-zinc-400">Use the chat to modify your events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Error banner */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Command list */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {commands.map((command) => (
            <div
              key={command.id}
              className={`rounded-lg border-l-4 ${getColor(command.type)} ${
                command.undone ? 'bg-zinc-50 opacity-60' : 'bg-white'
              } border border-zinc-200 p-3 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Icon + Description */}
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 text-zinc-400">{getIcon(command.type)}</div>
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        command.undone ? 'text-zinc-500 line-through' : 'text-zinc-900'
                      }`}
                    >
                      {command.description}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(command.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Right: Action button */}
                <div className="flex-shrink-0">
                  {command.undone ? (
                    <span className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
                      Undone
                    </span>
                  ) : confirmingId === command.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUndo(command.id)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        disabled={undoingId !== null}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                        disabled={undoingId !== null}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(command.id)}
                      className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                      disabled={undoingId !== null}
                    >
                      {undoingId === command.id ? 'Undoing...' : 'Undo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
