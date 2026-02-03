import { UIMessage } from 'ai';

/**
 * Chat message extends Vercel AI SDK UIMessage with optional metadata.
 * Uses the standard UIMessage type from Vercel AI SDK.
 */
export type ChatMessage = UIMessage;

/**
 * Tool execution result (discriminated union).
 */
export type ToolResult =
  | {
      ok: true;
      requiresConfirmation: boolean;
      data: unknown;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Confirmation payload for UI confirmation dialogs.
 * Sent to UI when AI tool execution requires user approval.
 */
export interface ConfirmationPayload {
  type: 'modify' | 'delete' | 'create' | 'bulk-delete';
  description: string; // Human-readable summary

  // For modify operations: before/after diff
  changes?: {
    before: EventSnapshot;
    after: EventSnapshot;
  };

  // For bulk operations: all affected items
  items?: EventSnapshot[];

  // Time overlap warnings (conflicts)
  conflicts?: ConflictWarning[];
}

/**
 * Serializable event state for diffs and previews.
 */
export interface EventSnapshot {
  id: string;
  title: string;
  date: string; // ISO 8601 (YYYY-MM-DD)
  time: string | null; // HH:MM format or null for all-day
  type: string; // exam, assignment, quiz, reading
  courseName: string; // Course display name for UI
}

/**
 * Conflict warning for time overlaps.
 */
export interface ConflictWarning {
  eventId: string;
  eventTitle: string;
  message: string; // e.g., "Overlaps with CSC 316 Lecture at 2pm"
}

/**
 * Command record for undo history persistence.
 */
export interface CommandRecord {
  id: string;
  type: 'modify' | 'delete' | 'create';
  description: string; // Human-readable description of the operation
  beforeState: string; // JSON serialized EventSnapshot or null for create
  afterState: string; // JSON serialized EventSnapshot or null for delete
  eventId: string;
  timestamp: Date;
  undone: boolean;
}
