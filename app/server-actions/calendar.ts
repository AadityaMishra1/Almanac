"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SyllabusEventSchema, type SyllabusEvent } from "@/lib/events";
import { getCalendarClient } from "@/lib/google";

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function syncEventsToCalendar(events: SyllabusEvent[]): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = session?.accessToken;
    if (!accessToken) return { ok: false, error: "Not signed in (or missing Google access token)." };

    const parsed = events.map((e) => SyllabusEventSchema.safeParse(e));
    const firstInvalid = parsed.find((r) => !r.success);
    if (firstInvalid && !firstInvalid.success) {
      return { ok: false, error: "One or more events are invalid. Please fix the title/date/type fields." };
    }

    const calendar = getCalendarClient(accessToken);

    for (const parsedEvent of parsed) {
      const event = parsedEvent.success ? parsedEvent.data : null;
      if (!event) continue;
      const startDate = event.date;
      const endDate = addDays(event.date, 1);
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description: [event.type, event.description].filter(Boolean).join("\n\n"),
          start: { date: startDate },
          end: { date: endDate }
        }
      });
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Calendar insert failed." };
  }
}
