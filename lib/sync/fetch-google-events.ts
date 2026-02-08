import { getCalendarClient } from "@/lib/google";

/**
 * Google Calendar event data in local format.
 * Minimal structure for import into Almanac database.
 */
export interface GoogleEventData {
  googleEventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or null for all-day
  type: string; // default "other" for external events
  description: string;
}

export interface FetchOptions {
  timeMin?: string; // ISO 8601 date-time
  timeMax?: string; // ISO 8601 date-time
}

/**
 * Fetch events from Google Calendar and convert to local format.
 * Handles both all-day and timed events.
 */
export async function fetchGoogleEvents(
  accessToken: string,
  options?: FetchOptions
): Promise<GoogleEventData[]> {
  const calendar = getCalendarClient(accessToken);

  // Default time range: 6 months back to 6 months forward
  const defaultTimeMin = options?.timeMin || getDefaultTimeMin();
  const defaultTimeMax = options?.timeMax || getDefaultTimeMax();

  const events: GoogleEventData[] = [];
  let pageToken: string | undefined = undefined;

  // Handle pagination
  do {
    const response: any = await calendar.events.list({
      calendarId: "primary",
      timeMin: defaultTimeMin,
      timeMax: defaultTimeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
      pageToken,
    });

    const items = response.data.items || [];

    for (const item of items) {
      // Skip events without ID or summary
      if (!item.id || !item.summary) {
        continue;
      }

      try {
        const eventData = convertGoogleEventToLocal(item);
        events.push(eventData);
      } catch (error) {
        // Skip individual events that fail to parse
        console.warn(`Failed to parse Google Calendar event ${item.id}:`, error);
        continue;
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return events;
}

/**
 * Convert Google Calendar event to local format.
 * Handles both all-day (start.date) and timed (start.dateTime) events.
 */
function convertGoogleEventToLocal(item: any): GoogleEventData {
  const googleEventId = item.id!;
  const title = item.summary!;

  // Extract date and time from start field
  let date: string;
  let time: string | null = null;

  if (item.start?.date) {
    // All-day event: start.date is YYYY-MM-DD
    date = item.start.date;
  } else if (item.start?.dateTime) {
    // Timed event: start.dateTime is ISO 8601 with timezone
    const dt = new Date(item.start.dateTime);

    // Extract date as YYYY-MM-DD
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    date = `${year}-${month}-${day}`;

    // Extract time as HH:MM
    const hour = String(dt.getHours()).padStart(2, "0");
    const minute = String(dt.getMinutes()).padStart(2, "0");
    time = `${hour}:${minute}`;
  } else {
    throw new Error("Event missing start date/dateTime");
  }

  // External events default to "other" type
  const type = "other";

  // Description (may be empty)
  const description = item.description || "";

  return {
    googleEventId,
    title,
    date,
    time,
    type,
    description,
  };
}

/**
 * Get default time minimum: 6 months ago
 */
function getDefaultTimeMin(): string {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  return sixMonthsAgo.toISOString();
}

/**
 * Get default time maximum: 6 months from now
 */
function getDefaultTimeMax(): string {
  const now = new Date();
  const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  return sixMonthsLater.toISOString();
}
