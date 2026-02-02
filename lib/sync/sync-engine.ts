import { fetchGoogleEvents } from "./fetch-google-events";
import { pushEventsToGoogle } from "./push-events";
import { prisma } from "@/lib/db";
import { getOrCreateCourse } from "@/app/server-actions/courses";
import { EventSource } from "@prisma/client";

export interface SyncResult {
  ok: boolean;
  fetched: number; // Google events imported
  pushed: number; // Almanac events pushed to Google
  skippedDuplicates: number;
  errors: string[];
}

/**
 * Run full bidirectional sync:
 * 1. Fetch events from Google Calendar
 * 2. Import new events (skip duplicates via googleEventId)
 * 3. Push un-synced Almanac events to Google
 */
export async function runSync(accessToken: string): Promise<SyncResult> {
  const errors: string[] = [];
  let fetched = 0;
  let skippedDuplicates = 0;

  try {
    // Step 1: Fetch from Google Calendar
    const googleEvents = await fetchGoogleEvents(accessToken);

    // Step 2: Deduplicate and import
    for (const gEvent of googleEvents) {
      try {
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

    // Step 3: Push un-synced Almanac events to Google
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
      ok: errors.length === 0,
      fetched,
      pushed,
      skippedDuplicates,
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
      errors,
    };
  }
}
