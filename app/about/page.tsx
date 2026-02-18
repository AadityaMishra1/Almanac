import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-6">
          About
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
          Made by a comp eng student who built this instead of applying to
          internships, and now needs an internship. If you know anyone hiring,
          please refer me. I&apos;d appreciate not being unemployed.
        </p>
        <p className="mt-8 text-sm text-[var(--text-tertiary)]">
          I can't be unemployed no mo. im a great coder.
        </p>
      </main>
    </div>
  );
}
