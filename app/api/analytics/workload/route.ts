import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfWeek, endOfWeek, eachWeekOfInterval, format, addDays } from "date-fns"

// Estimated hours by event type
const EVENT_HOUR_ESTIMATES: Record<string, number> = {
  'Exam': 12,
  'Midterm': 12,
  'Final': 20,
  'Project': 20,
  'Assignment': 5,
  'Homework': 4,
  'Quiz': 2,
  'Lab': 3,
  'Presentation': 8,
  'Other': 3
}

function getEstimatedHours(eventType: string): number {
  return EVENT_HOUR_ESTIMATES[eventType] || EVENT_HOUR_ESTIMATES['Other']
}

function getSeverity(hours: number): 'light' | 'moderate' | 'heavy' | 'critical' {
  if (hours < 15) return 'light'
  if (hours < 25) return 'moderate'
  if (hours < 35) return 'heavy'
  return 'critical'
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Default to next 6 weeks if no dates provided
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date()
    const endDate = endDateParam
      ? new Date(endDateParam)
      : addDays(new Date(), 42) // 6 weeks

    // Fetch all events in date range
    const events = await prisma.event.findMany({
      where: {
        userId: session.userId,
        startDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        course: {
          select: { name: true, color: true }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    // Generate week buckets
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate })

    // Aggregate events by week
    const weeklyData = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart)

      const weekEvents = events.filter(event => {
        const eventDate = new Date(event.startDate)
        return eventDate >= weekStart && eventDate <= weekEnd
      })

      // Count by type
      const eventsByType: Record<string, number> = {}
      let totalHours = 0

      weekEvents.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
        totalHours += getEstimatedHours(event.type)
      })

      const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel,
        totalEvents: weekEvents.length,
        eventsByType,
        estimatedHours: totalHours,
        severity: getSeverity(totalHours),
        events: weekEvents.map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          startDate: e.startDate.toISOString(),
          courseName: e.course?.name || 'No Course',
          courseColor: e.course?.color || '#6b7280'
        }))
      }
    })

    return NextResponse.json({
      weeks: weeklyData,
      summary: {
        totalEvents: events.length,
        totalEstimatedHours: weeklyData.reduce((sum, week) => sum + week.estimatedHours, 0),
        busiestWeek: weeklyData.reduce((max, week) =>
          week.estimatedHours > max.estimatedHours ? week : max
        , weeklyData[0] || { estimatedHours: 0, weekLabel: 'N/A' })
      }
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch workload data" },
      { status: 500 }
    )
  }
}
