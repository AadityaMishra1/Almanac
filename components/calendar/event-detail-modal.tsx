'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateEvent } from '@/app/server-actions/events';

/**
 * Calendar event type (matches CalendarView).
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: string;
  courseCode: string;
  courseColor: string;
  courseName: string;
  description?: string;
  editable: boolean;
  isConflicting?: boolean;
}

interface EventDetailModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: (updatedEvent: CalendarEvent) => void;
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
 * Event detail modal with inline editing.
 */
export function EventDetailModal({
  event,
  open,
  onOpenChange,
  onEventUpdated,
}: EventDetailModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    title: '',
    date: '',
    time: '',
    type: '',
    isAllDay: false,
  });

  // Initialize edit values when event changes
  useEffect(() => {
    if (event) {
      setEditValues({
        title: event.title,
        date: format(event.start, 'yyyy-MM-dd'),
        time: event.allDay ? '' : format(event.start, 'HH:mm'),
        type: event.type,
        isAllDay: event.allDay,
      });
      setIsEditing(false);
      setError(null);
    }
  }, [event]);

  if (!event) return null;

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    // Reset to original values
    setEditValues({
      title: event.title,
      date: format(event.start, 'yyyy-MM-dd'),
      time: event.allDay ? '' : format(event.start, 'HH:mm'),
      type: event.type,
      isAllDay: event.allDay,
    });
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateEvent(event.id, {
        title: editValues.title,
        date: editValues.date,
        time: editValues.isAllDay ? null : editValues.time,
        type: editValues.type,
      });

      if (!result.ok) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      // Parse updated date/time
      const [year, month, day] = editValues.date.split('-').map(Number);
      let start: Date;
      let end: Date;

      if (editValues.isAllDay) {
        start = new Date(year, month - 1, day, 0, 0, 0);
        end = new Date(year, month - 1, day + 1, 0, 0, 0);
      } else {
        const [hour, minute] = editValues.time.split(':').map(Number);
        start = new Date(year, month - 1, day, hour, minute);
        end = new Date(year, month - 1, day, hour + 1, minute);
      }

      // Create updated event object
      const updatedEvent: CalendarEvent = {
        ...event,
        title: editValues.title,
        start,
        end,
        allDay: editValues.isAllDay,
        type: editValues.type,
      };

      // Trigger server-side refetch to get updated data
      router.refresh();

      onEventUpdated(updatedEvent);
      setIsEditing(false);
      setIsSaving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
      setIsSaving(false);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    setEditValues((prev) => ({
      ...prev,
      isAllDay: checked,
      time: checked ? '' : prev.time || '09:00',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Event' : event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* View Mode */}
          {!isEditing && (
            <>
              <div>
                <div className="text-sm font-medium text-zinc-500 mb-1">Date</div>
                <div className="text-sm">
                  {format(event.start, 'EEEE, MMMM d, yyyy')}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-500 mb-1">Time</div>
                <div className="text-sm">
                  {event.allDay ? 'All day' : format(event.start, 'h:mm a')}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-500 mb-1">Type</div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 capitalize">
                    {event.type}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-500 mb-1">Course</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: event.courseColor }}
                  />
                  <span className="text-sm">
                    {event.courseName} ({event.courseCode})
                  </span>
                </div>
              </div>

              {event.description && (
                <div>
                  <div className="text-sm font-medium text-zinc-500 mb-1">
                    Description
                  </div>
                  <div className="text-sm text-zinc-700">{event.description}</div>
                </div>
              )}
            </>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1 block">
                  Title
                </label>
                <Input
                  type="text"
                  value={editValues.title}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Event title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1 block">
                  Date
                </label>
                <Input
                  type="date"
                  value={editValues.date}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={editValues.isAllDay}
                    onChange={(e) => handleAllDayChange(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm font-medium text-zinc-700">
                    All day event
                  </span>
                </label>

                {!editValues.isAllDay && (
                  <>
                    <label className="text-sm font-medium text-zinc-700 mb-1 block">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={editValues.time}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, time: e.target.value }))
                      }
                      className="w-full"
                    />
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1 block">
                  Type
                </label>
                <select
                  value={editValues.type}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, type: e.target.value }))
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

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isEditing && (
            <>
              {event.editable && (
                <Button onClick={handleEdit} variant="default" className="w-full sm:w-auto">
                  Edit
                </Button>
              )}
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">Close</Button>
              </DialogClose>
            </>
          )}

          {isEditing && (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
