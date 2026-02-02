"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarClient } from "@/lib/google";
import { prisma } from "@/lib/db";
import { updateEvent } from "@/app/server-actions/events";

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function syncEventsToCalendar(
  eventIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return { ok: false, error: "Not signed in (or missing Google access token)." };
    }

    // Fetch events from database by IDs
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
      },
      include: {
        course: true,
      },
    });

    if (events.length === 0) {
      return { ok: false, error: "No events found to sync." };
    }

    const calendar = getCalendarClient(accessToken);

    // Insert each event to Google Calendar and update database with googleEventId
    for (const event of events) {
      const startDate = event.date;
      const endDate = addDays(event.date, 1);

      // Insert to Google Calendar
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description: [
            event.type,
            event.description,
            `Course: ${event.course.name} (${event.course.code})`,
          ].filter(Boolean).join("\n\n"),
          start: { date: startDate },
          end: { date: endDate },
        },
      });

      const googleEventId = response.data.id;

      if (googleEventId) {
        // Update database event with Google Calendar ID
        await updateEvent(event.id, {
          googleEventId,
        });
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Calendar sync failed." };
  }
}

/**
 * Delete event from Google Calendar.
 * Called when user deletes a synced event (has googleEventId).
 */
export async function deleteGoogleCalendarEvent(
  googleEventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return { ok: false, error: "Not signed in (or missing Google access token)." };
    }

    const calendar = getCalendarClient(accessToken);

    // Delete from Google Calendar
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });

    return { ok: true };
  } catch (e) {
    // If event doesn't exist in Google Calendar or token expired, log but don't block local deletion
    console.warn(`Failed to delete Google Calendar event ${googleEventId}:`, e instanceof Error ? e.message : e);

    // Return success anyway - local deletion should proceed
    // User might have already deleted from Google Calendar directly
    return { ok: true };
  }
}
