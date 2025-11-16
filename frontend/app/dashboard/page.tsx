'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ModernCalendar from '@/components/ModernCalendar';
import { useNotificationStore } from '@/lib/store';
import { Upload, ArrowRight } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    // Show success message if redirected from OAuth
    if (searchParams?.get('calendar_connected') === 'true') {
      addNotification({
        message: 'Google Calendar connected successfully!',
        type: 'success',
      });
      // Remove query param from URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams, addNotification]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Notion Style */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your academic overview and calendar
          </p>
        </div>

        {/* Quick Actions - Notion Style */}
        <div className="mb-8">
          <Link
            href="/upload"
            className="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center gap-3 max-w-md"
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white mb-0.5">Upload Syllabus</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Add assignments from PDF</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </Link>
        </div>

        {/* Calendar - Full Width */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <ModernCalendar />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
