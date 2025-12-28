import { prisma } from "@/lib/prisma"
import { format, parse, addDays, addWeeks, parseISO } from "date-fns"

// Tool definitions for Groq function calling
export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a new calendar event (assignment, exam, meeting, study session, etc.)",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title (e.g., 'Physics Lab', 'Study for Math Exam')"
          },
          type: {
            type: "string",
            description: "Event type: Assignment, Exam, Quiz, Lab, Meeting, Study Session, Other",
            enum: ["Assignment", "Exam", "Quiz", "Lab", "Meeting", "Study Session", "Other"]
          },
          courseId: {
            type: "string",
            description: "Course ID if event is related to a specific course"
          },
          startDate: {
            type: "string",
            description: "Start date and time in ISO format (YYYY-MM-DDTHH:mm:ss)"
          },
          endDate: {
            type: "string",
            description: "End date and time in ISO format (optional)"
          },
          description: {
            type: "string",
            description: "Additional details about the event"
          },
          recurring: {
            type: "string",
            description: "Recurrence pattern: 'weekly', 'biweekly', 'monthly', or null",
            enum: ["weekly", "biweekly", "monthly", "none"]
          },
          recurrenceCount: {
            type: "number",
            description: "Number of times to repeat (for recurring events)"
          }
        },
        required: ["title", "type", "startDate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Update an existing calendar event (reschedule, rename, change course)",
      parameters: {
        type: "object",
        properties: {
          searchQuery: {
            type: "string",
            description: "Search query to find the event (title keywords, course name, date)"
          },
          updates: {
            type: "object",
            description: "Fields to update",
            properties: {
              title: { type: "string" },
              type: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              description: { type: "string" }
            }
          }
        },
        required: ["searchQuery", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Delete calendar event(s)",
      parameters: {
        type: "object",
        properties: {
          searchQuery: {
            type: "string",
            description: "Search query to find events to delete"
          },
          confirmAll: {
            type: "boolean",
            description: "If true, delete all matching events. If false, ask for confirmation."
          }
        },
        required: ["searchQuery"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_events",
      description: "Search and analyze calendar events",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords (course name, event type, title)"
          },
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string", description: "Start date (ISO format)" },
              end: { type: "string", description: "End date (ISO format)" }
            }
          },
          eventType: {
            type: "string",
            description: "Filter by event type"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_schedule",
      description: "Analyze user's schedule for conflicts, busy periods, free time",
      parameters: {
        type: "object",
        properties: {
          analysisType: {
            type: "string",
            description: "Type of analysis: 'conflicts', 'busiest_day', 'free_time', 'workload'",
            enum: ["conflicts", "busiest_day", "free_time", "workload"]
          },
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string" },
              end: { type: "string" }
            }
          }
        },
        required: ["analysisType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_study_plan",
      description: "Generate study plan and preparation timeline for exam or assignment",
      parameters: {
        type: "object",
        properties: {
          eventQuery: {
            type: "string",
            description: "Description of the exam/assignment to prepare for"
          },
          daysToStudy: {
            type: "number",
            description: "Number of days to allocate for studying"
          }
        },
        required: ["eventQuery"]
      }
    }
  }
]

// Function implementations
export async function createEvent(userId: string, params: any) {
  const { title, type, courseId, startDate, endDate, description, recurring, recurrenceCount } = params

  const events = []
  const baseEvent: any = {
    title,
    type,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    description,
    userId,
    source: 'MANUAL' as const
  }

  // Only add courseId if it's provided
  if (courseId) {
    baseEvent.courseId = courseId
  }

  if (recurring && recurring !== 'none' && recurrenceCount) {
    // Create recurring events
    for (let i = 0; i < recurrenceCount; i++) {
      const offset = recurring === 'weekly' ? i * 7 : recurring === 'biweekly' ? i * 14 : i * 30
      events.push({
        ...baseEvent,
        startDate: addDays(new Date(startDate), offset),
        endDate: endDate ? addDays(new Date(endDate), offset) : null
      })
    }
  } else {
    events.push(baseEvent)
  }

  const created = await prisma.event.createMany({ data: events })

  return {
    success: true,
    message: `Created ${created.count} event(s): ${title}`,
    count: created.count
  }
}

export async function updateEvent(userId: string, params: any) {
  const { searchQuery, updates } = params

  // Search for matching events
  const events = await prisma.event.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { course: { name: { contains: searchQuery, mode: 'insensitive' } } }
      ]
    },
    include: { course: true }
  })

  if (events.length === 0) {
    return { success: false, message: `No events found matching "${searchQuery}"` }
  }

  if (events.length > 1) {
    return {
      success: false,
      message: `Found ${events.length} events matching "${searchQuery}". Please be more specific.`,
      matches: events.map(e => ({ id: e.id, title: e.title, date: e.startDate }))
    }
  }

  const event = events[0]
  const updateData: any = {}

  if (updates.title) updateData.title = updates.title
  if (updates.type) updateData.type = updates.type
  if (updates.startDate) updateData.startDate = new Date(updates.startDate)
  if (updates.endDate) updateData.endDate = new Date(updates.endDate)
  if (updates.description) updateData.description = updates.description

  await prisma.event.update({
    where: { id: event.id },
    data: updateData
  })

  return {
    success: true,
    message: `Updated "${event.title}"`,
    event: { id: event.id, title: event.title }
  }
}

