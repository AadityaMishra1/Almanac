"use client"

import { Badge } from "@/components/ui/badge"
import { getEventColor } from "@/lib/event-colors"
import { Clock, AlertCircle } from "lucide-react"

interface UpcomingEvent {
  id: string
  title: string
  type: string
  startDate: string
  course: {
    name: string
    color: string
  } | null
  priority: number
  daysUntil: number
}

interface UpcomingDeadlinesProps {
  events: UpcomingEvent[]
  onEventClick?: (eventId: string) => void
}

export function UpcomingDeadlines({ events, onEventClick }: UpcomingDeadlinesProps) {
  if (events.length === 0) {
    return (
      <div className="border rounded-xl p-6 text-center bg-zinc-50">
        <p className="text-zinc-500">No upcoming deadlines</p>
        <p className="text-sm text-zinc-400 mt-1">You're all caught up!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const eventColor = getEventColor(event.type, event.course?.color || '#6b7280')
        const isUrgent = event.daysUntil <= 2

        return (
          <button
            key={event.id}
            onClick={() => onEventClick?.(event.id)}
            className="w-full text-left p-4 border rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-3 h-3 rounded-full mt-1.5"
                style={{ backgroundColor: eventColor.bg }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{event.title}</h3>
                  {isUrgent && (
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-zinc-600 mb-2">
                  {event.course?.name || 'No Course'}
                </p>

                <div className="flex items-center gap-2">
                  <Badge
                    className="rounded-md"
                    style={{
                      backgroundColor: eventColor.bg,
                      color: eventColor.text,
                      borderColor: eventColor.border
                    }}
                  >
                    {event.type}
                  </Badge>

                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {event.daysUntil === 0 ? (
                      <span className="text-red-600 font-medium">Today</span>
                    ) : event.daysUntil === 1 ? (
                      <span className="text-orange-600 font-medium">Tomorrow</span>
                    ) : (
                      <span>
                        {event.daysUntil} days
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
