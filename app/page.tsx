import Link from "next/link";
import { SyllabusToCalendar } from "@/components/syllabus-to-calendar";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-20 sm:pt-28 pb-12 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl tracking-tight mb-3 opacity-0 animate-fade-in [animation-fill-mode:forwards]">
            Syllabus → Calendar
          </h1>

          <p
            className="text-base sm:text-lg text-[var(--text-secondary)] mb-4 max-w-md opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
            style={{ animationDelay: '100ms' }}
          >
            Drop your syllabus, we'll handle the rest. AI-powered calendar app
            for college students.
          </p>

          <div
            className="flex flex-wrap gap-2 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
            style={{ animationDelay: '200ms' }}
          >
            <span className="text-xs text-[var(--text-tertiary)] bg-surface-secondary rounded-full px-3 py-1">
              AI-powered extraction
            </span>
            <span className="text-xs text-[var(--text-tertiary)] bg-surface-secondary rounded-full px-3 py-1">
              Review before syncing
            </span>
            <span className="text-xs text-[var(--text-tertiary)] bg-surface-secondary rounded-full px-3 py-1">
              One-click Google Calendar sync
            </span>
          </div>
        </div>

        <SyllabusToCalendar />
      </main>

      {/* Legal Footer */}
      <footer className="mt-auto pt-12 pb-6 border-t border-[var(--border)]">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-[var(--text-tertiary)]">
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:knowl3dgehubemail@gmail.com"
                className="hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Contact
              </a>
            </div>
            <p>© 2026 Almanac</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
