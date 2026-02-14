'use client';

export function CalendarSkeleton() {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between border-b border-border-subtle py-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-9 h-9 bg-surface-secondary rounded-lg shimmer" />
            <div className="w-9 h-9 bg-surface-secondary rounded-lg shimmer" />
          </div>
          <div className="h-6 w-40 bg-surface-secondary rounded shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block h-9 w-56 bg-surface-secondary rounded-lg shimmer" />
          <div className="h-9 w-16 bg-surface-secondary rounded-lg shimmer" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border-subtle">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center border-r border-border-subtle last:border-r-0">
              <div className="h-3 w-8 bg-surface-secondary rounded shimmer mx-auto" />
            </div>
          ))}
        </div>

        {/* Day cells — 5 rows x 7 cols */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[100px] border-r border-b border-border-subtle p-2.5 bg-surface"
            >
              <div className="w-7 h-7 bg-surface-secondary rounded-full shimmer mb-2" />
              <div className="space-y-1.5">
                {i % 4 !== 3 && (
                  <div className="h-5 bg-surface-secondary rounded shimmer" />
                )}
                {i % 3 === 0 && (
                  <div className="h-5 bg-surface-secondary rounded shimmer" style={{ opacity: 0.5 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
