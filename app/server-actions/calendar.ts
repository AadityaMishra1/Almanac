"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarClient, getGoogleAccessTokenForUser } from "@/lib/google";
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

export async function removeFromGoogleCalendar(
  accessToken: string,
  googleEventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const calendar = getCalendarClient(accessToken);
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
    return { ok: true };
  } catch (e: unknown) {
    const error = e as { code?: number; message?: string };
    // 404 or 410 means the event is already gone — treat as success
    if (error.code === 404 || error.code === 410) {
      return { ok: true };
    }
    return { ok: false, error: error.message ?? "Failed to remove from Google Calendar." };
  }
}

export async function getUnsyncedEventIds(): Promise<
  { ok: true; eventIds: string[]; count: number } | { ok: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { ok: false, error: "Not authenticated" };

    const events = await prisma.event.findMany({
      where: {
        userId,
        source: "ALMANAC",
        googleEventId: null,
      },
      select: { id: true },
    });

    return { ok: true, eventIds: events.map((e) => e.id), count: events.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch unsynced events." };
  }
}

export async function syncEventsToCalendar(
  eventIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { ok: false, error: "Not authenticated" };
    }

    const accessToken = await getGoogleAccessTokenForUser(userId);
    if (!accessToken) {
      return { ok: false, error: "No Google Calendar access. Please re-authenticate." };
    }

    // Fetch events from database by IDs (scoped to user)
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        userId,
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
            event.course ? `Course: ${event.course.name} (${event.course.code})` : "",
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