export async function deleteEvent(userId: string, params: any) {
  const { searchQuery, confirmAll } = params

  const events = await prisma.event.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { course: { name: { contains: searchQuery, mode: 'insensitive' } } }
      ]
    },
    include: { course: true }
  })

  if (events.length === 0) {
    return { success: false, message: `No events found matching "${searchQuery}"` }
  }

  if (events.length > 1 && !confirmAll) {
    return {
      success: false,
      needsConfirmation: true,
      message: `Found ${events.length} events. Please confirm deletion.`,
      matches: events.map(e => ({ id: e.id, title: e.title, date: e.startDate }))
    }
  }

  const deleted = await prisma.event.deleteMany({
    where: {
      id: { in: events.map(e => e.id) }
    }
  })

  return {
    success: true,
    message: `Deleted ${deleted.count} event(s)`,
    count: deleted.count
  }
}

export async function searchEvents(userId: string, params: any) {
  const { query, dateRange, eventType } = params

  const where: any = { userId }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { course: { name: { contains: query, mode: 'insensitive' } } }
    ]
  }

  if (dateRange) {
    where.startDate = {
      gte: new Date(dateRange.start),
      lte: new Date(dateRange.end)
    }
  }

  if (eventType) {
    where.type = eventType
  }

  const events = await prisma.event.findMany({
    where,
    include: { course: true },
    orderBy: { startDate: 'asc' },
    take: 20
  })

  return {
    success: true,
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      course: e.course.name,
      date: format(e.startDate, 'MMM d, yyyy h:mm a'),
      description: e.description
    }))
  }
}

export async function analyzeSchedule(userId: string, params: any) {
  const { analysisType, dateRange } = params

  const start = dateRange?.start ? new Date(dateRange.start) : new Date()
  const end = dateRange?.end ? new Date(dateRange.end) : addWeeks(start, 2)

  const events = await prisma.event.findMany({
    where: {
      userId,
      startDate: { gte: start, lte: end }
    },
    include: { course: true },
    orderBy: { startDate: 'asc' }
  })

  switch (analysisType) {
    case 'conflicts': {
      const conflicts = []
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const e1 = events[i]
          const e2 = events[j]
          const sameDay = format(e1.startDate, 'yyyy-MM-dd') === format(e2.startDate, 'yyyy-MM-dd')
          if (sameDay) {
            conflicts.push({ event1: e1.title, event2: e2.title, date: format(e1.startDate, 'MMM d') })
          }
        }
      }
      return { success: true, conflicts, message: conflicts.length ? `Found ${conflicts.length} potential conflicts` : 'No conflicts found' }
    }

    case 'busiest_day': {
      const dayCount: any = {}
      events.forEach(e => {
        const day = format(e.startDate, 'yyyy-MM-dd')
        dayCount[day] = (dayCount[day] || 0) + 1
      })
      const busiest = Object.entries(dayCount).sort((a: any, b: any) => b[1] - a[1])[0]
      return {
        success: true,
        busiestDay: busiest ? format(new Date(busiest[0]), 'EEEE, MMM d') : 'No events',
        eventCount: busiest ? busiest[1] : 0
      }
    }

    case 'workload': {
      const totalEvents = events.length
      const exams = events.filter(e => e.type === 'Exam' || e.type === 'Midterm').length
      const assignments = events.filter(e => e.type === 'Assignment' || e.type === 'Homework').length
      return {
        success: true,
        totalEvents,
        exams,
        assignments,
        message: `You have ${totalEvents} events: ${exams} exams and ${assignments} assignments`
      }
    }

    default:
      return { success: false, message: 'Unknown analysis type' }
  }
}

export async function suggestStudyPlan(userId: string, params: any) {
  const { eventQuery, daysToStudy = 7 } = params

  // Find the target event
  const event = await prisma.event.findFirst({
    where: {
      userId,
      OR: [
        { title: { contains: eventQuery, mode: 'insensitive' } },
        { description: { contains: eventQuery, mode: 'insensitive' } }
      ]
    },
    include: { course: true }
  })

  if (!event) {
    return { success: false, message: `Could not find event matching "${eventQuery}"` }
  }

  const hoursNeeded = event.type === 'Exam' || event.type === 'Midterm' ? 12 : event.type === 'Final' ? 20 : 6
  const hoursPerDay = Math.ceil(hoursNeeded / daysToStudy)

  const plan = []
  for (let i = 0; i < daysToStudy; i++) {
    const day = addDays(new Date(), i)
    plan.push({
      date: format(day, 'EEEE, MMM d'),
      hours: hoursPerDay,
      focus: i < daysToStudy / 2 ? 'Review notes and concepts' : 'Practice problems and review'
    })
  }

  return {
    success: true,
    event: event.title,
    course: event.course.name,
    totalHours: hoursNeeded,
    dailyHours: hoursPerDay,
    plan,
    message: `Study plan for ${event.title}: ${hoursPerDay}h/day for ${daysToStudy} days`
  }
}
