'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createEvent } from '@/app/server-actions/events';
import type { Course } from '@prisma/client';

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
  initialAllDay?: boolean;
}

const EVENT_TYPES = [
  'exam',
  'assignment',
  'quiz',
  'reading',
  'lecture',
  'lab',
  'other',
];

/**
 * Create event modal with course dropdown, type selector, date/time inputs.
 */
export function CreateEventModal({
  open,
  onOpenChange,
  courses,
  initialDate,
  initialTime,
  initialAllDay = true,
}: CreateEventModalProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values
  const [formValues, setFormValues] = useState({
    title: '',
    date: initialDate || new Date().toISOString().split('T')[0],
    time: initialTime || '09:00',
    isAllDay: initialAllDay,
    courseId: courses.length === 1 ? courses[0].id : '',
    type: 'assignment',
  });

  // Update initial values when modal opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setFormValues({
        title: '',
        date: initialDate || new Date().toISOString().split('T')[0],
        time: initialTime || '09:00',
        isAllDay: initialAllDay,
        courseId: courses.length === 1 ? courses[0].id : '',
        type: 'assignment',
      });
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleAllDayChange = (checked: boolean) => {
    setFormValues((prev) => ({
      ...prev,
      isAllDay: checked,
      time: checked ? '' : prev.time || '09:00',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validate required fields
    if (!formValues.title.trim()) {
      setError('Title is required');
      setIsSaving(false);
      return;
    }

    if (!formValues.courseId) {
      setError('Please select a course');
      setIsSaving(false);
      return;
    }

    try {
      const result = await createEvent({
        title: formValues.title,
        date: formValues.date,
        time: formValues.isAllDay ? null : formValues.time,
        type: formValues.type,
        description: '',
        courseId: formValues.courseId,
      });

      if (!result.ok) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      // Trigger server-side refetch to get updated data
      router.refresh();

      // Close modal and reset form
      onOpenChange(false);
      setIsSaving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              Title <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={formValues.title}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Event title"
              className="w-full"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              Date <span className="text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={formValues.date}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full"
              required
            />
          </div>

          {/* All Day / Time */}
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formValues.isAllDay}
                onChange={(e) => handleAllDayChange(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm font-medium text-zinc-700">
                All day event
              </span>
            </label>

            {!formValues.isAllDay && (
              <>
                <label className="text-sm font-medium text-zinc-700 mb-1 block">
                  Time
                </label>
                <Input
                  type="time"
                  value={formValues.time}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, time: e.target.value }))
                  }
                  className="w-full"
                />
              </>
            )}
          </div>

          {/* Course */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              Course <span className="text-red-600">*</span>
            </label>
            <select
              value={formValues.courseId}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, courseId: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1 block">
              Type
            </label>
            <select
              value={formValues.type}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, type: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
