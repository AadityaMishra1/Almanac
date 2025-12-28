"use client"

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg, EventInput } from '@fullcalendar/core'

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end?: Date | null
  backgroundColor: string
  borderColor: string
  extendedProps: {
    type: string
    description?: string | null
    courseId: string | null
    courseName: string
  }
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick: (eventId: string) => void
  onDateClick?: (date: Date) => void
  view: 'week' | 'month'
}

export function CalendarView({ events, onEventClick, onDateClick, view }: CalendarViewProps) {
  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.id)
  }

  const handleDateClick = (info: any) => {
    if (onDateClick) {
      onDateClick(info.date)
    }
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-sm p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view === 'week' ? 'timeGridWeek' : 'dayGridMonth'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="100%"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
      />
    </div>
  )
}
