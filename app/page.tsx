"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth-button"
import { CourseSidebar } from "@/components/course-sidebar"
import { CourseFormDialog } from "@/components/course-form-dialog"
import { SyllabusUploadDialog } from "@/components/syllabus-upload-dialog"
import { CalendarView } from "@/components/calendar-view"
import { EventDrawer } from "@/components/event-drawer"
import { WorkloadHeatmap } from "@/components/analytics/workload-heatmap"
import { UpcomingDeadlines } from "@/components/analytics/upcoming-deadlines"
import { StatsCards } from "@/components/analytics/stats-cards"
import { ChatBubble } from "@/components/ai-chat/chat-bubble"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, List, BarChart3 } from "lucide-react"
import { syncEventToCalendar } from "@/app/server-actions/calendar"
import { getEventColor } from "@/lib/event-colors"

type ViewMode = 'calendar' | 'list' | 'analytics'
type CalendarViewType = 'week' | 'month'

interface Course {
  id: string
  name: string
  term?: string | null
  color: string
  _count?: { events: number }
}

interface Event {
  id: string
  title: string
  type: string
  startDate: string
  endDate?: string | null
  description?: string | null
  source: 'PDF' | 'MANUAL'
  courseId: string | null
  course: {
    id: string
    name: string
    color: string
  } | null
}

