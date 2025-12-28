"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCalendarClient } from "@/lib/google"
import { prisma } from "@/lib/prisma"

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getCourseColorId(hexColor: string): string {
  // Map hex colors to Google Calendar color IDs (1-11)
  const colorMap: Record<string, string> = {
    '#3b82f6': '9',  // Blue
    '#ef4444': '11', // Red
    '#10b981': '10', // Green
    '#f59e0b': '5',  // Orange
    '#8b5cf6': '3',  // Purple
    '#ec4899': '1',  // Lavender
    '#06b6d4': '7',  // Cyan
    '#84cc16': '2',  // Sage
    '#f97316': '6',  // Tangerine
    '#6366f1': '9',  // Indigo (blue)
  }
  return colorMap[hexColor.toLowerCase()] || '9'
}

export async function syncEventToCalendar(eventId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken
    if (!accessToken) return { ok: false, error: "Not signed in" }

    const event = await prisma.event.findFirst({
      where: { id: eventId, userId: session.userId },
      include: { course: true }
    })

    if (!event) return { ok: false, error: "Event not found" }

    const calendar = getCalendarClient(accessToken)

    const googleEvent = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.course ? `[${event.course.name}] ${event.title}` : event.title,
        description: [event.type, event.description].filter(Boolean).join("\n\n"),
        start: { date: event.startDate.toISOString().split('T')[0] },
        end: {
          date: event.endDate
            ? event.endDate.toISOString().split('T')[0]
            : addDays(event.startDate, 1).toISOString().split('T')[0]
        },
        colorId: getCourseColorId(event.course?.color || '#3b82f6')
      }
    })

    // Update event with Google Calendar ID
    await prisma.event.update({
      where: { id: eventId },
      data: { googleEventId: googleEvent.data.id }
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Calendar sync failed" }
  }
}

export async function syncAllCourseEvents(courseId: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session?.userId) {
      return { ok: false, error: "Not signed in" }
    }

    const events = await prisma.event.findMany({
      where: {
        courseId,
        userId: session.userId,
        googleEventId: null // Only sync events not yet synced
      },
      include: { course: true }
    })

    const calendar = getCalendarClient(session.accessToken)

    for (const event of events) {
      const googleEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.course ? `[${event.course.name}] ${event.title}` : event.title,
          description: [event.type, event.description].filter(Boolean).join("\n\n"),
          start: { date: event.startDate.toISOString().split('T')[0] },
          end: {
            date: event.endDate
              ? event.endDate.toISOString().split('T')[0]
              : addDays(event.startDate, 1).toISOString().split('T')[0]
          },
          colorId: getCourseColorId(event.course?.color || '#3b82f6')
        }
      })

      await prisma.event.update({
        where: { id: event.id },
        data: { googleEventId: googleEvent.data.id }
      })
    }

    return { ok: true, count: events.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" }
  }
}
