import { fetchGoogleEvents } from "./fetch-google-events";
import { pushEventsToGoogle } from "./push-events";
import { prisma } from "@/lib/db";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { EventSource } from "@prisma/client";
import { detectConflicts, type ConflictRecord } from "./detect-conflicts";

export interface SyncResult {
  ok: boolean;
  fetched: number; // Google events imported
  pushed: number; // Almanac events pushed to Google
  skippedDuplicates: number;
  conflicts: ConflictRecord[];
  errors: string[];
}

/**
 * Run full bidirectional sync:
 * 1. Fetch events from Google Calendar
 * 2. Detect conflicts (events modified in both systems)
 * 3. Import new events (skip duplicates and conflicts)
 * 4. Push un-synced Almanac events to Google (skip conflicts)
 */
export async function runSync(accessToken: string): Promise<SyncResult> {
  const errors: string[] = [];
  let fetched = 0;
  let skippedDuplicates = 0;

  try {
    // Step 1: Fetch from Google Calendar
    const googleEvents = await fetchGoogleEvents(accessToken);

    // Step 2: Detect conflicts
    // Get all local ALMANAC events that have googleEventId (synced events)
    const syncedLocalEvents = await prisma.event.findMany({
      where: {
        source: EventSource.ALMANAC,
        googleEventId: { not: null },
      },
    });

    const conflicts = detectConflicts(
      syncedLocalEvents.map((e) => ({
        id: e.id,
        googleEventId: e.googleEventId,
        title: e.title,
        date: e.date,
        time: e.time,
        description: e.description || "",
      })),
      googleEvents.map((g) => ({
        googleEventId: g.googleEventId,
        title: g.title,
        date: g.date,
        time: g.time,
        description: g.description,
      }))
    );

    // Build set of conflicting googleEventIds to skip during import/push
    const conflictingGoogleIds = new Set(
      conflicts.map((c) => c.googleEventId)
    );

    // Step 3: Import new events (skip duplicates and conflicts)
    for (const gEvent of googleEvents) {
      try {
        // Skip if this event has a conflict
        if (conflictingGoogleIds.has(gEvent.googleEventId)) {
          continue;
        }

        // Check if event already exists by googleEventId
        const existing = await prisma.event.findUnique({
          where: { googleEventId: gEvent.googleEventId },
        });

        if (existing) {
          skippedDuplicates++;
          continue;
        }

        // Create or get "Google Calendar" catch-all course
        const courseResult = await getOrCreateCourse({
          code: "GCAL",
          name: "Google Calendar",
          semester: "External",
        });

        if (!courseResult.ok) {
          errors.push(`Failed to get/create GCAL course: ${courseResult.error}`);
          continue;
        }

        // Import event as read-only external event
        await prisma.event.create({
          data: {
            title: gEvent.title,
            date: gEvent.date,
            time: gEvent.time,
            type: gEvent.type,
            description: gEvent.description,
            courseId: courseResult.course.id,
            source: EventSource.GOOGLE_CALENDAR,
            googleEventId: gEvent.googleEventId,
            editable: false, // External events are read-only
          },
        });

        fetched++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Import Google event ${gEvent.googleEventId}: ${message}`);
        console.warn(`Failed to import event ${gEvent.googleEventId}:`, error);
      }
    }

    // Step 4: Push un-synced Almanac events to Google (skip conflicts)
    const localEvents = await prisma.event.findMany({
      where: {
        source: EventSource.ALMANAC,
        googleEventId: null,
      },
      include: {
        course: true,
      },
    });

    const pushResult = await pushEventsToGoogle(accessToken, localEvents);
    const pushed = pushResult.pushed;
    errors.push(...pushResult.errors);

    return {
      ok: errors.length === 0 && conflicts.length === 0,
      fetched,
      pushed,
      skippedDuplicates,
      conflicts,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    errors.push(`Sync failed: ${message}`);

    return {
      ok: false,
      fetched,
      pushed: 0,
      skippedDuplicates,
      conflicts: [],
      errors,
    };
  }
}