export default function Page() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [calendarView, setCalendarView] = useState<CalendarViewType>('week')
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadCourseId, setUploadCourseId] = useState<string>('')
  const [uploadCourseName, setUploadCourseName] = useState<string>('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workloadData, setWorkloadData] = useState<any>(null)
  const [upcomingData, setUpcomingData] = useState<any>(null)

  // Fetch courses and events
  useEffect(() => {
    if (session?.userId) {
      fetchCourses()
      fetchEvents()
      fetchAnalyticsData()
    }
  }, [session?.userId])

  async function fetchCourses() {
    const res = await fetch('/api/courses')
    const data = await res.json()
    setCourses(data.courses || [])
  }

  async function fetchEvents() {
    const url = selectedCourseId
      ? `/api/events?courseId=${selectedCourseId}`
      : '/api/events'
    const res = await fetch(url)
    const data = await res.json()
    setEvents(data.events || [])
    setIsLoading(false)
  }

  // Refetch events when selected course changes
  useEffect(() => {
    if (session?.userId) {
      fetchEvents()
    }
  }, [selectedCourseId, session?.userId])

  // Listen for AI-triggered calendar updates
  useEffect(() => {
    const handleAIUpdate = () => {
      fetchEvents()
      fetchCourses()
      fetchAnalyticsData()
    }

    window.addEventListener('ai-calendar-update', handleAIUpdate)
    return () => window.removeEventListener('ai-calendar-update', handleAIUpdate)
  }, [])

  async function handleCreateCourse(data: { name: string; term?: string; color: string }) {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      await fetchCourses()
    }
  }

  async function handleUpdateEvent(eventId: string, data: any) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      await fetchEvents()
    }
  }

  async function handleDeleteEvent(eventId: string) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      await fetchEvents()
    }
  }

  async function handleSyncEvent(eventId: string) {
    const result = await syncEventToCalendar(eventId)
    if (result.ok) {
      await fetchEvents() // Refresh to show updated googleEventId
      alert('Event synced to Google Calendar successfully!')
    } else {
      alert(`Failed to sync: ${result.error}`)
    }
  }

  function handleUploadSyllabus(courseId: string, courseName: string) {
    setUploadCourseId(courseId)
    setUploadCourseName(courseName)
    setUploadDialogOpen(true)
  }

  function handleUploadComplete() {
    fetchEvents()
    fetchCourses()
    fetchAnalyticsData()
  }

  async function fetchAnalyticsData() {
    try {
      const [workloadRes, upcomingRes] = await Promise.all([
        fetch('/api/analytics/workload'),
        fetch('/api/analytics/upcoming?days=14')
      ])

      const workload = await workloadRes.json()
      const upcoming = await upcomingRes.json()

      setWorkloadData(workload)
      setUpcomingData(upcoming)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  // Show all events on calendar, but filter list view
  const listViewEvents = selectedCourseId
    ? events.filter((e) => e.courseId === selectedCourseId)
    : events

  const calendarEvents = events.map((event) => {
    const eventColor = getEventColor(event.type, event.course?.color || '#6b7280')
    return {
      id: event.id,
      title: event.course ? `${event.course.name}: ${event.title}` : event.title,
      start: new Date(event.startDate),
      end: event.endDate ? new Date(event.endDate) : undefined,
      backgroundColor: eventColor.bg,
      borderColor: eventColor.border,
      textColor: eventColor.text,
      extendedProps: {
        type: event.type,
        description: event.description,
        courseId: event.courseId,
        courseName: event.course?.name || 'No Course',
        courseColor: event.course?.color || '#6b7280'
      }
    }
  })

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const selectedEventWithDateObjects = selectedEvent ? {
    ...selectedEvent,
    startDate: new Date(selectedEvent.startDate),
    endDate: selectedEvent.endDate ? new Date(selectedEvent.endDate) : null
  } : null

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Almanac</h1>
          <p className="text-zinc-600">Your academic calendar assistant</p>
          <AuthButton />
        </div>
      </main>
    )
  }

  return (
    <main className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Almanac</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg"
              onClick={() => setViewMode('analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Main Layout: Sidebar + Calendar + Drawer */}
      <div className="flex flex-1 overflow-hidden">
        <CourseSidebar
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={setSelectedCourseId}
          onAddCourse={() => setCourseDialogOpen(true)}
          onUploadSyllabus={handleUploadSyllabus}
        />

        <div className="flex-1 p-6 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">Loading...</p>
            </div>
          ) : viewMode === 'calendar' ? (
            <CalendarView
              events={calendarEvents}
              onEventClick={setSelectedEventId}
              view={calendarView}
            />
          ) : viewMode === 'analytics' ? (
            <div className="space-y-6">
              {/* Stats Cards */}
              {workloadData && upcomingData && (
                <StatsCards
                  totalEventsThisWeek={workloadData.weeks[0]?.totalEvents || 0}
                  upcomingExams={upcomingData.all.filter((e: any) => e.type === 'Exam' || e.type === 'Midterm' || e.type === 'Final').length}
                  busiestWeek={workloadData.summary.busiestWeek.weekLabel || 'N/A'}
                  totalEstimatedHours={workloadData.summary.totalEstimatedHours || 0}
                />
              )}

              {/* Workload Heatmap */}
              {workloadData && (
                <div className="bg-white border rounded-xl p-6">
                  <WorkloadHeatmap data={workloadData.weeks} />
                </div>
              )}

              {/* Upcoming Deadlines */}
              {upcomingData && (
                <div className="bg-white border rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
                  <UpcomingDeadlines
                    events={upcomingData.urgent.concat(upcomingData.soon)}
                    onEventClick={setSelectedEventId}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {listViewEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500">No events yet</p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Create a course and upload a syllabus to get started
                  </p>
                </div>
              ) : (
                listViewEvents.map((event) => {
                  const eventColor = getEventColor(event.type, event.course?.color || '#6b7280')
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full text-left p-4 border rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: eventColor.bg }}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-zinc-600">
                            {event.course?.name || 'No Course'} • {new Date(event.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge style={{ backgroundColor: eventColor.bg, color: eventColor.text, borderColor: eventColor.border }}>{event.type}</Badge>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CourseFormDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        onSubmit={handleCreateCourse}
      />

      <SyllabusUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        courseId={uploadCourseId}
        courseName={uploadCourseName}
        onUploadComplete={handleUploadComplete}
      />

      <EventDrawer
        event={selectedEventWithDateObjects}
        open={!!selectedEventId}
        onOpenChange={(open) => !open && setSelectedEventId(null)}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onSync={handleSyncEvent}
      />

      <ChatBubble />
    </main>
  )
}
