"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Course } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeFromGoogleCalendar } from "@/app/server-actions/calendar";

const CreateCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

/**
 * Create a new course.
 * Course code must be unique per user.
 */
export async function createCourse(
  input: unknown
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const parsed = CreateCourseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid course data: " + parsed.error.message };
    }

    const course = await prisma.course.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        color: parsed.data.color || null,
        userId,
      },
    });

    return { ok: true, course };
  } catch (e) {
    // Handle unique constraint violation (duplicate course code for this user)
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      const parsed = CreateCourseSchema.safeParse(input);
      return { ok: false, error: `Course ${parsed.success ? parsed.data.code : ''} already exists.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create course." };
  }
}

/**
 * Fetch all courses for the authenticated user, optionally filtered by semester.
 */
export async function getCourses(filters?: {
  semester?: string;
}): Promise<{ ok: true; courses: Course[] } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const courses = await prisma.course.findMany({
      where: {
        userId,
        semester: filters?.semester,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return { ok: true, courses };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to fetch courses." };
  }
}

/**
 * Delete a course and all its events (via cascade).
 * Enforces ownership check.
 * Also removes synced events from Google Calendar before cascade delete.
 */
export async function deleteCourse(
  courseId: string
): Promise<
  | { ok: true; eventsRemoved: number; googleRemoved: number; googleFailed: number }
  | { ok: false; error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    const course = await prisma.course.findFirst({
      where: { id: courseId, userId },
    });

    if (!course) {
      return { ok: false, error: "Course not found or access denied" };
    }

    // Fetch synced events BEFORE cascade delete
    const syncedEvents = await prisma.event.findMany({
      where: { courseId, userId, googleEventId: { not: null } },
      select: { googleEventId: true },
    });

    // Batch-remove from Google Calendar
    let googleRemoved = 0;
    let googleFailed = 0;
    if (syncedEvents.length > 0 && session.accessToken) {
      const results = await Promise.allSettled(
        syncedEvents.map((evt) =>
          removeFromGoogleCalendar(session.accessToken!, evt.googleEventId!)
        )
      );
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.ok) {
          googleRemoved++;
        } else {
          googleFailed++;
        }
      }
    }

    // Cascade delete course + events
    await prisma.course.delete({
      where: { id: courseId },
    });

    return { ok: true, eventsRemoved: syncedEvents.length, googleRemoved, googleFailed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete course." };
  }
}

/**
 * Get existing course by code or create if doesn't exist.
 * Scoped to authenticated user.
 * Useful for PDF parsing flow where course may or may not exist.
 */
export async function getOrCreateCourse(
  input: CreateCourseInput
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { ok: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const parsed = CreateCourseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid course data: " + parsed.error.message };
    }

    // Check if course exists for this user
    const existing = await prisma.course.findFirst({
      where: {
        code: parsed.data.code,
        userId,
      },
    });

    if (existing) {
      return { ok: true, course: existing };
    }

    // Create new course for this user
    const course = await prisma.course.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        color: parsed.data.color || null,
        userId,
      },
    });

    return { ok: true, course };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to get or create course." };
  }
}
