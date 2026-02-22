import type { JWT } from "next-auth/jwt";
import { google } from "googleapis";
import { prisma } from "@/lib/db";

export async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret)
      throw new Error("Missing Google OAuth env vars.");
    if (!token.refreshToken) throw new Error("Missing refresh token.");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Fetch the Google access token for a user from the database.
 * Used by server actions instead of exposing the token via the session.
 */
export async function getGoogleAccessTokenForUser(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true },
  });
  return user?.googleAccessToken ?? null;
}

/**
 * Hex colors matching Almanac's 10-color course palette (Tailwind 500 values).
 * Index matches COURSE_COLORS array in components/calendar/utils.ts.
 */
const GOOGLE_CALENDAR_COLORS: string[] = [
  "#3b82f6", // 0: Blue
  "#f43f5e", // 1: Rose
  "#14b8a6", // 2: Teal
  "#8b5cf6", // 3: Violet
  "#f59e0b", // 4: Amber
  "#10b981", // 5: Emerald
  "#06b6d4", // 6: Cyan
  "#d946ef", // 7: Fuchsia
  "#f97316", // 8: Orange
  "#6366f1", // 9: Indigo
];

/**
 * Deterministic hash for course ID → palette index.
 * Must match hashCourseId in components/calendar/utils.ts.
 */
function hashCourseId(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = ((hash << 5) - hash + courseId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % GOOGLE_CALENDAR_COLORS.length;
}

/**
 * Get or create a secondary Google Calendar for a course.
 * Falls back to "primary" on any error (graceful degradation).
 */
export async function getOrCreateCourseCalendar(
  accessToken: string,
  course: {
    id: string;
    code: string;
    name: string;
    googleCalendarId: string | null;
  },
  userId: string,
): Promise<string> {
  const calendar = getCalendarClient(accessToken);

  // If course already has a Google Calendar ID, verify it still exists
  if (course.googleCalendarId) {
    try {
      await calendar.calendarList.get({
        calendarId: course.googleCalendarId,
      });
      return course.googleCalendarId;
    } catch (e: unknown) {
      const error = e as { code?: number };
      if (error.code === 404) {
        // Calendar was deleted externally; clear and recreate below
        await prisma.course.update({
          where: { id: course.id, userId },
          data: { googleCalendarId: null },
        });
      } else {
        console.error("Failed to verify course calendar:", e);
        return "primary";
      }
    }
  }

  // Create a new secondary calendar
  try {
    const calendarName = `${course.code} - ${course.name}`;
    const created = await calendar.calendars.insert({
      requestBody: {
        summary: calendarName,
        description: `Almanac events for ${calendarName}`,
        timeZone: "America/New_York",
      },
    });

    const newCalendarId = created.data.id;
    if (!newCalendarId) {
      console.error("Calendar created but no ID returned");
      return "primary";
    }

    // Set the calendar color to match Almanac's color scheme
    const colorIndex = hashCourseId(course.id);
    const bgColor = GOOGLE_CALENDAR_COLORS[colorIndex];
    try {
      await calendar.calendarList.patch({
        calendarId: newCalendarId,
        colorRgbFormat: true,
        requestBody: {
          backgroundColor: bgColor,
          foregroundColor: "#ffffff",
        },
      });
    } catch (colorError) {
      // Non-fatal: calendar works without custom color
      console.warn("Failed to set calendar color:", colorError);
    }

    // Save the Google Calendar ID to the course
    await prisma.course.update({
      where: { id: course.id, userId },
      data: { googleCalendarId: newCalendarId },
    });

    return newCalendarId;
  } catch (e) {
    console.error("Failed to create course calendar:", e);
    return "primary";
  }
}
