'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ModernCalendar from '@/components/ModernCalendar';
import { CreateEventModal } from '@/components/create-event-modal';
import { useNotificationStore, useChatStore } from '@/lib/store';
import { Upload, Plus, GraduationCap, Trash2, ChevronDown, X, CalendarSync, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getCourses, deleteCourse } from '@/app/server-actions/courses';
import { syncEventsToCalendar, getUnsyncedEventIds } from '@/app/server-actions/calendar';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import type { Course } from '@prisma/client';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const searchParams = useSearchParams();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const calendarVersion = useChatStore((s) => s.calendarVersion);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [deleteTargetCourse, setDeleteTargetCourse] = useState<Course | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [createEventDate, setCreateEventDate] = useState<string | undefined>();
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadUnsyncedCount = useCallback(async () => {
    const result = await getUnsyncedEventIds();
    if (result.ok) setUnsyncedCount(result.count);
  }, []);

  const handleEventCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
    loadUnsyncedCount();
  }, [loadUnsyncedCount]);

  const loadCourses = useCallback(async () => {
    const result = await getCourses();
    if (result.ok) {
      setCourses(result.courses);
    }
  }, []);

  useEffect(() => { loadCourses(); loadUnsyncedCount(); }, [loadCourses, loadUnsyncedCount]);

  // Refresh calendar when chat actions modify events
  const lastProcessedVersion = useRef(0);
  useEffect(() => {
    if (calendarVersion > lastProcessedVersion.current) {
      lastProcessedVersion.current = calendarVersion;
      setRefreshKey((k) => k + 1);
      loadUnsyncedCount();
    }
  }, [calendarVersion, loadUnsyncedCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCoursesOpen(false);
      }
    }
    if (coursesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [coursesOpen]);

  async function handleDeleteCourse() {
    if (!deleteTargetCourse) return;
    setIsDeletingCourse(true);
    try {
      const result = await deleteCourse(deleteTargetCourse.id);
      if (!result.ok) {
        addNotification({ message: result.error, type: 'error' });
        return;
      }
      let message: string;
      if (result.eventsRemoved === 0) {
        message = `Deleted ${deleteTargetCourse.name}`;
      } else if (result.googleRemoved > 0 && result.googleFailed === 0) {
        message = `Deleted ${deleteTargetCourse.name} — removed ${result.googleRemoved} event${result.googleRemoved !== 1 ? 's' : ''} from Google Calendar`;
      } else if (result.googleRemoved > 0 && result.googleFailed > 0) {
        message = `Deleted ${deleteTargetCourse.name} — ${result.googleRemoved} event${result.googleRemoved !== 1 ? 's' : ''} removed, ${result.googleFailed} failed to remove from Google Calendar`;
      } else {
        message = `Deleted ${deleteTargetCourse.name} and all its events`;
      }
      addNotification({
        message,
        type: result.googleFailed > 0 ? 'warning' : 'success',
      });
      await loadCourses();
      setRefreshKey((k) => k + 1);
    } catch {
      addNotification({ message: 'Failed to delete course', type: 'error' });
    } finally {
      setIsDeletingCourse(false);
      setDeleteTargetCourse(null);
    }
  }

  const handleCreateEventForDate = useCallback((date: Date) => {
    setCreateEventDate(format(date, 'yyyy-MM-dd'));
    setShowCreateEvent(true);
  }, []);

  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const idsResult = await getUnsyncedEventIds();
      if (!idsResult.ok) {
        addNotification({ message: idsResult.error, type: 'error' });
        return;
      }
      if (idsResult.count === 0) return;

      const syncResult = await syncEventsToCalendar(idsResult.eventIds);
      if (!syncResult.ok) {
        addNotification({ message: syncResult.error, type: 'error' });
        return;
      }
      addNotification({
        message: `Synced ${idsResult.count} event${idsResult.count !== 1 ? 's' : ''} to Google Calendar`,
        type: 'success',
      });
      setUnsyncedCount(0);
    } catch {
      addNotification({ message: 'Sync failed. Please try again.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }, [addNotification]);

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
          {/* Left group — New Event CTA + date display */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateEvent(true)}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-brand-500 text-white font-semibold text-sm
                hover:bg-brand-600 active:bg-brand-700
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                transition-colors duration-150
                shadow-sm hover:shadow-md
                min-h-[44px]"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-150" />
              <span className="hidden sm:inline">New Event</span>
              <span className="sm:hidden">New</span>
            </button>

            <div className="w-px h-8 bg-border-subtle hidden sm:block" />

            <div className="flex-col hidden sm:flex">
              <div className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                {dayName}
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                {dateDisplay}
              </div>
            </div>
          </div>

          {/* Right group — Sync + Courses + Upload */}
          <div className="flex items-center gap-3">
            {/* Sync to Google Calendar */}
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || unsyncedCount === 0}
              className={cn(
                'relative inline-flex items-center justify-center w-11 h-11 rounded-lg text-sm font-medium',
                'border border-border-subtle bg-surface hover:bg-surface-secondary',
                'text-[var(--text-secondary)] transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={unsyncedCount > 0 ? `Sync ${unsyncedCount} events to Google Calendar` : 'All events synced'}
              title={unsyncedCount > 0 ? `${unsyncedCount} unsynced event${unsyncedCount !== 1 ? 's' : ''}` : 'All events synced'}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarSync className="w-4 h-4" />
              )}
              {unsyncedCount > 0 && !isSyncing && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unsyncedCount}
                </span>
              )}
            </button>

            {/* Courses dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setCoursesOpen(!coursesOpen)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium',
                  'border border-border-subtle bg-surface hover:bg-surface-secondary',
                  'text-[var(--text-primary)] transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  'min-h-[44px]',
                  coursesOpen && 'bg-surface-secondary'
                )}
              >
                <GraduationCap className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="hidden sm:inline">Courses</span>
                {courses.length > 0 && (
                  <span className="text-xs bg-surface-tertiary text-[var(--text-secondary)] rounded-full px-1.5 py-0.5 font-medium">
                    {courses.length}
                  </span>
                )}
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-150',
                  coursesOpen && 'rotate-180'
                )} />
              </button>

              {coursesOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-surface border border-border-subtle rounded-xl shadow-lg animate-scale-in origin-top-right z-50">
                  <div className="p-3 border-b border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Your courses
                      </span>
                      <button
                        onClick={() => setCoursesOpen(false)}
                        className="p-1 rounded hover:bg-surface-secondary transition-colors duration-150"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      </button>
                    </div>
                  </div>

                  {courses.length === 0 ? (
                    <div className="p-6 text-center">
                      <GraduationCap className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
                      <p className="text-sm text-[var(--text-secondary)]">No courses yet</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">Upload a syllabus to get started</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto py-1">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          className="group flex items-center justify-between px-3 py-2.5 hover:bg-surface-secondary transition-colors duration-150"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {course.color && (
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: course.color }}
                              />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {course.name}
                              </div>
                              <div className="text-xs text-[var(--text-tertiary)]">
                                {course.code}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetCourse(course);
                              setCoursesOpen(false);
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label={`Delete ${course.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] hover:text-red-500 transition-colors duration-150" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg
                border border-border-subtle bg-surface text-[var(--text-primary)] font-semibold text-sm
                hover:bg-surface-secondary active:bg-surface-tertiary
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                transition-colors duration-150
                min-h-[44px]"
            >
              <Upload className="w-4 h-4 group-hover:scale-110 transition-transform duration-150" />
              <span className="hidden sm:inline">Upload Syllabus</span>
              <span className="sm:hidden">Upload</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar — full width, calendar-first */}
      <div
        className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        style={{ animationDelay: '100ms' }}
      >
        <ModernCalendar refreshKey={refreshKey} onCreateEvent={handleCreateEventForDate} />
      </div>

      <CreateEventModal
        open={showCreateEvent}
        onOpenChange={(open) => {
          setShowCreateEvent(open);
          if (!open) setCreateEventDate(undefined);
        }}
        onCreated={handleEventCreated}
        initialDate={createEventDate}
      />

      <ConfirmDeleteDialog
        open={!!deleteTargetCourse}
        onOpenChange={(open) => { if (!open) setDeleteTargetCourse(null); }}
        title={`Delete ${deleteTargetCourse?.name ?? 'course'}?`}
        description="This will permanently delete the course and all its events. This action cannot be undone."
        onConfirm={handleDeleteCourse}
        isDeleting={isDeletingCourse}
      />
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
