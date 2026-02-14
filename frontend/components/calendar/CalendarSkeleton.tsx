'use client';

export function CalendarSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="p-3 text-center"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[120px] border-r border-b border-gray-200 dark:border-gray-800 p-2"
            >
              {/* Date number shimmer */}
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 shimmer" />

              {/* Event placeholders */}
              {i % 3 === 0 && (
                <div className="space-y-1.5">
                  <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded shimmer" />
                  {i % 2 === 0 && (
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded shimmer" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
