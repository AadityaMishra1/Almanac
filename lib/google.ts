import { google } from "googleapis";
import { prisma } from "@/lib/db";

export function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Fetch the Google access token for a user from the database.
 * If the token is expired (or within 60s of expiry), refreshes it automatically.
 */
export async function getGoogleAccessTokenForUser(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!user?.googleAccessToken) return null;

  // Check if token is still valid (with 60s buffer)
  const expiresAt = user.googleTokenExpiry?.getTime() ?? 0;
  if (Date.now() < expiresAt - 60_000) {
    return user.googleAccessToken;
  }

  // Token expired or expiring soon — refresh it
  if (!user.googleRefreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: user.googleRefreshToken,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) return null;

    const newAccessToken = refreshed.access_token as string;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

    // Persist refreshed tokens to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: newAccessToken,
        googleTokenExpiry: newExpiry,
        // Google may rotate the refresh token
        ...(refreshed.refresh_token
          ? { googleRefreshToken: refreshed.refresh_token }
          : {}),
      },
    });

    return newAccessToken;
  } catch {
    return null;
  }
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
    // Format code for a clean Google Calendar name:
    // Short codes like "ECE 309" stay uppercase; long slugs like
    // "SIGNALS-&-SYSTEMS" get title-cased to "Signals & Systems"
    const prettyCode =
      course.code.length <= 10
        ? course.code
        : course.code
            .toLowerCase()
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    const calendarName = `${prettyCode} — ${course.name}`;
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
