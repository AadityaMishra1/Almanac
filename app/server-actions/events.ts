"use server";

import { prisma } from "@/lib/db";
import { CreateEventSchema, canModifyEvent } from "@/lib/events";
import { EventSource } from "@prisma/client";
import type { Event } from "@prisma/client";

/**
 * Create a new event in the database.
 * Always sets editable based on source (ALMANAC = true, GOOGLE_CALENDAR = false).
 */
export async function createEvent(
  input: unknown
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  try {
    const parsed = CreateEventSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid event data: " + parsed.error.message };
    }

    const data = parsed.data;

    // Set editable based on source
    const editable = data.source === EventSource.ALMANAC;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        date: data.date,
        time: data.time || null,
        type: data.type,
        description: data.description,
        courseId: data.courseId,
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
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create event." };
  }
}

/**
 * Update an existing event.
 * Enforces permission: only ALMANAC events can be modified.
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<{
    title: string;
    date: string;
    time: string | null;
    type: string;
    description: string;
    googleEventId: string | null;
  }>
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  try {
    // Check permission BEFORE attempting update
    const existing = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      return { ok: false, error: "Event not found." };
    }

    if (!canModifyEvent(existing)) {
      return {
        ok: false,
        error: "Cannot modify external Google Calendar events. This event is read-only.",
      };
    }

    // Permission check passed, proceed with update
    const event = await prisma.event.update({
      where: { id: eventId },
      data: updates,
      include: {
        course: true,
      },
    });

    return { ok: true, event };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update event." };
  }
}

/**
 * Delete an event.
 * Enforces permission: only ALMANAC events can be deleted.
 */
export async function deleteEvent(
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Check permission BEFORE attempting delete
    const existing = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      return { ok: false, error: "Event not found." };
    }

    if (!canModifyEvent(existing)) {
      return {
        ok: false,
        error: "Cannot delete external Google Calendar events. This event is read-only.",
      };
    }

    // Permission check passed, proceed with delete
    await prisma.event.delete({
      where: { id: eventId },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete event." };
  }
}

/**
 * Fetch events with optional filters.
 * No permission restrictions on read operations.
 */
export async function getEvents(filters?: {
  courseId?: string;
  source?: EventSource;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}): Promise<{ ok: true; events: Event[] } | { ok: false; error: string }> {
  try {
    const events = await prisma.event.findMany({
      where: {
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
        date: 'asc', // Chronological order
      },
    });

    return { ok: true, events };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch events." };
  }
}
