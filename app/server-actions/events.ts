"use server";

import { prisma } from "@/lib/db";
import {
  CreateEventSchema,
  UpdateEventSchema,
  canModifyEvent,
} from "@/lib/events";
import { EventSource } from "@prisma/client";
import type { Event } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeFromGoogleCalendar } from "@/app/server-actions/calendar";
import { getGoogleAccessTokenForUser } from "@/lib/google";

/**
 * Create a new event in the database.
 * Always sets editable based on source (ALMANAC = true, GOOGLE_CALENDAR = false).
 */
export async function createEvent(
  input: unknown,
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const parsed = CreateEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid event data: " + parsed.error.message,
      };
    }

    const data = parsed.data;

    // Verify course ownership (only if courseId is provided)
    if (data.courseId) {
      const course = await prisma.course.findFirst({
        where: { id: data.courseId, userId },
      });

      if (!course) {
        return { ok: false, error: "Course not found or access denied" };
      }
    }

    // Set editable based on source
    const editable = data.source === EventSource.ALMANAC;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        date: data.date,
        time: data.time || null,
        type: data.type,
        description: data.description,
        courseId: data.courseId || null,
        userId,
        source: data.source || EventSource.ALMANAC,
        googleEventId: data.googleEventId || null,
        editable,
      },
      include: {
        course: true, // Include course data for UI
      },
    });

    return { ok: true, event };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create event.",
    };
  }
}

/**
 * Update an existing event.
 * Enforces permission: only ALMANAC events can be modified.
 */
export async function updateEvent(
  eventId: string,
  updates: unknown,
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const parsed = UpdateEventSchema.safeParse(updates);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid update data: " + parsed.error.message,
      };
    }

    const userId = session.user.id;

    // Check permission and ownership BEFORE attempting update
    const existing = await prisma.event.findFirst({
      where: { id: eventId, userId },
    });

    if (!existing) {
      return { ok: false, error: "Event not found or access denied" };
    }

    if (!canModifyEvent(existing)) {
      return {
        ok: false,
        error:
          "Cannot modify external Google Calendar events. This event is read-only.",
      };
    }

    // Permission check passed, proceed with update
    const event = await prisma.event.update({
      where: { id: eventId },
      data: parsed.data,
      include: {
        course: true,
      },
    });

    return { ok: true, event };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update event.",
    };
  }
}

/**
 * Delete an event.
 * Enforces permission: only ALMANAC events can be deleted.
 * Also removes the event from Google Calendar if it was synced.
 */
export async function deleteEvent(
  eventId: string,
): Promise<
  | { ok: true; googleSyncResult: "removed" | "not_synced" | "failed" }
  | { ok: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Check permission and ownership BEFORE attempting delete
    const existing = await prisma.event.findFirst({
      where: { id: eventId, userId },
    });

    if (!existing) {
      return { ok: false, error: "Event not found or access denied" };
    }

    if (!canModifyEvent(existing)) {
      return {
        ok: false,
        error:
          "Cannot delete external Google Calendar events. This event is read-only.",
      };
    }

    // Remove from Google Calendar if synced
    let googleSyncResult: "removed" | "not_synced" | "failed" = "not_synced";
    const accessToken = existing.googleEventId
      ? await getGoogleAccessTokenForUser(userId)
      : null;
    if (existing.googleEventId && accessToken) {
      const gcResult = await removeFromGoogleCalendar(
        accessToken,
        existing.googleEventId,
        existing.googleCalendarId,
      );
      googleSyncResult = gcResult.ok ? "removed" : "failed";
    }

    // Always proceed with DB delete regardless of Google Calendar result
    await prisma.event.delete({
      where: { id: eventId },
    });

    return { ok: true, googleSyncResult };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete event.",
    };
  }
}

/**
 * Fetch events with optional filters.
 * Scoped to authenticated user.
 */
export async function getEvents(filters?: {
  courseId?: string;
  source?: EventSource;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}): Promise<{ ok: true; events: Event[] } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const events = await prisma.event.findMany({
      where: {
        userId,
        courseId: filters?.courseId,
        source: filters?.source,
        date: {
          gte: filters?.startDate,
          lte: filters?.endDate,
        },
      },
      include: {
        course: true, // Include course data for display
      },
      orderBy: {
        date: "asc", // Chronological order
      },
    });

    return { ok: true, events };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to fetch events.",
    };
  }
}
