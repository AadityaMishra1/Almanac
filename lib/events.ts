import { z } from "zod";

export const SyllabusEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional().default("")
});

export type SyllabusEvent = z.infer<typeof SyllabusEventSchema>;

const SyllabusEventsResponseSchema = z.array(SyllabusEventSchema);

function coerceToIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const currentYear = new Date().getFullYear();
  const pad = (num: number) => String(num).padStart(2, "0");

  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    let year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (year < currentYear) year = currentYear;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const monthDayMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    return `${currentYear}-${pad(month)}-${pad(day)}`;
  }

  const hasYear = /\b(19|20)\d{2}\b/.test(trimmed);
  const candidate = hasYear ? trimmed : `${trimmed} ${currentYear}`;
  const maybeDate = new Date(candidate);
  if (Number.isNaN(maybeDate.getTime())) return trimmed;

  let year = hasYear ? maybeDate.getFullYear() : currentYear;
  if (year < currentYear) year = currentYear;
  const month = maybeDate.getMonth() + 1;
  const day = maybeDate.getDate();
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeAndValidateEvents(input: unknown): SyllabusEvent[] {
  const result = SyllabusEventsResponseSchema.safeParse(input);
  if (result.success) {
    return result.data.map((event) => ({ ...event, date: coerceToIsoDate(event.date) }));
  }

  if (typeof input === "object" && input && "events" in input) {
    const maybeEvents = (input as any).events;
    const nested = SyllabusEventsResponseSchema.safeParse(maybeEvents);
    if (nested.success) {
      return nested.data.map((event) => ({ ...event, date: coerceToIsoDate(event.date) }));
    }
  }

  throw new Error("AI response was not a valid events array.");
}
