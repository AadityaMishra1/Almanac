import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center opacity-0 animate-fade-in [animation-fill-mode:forwards]">
        <p className="text-8xl font-display text-brand-600 mb-4">404</p>
        <h1 className="text-2xl tracking-tight text-[var(--text-primary)] mb-2">
          Page not found
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 hover:shadow-lg"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
