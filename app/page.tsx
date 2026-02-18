"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { SyllabusToCalendar } from "@/components/syllabus-to-calendar";

export default function Page() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-20 sm:pt-28 pb-12 flex-1">
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl tracking-tight mb-3 opacity-0 animate-fade-in [animation-fill-mode:forwards]">
              Syllabus &rarr; Calendar
            </h1>

            <p
              className="text-base sm:text-lg text-[var(--text-secondary)] mb-4 max-w-md opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
              style={{ animationDelay: "100ms" }}
            >
              Drop your syllabus, we&apos;ll handle the rest. AI-powered calendar app
              for college students.
            </p>

            <div
              className="flex flex-wrap gap-2 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
              style={{ animationDelay: "200ms" }}
            >
              <span className="text-xs text-[var(--text-tertiary)] bg-surface-secondary rounded-full px-3 py-1">
                Reads any syllabus PDF
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
                  href="mailto:almanac123@googlegroups.com"
                  className="hover:text-[var(--text-primary)] transition-colors duration-150"
                >
                  Contact
                </a>
              </div>
              <p>&copy; 2026 Almanac</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Unauthenticated landing page
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-lg text-center opacity-0 animate-fade-in [animation-fill-mode:forwards]">
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-[var(--text-primary)] mb-4">
            Never miss
            <br />
            another deadline.
          </h1>

          <p
            className="text-lg text-[var(--text-secondary)] max-w-md mx-auto mb-8 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
            style={{ animationDelay: "100ms" }}
          >
            Drop your syllabus. Every exam, assignment, and due date
            lands on your Google Calendar in seconds.
          </p>

          <div
            className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards]"
            style={{ animationDelay: "200ms" }}
          >
            <button
              onClick={() => signIn("google")}
              className="rounded-xl bg-brand-600 px-6 py-3 text-base font-medium text-white transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 hover:shadow-lg"
            >
              Get started
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-[var(--border)]">
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
                href="mailto:almanac123@googlegroups.com"
                className="hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Contact
              </a>
            </div>
            <p>&copy; 2026 Almanac</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
