import { getEvents } from "@/app/server-actions/events";
import { getCourses } from "@/app/server-actions/courses";
import { CalendarView } from "@/components/calendar/calendar-view";
import Link from "next/link";
import { Upload } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CalendarPage() {
  const [eventsResult, coursesResult, session] = await Promise.all([
    getEvents(),
    getCourses(),
    getServerSession(authOptions),
  ]);

  // Check if user has Google auth
  const hasGoogleAuth = !!(session?.accessToken);

  if (!eventsResult.ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 p-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <Upload className="h-4 w-4" />
            Upload Syllabus
          </Link>
        </header>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Error loading events: {eventsResult.error}
        </div>
      </main>
    );
  }

  if (!coursesResult.ok) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 p-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <Upload className="h-4 w-4" />
            Upload Syllabus
          </Link>
        </header>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Error loading courses: {coursesResult.error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-600">
            View and manage your academic events
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 min-h-[44px]"
        >
          <Upload className="h-4 w-4" />
          Upload Syllabus
        </Link>
      </header>

      <CalendarView
        events={eventsResult.events}
        courses={coursesResult.courses}
        hasGoogleAuth={hasGoogleAuth}
      />
    </main>
  );
}
