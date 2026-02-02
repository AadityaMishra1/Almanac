"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Course } from "@prisma/client";

const CreateCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

/**
 * Create a new course.
 * Course code must be unique.
 */
export async function createCourse(
  input: unknown
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
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
      },
    });

    return { ok: true, course };
  } catch (e) {
    // Handle unique constraint violation (duplicate course code)
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      const parsed = CreateCourseSchema.safeParse(input);
      return { ok: false, error: `Course ${parsed.success ? parsed.data.code : ''} already exists.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create course." };
  }
}

/**
 * Fetch all courses, optionally filtered by semester.
 */
export async function getCourses(filters?: {
  semester?: string;
}): Promise<{ ok: true; courses: Course[] } | { ok: false; error: string }> {
  try {
    const courses = await prisma.course.findMany({
      where: {
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
 * Get existing course by code or create if doesn't exist.
 * Useful for PDF parsing flow where course may or may not exist.
 */
export async function getOrCreateCourse(
  input: CreateCourseInput
): Promise<{ ok: true; course: Course } | { ok: false; error: string }> {
  try {
    const parsed = CreateCourseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid course data: " + parsed.error.message };
    }

    // Check if course exists
    const existing = await prisma.course.findUnique({
      where: { code: parsed.data.code },
    });

    if (existing) {
      return { ok: true, course: existing };
    }

    // Create new course
    const course = await prisma.course.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        color: parsed.data.color || null,
      },
    });

    return { ok: true, course };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to get or create course." };
  }
}
