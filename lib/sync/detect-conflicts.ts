/**
 * Conflict detection for bidirectional Google Calendar sync.
 * Identifies field-level differences between local and remote event versions.
 */

export interface FieldDiff {
  field: "title" | "date" | "time" | "description";
  local: string | null;
  google: string | null;
}

export interface ConflictRecord {
  eventId: string; // Local event ID
  googleEventId: string; // Google Calendar event ID
  localTitle: string;
  googleTitle: string;
  diffs: FieldDiff[];
}

interface LocalEvent {
  id: string;
  googleEventId: string | null;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or null for all-day
  description: string;
}

interface GoogleEvent {
  googleEventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or null for all-day
  description: string;
}

/**
 * Detect conflicts between local and Google Calendar events.
 * A conflict occurs when the same event (matched by googleEventId) has different field values.
 *
 * @param localEvents - Events from local database
 * @param googleEvents - Events from Google Calendar
 * @returns Array of conflict records with field-level differences
 */
export function detectConflicts(
  localEvents: LocalEvent[],
  googleEvents: GoogleEvent[]
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  // Build map of Google events by googleEventId for fast lookup
  const googleEventMap = new Map<string, GoogleEvent>();
  for (const gEvent of googleEvents) {
    googleEventMap.set(gEvent.googleEventId, gEvent);
  }

  // Check each local event that has a googleEventId (synced events)
  for (const localEvent of localEvents) {
    if (!localEvent.googleEventId) {
      continue; // Skip unsynced events
    }

    const googleEvent = googleEventMap.get(localEvent.googleEventId);
    if (!googleEvent) {
      continue; // Event exists locally but not in Google (deleted remotely?)
    }

    // Compare fields and collect differences
    const diffs: FieldDiff[] = [];

    // Title comparison
    if (localEvent.title !== googleEvent.title) {
      diffs.push({
        field: "title",
        local: localEvent.title,
        google: googleEvent.title,
      });
    }

    // Date comparison
    if (localEvent.date !== googleEvent.date) {
      diffs.push({
        field: "date",
        local: localEvent.date,
        google: googleEvent.date,
      });
    }

    // Time comparison (both null counts as equal)
    if (localEvent.time !== googleEvent.time) {
      diffs.push({
        field: "time",
        local: localEvent.time,
        google: googleEvent.time,
      });
    }

    // Description comparison (normalize empty strings to null for comparison)
    const localDesc = localEvent.description || "";
    const googleDesc = googleEvent.description || "";
    if (localDesc !== googleDesc) {
      diffs.push({
        field: "description",
        local: localDesc || null,
        google: googleDesc || null,
      });
    }

    // If there are differences, record the conflict
    if (diffs.length > 0) {
      conflicts.push({
        eventId: localEvent.id,
        googleEventId: localEvent.googleEventId,
        localTitle: localEvent.title,
        googleTitle: googleEvent.title,
        diffs,
      });
    }
  }

  return conflicts;
}
