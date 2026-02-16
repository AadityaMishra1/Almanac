import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
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

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose prose-lg max-w-none">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
              {title}
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Legal content */}
          <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
            {children}
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--border)]">
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
        </footer>
      </main>
    </div>
  );
}
