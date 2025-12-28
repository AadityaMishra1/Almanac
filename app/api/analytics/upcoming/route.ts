import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addDays } from "date-fns"

// Priority ranking for event types
const EVENT_PRIORITY: Record<string, number> = {
  'Final': 5,
  'Exam': 4,
  'Midterm': 4,
  'Project': 3,
  'Assignment': 2,
  'Homework': 2,
  'Quiz': 1,
  'Lab': 1,
  'Presentation': 3,
  'Other': 0
}

function getPriority(eventType: string): number {
  return EVENT_PRIORITY[eventType] || EVENT_PRIORITY['Other']
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get("days")
    const days = daysParam ? parseInt(daysParam) : 14 // Default to 2 weeks

    const now = new Date()
    const futureDate = addDays(now, days)

    // Fetch upcoming events
    const events = await prisma.event.findMany({
      where: {
        userId: session.userId,
        startDate: {
          gte: now,
          lte: futureDate
        }
      },
      include: {
        course: {
          select: { name: true, color: true }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    // Enrich events with priority and days until
    const enrichedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      type: event.type,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() || null,
      description: event.description,
      course: event.course ? {
        name: event.course.name,
        color: event.course.color
      } : null,
      priority: getPriority(event.type),
      daysUntil: getDaysUntil(event.startDate)
    }))

    // Sort by priority (high to low) then by date (soon to late)
    enrichedEvents.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.daysUntil - b.daysUntil
    })

    // Categorize by urgency
    const urgent = enrichedEvents.filter(e => e.daysUntil <= 2 && e.priority >= 2)
    const soon = enrichedEvents.filter(e => e.daysUntil <= 7 && e.daysUntil > 2)
    const later = enrichedEvents.filter(e => e.daysUntil > 7)

    return NextResponse.json({
      all: enrichedEvents,
      urgent,
      soon,
      later,
      summary: {
        total: events.length,
        urgentCount: urgent.length,
        soonCount: soon.length,
        laterCount: later.length
      }
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch upcoming events" },
      { status: 500 }
    )
  }
}
