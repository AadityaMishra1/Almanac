import { AuthButton } from "@/components/auth-button";
import { SyllabusToCalendar } from "@/components/syllabus-to-calendar";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Syllabus → Google Calendar</h1>
          <p className="text-sm text-zinc-600">
            Upload a PDF syllabus, review extracted due dates, then sync to your calendar.
          </p>
        </div>
        <AuthButton />
      </header>

      <SyllabusToCalendar />
    </main>
  );
}
