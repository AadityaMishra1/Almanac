'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ModernCalendar from '@/components/ModernCalendar';
import { useNotificationStore } from '@/lib/store';
import { Upload } from 'lucide-react';
import { format } from 'date-fns';

function DashboardContent() {
  const searchParams = useSearchParams();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (searchParams?.get('calendar_connected') === 'true') {
      addNotification({
        message: 'Google Calendar connected successfully!',
        type: 'success',
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams, addNotification]);

  const today = new Date();
  const dayName = format(today, 'EEEE');
  const dateDisplay = format(today, 'MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-surface flex flex-col animate-fade-in-up">
      {/* Toolbar — Cal.com inspired minimal top bar */}
      <div className="border-b border-border-subtle bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Date display — extreme typography contrast */}
          <div className="flex flex-col">
            <div className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {dayName}
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {dateDisplay}
            </div>
          </div>

          {/* Upload action — brand accent */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg
              bg-brand-500 text-white font-semibold text-sm
              hover:bg-brand-600 active:bg-brand-700
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
              transition-colors duration-150
              shadow-sm hover:shadow-md
              min-h-[44px]"
          >
            <Upload className="w-4 h-4 group-hover:scale-110 transition-transform duration-150" />
            <span className="hidden sm:inline">Upload Syllabus</span>
            <span className="sm:hidden">Upload</span>
          </Link>
        </div>
      </div>

      {/* Calendar — full width, calendar-first */}
      <div
        className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        style={{ animationDelay: '100ms' }}
      >
        <ModernCalendar />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Toolbar skeleton */}
      <div className="border-b border-border-subtle bg-surface">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-16 bg-surface-secondary rounded shimmer" />
            <div className="h-7 w-40 bg-surface-secondary rounded shimmer" />
          </div>
          <div className="h-10 w-32 sm:w-40 bg-surface-secondary rounded-lg shimmer" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 bg-surface-secondary rounded-lg shimmer" />
            <div className="h-10 w-20 bg-surface-secondary rounded-lg shimmer" />
          </div>
          <div className="h-10 w-48 bg-surface-secondary rounded-lg shimmer" />
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border-subtle">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="p-3 border-r border-border-subtle last:border-r-0">
                <div className="h-4 w-8 bg-surface-secondary rounded shimmer mx-auto" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {[...Array(35)].map((_, i) => (
              <div
                key={i}
                className="min-h-[100px] border-r border-b border-border-subtle p-3 bg-surface"
              >
                <div className="h-7 w-7 bg-surface-secondary rounded-full shimmer mb-3" />
                <div className="space-y-2">
                  <div className="h-5 bg-surface-secondary rounded shimmer" />
                  {i % 3 === 0 && (
                    <div className="h-5 bg-surface-secondary rounded shimmer" style={{ opacity: 0.6 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
