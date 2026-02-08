/**
 * Represents a time slot for an event.
 */
export interface TimeSlot {
  eventId: string;
  start: Date;
  end: Date;
}

/**
 * Find conflicting events based on time overlap.
 * Only considers timed events (not all-day events).
 * Returns a set of event IDs that have conflicts.
 */
export function findConflicts(events: TimeSlot[]): Set<string> {
  const conflicts = new Set<string>();

  // Sort events by start time for efficient conflict detection
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Check each pair of events for overlap
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // If event j starts after event i ends, no more conflicts for event i
      if (sorted[j].start >= sorted[i].end) {
        break;
      }

      // Events overlap: event j starts before event i ends
      conflicts.add(sorted[i].eventId);
      conflicts.add(sorted[j].eventId);
    }
  }

  return conflicts;
}
